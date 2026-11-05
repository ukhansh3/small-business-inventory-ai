import { z } from "zod";

// 데이터 파일 스키마. 칸 이름·허용값은 docs/planning/DB아키텍처.md 2절, 개발기획서 E-01~E-04와 같다.

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const daySchema = z.enum(DAYS);

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:MM 형식이어야 함");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 함");
const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);

export const itemSchema = z.strictObject({
  id: z.string().regex(/^item_[a-z_]+$/),
  name: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  category: z.string().min(1),
  active: z.boolean(),
  default_unit: z.string().min(1),
});

export const locationSchema = z.strictObject({
  id: z.string().regex(/^loc_[a-z_]+$/),
  name: z.string().min(1),
  dong: z.string().min(1),
  lat,
  lng,
  is_default: z.boolean(),
});

// E-02a: 요일마다 {open, close} 또는 "closed". close < open이면 다음 날까지 영업
export const dayHoursSchema = z.union([z.literal("closed"), z.strictObject({ open: hhmm, close: hhmm })]);
export const openingHoursSchema = z.strictObject({
  mon: dayHoursSchema,
  tue: dayHoursSchema,
  wed: dayHoursSchema,
  thu: dayHoursSchema,
  fri: dayHoursSchema,
  sat: dayHoursSchema,
  sun: dayHoursSchema,
});

export const VENDOR_KINDS = ["채소가게", "식자재마트", "시장점포"] as const;
export const DATA_STATUSES = ["예시", "현장확인", "판매처직접"] as const;
export const PRICE_SOURCES = ["가게안내", "현장확인", "판매처직접", "예시"] as const;

export const vendorSchema = z.strictObject({
  id: z.string().regex(/^v_\d{3,}$/),
  name: z.string().min(1),
  kind: z.enum(VENDOR_KINDS),
  address: z.string().min(1),
  dong: z.string().min(1),
  lat,
  lng,
  phone: z.string().min(1),
  opening_hours: openingHoursSchema,
  delivery_available: z.boolean(),
  delivery_dongs: z.array(z.string().min(1)),
  delivery_note: z.string().nullable(),
  data_status: z.enum(DATA_STATUSES),
  checked_on: isoDate.nullable(),
});

export const offerSchema = z.strictObject({
  vendor_id: z.string(),
  item_id: z.string(),
  price: z.number().int().nonnegative().nullable(),
  price_unit_label: z.string().min(1).nullable(),
  unit_kg: z.number().positive().nullable(),
  price_source: z.enum(PRICE_SOURCES).nullable(),
  price_checked_on: isoDate.nullable(),
  min_sale_kg: z.number().positive().nullable(),
  restock_days: z.array(daySchema).nullable(),
  restock_time: hhmm.nullable(),
  last_restocked_on: isoDate.nullable(),
  available: z.boolean(),
});

export const datasetSchema = z.strictObject({
  items: z.array(itemSchema),
  locations: z.array(locationSchema),
  vendors: z.array(vendorSchema),
  offers: z.array(offerSchema),
});
