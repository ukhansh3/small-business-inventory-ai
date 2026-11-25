import type { MarketPricesFile } from "./market-prices";

// 수원 시세 받아오기(저장본 스크립트와 서버 실시간 갱신이 같이 쓴다).
// 공공데이터포털 한국농수산식품유통공사(B552845) API. 하루·품목을 같이 걸러야 빠르다(약 0.3초).
// 날짜 범위 조회는 7~8초가 걸려 쓰지 않는다.

export type Row = Record<string, string | null | undefined>;
// path: "katRealTime2/trades2" 등, params: cond[...] 포함 검색 조건. 키·returnType은 호출하는 쪽이 붙인다
export type Getter = (path: string, params: Record<string, string>) => Promise<{ total: number; items: Row[] }>;

export const MARKET_CODE = "310101"; // 수원 농수산물도매시장
export const RETAIL_SGG = "3111"; // 수원
export const WHOLESALE_LOOKBACK_DAYS = 10; // 휴장일이 이어져도 가장 최근 거래일을 찾는다
export const MIN_TRADES = 3;

// 앱 품목 → 경매 중분류명, 소매 품목·품종 코드
export const MARKET_ITEMS: { item_id: string; auction: string; retail: { item: string; vrty: string } }[] = [
  { item_id: "item_lettuce", auction: "상추", retail: { item: "214", vrty: "01" } },
  { item_id: "item_onion", auction: "양파", retail: { item: "245", vrty: "00" } },
  { item_id: "item_green_onion", auction: "대파", retail: { item: "246", vrty: "00" } },
  { item_id: "item_potato", auction: "감자", retail: { item: "152", vrty: "01" } },
];

export const SOURCES = {
  wholesale: "한국농수산식품유통공사 전국 공영도매시장 실시간 경매정보(수원 농수산물도매시장), kg당 낙찰가 중앙값",
  retail: "한국농수산식품유통공사 기간별 소매가격 정보(수원 지동시장·대형유통 1곳), 상품 등급 kg 환산가",
};

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2);
}

export function addDays(iso: string, d: number): string {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + d);
  return t.toISOString().slice(0, 10);
}

export function seoulToday(now: Date): string {
  return new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

// 하루 한 품목의 kg당 낙찰가들
export async function auctionPerKg(get: Getter, day: string, name: string): Promise<number[]> {
  const out: number[] = [];
  let seen = 0;
  for (let page = 1; ; page++) {
    const { total, items } = await get("katRealTime2/trades2", {
      pageNo: String(page), numOfRows: "1000",
      "cond[whsl_mrkt_cd::EQ]": MARKET_CODE, "cond[trd_clcln_ymd::EQ]": day, "cond[gds_mclsf_nm::EQ]": name,
    });
    seen += items.length;
    for (const r of items) {
      if (r.unit_nm !== "kg") continue;
      const qty = Number(r.unit_qty), price = Number(r.scsbd_prc);
      if (qty > 0 && price > 0) out.push(price / qty);
    }
    if (seen >= total || items.length === 0) return out;
  }
}

// from부터 거꾸로 lookback일 안에서 거래가 MIN_TRADES건 이상인 가장 최근 날
export async function wholesaleNear(get: Getter, from: string, name: string, lookback: number): Promise<{ date: string; per_kg: number; trades: number } | null> {
  for (let i = 0; i <= lookback; i++) {
    const day = addDays(from, -i);
    const perKg = await auctionPerKg(get, day, name);
    if (perKg.length >= MIN_TRADES) return { date: day, per_kg: median(perKg), trades: perKg.length };
  }
  return null;
}

export async function retailLatest(get: Getter, base: string, item: { item: string; vrty: string }): Promise<MarketPricesFile["items"][number]["retail"]> {
  const { items } = await get("periodRetail/price", {
    pageNo: "1", numOfRows: "1000",
    "cond[exmn_ymd::GTE]": addDays(base, -WHOLESALE_LOOKBACK_DAYS).replaceAll("-", ""), "cond[exmn_ymd::LTE]": base.replaceAll("-", ""),
    "cond[sgg_cd::EQ]": RETAIL_SGG, "cond[item_cd::EQ]": item.item,
  });
  const good = items.filter((r) => r.vrty_cd === item.vrty && r.grd_nm === "상품" && Number(r.exmn_dd_cnvs_prc) > 0);
  const lastDay = good.map((r) => r.exmn_ymd!).sort().at(-1) ?? null;
  if (!lastDay) return null;
  const pick = (jidong: boolean) => {
    const r = good.find((x) => x.exmn_ymd === lastDay && (x.mrkt_nm === "지동") === jidong);
    return r ? Math.round(Number(r.exmn_dd_cnvs_prc)) : null;
  };
  return { date: `${lastDay.slice(0, 4)}-${lastDay.slice(4, 6)}-${lastDay.slice(6)}`, traditional_market_per_kg: pick(true), large_retailer_per_kg: pick(false) };
}

// 품목마다 도매(최근 거래일)·일주일 전 도매·소매를 받아 저장본 모양으로 묶는다
export async function buildMarketPrices(get: Getter, base: string): Promise<MarketPricesFile> {
  const items = await Promise.all(MARKET_ITEMS.map(async (it) => {
    const [wholesale, retail] = await Promise.all([wholesaleNear(get, base, it.auction, WHOLESALE_LOOKBACK_DAYS), retailLatest(get, base, it.retail)]);
    // 일주일 전: 최근 거래일 7일 전부터 거꾸로 3일 안
    const weekAgo = wholesale ? await wholesaleNear(get, addDays(wholesale.date, -7), it.auction, 3) : null;
    return { item_id: it.item_id, wholesale, wholesale_week_ago: weekAgo, retail };
  }));
  return { region: "수원", built_on: base, sources: SOURCES, items };
}

// data.go.kr 호출기. 키는 URL에만 넣고 어디에도 출력하지 않는다
export function dataGoKrGetter(key: string, opts: { timeoutMs: number; retries: number; fetchImpl?: typeof fetch }): Getter {
  const f = opts.fetchImpl ?? fetch;
  return async (path, params) => {
    const q = new URLSearchParams({ serviceKey: key, returnType: "json", ...params });
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await f(`https://apis.data.go.kr/B552845/${path}?${q}`, { signal: AbortSignal.timeout(opts.timeoutMs) });
        if (!res.ok) throw new Error(`공공데이터 응답 ${res.status}`);
        const body = (await res.json()).response.body;
        const raw = body.items?.item ?? body.items ?? [];
        return { total: Number(body.totalCount ?? 0), items: Array.isArray(raw) ? raw : [raw] };
      } catch (e) {
        if (attempt >= opts.retries) throw e;
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
      }
    }
  };
}
