import { StyleSheet, Text, View } from "react-native";
import type { SearchResult } from "../../core/search-types";
import { color, font } from "./theme";
import { CompactStoreCard } from "./CompactStoreCard";
import type { Store } from "../lib/api-types";

export function ResultList({ results, stores, location }: { results: SearchResult; stores: Store[]; location?: string }) {
  if (results.total === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>조건에 맞는 곳이 없어요</Text>
        {results.empty_hint && <Text style={styles.hint}>{results.empty_hint}</Text>}
        <Text style={styles.hint}>위 조건 칩을 눌러 바꿔 보세요.</Text>
      </View>
    );
  }
  return (
    <View style={styles.list}>
      {results.groups.map((g) => (
        <View key={g.key} style={styles.group}>
          <Text style={styles.groupTitle}>
            {g.title} <Text style={styles.count}>{g.count}</Text>
          </Text>
          {g.items.map((c) => (
            <CompactStoreCard key={c.vendor_id} location={location} deliveryLabel={c.delivery.display} store={stores.find((store) => store.store_id === c.vendor_id) ?? {
              store_id: c.vendor_id, name: c.name, category: c.kind, distance_m: c.distance.meters,
            }} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 20 },
  group: { gap: 10 },
  groupTitle: { fontSize: font.title, fontWeight: "700", color: color.ink },
  count: { color: color.green },
  empty: { gap: 6, padding: 16, alignItems: "center" },
  emptyTitle: { fontSize: font.large, fontWeight: "700", color: color.ink },
  hint: { fontSize: font.body, color: color.sub, textAlign: "center" },
});
