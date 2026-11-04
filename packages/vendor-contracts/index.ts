import { z } from "zod";
export const uuid = z.string().uuid();
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
    "올바른 날짜를 입력해 주세요.",
  );
const short = (max: number) => z.string().trim().max(max).default("");
export const itemInputSchema = z
  .object({
    item_id: uuid.optional(),
    name: short(100),
    category: short(60),
    specification: short(200),
    quantity: z
      .number()
      .finite()
      .positive()
      .max(1000000)
      .nullable()
      .default(null),
    unit: short(20),
    price: z
      .number()
      .int()
      .positive()
      .max(1000000000000)
      .nullable()
      .default(null),
    tax: z.enum(["", "included", "excluded", "exempt"]).default(""),
    minimum_packages: z
      .number()
      .int()
      .positive()
      .max(1000000)
      .nullable()
      .default(null),
    delivery_fee: z
      .number()
      .int()
      .min(0)
      .max(1000000000000)
      .nullable()
      .default(null),
    delivery_fee_basis: short(500),
    selling: z.boolean().default(true),
    checked_on: dateSchema.nullable().default(null),
  })
  .strict();
export const vendorDraftSchema = z
  .object({
    name: short(100),
    description: short(2000),
    category: short(60),
    contact: short(100),
    address: short(200),
    opening_hours: short(500),
    fulfillment: z.enum(["", "pickup", "delivery", "both"]).default(""),
    delivery_terms: short(1000),
    items: z.array(itemInputSchema).max(50).default([]),
  })
  .strict();
export type VendorDraft = z.infer<typeof vendorDraftSchema>;
export const saveDraftSchema = z
  .object({
    draft: vendorDraftSchema,
    creation_key: uuid,
    revision_id: uuid.nullable().default(null),
    expected_version: z.number().int().positive().nullable().default(null),
  })
  .strict()
  .refine(
    (value) =>
      (value.revision_id === null) === (value.expected_version === null),
    "수정본 ID와 버전을 함께 입력해 주세요.",
  );
export const statusSchema = z.enum([
  "draft",
  "pending_review",
  "changes_requested",
  "approved",
]);
export const revisionSchema = z.object({
  id: uuid,
  vendor_id: uuid,
  version: z.number().int().positive(),
  status: statusSchema,
  name: z.string(),
  description: z.string(),
  category: z.string(),
  contact: z.string(),
  address: z.string(),
  opening_hours: z.string(),
  fulfillment: z.enum(["", "pickup", "delivery", "both"]),
  delivery_terms: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  owner_message: z.string().nullable(),
  submitted_at: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  items: z.array(
    itemInputSchema.extend({
      id: uuid,
      item_id: uuid,
      revision_id: uuid,
      vendor_id: uuid,
      provided_by: uuid,
      provided_at: z.string(),
      currency: z.literal("KRW"),
      source_type: z.literal("vendor_provided"),
    }),
  ),
  images: z.array(
    z.object({
      id: uuid,
      object_path: z.string(),
      position: z.number(),
      is_cover: z.boolean(),
    }),
  ),
  hidden: z.boolean().optional(),
  is_current: z.boolean().nullable().optional(),
});
export type Revision = z.infer<typeof revisionSchema>;
export const workspaceSchema = z.object({
  staff: z.boolean(),
  revisions: z.array(revisionSchema),
});
export const reviewSchema = z
  .object({
    expected_version: z.number().int().positive(),
    decision: z.enum(["approved", "changes_requested"]),
    owner_message: z.string().trim().max(1000).default(""),
    internal_note: z.string().trim().max(2000).default(""),
  })
  .strict()
  .refine(
    (v) => v.decision === "approved" || v.owner_message.length > 0,
    "보완 요청에는 사유가 필요합니다.",
  );
export const versionSchema = z
  .object({ expected_version: z.number().int().positive() })
  .strict();
export const visibilitySchema = z
  .object({ hidden: z.boolean(), reason: z.string().trim().min(1).max(1000) })
  .strict();
export const publishedItemSchema = itemInputSchema
  .omit({ item_id: true, category: true, selling: true })
  .extend({
    id: uuid,
    price: z.number().int().positive(),
    quantity: z.number().positive(),
    minimum_packages: z.number().int().positive(),
    checked_on: dateSchema,
    currency: z.literal("KRW"),
    source_type: z.literal("vendor_provided"),
  });
export const publishedVendorSchema = z.object({
  id: uuid,
  revision_id: uuid,
  name: z.string(),
  description: z.string(),
  category: z.string(),
  contact: z.string(),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  opening_hours: z.string(),
  fulfillment: z.enum(["pickup", "delivery", "both"]),
  delivery_terms: z.string(),
  items: z.array(publishedItemSchema),
  image_ids: z.array(uuid),
  distance_m: z.number().optional(),
  data_kind: z.literal("live"),
});
export type PublishedVendor = z.infer<typeof publishedVendorSchema>;
export const publishedSearchSchema = z.object({
  vendors: z.array(publishedVendorSchema),
  offset: z.number(),
  limit: z.number(),
  data_kind: z.literal("live"),
});
export const searchQuerySchema = z
  .object({
    latitude: z.coerce.number().finite().min(-90).max(90),
    longitude: z.coerce.number().finite().min(-180).max(180),
    radius: z.coerce.number().int().min(100).max(20000).default(3000),
    query: z.string().trim().max(100).default(""),
    category: z.string().trim().max(60).default(""),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict();
export function draftFromRevision(revision: Revision): VendorDraft {
  return vendorDraftSchema.parse({
    name: revision.name,
    description: revision.description,
    category: revision.category,
    contact: revision.contact,
    address: revision.address,
    opening_hours: revision.opening_hours,
    fulfillment: revision.fulfillment,
    delivery_terms: revision.delivery_terms,
    items: revision.items.map(
      ({
        item_id,
        name,
        category,
        specification,
        quantity,
        unit,
        price,
        tax,
        minimum_packages,
        delivery_fee,
        delivery_fee_basis,
        selling,
        checked_on,
      }) => ({
        item_id,
        name,
        category,
        specification,
        quantity,
        unit,
        price,
        tax,
        minimum_packages,
        delivery_fee,
        delivery_fee_basis,
        selling,
        checked_on,
      }),
    ),
  });
}
