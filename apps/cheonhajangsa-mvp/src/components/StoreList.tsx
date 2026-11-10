import { StyleSheet, Text, View } from "react-native";
import type { VendorCard as Card } from "../../core/search-types";
import type { Store } from "../lib/api-types";
import { PublicStoreCard } from "./PublicStoreCard";
import { color, font } from "./theme";
import { VendorCard } from "./VendorCard";

// 지도 홈 기본 목록(v2 4절): 내 위치에서 가까운 순. 판매처는 결과 카드, 공공데이터 가게는 공개 정보 카드
export const LIST_LIMIT = 30;

export function StoreCard({ store, onCall, onDetail }: { store: Store; onCall: (c: Card) => void; onDetail: (c: Card) => void }) {
  return store.vendor_card ? (
    <VendorCard card={store.vendor_card} dimmed={false} onCall={() => onCall(store.vendor_card!)} onDetail={() => onDetail(store.vendor_card!)} />
  ) : (
    <PublicStoreCard store={store} />
  );
}

export function StoreList({ stores, onCall, onDetail }: { stores: Store[]; onCall: (c: Card) => void; onDetail: (c: Card) => void }) {
  const vendors = stores.filter((s) => s.kind === "vendor").length;
  return (
    <View style={styles.list}>
      <Text style={styles.title}>
        근처 식자재 가게 <Text style={styles.count}>{stores.length}</Text>곳
      </Text>
      <Text style={styles.sub}>
        판매처 {vendors}곳(가격·입고 정보 있음) · 공공데이터 가게 {stores.length - vendors}곳. 가까운 {Math.min(LIST_LIMIT, stores.length)}곳을 보여 드려요.
      </Text>
      {stores.slice(0, LIST_LIMIT).map((s) => (
        <StoreCard key={s.store_id} store={s} onCall={onCall} onDetail={onDetail} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  title: { fontSize: font.title, fontWeight: "700", color: color.ink },
  count: { color: color.green },
  sub: { fontSize: font.small, color: color.sub, lineHeight: 20 },
});
