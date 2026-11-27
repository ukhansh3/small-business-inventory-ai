import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Store } from "../lib/api-types";
import { groupRows, type Row } from "../lib/store-groups";
import { TONES } from "../lib/store-tone";
import { AppIcon } from "./AppIcon";
import { CompactStoreCard } from "./CompactStoreCard";
import { color } from "./theme";

// 업체 목록. 같은 자리(도매시장)의 중도매인 여러 곳은 묶음 카드 한 장으로 보여 주고, 누르면 펼친다.
export type StoreRowInput = { store: Store; deliveryLabel?: string | null };

export function StoreRows({ rows, location }: { rows: StoreRowInput[]; location?: string }) {
  // 바깥 목록의 간격(gap)이 줄마다 끼지 않게 한 덩어리로 묶는다
  return (
    <View>
      {groupRows(rows).map((row) =>
        row.type === "single"
          ? <CompactStoreCard key={row.item.store.store_id} store={row.item.store} deliveryLabel={row.item.deliveryLabel} location={location} />
          : <MarketGroup key={row.key} row={row} location={location} />,
      )}
    </View>
  );
}

const PAGE = 10;

function MarketGroup({ row, location }: { row: Extract<Row<StoreRowInput>, { type: "group" }>; location?: string }) {
  const [shown, setShown] = useState(0);
  const first = row.items[0]!.store;
  const t = TONES.wholesale;
  const distance = first.distance_m < 1000 ? Math.round(first.distance_m) + "m" : (first.distance_m / 1000).toFixed(1) + "km";
  return (
    <View style={styles.group}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: shown > 0 }}
        accessibilityLabel={`${row.title} ${row.items.length}곳 ${shown > 0 ? "접기" : "펼치기"}`}
        onPress={() => setShown(shown > 0 ? 0 : PAGE)}
        style={styles.head}
      >
        <View style={[styles.tile, { backgroundColor: t.soft }]}>
          <Text style={[styles.count, { color: t.color }]}>{row.items.length}</Text>
          <Text style={[styles.countUnit, { color: t.color }]}>곳</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.name}>{row.title}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.dot, { backgroundColor: t.color }]} />
            <Text style={styles.meta}>{t.label} {row.items.length}곳 · {distance}</Text>
          </View>
          {!!first.hours && <Text style={styles.meta}>{first.hours}</Text>}
          {!!first.vendor_card && <Text style={styles.meta}>{first.vendor_card.open_status.display}</Text>}
        </View>
        <View style={styles.arrow}><AppIcon name="chevron" size={15} color={color.sub} /></View>
      </Pressable>
      {shown > 0 && (
        <View style={styles.items}>
          {row.items.slice(0, shown).map((it) => (
            <CompactStoreCard key={it.store.store_id} store={it.store} deliveryLabel={it.deliveryLabel} location={location} />
          ))}
          {shown < row.items.length && (
            <Pressable accessibilityRole="button" onPress={() => setShown(shown + PAGE)} style={styles.more}>
              <Text style={styles.moreText}>{Math.min(PAGE, row.items.length - shown)}곳 더 보기 ({shown}/{row.items.length})</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderBottomWidth: 1, borderBottomColor: color.line, backgroundColor: "#fff" },
  head: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
  tile: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  count: { fontSize: 20, fontWeight: "800" },
  countUnit: { fontSize: 13, fontWeight: "700", marginTop: 5 },
  copy: { flex: 1, gap: 4 },
  name: { fontSize: 16, fontWeight: "700", color: color.ink },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  meta: { flexShrink: 1, fontSize: 14, color: color.sub },
  arrow: { width: 20, alignItems: "center", justifyContent: "center" },
  items: { paddingHorizontal: 12, paddingBottom: 8, backgroundColor: color.soft },
  more: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 4, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: color.line },
  moreText: { fontSize: 14, fontWeight: "700", color: color.ink },
});
