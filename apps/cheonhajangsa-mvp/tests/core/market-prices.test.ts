import { describe, expect, it } from "vitest";
import { loadMarketPrices } from "../../core/data";
import {
  referenceDisplay,
  referenceFor,
  validateMarketPrices,
  verdictAgainstReference,
  type MarketPricesFile,
} from "../../core/market-prices";
import { diagnoseLine } from "../../core/price";
import { marketFor } from "../../server/price-check";
import { baseDataset } from "../fixtures/dataset";

// v3: 수원 실제 시세(도매 경매가·소매가) 저장본과 판정(R-23·R-24)

const FILE: MarketPricesFile = {
  region: "수원",
  built_on: "2026-11-25",
  sources: { wholesale: "경매", retail: "소매" },
  items: [
    { item_id: "item_lettuce", wholesale: { date: "2026-11-25", per_kg: 3000, trades: 30 }, retail: { date: "2026-11-24", traditional_market_per_kg: 9800, large_retailer_per_kg: 12600 } },
    { item_id: "item_onion", wholesale: null, retail: { date: "2026-11-24", traditional_market_per_kg: 2300, large_retailer_per_kg: null } },
  ],
};

describe("시세 저장본", () => {
  it("실제 저장본(data/market_prices.json)은 형식 검사를 통과한다", () => {
    expect(() => loadMarketPrices()).not.toThrow();
    expect(loadMarketPrices().items.map((i) => i.item_id)).toEqual(["item_lettuce", "item_onion", "item_green_onion", "item_potato"]);
  });

  it("가격이 0이거나 날짜 형식이 틀리면 실패한다", () => {
    const bad = structuredClone(FILE) as unknown as { items: { wholesale: { per_kg: number; date: string } }[] };
    bad.items[0]!.wholesale.per_kg = 0;
    expect(validateMarketPrices(bad).ok).toBe(false);
    const bad2 = structuredClone(FILE) as unknown as { items: { wholesale: { per_kg: number; date: string } }[] };
    bad2.items[0]!.wholesale.date = "11/25";
    expect(validateMarketPrices(bad2).ok).toBe(false);
  });

  it("도매·소매가 둘 다 있어야 기준선을 만든다. 소매는 두 곳 중 낮은 값", () => {
    const r = referenceFor(FILE, "item_lettuce")!;
    expect(r).toMatchObject({ wholesale_per_kg: 3000, retail_per_kg: 9800 });
    expect(referenceFor(FILE, "item_onion")).toBeNull(); // 도매 없음
    expect(referenceFor(FILE, "item_potato")).toBeNull(); // 품목 없음
    expect(referenceFor(null, "item_lettuce")).toBeNull();
  });

  it("화면 한 줄에 출처 날짜와 소매 범위를 보여 준다", () => {
    expect(referenceDisplay(referenceFor(FILE, "item_lettuce")!)).toBe("수원 시세(kg당) 도매 3,000원(11/25 경매) · 소매 9,800~12,600원(11/24)");
  });
});

describe("R-24 시세 기준 판정", () => {
  const r = referenceFor(FILE, "item_lettuce")!;
  it("도매가의 1.2배까지는 도매 수준(싼 편)", () => {
    expect(verdictAgainstReference(3600, r).verdict).toBe("cheaper");
    expect(verdictAgainstReference(3601, r).verdict).toBe("normal");
  });
  it("소매가(낮은 쪽)보다 비싸면 비싼 편, 같으면 사이", () => {
    expect(verdictAgainstReference(9800, r).verdict).toBe("normal");
    expect(verdictAgainstReference(9801, r).verdict).toBe("pricier");
  });
  it("문구에 도매 대비 배수를 적는다", () => {
    expect(verdictAgainstReference(5000, r).display).toBe("도매와 소매 사이예요(도매의 1.7배, 소매 9,800원보다 싸요)");
  });
});

describe("실제 시세로 진단", () => {
  const NOW = new Date("2026-11-25T01:00:00Z");
  it("기준선이 있으면 marketFor가 그것을 돌려주고 진단에 쓴다", async () => {
    const data = baseDataset([], []);
    const market = await marketFor({ data, prices: FILE }, "item_lettuce");
    expect(market.reference?.wholesale_per_kg).toBe(3000);
    expect(market.display).toContain("수원 시세");
    const line = diagnoseLine(data, { raw_name: "적상추 2kg", item_id: "item_lettuce", qty_kg: 2, amount_won: 10000 }, 1, market, "loc_test", NOW);
    expect(line).toMatchObject({ price_per_kg: 5000, comparable: true, verdict: "normal" });
  });
  it("기준선이 없으면 v2 방식(판매처 가격·구매 기록)으로 돌아간다", async () => {
    const market = await marketFor({ data: baseDataset([], []), prices: null }, "item_lettuce");
    expect(market.reference).toBeUndefined();
    expect(market.per_kg).toBeNull();
  });
});
