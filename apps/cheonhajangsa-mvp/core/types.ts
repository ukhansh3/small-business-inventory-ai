import type { z } from "zod";
import type {
  datasetSchema,
  dayHoursSchema,
  daySchema,
  itemSchema,
  locationSchema,
  offerSchema,
  openingHoursSchema,
  vendorSchema,
} from "./schema";

export type Day = z.infer<typeof daySchema>;
export type Item = z.infer<typeof itemSchema>;
export type Location = z.infer<typeof locationSchema>;
export type DayHours = z.infer<typeof dayHoursSchema>;
export type OpeningHours = z.infer<typeof openingHoursSchema>;
export type Vendor = z.infer<typeof vendorSchema>;
export type Offer = z.infer<typeof offerSchema>;
export type Dataset = z.infer<typeof datasetSchema>;
