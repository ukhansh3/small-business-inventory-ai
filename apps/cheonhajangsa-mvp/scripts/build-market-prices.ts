import { existsSync, writeFileSync } from "node:fs";
import { buildMarketPrices, dataGoKrGetter, seoulToday } from "../core/market-build";
import { validateMarketPrices } from "../core/market-prices";

// 수원 시세 저장본 만들기: npx tsx scripts/build-market-prices.ts [기준일 YYYY-MM-DD]
// 받는 방식은 core/market-build.ts(서버 실시간 갱신과 같음). 결과는 data/market_prices.json.
// 서버에 DATA_GO_KR_KEY가 있으면 배포 뒤에는 서버가 몇 시간마다 새로 받으므로, 이 저장본은 키가 없거나 공공데이터가 멈췄을 때의 대비용이다.
// 키는 .env.local의 DATA_GO_KR_KEY에서 읽고 출력하지 않는다.

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const KEY = process.env.DATA_GO_KR_KEY;
if (!KEY) throw new Error("DATA_GO_KR_KEY가 없습니다(.env.local).");

async function main() {
  const base = process.argv[2] ?? seoulToday(new Date());
  const file = await buildMarketPrices(dataGoKrGetter(KEY!, { timeoutMs: 90_000, retries: 3 }), base);
  const checked = validateMarketPrices(file);
  if (!checked.ok) throw new Error(`형식 오류:\n${checked.errors.join("\n")}`);
  writeFileSync("data/market_prices.json", JSON.stringify(file, null, 2) + "\n");
  for (const i of file.items) {
    console.log(i.item_id, "도매", i.wholesale?.per_kg ?? "-", `(${i.wholesale?.trades ?? 0}건, ${i.wholesale?.date ?? "-"})`, "일주일 전", i.wholesale_week_ago?.per_kg ?? "-", `(${i.wholesale_week_ago?.date ?? "-"})`, "소매", i.retail?.traditional_market_per_kg ?? "-", "/", i.retail?.large_retailer_per_kg ?? "-", `(${i.retail?.date ?? "-"})`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
