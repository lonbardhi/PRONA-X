"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  calculateGrossBuildableArea,
  createSlug,
  formDataToPropertyInput,
  isDevelopmentLand,
  normalizeOptionalNumber,
} from "@/lib/properties";
import {
  createPropertyMediaStoragePath,
  getPropertyMediaMimeType,
  propertyMediaMaxFiles,
  validatePropertyMediaFile,
} from "@/lib/property-media";
import {
  createClient,
  requireOperatorUser,
} from "@/lib/supabase/server";

const MEDIA_BUCKET = "property-media";
const GENERIC_PROPERTY_ERROR =
  "Prona nuk u krijua. Kontrollo fushat dhe provo perseri.";

export type PropertyMutationResult = {
  mediaCount: number;
  message?: string;
  propertyId?: string;
  propertyTitle?: string;
  redirectPath: string;
  success: boolean;
};

async function requireUser() {
  const { supabase, user } = await requireOperatorUser();

  return { supabase, user };
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return getValidationMessage(error.issues[0]?.message);
  }

  if (error instanceof Error) {
    return getDatabaseMessage(error.message);
  }

  return GENERIC_PROPERTY_ERROR;
}

function getDatabaseMessage(message: string) {
  if (message.includes("visibility") && message.includes("not-null")) {
    return "Dukshmeria e prones mungonte. Formulari tani e vendos automatikisht si te brendshme.";
  }

  if (message.toLowerCase().includes("row-level security")) {
    return "Nuk ke leje per kete veprim. Kontakto administratorin nese duhet akses shtese.";
  }

  if (message.toLowerCase().includes("duplicate")) {
    return "Ky regjistrim duket se ekziston tashme. Kontrollo listen dhe provo perseri.";
  }

  return message || GENERIC_PROPERTY_ERROR;
}

function getValidationMessage(message?: string) {
  const validationMessages: Record<string, string> = {
    "City is required": "Shkruaj qytetin e prones.",
    "Landowner requested percentage is required":
      "Shkruaj perqindjen e kerkuar nga pronari.",
    "Minimum acceptable percentage cannot be higher than requested percentage":
      "Perqindja minimale nuk mund te jete me e larte se kerkesa e pronarit.",
    "Plot size is required for Development Land":
      "Shkruaj siperfaqen e parceles per Token e Zhvillimit.",
    "Price is required for standard sale properties":
      "Shkruaj cmimin per pronat standarde te shitjes.",
    "Title is required": "Shkruaj titullin e prones.",
  };

  return message ? validationMessages[message] || message : GENERIC_PROPERTY_ERROR;
}

function getSalesMessagePath(message: string) {
  return `/sales?message=${encodeURIComponent(message)}`;
}

function getPropertyPayload(formData: FormData, userId: string) {
  const input = formDataToPropertyInput(formData);
  const developmentLand = isDevelopmentLand(input.type);
  const estimatedGrossBuildableArea =
    normalizeOptionalNumber(input.estimated_gross_buildable_area_m2) ??
    calculateGrossBuildableArea(input.plot_size_m2, input.building_coefficient);

  return {
    title: input.title,
    slug: createSlug(input.title),
    description: input.description || null,
    type: input.type,
    status: input.status,
    city: input.city,
    neighborhood: input.neighborhood || null,
    address: input.address || null,
    price_eur: developmentLand ? null : normalizeOptionalNumber(input.price_eur),
    bedrooms: developmentLand ? null : normalizeOptionalNumber(input.bedrooms),
    bathrooms: developmentLand ? null : normalizeOptionalNumber(input.bathrooms),
    area_m2: developmentLand
      ? normalizeOptionalNumber(input.plot_size_m2)
      : normalizeOptionalNumber(input.area_m2),
    year_built: developmentLand ? null : normalizeOptionalNumber(input.year_built),
    plot_size_m2: normalizeOptionalNumber(input.plot_size_m2),
    land_certificate_number: input.land_certificate_number || null,
    cadastral_zone: input.cadastral_zone || null,
    parcel_number: input.parcel_number || null,
    ownership_status: input.ownership_status || null,
    landowners_count: normalizeOptionalNumber(input.landowners_count),
    current_land_use: input.current_land_use || null,
    development_zone: input.development_zone || null,
    building_coefficient: normalizeOptionalNumber(input.building_coefficient),
    max_floors: normalizeOptionalNumber(input.max_floors),
    estimated_gross_buildable_area_m2: estimatedGrossBuildableArea,
    estimated_net_sellable_area_m2: normalizeOptionalNumber(
      input.estimated_net_sellable_area_m2,
    ),
    estimated_apartments: normalizeOptionalNumber(input.estimated_apartments),
    estimated_garages: normalizeOptionalNumber(input.estimated_garages),
    estimated_parking_spaces: normalizeOptionalNumber(input.estimated_parking_spaces),
    estimated_commercial_units: normalizeOptionalNumber(
      input.estimated_commercial_units,
    ),
    road_access: input.road_access || null,
    utilities_access: input.utilities_access || null,
    planning_permission_status: input.planning_permission_status || null,
    construction_permit_status: input.construction_permit_status || null,
    urban_study_status: input.urban_study_status || null,
    landowner_requested_percentage: normalizeOptionalNumber(
      input.landowner_requested_percentage,
    ),
    minimum_acceptable_percentage: normalizeOptionalNumber(
      input.minimum_acceptable_percentage,
    ),
    preferred_compensation_type: input.preferred_compensation_type || null,
    preferred_floor_allocation: input.preferred_floor_allocation || null,
    preferred_unit_orientation: input.preferred_unit_orientation || null,
    agreement_notes: input.agreement_notes || null,
    negotiation_status: input.negotiation_status || null,
    developer_name: input.developer_name || null,
    developer_contact: input.developer_contact || null,
    developer_offered_percentage: normalizeOptionalNumber(
      input.developer_offered_percentage,
    ),
    developer_proposed_project_size:
      input.developer_proposed_project_size || null,
    developer_proposed_delivery_timeline:
      input.developer_proposed_delivery_timeline || null,
    developer_proposed_unit_allocation:
      input.developer_proposed_unit_allocation || null,
    developer_conditions: input.developer_conditions || null,
    developer_offer_status: input.developer_offer_status || null,
    visibility: input.visibility || "internal_only",
    created_by: userId,
    assigned_agent_id: userId,
  };
}

function getMediaFiles(formData: FormData) {
  return formData.getAll("media").filter((file): file is File => {
    return file instanceof File && file.size > 0;
  });
}

function validatePropertyMediaFiles(files: File[]) {
  if (files.length > propertyMediaMaxFiles) {
    return `Upload up to ${propertyMediaMaxFiles} files at once.`;
  }

  for (const file of files) {
    const error = validatePropertyMediaFile(file);
    if (error) {
      return error;
    }
  }

  return null;
}

async function uploadPropertyMedia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  propertyId: string,
  title: string,
  files: File[],
  startIndex = 0,
) {
  for (const [index, file] of files.entries()) {
    const contentType = getPropertyMediaMimeType(file);
    if (!contentType) {
      throw new Error("Unsupported property media format.");
    }

    const storagePath = createPropertyMediaStoragePath(propertyId, file.name);
    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(storagePath);

    const { error: mediaError } = await supabase.from("property_media").insert({
      property_id: propertyId,
      bucket_id: MEDIA_BUCKET,
      storage_path: storagePath,
      public_url: data.publicUrl,
      alt_text: title,
      sort_order: startIndex + index,
    });

    if (mediaError) {
      throw mediaError;
    }
  }
}

export async function createPropertyFromFormData(formData: FormData) {
  const { supabase, user } = await requireUser();

  let payload: ReturnType<typeof getPropertyPayload>;
  try {
    payload = getPropertyPayload(formData, user.id);
  } catch (error) {
    return {
      mediaCount: 0,
      message: getActionErrorMessage(error),
      redirectPath: getSalesMessagePath(getActionErrorMessage(error)),
      success: false,
    } satisfies PropertyMutationResult;
  }

  const files = getMediaFiles(formData);
  const mediaValidationError = validatePropertyMediaFiles(files);

  if (mediaValidationError) {
    return {
      mediaCount: 0,
      message: mediaValidationError,
      redirectPath: getSalesMessagePath(mediaValidationError),
      success: false,
    } satisfies PropertyMutationResult;
  }

  let insertResult: {
    data: { id: string; title: string } | null;
    error: { message: string } | null;
  };

  try {
    const result = await supabase
      .from("properties")
      .insert(payload)
      .select("id, title")
      .single();

    insertResult = {
      data: result.data as { id: string; title: string } | null,
      error: result.error,
    };
  } catch (error) {
    return {
      mediaCount: 0,
      message: getActionErrorMessage(error),
      redirectPath: getSalesMessagePath(getActionErrorMessage(error)),
      success: false,
    } satisfies PropertyMutationResult;
  }

  const { data: property, error } = insertResult;

  if (error) {
    const message = getActionErrorMessage(error);
    return {
      mediaCount: 0,
      message,
      redirectPath: getSalesMessagePath(message),
      success: false,
    } satisfies PropertyMutationResult;
  }

  if (!property) {
    return {
      mediaCount: 0,
      message: GENERIC_PROPERTY_ERROR,
      redirectPath: getSalesMessagePath(GENERIC_PROPERTY_ERROR),
      success: false,
    } satisfies PropertyMutationResult;
  }

  try {
    await uploadPropertyMedia(supabase, property.id, property.title, files);
  } catch (error) {
    const message = getActionErrorMessage(error);
    return {
      mediaCount: 0,
      message,
      propertyId: property.id,
      propertyTitle: property.title,
      redirectPath: getEditMessagePath(property.id, message),
      success: false,
    } satisfies PropertyMutationResult;
  }

  revalidatePath("/properties");
  revalidatePath("/sales");
  return {
    mediaCount: files.length,
    propertyId: property.id,
    propertyTitle: property.title,
    redirectPath: "/sales",
    success: true,
  } satisfies PropertyMutationResult;
}

export async function createPropertyAction(formData: FormData) {
  const redirectPath = await createPropertyFromFormData(formData);

  redirect(redirectPath.redirectPath);
}

function getEditMessagePath(propertyId: string, message: string) {
  return `/properties/${propertyId}/edit?message=${encodeURIComponent(message)}`;
}

export async function updatePropertyFromFormData(
  propertyId: string,
  formData: FormData,
) {
  const { supabase, user } = await requireUser();

  let payload: ReturnType<typeof getPropertyPayload>;
  try {
    payload = getPropertyPayload(formData, user.id);
  } catch (error) {
    const message = getActionErrorMessage(error);
    return {
      mediaCount: 0,
      message,
      propertyId,
      redirectPath: getEditMessagePath(propertyId, message),
      success: false,
    } satisfies PropertyMutationResult;
  }

  const { created_by, assigned_agent_id, ...updatePayload } = payload;
  void created_by;
  void assigned_agent_id;
  const files = getMediaFiles(formData);
  const mediaValidationError = validatePropertyMediaFiles(files);

  if (mediaValidationError) {
    return {
      mediaCount: 0,
      message: mediaValidationError,
      propertyId,
      propertyTitle: payload.title,
      redirectPath: getEditMessagePath(propertyId, mediaValidationError),
      success: false,
    } satisfies PropertyMutationResult;
  }

  const { error } = await supabase.from("properties").update(updatePayload).eq("id", propertyId);

  if (error) {
    const message = getActionErrorMessage(error);
    return {
      mediaCount: 0,
      message,
      propertyId,
      propertyTitle: payload.title,
      redirectPath: getEditMessagePath(propertyId, message),
      success: false,
    } satisfies PropertyMutationResult;
  }

  const { count: mediaCount } = await supabase
    .from("property_media")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  try {
    await uploadPropertyMedia(supabase, propertyId, payload.title, files, mediaCount || 0);
  } catch (error) {
    const message = getActionErrorMessage(error);
    return {
      mediaCount: mediaCount || 0,
      message,
      propertyId,
      propertyTitle: payload.title,
      redirectPath: getEditMessagePath(propertyId, message),
      success: false,
    } satisfies PropertyMutationResult;
  }

  revalidatePath("/properties");
  revalidatePath("/sales");
  revalidatePath(`/properties/${propertyId}/edit`);
  revalidatePath(`/properties/${propertyId}`);
  return {
    mediaCount: mediaCount || 0,
    propertyId,
    propertyTitle: payload.title,
    redirectPath: "/sales",
    success: true,
  } satisfies PropertyMutationResult;
}

export async function updatePropertyAction(propertyId: string, formData: FormData) {
  const redirectPath = await updatePropertyFromFormData(propertyId, formData);

  redirect(redirectPath.redirectPath);
}

export async function deletePropertyAction(formData: FormData) {
  const propertyId = String(formData.get("property_id") || "");
  const { supabase } = await requireUser();

  if (!propertyId) {
    redirect("/sales");
  }

  const { data: media } = await supabase
    .from("property_media")
    .select("storage_path")
    .eq("property_id", propertyId);

  const { error } = await supabase.from("properties").delete().eq("id", propertyId);

  if (error) {
    redirect(`/sales?message=${encodeURIComponent(error.message)}`);
  }

  const paths = media?.map((item) => item.storage_path).filter(Boolean) || [];
  if (paths.length > 0) {
    await supabase.storage.from(MEDIA_BUCKET).remove(paths);
  }

  revalidatePath("/properties");
  revalidatePath("/sales");
  redirect("/sales");
}
