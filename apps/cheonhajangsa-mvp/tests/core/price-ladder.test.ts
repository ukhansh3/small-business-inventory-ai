import { describe, expect, it } from "vitest";
import { changeLabels, ladderFor, referenceFor, verdictOnLadder, type MarketPricesFile } from "../../core/market-prices";
import { diagnoseLine, type Market } from "../../core/price";
import { wonRange } from "../../src/lib/won-range";
import { baseDataset } from "../fixtures/dataset";

// v3 시세 카드(R-28): 상자 단위 사다리(수원 경매 · 서울 가락 상회 · 수원 소매)와 판정

const file: MarketPricesFile = {
  region: "수원", built_on: "2026-11-25", sources: { wholesale: "w", retail: "r" },
  items: [{
    item_id: "item_lettuce",
    wholesale: { date: "2026-11-25", per_kg: 3425, trades: 38, low_per_kg: 2500, high_per_kg: 4150 },
    retail: { date: "2026-11-24", traditional_market_per_kg: 9800, large_retailer_per_kg: 12600 },
    trader: { date: "2026-11-24", market: "서울 가락", box_kg: 4, low: 14300, high: 25000 },
    change: { date: "2026-11-24", week_pct: 24.4, month_pct: 63.3, year_pct: 26.9 },
  }],
};
const ladder = ladderFor(referenceFor(file, "item_lettuce")!)!;

describe("가격 사다리", () => {
  it("상추 4kg 한 상자로 세 칸을 만든다(100원 단위)", () => {
    expect(ladder.box_label).toBe("4kg 한 상자");
    expect(ladder.rows.map((r) => [r.key, r.low, r.high])).toEqual([
      ["auction", 10000, 16600],
      ["trader", 14300, 25000],
      ["retail", 39200, 50400],
    ]);
  });
  it("상회 값이 없으면 경매·소매 두 칸만", () => {
    const noTrader = { ...file, items: [{ ...file.items[0]!, trader: null }] };
    expect(ladderFor(referenceFor(noTrader, "item_lettuce")!)!.rows.map((r) => r.key)).toEqual(["auction", "retail"]);
  });
});

describe("상자 단위 판정", () => {
  const at = (boxWon: number) => verdictOnLadder(boxWon / 4, ladder)!;
  it("상회보다 싸면 아주 잘, 상회 안이면 잘, 그 위 마트 아래면 보통, 마트 이상이면 비쌈", () => {
    expect(at(12000)).toMatchObject({ verdict: "cheaper", title: "아주 잘 사셨어요", box_won: 12000 });
    expect(at(22000)).toMatchObject({ verdict: "cheaper", title: "잘 사셨어요", display: "도매시장 상회 값과 비슷해요" });
    expect(at(30000)).toMatchObject({ verdict: "normal", title: "보통이에요" });
    expect(at(39200)).toMatchObject({ verdict: "pricier", title: "비싸게 사셨어요" });
  });
  it("가격 진단 줄에 판정 제목과 상자 값이 붙는다", () => {
    const market: Market = { item_id: "item_lettuce", per_kg: null, samples: 0, includes_example: false, display: "", ladder };
    const line = diagnoseLine(baseDataset([], []), { raw_name: "상추", item_id: "item_lettuce", qty_kg: 2, amount_won: 11000 }, 1, market, "loc_test", new Date("2026-11-25T01:00:00Z"));
    expect(line).toMatchObject({ verdict: "cheaper", verdict_title: "잘 사셨어요", box_won: 22000 });
  });
});

describe("등락·금액 표시", () => {
  it("전년·전월 순으로 두 개, 3% 안은 뺀다", () => {
    expect(changeLabels(ladder.change)).toEqual(["작년보다 27% 올랐어요", "한 달 새 63% 올랐어요"]);
    expect(changeLabels({ date: "2026-11-24", week_pct: -5, month_pct: 1, year_pct: 2 })).toEqual(["지난주보다 5% 내렸어요"]);
    expect(changeLabels(null)).toEqual([]);
  });
  it("만 원 단위로 줄여 쓴다", () => {
    expect(wonRange(14300, 25000)).toBe("1.4만~2.5만원");
    expect(wonRange(39200, 50400)).toBe("3.9만~5만원");
    expect(wonRange(1860, 2160)).toBe("1,860~2,160원");
  });
});
