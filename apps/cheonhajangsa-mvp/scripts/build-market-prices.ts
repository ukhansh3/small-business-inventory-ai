import { existsSync, writeFileSync } from "node:fs";
import { validateMarketPrices, type MarketPricesFile } from "../core/market-prices";

// 수원 시세 저장본 만들기: npx tsx scripts/build-market-prices.ts [기준일 YYYY-MM-DD]
// - 도매: 한국농수산식품유통공사 전국 공영도매시장 실시간 경매정보(수원 310101), kg당 낙찰가 중앙값
// - 소매: 한국농수산식품유통공사 기간별 소매가격 정보(수원 지동시장·대형유통), 상품 등급 kg 환산가
// 키는 .env.local의 DATA_GO_KR_KEY에서 읽고 출력하지 않는다. 결과는 data/market_prices.json.

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const KEY = process.env.DATA_GO_KR_KEY;
if (!KEY) throw new Error("DATA_GO_KR_KEY가 없습니다(.env.local).");

const MARKET_CODE = "310101";
const RETAIL_SGG = "3111";
const LOOKBACK_DAYS = 10; // 휴장일이 이어져도 가장 최근 거래일을 찾는다

// 앱 품목 → 경매 중분류명, 소매 품목·품종 코드
const ITEMS: { item_id: string; auction: string[]; retail: { item: string; vrty: string } }[] = [
  { item_id: "item_lettuce", auction: ["상추"], retail: { item: "214", vrty: "01" } },
  { item_id: "item_onion", auction: ["양파"], retail: { item: "245", vrty: "00" } },
  { item_id: "item_green_onion", auction: ["대파"], retail: { item: "246", vrty: "00" } },
  { item_id: "item_potato", auction: ["감자"], retail: { item: "152", vrty: "01" } },
];

type Row = Record<string, string | null>;

async function call(path: string, params: Record<string, string>): Promise<{ total: number; items: Row[] }> {
  const q = new URLSearchParams({ serviceKey: KEY!, returnType: "json", ...params });
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`https://apis.data.go.kr/B552845/${path}?${q}`, { signal: AbortSignal.timeout(90_000) });
      const body = (await res.json()).response.body;
      const raw = body.items?.item ?? body.items ?? [];
      return { total: Number(body.totalCount ?? 0), items: Array.isArray(raw) ? raw : [raw] };
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
    }
  }
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2);
}

function addDays(iso: string, d: number): string {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + d);
  return t.toISOString().slice(0, 10);
}

async function auctionDay(day: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let page = 1; ; page++) {
    const { total, items } = await call("katRealTime2/trades2", {
      pageNo: String(page), numOfRows: "1000",
      "cond[whsl_mrkt_cd::EQ]": MARKET_CODE, "cond[trd_clcln_ymd::EQ]": day,
    });
    rows.push(...items);
    if (rows.length >= total || items.length === 0) return rows;
  }
}

async function main() {
  const base = process.argv[2] ?? new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  // 도매: 품목마다 기준일부터 거꾸로, 거래가 3건 이상인 가장 최근 날
  const dayCache = new Map<string, Row[]>();
  const dayRows = async (day: string) => {
    if (!dayCache.has(day)) dayCache.set(day, await auctionDay(day));
    return dayCache.get(day)!;
  };
  async function wholesaleFor(names: string[]): Promise<{ date: string; per_kg: number; trades: number } | null> {
    for (let i = 0; i <= LOOKBACK_DAYS; i++) {
      const day = addDays(base, -i);
      const perKg: number[] = [];
      for (const r of await dayRows(day)) {
        const name = names.includes(r.gds_mclsf_nm ?? "") || names.includes(r.corp_gds_item_nm ?? "");
        if (!name || r.unit_nm !== "kg") continue;
        const qty = Number(r.unit_qty), price = Number(r.scsbd_prc);
        if (qty > 0 && price > 0) perKg.push(price / qty);
      }
      if (perKg.length >= 3) return { date: day, per_kg: median(perKg), trades: perKg.length };
    }
    return null;
  }
  // 소매: 최근 기간을 받아 품목마다 가장 최근 조사일
  const from = addDays(base, -LOOKBACK_DAYS).replaceAll("-", "");
  const to = base.replaceAll("-", "");
  const file: MarketPricesFile = {
    region: "수원",
    built_on: base,
    sources: {
      wholesale: "한국농수산식품유통공사 전국 공영도매시장 실시간 경매정보(수원 농수산물도매시장), kg당 낙찰가 중앙값",
      retail: "한국농수산식품유통공사 기간별 소매가격 정보(수원 지동시장·대형유통 1곳), 상품 등급 kg 환산가",
    },
    items: [],
  };
  for (const it of ITEMS) {
    const wholesale = await wholesaleFor(it.auction);
    const { items: retail } = await call("periodRetail/price", {
      pageNo: "1", numOfRows: "1000",
      "cond[exmn_ymd::GTE]": from, "cond[exmn_ymd::LTE]": to,
      "cond[sgg_cd::EQ]": RETAIL_SGG, "cond[item_cd::EQ]": it.retail.item,
    });
    const good = retail.filter((r) => r.vrty_cd === it.retail.vrty && r.grd_nm === "상품" && Number(r.exmn_dd_cnvs_prc) > 0);
    const lastDay = good.map((r) => r.exmn_ymd!).sort().at(-1) ?? null;
    const pick = (market: "지동" | "other") => {
      const r = good.find((x) => x.exmn_ymd === lastDay && (market === "지동" ? x.mrkt_nm === "지동" : x.mrkt_nm !== "지동"));
      return r ? Math.round(Number(r.exmn_dd_cnvs_prc)) : null;
    };
    file.items.push({
      item_id: it.item_id,
      wholesale,
      retail: lastDay ? { date: `${lastDay.slice(0, 4)}-${lastDay.slice(4, 6)}-${lastDay.slice(6)}`, traditional_market_per_kg: pick("지동"), large_retailer_per_kg: pick("other") } : null,
    });
  }
  const checked = validateMarketPrices(file);
  if (!checked.ok) throw new Error(`형식 오류:\n${checked.errors.join("\n")}`);
  writeFileSync("data/market_prices.json", JSON.stringify(file, null, 2) + "\n");
  for (const i of file.items) {
    console.log(i.item_id, "도매", i.wholesale?.per_kg ?? "-", `(${i.wholesale?.trades ?? 0}건, ${i.wholesale?.date ?? "-"})`, "소매", i.retail?.traditional_market_per_kg ?? "-", "/", i.retail?.large_retailer_per_kg ?? "-", `(${i.retail?.date ?? "-"})`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
