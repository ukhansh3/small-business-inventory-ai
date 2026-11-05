import { Pressable, StyleSheet, Text, View } from "react-native";
import type { VendorCard as Card } from "../../core/search-types";
import { color, font, radius } from "./theme";

// S-03 결과 카드. 강조 순서: 위치·거리·연락처 → 입고 → 가격(보조). 문구는 서버가 만든 그대로.
export function VendorCard({ card, dimmed, onCall, onDetail }: { card: Card; dimmed: boolean; onCall: () => void; onDetail: () => void }) {
  return (
    <View style={[styles.card, dimmed && styles.dimmed]}>
      <View style={styles.head}>
        <Text style={styles.name}>{card.name}</Text>
        <Text style={styles.kind}>{card.kind}</Text>
        {card.is_example && <Text style={styles.example}>예시</Text>}
      </View>
      <Text style={styles.main}>
        {card.distance.display} · <Text style={card.open_status.state === "open" ? styles.open : styles.closed}>{card.open_status.display}</Text>
      </Text>
      {card.restock.display && (
        <Text style={[styles.main, card.restock.state === "restocked_today" && styles.restocked]}>{card.restock.display}</Text>
      )}
      {card.delivery.display && (
        <Text style={[styles.sub, card.delivery.state === "unavailable" && styles.closed]}>
          {card.delivery.display}
          {card.delivery.note ? ` · ${card.delivery.note}` : ""}
        </Text>
      )}
      <Text style={styles.sub}>{card.min_sale.display}</Text>
      <Text style={styles.price}>
        {card.price.display}
        {card.price.per_kg_display ? ` ${card.price.per_kg_display}` : ""}
      </Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onCall} style={({ pressed }) => [styles.call, pressed && styles.pressed]}>
          <Text style={styles.callLabel}>전화하기</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onDetail} style={({ pressed }) => [styles.detail, pressed && styles.pressed]}>
          <Text style={styles.detailLabel}>자세히</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 5, padding: 14, borderRadius: radius, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  dimmed: { backgroundColor: "#fbfbf9" },
  head: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  name: { fontSize: font.large, fontWeight: "700", color: color.ink },
  kind: { fontSize: font.small, color: color.sub },
  example: { fontSize: 12, color: color.amber, backgroundColor: color.amberSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  main: { fontSize: font.body, color: color.ink },
  open: { color: color.green, fontWeight: "600" },
  closed: { color: color.red },
  restocked: { color: color.green, fontWeight: "600" },
  sub: { fontSize: font.body, color: color.sub },
  price: { fontSize: font.small, color: color.faint },
  actions: { flexDirection: "row", gap: 8, marginTop: 6 },
  call: { flex: 1, backgroundColor: color.green, borderRadius: radius, paddingVertical: 12, alignItems: "center" },
  detail: { borderWidth: 1.5, borderColor: color.green, borderRadius: radius, paddingVertical: 12, paddingHorizontal: 18, alignItems: "center" },
  detailLabel: { color: color.green, fontSize: font.large, fontWeight: "700" },
  pressed: { opacity: 0.8 },
  callLabel: { color: "#ffffff", fontSize: font.large, fontWeight: "700" },
});
