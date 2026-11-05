import { StyleSheet, Text, View } from "react-native";
import type { SearchResult, VendorCard as Card } from "../../core/search-types";
import { color, font } from "./theme";
import { VendorCard } from "./VendorCard";

export function ResultList({ results, onCall, onDetail }: { results: SearchResult; onCall: (c: Card) => void; onDetail: (c: Card) => void }) {
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
            <VendorCard key={c.vendor_id} card={c} dimmed={g.key !== "available"} onCall={() => onCall(c)} onDetail={() => onDetail(c)} />
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
