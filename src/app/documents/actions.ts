"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  checksumFileSha256,
  cleanDocumentStorageName,
  contractSchema,
  createContractNumber,
  documentMetadataSchema,
  documentStorageBucket,
  formatContractType,
  getDocumentMimeType,
  getFileExtension,
  isExcelDocument,
  offerSchema,
  sanitizeDocumentText,
  validateDocumentFile,
} from "@/lib/documents-contracts";
import {
  createClient,
  requireApprovedUser,
  type AppRole,
} from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import type { Locale } from "@/lib/i18n";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const zeroUuid = "00000000-0000-0000-0000-000000000000";

const actionMessages = {
  sq: {
    approvedDocumentNeedsVersion: "Dokumentet e aprovuara kërkojnë version të ri për rishikim.",
    canOnlySendDraftLegal: "Vetëm projekt-kontratat dërgohen për rishikim ligjor.",
    contractBeforeComplete: "Kontrata duhet të jetë e firmosur para përfundimit.",
    contractCreated: "Kontrata u krijua.",
    contractMissingSignedFile: "Zgjidh kontratën dhe PDF-në e firmosur.",
    contractNotFound: "Kontrata nuk u gjet.",
    contractRequiresLegal: "Kontrata kërkon rishikim ligjor para aprovimit menaxherial.",
    contractSignedUploaded: "Kontrata e firmosur u ngarkua.",
    contractUpdated: "Kontrata u përditësua.",
    documentCreatedFailed: "Dokumenti nuk u krijua.",
    documentMissingStatus: "Mungon dokumenti ose statusi.",
    documentNotFound: "Dokumenti nuk u gjet.",
    documentStatusUpdated: "Statusi i dokumentit u përditësua.",
    duplicate: "Ky regjistrim duket se ekziston tashmë.",
    excelMustBeExcel: "Oferta Excel duhet të jetë XLS ose XLSX.",
    fieldsInvalid: "Kontrollo fushat e formularit.",
    genericFailure: "Veprimi dështoi. Provo përsëri.",
    noCreateContractPermission: "Nuk ke leje për të krijuar kontrata.",
    noCreateOfferPermission: "Nuk ke leje për të krijuar oferta.",
    noNewVersionPermission: "Nuk ke leje për version të ri.",
    noPermission: "Nuk ke leje për këtë veprim.",
    noUploadContractPermission: "Nuk ke leje për të ngarkuar kontratë të firmosur.",
    noUploadPermission: "Nuk ke leje për të ngarkuar dokumente.",
    offerCreated: "Oferta u krijua.",
    offerMustBeApprovedBeforeSending: "Oferta duhet të aprovohet para dërgimit.",
    offerMustBeSentBeforeAccepted: "Oferta duhet të jetë dërguar para pranimit.",
    offerNotFound: "Oferta nuk u gjet.",
    offerStatusUpdated: "Statusi i ofertës u përditësua.",
    ownContractApproval: "Nuk mund të aprovosh kontratën tënde.",
    ownDocumentApproval: "Nuk mund të aprovosh dokumentin tënd.",
    ownOfferApproval: "Nuk mund të aprovosh ofertën tënde.",
    propertyArchived: "Prona nuk u gjet ose është arkivuar.",
    soldPropertyContract: "Nuk mund të krijosh kontratë shitblerjeje për pronë të shitur.",
    uploadDocumentSuccess: "Dokumenti u ngarkua me sukses.",
    versionCreated: "Versioni i ri u krijua.",
    versionMissingFile: "Zgjidh dokumentin dhe skedarin e ri.",
    versionSaveFailed: "Versioni i dokumentit nuk u ruajt.",
    needManagerForContract: "Vetëm Manager/Admin mund të aprovojë kontratën.",
    needManagerForDocument: "Vetëm Manager/Admin mund të aprovojë ose refuzojë dokumente.",
    needManagerForOffer: "Vetëm Manager/Admin mund të aprovojë ofertat.",
    needManagerForComplete: "Vetëm Manager/Admin mund të përfundojë kontratën.",
    needLegalForReview: "Vetëm Legal/Manager/Admin mund të aprovojë rishikimin ligjor.",
    selectDocumentFiles: "Zgjidh të paktën një dokument.",
  },
  en: {
    approvedDocumentNeedsVersion: "Approved documents require a reviewed new version.",
    canOnlySendDraftLegal: "Only draft contracts can be sent for legal review.",
    contractBeforeComplete: "The contract must be signed before completion.",
    contractCreated: "Contract created.",
    contractMissingSignedFile: "Choose the contract and signed PDF.",
    contractNotFound: "Contract not found.",
    contractRequiresLegal: "The contract requires legal review before manager approval.",
    contractSignedUploaded: "Signed contract uploaded.",
    contractUpdated: "Contract updated.",
    documentCreatedFailed: "The document could not be created.",
    documentMissingStatus: "Document or status is missing.",
    documentNotFound: "Document not found.",
    documentStatusUpdated: "Document status updated.",
    duplicate: "This record appears to already exist.",
    excelMustBeExcel: "The offer Excel file must be XLS or XLSX.",
    fieldsInvalid: "Check the form fields.",
    genericFailure: "The action failed. Try again.",
    noCreateContractPermission: "You do not have permission to create contracts.",
    noCreateOfferPermission: "You do not have permission to create offers.",
    noNewVersionPermission: "You do not have permission to create a new version.",
    noPermission: "You do not have permission for this action.",
    noUploadContractPermission: "You do not have permission to upload a signed contract.",
    noUploadPermission: "You do not have permission to upload documents.",
    offerCreated: "Offer created.",
    offerMustBeApprovedBeforeSending: "The offer must be approved before sending.",
    offerMustBeSentBeforeAccepted: "The offer must be sent before acceptance.",
    offerNotFound: "Offer not found.",
    offerStatusUpdated: "Offer status updated.",
    ownContractApproval: "You cannot approve your own contract.",
    ownDocumentApproval: "You cannot approve your own document.",
    ownOfferApproval: "You cannot approve your own offer.",
    propertyArchived: "Property was not found or is archived.",
    soldPropertyContract: "You cannot create a buying contract for a sold property.",
    uploadDocumentSuccess: "Document uploaded successfully.",
    versionCreated: "New version created.",
    versionMissingFile: "Choose the document and new file.",
    versionSaveFailed: "Document version was not saved.",
    needManagerForContract: "Only Manager/Admin can approve the contract.",
    needManagerForDocument: "Only Manager/Admin can approve or reject documents.",
    needManagerForOffer: "Only Manager/Admin can approve offers.",
    needManagerForComplete: "Only Manager/Admin can complete the contract.",
    needLegalForReview: "Only Legal/Manager/Admin can approve legal review.",
    selectDocumentFiles: "Choose at least one document.",
  },
} satisfies Record<Locale, Record<string, string>>;

const validationMessageMap: Record<string, Record<Locale, string>> = {
  "Afati i ofertes nuk mund te jete ne te kaluaren.": {
    sq: "Afati i ofertës nuk mund të jetë në të kaluarën.",
    en: "The offer validity date cannot be in the past.",
  },
  "Lidhe dokumentin me prone, pronar, lead, oferte ose kontrate.": {
    sq: "Lidhe dokumentin me pronë, pronar, lead, ofertë ose kontratë.",
    en: "Link the document to a property, owner, lead, offer, or contract.",
  },
  "Lloji i dokumentit eshte i detyrueshem.": {
    sq: "Lloji i dokumentit është i detyrueshëm.",
    en: "Document type is required.",
  },
  "Lloji i dokumentit eshte i detyrueshem per kete kategori.": {
    sq: "Lloji i dokumentit është i detyrueshëm për këtë kategori.",
    en: "Document type is required for this category.",
  },
  "Pala e dyte eshte e detyrueshme.": {
    sq: "Pala e dytë është e detyrueshme.",
    en: "The second party is required.",
  },
  "Pala e pare eshte e detyrueshme.": {
    sq: "Pala e parë është e detyrueshme.",
    en: "The first party is required.",
  },
  "Perqindja e pronarit dhe investitorit duhet te bejne 100%.": {
    sq: "Përqindja e pronarit dhe investitorit duhet të bëjnë 100%.",
    en: "Owner and investor percentages must total 100%.",
  },
  "Prona eshte e detyrueshme per kete kontrate.": {
    sq: "Prona është e detyrueshme për këtë kontratë.",
    en: "Property is required for this contract.",
  },
  "Shuma duhet te jete me e madhe se zero.": {
    sq: "Shuma duhet të jetë më e madhe se zero.",
    en: "Amount must be greater than zero.",
  },
  "Titulli eshte i detyrueshem.": {
    sq: "Titulli është i detyrueshëm.",
    en: "Title is required.",
  },
  "Titulli i kontrates eshte i detyrueshem.": {
    sq: "Titulli i kontratës është i detyrueshëm.",
    en: "Contract title is required.",
  },
  "Titulli i ofertes eshte i detyrueshem.": {
    sq: "Titulli i ofertës është i detyrueshëm.",
    en: "Offer title is required.",
  },
  "Zgjidh pronen.": {
    sq: "Zgjidh pronën.",
    en: "Choose a property.",
  },
};

function actionMessage(locale: Locale, key: keyof (typeof actionMessages)["sq"]) {
  return actionMessages[locale][key];
}

function localizedValidationMessage(message: string, locale: Locale) {
  return validationMessageMap[message]?.[locale] || message;
}

function redirectWithMessage(returnTo: string, message: string): never {
  const separator = returnTo.includes("?") ? "&" : "?";
  redirect(`${returnTo}${separator}message=${encodeURIComponent(message)}`);
}

function getActionErrorMessage(error: unknown, locale: Locale) {
  if (error instanceof z.ZodError) {
    const message = error.issues[0]?.message;
    return message ? localizedValidationMessage(message, locale) : actionMessage(locale, "fieldsInvalid");
  }

  if (error instanceof Error) {
    if (error.message.toLowerCase().includes("row-level security")) {
      return actionMessage(locale, "noPermission");
    }

    if (error.message.toLowerCase().includes("duplicate")) {
      return actionMessage(locale, "duplicate");
    }

    const localized = localizedValidationMessage(error.message, locale);
    if (localized !== error.message || Object.values(actionMessages[locale]).includes(error.message)) {
      return localized;
    }

    return actionMessage(locale, "genericFailure");
  }

  return actionMessage(locale, "genericFailure");
}

function getSafeReturnTo(formData: FormData, fallback = "/documents") {
  const value = String(formData.get("return_to") || fallback);

  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

function hasWriteRole(role: AppRole) {
  return ["admin", "manager", "agent", "legal", "finance"].includes(role);
}

function hasManagerRole(role: AppRole) {
  return role === "admin" || role === "manager";
}

function hasLegalRole(role: AppRole) {
  return role === "admin" || role === "manager" || role === "legal";
}

function getFiles(formData: FormData, name = "files") {
  return formData.getAll(name).filter((file): file is File => {
    return file instanceof File && file.size > 0;
  });
}

async function logDocumentActivity(
  supabase: SupabaseClient,
  documentId: string,
  userId: string,
  action: string,
  values: Record<string, unknown> = {},
) {
  await supabase.from("document_activity").insert({
    action,
    document_id: documentId,
    new_value_json: Object.keys(values).length ? values : null,
    user_id: userId,
  });
}

async function logOfferActivity(
  supabase: SupabaseClient,
  offerId: string,
  userId: string,
  action: string,
  values: Record<string, unknown> = {},
) {
  await supabase.from("offer_activity").insert({
    action,
    offer_id: offerId,
    new_value_json: Object.keys(values).length ? values : null,
    user_id: userId,
  });
}

async function logContractActivity(
  supabase: SupabaseClient,
  contractId: string,
  userId: string,
  action: string,
  values: Record<string, unknown> = {},
) {
  await supabase.from("contract_activity").insert({
    action,
    contract_id: contractId,
    new_value_json: Object.keys(values).length ? values : null,
    user_id: userId,
  });
}

async function uploadDocumentVersion({
  changeNotes,
  documentId,
  file,
  locale,
  status = "Uploaded",
  supabase,
  userId,
}: {
  changeNotes?: string | null;
  documentId: string;
  file: File;
  locale: Locale;
  status?: string;
  supabase: SupabaseClient;
  userId: string;
}) {
  const validationError = validateDocumentFile(file, locale);
  if (validationError) {
    throw new Error(validationError);
  }

  const { count } = await supabase
    .from("document_versions")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId);
  const versionNumber = (count || 0) + 1;
  const storageKey = `documents/${documentId}/v${versionNumber}-${crypto.randomUUID()}-${cleanDocumentStorageName(
    file.name,
  )}`;
  const contentType = getDocumentMimeType(file);
  const checksum = await checksumFileSha256(file);

  const { error: uploadError } = await supabase.storage
    .from(documentStorageBucket)
    .upload(storageKey, file, {
      cacheControl: "3600",
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: version, error: versionError } = await supabase
    .from("document_versions")
    .insert({
      change_notes: changeNotes || null,
      checksum_sha256: checksum,
      created_by_user_id: userId,
      document_id: documentId,
      file_extension: getFileExtension(file.name),
      file_name: cleanDocumentStorageName(file.name),
      file_size: file.size,
      mime_type: contentType,
      original_file_name: file.name,
      status,
      storage_key: storageKey,
      version_number: versionNumber,
    })
    .select("id,version_number")
    .single();

  if (versionError || !version) {
    await supabase.storage.from(documentStorageBucket).remove([storageKey]);
    throw new Error(versionError?.message || actionMessage(locale, "versionSaveFailed"));
  }

  return {
    id: version.id as string,
    storage_key: storageKey,
    version_number: version.version_number as number,
  };
}

async function createDocumentRecord({
  category,
  documentNumber,
  documentType,
  entityId,
  entityType,
  expiresAt,
  confidentialityLevel = "internal",
  file,
  locale,
  notes,
  status = "Uploaded",
  supabase,
  title,
  userId,
}: {
  category: string;
  documentNumber?: string | null;
  documentType: string;
  entityId?: string | null;
  entityType: string;
  expiresAt?: string | null;
  confidentialityLevel?: string;
  file: File;
  locale: Locale;
  notes?: string | null;
  status?: string;
  supabase: SupabaseClient;
  title: string;
  userId: string;
}) {
  let uploadedStorageKey: string | null = null;
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({
      category,
      confidentiality_level: confidentialityLevel,
      created_by_user_id: userId,
      document_number: documentNumber || null,
      document_type: documentType,
      expires_at: expiresAt || null,
      notes: notes || null,
      status,
      title,
      uploaded_by_user_id: userId,
    })
    .select("id")
    .single();

  if (documentError || !document) {
    throw new Error(documentError?.message || actionMessage(locale, "documentCreatedFailed"));
  }

  try {
    const version = await uploadDocumentVersion({
      documentId: document.id,
      file,
      locale,
      status,
      supabase,
      userId,
    });
    uploadedStorageKey = version.storage_key;

    const { error: updateError } = await supabase
      .from("documents")
      .update({ current_version_id: version.id, updated_by_user_id: userId })
      .eq("id", document.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const linkEntityId = entityType === "general" || entityType === "template"
      ? zeroUuid
      : entityId;

    if (linkEntityId) {
      const { error: linkError } = await supabase.from("document_links").insert({
        created_by_user_id: userId,
        document_id: document.id,
        entity_id: linkEntityId,
        entity_type: entityType,
      });

      if (linkError) {
        throw new Error(linkError.message);
      }
    }

    await logDocumentActivity(supabase, document.id, userId, "uploaded", {
      category,
      document_type: documentType,
      entity_id: linkEntityId,
      entity_type: entityType,
      version: version.version_number,
    });

    return document.id as string;
  } catch (error) {
    if (uploadedStorageKey) {
      await supabase.storage.from(documentStorageBucket).remove([uploadedStorageKey]);
    }
    await supabase.from("documents").delete().eq("id", document.id);
    throw error;
  }
}

export async function uploadDocumentAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const returnTo = getSafeReturnTo(formData);
  const { profile, supabase, user } = await requireApprovedUser();

  if (!hasWriteRole(profile.role)) {
    redirectWithMessage(returnTo, actionMessage(locale, "noUploadPermission"));
  }

  const files = getFiles(formData);
  if (files.length === 0) {
    redirectWithMessage(returnTo, actionMessage(locale, "selectDocumentFiles"));
  }

  let input: z.infer<typeof documentMetadataSchema>;
  try {
    input = documentMetadataSchema.parse({
      category: formData.get("category"),
      confidentiality_level: formData.get("confidentiality_level") || "internal",
      document_number: formData.get("document_number") || undefined,
      document_type: formData.get("document_type"),
      entity_id: formData.get("entity_id") || "",
      entity_type: formData.get("entity_type") || "general",
      expires_at: formData.get("expires_at") || undefined,
      notes: formData.get("notes") || undefined,
      title: formData.get("title") || files[0]?.name,
    });
  } catch (error) {
    redirectWithMessage(returnTo, getActionErrorMessage(error, locale));
  }

  try {
    for (const [index, file] of files.entries()) {
      const title =
        files.length > 1
          ? `${sanitizeDocumentText(input.title, 120)} - ${sanitizeDocumentText(file.name, 80)}`
          : sanitizeDocumentText(input.title, 160);

      await createDocumentRecord({
        category: input.category,
        documentNumber: sanitizeDocumentText(input.document_number, 80),
        documentType: sanitizeDocumentText(input.document_type, 120),
        entityId: input.entity_id || null,
        entityType: input.entity_type,
        expiresAt: input.expires_at || null,
        confidentialityLevel: input.confidentiality_level,
        file,
        locale,
        notes: sanitizeDocumentText(input.notes, 1000),
        status: index === 0 ? "Uploaded" : "Uploaded",
        supabase,
        title,
        userId: user.id,
      });
    }
  } catch (error) {
    redirectWithMessage(returnTo, getActionErrorMessage(error, locale));
  }

  revalidatePath("/documents");
  redirectWithMessage(returnTo, actionMessage(locale, "uploadDocumentSuccess"));
}

export async function createDocumentVersionAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const returnTo = getSafeReturnTo(formData);
  const { profile, supabase, user } = await requireApprovedUser();

  if (!hasWriteRole(profile.role)) {
    redirectWithMessage(returnTo, actionMessage(locale, "noNewVersionPermission"));
  }

  const documentId = String(formData.get("document_id") || "");
  const file = formData.get("file");
  if (!documentId || !(file instanceof File) || file.size <= 0) {
    redirectWithMessage(returnTo, actionMessage(locale, "versionMissingFile"));
  }

  const { data: document } = await supabase
    .from("documents")
    .select("id,status,created_by_user_id")
    .eq("id", documentId)
    .single();

  if (!document) {
    redirectWithMessage(returnTo, actionMessage(locale, "documentNotFound"));
  }

  if (["Approved", "Signed"].includes(String(document.status)) && profile.role === "agent") {
    redirectWithMessage(returnTo, actionMessage(locale, "approvedDocumentNeedsVersion"));
  }

  let uploadedStorageKey: string | null = null;
  try {
    const version = await uploadDocumentVersion({
      changeNotes: sanitizeDocumentText(formData.get("change_notes"), 500),
      documentId,
      file,
      locale,
      status: "Uploaded",
      supabase,
      userId: user.id,
    });
    uploadedStorageKey = version.storage_key;

    await supabase
      .from("documents")
      .update({
        current_version_id: version.id,
        status: "Uploaded",
        updated_by_user_id: user.id,
      })
      .eq("id", documentId);

    await logDocumentActivity(supabase, documentId, user.id, "version_created", {
      version: version.version_number,
    });
  } catch (error) {
    if (uploadedStorageKey) {
      await supabase.storage.from(documentStorageBucket).remove([uploadedStorageKey]);
    }
    redirectWithMessage(returnTo, getActionErrorMessage(error, locale));
  }

  revalidatePath("/documents");
  redirectWithMessage(returnTo, actionMessage(locale, "versionCreated"));
}

export async function updateDocumentStatusAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const returnTo = getSafeReturnTo(formData);
  const { profile, supabase, user } = await requireApprovedUser();
  const documentId = String(formData.get("document_id") || "");
  const nextStatus = String(formData.get("status") || "");
  const reason = sanitizeDocumentText(formData.get("reason"), 500);

  if (!documentId || !nextStatus) {
    redirectWithMessage(returnTo, actionMessage(locale, "documentMissingStatus"));
  }

  const { data: document } = await supabase
    .from("documents")
    .select("id,status,created_by_user_id")
    .eq("id", documentId)
    .single();

  if (!document) {
    redirectWithMessage(returnTo, actionMessage(locale, "documentNotFound"));
  }

  const managerStatuses = ["Approved", "Rejected", "Needs Changes"];
  if (managerStatuses.includes(nextStatus) && !hasManagerRole(profile.role)) {
    redirectWithMessage(returnTo, actionMessage(locale, "needManagerForDocument"));
  }

  if (
    managerStatuses.includes(nextStatus) &&
    String(document.created_by_user_id || "") === user.id
  ) {
    redirectWithMessage(returnTo, actionMessage(locale, "ownDocumentApproval"));
  }

  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    updated_by_user_id: user.id,
  };

  if (nextStatus === "Archived") {
    updatePayload.archived_at = new Date().toISOString();
    updatePayload.archive_reason = reason || "Archived";
  }

  const { error } = await supabase
    .from("documents")
    .update(updatePayload)
    .eq("id", documentId);

  if (error) {
    redirectWithMessage(returnTo, getActionErrorMessage(error, locale));
  }

  await logDocumentActivity(supabase, documentId, user.id, nextStatus.toLowerCase().replaceAll(" ", "_"), {
    from: document.status,
    reason,
    to: nextStatus,
  });

  revalidatePath("/documents");
  redirectWithMessage(returnTo, actionMessage(locale, "documentStatusUpdated"));
}

export async function createOfferAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const { profile, supabase, user } = await requireApprovedUser();

  if (!["admin", "manager", "agent"].includes(profile.role)) {
    redirectWithMessage("/documents?tab=offers", actionMessage(locale, "noCreateOfferPermission"));
  }

  let input: z.infer<typeof offerSchema>;
  try {
    input = offerSchema.parse({
      estimated_sale_price: formData.get("estimated_sale_price") || undefined,
      investor_percentage: formData.get("investor_percentage"),
      land_area: formData.get("land_area") || undefined,
      notes: formData.get("notes") || undefined,
      owner_name: formData.get("owner_name") || undefined,
      owner_percentage: formData.get("owner_percentage"),
      property_id: formData.get("property_id"),
      title: formData.get("title"),
      valid_until: formData.get("valid_until") || undefined,
    });
  } catch (error) {
    redirectWithMessage("/documents?tab=offers", getActionErrorMessage(error, locale));
  }

  const { data: property } = await supabase
    .from("properties")
    .select("id,status,title,plot_size_m2")
    .eq("id", input.property_id)
    .single();

  if (!property || property.status === "archived") {
    redirectWithMessage("/documents?tab=offers", actionMessage(locale, "propertyArchived"));
  }

  const { data: offer, error } = await supabase
    .from("offers")
    .insert({
      created_by_user_id: user.id,
      estimated_sale_price: input.estimated_sale_price || null,
      investor_percentage: input.investor_percentage,
      land_area: input.land_area || property.plot_size_m2 || null,
      owner_percentage: input.owner_percentage,
      property_id: input.property_id,
      status: "Draft",
      title: sanitizeDocumentText(input.title, 160),
      valid_until: input.valid_until || null,
    })
    .select("id")
    .single();

  if (error || !offer) {
    redirectWithMessage("/documents?tab=offers", getActionErrorMessage(error, locale));
  }

  await supabase.from("offer_parties").insert({
    display_name: sanitizeDocumentText(input.owner_name, 160) || null,
    offer_id: offer.id,
    ownership_share: 100,
    party_role: "owner",
  });

  const { data: version } = await supabase
    .from("offer_versions")
    .insert({
      calculation_snapshot_json: {
        notes: sanitizeDocumentText(input.notes, 1000),
        property_title: property.title,
      },
      created_by_user_id: user.id,
      estimated_sale_price: input.estimated_sale_price || null,
      investor_percentage: input.investor_percentage,
      land_area: input.land_area || property.plot_size_m2 || null,
      offer_id: offer.id,
      owner_percentage: input.owner_percentage,
      status: "Draft",
      version_number: 1,
    })
    .select("id")
    .single();

  const file = formData.get("excel_file");
  if (file instanceof File && file.size > 0) {
    if (!isExcelDocument(file)) {
      redirectWithMessage("/documents?tab=offers", actionMessage(locale, "excelMustBeExcel"));
    }

    try {
      const documentId = await createDocumentRecord({
        category: "Oferta",
        documentType: "Excel Offer",
        entityId: offer.id,
        entityType: "offer",
        file,
        locale,
        notes: sanitizeDocumentText(input.notes, 1000),
        status: "Uploaded",
        supabase,
        title: `${input.title} - Excel`,
        userId: user.id,
      });

      await supabase
        .from("offer_versions")
        .update({ excel_document_id: documentId })
        .eq("id", version?.id);
    } catch (uploadError) {
      redirectWithMessage("/documents?tab=offers", getActionErrorMessage(uploadError, locale));
    }
  }

  await logOfferActivity(supabase, offer.id, user.id, "created", {
    investor_percentage: input.investor_percentage,
    owner_percentage: input.owner_percentage,
  });

  revalidatePath("/documents");
  redirectWithMessage("/documents?tab=offers", actionMessage(locale, "offerCreated"));
}

export async function updateOfferStatusAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const returnTo = getSafeReturnTo(formData, "/documents?tab=offers");
  const { profile, supabase, user } = await requireApprovedUser();
  const offerId = String(formData.get("offer_id") || "");
  const nextStatus = String(formData.get("status") || "");
  const reason = sanitizeDocumentText(formData.get("reason"), 500);

  const { data: offer } = await supabase
    .from("offers")
    .select("id,status,created_by_user_id")
    .eq("id", offerId)
    .single();

  if (!offer) {
    redirectWithMessage(returnTo, actionMessage(locale, "offerNotFound"));
  }

  if (["Approved", "Rejected"].includes(nextStatus) && !hasManagerRole(profile.role)) {
    redirectWithMessage(returnTo, actionMessage(locale, "needManagerForOffer"));
  }

  if (["Approved", "Rejected"].includes(nextStatus) && offer.created_by_user_id === user.id) {
    redirectWithMessage(returnTo, actionMessage(locale, "ownOfferApproval"));
  }

  if (nextStatus === "Sent to Owner" && offer.status !== "Approved") {
    redirectWithMessage(returnTo, actionMessage(locale, "offerMustBeApprovedBeforeSending"));
  }

  if (nextStatus === "Accepted" && offer.status !== "Sent to Owner") {
    redirectWithMessage(returnTo, actionMessage(locale, "offerMustBeSentBeforeAccepted"));
  }

  const updatePayload: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === "Approved") {
    updatePayload.approved_at = new Date().toISOString();
    updatePayload.approved_by_user_id = user.id;
  }
  if (nextStatus === "Sent to Owner") updatePayload.sent_at = new Date().toISOString();
  if (nextStatus === "Accepted") updatePayload.accepted_at = new Date().toISOString();
  if (nextStatus === "Rejected") {
    updatePayload.rejected_at = new Date().toISOString();
    updatePayload.rejection_reason = reason || "Rejected";
  }
  if (nextStatus === "Archived") updatePayload.archived_at = new Date().toISOString();

  const { error } = await supabase.from("offers").update(updatePayload).eq("id", offerId);
  if (error) {
    redirectWithMessage(returnTo, getActionErrorMessage(error, locale));
  }

  await logOfferActivity(supabase, offerId, user.id, nextStatus.toLowerCase().replaceAll(" ", "_"), {
    from: offer.status,
    reason,
    to: nextStatus,
  });

  revalidatePath("/documents");
  redirectWithMessage(returnTo, actionMessage(locale, "offerStatusUpdated"));
}

export async function createContractAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const { profile, supabase, user } = await requireApprovedUser();

  if (!["admin", "manager", "agent", "legal"].includes(profile.role)) {
    redirectWithMessage("/documents?tab=contracts", actionMessage(locale, "noCreateContractPermission"));
  }

  let input: z.infer<typeof contractSchema>;
  try {
    input = contractSchema.parse({
      amount: formData.get("amount") || undefined,
      contract_type: formData.get("contract_type"),
      currency: formData.get("currency") || "EUR",
      end_date: formData.get("end_date") || undefined,
      notes: formData.get("notes") || undefined,
      party_a: formData.get("party_a"),
      party_b: formData.get("party_b"),
      property_id: formData.get("property_id") || "",
      start_date: formData.get("start_date") || undefined,
      title: formData.get("title"),
    });
  } catch (error) {
    redirectWithMessage("/documents?tab=contracts", getActionErrorMessage(error, locale));
  }

  if (input.property_id) {
    const { data: property } = await supabase
      .from("properties")
      .select("id,status")
      .eq("id", input.property_id)
      .single();

    if (!property || property.status === "archived") {
      redirectWithMessage("/documents?tab=contracts", actionMessage(locale, "propertyArchived"));
    }

    if (input.contract_type === "buying_contract" && property.status === "sold") {
      redirectWithMessage("/documents?tab=contracts", actionMessage(locale, "soldPropertyContract"));
    }
  }

  const contractNumber = createContractNumber();
  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      assigned_agent_id: user.id,
      contract_data_json: {
        amount: input.amount || null,
        currency: input.currency || "EUR",
        notes: sanitizeDocumentText(input.notes, 1000),
      },
      contract_number: contractNumber,
      contract_type: input.contract_type,
      created_by_user_id: user.id,
      end_date: input.end_date || null,
      expires_at: input.end_date || null,
      property_id: input.property_id || null,
      start_date: input.start_date || null,
      status: "Draft",
      title: sanitizeDocumentText(input.title, 160),
    })
    .select("id")
    .single();

  if (error || !contract) {
    redirectWithMessage("/documents?tab=contracts", getActionErrorMessage(error, locale));
  }

  const [partyARole, partyBRole] =
    input.contract_type === "rent_contract"
      ? ["landlord", "tenant"]
      : input.contract_type === "buying_contract" || input.contract_type === "reservation_contract"
        ? ["seller", "buyer"]
        : ["owner", "agency"];

  await supabase.from("contract_parties").insert([
    {
      contract_id: contract.id,
      display_name: sanitizeDocumentText(input.party_a, 160),
      party_role: partyARole,
      signature_status: "Pending",
    },
    {
      contract_id: contract.id,
      display_name: sanitizeDocumentText(input.party_b, 160),
      party_role: partyBRole,
      signature_status: "Pending",
    },
  ]);

  await supabase.from("contract_versions").insert({
    contract_id: contract.id,
    created_by_user_id: user.id,
    snapshot_json: {
      contract_number: contractNumber,
      contract_type: input.contract_type,
      title: input.title,
    },
    status: "Draft",
    version_number: 1,
  });

  await logContractActivity(supabase, contract.id, user.id, "created", {
    contract_number: contractNumber,
    type: input.contract_type,
  });

  revalidatePath("/documents");
  redirectWithMessage("/documents?tab=contracts", actionMessage(locale, "contractCreated"));
}

export async function updateContractStatusAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const returnTo = getSafeReturnTo(formData, "/documents?tab=contracts");
  const { profile, supabase, user } = await requireApprovedUser();
  const contractId = String(formData.get("contract_id") || "");
  const nextStatus = String(formData.get("status") || "");
  const reason = sanitizeDocumentText(formData.get("reason"), 500);

  const { data: contract } = await supabase
    .from("contracts")
    .select("id,status,contract_type,created_by_user_id,legal_approved_at")
    .eq("id", contractId)
    .single();

  if (!contract) {
    redirectWithMessage(returnTo, actionMessage(locale, "contractNotFound"));
  }

  if (nextStatus === "Pending Legal Review" && contract.status !== "Draft") {
    redirectWithMessage(returnTo, actionMessage(locale, "canOnlySendDraftLegal"));
  }

  if (nextStatus === "Pending Manager Approval" && !hasLegalRole(profile.role)) {
    redirectWithMessage(returnTo, actionMessage(locale, "needLegalForReview"));
  }

  if (nextStatus === "Approved" && !hasManagerRole(profile.role)) {
    redirectWithMessage(returnTo, actionMessage(locale, "needManagerForContract"));
  }

  if (["Pending Manager Approval", "Approved", "Rejected"].includes(nextStatus) && contract.created_by_user_id === user.id) {
    redirectWithMessage(returnTo, actionMessage(locale, "ownContractApproval"));
  }

  const updatePayload: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === "Pending Manager Approval") {
    updatePayload.legal_approved_at = new Date().toISOString();
    updatePayload.legal_approved_by_user_id = user.id;
  }
  if (nextStatus === "Approved") {
    if (!contract.legal_approved_at && contract.status !== "Pending Manager Approval") {
      redirectWithMessage(returnTo, actionMessage(locale, "contractRequiresLegal"));
    }
    updatePayload.manager_approved_at = new Date().toISOString();
    updatePayload.manager_approved_by_user_id = user.id;
  }
  if (nextStatus === "Archived") {
    updatePayload.archived_at = new Date().toISOString();
    updatePayload.archive_reason = reason || "Archived";
  }
  if (nextStatus === "Rejected") {
    updatePayload.termination_reason = reason || "Rejected";
  }

  const { error } = await supabase.from("contracts").update(updatePayload).eq("id", contractId);
  if (error) {
    redirectWithMessage(returnTo, getActionErrorMessage(error, locale));
  }

  await supabase.from("contract_approvals").insert({
    approval_type:
      nextStatus === "Pending Manager Approval"
        ? "legal"
        : nextStatus === "Approved"
          ? "manager"
          : "legal",
    contract_id: contractId,
    decided_at: ["Pending Manager Approval", "Approved", "Rejected"].includes(nextStatus)
      ? new Date().toISOString()
      : null,
    decided_by_user_id: ["Pending Manager Approval", "Approved", "Rejected"].includes(nextStatus)
      ? user.id
      : null,
    decision_reason: reason || null,
    requested_by_user_id: user.id,
    status:
      nextStatus === "Rejected"
        ? "Rejected"
        : ["Pending Manager Approval", "Approved"].includes(nextStatus)
          ? "Approved"
          : "Pending",
  });

  await logContractActivity(supabase, contractId, user.id, nextStatus.toLowerCase().replaceAll(" ", "_"), {
    from: contract.status,
    reason,
    to: nextStatus,
  });

  revalidatePath("/documents");
  redirectWithMessage(returnTo, actionMessage(locale, "contractUpdated"));
}

export async function uploadSignedContractAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const returnTo = getSafeReturnTo(formData, "/documents?tab=contracts");
  const { profile, supabase, user } = await requireApprovedUser();

  if (!hasWriteRole(profile.role)) {
    redirectWithMessage(returnTo, actionMessage(locale, "noUploadContractPermission"));
  }

  const contractId = String(formData.get("contract_id") || "");
  const file = formData.get("signed_file");

  if (!contractId || !(file instanceof File) || file.size <= 0) {
    redirectWithMessage(returnTo, actionMessage(locale, "contractMissingSignedFile"));
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("id,title,status,contract_type")
    .eq("id", contractId)
    .single();

  if (!contract) {
    redirectWithMessage(returnTo, actionMessage(locale, "contractNotFound"));
  }

  try {
    const documentId = await createDocumentRecord({
      category: "Kontrata",
      documentType: "Signed Contract",
      entityId: contractId,
      entityType: "contract",
      file,
      locale,
      status: "Signed",
      supabase,
      title: `${contract.title} - ${locale === "sq" ? "e firmosur" : "signed"}`,
      userId: user.id,
    });

    const { count } = await supabase
      .from("contract_versions")
      .select("id", { count: "exact", head: true })
      .eq("contract_id", contractId);

    await supabase.from("contract_versions").insert({
      contract_id: contractId,
      created_by_user_id: user.id,
      signed_document_id: documentId,
      snapshot_json: {
        signed_document_id: documentId,
      },
      status: "Signed",
      version_number: (count || 0) + 1,
    });

    await supabase
      .from("contract_parties")
      .update({
        signature_status: "Signed Manually",
        signed_at: new Date().toISOString(),
        signing_method: "manual_pdf_upload",
      })
      .eq("contract_id", contractId)
      .eq("required_to_sign", true);

    await supabase
      .from("contracts")
      .update({
        signed_at: new Date().toISOString(),
        status: "Signed",
      })
      .eq("id", contractId);

    await logContractActivity(supabase, contractId, user.id, "signed_file_uploaded", {
      document_id: documentId,
    });
  } catch (error) {
    redirectWithMessage(returnTo, getActionErrorMessage(error, locale));
  }

  revalidatePath("/documents");
  redirectWithMessage(returnTo, actionMessage(locale, "contractSignedUploaded"));
}

export async function completeContractAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const returnTo = getSafeReturnTo(formData, "/documents?tab=contracts");
  const { profile, supabase, user } = await requireApprovedUser();
  const contractId = String(formData.get("contract_id") || "");

  if (!hasManagerRole(profile.role)) {
    redirectWithMessage(returnTo, actionMessage(locale, "needManagerForComplete"));
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("id,status,contract_type,property_id")
    .eq("id", contractId)
    .single();

  if (!contract || contract.status !== "Signed") {
    redirectWithMessage(returnTo, actionMessage(locale, "contractBeforeComplete"));
  }

  const { error } = await supabase
    .from("contracts")
    .update({
      completed_at: new Date().toISOString(),
      status: contract.contract_type === "rent_contract" ? "Active" : "Completed",
    })
    .eq("id", contractId);

  if (error) {
    redirectWithMessage(returnTo, getActionErrorMessage(error, locale));
  }

  if (contract.property_id) {
    const nextPropertyStatus =
      contract.contract_type === "rent_contract"
        ? "rented"
        : contract.contract_type === "buying_contract"
          ? "sold"
          : contract.contract_type === "reservation_contract"
            ? "reserved"
            : null;

    if (nextPropertyStatus) {
      await supabase
        .from("properties")
        .update({ status: nextPropertyStatus })
        .eq("id", contract.property_id);
    }
  }

  await logContractActivity(supabase, contractId, user.id, "completed", {
    contract_type: formatContractType(contract.contract_type),
  });

  revalidatePath("/documents");
  revalidatePath("/sales");
  redirectWithMessage(returnTo, actionMessage(locale, "contractUpdated"));
}
