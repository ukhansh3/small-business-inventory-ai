import { z } from "zod";
import type { SearchCondition } from "../core/search-types";
import { QTY_OPTIONS } from "../core/options";
import type { Dataset } from "../core/types";

// 조건(API 명세 2.2)과 조건 칩(2.3). MVP는 서버에 세션 저장소가 없어 앱이 조건을 들고 다닌다(consistency-report C9).

export const SLOTS = ["item_id", "qty_kg", "urgency", "fulfillment", "location_id"] as const;
export type Slot = (typeof SLOTS)[number];
export type FieldSource = "said" | "asked" | "default" | "edited";

export const fieldSourceSchema = z.partialRecord(z.enum(SLOTS), z.enum(["said", "asked", "default", "edited"]));

export const conditionValuesSchema = z.strictObject({
  item_id: z.string().min(1),
  qty_kg: z.number().nullable(),
  urgency: z.enum(["now", "today", "tomorrow"]),
  fulfillment: z.enum(["pickup", "delivery"]),
  location_id: z.string().min(1),
});

export const conditionInSchema = conditionValuesSchema.extend({
  version: z.number().int().min(0).optional(),
  field_source: fieldSourceSchema.optional(),
});

export type ConditionOut = SearchCondition & { version: number; field_source: Partial<Record<Slot, FieldSource>> };

export const URGENCY_LABEL = { now: "지금 바로", today: "오늘 안", tomorrow: "내일" } as const;
export const FULFILLMENT_LABEL = { pickup: "직접", delivery: "배달" } as const;

function qtyLabel(q: number | null): string {
  if (q === null) return "양 미정";
  const opt = QTY_OPTIONS.find((o) => o.value === q);
  return opt ? opt.label : `${q}kg`;
}

export function chips(c: SearchCondition, data: Dataset) {
  const item = data.items.find((i) => i.id === c.item_id);
  const loc = data.locations.find((l) => l.id === c.location_id);
  return [
    { slot: "item_id", label: item?.name ?? c.item_id, editable: false },
    { slot: "qty_kg", label: qtyLabel(c.qty_kg), editable: true },
    { slot: "urgency", label: URGENCY_LABEL[c.urgency], editable: true },
    { slot: "fulfillment", label: FULFILLMENT_LABEL[c.fulfillment], editable: true },
    { slot: "location_id", label: loc?.name ?? c.location_id, editable: true },
  ];
}

export function hasExampleData(data: Dataset): boolean {
  return data.vendors.some((v) => v.data_status === "예시"); // R-12
}
