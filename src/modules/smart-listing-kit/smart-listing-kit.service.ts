import type { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  cleanDocumentStorageName,
  documentStorageBucket,
} from "@/lib/documents-contracts";

import { generateMockAiDescription } from "./smart-listing-kit.ai.ts";
import { generateListingPdfBytes, getSafePdfFileName } from "./smart-listing-kit.pdf.ts";
import { buildPublicListingMarketingPayload } from "./smart-listing-kit.public-payload.ts";
import { checkListingQuality } from "./smart-listing-kit.quality.ts";
import { generateWhatsAppMessage } from "./smart-listing-kit.whatsapp.ts";
import type {
  AiDescriptionRequest,
  ListingMarketingAsset,
  PdfGenerationRequest,
  SmartKitAssetType,
  SmartKitPropertyRecord,
} from "./smart-listing-kit.types.ts";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const smartKitPropertySelect =
  "id,title,slug,description,type,transaction_type,status,city,neighborhood,address,latitude,longitude,location_is_approximate,coordinate_source,coordinate_confidence,price_eur,price_on_request,rent_period,furnished_state,utilities_included,sublease_allowed,business_use_allowed,asset_id,bedrooms,bathrooms,area_m2,year_built,plot_size_m2,land_certificate_number,cadastral_zone,parcel_number,ownership_status,landowners_count,current_land_use,development_zone,building_coefficient,max_floors,estimated_gross_buildable_area_m2,estimated_net_sellable_area_m2,estimated_apartments,estimated_garages,estimated_parking_spaces,estimated_commercial_units,road_access,utilities_access,planning_permission_status,construction_permit_status,urban_study_status,visibility,assigned_agent_id,created_by,created_at,assigned_agent:profiles!properties_assigned_agent_id_fkey(id,full_name,email,phone,role,avatar_url,agency_name),property_media(id,public_url,alt_text,sort_order)";

const assetSelect =
  "id,listing_id,asset_type,status,language,title,content_text,content_json,file_path,file_url,template_key,created_at";

type AssetRow = ListingMarketingAsset;

function toAsset(row: AssetRow): ListingMarketingAsset {
  return {
    asset_type: row.asset_type,
    content_json: row.content_json || {},
    content_text: row.content_text,
    created_at: row.created_at,
    file_path: row.file_path,
    file_url: row.file_url,
    id: row.id,
    language: row.language,
    listing_id: row.listing_id,
    status: row.status,
    template_key: row.template_key,
    title: row.title,
  };
}

async function createAsset({
  assetType,
  contentJson = {},
  contentText = null,
  filePath = null,
  fileUrl = null,
  language = null,
  listingId,
  metadataJson = {},
  status = "generated",
  supabase,
  templateKey = null,
  title,
  userId,
}: {
  assetType: SmartKitAssetType;
  contentJson?: Record<string, unknown>;
  contentText?: string | null;
  filePath?: string | null;
  fileUrl?: string | null;
  language?: string | null;
  listingId: string;
  metadataJson?: Record<string, unknown>;
  status?: "draft" | "generated" | "saved" | "failed" | "archived";
  supabase: SupabaseClient;
  templateKey?: string | null;
  title: string;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("listing_marketing_assets")
    .insert({
      asset_type: assetType,
      bucket_id: filePath ? documentStorageBucket : null,
      content_json: contentJson,
      content_text: contentText,
      file_path: filePath,
      file_url: fileUrl,
      generated_by_user_id: userId,
      language,
      listing_id: listingId,
      metadata_json: metadataJson,
      status,
      template_key: templateKey,
      title,
    })
    .select(assetSelect)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not save Smart Listing Kit asset.");
  }

  return toAsset(data as AssetRow);
}

export async function loadSmartKitListing({
  listingId,
  supabase,
}: {
  listingId: string;
  supabase: SupabaseClient;
}) {
  const { data, error } = await supabase
    .from("properties")
    .select(smartKitPropertySelect)
    .eq("id", listingId)
    .single();

  if (error || !data) {
    throw new Error("Listing not found or access denied.");
  }

  return data as unknown as SmartKitPropertyRecord;
}

export async function listSmartKitAssets({
  listingId,
  supabase,
}: {
  listingId: string;
  supabase: SupabaseClient;
}) {
  await loadSmartKitListing({ listingId, supabase });

  const { data, error } = await supabase
    .from("listing_marketing_assets")
    .select(assetSelect)
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message || "Could not load Smart Listing Kit assets.");
  }

  return ((data || []) as AssetRow[]).map(toAsset);
}

export async function generateSmartKitDescription({
  input,
  listingId,
  locale,
  supabase,
  userId,
}: {
  input: AiDescriptionRequest;
  listingId: string;
  locale: "sq" | "en";
  supabase: SupabaseClient;
  userId: string;
}) {
  const property = await loadSmartKitListing({ listingId, supabase });
  const publicPayload = buildPublicListingMarketingPayload(property, locale);
  const generated = generateMockAiDescription(publicPayload, input);
  const asset = await createAsset({
    assetType: "ai_description",
    contentJson: generated as unknown as Record<string, unknown>,
    contentText: generated.full_description,
    language: input.language,
    listingId,
    metadataJson: {
      ai_provider: "rules_based_mvp",
      length: input.length,
      target_audience: input.targetAudience,
      tone: input.tone,
    },
    supabase,
    title: "AI Description",
    userId,
  });

  return { asset, result: generated };
}

export async function saveGeneratedDescriptionToListing({
  assetId,
  description,
  listingId,
  supabase,
  userId,
}: {
  assetId?: string;
  description: string;
  listingId: string;
  supabase: SupabaseClient;
  userId: string;
}) {
  await loadSmartKitListing({ listingId, supabase });

  const { error } = await supabase
    .from("properties")
    .update({ description })
    .eq("id", listingId);

  if (error) {
    throw new Error(error.message || "Could not save description to listing.");
  }

  if (assetId) {
    await supabase
      .from("listing_marketing_assets")
      .update({
        approved_at: new Date().toISOString(),
        approved_by_user_id: userId,
        status: "saved",
      })
      .eq("id", assetId)
      .eq("listing_id", listingId);
  }

  return { description };
}

export async function generateSmartKitWhatsApp({
  listingId,
  locale,
  supabase,
  userId,
}: {
  listingId: string;
  locale: "sq" | "en";
  supabase: SupabaseClient;
  userId: string;
}) {
  const property = await loadSmartKitListing({ listingId, supabase });
  const publicPayload = buildPublicListingMarketingPayload(property, locale);
  const result = generateWhatsAppMessage(publicPayload, locale);
  const asset = await createAsset({
    assetType: "whatsapp_message",
    contentJson: result as unknown as Record<string, unknown>,
    contentText: result.message,
    language: locale,
    listingId,
    supabase,
    title: "WhatsApp Message",
    userId,
  });

  return { asset, result };
}

export async function generateSmartKitQualityCheck({
  listingId,
  locale,
  supabase,
  userId,
}: {
  listingId: string;
  locale: "sq" | "en";
  supabase: SupabaseClient;
  userId: string;
}) {
  const property = await loadSmartKitListing({ listingId, supabase });
  const publicPayload = buildPublicListingMarketingPayload(property, locale);
  const result = checkListingQuality(publicPayload, locale);
  const asset = await createAsset({
    assetType: "quality_check",
    contentJson: result as unknown as Record<string, unknown>,
    language: locale,
    listingId,
    supabase,
    title: "Listing Quality Check",
    userId,
  });

  return { asset, result };
}

export async function generateSmartKitPdf({
  input,
  listingId,
  locale,
  supabase,
  userId,
}: {
  input: PdfGenerationRequest;
  listingId: string;
  locale: "sq" | "en";
  supabase: SupabaseClient;
  userId: string;
}) {
  const property = await loadSmartKitListing({ listingId, supabase });
  const publicPayload = buildPublicListingMarketingPayload(property, locale);
  const pdfBytes = generateListingPdfBytes(publicPayload, input, locale);
  const serviceClient = createServiceRoleClient();

  if (!serviceClient) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to store generated PDFs.");
  }

  const fileName = cleanDocumentStorageName(getSafePdfFileName(publicPayload.id));
  const filePath = `listing-marketing-assets/${listingId}/${crypto.randomUUID()}-${fileName}`;
  const { error: uploadError } = await serviceClient.storage
    .from(documentStorageBucket)
    .upload(filePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Could not store generated PDF.");
  }

  const { data: signedUrlData } = await serviceClient.storage
    .from(documentStorageBucket)
    .createSignedUrl(filePath, 60 * 10);

  const asset = await createAsset({
    assetType: "pdf",
    contentJson: {
      file_name: fileName,
      include_agent_contact: input.includeAgentContact,
      include_price: input.includePrice,
      include_qr_code: input.includeQrCode,
      size_bytes: pdfBytes.byteLength,
    },
    filePath,
    fileUrl: signedUrlData?.signedUrl || null,
    language: locale,
    listingId,
    metadataJson: { template_key: input.templateKey },
    supabase,
    templateKey: input.templateKey,
    title: fileName,
    userId,
  });

  return {
    asset,
    fileName,
    fileUrl: signedUrlData?.signedUrl || null,
    sizeBytes: pdfBytes.byteLength,
  };
}
