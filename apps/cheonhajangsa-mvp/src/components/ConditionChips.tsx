import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Chip } from "../lib/api-types";
import type { EditorState } from "../lib/assist-state";
import { color, font, itemColor } from "./theme";

// S-02 조건 요약 칩. 칩을 누르면 그 조건만 고친다(WF-08).
// 위치 칩은 위치 고르기 화면(S-06)으로 간다.
const EDITABLE: Partial<Record<Chip["slot"], EditorState | "location">> = { item_id: "item_id", qty_kg: "qty_kg", urgency: "urgency", fulfillment: "fulfillment", location_id: "location" };

export function ConditionChips({
  chips,
  disabled,
  onEdit,
  onLocation,
  itemId,
}: {
  chips: Chip[];
  itemId?: string | null; // 품목 칩 앞 색 점
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
            {c.slot === "item_id" && <View style={[styles.itemDot, { backgroundColor: (itemId && itemColor[itemId]) || color.green }]} />}
            <Text style={styles.label}>{c.label} ▾</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.line },
  itemDot: { width: 10, height: 10, borderRadius: 5 },
  pressed: { opacity: 0.6 },
  label: { fontSize: font.body, color: color.ink, fontWeight: "700" },
  fixed: { backgroundColor: color.surface, borderColor: color.line },
  fixedLabel: { fontSize: font.body, color: color.sub },
});
