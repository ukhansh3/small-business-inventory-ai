import { StyleSheet, Text, View } from "react-native";
import type { Market } from "../lib/api-types";
import { color, font, radius } from "./theme";

// 시세 한 줄. v3는 수원 실제 시세(R-23), 없으면 v2 동네 시세(R-18). 서버 문구 그대로
export function MarketLine({ market }: { market: Market }) {
  return (
    <View style={styles.box} accessibilityLabel={market.reference ? "수원 시세" : "동네 시세"}>
      <Text style={styles.label}>{market.reference ? "수원 시세 · 공공데이터" : "동네 시세"}</Text>
      <Text style={styles.text}>{market.display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 2, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  label: { fontSize: 12, fontWeight: "700", color: color.sub },
  text: { fontSize: font.body, color: color.ink, lineHeight: 22 },
});
