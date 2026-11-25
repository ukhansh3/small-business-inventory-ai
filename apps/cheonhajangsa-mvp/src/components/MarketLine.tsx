import { StyleSheet, Text, View } from "react-native";
import type { Market } from "../lib/api-types";
import { color, font, radius } from "./theme";

// 시세 한 줄. v3는 수원 실제 시세(R-23), 없으면 v2 동네 시세(R-18). 서버 문구 그대로.
// v3(R-27): 일주일 전 대비 한 줄과 주간 도매가 막대(마지막 막대가 이번 주)
export function MarketLine({ market }: { market: Market }) {
  return (
    <View style={styles.box} accessibilityLabel={market.reference ? "수원 시세" : "동네 시세"}>
      <Text style={styles.label}>{market.reference ? "수원 시세 · 공공데이터" : "동네 시세"}</Text>
      <Text style={styles.text}>{market.display}</Text>
      {!!market.trend && <Text style={styles.trend}>{market.trend}</Text>}
      {!!market.weeks && market.weeks.length >= 2 && <WeekBars weeks={market.weeks} />}
    </View>
  );
}

const BAR_MAX = 44;

function WeekBars({ weeks }: { weeks: { week_start: string; per_kg: number }[] }) {
  const max = Math.max(...weeks.map((w) => w.per_kg));
  const label = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
  const summary = weeks.map((w) => `${label(w.week_start)}주 ${w.per_kg.toLocaleString("ko-KR")}원`).join(", ");
  return (
    <View style={styles.chart} accessible accessibilityLabel={`주간 도매가(kg당): ${summary}`}>
      <Text style={styles.chartTitle}>주간 도매가(kg당)</Text>
      <View style={styles.bars}>
        {weeks.map((w, i) => {
          const last = i === weeks.length - 1;
          return (
            <View key={w.week_start} style={styles.col}>
              <Text style={[styles.value, last && styles.valueNow]}>{w.per_kg.toLocaleString("ko-KR")}</Text>
              <View style={[styles.bar, { height: Math.max(4, Math.round((w.per_kg / max) * BAR_MAX)) }, last && styles.barNow]} />
              <Text style={styles.week}>{last ? "이번 주" : label(w.week_start)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 2, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  label: { fontSize: 12, fontWeight: "700", color: color.sub },
  text: { fontSize: font.body, color: color.ink, lineHeight: 22 },
  trend: { fontSize: font.body, color: color.ink, fontWeight: "700", lineHeight: 22 },
  chart: { marginTop: 8, gap: 6 },
  chartTitle: { fontSize: 12, color: color.sub },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  col: { flex: 1, alignItems: "center", gap: 3 },
  value: { fontSize: 11, color: color.faint },
  valueNow: { color: color.ink, fontWeight: "700" },
  bar: { width: "70%", borderRadius: 4, backgroundColor: color.line },
  barNow: { backgroundColor: color.green },
  week: { fontSize: 11, color: color.sub },
});
