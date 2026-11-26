import { withHere } from "../here";
import { distanceMeters } from "../../core/distance";
import type { PublicStoresFile } from "../../core/public-stores";
import { SUPPLY_CATEGORY, type SupplyVendorsFile } from "../../core/supply-vendors";
import { buildCard } from "../../core/search";
import type { VendorCard } from "../../core/search-types";
import { hoursSummary, seoulNow } from "../../core/time";
import type { Dataset } from "../../core/types";
import type { ServerEnv } from "../env";
import { handle, HttpError, json, requestNow, requireDevice } from "../http";
import type { PlaceLookup } from "../kakao-local";

// API-18 지도용 가게: GET /api/v1/stores?location_id=&item_id=&bbox=minLng,minLat,maxLng,maxLat (v2 4절)
// 판매처(예시·확인)는 결과 카드와 같은 카드를 붙이고, 공공데이터 가게는 공개 정보만(R-22). 거리순.

export const PUBLIC_SOURCE = "소상공인시장진흥공단 상가(상권)정보";
const VENDOR_SOURCES: Record<string, string> = { 공공명단: "수원시 농수산물도매시장 중도매인 명단" };

export type Store = {
  store_id: string;
  kind: "vendor" | "public";
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  distance_m: number;
  used_count?: number;
  saved_count?: number;
  vendor_card?: VendorCard;
  source?: string;
  source_date?: string;
  phone?: string | null;
  hours?: string; // v3: 주간 영업시간 한 줄(판매처만)
};

// 중간 시연용 가상 업체(Supabase chj_demo_stores)는 앱에서 뺐다(2026-11-25 사용자 결정). 표는 팀 확인 전까지 그대로 둔다.
export type StoresDeps = { lookupPlace?: PlaceLookup; data: Dataset; publicStores: PublicStoresFile; supplyVendors?: SupplyVendorsFile; env: ServerEnv; clock?: () => Date; loadActivity?: (locationId: string) => Promise<{ vendor_id: string; used_count: number; saved_count: number }[] | null> };

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
    // 업체 상세의 연락처: GET /api/v1/stores?store_id= → 카카오 로컬로 전화·장소 링크를 보는 순간 조회(저장 안 함).
    // Vercel 함수 수 제한(12개) 때문에 새 함수를 만들지 않고 이 함수에 붙였다
    const contactId = q.get("store_id");
    if (contactId) {
      const place = deps.publicStores.stores.find((s) => s.store_id === contactId) ?? deps.supplyVendors?.stores.find((s) => s.store_id === contactId);
      if (!place) throw new HttpError("NOT_FOUND", "업체를 찾지 못했어요.");
      const found = deps.lookupPlace ? await deps.lookupPlace({ name: place.name, lat: place.lat, lng: place.lng }) : null;
      return json(200, { store_id: contactId, phone: found?.phone ?? null, place_url: found?.place_url ?? null, source: found ? "카카오맵" : null });
    }
    const here = withHere(deps.data, req); // 실시간 위치가 있으면 거리 기준을 바꾼다(R-25)
    const loc = here.locations.find((l) => l.id === q.get("location_id")) ?? here.locations.find((l) => l.is_default)!;
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
      stores.push({
        store_id: v.id, kind: "vendor", name: v.name, category: v.kind, address: v.address, lat: v.lat, lng: v.lng,
        distance_m: card.distance.meters, vendor_card: { ...card, rank: 0 },
        // v3: 상세 화면 핵심 정보(출처·확인일·영업시간·전화). 예시 판매처는 번호를 내지 않는다
        source: VENDOR_SOURCES[v.data_status] ?? v.data_status,
        source_date: v.checked_on ?? undefined,
        hours: hoursSummary(v.opening_hours),
        phone: card.is_example ? null : v.phone,
      });
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
    // 식자재 납품업체(R-26): 공개 정보와 전화만. 가격·재고 없음
    for (const sv of deps.supplyVendors?.stores ?? []) {
      if (!inBox(sv.lat, sv.lng)) continue;
      stores.push({
        store_id: sv.store_id,
        kind: "public",
        name: sv.name,
        category: SUPPLY_CATEGORY,
        address: sv.address,
        lat: sv.lat,
        lng: sv.lng,
        distance_m: Math.round(distanceMeters(loc, sv)),
        source: deps.supplyVendors!.source,
        source_date: deps.supplyVendors!.source_date,
        phone: sv.phone,
      });
    }
    const activity = await deps.loadActivity?.(loc.id);
    if (activity) {
      const byId = new Map(activity.map((row) => [row.vendor_id, row]));
      for (const store of stores) {
        const counts = byId.get(store.store_id);
        store.used_count = counts?.used_count ?? 0;
        store.saved_count = counts?.saved_count ?? 0;
      }
    }
    stores.sort((a, b) => a.distance_m - b.distance_m || a.name.localeCompare(b.name, "ko"));
    return json(200, { location_id: loc.id, stores });
  });
}
