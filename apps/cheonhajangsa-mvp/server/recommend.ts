import { distanceMeters } from "../core/distance";
import { CONFIRMED_DETOUR_M, recommend, situationOf, type Recommendation } from "../core/recommend";
import type { PublicStoresFile } from "../core/public-stores";
import type { SearchCondition } from "../core/search-types";
import type { SupplyVendorsFile } from "../core/supply-vendors";
import { seoulNow } from "../core/time";
import type { Dataset } from "../core/types";
import type { PlaceContact, PlaceLookup } from "./kakao-local";
import { marketFor, type PriceCheckDeps } from "./price-check";

// AI 도우미 추천(ADR-013 팀 검토안). 검색 조건으로 한 곳을 고른다. 데이터가 없으면 null(기존 결과만 보여 준다)
export type RecommendDeps = PriceCheckDeps & { publicStores?: PublicStoresFile; supplyVendors?: SupplyVendorsFile; lookupPlace?: PlaceLookup };

export async function buildRecommendation(deps: RecommendDeps, data: Dataset, c: SearchCondition, now: Date): Promise<Recommendation | null> {
  const loc = data.locations.find((l) => l.id === c.location_id) ?? data.locations.find((l) => l.is_default);
  const item = data.items.find((i) => i.id === c.item_id);
  if (!loc || !item) return null;
  const market = await marketFor(deps, c.item_id);
  // 급한 소량이면 가까운 동네 가게 후보를 카카오맵에서 먼저 확인한다(보는 순간 조회, 저장 안 함)
  const stores = deps.publicStores?.stores ?? [];
  const contacts = new Map<string, PlaceContact>();
  if (deps.lookupPlace && situationOf(c.item_id, c.qty_kg, c.urgency, c.fulfillment) === "urgent_small") {
    const sorted = [...stores].sort((a, b) => distanceMeters(loc, a) - distanceMeters(loc, b));
    const limit = sorted[0] ? distanceMeters(loc, sorted[0]) + CONFIRMED_DETOUR_M : 0;
    const candidates = sorted.filter((s) => distanceMeters(loc, s) <= limit).slice(0, 8);
    await lookupAll(deps.lookupPlace, candidates.map((s) => ({ id: s.store_id, name: s.name, lat: s.lat, lng: s.lng })), contacts);
  }
  const confirmed = new Set([...contacts].filter(([, v]) => v.phone).map(([k]) => k));
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
    confirmed,
  });
  return rec ? withContacts(rec, deps.lookupPlace, contacts) : null;
}

async function lookupAll(lookup: PlaceLookup, places: { id: string; name: string; lat: number; lng: number }[], into: Map<string, PlaceContact>) {
  const found = await Promise.all(places.map((p) => lookup({ name: p.name, lat: p.lat, lng: p.lng })));
  places.forEach((p, i) => { if (found[i]) into.set(p.id, found[i]!); });
}

// 급할 때 고른 동네 가게에는 공공데이터에 전화가 없다. 카카오맵에서 찾은 전화·장소 링크를 붙인다(저장 안 함)
async function withContacts(rec: Recommendation, lookup: PlaceLookup | undefined, contacts: Map<string, PlaceContact>): Promise<Recommendation> {
  if (!lookup || rec.situation !== "urgent_small") return rec;
  const places = [rec.primary, ...rec.others];
  await lookupAll(lookup, places.filter((p) => !contacts.has(p.id)), contacts); // 후보 밖으로 밀린 '다른 곳'
  const [primary, ...others] = places.map((p) => {
    const c = contacts.get(p.id);
    return c ? { ...p, phone: p.phone ?? c.phone, place_url: c.place_url, contact_source: "카카오맵" } : p;
  });
  return { ...rec, primary: primary!, others };
}
