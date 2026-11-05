import { distanceMeters } from "../../core/distance";
import type { PublicStoresFile } from "../../core/public-stores";
import { buildCard } from "../../core/search";
import type { VendorCard } from "../../core/search-types";
import { seoulNow } from "../../core/time";
import type { Dataset } from "../../core/types";
import type { ServerEnv } from "../env";
import { handle, HttpError, json, requestNow, requireDevice } from "../http";

// API-18 지도용 가게: GET /api/v1/stores?location_id=&item_id=&bbox=minLng,minLat,maxLng,maxLat (v2 4절)
// 판매처(예시·확인)는 결과 카드와 같은 카드를 붙이고, 공공데이터 가게는 공개 정보만(R-22). 거리순.

export const PUBLIC_SOURCE = "소상공인시장진흥공단 상가(상권)정보";

export type Store = {
  store_id: string;
  kind: "vendor" | "public";
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  distance_m: number;
  vendor_card?: VendorCard;
  source?: string;
  source_date?: string;
};

export type StoresDeps = { data: Dataset; publicStores: PublicStoresFile; env: ServerEnv; clock?: () => Date };

function parseBbox(v: string | null): [number, number, number, number] | null {
  if (!v) return null;
  const n = v.split(",").map(Number);
  if (n.length !== 4 || n.some((x) => !Number.isFinite(x)) || n[0]! >= n[2]! || n[1]! >= n[3]!) throw new HttpError("INVALID_INPUT", "지도 범위가 올바르지 않아요.");
  return n as [number, number, number, number];
}

export function handleStores(req: Request, deps: StoresDeps): Promise<Response> {
  return handle(async () => {
    requireDevice(req);
    const q = new URL(req.url).searchParams;
    const loc = deps.data.locations.find((l) => l.id === q.get("location_id")) ?? deps.data.locations.find((l) => l.is_default)!;
    const itemId = q.get("item_id") ?? deps.data.items.find((i) => i.active)!.id;
    const bbox = parseBbox(q.get("bbox"));
    const inBox = (lat: number, lng: number) => !bbox || (lng >= bbox[0] && lat >= bbox[1] && lng <= bbox[2] && lat <= bbox[3]);
    const sn = seoulNow(requestNow(req, deps.env, deps.clock));

    const stores: Store[] = [];
    for (const o of deps.data.offers) {
      if (o.item_id !== itemId || !o.available) continue;
      const v = deps.data.vendors.find((x) => x.id === o.vendor_id);
      if (!v || !inBox(v.lat, v.lng)) continue;
      const card = buildCard(v, o, { item_id: itemId, qty_kg: null, urgency: "now", fulfillment: "pickup", location_id: loc.id }, loc, sn);
      stores.push({ store_id: v.id, kind: "vendor", name: v.name, category: v.kind, address: v.address, lat: v.lat, lng: v.lng, distance_m: card.distance.meters, vendor_card: { ...card, rank: 0 } });
    }
    for (const p of deps.publicStores.stores) {
      if (!inBox(p.lat, p.lng)) continue;
      stores.push({
        store_id: p.store_id,
        kind: "public",
        name: p.name,
        category: p.category,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        distance_m: Math.round(distanceMeters(loc, p)),
        source: PUBLIC_SOURCE,
        source_date: deps.publicStores.source_date,
      });
    }
    stores.sort((a, b) => a.distance_m - b.distance_m || a.name.localeCompare(b.name, "ko"));
    return json(200, { location_id: loc.id, stores });
  });
}
