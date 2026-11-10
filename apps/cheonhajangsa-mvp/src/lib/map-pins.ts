import type { PriceCheck, Store } from "./api-types";
import type { SearchResult } from "../../core/search-types";
import type { Pin } from "../components/map-types";

// 지도 핀과 강조(v2 4절). 화면 상태에서 계산하는 순수 함수(테스트 대상)

export function pinsFor(stores: Store[], me: { lat: number; lng: number; name: string } | null): Pin[] {
  const pins: Pin[] = stores.map((s) => ({
    id: s.store_id,
    lat: s.lat,
    lng: s.lng,
    name: s.name,
    kind: s.demo_service ? "example" : s.kind === "public" ? "public" : s.vendor_card?.is_example ? "example" : "vendor",
  }));
  if (me) pins.push({ id: "__me", lat: me.lat, lng: me.lng, name: `내 위치: ${me.name}`, kind: "me" });
  return pins;
}

// 고른 가게 > 찾기 결과 > 진단의 더 싼 곳 순으로 강조한다(AC-30)
export function focusFor(selected: string | null, results: SearchResult | null, priceCheck: PriceCheck | null): string[] {
  if (selected) return [selected];
  if (results) return results.groups.flatMap((g) => g.items.map((c) => c.vendor_id));
  if (priceCheck) return priceCheck.lines.flatMap((l) => l.cheaper.map((c) => c.vendor_id));
  return [];
}
