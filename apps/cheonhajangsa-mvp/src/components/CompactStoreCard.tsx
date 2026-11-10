import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Store } from "../lib/api-types";
import { VendorArtwork } from "./VendorArtwork";
import { AppIcon } from "./AppIcon";
import { color } from "./theme";

export function CompactStoreCard({ store, location, deliveryLabel }: { store: Pick<Store, "store_id" | "name" | "category" | "distance_m" | "used_count" | "saved_count" | "vendor_card" | "demo_service">; location?: string; deliveryLabel?: string | null }) {
  const router = useRouter();
  const distance = store.distance_m < 1000
    ? Math.round(store.distance_m) + "m"
    : (store.distance_m / 1000).toFixed(1) + "km";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={store.name + " 상세 보기"}
      onPress={() => router.push({ pathname: "/store/[id]", params: { id: store.store_id, location: location ?? "" } })}
      style={styles.row}>
      <VendorArtwork card={store.vendor_card} store={store} />
      <View style={styles.copy}>
        <Text style={styles.name}>{store.name}</Text>
        <Text style={styles.meta}>{store.category} · {distance}</Text>
        {deliveryLabel && <Text style={styles.meta}>{deliveryLabel}</Text>}
        <View style={styles.badges}>
          <Text style={[styles.badge, styles.used]}>사용 {store.used_count ?? "–"}명</Text>
          <Text style={[styles.badge, styles.saved]}>저장 {store.saved_count ?? "–"}명</Text>
          {!!store.demo_service && <Text style={styles.demo}>시연</Text>}
        </View>
      </View>
      <View style={styles.arrow}><AppIcon name="chevron" size={15} color={color.sub} /></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  copy: { flex: 1, gap: 4 },
  name: { fontSize: 16, fontWeight: "700", color: color.ink },
  meta: { fontSize: 12, color: color.sub },
  badges: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 5, marginTop: 3 },
  badge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, fontSize: 12, fontWeight: "700", color: "#9a3412" },
  used: { backgroundColor: "#ffedd5" },
  saved: { backgroundColor: "#fff7ed" },
  demo: { fontSize: 10, color: color.sub },
  arrow: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: color.soft },
});
