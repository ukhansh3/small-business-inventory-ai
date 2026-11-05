import { distanceDisplay, distanceMeters } from "./distance";
import { minSaleDisplay, priceDisplay, pricePerKg } from "./format";
import type { GroupKey, ResultGroup, SearchCondition, SearchResult, VendorCard } from "./search-types";
import {
  closingTime,
  dayAfter,
  dayLabel,
  isOpenNow,
  nextOpening,
  opensLaterToday,
  opensOnDay,
  seoulNow,
  toMinutes,
  type SeoulNow,
} from "./time";
import type { Dataset, Location, Offer, Vendor } from "./types";

export class SearchInputError extends Error {
  constructor(
    public code: "INVALID_INPUT" | "ITEM_NOT_ACTIVE" | "NOT_FOUND",
    message: string,
  ) {
    super(message);
  }
}

type Row = {
  vendor: Vendor;
  offer: Offer;
  meters: number;
  group: GroupKey;
  restockRank: number;
  perKg: number | null;
  card: Omit<VendorCard, "rank">;
};

const GROUP_ORDER: GroupKey[] = ["available", "no_delivery", "unavailable_time"];

const TITLES: Record<GroupKey, Record<SearchCondition["urgency"], string>> = {
  available: { now: "지금 갈 수 있는 곳", today: "오늘 갈 수 있는 곳", tomorrow: "내일 갈 수 있는 곳" },
  unavailable_time: { now: "지금은 닫힌 곳", today: "오늘은 안 여는 곳", tomorrow: "내일은 안 여는 곳" },
  no_delivery: { now: "배달이 안 되는 곳", today: "배달이 안 되는 곳", tomorrow: "배달이 안 되는 곳" },
};

// R-06: 급함에 맞는 시간인가
function timeFits(v: Vendor, c: SearchCondition, now: SeoulNow): boolean {
  if (c.urgency === "now") return isOpenNow(v.opening_hours, now);
  if (c.urgency === "today") return opensLaterToday(v.opening_hours, now);
  return opensOnDay(v.opening_hours, dayAfter(now.day, 1));
}

// R-04 표시
function openStatus(v: Vendor, now: SeoulNow): VendorCard["open_status"] {
  if (isOpenNow(v.opening_hours, now)) {
    const close = closingTime(v.opening_hours, now);
    return { state: "open", display: close ? `영업 중 ~${close}` : "영업 중" };
  }
  const next = nextOpening(v.opening_hours, now);
  if (!next) return { state: "closed", display: "지금은 닫힘" };
  return { state: "closed", display: `지금은 닫힘 · ${dayLabel(next.offset, dayAfter(now.day, next.offset))} ${next.time}` };
}

// R-05
function restock(o: Offer, now: SeoulNow): VendorCard["restock"] {
  if (o.last_restocked_on === now.date) {
    return {
      state: "restocked_today",
      time: o.restock_time,
      display: o.restock_time ? `오늘 ${o.restock_time} 입고됨` : "오늘 입고됨",
    };
  }
  if (o.restock_days?.includes(now.day) && o.restock_time && toMinutes(o.restock_time) > now.minutes) {
    return { state: "expected_today", time: o.restock_time, display: `오늘 ${o.restock_time} 입고 예정` };
  }
  return { state: "none", time: null, display: null };
}

const RESTOCK_RANK = { restocked_today: 0, expected_today: 1, none: 2 } as const;

// R-07
function delivery(v: Vendor, c: SearchCondition, loc: Location): VendorCard["delivery"] {
  if (c.fulfillment === "pickup") return { state: "not_requested", display: null, note: null };
  if (v.delivery_available && v.delivery_dongs.includes(loc.dong)) {
    return { state: "available", display: "배달 가능", note: v.delivery_note };
  }
  return { state: "unavailable", display: "배달 안 됨", note: null };
}

function validate(data: Dataset, c: SearchCondition): Location {
  if (c.qty_kg !== null && !(c.qty_kg >= 0.5 && c.qty_kg <= 50)) {
    throw new SearchInputError("INVALID_INPUT", "양은 0.5kg에서 50kg 사이로 골라 주세요.");
  }
  const item = data.items.find((i) => i.id === c.item_id);
  if (!item) throw new SearchInputError("INVALID_INPUT", "알 수 없는 품목이에요.");
  if (!item.active) throw new SearchInputError("ITEM_NOT_ACTIVE", `아직 상추만 준비돼 있어요.`);
  const loc = data.locations.find((l) => l.id === c.location_id);
  if (!loc) throw new SearchInputError("NOT_FOUND", "위치를 찾을 수 없어요.");
  return loc;
}

function buildRows(data: Dataset, c: SearchCondition, loc: Location, now: SeoulNow): Row[] {
  const rows: Row[] = [];
  for (const offer of data.offers) {
    // R-01: 요청 품목을 지금 파는 곳만
    if (offer.item_id !== c.item_id || !offer.available) continue;
    const vendor = data.vendors.find((v) => v.id === offer.vendor_id);
    if (!vendor) continue;
    // R-03: 원하는 양이 최소 판매량보다 작으면 제외
    if (c.qty_kg !== null && offer.min_sale_kg !== null && c.qty_kg < offer.min_sale_kg) continue;

    const meters = distanceMeters(loc, vendor);
    const card = buildCard(vendor, offer, c, loc, now);
    const group: GroupKey = !timeFits(vendor, c, now)
      ? "unavailable_time"
      : card.delivery.state === "unavailable"
        ? "no_delivery"
        : "available";

    rows.push({ vendor, offer, meters, group, restockRank: RESTOCK_RANK[card.restock.state], perKg: pricePerKg(offer), card });
  }
  return rows;
}

// 결과 카드 한 장. 판매처 상세(API-03)도 같은 함수로 만들어 결과 카드와 값이 같다.
export function buildCard(vendor: Vendor, offer: Offer, c: SearchCondition, loc: Location, now: SeoulNow): Omit<VendorCard, "rank"> {
  return {
    vendor_id: vendor.id,
    name: vendor.name,
    kind: vendor.kind,
    is_example: vendor.data_status === "예시", // R-12
    distance: distanceDisplay(distanceMeters(loc, vendor)),
    open_status: openStatus(vendor, now),
    restock: restock(offer, now),
    delivery: delivery(vendor, c, loc),
    price: priceDisplay(offer),
    min_sale: minSaleDisplay(offer.min_sale_kg),
    phone: vendor.phone,
  };
}

// R-09: 입고 → 거리 → kg당 가격(없으면 뒤) → 이름
function compare(a: Row, b: Row): number {
  if (a.restockRank !== b.restockRank) return a.restockRank - b.restockRank;
  if (a.meters !== b.meters) return a.meters - b.meters;
  if (a.perKg !== b.perKg) {
    if (a.perKg === null) return 1;
    if (b.perKg === null) return -1;
    return a.perKg - b.perKg;
  }
  return a.vendor.name.localeCompare(b.vendor.name, "ko");
}

// R-15: 0건일 때 바꿀 조건 한 줄
function emptyHint(data: Dataset, c: SearchCondition): string {
  const sellers = data.offers.filter((o) => o.item_id === c.item_id && o.available);
  if (sellers.length === 0) return "아직 이 품목을 파는 곳이 없어요.";
  if (c.qty_kg !== null) {
    const mins = sellers.map((o) => o.min_sale_kg).filter((m): m is number => m !== null && m > (c.qty_kg ?? 0));
    if (mins.length > 0) {
      const target = Math.min(...mins);
      const count = sellers.filter((o) => o.min_sale_kg === null || o.min_sale_kg <= target).length;
      return `${target}kg 이상으로 고르면 ${count}곳이 있어요.`;
    }
  }
  return "조건을 바꿔 다시 찾아 주세요.";
}

export function search(data: Dataset, c: SearchCondition, now: Date): SearchResult {
  const loc = validate(data, c);
  const sn = seoulNow(now);
  const rows = buildRows(data, c, loc, sn);

  const groups: ResultGroup[] = [];
  let rank = 1;
  for (const key of GROUP_ORDER) {
    const inGroup = rows.filter((r) => r.group === key).sort(compare);
    if (inGroup.length === 0) continue;
    const items = inGroup.map((r) => ({ ...r.card, rank: rank++ }));
    groups.push({ key, title: TITLES[key][c.urgency], count: items.length, items });
  }

  const total = rows.length;
  return { groups, total, empty_hint: total === 0 ? emptyHint(data, c) : null };
}
