import { Pressable, StyleSheet, Text, View } from "react-native";
import type { VendorCard as Card } from "../../core/search-types";
import { VendorArtwork } from "./VendorArtwork";
import { color, font } from "./theme";

// S-03 결과 카드. 강조 순서: 위치·거리·연락처 → 입고 → 가격(보조). 문구는 서버가 만든 그대로.
export function VendorCard({ card, dimmed, onCall, onDetail }: { card: Card; dimmed: boolean; onCall: () => void; onDetail: () => void }) {
  return (
    <View style={[styles.card, dimmed && styles.dimmed]}>
      <VendorArtwork card={card} large />
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
  card: { gap: 6, padding: 16, borderRadius: 18, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, shadowColor: "#14181f", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  dimmed: { backgroundColor: "#fbfbf9" },
  head: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  name: { fontSize: font.large, fontWeight: "700", color: color.ink },
  kind: { fontSize: font.small, color: color.sub },
  example: { fontSize: 12, color: color.amber, backgroundColor: color.amberSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  main: { fontSize: 12, color: color.ink },
  open: { color: color.success, fontWeight: "600" },
  closed: { color: color.red },
  restocked: { color: color.success, fontWeight: "600" },
  sub: { fontSize: 12, color: color.sub, lineHeight:18 },
  price: { fontSize: 18, color: color.green, fontWeight: "600",paddingTop:10,marginTop:4,borderTopWidth:1,borderTopColor:color.line },
  actions: { flexDirection: "row", gap: 8, marginTop: 6 },
  call: { flex: 1, backgroundColor: color.greenSoft, borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  detail: { backgroundColor:color.soft, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18, alignItems: "center" },
  detailLabel: { color: color.ink, fontSize: 12, fontWeight: "600" },
  pressed: { opacity: 0.8 },
  callLabel: { color: color.green, fontSize: 12, fontWeight: "600" },
});
