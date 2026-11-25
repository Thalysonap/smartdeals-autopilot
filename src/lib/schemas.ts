import { z } from "zod";

export const monitoredProductSchema = z.object({
  name: z.string().trim().min(3, "Informe o produto com pelo menos 3 caracteres").max(240),
  brand: z.string().trim().max(80).optional().nullable(),
  model: z.string().trim().max(80).optional().nullable(),
  version: z.string().trim().max(80).optional().nullable(),
  capacity: z.string().trim().max(40).optional().nullable(),
  category: z.string().trim().max(80).optional().nullable(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  intervalMinutes: z.coerce.number().int().min(30).max(10080).default(240),
});

export const monitoredProductUpdateSchema = monitoredProductSchema.partial().extend({
  status: z.enum(["active", "paused"]).optional(),
});

export const preferencesSchema = z.object({
  theme: z.enum(["dark", "light"]).optional(),
  scanIntervalMinutes: z.coerce.number().int().min(30).max(10080).optional(),
  notificationsEnabled: z.boolean().optional(),
  affiliateDisclosure: z.boolean().optional(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres").max(128),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const opportunityFilterSchema = z.object({
  product: z.string().optional(),
  category: z.string().optional(),
  store: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  minReliability: z.coerce.number().min(0).max(100).optional(),
  availability: z.enum(["in_stock", "out_of_stock", "unknown"]).optional(),
  updatedAfter: z.string().optional(),
});

export type MonitoredProductInput = z.infer<typeof monitoredProductSchema>;
export type MonitoredProductUpdate = z.infer<typeof monitoredProductUpdateSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
