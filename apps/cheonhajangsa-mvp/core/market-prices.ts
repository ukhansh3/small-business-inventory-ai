import { z } from "zod";
import { won } from "./format";

// 실제 시세 저장본(data/market_prices.json). scripts/build-market-prices.ts가 하루 한 번 만든다.
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
      wholesale: z.strictObject({ date: isoDate, per_kg: won0, trades: z.number().int().positive() }).nullable(),
      retail: z
        .strictObject({ date: isoDate, traditional_market_per_kg: won0.nullable(), large_retailer_per_kg: won0.nullable() })
        .nullable(),
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

// 판정에 쓰는 기준선. 도매가와 소매가(둘 중 낮은 값) 둘 다 있어야 판정한다.
export type Reference = {
  wholesale_per_kg: number;
  wholesale_date: string;
  retail_per_kg: number; // 지동시장·대형유통 중 낮은 값
  retail_date: string;
  traditional_market_per_kg: number | null;
  large_retailer_per_kg: number | null;
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
  };
}

const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

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
