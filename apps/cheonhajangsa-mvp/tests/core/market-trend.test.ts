import { describe, expect, it } from "vitest";
import { buildMarketPrices, type Getter } from "../../core/market-build";
import { validateMarketHistory, weekStart, weeksFor, type MarketHistoryFile } from "../../core/market-history";
import { referenceFor, trendDisplay, validateMarketPrices, type MarketPricesFile } from "../../core/market-prices";
import history from "../../data/market_history.json";
import { createLivePrices } from "../../server/market-live";
import { marketFor } from "../../server/price-check";
import { baseDataset } from "../fixtures/dataset";

// v3 시세 자동 갱신·추이(R-27). 네트워크 없이 가짜 공공데이터로 확인한다

const ref = (now: number, weekAgo: number | null) => ({
  wholesale_per_kg: now, wholesale_date: "2026-11-25", retail_per_kg: 9000, retail_date: "2026-11-24",
  traditional_market_per_kg: 9000, large_retailer_per_kg: null,
  week_ago_per_kg: weekAgo, week_ago_date: weekAgo === null ? null : "2026-11-18",
  box: null, auction_low_per_kg: now, auction_high_per_kg: now, trader: null, change: null,
});

describe("일주일 전 대비 한 줄", () => {
  it("오르면 올랐어요, 내리면 내렸어요, 3% 안이면 비슷해요", () => {
    expect(trendDisplay(ref(1120, 1000))).toEqual({ change_pct: 12, display: "도매가가 일주일 전(11/18)보다 12% 올랐어요" });
    expect(trendDisplay(ref(900, 1000))?.display).toBe("도매가가 일주일 전(11/18)보다 10% 내렸어요");
    expect(trendDisplay(ref(1020, 1000))?.display).toBe("도매가가 일주일 전(11/18)과 비슷해요");
    expect(trendDisplay(ref(1000, null))).toBeNull();
  });
});

describe("주간 추이", () => {
  const file: MarketHistoryFile = { region: "수원", built_on: "2026-11-25", source: "s", items: [{ item_id: "item_lettuce", weeks: [
    { week_start: "2026-11-09", per_kg: 4500, trades: 10 }, { week_start: "2026-11-16", per_kg: 3538, trades: 10 }, { week_start: "2026-11-23", per_kg: 3500, trades: 5 },
  ] }] };
  it("월요일을 주의 시작으로 본다", () => {
    expect(weekStart("2026-11-25")).toBe("2026-11-23");
    expect(weekStart("2026-11-23")).toBe("2026-11-23");
    expect(weekStart("2026-11-29")).toBe("2026-11-23");
  });
  it("지금 도매가가 이번 주 값을 바꾸거나 새 주로 붙는다", () => {
    expect(weeksFor(file, "item_lettuce", { date: "2026-11-25", per_kg: 3425 }).at(-1)).toEqual({ week_start: "2026-11-23", per_kg: 3425 });
    const next = weeksFor(file, "item_lettuce", { date: "2026-12-01", per_kg: 3000 });
    expect(next.at(-1)).toEqual({ week_start: "2026-11-30", per_kg: 3000 });
    expect(next).toHaveLength(4);
    expect(weeksFor(null, "item_lettuce", null)).toEqual([]);
  });
  it("저장본 형식이 맞다", () => {
    expect(validateMarketHistory(history).ok).toBe(true);
  });
});

// 가짜 공공데이터: 품목·날짜별 kg당 가격들
function fakeGetter(prices: Record<string, number[]>, calls: string[] = []): Getter {
  return async (path, params) => {
    calls.push(path);
    if (path === "periodRetail/price") {
      return { total: 1, items: [{ vrty_cd: "01", grd_nm: "상품", exmn_dd_cnvs_prc: "9800", exmn_ymd: "20261124", mrkt_nm: "지동" }, { vrty_cd: "00", grd_nm: "상품", exmn_dd_cnvs_prc: "2300", exmn_ymd: "20261124", mrkt_nm: "지동" }] };
    }
    const key = `${params["cond[gds_mclsf_nm::EQ]"]}|${params["cond[trd_clcln_ymd::EQ]"]}`;
    const xs = prices[key] ?? [];
    return { total: xs.length, items: xs.map((p) => ({ unit_nm: "kg", unit_qty: "4", scsbd_prc: String(p * 4) })) };
  };
}

describe("시세 받아오기", () => {
  it("최근 거래일 도매가, 그 일주일 전 도매가, 소매가를 묶는다", async () => {
    const get = fakeGetter({
      "상추|2026-11-24": [3000, 3400, 3500], // 25일은 휴장 → 24일
      "상추|2026-11-17": [3600, 3700, 3800],
    });
    const file = await buildMarketPrices(get, "2026-11-25");
    expect(validateMarketPrices(file).ok).toBe(true);
    const lettuce = file.items.find((i) => i.item_id === "item_lettuce")!;
    expect(lettuce.wholesale).toEqual({ date: "2026-11-24", per_kg: 3400, trades: 3, low_per_kg: 3400, high_per_kg: 3500 });
    expect(lettuce.wholesale_week_ago).toEqual({ date: "2026-11-17", per_kg: 3700, trades: 3 });
    expect(lettuce.retail?.traditional_market_per_kg).toBe(9800);
    expect(file.items.find((i) => i.item_id === "item_onion")!.wholesale).toBeNull(); // 거래 없음
  });
});

describe("서버 시세 자동 갱신", () => {
  const bundled: MarketPricesFile = {
    region: "수원", built_on: "2026-11-25", sources: { wholesale: "w", retail: "r" },
    items: [
      { item_id: "item_lettuce", wholesale: { date: "2026-11-20", per_kg: 3000, trades: 5 }, retail: { date: "2026-11-20", traditional_market_per_kg: 9000, large_retailer_per_kg: null } },
      { item_id: "item_onion", wholesale: { date: "2026-11-20", per_kg: 1000, trades: 5 }, retail: null },
    ],
  };
  const live = { "상추|2026-11-25": [3400, 3400, 3400], "상추|2026-11-18": [3000, 3000, 3000] };

  it("키가 없으면 저장본을 그대로 쓰고 공공데이터를 부르지 않는다", async () => {
    const prices = createLivePrices({ bundled, key: null });
    expect(await prices()).toBe(bundled);
  });

  it("새로 받은 값을 쓰고, 비어 있는 품목은 이전 값을 유지한다", async () => {
    const t = new Date("2026-11-25T03:00:00Z");
    const prices = createLivePrices({ bundled, key: "k", get: fakeGetter(live), now: () => t });
    const file = await prices();
    expect(referenceFor(file, "item_lettuce")?.wholesale_per_kg).toBe(3400);
    expect(referenceFor(file, "item_lettuce")?.week_ago_per_kg).toBe(3000);
    expect(file.items.find((i) => i.item_id === "item_onion")!.wholesale?.per_kg).toBe(1000);
  });

  it("3시간 안에는 다시 받지 않는다", async () => {
    let t = new Date("2026-11-25T03:00:00Z");
    const calls: string[] = [];
    const prices = createLivePrices({ bundled, key: "k", get: fakeGetter(live, calls), now: () => t });
    await prices();
    const n = calls.length;
    t = new Date(t.getTime() + 2 * 3600_000);
    await prices();
    expect(calls.length).toBe(n);
    t = new Date(t.getTime() + 2 * 3600_000);
    await prices();
    expect(calls.length).toBeGreaterThan(n);
  });

  it("실패하거나 너무 느리면 저장본을 쓰고 10분 동안은 다시 시도하지 않는다", async () => {
    let t = new Date("2026-11-25T03:00:00Z");
    let calls = 0;
    const slow: Getter = () => { calls++; return new Promise(() => {}); };
    const prices = createLivePrices({ bundled, key: "k", get: slow, now: () => t, timeoutMs: 30 });
    expect(await prices()).toBe(bundled);
    const n = calls;
    t = new Date(t.getTime() + 5 * 60_000);
    expect(await prices()).toBe(bundled);
    expect(calls).toBe(n);
  });

  it("시세 카드에 추이 한 줄과 주간 막대가 붙는다", async () => {
    const t = new Date("2026-11-25T03:00:00Z");
    const loadPrices = createLivePrices({ bundled, key: "k", get: fakeGetter(live), now: () => t });
    const m = await marketFor({ data: baseDataset([], []), loadPrices, history: history as MarketHistoryFile }, "item_lettuce");
    expect(m.trend).toBe("도매가가 일주일 전(11/18)보다 13% 올랐어요");
    expect(m.weeks?.at(-1)).toEqual({ week_start: "2026-11-23", per_kg: 3400 });
  });
});
