"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  calculateGrossBuildableArea,
  createSlug,
  formDataToPropertyInput,
  getOppositeListingTransactionType,
  getPropertyModulePath,
  isDevelopmentLand,
  isRentalTransaction,
  isSameTransactionWorkflow,
  normalizeOptionalNumber,
  type PropertyRecord,
  type PropertyTransactionType,
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

const linkedListingSelect = [
  "id",
  "title",
  "description",
  "type",
  "transaction_type",
  "status",
  "city",
  "neighborhood",
  "address",
  "price_eur",
  "price_on_request",
  "rent_period",
  "available_from",
  "deposit_eur",
  "minimum_lease_months",
  "maximum_lease_months",
  "furnished_state",
  "utilities_included",
  "sublease_allowed",
  "business_use_allowed",
  "asset_id",
  "linked_sale_property_id",
  "linked_rental_property_id",
  "bedrooms",
  "bathrooms",
  "area_m2",
  "year_built",
  "plot_size_m2",
  "land_certificate_number",
  "cadastral_zone",
  "parcel_number",
  "ownership_status",
  "landowners_count",
  "current_land_use",
  "development_zone",
  "building_coefficient",
  "max_floors",
  "estimated_gross_buildable_area_m2",
  "estimated_net_sellable_area_m2",
  "estimated_apartments",
  "estimated_garages",
  "estimated_parking_spaces",
  "estimated_commercial_units",
  "road_access",
  "utilities_access",
  "planning_permission_status",
  "construction_permit_status",
  "urban_study_status",
  "visibility",
].join(",");

type LinkedListingSource = Pick<
  PropertyRecord,
  | "id"
  | "title"
  | "description"
  | "type"
  | "transaction_type"
  | "city"
  | "neighborhood"
  | "address"
  | "rent_period"
  | "furnished_state"
  | "business_use_allowed"
  | "asset_id"
  | "linked_sale_property_id"
  | "linked_rental_property_id"
  | "bedrooms"
  | "bathrooms"
  | "area_m2"
  | "year_built"
  | "plot_size_m2"
  | "land_certificate_number"
  | "cadastral_zone"
  | "parcel_number"
  | "ownership_status"
  | "landowners_count"
  | "current_land_use"
  | "development_zone"
  | "building_coefficient"
  | "max_floors"
  | "estimated_gross_buildable_area_m2"
  | "estimated_net_sellable_area_m2"
  | "estimated_apartments"
  | "estimated_garages"
  | "estimated_parking_spaces"
  | "estimated_commercial_units"
  | "road_access"
  | "utilities_access"
  | "planning_permission_status"
  | "construction_permit_status"
  | "urban_study_status"
  | "visibility"
>;

type LinkableAssetSelection = {
  assetId: string;
  id: string;
  transactionType: PropertyTransactionType;
};

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
    return "Dukshmëria e pronës mungonte. Formulari tani e vendos automatikisht si të brendshme.";
  }

  if (message.toLowerCase().includes("row-level security")) {
    return "Nuk ke leje për këtë veprim. Kontakto administratorin nëse duhet akses shtesë.";
  }

  if (message.toLowerCase().includes("duplicate")) {
    return "Ky regjistrim duket se ekziston tashme. Kontrollo listen dhe provo perseri.";
  }

  return message || GENERIC_PROPERTY_ERROR;
}

function getValidationMessage(message?: string) {
  const validationMessages: Record<string, string> = {
    "Assigned agent is invalid": "Zgjidh njÃ« agjent pÃ«rgjegjÃ«s tÃ« vlefshÃ«m.",
    "City is required": "Shkruaj qytetin e pronës.",
    "Landowner requested percentage is required":
      "Shkruaj perqindjen e kerkuar nga pronari.",
    "Minimum acceptable percentage cannot be higher than requested percentage":
      "Përqindja minimale nuk mund të jetë më e lartë se kërkesa e pronarit.",
    "Plot size is required for Development Land":
      "Shkruaj siperfaqen e parceles per Token e Zhvillimit.",
    "Rent amount is required for rental listings":
      "Shkruaj qiranë ose aktivizo opsionin Qiraja sipas kërkesës.",
    "Rent period is required for rental listings":
      "Zgjidh periudhën e qirasë.",
    "Rental status is not valid for this listing":
      "Ky status i përket qirave dhe nuk vlen për këtë listim.",
    "Sale price is required for sale listings":
      "Shkruaj çmimin e shitjes ose aktivizo opsionin Çmimi sipas kërkesës.",
    "Sale status is not valid for this listing":
      "Ky status i përket shitjeve dhe nuk vlen për këtë listim.",
    "Maximum lease duration cannot be lower than minimum lease duration":
      "Kohëzgjatja maksimale e qirasë nuk mund të jetë më e ulët se minimumi.",
    "Title is required": "Shkruaj titullin e pronës.",
  };

  return message ? validationMessages[message] || message : GENERIC_PROPERTY_ERROR;
}

function getSalesMessagePath(message: string) {
  return `/sales?message=${encodeURIComponent(message)}`;
}

async function resolveAssignedAgentId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  requestedAgentId: string | undefined,
  fallbackUserId: string,
) {
  const assignedAgentId = requestedAgentId || fallbackUserId;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,role")
    .eq("id", assignedAgentId)
    .in("role", ["admin", "manager", "agent"])
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Assigned agent is invalid");
  }

  return assignedAgentId;
}

function getModuleMessagePath(transactionType: "sale" | "rent" | "rent_to_own", message: string) {
  return `${getPropertyModulePath(transactionType)}?message=${encodeURIComponent(message)}`;
}

function getSafeTransactionType(value: FormDataEntryValue | null): PropertyTransactionType | null {
  if (value === "sale" || value === "rent" || value === "rent_to_own") {
    return value;
  }

  return null;
}

function getLinkedListingTitle(title: string, transactionType: PropertyTransactionType) {
  const suffix = isRentalTransaction(transactionType) ? "Qira" : "Shitje";

  return `${title} - ${suffix}`;
}

async function resolveLinkableAssetSelection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  transactionType: PropertyTransactionType,
): Promise<LinkableAssetSelection | null> {
  const selectedPropertyId = String(formData.get("link_asset_property_id") || "");

  if (!selectedPropertyId) {
    return null;
  }

  const { data, error } = await supabase
    .from("properties")
    .select(
      "id,asset_id,transaction_type,linked_sale_property_id,linked_rental_property_id",
    )
    .eq("id", selectedPropertyId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Aseti ekzistues nuk u gjet.");
  }

  const selectedTransactionType =
    getSafeTransactionType(data.transaction_type) || "sale";

  if (isSameTransactionWorkflow(selectedTransactionType, transactionType)) {
    throw new Error(
      "Ky aset duket se ka tashmÃ« listim nÃ« tÃ« njÃ«jtin proces. Hape listimin ekzistues nÃ« vend qÃ« ta dublosh.",
    );
  }

  const selectedAssetId = data.asset_id || data.id;
  const directExistingTarget = isRentalTransaction(transactionType)
    ? data.linked_rental_property_id
    : data.linked_sale_property_id;

  if (directExistingTarget) {
    throw new Error(
      "Ky aset ka tashmÃ« listimin e lidhur pÃ«r kÃ«tÃ« proces. Hape listimin ekzistues.",
    );
  }

  let existingTargetQuery = supabase
    .from("properties")
    .select("id")
    .eq("asset_id", selectedAssetId)
    .neq("id", selectedPropertyId)
    .limit(1);

  existingTargetQuery = isRentalTransaction(transactionType)
    ? existingTargetQuery.in("transaction_type", ["rent", "rent_to_own"])
    : existingTargetQuery.eq("transaction_type", "sale");

  const { data: existingTargets, error: existingTargetError } =
    await existingTargetQuery;

  if (existingTargetError) {
    throw new Error(existingTargetError.message);
  }

  if ((existingTargets || []).length > 0) {
    throw new Error(
      "Ky aset ka tashmÃ« njÃ« listim tÃ« lidhur pÃ«r kÃ«tÃ« proces. Hape listimin ekzistues.",
    );
  }

  return {
    assetId: selectedAssetId,
    id: data.id,
    transactionType: selectedTransactionType,
  };
}

function getSharedAssetPayload(
  payload: Awaited<ReturnType<typeof getPropertyPayload>>,
) {
  return {
    address: payload.address,
    area_m2: payload.area_m2,
    bathrooms: payload.bathrooms,
    bedrooms: payload.bedrooms,
    building_coefficient: payload.building_coefficient,
    cadastral_zone: payload.cadastral_zone,
    city: payload.city,
    construction_permit_status: payload.construction_permit_status,
    current_land_use: payload.current_land_use,
    development_zone: payload.development_zone,
    estimated_apartments: payload.estimated_apartments,
    estimated_garages: payload.estimated_garages,
    estimated_gross_buildable_area_m2: payload.estimated_gross_buildable_area_m2,
    estimated_net_sellable_area_m2: payload.estimated_net_sellable_area_m2,
    estimated_commercial_units: payload.estimated_commercial_units,
    estimated_parking_spaces: payload.estimated_parking_spaces,
    land_certificate_number: payload.land_certificate_number,
    landowners_count: payload.landowners_count,
    max_floors: payload.max_floors,
    neighborhood: payload.neighborhood,
    ownership_status: payload.ownership_status,
    parcel_number: payload.parcel_number,
    planning_permission_status: payload.planning_permission_status,
    plot_size_m2: payload.plot_size_m2,
    road_access: payload.road_access,
    type: payload.type,
    urban_study_status: payload.urban_study_status,
    utilities_access: payload.utilities_access,
    year_built: payload.year_built,
  };
}

async function getPropertyPayload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  userId: string,
) {
  const input = formDataToPropertyInput(formData);
  const developmentLand =
    isDevelopmentLand(input.type) && input.transaction_type === "sale";
  const estimatedGrossBuildableArea =
    normalizeOptionalNumber(input.estimated_gross_buildable_area_m2) ??
    calculateGrossBuildableArea(input.plot_size_m2, input.building_coefficient);

  return {
    title: input.title,
    slug: createSlug(input.title),
    description: input.description || null,
    type: input.type,
    transaction_type: input.transaction_type,
    status: input.status,
    city: input.city,
    neighborhood: input.neighborhood || null,
    address: input.address || null,
    price_eur: developmentLand ? null : normalizeOptionalNumber(input.price_eur),
    price_on_request: input.price_on_request,
    rent_period: input.rent_period || "monthly",
    available_from: input.available_from || null,
    deposit_eur: normalizeOptionalNumber(input.deposit_eur),
    minimum_lease_months: normalizeOptionalNumber(input.minimum_lease_months),
    maximum_lease_months: normalizeOptionalNumber(input.maximum_lease_months),
    furnished_state: input.furnished_state || null,
    utilities_included: input.utilities_included,
    sublease_allowed: input.sublease_allowed,
    business_use_allowed: input.business_use_allowed,
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
    assigned_agent_id: await resolveAssignedAgentId(
      supabase,
      input.assigned_agent_id,
      userId,
    ),
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

  let payload: Awaited<ReturnType<typeof getPropertyPayload>>;
  try {
    payload = await getPropertyPayload(supabase, formData, user.id);
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
      redirectPath: getModuleMessagePath(payload.transaction_type, mediaValidationError),
      success: false,
    } satisfies PropertyMutationResult;
  }

  let linkedAssetSelection: LinkableAssetSelection | null = null;
  try {
    linkedAssetSelection = await resolveLinkableAssetSelection(
      supabase,
      formData,
      payload.transaction_type,
    );
  } catch (error) {
    const message = getActionErrorMessage(error);
    return {
      mediaCount: 0,
      message,
      redirectPath: getModuleMessagePath(payload.transaction_type, message),
      success: false,
    } satisfies PropertyMutationResult;
  }

  const insertPayload = linkedAssetSelection
    ? {
        ...payload,
        asset_id: linkedAssetSelection.assetId,
        linked_rental_property_id: isRentalTransaction(payload.transaction_type)
          ? null
          : linkedAssetSelection.id,
        linked_sale_property_id: isRentalTransaction(payload.transaction_type)
          ? linkedAssetSelection.id
          : null,
      }
    : payload;

  let insertResult: {
    data: { id: string; title: string } | null;
    error: { message: string } | null;
  };

  try {
    const result = await supabase
      .from("properties")
      .insert(insertPayload)
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
      redirectPath: getModuleMessagePath(
        payload.transaction_type,
        getActionErrorMessage(error),
      ),
      success: false,
    } satisfies PropertyMutationResult;
  }

  const { data: property, error } = insertResult;

  if (error) {
    const message = getActionErrorMessage(error);
    return {
      mediaCount: 0,
      message,
      redirectPath: getModuleMessagePath(payload.transaction_type, message),
      success: false,
    } satisfies PropertyMutationResult;
  }

  if (!property) {
    return {
      mediaCount: 0,
      message: GENERIC_PROPERTY_ERROR,
      redirectPath: getModuleMessagePath(payload.transaction_type, GENERIC_PROPERTY_ERROR),
      success: false,
    } satisfies PropertyMutationResult;
  }

  if (linkedAssetSelection) {
    const linkedUpdate = isRentalTransaction(payload.transaction_type)
      ? {
          asset_id: linkedAssetSelection.assetId,
          linked_rental_property_id: property.id,
        }
      : {
          asset_id: linkedAssetSelection.assetId,
          linked_sale_property_id: property.id,
        };

    const { error: linkUpdateError } = await supabase
      .from("properties")
      .update(linkedUpdate)
      .eq("id", linkedAssetSelection.id);

    if (linkUpdateError) {
      const message = getActionErrorMessage(linkUpdateError);
      return {
        mediaCount: 0,
        message,
        propertyId: property.id,
        propertyTitle: property.title,
        redirectPath: getEditMessagePath(property.id, message),
        success: false,
      } satisfies PropertyMutationResult;
    }
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
  revalidatePath("/rentals");
  if (linkedAssetSelection) {
    revalidatePath(`/properties/${linkedAssetSelection.id}/edit`);
  }
  const modulePath = getPropertyModulePath(payload.transaction_type);
  return {
    mediaCount: files.length,
    propertyId: property.id,
    propertyTitle: property.title,
    redirectPath: modulePath,
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

  let payload: Awaited<ReturnType<typeof getPropertyPayload>>;
  try {
    payload = await getPropertyPayload(supabase, formData, user.id);
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

  const { created_by, ...updatePayload } = payload;
  void created_by;

  const { data: existingProperty, error: existingError } = await supabase
    .from("properties")
    .select("transaction_type,asset_id")
    .eq("id", propertyId)
    .single();

  if (existingError || !existingProperty) {
    const message = getActionErrorMessage(existingError || new Error("Prona nuk u gjet."));
    return {
      mediaCount: 0,
      message,
      propertyId,
      propertyTitle: payload.title,
      redirectPath: getEditMessagePath(propertyId, message),
      success: false,
    } satisfies PropertyMutationResult;
  }

  if (existingProperty.transaction_type !== payload.transaction_type) {
    const message =
      "Lloji i transaksionit nuk mund të ndryshohet në heshtje. Krijo një listim të lidhur për shitje ose qira.";
    return {
      mediaCount: 0,
      message,
      propertyId,
      propertyTitle: payload.title,
      redirectPath: getEditMessagePath(propertyId, message),
      success: false,
    } satisfies PropertyMutationResult;
  }

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

  if (existingProperty.asset_id) {
    await supabase
      .from("properties")
      .update(getSharedAssetPayload(payload))
      .eq("asset_id", existingProperty.asset_id)
      .neq("id", propertyId);
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
  revalidatePath("/rentals");
  revalidatePath(`/properties/${propertyId}/edit`);
  revalidatePath(`/properties/${propertyId}`);
  const modulePath = getPropertyModulePath(payload.transaction_type);
  return {
    mediaCount: mediaCount || 0,
    propertyId,
    propertyTitle: payload.title,
    redirectPath: modulePath,
    success: true,
  } satisfies PropertyMutationResult;
}

export async function updatePropertyAction(propertyId: string, formData: FormData) {
  const redirectPath = await updatePropertyFromFormData(propertyId, formData);

  redirect(redirectPath.redirectPath);
}

export async function createLinkedListingAction(formData: FormData) {
  const sourcePropertyId = String(formData.get("property_id") || "");
  const requestedTarget = getSafeTransactionType(formData.get("target_transaction_type"));
  const { supabase, user } = await requireUser();

  if (!sourcePropertyId || !requestedTarget) {
    redirect(
      `/sales?message=${encodeURIComponent(
        "Kërkesa për listim të lidhur nuk ishte e plotë.",
      )}`,
    );
  }

  const { data: sourceData, error: sourceError } = await supabase
    .from("properties")
    .select(linkedListingSelect)
    .eq("id", sourcePropertyId)
    .single();
  const source = sourceData as unknown as LinkedListingSource | null;

  if (sourceError || !source) {
    redirect(`/sales?message=${encodeURIComponent(sourceError?.message || "Listimi nuk u gjet.")}`);
  }

  const sourceTransaction = getSafeTransactionType(source.transaction_type) || "sale";
  const expectedTarget = getOppositeListingTransactionType(sourceTransaction);
  const targetTransactionType = requestedTarget === expectedTarget ? requestedTarget : expectedTarget;
  const existingLinkedId = isRentalTransaction(targetTransactionType)
    ? source.linked_rental_property_id
    : source.linked_sale_property_id;

  if (existingLinkedId) {
    redirect(`/properties/${existingLinkedId}/edit`);
  }

  const linkedTitle = getLinkedListingTitle(source.title, targetTransactionType);
  const sharedAssetId = source.asset_id || source.id;
  const insertPayload = {
    title: linkedTitle,
    slug: createSlug(linkedTitle),
    description: source.description,
    type: source.type,
    transaction_type: targetTransactionType,
    status: "draft",
    city: source.city,
    neighborhood: source.neighborhood,
    address: source.address,
    price_eur: null,
    price_on_request: true,
    rent_period: isRentalTransaction(targetTransactionType) ? "monthly" : source.rent_period || "monthly",
    available_from: null,
    deposit_eur: null,
    minimum_lease_months: null,
    maximum_lease_months: null,
    furnished_state: source.furnished_state,
    utilities_included: false,
    sublease_allowed: false,
    business_use_allowed: source.business_use_allowed,
    asset_id: sharedAssetId,
    linked_sale_property_id: targetTransactionType === "sale" ? null : source.id,
    linked_rental_property_id: isRentalTransaction(targetTransactionType) ? null : source.id,
    bedrooms: source.bedrooms,
    bathrooms: source.bathrooms,
    area_m2: source.area_m2,
    year_built: source.year_built,
    plot_size_m2: source.plot_size_m2,
    land_certificate_number: source.land_certificate_number,
    cadastral_zone: source.cadastral_zone,
    parcel_number: source.parcel_number,
    ownership_status: source.ownership_status,
    landowners_count: source.landowners_count,
    current_land_use: source.current_land_use,
    development_zone: source.development_zone,
    building_coefficient: source.building_coefficient,
    max_floors: source.max_floors,
    estimated_gross_buildable_area_m2: source.estimated_gross_buildable_area_m2,
    estimated_net_sellable_area_m2: source.estimated_net_sellable_area_m2,
    estimated_apartments: source.estimated_apartments,
    estimated_garages: source.estimated_garages,
    estimated_parking_spaces: source.estimated_parking_spaces,
    estimated_commercial_units: source.estimated_commercial_units,
    road_access: source.road_access,
    utilities_access: source.utilities_access,
    planning_permission_status: source.planning_permission_status,
    construction_permit_status: source.construction_permit_status,
    urban_study_status: source.urban_study_status,
    visibility: source.visibility || "internal_only",
    created_by: user.id,
    assigned_agent_id: user.id,
  };

  const { data: linkedData, error: insertError } = await supabase
    .from("properties")
    .insert(insertPayload)
    .select("id")
    .single();
  const linked = linkedData as unknown as { id: string } | null;

  if (insertError || !linked) {
    const modulePath = getPropertyModulePath(sourceTransaction);
    redirect(
      `${modulePath}?message=${encodeURIComponent(
        getActionErrorMessage(insertError || new Error("Listimi i lidhur nuk u krijua.")),
      )}`,
    );
  }

  const sourceUpdate = isRentalTransaction(targetTransactionType)
    ? { asset_id: sharedAssetId, linked_rental_property_id: linked.id }
    : { asset_id: sharedAssetId, linked_sale_property_id: linked.id };
  const linkedUpdate = isRentalTransaction(targetTransactionType)
    ? { linked_sale_property_id: source.id }
    : { linked_rental_property_id: source.id };

  await Promise.all([
    supabase.from("properties").update(sourceUpdate).eq("id", source.id),
    supabase.from("properties").update(linkedUpdate).eq("id", linked.id),
  ]);

  revalidatePath("/properties");
  revalidatePath("/sales");
  revalidatePath("/rentals");
  revalidatePath(`/properties/${source.id}/edit`);
  redirect(`/properties/${linked.id}/edit`);
}

export async function deletePropertyAction(formData: FormData) {
  const propertyId = String(formData.get("property_id") || "");
  const { supabase } = await requireUser();

  if (!propertyId) {
    redirect("/sales");
  }

  const { data: property } = await supabase
    .from("properties")
    .select("transaction_type")
    .eq("id", propertyId)
    .single();
  const modulePath = getPropertyModulePath(
    property?.transaction_type === "rent" ||
      property?.transaction_type === "rent_to_own"
      ? property.transaction_type
      : "sale",
  );

  const { data: media } = await supabase
    .from("property_media")
    .select("storage_path")
    .eq("property_id", propertyId);

  const { error } = await supabase.from("properties").delete().eq("id", propertyId);

  if (error) {
    redirect(`${modulePath}?message=${encodeURIComponent(error.message)}`);
  }

  const paths = media?.map((item) => item.storage_path).filter(Boolean) || [];
  if (paths.length > 0) {
    await supabase.storage.from(MEDIA_BUCKET).remove(paths);
  }

  revalidatePath("/properties");
  revalidatePath("/sales");
  revalidatePath("/rentals");
  redirect(modulePath);
}
