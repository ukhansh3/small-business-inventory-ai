import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ChoiceValue, Option } from "../lib/api-types";
import { color, font } from "./theme";

// 되묻기 선택지와 칩 편집이 같이 쓰는 버튼 묶음
export function OptionButtons({
  options,
  selected,
  disabled,
  onPick,
}: {
  options: readonly Option[];
  selected?: ChoiceValue | undefined;
  disabled?: boolean;
  onPick: (o: Option) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((o) => {
        const on = selected !== undefined && selected === o.value;
        return (
          <Pressable
            key={o.label}
            accessibilityRole="button"
            accessibilityState={{ selected: on, disabled }}
            disabled={disabled}
            onPress={() => onPick(o)}
            style={({ pressed }) => [styles.btn, on && styles.on, pressed && styles.pressed, disabled && styles.disabled]}
          >
            <Text style={[styles.label, on && styles.onLabel]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btn: { borderWidth: 1.5, borderColor: color.green, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: color.surface },
  on: { backgroundColor: color.green },
  pressed: { backgroundColor: color.greenSoft },
  disabled: { opacity: 0.4 },
  label: { fontSize: font.body, color: color.green, fontWeight: "600" },
  onLabel: { color: "#ffffff" },
});
