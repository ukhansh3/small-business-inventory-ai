import type { Fulfillment, SearchResult, Urgency } from "../../core/search-types";

// API 응답 모양(docs/planning/API명세서.md 2절, API-01·API-02). 서버 handlers와 칸 이름이 같다.

export type Slot = "item_id" | "qty_kg" | "urgency" | "fulfillment" | "location_id";
export type AskSlot = "qty_kg" | "urgency" | "fulfillment";
export type FieldSource = "said" | "asked" | "default" | "edited";
export type FieldSourceMap = Partial<Record<Slot, FieldSource>>;

export type PartialCondition = {
  item_id: string | null;
  qty_kg: number | null;
  urgency: Urgency | null;
  fulfillment: Fulfillment | null;
  location_id: string | null;
};

export type ChoiceValue = string | number | null;
export type Option = { value: ChoiceValue; label: string };
export type Ask = { slot: AskSlot; question: string; options: Option[]; allow_text: boolean };
export type Chip = { slot: Slot; label: string; editable: boolean };

export type NoticeAction = "request_item" | "search_lettuce";
export type Notice = {
  kind: "out_of_scope_item" | "off_topic";
  message: string;
  recognized_item: { item_id: string | null; name: string } | null;
  actions: NoticeAction[];
};

// v2 단가 진단(API 명세 3.5). 서버 server/price-check.ts·core/price.ts와 같은 모양
export type Market = {
  item_id: string;
  per_kg: { low: number; median: number; high: number } | null;
  samples: number;
  includes_example: boolean;
  display: string;
};
export type PriceLine = {
  line_no: number;
  raw_name: string;
  item_id: string | null;
  item_name: string | null;
  qty_kg: number | null;
  amount_won: number;
  price_per_kg: number | null;
  comparable: boolean;
  reason: string | null;
  verdict: "cheaper" | "normal" | "pricier" | null;
  verdict_display: string | null;
  cheaper: import("../../core/search-types").VendorCard[];
};
export type PriceCheck = {
  check_id: string;
  source: "text" | "photo";
  doc_type: string;
  seller_type: string;
  purchased_on: string | null;
  delivery_fee_won: number | null;
  lines: PriceLine[];
  market: Market | null;
  message: string | null;
  example_data: boolean;
  ai_mode: "live" | "stored";
};

type TurnBase = { session_id: string; turn_seq: number; ai_mode: "live" | "stored"; example_data: boolean };
export type TurnResponse =
  | (TurnBase & { type: "ask"; ask: Ask; condition: PartialCondition; field_source: FieldSourceMap })
  | (TurnBase & { type: "notice"; notice: Notice })
  | (TurnBase & { type: "price_check"; price_check: PriceCheck })
  | (TurnBase & {
      type: "results";
      condition: PartialCondition & { version: number; field_source: FieldSourceMap };
      chips: Chip[];
      results: SearchResult;
      market?: Market;
    });

export type SearchResponse = {
  condition: PartialCondition & { version: number; field_source: FieldSourceMap };
  chips: Chip[];
  results: SearchResult;
  market?: Market;
  ai_mode: "live" | "stored";
  example_data: boolean;
};

export type Location = { location_id: string; name: string; dong: string; lat: number; lng: number; is_default: boolean };

// API-03
export type VendorDetail = {
  card: import("../../core/search-types").VendorCard;
  address: string;
  dong: string;
  opening_hours: { day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"; display: string }[];
  delivery_dongs: string[] | null;
  delivery_note: string | null;
  restock_days: string[] | null;
  restock_time: string | null;
  data_status: string;
  checked_on: string | null;
  example_data: boolean;
};

// API-18 지도용 가게. 공공데이터 가게는 가격·입고·번호가 없다(R-22)
export type Store = {
  store_id: string;
  kind: "vendor" | "public";
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  distance_m: number;
  demo_service?: string;
  vendor_card?: import("../../core/search-types").VendorCard;
  source?: string;
  source_date?: string;
};

// 503 AI_UNAVAILABLE의 detail
export type AiFailureDetail = { session_id: string; condition: PartialCondition; field_source: FieldSourceMap };
