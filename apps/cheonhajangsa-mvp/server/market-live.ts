import { buildMarketPrices, dataGoKrGetter, type Getter, seoulToday } from "../core/market-build";
import { type MarketPricesFile, validateMarketPrices } from "../core/market-prices";

// 시세 실시간 갱신(v3, R-27). 저장본(data/market_prices.json)은 대비용이고,
// DATA_GO_KR_KEY가 있으면 FRESH_MS마다 공공데이터에서 새로 받아 이 서버 메모리에 둔다.
// 받는 데 TIMEOUT_MS를 넘기거나 실패하면 가지고 있던 값(없으면 저장본)을 그대로 쓰고, RETRY_MS 동안은 다시 시도하지 않는다.
// 품목별로 새 값이 비면 이전 값을 유지한다.

export const FRESH_MS = 3 * 3600_000;
export const RETRY_MS = 10 * 60_000;
export const TIMEOUT_MS = 4000;

type State = { file: MarketPricesFile | null; fetchedAt: number; failedAt: number; inflight: Promise<MarketPricesFile | null> | null };

export function createLivePrices(opts: { bundled: MarketPricesFile; key: string | null; get?: Getter; now?: () => Date; timeoutMs?: number }) {
  const now = opts.now ?? (() => new Date());
  const get = opts.get ?? (opts.key ? dataGoKrGetter(opts.key, { timeoutMs: opts.timeoutMs ?? TIMEOUT_MS, retries: 0 }) : null);
  const st: State = { file: null, fetchedAt: 0, failedAt: 0, inflight: null };

  function merge(fresh: MarketPricesFile, prev: MarketPricesFile): MarketPricesFile {
    return {
      ...fresh,
      items: fresh.items.map((it) => {
        const old = prev.items.find((p) => p.item_id === it.item_id);
        return {
          ...it,
          wholesale: it.wholesale ?? old?.wholesale ?? null,
          wholesale_week_ago: it.wholesale ? it.wholesale_week_ago ?? null : old?.wholesale_week_ago ?? null,
          retail: it.retail ?? old?.retail ?? null,
        };
      }),
    };
  }

  async function refresh(): Promise<MarketPricesFile | null> {
    if (!get) return null;
    const t = now().getTime();
    try {
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("시세 갱신 시간 초과")), opts.timeoutMs ?? TIMEOUT_MS));
      const fresh = await Promise.race([buildMarketPrices(get, seoulToday(now())), timeout]);
      const checked = validateMarketPrices(merge(fresh, st.file ?? opts.bundled));
      if (!checked.ok) throw new Error("시세 형식 오류");
      st.file = checked.data;
      st.fetchedAt = t;
      return st.file;
    } catch (e) {
      st.failedAt = t;
      console.warn(`시세 갱신 실패, 저장된 값을 씁니다: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
      return null;
    }
  }

  // 지금 쓸 시세. 오래됐으면 새로 받아 보고(동시에 여러 번 받지 않음), 안 되면 가진 값
  return async function prices(): Promise<MarketPricesFile> {
    const t = now().getTime();
    const stale = t - st.fetchedAt >= FRESH_MS;
    const mayRetry = t - st.failedAt >= RETRY_MS;
    if (get && stale && mayRetry) {
      st.inflight ??= refresh().finally(() => { st.inflight = null; });
      await st.inflight;
    }
    return st.file ?? opts.bundled;
  };
}
