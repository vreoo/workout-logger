import { useColorScheme as useRNColorScheme } from "react-native";

// Thin wrapper so we can swap themes later without touching callsites.
export function useColorScheme() {
  return useRNColorScheme() ?? "light";
}
