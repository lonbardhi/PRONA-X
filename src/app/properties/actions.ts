"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createSlug,
  formDataToPropertyInput,
  normalizeOptionalNumber,
} from "@/lib/properties";
import {
  getPropertyMediaMimeType,
  validatePropertyMediaFile,
} from "@/lib/property-media";
import { createClient } from "@/lib/supabase/server";

const MEDIA_BUCKET = "property-media";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

function getPropertyPayload(formData: FormData, userId: string) {
  const input = formDataToPropertyInput(formData);

  return {
    title: input.title,
    slug: createSlug(input.title),
    description: input.description || null,
    type: input.type,
    status: input.status,
    city: input.city,
    neighborhood: input.neighborhood || null,
    address: input.address || null,
    price_eur: input.price_eur,
    bedrooms: normalizeOptionalNumber(input.bedrooms),
    bathrooms: normalizeOptionalNumber(input.bathrooms),
    area_m2: normalizeOptionalNumber(input.area_m2),
    year_built: normalizeOptionalNumber(input.year_built),
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
    redirect(`/properties?message=${encodeURIComponent(mediaValidationError)}`);
  }

  const { data: property, error } = await supabase
    .from("properties")
    .insert(payload)
    .select("id, title")
    .single();

  if (error) {
    redirect(`/properties?message=${encodeURIComponent(error.message)}`);
  }

  try {
    await uploadPropertyMedia(supabase, property.id, property.title, files);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Media upload failed";
    redirect(`/properties?message=${encodeURIComponent(message)}`);
  }

  revalidatePath("/properties");
  redirect("/properties");
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
  revalidatePath(`/properties/${propertyId}/edit`);
  redirect("/properties");
}

export async function deletePropertyAction(formData: FormData) {
  const propertyId = String(formData.get("property_id") || "");
  const { supabase } = await requireUser();

  if (!propertyId) {
    redirect("/properties");
  }

  const { data: media } = await supabase
    .from("property_media")
    .select("storage_path")
    .eq("property_id", propertyId);

  const { error } = await supabase.from("properties").delete().eq("id", propertyId);

  if (error) {
    redirect(`/properties?message=${encodeURIComponent(error.message)}`);
  }

  const paths = media?.map((item) => item.storage_path).filter(Boolean) || [];
  if (paths.length > 0) {
    await supabase.storage.from(MEDIA_BUCKET).remove(paths);
  }

  revalidatePath("/properties");
  redirect("/properties");
}
