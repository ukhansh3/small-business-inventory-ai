import type { Offer } from "./types";

// 화면 문구. 서버가 만들어 보내고 앱은 그대로 그린다(API 명세 2.5).

const SOURCE_LABEL: Record<NonNullable<Offer["price_source"]>, string> = {
  가게안내: "가게 안내",
  현장확인: "현장 확인",
  판매처직접: "가게 직접",
  예시: "예시",
};

export function won(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function monthDay(isoDate: string): string {
  const [, m, d] = isoDate.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}

// R-10: 가격·단위·출처·확인일이 모두 있을 때만 보여 준다
// R-11: unit_kg가 있고 1kg 단위가 아니면 kg당 가격(100원 단위 반올림)을 덧붙인다
export function priceDisplay(o: Offer): { has_price: boolean; display: string; per_kg_display: string | null } {
  if (o.price === null || o.price_unit_label === null || o.price_source === null || o.price_checked_on === null) {
    return { has_price: false, display: "가격 정보 없음", per_kg_display: null };
  }
  const display = `${o.price_unit_label} ${won(o.price)}원 · ${SOURCE_LABEL[o.price_source]} · ${monthDay(o.price_checked_on)} 확인`;
  const perKg = o.unit_kg !== null && o.unit_kg !== 1 ? `(kg당 약 ${won(Math.round(o.price / o.unit_kg / 100) * 100)}원)` : null;
  return { has_price: true, display, per_kg_display: perKg };
}

// 정렬용 kg당 가격. 비교할 수 없으면 null
export function pricePerKg(o: Offer): number | null {
  if (o.price === null || o.unit_kg === null) return null;
  if (o.price_unit_label === null || o.price_source === null || o.price_checked_on === null) return null;
  return o.price / o.unit_kg;
}

export function minSaleDisplay(kg: number | null): { kg: number | null; display: string } {
  return kg === null ? { kg, display: "최소 판매량 미확인" } : { kg, display: `최소 ${kg}kg부터` };
}
