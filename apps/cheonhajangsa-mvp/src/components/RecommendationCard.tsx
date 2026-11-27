import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { Place, Recommendation } from "../../core/recommend";
import { color, font, radius } from "./theme";
import { displayName } from "../lib/store-tone";

// AI 도우미 추천 카드(ADR-013 팀 검토안). 앱이 고른 한 곳과 이유, 바로 할 일(전화·길찾기).
// 서버가 만든 문구를 그대로 보여 준다.
// 길찾기 버튼은 위치 보기(link/map)가 아니라 바로 길 안내(link/to)를 연다
const mapUrl = (p: Place) => `https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`;

// 적정 견적 문장에서 금액 범위만 굵게(문장 전체를 굵게 하면 읽기 어렵다)
function emphasizeWon(text: string) {
  const parts = text.split(/(\d[\d.,]*만?\u2060?~\u2060?\d[\d.,]*만?원)/);
  return parts.map((part, i) => (i % 2 === 1 ? <Text key={i} style={styles.benchmarkWon}>{part}</Text> : part));
}

// 금액 범위 "2만~2.5만원"이 "~"에서 줄바꿈되지 않게 앞뒤에 줄바꿈 금지 문자(U+2060)를 넣는다(화면 표시 전용)
const keepRange = (t: string) => t.replace(/~/g, "\u2060~\u2060");

// 서버 이유 문장 "설명 · 값"을 둘로 나눈다. 사장님은 값(거리·금액)만 훑어봐도 되게 값을 굵고 크게 둔다
function splitReason(r: string): { caption: string; value: string | null } {
  const i = r.lastIndexOf(" · ");
  return i < 0 ? { caption: r, value: null } : { caption: r.slice(0, i), value: r.slice(i + 3) };
}

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const p = rec.primary;
  const call = rec.situation === "bulk_delivery" && p.phone;
  return (
    <View style={styles.card} accessibilityLabel={`추천: ${rec.headline}`}>
      <View style={styles.head}>
        <Text style={styles.label}>{rec.label}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.headline}>{rec.headline}</Text>
        {rec.reasons.map((r) => {
          const { caption, value } = splitReason(r);
          const price = !!value && /원/.test(value);
          return price ? (
            <View key={r} style={styles.priceBox}>
              <Text style={styles.priceCaption}>{caption}</Text>
              <Text style={styles.priceValue}>{keepRange(value!)}</Text>
            </View>
          ) : (
            <View key={r} style={styles.fact}>
              {!!value && <Text style={styles.factValue}>{value}</Text>}
              <Text style={styles.factCaption}>{caption}</Text>
            </View>
          );
        })}
        {!!rec.benchmark && (
          <View style={styles.priceBox}>
            <Text style={styles.benchmarkText}>{emphasizeWon(keepRange(rec.benchmark))}</Text>
          </View>
        )}
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(call ? `tel:${p.phone}` : mapUrl(p))}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>{call ? `전화하기 ${p.phone}` : "길찾기"}</Text>
        </Pressable>
        {/* 동네 가게: 카카오맵에서 찾은 전화·장소 링크(서버가 보는 순간 조회). 가기 전에 여는지 물어보거나 영업시간을 본다 */}
        {!call && (!!p.phone || !!p.place_url) && (
          <View style={styles.contactRow}>
            {!!p.phone && (
              <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`tel:${p.phone}`)} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                <Text style={styles.secondaryText}>전화하기</Text>
                <Text style={styles.secondarySub}>{p.phone}</Text>
              </Pressable>
            )}
            {!!p.place_url && (
              <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(p.place_url!)} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                <Text style={styles.secondaryText}>영업시간 보기</Text>
                <Text style={styles.secondarySub}>카카오맵</Text>
              </Pressable>
            )}
          </View>
        )}
        {/* 보조 안내 "문장 · 거리 · 영업시간": 문장은 한 줄, 나머지는 꼬리표로(줄 첫머리에 "·"가 오지 않게) */}
        {!!rec.extra && (() => {
          const [lead, ...tags] = rec.extra.split(" · ");
          return (
            <View style={styles.extraBox}>
              <Text style={styles.extra}>{lead}</Text>
              {tags.length > 0 && <View style={styles.tags}>{tags.map((t) => <Text key={t} style={styles.tag}>{keepRange(t)}</Text>)}</View>}
            </View>
          );
        })()}
      </View>
      {rec.others.length > 0 && (
        <View style={styles.others}>
          <Text style={styles.othersTitle}>다른 곳</Text>
          {rec.others.map((o) => {
            // 급할 때는 걸어갈 곳이라 다른 곳도 길찾기. 배달은 전화
            const dial = !!o.phone && rec.situation !== "urgent_small";
            return (
              <Pressable
                key={o.id}
                accessibilityRole="link"
                accessibilityLabel={`${o.name} ${dial ? "전화하기" : "길찾기"}`}
                onPress={() => void Linking.openURL(dial ? `tel:${o.phone}` : mapUrl(o))}
                style={({ pressed }) => [styles.other, pressed && styles.pressed]}
              >
                <View style={styles.otherCopy}>
                  <Text style={styles.otherName} numberOfLines={1}>{displayName(o.name)}</Text>
                  <Text style={styles.otherMeta} numberOfLines={1}>{o.kind} · {o.distance_text}</Text>
                </View>
                <Text style={styles.otherAction}>{dial ? "전화" : "길찾기"}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

// 2026-11-27 사용자 지적(단색 덩어리·작은 글자·줄바꿈) 반영: 초록 머리띠 + 흰 본문 + 노란 가격 칸, 본문 16px 이상
const styles = StyleSheet.create({
  card: { borderRadius: radius, backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.green, overflow: "hidden" },
  head: { paddingHorizontal: 16, paddingVertical: 9, backgroundColor: color.green },
  label: { fontSize: 15, fontWeight: "800", color: "#ffffff" },
  body: { gap: 12, padding: 16 },
  headline: { fontSize: 24, fontWeight: "900", color: color.ink, lineHeight: 32, letterSpacing: -0.4 },
  fact: { gap: 2 },
  factValue: { fontSize: 19, fontWeight: "800", color: color.ink, lineHeight: 26 },
  factCaption: { fontSize: font.body, color: color.sub, lineHeight: 23 },
  priceBox: { gap: 2, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: color.amberSoft },
  priceCaption: { fontSize: font.body, color: "#78350f", lineHeight: 23 },
  priceValue: { fontSize: 24, fontWeight: "900", color: color.ink, lineHeight: 32, letterSpacing: -0.3 },
  benchmarkText: { fontSize: font.body, color: color.ink, lineHeight: 24 },
  benchmarkWon: { fontWeight: "900", fontSize: 19 },
  primary: { minHeight: 56, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: color.green },
  primaryText: { color: "#ffffff", fontSize: 19, fontWeight: "900" },
  pressed: { opacity: 0.75 },
  contactRow: { flexDirection: "row", gap: 8 },
  secondary: { flex: 1, minHeight: 56, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: color.green, backgroundColor: color.surface, paddingVertical: 6 },
  secondaryText: { color: color.green, fontSize: 16, fontWeight: "800" },
  secondarySub: { color: color.sub, fontSize: 13 },
  extraBox: { gap: 6 },
  extra: { fontSize: font.body, color: color.sub, lineHeight: 23 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { fontSize: 14, color: color.ink, backgroundColor: color.soft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: "hidden" },
  others: { gap: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.soft },
  othersTitle: { fontSize: 14, fontWeight: "800", color: color.sub, marginBottom: 4 },
  other: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10 },
  otherCopy: { flex: 1, gap: 1 },
  otherName: { fontSize: font.body, fontWeight: "800", color: color.ink },
  otherMeta: { fontSize: 14, color: color.sub },
  otherAction: { fontSize: font.body, fontWeight: "800", color: color.green },
});
