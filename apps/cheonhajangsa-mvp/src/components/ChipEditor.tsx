import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FULFILLMENT_OPTIONS, QTY_OPTIONS, URGENCY_OPTIONS } from "../../core/options";
import type { Option, PartialCondition } from "../lib/api-types";
import { type EditorState, isSearchable } from "../lib/assist-state";
import { OptionButtons } from "./OptionButtons";
import { color, font, radius } from "./theme";

type EditSlot = "qty_kg" | "urgency" | "fulfillment";
const GROUPS: { slot: EditSlot; title: string; options: readonly Option[] }[] = [
  { slot: "qty_kg", title: "양", options: QTY_OPTIONS },
  { slot: "urgency", title: "언제까지", options: URGENCY_OPTIONS },
  { slot: "fulfillment", title: "받는 방식", options: FULFILLMENT_OPTIONS },
];

// 칩 하나 편집(WF-08)은 고르는 즉시 다시 검색한다.
// recover(WF-12 AI 실패)는 빠진 조건을 모두 고른 뒤 [이 조건으로 찾기].
export function ChipEditor({
  editor,
  condition,
  disabled,
  onSubmit,
  onClose,
}: {
  editor: Exclude<EditorState, "closed">;
  condition: PartialCondition;
  disabled: boolean;
  onSubmit: (changes: Partial<PartialCondition>) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Partial<PartialCondition>>({});

  if (editor !== "recover") {
    const g = GROUPS.find((x) => x.slot === editor)!;
    return (
      <View style={styles.box}>
        <Text style={styles.title}>{g.title} 바꾸기</Text>
        <OptionButtons options={g.options} selected={condition[g.slot]} disabled={disabled} onPick={(o) => onSubmit({ [g.slot]: o.value })} />
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}>
          <Text style={styles.cancelLabel}>닫기</Text>
        </Pressable>
      </View>
    );
  }

  const merged = { ...condition, ...draft };
  // 양은 '잘 모르겠어요'(null)도 고른 값이다. 아직 안 고른 칸만 미선택으로 본다.
  const picked = (slot: EditSlot) => (slot in draft ? merged[slot] : condition[slot] ?? undefined);
  const ready = isSearchable(merged);
  return (
    <View style={styles.box}>
      <Text style={styles.title}>조건을 직접 골라 주세요</Text>
      {GROUPS.map((g) => (
        <View key={g.slot} style={styles.group}>
          <Text style={styles.groupTitle}>{g.title}</Text>
          <OptionButtons options={g.options} selected={picked(g.slot)} disabled={disabled} onPick={(o) => setDraft((d) => ({ ...d, [g.slot]: o.value }))} />
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        disabled={!ready || disabled}
        onPress={() => onSubmit(draft)}
        style={[styles.submit, (!ready || disabled) && styles.submitOff]}
      >
        <Text style={styles.submitLabel}>이 조건으로 찾기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 12, padding: 14, borderRadius: radius, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  title: { fontSize: font.large, fontWeight: "700", color: color.ink },
  group: { gap: 6 },
  groupTitle: { fontSize: font.small, color: color.sub, fontWeight: "600" },
  cancel: { alignSelf: "flex-start", paddingVertical: 6 },
  cancelLabel: { fontSize: font.body, color: color.sub },
  submit: { backgroundColor: color.green, borderRadius: radius, paddingVertical: 14, alignItems: "center" },
  submitOff: { opacity: 0.4 },
  submitLabel: { color: "#ffffff", fontSize: font.large, fontWeight: "700" },
});
