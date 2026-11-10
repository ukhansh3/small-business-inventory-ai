import { buildCard, SearchInputError } from "./search";
import type { VendorCard } from "./search-types";
import { DAYS } from "./schema";
import { seoulNow } from "./time";
import type { Dataset } from "./types";

// 판매처 상세(S-04, API-03). 카드 값은 결과 목록과 같은 함수로 만든다. 받는 방식은 묻지 않은 상태(직접)로 본다.

export type Day = (typeof DAYS)[number];

export type VendorDetail = {
  card: VendorCard;
  address: string;
  dong: string;
  opening_hours: { day: Day; display: string }[];
  delivery_dongs: string[] | null;
  delivery_note: string | null;
  restock_days: Day[] | null;
  restock_time: string | null;
  data_status: string;
  checked_on: string | null;
};

export function vendorDetail(data: Dataset, vendorId: string, itemId: string, locationId: string, now: Date, rank = 1): VendorDetail {
  const vendor = data.vendors.find((v) => v.id === vendorId);
  const offer = data.offers.find((o) => o.vendor_id === vendorId && o.item_id === itemId && o.available);
  if (!vendor || !offer) throw new SearchInputError("NOT_FOUND", "판매처 정보를 찾을 수 없어요.");
  const loc = data.locations.find((l) => l.id === locationId);
  if (!loc) throw new SearchInputError("NOT_FOUND", "위치를 찾을 수 없어요.");

  const card = buildCard(vendor, offer, { item_id: itemId, qty_kg: null, urgency: "now", fulfillment: "pickup", location_id: loc.id }, loc, seoulNow(now));
  return {
    card: { ...card, rank },
    address: vendor.address,
    dong: vendor.dong,
    opening_hours: DAYS.map((day) => {
      const h = vendor.opening_hours[day];
      return { day, display: h === "closed" ? "쉬는 날" : `${h.open}~${h.close}` };
    }),
    delivery_dongs: vendor.delivery_available ? vendor.delivery_dongs : null,
    delivery_note: vendor.delivery_available ? vendor.delivery_note : null,
    restock_days: offer.restock_days,
    restock_time: offer.restock_time,
    data_status: vendor.data_status,
    checked_on: vendor.checked_on,
  };
}
