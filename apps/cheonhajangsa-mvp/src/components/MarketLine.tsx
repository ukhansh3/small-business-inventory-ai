import { StyleSheet, Text, View } from "react-native";
import type { Market } from "../lib/api-types";
import { color, font, radius } from "./theme";

// v2 동네 시세 한 줄(R-18). 서버 문구 그대로. 표본이 적으면 그 사실을 보여 준다
export function MarketLine({ market }: { market: Market }) {
  return (
    <View style={styles.box} accessibilityLabel="동네 시세">
      <Text style={styles.label}>동네 시세</Text>
      <Text style={styles.text}>{market.display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 2, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  label: { fontSize: 12, fontWeight: "700", color: color.sub },
  text: { fontSize: font.body, color: color.ink, lineHeight: 22 },
});
