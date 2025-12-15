import * as SQLite from "expo-sqlite";
import { applyMigrations } from "./migrations";

export const db = SQLite.openDatabaseSync("workouts.db");

applyMigrations(db);

export type WorkoutRecord = {
  id: number;
  date: string;
  name: string | null;
};

export type ExerciseRecord = {
  id: number;
  name: string;
};

export type WorkoutExerciseRecord = {
  id: number;
  workout_id: number;
  exercise_id: number;
  order_index: number;
};

export type SetRecord = {
  id: number;
  workout_exercise_id: number;
  set_index: number;
  weight: number;
  reps: number;
};

export type LastSessionSummary = {
  workoutId: number;
  date: string;
  sets: Array<Pick<SetRecord, "set_index" | "weight" | "reps">>;
};

export type WorkoutExerciseDetail = {
  workoutExerciseId: number;
  orderIndex: number;
  exercise: ExerciseRecord;
  sets: Array<Pick<SetRecord, "id" | "set_index" | "weight" | "reps">>;
  lastSession: LastSessionSummary | null;
};

export type WorkoutDetail = WorkoutRecord & {
  exercises: WorkoutExerciseDetail[];
};

export type RecentWorkout = WorkoutRecord & {
  exerciseCount: number;
  setCount: number;
};

export type WorkoutHistoryEntry = WorkoutDetail;

type FinalizeResult = {
  kept: boolean;
  setCount: number;
};

const isoNow = () => new Date().toISOString();

const normalizeName = (name: string) => name.trim();

export function createWorkout(name?: string | null): WorkoutRecord {
  const date = isoNow();
  const result = db.runSync("INSERT INTO workouts (date, name) VALUES (?, ?)", date, name ?? null);
  return { id: result.lastInsertRowId, date, name: name ?? null };
}

export function updateWorkoutName(workoutId: number, name?: string | null): WorkoutRecord | null {
  const nextName = name ? name.trim() : null;
  db.runSync("UPDATE workouts SET name = ? WHERE id = ?", nextName, workoutId);
  return db.getFirstSync<WorkoutRecord>("SELECT id, date, name FROM workouts WHERE id = ?", workoutId);
}

export function deleteWorkout(workoutId: number) {
  db.execSync("BEGIN");
  try {
    db.runSync(
      "DELETE FROM sets WHERE workout_exercise_id IN (SELECT id FROM workout_exercises WHERE workout_id = ?)",
      workoutId,
    );
    db.runSync("DELETE FROM workout_exercises WHERE workout_id = ?", workoutId);
    db.runSync("DELETE FROM workouts WHERE id = ?", workoutId);
    db.execSync("COMMIT");
  } catch (error) {
    db.execSync("ROLLBACK");
    throw error;
  }
}

export function getWorkout(workoutId: number): WorkoutDetail | null {
  const workout = db.getFirstSync<WorkoutRecord>(
    "SELECT id, date, name FROM workouts WHERE id = ?",
    workoutId,
  );

  if (!workout) {
    return null;
  }

  const exercises = db.getAllSync<
    WorkoutExerciseRecord & { exercise_name: string }
  >(
    `SELECT we.id, we.workout_id, we.exercise_id, we.order_index, e.name AS exercise_name
     FROM workout_exercises we
     JOIN exercises e ON e.id = we.exercise_id
     WHERE we.workout_id = ?
     ORDER BY we.order_index ASC`,
    workoutId,
  );

  const exerciseDetails: WorkoutExerciseDetail[] = exercises.map((row) => {
    const sets = db.getAllSync<SetRecord>(
      `SELECT id, workout_exercise_id, set_index, weight, reps
       FROM sets
       WHERE workout_exercise_id = ?
       ORDER BY set_index ASC`,
      row.id,
    );

    const lastSession = getLastSessionForExercise(row.exercise_id, workoutId);

    return {
      workoutExerciseId: row.id,
      orderIndex: row.order_index,
      exercise: { id: row.exercise_id, name: row.exercise_name },
      sets,
      lastSession,
    };
  });

  return { ...workout, exercises: exerciseDetails };
}

export function getRecentWorkouts(limit: number = 5): RecentWorkout[] {
  return db.getAllSync<RecentWorkout>(
    `SELECT
      w.id,
      w.date,
      w.name,
      COUNT(DISTINCT we.id) AS exerciseCount,
      COUNT(s.id) AS setCount
     FROM workouts w
     LEFT JOIN workout_exercises we ON we.workout_id = w.id
     LEFT JOIN sets s ON s.workout_exercise_id = we.id
     GROUP BY w.id
     ORDER BY w.date DESC
     LIMIT ?`,
    limit,
  );
}

export function getWorkoutHistory(limit: number = 20): WorkoutHistoryEntry[] {
  const workouts = db.getAllSync<WorkoutRecord>(
    "SELECT id, date, name FROM workouts ORDER BY date DESC LIMIT ?",
    limit,
  );

  return workouts
    .map((w) => getWorkout(w.id))
    .filter((w): w is WorkoutDetail => Boolean(w));
}

export function ensureExercise(name: string): ExerciseRecord {
  const cleaned = normalizeName(name);
  if (!cleaned) {
    throw new Error("Exercise name cannot be empty.");
  }

  db.runSync("INSERT OR IGNORE INTO exercises (name) VALUES (?)", cleaned);

  const exercise = db.getFirstSync<ExerciseRecord>(
    "SELECT id, name FROM exercises WHERE name = ?",
    cleaned,
  );

  if (!exercise) {
    throw new Error("Unable to load exercise record.");
  }

  return exercise;
}

export function getExerciseById(id: number): ExerciseRecord | null {
  return db.getFirstSync<ExerciseRecord>("SELECT id, name FROM exercises WHERE id = ?", id);
}

export function getAllExercises(): ExerciseRecord[] {
  return db.getAllSync<ExerciseRecord>(
    "SELECT id, name FROM exercises ORDER BY name COLLATE NOCASE ASC",
  );
}

export function updateExerciseName(exerciseId: number, name: string): ExerciseRecord {
  const cleaned = normalizeName(name);
  if (!cleaned) {
    throw new Error("Exercise name cannot be empty.");
  }

  db.execSync("BEGIN");
  try {
    const existing = db.getFirstSync<ExerciseRecord>(
      "SELECT id, name FROM exercises WHERE name = ?",
      cleaned,
    );

    // If the target name already exists, merge references and drop the old record.
    if (existing && existing.id !== exerciseId) {
      db.runSync(
        "UPDATE workout_exercises SET exercise_id = ? WHERE exercise_id = ?",
        existing.id,
        exerciseId,
      );
      db.runSync("DELETE FROM exercises WHERE id = ?", exerciseId);
      db.execSync("COMMIT");
      return existing;
    }

    db.runSync("UPDATE exercises SET name = ? WHERE id = ?", cleaned, exerciseId);
    db.execSync("COMMIT");

    const updated = getExerciseById(exerciseId);
    if (!updated) {
      throw new Error("Exercise not found.");
    }
    return updated;
  } catch (error) {
    db.execSync("ROLLBACK");
    throw error;
  }
}

export function deleteExerciseFromWorkout(workoutExerciseId: number) {
  db.execSync("BEGIN");
  try {
    db.runSync("DELETE FROM sets WHERE workout_exercise_id = ?", workoutExerciseId);
    db.runSync("DELETE FROM workout_exercises WHERE id = ?", workoutExerciseId);
    db.execSync("COMMIT");
  } catch (error) {
    db.execSync("ROLLBACK");
    throw error;
  }
}

export function deleteExerciseCompletely(exerciseId: number) {
  db.execSync("BEGIN");
  try {
    db.runSync(
      "DELETE FROM sets WHERE workout_exercise_id IN (SELECT id FROM workout_exercises WHERE exercise_id = ?)",
      exerciseId,
    );
    db.runSync("DELETE FROM workout_exercises WHERE exercise_id = ?", exerciseId);
    db.runSync("DELETE FROM exercises WHERE id = ?", exerciseId);
    db.execSync("COMMIT");
  } catch (error) {
    db.execSync("ROLLBACK");
    throw error;
  }
}

export function finalizeWorkout(workoutId: number): FinalizeResult {
  db.execSync("BEGIN");
  try {
    db.runSync(
      `DELETE FROM workout_exercises
       WHERE workout_id = ?
       AND id NOT IN (SELECT DISTINCT workout_exercise_id FROM sets)`,
      workoutId,
    );

    const totals =
      db.getFirstSync<{ setCount: number }>(
        `SELECT COUNT(s.id) AS setCount
         FROM workout_exercises we
         LEFT JOIN sets s ON s.workout_exercise_id = we.id
         WHERE we.workout_id = ?`,
        workoutId,
      ) ?? { setCount: 0 };

    if (totals.setCount === 0) {
      db.runSync("DELETE FROM workout_exercises WHERE workout_id = ?", workoutId);
      db.runSync("DELETE FROM workouts WHERE id = ?", workoutId);
      db.execSync("COMMIT");
      return { kept: false, setCount: 0 };
    }

    db.execSync("COMMIT");
    return { kept: true, setCount: totals.setCount };
  } catch (error) {
    db.execSync("ROLLBACK");
    throw error;
  }
}

export function addExerciseToWorkout(
  workoutId: number,
  exerciseName: string,
): { workoutExerciseId: number; exercise: ExerciseRecord; lastSession: LastSessionSummary | null } {
  const exercise = ensureExercise(exerciseName);

  const existing = db.getFirstSync<{ id: number; order_index: number }>(
    `SELECT id, order_index FROM workout_exercises
     WHERE workout_id = ? AND exercise_id = ?
     ORDER BY order_index ASC
     LIMIT 1`,
    workoutId,
    exercise.id,
  );

  if (existing) {
    return {
      workoutExerciseId: existing.id,
      exercise,
      lastSession: getLastSessionForExercise(exercise.id, workoutId),
    };
  }

  const nextOrder = db.getFirstSync<{ nextIndex: number }>(
    "SELECT COALESCE(MAX(order_index) + 1, 1) AS nextIndex FROM workout_exercises WHERE workout_id = ?",
    workoutId,
  )?.nextIndex ?? 1;

  const result = db.runSync(
    "INSERT INTO workout_exercises (workout_id, exercise_id, order_index) VALUES (?, ?, ?)",
    workoutId,
    exercise.id,
    nextOrder,
  );

  return {
    workoutExerciseId: result.lastInsertRowId,
    exercise,
    lastSession: getLastSessionForExercise(exercise.id, workoutId),
  };
}

export function addSetToWorkoutExercise(
  workoutExerciseId: number,
  weight: number,
  reps: number,
): SetRecord {
  const nextSetIndex = db.getFirstSync<{ nextIndex: number }>(
    "SELECT COALESCE(MAX(set_index) + 1, 1) AS nextIndex FROM sets WHERE workout_exercise_id = ?",
    workoutExerciseId,
  )?.nextIndex ?? 1;

  const result = db.runSync(
    "INSERT INTO sets (workout_exercise_id, set_index, weight, reps) VALUES (?, ?, ?, ?)",
    workoutExerciseId,
    nextSetIndex,
    weight,
    reps,
  );

  return {
    id: result.lastInsertRowId,
    workout_exercise_id: workoutExerciseId,
    set_index: nextSetIndex,
    weight,
    reps,
  };
}

export function getLastSessionForExercise(
  exerciseId: number,
  excludeWorkoutId?: number,
): LastSessionSummary | null {
  const last = db.getFirstSync<{
    workout_id: number;
    workout_exercise_id: number;
    date: string;
  }>(
    `SELECT we.workout_id, we.id AS workout_exercise_id, w.date
     FROM workout_exercises we
     JOIN workouts w ON w.id = we.workout_id
     WHERE we.exercise_id = ? AND w.id != ?
     ORDER BY w.date DESC
     LIMIT 1`,
    exerciseId,
    excludeWorkoutId ?? -1,
  );

  if (!last) {
    return null;
  }

  const sets = db.getAllSync<Pick<SetRecord, "set_index" | "weight" | "reps">>(
    `SELECT set_index, weight, reps
     FROM sets
     WHERE workout_exercise_id = ?
     ORDER BY set_index ASC`,
    last.workout_exercise_id,
  );

  return {
    workoutId: last.workout_id,
    date: last.date,
    sets,
  };
}

export function getExerciseHistory(exerciseId: number): Array<{
  workoutId: number;
  date: string;
  sets: Array<Pick<SetRecord, "set_index" | "weight" | "reps">>;
}> {
  const sessions = db.getAllSync<{
    workout_id: number;
    workout_exercise_id: number;
    date: string;
  }>(
    `SELECT w.id AS workout_id, we.id AS workout_exercise_id, w.date
     FROM workout_exercises we
     JOIN workouts w ON w.id = we.workout_id
     WHERE we.exercise_id = ?
     ORDER BY w.date DESC`,
    exerciseId,
  );

  return sessions.map((session) => {
    const sets = db.getAllSync<Pick<SetRecord, "set_index" | "weight" | "reps">>(
      `SELECT set_index, weight, reps
       FROM sets
       WHERE workout_exercise_id = ?
       ORDER BY set_index ASC`,
      session.workout_exercise_id,
    );

    return {
      workoutId: session.workout_id,
      date: session.date,
      sets,
    };
  });
}
