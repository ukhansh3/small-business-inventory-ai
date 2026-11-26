import { recommend, type Recommendation } from "../core/recommend";
import type { PublicStoresFile } from "../core/public-stores";
import type { SearchCondition } from "../core/search-types";
import type { SupplyVendorsFile } from "../core/supply-vendors";
import { seoulNow } from "../core/time";
import type { Dataset } from "../core/types";
import type { PlaceLookup } from "./kakao-local";
import { marketFor, type PriceCheckDeps } from "./price-check";

// AI 도우미 추천(ADR-013 팀 검토안). 검색 조건으로 한 곳을 고른다. 데이터가 없으면 null(기존 결과만 보여 준다)
export type RecommendDeps = PriceCheckDeps & { publicStores?: PublicStoresFile; supplyVendors?: SupplyVendorsFile; lookupPlace?: PlaceLookup };

export async function buildRecommendation(deps: RecommendDeps, data: Dataset, c: SearchCondition, now: Date): Promise<Recommendation | null> {
  const loc = data.locations.find((l) => l.id === c.location_id) ?? data.locations.find((l) => l.is_default);
  const item = data.items.find((i) => i.id === c.item_id);
  if (!loc || !item) return null;
  const market = await marketFor(deps, c.item_id);
  const rec = recommend({
    item_id: c.item_id,
    item_name: item.name,
    qty_kg: c.qty_kg,
    urgency: c.urgency,
    fulfillment: c.fulfillment,
    here: loc,
    now: seoulNow(now),
    stores: deps.publicStores?.stores ?? [],
    supply: deps.supplyVendors?.stores ?? [],
    wholesale: data.vendors.filter((v) => v.kind === "도매시장 중도매인"),
    ladder: market.ladder ?? null,
  });
  return rec ? withContacts(rec, deps.lookupPlace) : null;
}

// 급할 때 고른 동네 가게에는 공공데이터에 전화가 없다. 카카오 로컬로 보는 순간 찾아 붙인다(저장 안 함)
async function withContacts(rec: Recommendation, lookup: PlaceLookup | undefined): Promise<Recommendation> {
  if (!lookup || rec.situation !== "urgent_small") return rec;
  const places = [rec.primary, ...rec.others];
  const found = await Promise.all(places.map((p) => lookup({ name: p.name, lat: p.lat, lng: p.lng })));
  const [primary, ...others] = places.map((p, i) => {
    const c = found[i];
    return c ? { ...p, phone: p.phone ?? c.phone, place_url: c.place_url, contact_source: "카카오맵" } : p;
  });
  return { ...rec, primary: primary!, others };
}
