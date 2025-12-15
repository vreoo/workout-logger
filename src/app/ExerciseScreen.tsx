import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
  deleteExerciseCompletely,
  getExerciseById,
  getExerciseHistory,
  updateExerciseName,
} from "@/db/database";

type Params = { exerciseId?: string | string[]; name?: string | string[] };

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

export default function ExerciseScreen() {
  const params = useLocalSearchParams<Params>();
  const parsedId = useMemo(() => {
    const raw = Array.isArray(params.exerciseId) ? params.exerciseId[0] : params.exerciseId;
    const value = raw ? Number(raw) : NaN;
    return Number.isNaN(value) ? null : value;
  }, [params.exerciseId]);

  const initialName = useMemo(() => {
    const raw = Array.isArray(params.name) ? params.name[0] : params.name;
    return raw ?? "";
  }, [params.name]);

  const [exerciseId, setExerciseId] = useState<number | null>(parsedId);
  const [exerciseName, setExerciseName] = useState(initialName);
  const [renameInput, setRenameInput] = useState(initialName);
  const [history, setHistory] = useState<ReturnType<typeof getExerciseHistory>>([]);

  const load = useCallback(() => {
    if (!exerciseId) return;
    setHistory(getExerciseHistory(exerciseId));
    if (!exerciseName) {
      const exercise = getExerciseById(exerciseId);
      if (exercise) {
        setExerciseName(exercise.name);
        setRenameInput(exercise.name);
      }
    }
  }, [exerciseId, exerciseName]);

  const handleRename = () => {
    if (!exerciseId) return;
    const nextName = renameInput.trim();
    if (!nextName || nextName === exerciseName) return;
    try {
      const updated = updateExerciseName(exerciseId, nextName);
      setExerciseId(updated.id);
      setExerciseName(updated.name);
      setRenameInput(updated.name);
      setHistory(getExerciseHistory(updated.id));
    } catch (error) {
      console.warn("Rename failed", error);
    }
  };

  const handleDeleteExercise = () => {
    if (!exerciseId) return;
    deleteExerciseCompletely(exerciseId);
    router.navigate("/");
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!exerciseId) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Exercise not found</Text>
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
        <Text style={styles.heading}>{exerciseName || "Exercise History"}</Text>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Manage</Text>
          <View style={styles.row}>
            <TextInput
              placeholder="Exercise name"
              placeholderTextColor="#6c6c6c"
              value={renameInput}
              onChangeText={setRenameInput}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleRename}
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={handleRename}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteExercise}>
            <Text style={styles.deleteButtonText}>Delete Exercise & History</Text>
          </TouchableOpacity>
        </View>
        {history.length === 0 ? (
          <Text style={styles.empty}>No logged sessions yet.</Text>
        ) : (
          history.map((session) => (
            <View key={`${session.workoutId}-${session.date}`} style={styles.card}>
              <Text style={styles.cardTitle}>{formatDate(session.date)}</Text>
              {session.sets.length === 0 ? (
                <Text style={styles.empty}>No sets saved.</Text>
              ) : (
                session.sets.map((set) => (
                  <View key={set.set_index} style={styles.setRow}>
                    <Text style={styles.setLabel}>Set {set.set_index}</Text>
                    <Text style={styles.setValue}>
                      {set.weight} x {set.reps}
                    </Text>
                  </View>
                ))
              )}
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  heading: {
    color: "#f1f1f1",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  empty: {
    color: "#8f8f8f",
    fontSize: 14,
  },
  sectionTitle: {
    color: "#c7c7c7",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  secondaryButton: {
    backgroundColor: "#2d6a4f",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#f5f5f5",
    fontWeight: "700",
  },
  deleteButton: {
    marginTop: 10,
    backgroundColor: "#2b2b2b",
    borderColor: "#ff6b6b",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#ff6b6b",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#161616",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#242424",
    gap: 8,
  },
  cardTitle: {
    color: "#e9e9e9",
    fontWeight: "700",
    fontSize: 16,
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
});
