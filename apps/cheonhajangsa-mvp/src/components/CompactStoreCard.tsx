import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Store } from "../lib/api-types";
import { activityText, displayName, toneOf, TONES } from "../lib/store-tone";
import { AppIcon } from "./AppIcon";
import { color } from "./theme";

// 목록 한 줄. 출처 구분(색 점), 이름, 거리, 0이 아닌 사용·저장 수만 보여 준다.
// 이름 첫 글자 타일은 정보가 없어 빼고, 한 화면에 더 많은 곳이 보이게 줄 모양으로 둔다(2026-11-26).
export function CompactStoreCard({ store, location, deliveryLabel }: { store: Pick<Store, "store_id" | "name" | "category" | "distance_m" | "used_count" | "saved_count" | "vendor_card">; location?: string; deliveryLabel?: string | null }) {
  const router = useRouter();
  const distance = store.distance_m < 1000
    ? Math.round(store.distance_m) + "m"
    : (store.distance_m / 1000).toFixed(1) + "km";
  const tone = toneOf(store);
  const t = TONES[tone];
  const name = displayName(store.name);
  const activity = activityText(store.used_count, store.saved_count);
  const showCategory = tone === "shop";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={name + " 상세 보기"}
      onPress={() => router.push({ pathname: "/store/[id]", params: { id: store.store_id, location: location ?? "" } })}
      style={styles.row}>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.distance}>{distance}</Text>
        </View>
        <View style={styles.metaRow}>
          <View style={[styles.dot, { backgroundColor: t.color }]} />
          <Text style={styles.meta} numberOfLines={1}>
            {t.label}{showCategory ? ` · ${store.category}` : ""}
          </Text>
        </View>
        {!!store.vendor_card && <Text style={styles.meta} numberOfLines={1}>{store.vendor_card.open_status.display}</Text>}
        {!!deliveryLabel && <Text style={styles.meta}>{deliveryLabel}</Text>}
        {!!activity && <Text style={styles.activity}>{activity}</Text>}
      </View>
      <View style={styles.arrow}><AppIcon name="next" size={15} color={color.sub} /></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 60,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
    backgroundColor: "#fff",
  },
  copy: { flex: 1, gap: 3 },
  titleRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  distance: { marginLeft: "auto", fontSize: 14, fontWeight: "600", color: color.ink, fontVariant: ["tabular-nums"] },
  name: { flexShrink: 1, fontSize: 16, fontWeight: "700", color: color.ink },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  meta: { flexShrink: 1, fontSize: 13, color: color.sub },
  activity: { fontSize: 12, color: color.faint },
  arrow: { width: 20, alignItems: "center", justifyContent: "center" },
});
