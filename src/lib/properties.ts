import { z } from "zod";

export const propertyTypes = [
  "apartment",
  "house",
  "villa",
  "land",
  "commercial",
  "office",
] as const;

export const propertyStatuses = [
  "draft",
  "published",
  "reserved",
  "sold",
  "rented",
  "archived",
] as const;

export const propertySchema = z.object({
  title: z.string().trim().min(3, "Title is required"),
  description: z.string().trim().optional(),
  type: z.enum(propertyTypes),
  status: z.enum(propertyStatuses),
  city: z.string().trim().min(2, "City is required"),
  neighborhood: z.string().trim().optional(),
  address: z.string().trim().optional(),
  price_eur: z.coerce.number().min(0, "Price must be positive"),
  bedrooms: z.coerce.number().int().min(0).optional().or(z.literal("")),
  bathrooms: z.coerce.number().int().min(0).optional().or(z.literal("")),
  area_m2: z.coerce.number().min(0).optional().or(z.literal("")),
  year_built: z.coerce
    .number()
    .int()
    .min(1800)
    .max(2100)
    .optional()
    .or(z.literal("")),
});

export type PropertyFormInput = z.infer<typeof propertySchema>;
export type PropertyStatus = (typeof propertyStatuses)[number];
export type PropertyType = (typeof propertyTypes)[number];

export type PropertyMedia = {
  id: string;
  public_url: string;
  alt_text: string | null;
  sort_order: number;
};

export type PropertyRecord = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  type: PropertyType;
  status: PropertyStatus;
  city: string;
  neighborhood: string | null;
  address: string | null;
  price_eur: number;
  bedrooms: number | null;
  bathrooms: number | null;
  area_m2: number | null;
  year_built: number | null;
  created_at: string;
  property_media: PropertyMedia[];
};

export function formDataToPropertyInput(formData: FormData) {
  return propertySchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    status: formData.get("status"),
    city: formData.get("city"),
    neighborhood: formData.get("neighborhood") || undefined,
    address: formData.get("address") || undefined,
    price_eur: formData.get("price_eur"),
    bedrooms: formData.get("bedrooms") || "",
    bathrooms: formData.get("bathrooms") || "",
    area_m2: formData.get("area_m2") || "",
    year_built: formData.get("year_built") || "",
  });
}

export function normalizeOptionalNumber(value: number | "" | undefined) {
  return value === "" || value === undefined ? null : value;
}

export function createSlug(title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64);

  return `${base || "property"}-${crypto.randomUUID().slice(0, 8)}`;
}

export function formatEuro(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
