import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { createWorkout, getRecentWorkouts, type RecentWorkout } from "@/db/database";

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

export default function HomeScreen() {
  const [recent, setRecent] = useState<RecentWorkout[]>([]);

  const refresh = useCallback(() => {
    setRecent(getRecentWorkouts(5));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const startWorkout = () => {
    const workout = createWorkout();
    router.push({ pathname: "/WorkoutScreen", params: { workoutId: String(workout.id) } });
  };

  const manageExercises = () => {
    router.push("/ExercisesScreen");
  };

  const openHistory = () => {
    router.push("/HistoryScreen");
  };

  const openWorkout = (id: number) => {
    router.push({ pathname: "/WorkoutScreen", params: { workoutId: String(id) } });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Workout Log</Text>

      <TouchableOpacity style={styles.primaryButton} onPress={startWorkout}>
        <Text style={styles.primaryButtonText}>Start Workout</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={manageExercises}>
        <Text style={styles.secondaryButtonText}>Manage Exercises</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={openHistory}>
        <Text style={styles.secondaryButtonText}>History</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Recent</Text>

      {recent.length === 0 ? (
        <Text style={styles.emptyText}>No workouts yet. Start one to begin logging.</Text>
      ) : (
        <FlatList
          data={recent}
          keyExtractor={(item) => String(item.id)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openWorkout(item.id)}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name || "Workout"}</Text>
                <Text style={styles.cardMeta}>{formatDate(item.date)}</Text>
              </View>
              <Text style={styles.cardMeta}>
                {item.exerciseCount} exercises · {item.setCount} sets
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#0d0d0d",
  },
  heading: {
    fontSize: 26,
    fontWeight: "700",
    color: "#f1f1f1",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#1f8a63",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  primaryButtonText: {
    color: "#f5f5f5",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: "#1b1b1b",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  secondaryButtonText: {
    color: "#f5f5f5",
    fontWeight: "700",
    fontSize: 15,
  },
  sectionTitle: {
    color: "#c7c7c7",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyText: {
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
});
