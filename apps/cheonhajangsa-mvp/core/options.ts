import items from "../data/items.json";
import { BOXES } from "./market-prices";

// 되묻기·칩 편집 선택지(개발기획서 WF-04 표). 서버 되묻기와 앱 칩 편집이 같은 값을 쓴다.

export const QTY_OPTIONS = [
  { value: 1, label: "1kg" },
  { value: 2, label: "2kg" },
  { value: 5, label: "5kg" },
  { value: 4, label: "1박스(4kg)" },
  { value: null, label: "잘 모르겠어요" },
] as const;

export const URGENCY_OPTIONS = [
  { value: "now", label: "지금 바로" },
  { value: "today", label: "오늘 안" },
  { value: "tomorrow", label: "내일" },
] as const;

export const FULFILLMENT_OPTIONS = [
  { value: "pickup", label: "직접 갈게요" },
  { value: "delivery", label: "배달해 주세요" },
] as const;

// v3: 비교 품목(활성 품목) 고르기. 칩 편집과 AI 실패 때 직접 고르기에서 쓴다
export const ITEM_OPTIONS: { value: string; label: string }[] = (items as { id: string; name: string; active: boolean }[])
  .filter((i) => i.active)
  .map((i) => ({ value: i.id, label: i.name }));

// v3: 양 선택지의 거래 단위는 품목을 따른다(상추 1박스 4kg, 양파 1망 15kg, 감자 1박스 20kg). 대파 1단은 1kg와 같아 뺀다
export function qtyOptionsFor(itemId: string | null): { value: number | null; label: string }[] {
  const box = itemId ? BOXES[itemId] : undefined;
  const unit = box ? box.label.replace(/^\d+kg 한 /, "") : null; // "상자"·"망"·"단"
  const boxOption = box && box.kg !== 1 && box.kg !== 2 && box.kg !== 5 ? [{ value: box.kg, label: `1${unit === "상자" ? "박스" : unit}(${box.kg}kg)` }] : [];
  return [{ value: 1, label: "1kg" }, { value: 2, label: "2kg" }, { value: 5, label: "5kg" }, ...boxOption, { value: null, label: "잘 모르겠어요" }];
}
