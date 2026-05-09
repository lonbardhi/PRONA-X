"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  calculateGrossBuildableArea,
  createSlug,
  formDataToPropertyInput,
  isDevelopmentLand,
  normalizeOptionalNumber,
} from "@/lib/properties";
import {
  getPropertyMediaMimeType,
  validatePropertyMediaFile,
} from "@/lib/property-media";
import {
  createClient,
  requireOperatorUser,
} from "@/lib/supabase/server";

const MEDIA_BUCKET = "property-media";

async function requireUser() {
  const { supabase, user } = await requireOperatorUser();

  return { supabase, user };
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
    visibility: input.visibility || (developmentLand ? "internal_only" : null),
    created_by: userId,
    assigned_agent_id: userId,
  };
}

function cleanFilename(name: string) {
  const fallback = "property-media";
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  return clean || fallback;
}

function getMediaFiles(formData: FormData) {
  return formData.getAll("media").filter((file): file is File => {
    return file instanceof File && file.size > 0;
  });
}

function validatePropertyMediaFiles(files: File[]) {
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

    const storagePath = `properties/${propertyId}/${crypto.randomUUID()}-${cleanFilename(file.name)}`;
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

export async function createPropertyAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const payload = getPropertyPayload(formData, user.id);
  const files = getMediaFiles(formData);
  const mediaValidationError = validatePropertyMediaFiles(files);

  if (mediaValidationError) {
    redirect(`/sales?message=${encodeURIComponent(mediaValidationError)}`);
  }

  const { data: property, error } = await supabase
    .from("properties")
    .insert(payload)
    .select("id, title")
    .single();

  if (error) {
    redirect(`/sales?message=${encodeURIComponent(error.message)}`);
  }

  try {
    await uploadPropertyMedia(supabase, property.id, property.title, files);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Media upload failed";
    redirect(`/sales?message=${encodeURIComponent(message)}`);
  }

  revalidatePath("/properties");
  revalidatePath("/sales");
  redirect("/sales");
}

export async function updatePropertyAction(propertyId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const payload = getPropertyPayload(formData, user.id);
  const { created_by, assigned_agent_id, ...updatePayload } = payload;
  void created_by;
  void assigned_agent_id;
  const files = getMediaFiles(formData);
  const mediaValidationError = validatePropertyMediaFiles(files);

  if (mediaValidationError) {
    redirect(`/properties/${propertyId}/edit?message=${encodeURIComponent(mediaValidationError)}`);
  }

  const { error } = await supabase
    .from("properties")
    .update({
      ...updatePayload,
      slug: createSlug(payload.title),
    })
    .eq("id", propertyId);

  if (error) {
    redirect(`/properties/${propertyId}/edit?message=${encodeURIComponent(error.message)}`);
  }

  const { count: mediaCount } = await supabase
    .from("property_media")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  try {
    await uploadPropertyMedia(supabase, propertyId, payload.title, files, mediaCount || 0);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Media upload failed";
    redirect(`/properties/${propertyId}/edit?message=${encodeURIComponent(message)}`);
  }

  revalidatePath("/properties");
  revalidatePath("/sales");
  revalidatePath(`/properties/${propertyId}/edit`);
  redirect("/sales");
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
