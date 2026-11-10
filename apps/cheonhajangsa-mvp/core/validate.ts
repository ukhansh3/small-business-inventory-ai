import { datasetSchema } from "./schema";
import type { Dataset } from "./types";

export type ValidationResult = { ok: true; data: Dataset } | { ok: false; errors: string[] };

// AC-16 데이터 파일 형식 검사. 규칙은 docs/planning/DB아키텍처.md 2.2와 같다.
export function validateDataset(raw: unknown): ValidationResult {
  const parsed = datasetSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }
  const d = parsed.data;
  const errors: string[] = [];

  const dupes = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);
  for (const id of dupes(d.items.map((x) => x.id))) errors.push(`items: id 중복 ${id}`);
  for (const n of dupes(d.items.map((x) => x.name))) errors.push(`items: name 중복 ${n}`);
  for (const id of dupes(d.locations.map((x) => x.id))) errors.push(`locations: id 중복 ${id}`);
  for (const id of dupes(d.vendors.map((x) => x.id))) errors.push(`vendors: id 중복 ${id}`);
  for (const k of dupes(d.offers.map((o) => `${o.vendor_id}:${o.item_id}`))) errors.push(`offers: 판매처·품목 중복 ${k}`);

  if (!d.items.some((x) => x.active)) errors.push("items: active 품목이 하나도 없음");
  const defaults = d.locations.filter((x) => x.is_default).length;
  if (defaults !== 1) errors.push(`locations: 기본 위치가 정확히 1개여야 함(지금 ${defaults}개)`);

  for (const v of d.vendors) {
    if (v.delivery_available !== true && v.delivery_dongs.length > 0) {
      errors.push(`vendors.${v.id}: 배달 지원이 확인되지 않았는데 배달 동네가 있음`);
    }
  }

  const vendorById = new Map(d.vendors.map((v) => [v.id, v]));
  const itemIds = new Set(d.items.map((x) => x.id));
  for (const o of d.offers) {
    const key = `offers.${o.vendor_id}:${o.item_id}`;
    const vendor = vendorById.get(o.vendor_id);
    if (!vendor) errors.push(`${key}: 없는 판매처`);
    if (!itemIds.has(o.item_id)) errors.push(`${key}: 없는 품목`);
    // R-10: 가격이 있으면 단위·출처·확인일도 있어야 한다
    if (o.price !== null && (o.price_unit_label === null || o.price_source === null || o.price_checked_on === null)) {
      errors.push(`${key}: 가격이 있으면 단위·출처·확인일이 모두 있어야 함`);
    }
    if (vendor?.data_status === "예시" && o.price_source !== null && o.price_source !== "예시") {
      errors.push(`${key}: 예시 판매처의 가격 출처는 '예시'여야 함`);
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, data: d };
}
