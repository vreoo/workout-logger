import type { SQLiteDatabase } from "expo-sqlite";

type Migration = {
  version: number;
  statements: string[];
};

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      "PRAGMA foreign_keys = ON;",
      `CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        name TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );`,
      `CREATE TABLE IF NOT EXISTS workout_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        order_index INTEGER NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_exercise_id INTEGER NOT NULL,
        set_index INTEGER NOT NULL,
        weight REAL NOT NULL,
        reps INTEGER NOT NULL
      );`,
      "CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises (workout_id);",
      "CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON workout_exercises (exercise_id);",
      "CREATE INDEX IF NOT EXISTS idx_sets_workout_exercise_id ON sets (workout_exercise_id);",
    ],
  },
];

export function applyMigrations(db: SQLiteDatabase) {
  db.execSync("PRAGMA foreign_keys = ON;");

  const row = db.getFirstSync<{ user_version: number }>("PRAGMA user_version");
  let currentVersion = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) {
      continue;
    }

    db.execSync("BEGIN");
    try {
      for (const statement of migration.statements) {
        db.execSync(statement);
      }
      db.execSync(`PRAGMA user_version = ${migration.version}`);
      db.execSync("COMMIT");
      currentVersion = migration.version;
    } catch (error) {
      db.execSync("ROLLBACK");
      throw error;
    }
  }
}
