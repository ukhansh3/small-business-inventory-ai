import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { Place, Recommendation } from "../../core/recommend";
import { color, font, radius } from "./theme";

// AI 도우미 추천 카드(ADR-013 팀 검토안). 앱이 고른 한 곳과 이유, 바로 할 일(전화·길찾기).
// 서버가 만든 문구를 그대로 보여 준다.
const mapUrl = (p: Place) => `https://map.kakao.com/link/map/${encodeURIComponent(p.name)},${p.lat},${p.lng}`;

// 적정 견적 문장에서 금액 범위만 굵게(문장 전체를 굵게 하면 읽기 어렵다)
function emphasizeWon(text: string) {
  const parts = text.split(/(\d[\d.,]*만?~\d[\d.,]*만?원)/);
  return parts.map((part, i) => (i % 2 === 1 ? <Text key={i} style={styles.benchmarkWon}>{part}</Text> : part));
}

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const p = rec.primary;
  const call = rec.situation === "bulk_delivery" && p.phone;
  return (
    <View style={styles.card} accessibilityLabel={`추천: ${rec.headline}`}>
      <Text style={styles.label}>{rec.label}</Text>
      <Text style={styles.headline}>{rec.headline}</Text>
      <View style={styles.reasons}>
        {rec.reasons.map((r) => (
          <View key={r} style={styles.reasonRow}>
            <View style={styles.dot} />
            <Text style={styles.reason}>{r}</Text>
          </View>
        ))}
      </View>
      {!!rec.benchmark && (
        <View style={styles.benchmark}>
          <Text style={styles.benchmarkText}>{emphasizeWon(rec.benchmark)}</Text>
        </View>
      )}
      <Pressable
        accessibilityRole="link"
        onPress={() => void Linking.openURL(call ? `tel:${p.phone}` : mapUrl(p))}
        style={styles.primary}
      >
        <Text style={styles.primaryText}>{call ? `전화하기 ${p.phone}` : "길찾기"}</Text>
      </Pressable>
      {!!rec.extra && <Text style={styles.extra}>{rec.extra}</Text>}
      {rec.others.length > 0 && (
        <View style={styles.others}>
          <Text style={styles.othersTitle}>다른 곳</Text>
          {rec.others.map((o) => (
            <Pressable
              key={o.id}
              accessibilityRole="link"
              accessibilityLabel={`${o.name} ${o.phone ? "전화하기" : "길찾기"}`}
              onPress={() => void Linking.openURL(o.phone ? `tel:${o.phone}` : mapUrl(o))}
              style={styles.other}
            >
              <View style={styles.otherCopy}>
                <Text style={styles.otherName} numberOfLines={1}>{o.name}</Text>
                <Text style={styles.otherMeta} numberOfLines={1}>{o.kind} · {o.distance_text}</Text>
              </View>
              <Text style={styles.otherAction}>{o.phone ? "전화" : "길찾기"}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 16, borderRadius: radius, backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.green },
  label: { fontSize: 13, fontWeight: "700", color: color.green },
  headline: { fontSize: 20, fontWeight: "800", color: color.ink, lineHeight: 27 },
  reasons: { gap: 6 },
  reasonRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 8, backgroundColor: color.faint },
  reason: { flex: 1, fontSize: font.body, color: color.ink, lineHeight: 22 },
  benchmark: { padding: 12, borderRadius: 12, backgroundColor: color.greenSoft },
  benchmarkText: { fontSize: font.body, color: color.ink, lineHeight: 22 },
  benchmarkWon: { fontWeight: "800", color: "#9a3412" },
  primary: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: color.green },
  primaryText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  extra: { fontSize: 13, color: color.sub, lineHeight: 19 },
  others: { gap: 2, paddingTop: 6, borderTopWidth: 1, borderTopColor: color.line },
  othersTitle: { fontSize: 13, fontWeight: "700", color: color.sub, marginBottom: 2 },
  other: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10 },
  otherCopy: { flex: 1, gap: 1 },
  otherName: { fontSize: font.body, fontWeight: "700", color: color.ink },
  otherMeta: { fontSize: 13, color: color.sub },
  otherAction: { fontSize: font.body, fontWeight: "700", color: color.green },
});
