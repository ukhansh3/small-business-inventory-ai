import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Chip } from "../lib/api-types";
import type { EditorState } from "../lib/assist-state";
import { color, font } from "./theme";

// S-02 조건 요약 칩. 칩을 누르면 그 조건만 고친다(WF-08).
// 위치 칩은 위치 고르기 화면(S-06)으로 간다.
const EDITABLE: Partial<Record<Chip["slot"], EditorState | "location">> = { qty_kg: "qty_kg", urgency: "urgency", fulfillment: "fulfillment", location_id: "location" };

export function ConditionChips({
  chips,
  disabled,
  onEdit,
  onLocation,
}: {
  chips: Chip[];
  disabled: boolean;
  onEdit: (e: EditorState) => void;
  onLocation: () => void;
}) {
  return (
    <View style={styles.row} accessibilityLabel="검색 조건">
      {chips.map((c) => {
        const editor = c.editable ? EDITABLE[c.slot] : undefined;
        if (!editor) {
          return (
            <View key={c.slot} style={[styles.chip, styles.fixed]}>
              <Text style={styles.fixedLabel}>{c.label}</Text>
            </View>
          );
        }
        return (
          <Pressable
            key={c.slot}
            accessibilityRole="button"
            accessibilityHint="눌러서 조건 바꾸기"
            disabled={disabled}
            onPress={() => (editor === "location" ? onLocation() : onEdit(editor))}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          >
            <Text style={styles.label}>{c.label} ▾</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: color.greenSoft, borderWidth: 1, borderColor: color.green },
  pressed: { opacity: 0.6 },
  label: { fontSize: font.body, color: color.green, fontWeight: "600" },
  fixed: { backgroundColor: color.surface, borderColor: color.line },
  fixedLabel: { fontSize: font.body, color: color.sub },
});
