import { recommend, type Recommendation } from "../core/recommend";
import type { PublicStoresFile } from "../core/public-stores";
import type { SearchCondition } from "../core/search-types";
import type { SupplyVendorsFile } from "../core/supply-vendors";
import { seoulNow } from "../core/time";
import type { Dataset } from "../core/types";
import { marketFor, type PriceCheckDeps } from "./price-check";

// AI 도우미 추천(ADR-013 팀 검토안). 검색 조건으로 한 곳을 고른다. 데이터가 없으면 null(기존 결과만 보여 준다)
export type RecommendDeps = PriceCheckDeps & { publicStores?: PublicStoresFile; supplyVendors?: SupplyVendorsFile };

export async function buildRecommendation(deps: RecommendDeps, data: Dataset, c: SearchCondition, now: Date): Promise<Recommendation | null> {
  const loc = data.locations.find((l) => l.id === c.location_id) ?? data.locations.find((l) => l.is_default);
  const item = data.items.find((i) => i.id === c.item_id);
  if (!loc || !item) return null;
  const market = await marketFor(deps, c.item_id);
  return recommend({
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
}
