import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  addExerciseToWorkout,
  addSetToWorkoutExercise,
  createWorkout,
  deleteWorkout,
  deleteExerciseFromWorkout,
  finalizeWorkout,
  getAllExercises,
  getWorkout,
  updateWorkoutName,
  updateExerciseName,
  type ExerciseRecord,
  type WorkoutDetail,
  type WorkoutExerciseDetail,
} from "@/db/database";

type Params = { workoutId?: string | string[] };

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

export default function WorkoutScreen() {
  const params = useLocalSearchParams<Params>();
  const initialId = useMemo(() => {
    if (!params.workoutId) return null;
    const value = Array.isArray(params.workoutId) ? params.workoutId[0] : params.workoutId;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }, [params.workoutId]);

  const [workoutId, setWorkoutId] = useState<number | null>(initialId);
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [workoutName, setWorkoutName] = useState("");
  const [newExercise, setNewExercise] = useState("");
  const [setInputs, setSetInputs] = useState<Record<number, { weight: string; reps: string }>>({});
  const [existingExercises, setExistingExercises] = useState<ExerciseRecord[]>([]);
  const [renameInputs, setRenameInputs] = useState<Record<number, string>>({});

  useEffect(() => {
    if (workoutId !== null) return;
    const created = createWorkout();
    setWorkoutId(created.id);
    setWorkout({ ...created, exercises: [] });
  }, [workoutId]);

  const loadWorkout = useCallback(() => {
    if (!workoutId) return;
    const detail = getWorkout(workoutId);
    setWorkout(detail);
    setWorkoutName(detail?.name ?? "");
    setExistingExercises(getAllExercises());
  }, [workoutId]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  useFocusEffect(
    useCallback(() => {
      loadWorkout();
    }, [loadWorkout]),
  );

  useEffect(() => {
    setWorkoutName(workout?.name ?? "");
  }, [workout?.name]);

  useEffect(() => {
    setExistingExercises(getAllExercises());
  }, [workoutId]);
  const handleAddExercise = () => {
    if (!workoutId) return;
    if (!newExercise.trim()) return;

    addExerciseToWorkout(workoutId, newExercise);
    setNewExercise("");
    setExistingExercises(getAllExercises());
    loadWorkout();
  };

  const handleSelectExercise = (exerciseName: string) => {
    if (!workoutId) return;
    addExerciseToWorkout(workoutId, exerciseName);
    setExistingExercises(getAllExercises());
    loadWorkout();
  };

  const updateSetInput = (workoutExerciseId: number, field: "weight" | "reps", value: string) => {
    setSetInputs((prev) => ({
      ...prev,
      [workoutExerciseId]: {
        weight: field === "weight" ? value : prev[workoutExerciseId]?.weight ?? "",
        reps: field === "reps" ? value : prev[workoutExerciseId]?.reps ?? "",
      },
    }));
  };

  const handleAddSet = (exercise: WorkoutExerciseDetail) => {
    if (!workoutId) return;
    const input = setInputs[exercise.workoutExerciseId] ?? { weight: "", reps: "" };
    const weight = parseFloat(input.weight);
    const reps = parseInt(input.reps, 10);

    if (!Number.isFinite(weight) || !Number.isFinite(reps)) {
      return;
    }

    addSetToWorkoutExercise(exercise.workoutExerciseId, weight, reps);
    setSetInputs((prev) => ({ ...prev, [exercise.workoutExerciseId]: { weight: "", reps: "" } }));
    loadWorkout();
  };

  const finishWorkout = () => {
    if (workoutId) {
      finalizeWorkout(workoutId);
    }
    router.navigate("/");
  };

  const handleSaveName = () => {
    if (!workoutId) return;
    updateWorkoutName(workoutId, workoutName.trim() || null);
    loadWorkout();
  };

  const handleDeleteWorkout = () => {
    if (!workoutId) {
      router.navigate("/");
      return;
    }
    deleteWorkout(workoutId);
    router.navigate("/");
  };

  const handleRenameExercise = (exercise: WorkoutExerciseDetail) => {
    const nextName =
      renameInputs[exercise.workoutExerciseId]?.trim() || exercise.exercise.name.trim();
    if (!nextName || nextName === exercise.exercise.name) {
      return;
    }
    try {
      const updated = updateExerciseName(exercise.exercise.id, nextName);
      setExistingExercises(getAllExercises());
      setRenameInputs((prev) => ({ ...prev, [exercise.workoutExerciseId]: updated.name }));
      loadWorkout();
    } catch (error) {
      console.warn("Rename failed", error);
    }
  };

  const handleDeleteExerciseFromWorkout = (workoutExerciseId: number) => {
    deleteExerciseFromWorkout(workoutExerciseId);
    loadWorkout();
  };

  if (!workout) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>No workout found.</Text>
        <TouchableOpacity style={styles.finishButton} onPress={() => router.navigate("/")}>
          <Text style={styles.finishButtonText}>Back Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.heading}>{workout.name || "Workout"}</Text>
          <Text style={styles.subheading}>{formatDate(workout.date)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Workout Name</Text>
          <View style={styles.row}>
            <TextInput
              placeholder="Optional name"
              placeholderTextColor="#6c6c6c"
              value={workoutName}
              onChangeText={setWorkoutName}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={handleSaveName}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Add Exercise</Text>
          <View style={styles.row}>
            <TextInput
              placeholder="Exercise name"
              placeholderTextColor="#6c6c6c"
              value={newExercise}
              onChangeText={setNewExercise}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleAddExercise}
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={handleAddExercise}>
              <Text style={styles.buttonText}>Add</Text>
            </TouchableOpacity>
          </View>
          {existingExercises.length > 0 && (
            <>
              <Text style={styles.suggestionLabel}>Or pick an existing exercise</Text>
              <View style={styles.chipRow}>
                {existingExercises.slice(0, 12).map((exercise) => (
                  <TouchableOpacity
                    key={exercise.id}
                    style={styles.chip}
                    onPress={() => handleSelectExercise(exercise.name)}
                  >
                    <Text style={styles.chipText}>{exercise.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {workout.exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.workoutExerciseId}
            exercise={exercise}
            inputs={setInputs[exercise.workoutExerciseId] ?? { weight: "", reps: "" }}
            onChangeInput={updateSetInput}
            onAddSet={handleAddSet}
            renameValue={
              renameInputs[exercise.workoutExerciseId] ?? exercise.exercise.name
            }
            onChangeRename={(text) =>
              setRenameInputs((prev) => ({ ...prev, [exercise.workoutExerciseId]: text }))
            }
            onSubmitRename={() => handleRenameExercise(exercise)}
            onDeleteExercise={() => handleDeleteExerciseFromWorkout(exercise.workoutExerciseId)}
          />
        ))}

        <TouchableOpacity style={styles.finishButton} onPress={finishWorkout}>
          <Text style={styles.finishButtonText}>Finish Workout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteWorkout}>
          <Text style={styles.deleteButtonText}>Delete Workout</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ExerciseCard({
  exercise,
  inputs,
  onChangeInput,
  onAddSet,
  renameValue,
  onChangeRename,
  onSubmitRename,
  onDeleteExercise,
}: {
  exercise: WorkoutExerciseDetail;
  inputs: { weight: string; reps: string };
  onChangeInput: (id: number, field: "weight" | "reps", value: string) => void;
  onAddSet: (exercise: WorkoutExerciseDetail) => void;
  renameValue: string;
  onChangeRename: (value: string) => void;
  onSubmitRename: () => void;
  onDeleteExercise: () => void;
}) {
  const historyLabel = exercise.lastSession
    ? `Last: ${new Date(exercise.lastSession.date).toLocaleDateString()} · ${exercise.lastSession.sets
        .map((s) => `${s.weight} x ${s.reps}`)
        .join(", ")}`
    : "No previous session";

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
          <Text style={styles.historyText}>{historyLabel}</Text>
        </View>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() =>
            router.push({
              pathname: "/ExerciseScreen",
              params: { exerciseId: String(exercise.exercise.id), name: exercise.exercise.name },
            })
          }
        >
          <Text style={styles.linkText}>History</Text>
        </TouchableOpacity>
      </View>

      {exercise.sets.length > 0 && (
        <View style={styles.setList}>
          {exercise.sets.map((set) => (
            <View key={set.id} style={styles.setRow}>
              <Text style={styles.setLabel}>Set {set.set_index}</Text>
              <Text style={styles.setValue}>
                {set.weight} x {set.reps}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.row}>
        <TextInput
          placeholder="Rename exercise"
          placeholderTextColor="#6c6c6c"
          value={renameValue}
          onChangeText={onChangeRename}
          style={[styles.input, { flex: 1 }]}
          returnKeyType="done"
          onSubmitEditing={onSubmitRename}
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={onSubmitRename}>
          <Text style={styles.buttonText}>Rename</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostButton} onPress={onDeleteExercise}>
          <Text style={styles.deleteButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TextInput
          placeholder="Weight"
          placeholderTextColor="#6c6c6c"
          value={inputs.weight}
          onChangeText={(text) => onChangeInput(exercise.workoutExerciseId, "weight", text)}
          style={[styles.input, styles.inputHalf]}
          keyboardType="numeric"
        />
        <TextInput
          placeholder="Reps"
          placeholderTextColor="#6c6c6c"
          value={inputs.reps}
          onChangeText={(text) => onChangeInput(exercise.workoutExerciseId, "reps", text)}
          style={[styles.input, styles.inputHalf]}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={() => onAddSet(exercise)}>
          <Text style={styles.buttonText}>Add Set</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
  },
  content: {
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  heading: {
    color: "#f1f1f1",
    fontSize: 24,
    fontWeight: "700",
  },
  subheading: {
    color: "#9a9a9a",
    fontSize: 14,
  },
  sectionTitle: {
    color: "#c7c7c7",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  card: {
    backgroundColor: "#161616",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#242424",
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    color: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  inputHalf: {
    flex: 0.45,
  },
  secondaryButton: {
    backgroundColor: "#2d6a4f",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  ghostButton: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  buttonText: {
    color: "#f5f5f5",
    fontWeight: "700",
  },
  exerciseName: {
    color: "#f0f0f0",
    fontSize: 16,
    fontWeight: "700",
  },
  historyText: {
    color: "#8f8f8f",
    fontSize: 13,
  },
  setList: {
    gap: 6,
  },
  setRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  setLabel: {
    color: "#c7c7c7",
    fontSize: 14,
  },
  setValue: {
    color: "#f5f5f5",
    fontSize: 14,
    fontWeight: "600",
  },
  linkButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  linkText: {
    color: "#82cfff",
    fontWeight: "600",
  },
  finishButton: {
    backgroundColor: "#f15a24",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  finishButtonText: {
    color: "#0d0d0d",
    fontWeight: "800",
    fontSize: 16,
  },
  suggestionLabel: {
    color: "#9a9a9a",
    fontSize: 13,
    marginTop: 6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#1f1f1f",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  chipText: {
    color: "#e9e9e9",
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#2b2b2b",
    borderColor: "#ff6b6b",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  deleteButtonText: {
    color: "#ff6b6b",
    fontWeight: "800",
    fontSize: 16,
  },
});
