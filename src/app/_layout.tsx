import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0d0d0d" },
          headerTintColor: "#f5f5f5",
          contentStyle: { backgroundColor: "#0d0d0d" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Home" }} />
        <Stack.Screen name="WorkoutScreen" options={{ title: "Workout" }} />
        <Stack.Screen name="ExerciseScreen" options={{ title: "Exercise" }} />
        <Stack.Screen name="ExercisesScreen" options={{ title: "Exercises" }} />
        <Stack.Screen name="HistoryScreen" options={{ title: "History" }} />
      </Stack>
    </ThemeProvider>
  );
}
