import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { FlatList, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { getWorkoutHistory, type WorkoutDetail } from "@/db/database";

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export default function HistoryScreen() {
  const [history, setHistory] = useState<WorkoutDetail[]>([]);

  const load = useCallback(() => {
    setHistory(getWorkoutHistory(20));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleExport = async () => {
    if (history.length === 0) return;
    const payload = history.map((w) => ({
      id: w.id,
      date: w.date,
      name: w.name,
      exercises: w.exercises.map((ex) => ({
        name: ex.exercise.name,
        sets: ex.sets.map((s) => ({ set: s.set_index, weight: s.weight, reps: s.reps })),
      })),
    }));
    const json = JSON.stringify(payload, null, 2);
    try {
      await Share.share({ message: json });
    } catch (error) {
      console.warn("Export share failed", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>History</Text>
      <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
        <Text style={styles.exportText}>Export History</Text>
      </TouchableOpacity>
      {history.length === 0 ? (
        <Text style={styles.empty}>No workouts logged yet.</Text>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => String(item.id)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => <WorkoutCard workout={item} />}
        />
      )}
    </View>
  );
}

function WorkoutCard({ workout }: { workout: WorkoutDetail }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{workout.name || "Workout"}</Text>
        <Text style={styles.cardMeta}>{formatDate(workout.date)}</Text>
      </View>
      {workout.exercises.length === 0 ? (
        <Text style={styles.empty}>No exercises logged.</Text>
      ) : (
        workout.exercises.map((exercise) => (
          <View key={exercise.workoutExerciseId} style={styles.exerciseBlock}>
            <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
            {exercise.sets.length === 0 ? (
              <Text style={styles.empty}>No sets saved.</Text>
            ) : (
              exercise.sets.map((set) => (
                <View key={set.id} style={styles.setRow}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    padding: 16,
  },
  heading: {
    color: "#f1f1f1",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  exportButton: {
    backgroundColor: "#1f8a63",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  exportText: {
    color: "#f5f5f5",
    fontWeight: "700",
  },
  empty: {
    color: "#8f8f8f",
    fontSize: 14,
  },
  separator: {
    height: 12,
  },
  card: {
    backgroundColor: "#161616",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#242424",
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  cardTitle: {
    color: "#f0f0f0",
    fontSize: 16,
    fontWeight: "700",
  },
  cardMeta: {
    color: "#9a9a9a",
    fontSize: 13,
  },
  exerciseBlock: {
    gap: 6,
  },
  exerciseName: {
    color: "#e9e9e9",
    fontWeight: "700",
    fontSize: 15,
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
