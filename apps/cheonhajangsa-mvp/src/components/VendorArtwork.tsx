import { StyleSheet, Text, View } from "react-native";
import type { VendorCard } from "../../core/search-types";
import type { Store } from "../lib/api-types";
import { displayName, toneOf, TONES } from "../lib/store-tone";

// 업체 표시 타일. 출처별 색과 이름 첫 글자만 쓴다.
// 실제 가게 사진으로 오해할 수 있어 예시 사진·예시 간판은 쓰지 않는다(중간 시연용 사진은 2026-11-25 삭제).
export function VendorArtwork({ card, store, large = false }: {
  card?: Pick<VendorCard, "vendor_id" | "name" | "is_example" | "kind"> | null;
  store?: Pick<Store, "store_id" | "name" | "category">;
  large?: boolean;
}) {
  const name = store?.name ?? card?.name;
  if (!name) return null;
  const tone = TONES[toneOf({ category: store?.category ?? card?.kind ?? "" })];
  const initial = displayName(name).replace(/^(\((주|유|합)\)|주식회사|농업회사법인|유한회사)\s*/, "").slice(0, 1);
  return (
    <View style={[styles.tile, large && styles.large, { backgroundColor: tone.soft }]} accessible accessibilityLabel={tone.label}>
      <Text style={[styles.initial, large && styles.largeInitial, { color: tone.color }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { width: 56, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  large: { width: "100%", height: 150, marginBottom: 8 },
  initial: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  largeInitial: { fontSize: 48 },
});
