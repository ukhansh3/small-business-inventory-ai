import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { changeLabels, type Ladder, type LadderRow } from "../../core/market-prices";
import type { Market, PriceLine } from "../lib/api-types";
import { wonRange } from "../lib/won-range";
import { color, font, radius } from "./theme";

// 시세 카드(v3, R-28). 위: 판정 띠(사장님 값이 있을 때) + 상자 값 + 등락. "근거 보기"를 누르면 가격 사다리.
// 사다리는 서버가 만든 값(경매·서울 가락 상회·수원 소매)을 그대로 보여 주고, 사장님 값이 어느 칸에 드는지만 표시한다.
// 사다리가 없으면(상회 값이 아직 없을 때) 예전 한 줄 시세를 보여 준다(R-23·R-27).
export function MarketLine({ market, mine }: { market: Market; mine?: PriceLine | null }) {
  if (market.ladder) return <LadderCard ladder={market.ladder} mine={mine ?? null} weeks={market.weeks ?? null} />;
  return (
    <View style={styles.box} accessibilityLabel={market.reference ? "수원 시세" : "동네 시세"}>
      <Text style={styles.label}>{market.reference ? "수원 시세 · 공공데이터" : "동네 시세"}</Text>
      <Text style={styles.text}>{market.display}</Text>
      {!!market.trend && <Text style={styles.trend}>{market.trend}</Text>}
      {!!market.weeks && market.weeks.length >= 2 && <WeekBars weeks={market.weeks} />}
    </View>
  );
}


const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

const TONE = {
  cheaper: { bg: color.greenSoft, ink: color.green },
  normal: { bg: color.soft, ink: color.ink },
  pricier: { bg: color.redSoft, ink: color.red },
} as const;

function LadderCard({ ladder, mine, weeks }: { ladder: Ladder; mine: PriceLine | null; weeks: { week_start: string; per_kg: number }[] | null }) {
  const [open, setOpen] = useState(false);
  const item = ladder.item_name ?? "";
  const judged = mine && mine.verdict && mine.verdict_title && typeof mine.box_won === "number" ? mine : null;
  const tone = judged ? TONE[judged.verdict!] : null;
  const trader = ladder.rows.find((r) => r.key === "trader");
  const retail = ladder.rows.find((r) => r.key === "retail");
  const chips = changeLabels(ladder.change);
  return (
    <View style={[styles.card, mine && styles.cardFlat]}>
      {judged && tone && (
        <View style={[styles.verdict, { backgroundColor: tone.bg }]} accessibilityRole="summary">
          <Text style={[styles.verdictTitle, { color: tone.ink }]}>{judged.verdict_title}</Text>
          <Text style={[styles.verdictSub, { color: tone.ink }]}>{judged.verdict_display}</Text>
        </View>
      )}
      <Text style={styles.headline}>
        {item} {ladder.box_label}
        {judged ? ` · ${judged.box_won!.toLocaleString("ko-KR")}원` : " 시세"}
      </Text>
      {!judged && (
        <Text style={styles.summary}>
          {trader ? `도매시장 상회 ${wonRange(trader.low, trader.high)}` : ""}
          {trader && retail ? " · " : ""}
          {retail ? `마트·시장 ${wonRange(retail.low, retail.high)}` : ""}
        </Text>
      )}
      {chips.length > 0 && (
        <View style={styles.chips}>
          {chips.map((c) => (
            <View key={c} style={styles.chipBox}>
              <Text style={styles.chip}>{c}</Text>
            </View>
          ))}
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={styles.toggle}
      >
        <Text style={styles.toggleText}>{open ? "근거 접기" : "근거 보기"}</Text>
      </Pressable>
      {open && <LadderView ladder={ladder} mineBox={judged ? judged.box_won! : null} />}
      {open && !!weeks && weeks.length >= 2 && <WeekBars weeks={weeks} />}
      {open && (
        <Text style={styles.source}>
          {ladder.rows.map((r) => `${r.label} ${md(r.date)}`).join(" · ")}. {ladder.source}
        </Text>
      )}
    </View>
  );
}

// 위가 비싼 쪽. 사장님 값이 드는 칸은 연한 주황으로 칠하고 그 안에 표시, 칸 사이면 칸 사이에 표시
function LadderView({ ladder, mineBox }: { ladder: Ladder; mineBox: number | null }) {
  const asc = [...ladder.rows].sort((a, b) => a.high - b.high);
  type Item = { kind: "row"; row: LadderRow; hasMine: boolean } | { kind: "mine" };
  const items: Item[] = [];
  let placed = mineBox === null;
  for (const row of asc) {
    if (!placed && mineBox! < row.low) {
      items.push({ kind: "mine" });
      placed = true;
    }
    const inside = !placed && mineBox! >= row.low && mineBox! <= row.high;
    items.push({ kind: "row", row, hasMine: inside });
    if (inside) placed = true;
  }
  if (!placed) items.push({ kind: "mine" });
  const top = items.reverse();
  const mineLabel = mineBox !== null ? `사장님 ${mineBox.toLocaleString("ko-KR")}원` : "";
  return (
    <View style={styles.ladder} accessibilityLabel={`가격 사다리: ${ladder.rows.map((r) => `${r.label} ${wonRange(r.low, r.high)}`).join(", ")}${mineLabel ? `, ${mineLabel}` : ""}`}>
      <View style={styles.rail} />
      {top.map((it, i) =>
        it.kind === "mine" ? (
          <View key={`mine-${i}`} style={styles.mineRow}>
            <View style={styles.mineDot} />
            <Text style={styles.minePill}>{mineLabel}</Text>
          </View>
        ) : (
          <View key={it.row.key} style={[styles.step, it.hasMine && styles.stepMine]}>
            <View style={[styles.stepDot, it.hasMine && styles.stepDotMine]} />
            <View style={styles.stepCopy}>
              <Text style={styles.stepLabel}>{it.row.label}</Text>
              <Text style={styles.stepValue}>{wonRange(it.row.low, it.row.high)}</Text>
              {it.hasMine && <Text style={styles.minePill}>{mineLabel}</Text>}
            </View>
          </View>
        ),
      )}
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
      <Text style={styles.chartTitle}>수원 경매 주간 kg당 값</Text>
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

  card: { gap: 10, padding: 14, borderRadius: radius, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  cardFlat: { padding: 0, borderWidth: 0 }, // 가격 진단 카드 안에서는 테두리 없이(카드 속 카드 방지)
  verdict: { gap: 2, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12 },
  verdictTitle: { fontSize: 20, fontWeight: "800" },
  verdictSub: { fontSize: font.body },
  headline: { fontSize: font.large, fontWeight: "700", color: color.ink },
  summary: { fontSize: font.body, color: color.sub, lineHeight: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chipBox: { backgroundColor: color.soft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  chip: { fontSize: 13, color: color.ink },
  toggle: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", paddingHorizontal: 2 },
  toggleText: { fontSize: font.body, fontWeight: "700", color: color.green },

  ladder: { position: "relative", gap: 4, paddingVertical: 4 },
  rail: { position: "absolute", left: 13, top: 18, bottom: 18, width: 2, backgroundColor: color.line },
  step: { flexDirection: "row", gap: 12, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12 },
  stepMine: { backgroundColor: color.greenSoft },
  stepDot: { width: 12, height: 12, marginTop: 4, borderRadius: 6, borderWidth: 2, borderColor: color.faint, backgroundColor: color.surface },
  stepDotMine: { borderColor: color.green, backgroundColor: color.green },
  stepCopy: { flex: 1, gap: 2 },
  stepLabel: { fontSize: font.body, fontWeight: "700", color: color.ink },
  stepValue: { fontSize: 22, fontWeight: "800", color: color.ink },
  mineRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 8, paddingVertical: 4 },
  mineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.green },
  minePill: { alignSelf: "flex-start", overflow: "hidden", marginTop: 4, fontSize: font.body, fontWeight: "700", color: "#ffffff", backgroundColor: color.green, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  source: { fontSize: 12, color: color.faint, lineHeight: 17 },

  chart: { marginTop: 4, gap: 6 },
  chartTitle: { fontSize: 12, color: color.sub },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  col: { flex: 1, alignItems: "center", gap: 3 },
  value: { fontSize: 11, color: color.faint },
  valueNow: { color: color.ink, fontWeight: "700" },
  bar: { width: "70%", borderRadius: 4, backgroundColor: color.line },
  barNow: { backgroundColor: color.green },
  week: { fontSize: 11, color: color.sub },
});
