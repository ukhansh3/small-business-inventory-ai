import type { Dataset, OpeningHours, Offer, Vendor } from "../../core/types";

// 테스트 전용 고정 데이터(판매처 A~G). 실제 data/와 분리해 데이터를 고쳐도 AC 기대값이 흔들리지 않게 한다.
// 기준 시각: 2026-11-09(월). 위치 loc_test(원천동).

export const MON_1000 = new Date("2026-11-09T01:00:00Z"); // 한국 10:00
export const MON_2100 = new Date("2026-11-09T12:00:00Z"); // 한국 21:00
export const TODAY = "2026-11-09";

export function hours(open: string, close: string, sun: "closed" | "open" = "open"): OpeningHours {
  const h = { open, close };
  return { mon: h, tue: h, wed: h, thu: h, fri: h, sat: h, sun: sun === "closed" ? "closed" : h };
}

export function vendor(id: string, name: string, over: Partial<Vendor> = {}): Vendor {
  return {
    id,
    name,
    kind: "채소가게",
    address: "테스트 주소",
    dong: "원천동",
    lat: 37.28,
    lng: 127.04,
    phone: "000-0000-0000",
    opening_hours: hours("06:00", "23:00"),
    delivery_available: false,
    delivery_dongs: [],
    delivery_note: null,
    data_status: "현장확인",
    checked_on: null,
    ...over,
  };
}

export function offer(vendor_id: string, over: Partial<Offer> = {}): Offer {
  return {
    vendor_id,
    item_id: "item_lettuce",
    price: null,
    price_unit_label: null,
    unit_kg: null,
    price_source: null,
    price_checked_on: null,
    min_sale_kg: null,
    restock_days: null,
    restock_time: null,
    last_restocked_on: null,
    available: true,
    ...over,
  };
}

export function baseDataset(vendors: Vendor[], offers: Offer[]): Dataset {
  return {
    items: [
      { id: "item_lettuce", name: "상추", aliases: [], category: "채소", active: true, default_unit: "kg" },
      { id: "item_green_onion", name: "대파", aliases: [], category: "채소", active: false, default_unit: "kg" },
    ],
    locations: [{ id: "loc_test", name: "테스트 위치", dong: "원천동", lat: 37.28, lng: 127.04, is_default: true }],
    vendors,
    offers,
  };
}

// 약 0.001도 ≈ 111m(위도)
export function northOf(meters: number): { lat: number; lng: number } {
  return { lat: 37.28 + meters / 111_000, lng: 127.04 };
}

export const A = vendor("v_101", "A가게");
export const B = vendor("v_102", "B가게", { delivery_available: true, delivery_dongs: ["우만동"] });
export const C = vendor("v_103", "C가게");
export const D = vendor("v_104", "D가게");
export const E = vendor("v_105", "E가게", { opening_hours: hours("07:00", "20:00") });
export const F = vendor("v_106", "F가게");
export const G = vendor("v_107", "G가게");
