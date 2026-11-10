import { useCallback, useEffect, useState } from "react";
import { getStores } from "../lib/api";
import type { Store } from "../lib/api-types";

// 지도 홈 가게 목록(API-18). 내 위치가 바뀌면 다시 받는다
export function useStores(locationId: string | null) {
  const [stores, setStores] = useState<Store[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getStores(locationId)
      .then((r) => {
        if (!cancelled) {
          setStores(r.stores);
          setError(null);
        }
      })
      .catch(() => !cancelled && setError("가게 목록을 불러오지 못했어요."));
    return () => {
      cancelled = true;
    };
  }, [locationId, reload]);
  const retry = useCallback(() => setReload((n) => n + 1), []);
  return { stores, error, retry };
}
