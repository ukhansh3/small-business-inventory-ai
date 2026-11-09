import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { distanceDisplay } from "../../core/distance";
import type { Store } from "../lib/api-types";
import { VendorArtwork } from "./VendorArtwork";
import { color, font, radius } from "./theme";

// 공공데이터 가게 카드(R-22, AC-29): 이름·업종·거리·주소와 출처·기준일만. 가격·입고·번호 없음
export function PublicStoreCard({ store }: { store: Store }) {
  const kakaoUrl = `https://map.kakao.com/link/map/${encodeURIComponent(store.name)},${store.lat},${store.lng}`;
  return (
    <View style={styles.card}>
      <VendorArtwork store={store} />
      <View style={styles.head}>
        <Text style={styles.name}>{store.name}</Text>
        <Text style={styles.kind}>{store.category}</Text>
      </View>
      <Text style={styles.main}>{distanceDisplay(store.distance_m).display}</Text>
      <Text style={styles.sub}>{store.address}</Text>
      <Text style={styles.badge}>공공데이터 · 가격·재고 미확인</Text>
      <Text style={styles.source}>
        {store.source} · {store.source_date} 기준
      </Text>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(kakaoUrl)} style={styles.link}>
        <Text style={styles.linkLabel}>카카오맵에서 보기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4, padding: 14, borderRadius: radius, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  head: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  name: { fontSize: font.large, fontWeight: "700", color: color.ink },
  kind: { fontSize: font.small, color: color.sub },
  main: { fontSize: font.body, color: color.ink },
  sub: { fontSize: font.small, color: color.sub },
  badge: { alignSelf: "flex-start", marginTop: 4, fontSize: 12, color: color.sub, backgroundColor: color.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  source: { fontSize: 12, color: color.faint },
  link: { alignSelf: "flex-start", marginTop: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius, borderWidth: 1, borderColor: color.line },
  linkLabel: { fontSize: font.small, color: color.ink, fontWeight: "600" },
});
