import { z } from "zod";

// 공공데이터 가게(v2 지도, R-22). 공개 정보(이름·주소·업종·좌표)만 담는다. 가격·입고·번호 칸은 두지 않는다.
// 원천: 소상공인시장진흥공단 상가(상권)정보. 만드는 법: scripts/build-public-stores.ts

export const PUBLIC_GUS = ["수원시 영통구", "수원시 팔달구"] as const;
export const PUBLIC_CATEGORIES = ["채소/과일", "슈퍼마켓"] as const;
// 수원시 대략 범위(좌표 오류 거르기용)
const SUWON = { minLat: 37.2, maxLat: 37.35, minLng: 126.9, maxLng: 127.1 };

export const publicStoreSchema = z.strictObject({
  store_id: z.string().regex(/^ps_[A-Za-z0-9]+$/),
  name: z.string().min(1),
  category: z.enum(PUBLIC_CATEGORIES),
  gu: z.enum(PUBLIC_GUS),
  dong: z.string().min(1),
  address: z.string().min(1),
  lat: z.number().min(SUWON.minLat).max(SUWON.maxLat),
  lng: z.number().min(SUWON.minLng).max(SUWON.maxLng),
});

export const publicStoresFileSchema = z.strictObject({
  source: z.literal("소상공인시장진흥공단 상가(상권)정보"),
  source_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rule: z.string().min(1),
  stores: z.array(publicStoreSchema),
});

export type PublicStore = z.infer<typeof publicStoreSchema>;
export type PublicStoresFile = z.infer<typeof publicStoresFileSchema>;

// AC-27: 영통·팔달 밖 0, 필수 칸 누락 0, id 중복 0
export function validatePublicStores(raw: unknown): { ok: true; data: PublicStoresFile } | { ok: false; errors: string[] } {
  const parsed = publicStoresFileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.slice(0, 20).map((i) => `${i.path.join(".")}: ${i.message}`) };
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const s of parsed.data.stores) {
    if (seen.has(s.store_id)) errors.push(`store_id 중복: ${s.store_id}`);
    seen.add(s.store_id);
  }
  return errors.length ? { ok: false, errors } : { ok: true, data: parsed.data };
}
