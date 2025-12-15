import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Share,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";

import {
  deleteExerciseCompletely,
  ensureExercise,
  getAllExercises,
  updateExerciseName,
  type ExerciseRecord,
} from "@/db/database";

export default function ExercisesScreen() {
  const [exercises, setExercises] = useState<ExerciseRecord[]>([]);
  const [newName, setNewName] = useState("");
  const [renameInputs, setRenameInputs] = useState<Record<number, string>>({});
  const [importText, setImportText] = useState("");
  const [lastExport, setLastExport] = useState("");
  const [isExportOpen, setExportOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");

  const load = useCallback(() => {
    setExercises(getAllExercises());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleAdd = () => {
    if (!newName.trim()) return;
    ensureExercise(newName);
    setNewName("");
    load();
  };

  const handleRename = (exercise: ExerciseRecord) => {
    const nextName = renameInputs[exercise.id]?.trim() || exercise.name;
    if (!nextName || nextName === exercise.name) return;
    updateExerciseName(exercise.id, nextName);
    setRenameInputs((prev) => ({ ...prev, [exercise.id]: nextName }));
    load();
  };

  const handleDelete = (exerciseId: number) => {
    deleteExerciseCompletely(exerciseId);
    load();
  };

  const handleExport = async () => {
    const payload = exercises.map((ex) => ({ name: ex.name }));
    const json = JSON.stringify(payload, null, 2);
    setLastExport(json);
    setCopyFeedback("");
    setExportOpen(true);
    try {
      await Share.share({ message: json });
    } catch (error) {
      console.warn("Export share failed", error);
    }
  };

  const handleCopyExport = async () => {
    if (!lastExport) return;
    try {
      await Clipboard.setStringAsync(lastExport);
      setCopyFeedback("Copied");
      setTimeout(() => setCopyFeedback(""), 1500);
    } catch (error) {
      console.warn("Copy failed", error);
    }
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    try {
      const parsed = JSON.parse(importText);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (typeof item === "string") {
            ensureExercise(item);
          } else if (item && typeof item.name === "string") {
            ensureExercise(item.name);
          }
        });
        load();
      }
    } catch (error) {
      console.warn("Import failed", error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <FlatList
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <View>
            <Text style={styles.heading}>Exercises</Text>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Add Exercise</Text>
              <View style={styles.row}>
                <TextInput
                  placeholder="Name"
                  placeholderTextColor="#6c6c6c"
                  value={newName}
                  onChangeText={setNewName}
                  style={styles.input}
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleAdd}>
                  <Text style={styles.primaryText}>Add</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleExport}>
                <Text style={styles.secondaryText}>Export Exercises</Text>
              </TouchableOpacity>
              {lastExport ? (
                <View style={styles.exportBox}>
                  <TouchableOpacity
                    style={styles.exportHeader}
                    onPress={() => setExportOpen((prev) => !prev)}
                  >
                    <Text style={styles.exportLabel}>Last export (share payload)</Text>
                    <Text style={styles.exportToggle}>{isExportOpen ? "Hide" : "Show"}</Text>
                  </TouchableOpacity>
                  {isExportOpen ? (
                    <>
                      <Text selectable style={styles.exportText}>
                        {lastExport}
                      </Text>
                      <TouchableOpacity style={styles.copyButton} onPress={handleCopyExport}>
                        <Text style={styles.secondaryText}>Copy to clipboard</Text>
                      </TouchableOpacity>
                      {copyFeedback ? (
                        <Text style={styles.copyFeedback}>{copyFeedback}</Text>
                      ) : null}
                    </>
                  ) : null}
                </View>
              ) : null}
              <Text style={styles.sectionTitle}>Import (paste JSON array)</Text>
              <TextInput
                placeholder='e.g. [{"name":"Bench Press"}]'
                placeholderTextColor="#6c6c6c"
                value={importText}
                onChangeText={setImportText}
                style={[styles.input, styles.importBox]}
                multiline
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleImport}>
                <Text style={styles.primaryText}>Import</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        data={exercises}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.exerciseName}>{item.name}</Text>
            <View style={styles.row}>
              <TextInput
                placeholder="Rename"
                placeholderTextColor="#6c6c6c"
                value={renameInputs[item.id] ?? item.name}
                onChangeText={(text) =>
                  setRenameInputs((prev) => ({ ...prev, [item.id]: text }))
                }
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={() => handleRename(item)}
              />
              <TouchableOpacity style={styles.secondaryButton} onPress={() => handleRename(item)}>
                <Text style={styles.secondaryText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0d0d0d",
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  heading: {
    color: "#f1f1f1",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#161616",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#242424",
    gap: 8,
  },
  sectionTitle: {
    color: "#c7c7c7",
    fontSize: 15,
    fontWeight: "700",
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
  primaryButton: {
    backgroundColor: "#1f8a63",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  primaryText: {
    color: "#f5f5f5",
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#2d6a4f",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: {
    color: "#f5f5f5",
    fontWeight: "700",
  },
  copyButton: {
    marginTop: 6,
    backgroundColor: "#2d6a4f",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  copyFeedback: {
    color: "#82cfff",
    fontSize: 12,
  },
  deleteButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ff6b6b",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  deleteText: {
    color: "#ff6b6b",
    fontWeight: "700",
  },
  importBox: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  exportBox: {
    backgroundColor: "#0f0f0f",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 8,
    gap: 4,
  },
  exportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exportLabel: {
    color: "#9a9a9a",
    fontSize: 12,
  },
  exportToggle: {
    color: "#82cfff",
    fontSize: 12,
    fontWeight: "700",
  },
  exportText: {
    color: "#e9e9e9",
    fontSize: 12,
  },
  separator: {
    height: 12,
  },
  exerciseName: {
    color: "#e9e9e9",
    fontWeight: "700",
    fontSize: 16,
  },
});
