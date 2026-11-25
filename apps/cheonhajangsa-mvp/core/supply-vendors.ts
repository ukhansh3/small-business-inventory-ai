import { z } from "zod";

// 식자재 납품업체(v3, R-26): 행정안전부 인허가정보 '집단급식소 식품판매업' 중 수원시·영업/정상만.
// 공개 정보(이름·주소·전화·좌표)만 담는다. 가격·재고는 없다. 만드는 법: scripts/build-supply-vendors.ts

export const SUPPLY_SOURCE = "행정안전부 인허가정보 집단급식소 식품판매업";
export const SUPPLY_CATEGORY = "식자재 납품업체";
const SUWON = { minLat: 37.2, maxLat: 37.35, minLng: 126.9, maxLng: 127.1 };

export const supplyVendorSchema = z.strictObject({
  store_id: z.string().regex(/^sv_[0-9]+_[0-9]+$/),
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().regex(/^0\d{1,2}-\d{3,4}-\d{4}$/).nullable(),
  licensed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  lat: z.number().min(SUWON.minLat).max(SUWON.maxLat),
  lng: z.number().min(SUWON.minLng).max(SUWON.maxLng),
});

export const supplyVendorsFileSchema = z.strictObject({
  source: z.literal(SUPPLY_SOURCE),
  source_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rule: z.string().min(1),
  stores: z.array(supplyVendorSchema),
});

export type SupplyVendor = z.infer<typeof supplyVendorSchema>;
export type SupplyVendorsFile = z.infer<typeof supplyVendorsFileSchema>;

export function validateSupplyVendors(raw: unknown): { ok: true; data: SupplyVendorsFile } | { ok: false; errors: string[] } {
  const parsed = supplyVendorsFileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.slice(0, 20).map((i) => `${i.path.join(".")}: ${i.message}`) };
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const s of parsed.data.stores) {
    if (seen.has(s.store_id)) errors.push(`store_id 중복: ${s.store_id}`);
    seen.add(s.store_id);
  }
  return errors.length ? { ok: false, errors } : { ok: true, data: parsed.data };
}
