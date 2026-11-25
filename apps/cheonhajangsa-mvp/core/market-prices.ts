import { z } from "zod";
import { won } from "./format";

// 실제 시세(data/market_prices.json은 저장본). scripts/build-market-prices.ts가 만들고,
// 서버는 키가 있으면 몇 시간마다 같은 방식으로 새로 받아 쓴다(server/market-live.ts).
// 도매 = 수원 농수산물도매시장 경매 kg당 낙찰가 중앙값, 소매 = 수원 지동시장·대형유통 kg 환산가.

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const won0 = z.number().int().positive();

export const marketPricesSchema = z.strictObject({
  region: z.string().min(1),
  built_on: isoDate,
  sources: z.strictObject({ wholesale: z.string().min(1), retail: z.string().min(1) }),
  items: z.array(
    z.strictObject({
      item_id: z.string().regex(/^item_[a-z_]+$/),
      wholesale: z.strictObject({
        date: isoDate, per_kg: won0, trades: z.number().int().positive(),
        // kg당 낙찰가 25%·75% 지점(품종·등급이 섞여 있어 범위로 보여 준다, R-28)
        low_per_kg: won0.optional(), high_per_kg: won0.optional(),
      }).nullable(),
      // 최근 거래일의 약 일주일 전 도매가(추이 한 줄용). 옛 저장본에는 없다
      wholesale_week_ago: z.strictObject({ date: isoDate, per_kg: won0, trades: z.number().int().positive() }).nullable().optional(),
      retail: z
        .strictObject({ date: isoDate, traditional_market_per_kg: won0.nullable(), large_retailer_per_kg: won0.nullable() })
        .nullable(),
      // 서울 가락 도매시장 중도매인(상회) 판매가, 상자 한 개 기준 최저~최고(품종·상품/중품 범위, R-28)
      trader: z.strictObject({ date: isoDate, market: z.string().min(1), box_kg: z.number().positive(), low: won0, high: won0 }).nullable().optional(),
      // 중도매 상품 기준 등락률(%). 전주·전월·전년 대비(R-28)
      change: z.strictObject({ date: isoDate, week_pct: z.number(), month_pct: z.number(), year_pct: z.number() }).nullable().optional(),
    }),
  ),
});

export type MarketPricesFile = z.infer<typeof marketPricesSchema>;
export type ItemMarketPrice = MarketPricesFile["items"][number];

export function validateMarketPrices(raw: unknown): { ok: true; data: MarketPricesFile } | { ok: false; errors: string[] } {
  const r = marketPricesSchema.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, errors: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
}

// 품목별 거래 단위(사장님이 실제로 사는 단위). 중도매인 판매가 조사 단위와 같다
export const BOXES: Record<string, { kg: number; label: string }> = {
  item_lettuce: { kg: 4, label: "4kg 한 상자" },
  item_onion: { kg: 15, label: "15kg 한 망" },
  item_green_onion: { kg: 1, label: "1kg 한 단" },
  item_potato: { kg: 20, label: "20kg 한 상자" },
};

const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

// 판정에 쓰는 기준선. 도매가와 소매가(둘 중 낮은 값) 둘 다 있어야 판정한다.
export type Reference = {
  wholesale_per_kg: number;
  wholesale_date: string;
  retail_per_kg: number; // 지동시장·대형유통 중 낮은 값
  retail_date: string;
  traditional_market_per_kg: number | null;
  large_retailer_per_kg: number | null;
  week_ago_per_kg: number | null; // 약 일주일 전 도매가
  week_ago_date: string | null;
  // v3(R-28) 상자 단위 비교
  box: { kg: number; label: string } | null;
  auction_low_per_kg: number; // 경매 kg당 25% 지점(없으면 중앙값)
  auction_high_per_kg: number; // 75% 지점
  trader: { date: string; market: string; box_kg: number; low: number; high: number } | null;
  change: { date: string; week_pct: number; month_pct: number; year_pct: number } | null;
};

export function referenceFor(file: MarketPricesFile | null, itemId: string): Reference | null {
  const it = file?.items.find((i) => i.item_id === itemId);
  if (!it?.wholesale || !it.retail) return null;
  const retailVals = [it.retail.traditional_market_per_kg, it.retail.large_retailer_per_kg].filter((v): v is number => v !== null);
  if (retailVals.length === 0) return null;
  return {
    wholesale_per_kg: it.wholesale.per_kg,
    wholesale_date: it.wholesale.date,
    retail_per_kg: Math.min(...retailVals),
    retail_date: it.retail.date,
    traditional_market_per_kg: it.retail.traditional_market_per_kg,
    large_retailer_per_kg: it.retail.large_retailer_per_kg,
    week_ago_per_kg: it.wholesale_week_ago?.per_kg ?? null,
    week_ago_date: it.wholesale_week_ago?.date ?? null,
    box: BOXES[itemId] ?? null,
    auction_low_per_kg: it.wholesale.low_per_kg ?? it.wholesale.per_kg,
    auction_high_per_kg: it.wholesale.high_per_kg ?? it.wholesale.per_kg,
    trader: it.trader ?? null,
    change: it.change ?? null,
  };
}

export const TREND_FLAT_PCT = 3; // 이 안의 변화는 "비슷해요"

// 추이 한 줄: "도매가가 일주일 전(11/18)보다 12% 올랐어요". 일주일 전 값이 없으면 null
export function trendDisplay(r: Reference): { change_pct: number; display: string } | null {
  if (r.week_ago_per_kg === null || r.week_ago_date === null) return null;
  const pct = Math.round(((r.wholesale_per_kg - r.week_ago_per_kg) / r.week_ago_per_kg) * 100);
  const when = `일주일 전(${md(r.week_ago_date)})`;
  if (Math.abs(pct) < TREND_FLAT_PCT) return { change_pct: pct, display: `도매가가 ${when}과 비슷해요` };
  return { change_pct: pct, display: `도매가가 ${when}보다 ${Math.abs(pct)}% ${pct > 0 ? "올랐어요" : "내렸어요"}` };
}

// 화면 한 줄: "수원 시세(kg당) 도매 1,258원(11/25 경매) · 소매 1,400~2,180원(11/24)"
export function referenceDisplay(r: Reference): string {
  const vals = [r.traditional_market_per_kg, r.large_retailer_per_kg].filter((v): v is number => v !== null).sort((a, b) => a - b);
  const retail = vals.length === 2 && vals[0] !== vals[1] ? `${won(vals[0]!)}~${won(vals[1]!)}원` : `${won(vals[0]!)}원`;
  return `수원 시세(kg당) 도매 ${won(r.wholesale_per_kg)}원(${md(r.wholesale_date)} 경매) · 소매 ${retail}(${md(r.retail_date)})`;
}

export const WHOLESALE_BAND = 1.2; // 도매가의 1.2배까지는 "도매 수준"

// 내 kg당 가격이 도매·소매 사이 어디인지. 경계값은 docs/feature-v3.md R-24
export function verdictAgainstReference(mine: number, r: Reference): { verdict: "cheaper" | "normal" | "pricier"; display: string } {
  const times = (mine / r.wholesale_per_kg).toFixed(1);
  if (mine <= r.wholesale_per_kg * WHOLESALE_BAND) {
    return { verdict: "cheaper", display: `도매 경매가 수준이에요(도매의 ${times}배)` };
  }
  if (mine > r.retail_per_kg) {
    return { verdict: "pricier", display: `소매가(${won(r.retail_per_kg)}원)보다 비싸요` };
  }
  return { verdict: "normal", display: `도매와 소매 사이예요(도매의 ${times}배, 소매 ${won(r.retail_per_kg)}원보다 싸요)` };
}

// ── v3(R-28) 상자 단위 가격 사다리와 판정 ─────────────────────────────
// 사다리 세 칸(상자 한 개 값): 수원 새벽 경매(중도매인이 사 오는 값) · 서울 가락 상회(도매시장에서 사장님이 사는 값) · 수원 마트·시장(소매)
export type LadderRow = { key: "auction" | "trader" | "retail"; label: string; low: number; high: number; date: string };
export type Ladder = {
  item_name?: string;
  box_label: string;
  box_kg: number;
  rows: LadderRow[]; // 싼 것부터
  change: { date: string; week_pct: number; month_pct: number; year_pct: number } | null;
  source: string;
};

const round100 = (n: number) => Math.round(n / 100) * 100;

export function ladderFor(r: Reference): Ladder | null {
  if (!r.box) return null;
  const kg = r.box.kg;
  const rows: LadderRow[] = [
    { key: "auction", label: "수원 새벽 경매", low: round100(r.auction_low_per_kg * kg), high: round100(r.auction_high_per_kg * kg), date: r.wholesale_date },
  ];
  if (r.trader) {
    // 조사 단위가 다르면 kg로 환산해 맞춘다
    const f = kg / r.trader.box_kg;
    rows.push({ key: "trader", label: `서울 가락 상회`, low: round100(r.trader.low * f), high: round100(r.trader.high * f), date: r.trader.date });
  }
  const retail = [r.traditional_market_per_kg, r.large_retailer_per_kg].filter((v): v is number => v !== null);
  rows.push({ key: "retail", label: "수원 마트·시장", low: round100(Math.min(...retail) * kg), high: round100(Math.max(...retail) * kg), date: r.retail_date });
  return {
    box_label: r.box.label,
    box_kg: kg,
    rows,
    change: r.change,
    source: "한국농수산식품유통공사 경매·중도매인 판매가·소매가(서울 가락은 수원 조사가 없어 대신 씀)",
  };
}

export const CHANGE_FLAT_PCT = 3;

// "작년보다 25% 올랐어요" 같은 짧은 문구. 3% 안의 변화는 빼고, 전년·전월 순으로 최대 2개
export function changeLabels(c: Ladder["change"]): string[] {
  if (!c) return [];
  const out: string[] = [];
  const say = (pct: number, when: string) => {
    if (Math.abs(pct) < CHANGE_FLAT_PCT) return;
    out.push(`${when} ${Math.round(Math.abs(pct))}% ${pct > 0 ? "올랐어요" : "내렸어요"}`);
  };
  say(c.year_pct, "작년보다");
  say(c.month_pct, "한 달 새");
  if (out.length < 2) say(c.week_pct, "지난주보다");
  return out.slice(0, 2);
}

// 사장님 kg당 가격 → 상자 값과 판정(R-28). 상회 값이 없으면 null(기존 R-24 판정을 쓴다)
export function verdictOnLadder(perKg: number, l: Ladder): { verdict: "cheaper" | "normal" | "pricier"; title: string; display: string; box_won: number } | null {
  const trader = l.rows.find((x) => x.key === "trader");
  const retail = l.rows.find((x) => x.key === "retail");
  if (!trader || !retail) return null;
  const box = round100(perKg * l.box_kg);
  if (box < trader.low) return { verdict: "cheaper", title: "아주 잘 사셨어요", display: "도매시장 상회보다도 싸요", box_won: box };
  if (box <= trader.high) return { verdict: "cheaper", title: "잘 사셨어요", display: "도매시장 상회 값과 비슷해요", box_won: box };
  if (box < retail.low) return { verdict: "normal", title: "보통이에요", display: "상회보다 조금 비싸고 마트보다는 싸요", box_won: box };
  return { verdict: "pricier", title: "비싸게 사셨어요", display: "마트·시장 값과 비슷하거나 더 비싸요", box_won: box };
}
