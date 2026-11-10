// 검색 입력·출력 모양. 칸 이름은 docs/planning/API명세서.md 2.2·2.5·2.6과 같다.

export type Urgency = "now" | "today" | "tomorrow";
export type Fulfillment = "pickup" | "delivery";

export type SearchCondition = {
  item_id: string;
  qty_kg: number | null;
  urgency: Urgency;
  fulfillment: Fulfillment;
  location_id: string;
};

export type VendorCard = {
  vendor_id: string;
  name: string;
  kind: string;
  is_example: boolean;
  rank: number;
  distance: { meters: number; display: string; walk_minutes: number };
  open_status: { state: "open" | "closed"; display: string };
  restock: { state: "restocked_today" | "expected_today" | "none"; time: string | null; display: string | null };
  delivery: { state: "available" | "unavailable" | "not_requested"; display: string | null; note: string | null };
  deliveryStatus: "supported" | "pickup_only" | "unknown";
  destinationConfirmationRequired: boolean;
  deliveryTerms: string | null;
  price: { has_price: boolean; display: string; per_kg_display: string | null };
  min_sale: { kg: number | null; display: string };
  phone: string;
};

export type GroupKey = "available" | "unavailable_time" | "no_delivery";

export type ResultGroup = { key: GroupKey; title: string; count: number; items: VendorCard[] };

export type SearchResult = { groups: ResultGroup[]; total: number; empty_hint: string | null };
