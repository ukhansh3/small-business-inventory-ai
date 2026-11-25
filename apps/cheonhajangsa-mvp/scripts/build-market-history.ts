import { existsSync, writeFileSync } from "node:fs";
import { addDays, auctionPerKg, dataGoKrGetter, MARKET_ITEMS, median, MIN_TRADES, seoulToday, SOURCES } from "../core/market-build";
import { type MarketHistoryFile, validateMarketHistory, weekStart } from "../core/market-history";

// 수원 도매 시세 주간 추이 저장본: npx tsx scripts/build-market-history.ts [주 수, 기본 6] [기준일]
// 하루·품목씩 경매 기록을 받아 주(월~일)마다 kg당 낙찰가 중앙값을 낸다. 결과는 data/market_history.json.
// 키는 .env.local의 DATA_GO_KR_KEY에서 읽고 출력하지 않는다.

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const KEY = process.env.DATA_GO_KR_KEY;
if (!KEY) throw new Error("DATA_GO_KR_KEY가 없습니다(.env.local).");

async function main() {
  const weeksWanted = Number(process.argv[2] ?? 6);
  const base = process.argv[3] ?? seoulToday(new Date());
  const first = addDays(weekStart(base), -7 * (weeksWanted - 1));
  const get = dataGoKrGetter(KEY!, { timeoutMs: 60_000, retries: 3 });
  const days: string[] = [];
  for (let d = first; d <= base; d = addDays(d, 1)) days.push(d);

  const file: MarketHistoryFile = { region: "수원", built_on: base, source: SOURCES.wholesale, items: [] };
  for (const it of MARKET_ITEMS) {
    const byWeek = new Map<string, number[]>();
    for (const day of days) {
      const xs = await auctionPerKg(get, day, it.auction);
      const ws = weekStart(day);
      byWeek.set(ws, [...(byWeek.get(ws) ?? []), ...xs]);
    }
    const weeks = [...byWeek.entries()]
      .filter(([, xs]) => xs.length >= MIN_TRADES)
      .map(([week_start, xs]) => ({ week_start, per_kg: median(xs), trades: xs.length }))
      .sort((a, b) => a.week_start.localeCompare(b.week_start));
    file.items.push({ item_id: it.item_id, weeks });
    console.log(it.item_id, weeks.map((w) => `${w.week_start.slice(5)} ${w.per_kg}(${w.trades})`).join(" · "));
  }
  const checked = validateMarketHistory(file);
  if (!checked.ok) throw new Error(`형식 오류:\n${checked.errors.join("\n")}`);
  writeFileSync("data/market_history.json", JSON.stringify(file, null, 2) + "\n");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
