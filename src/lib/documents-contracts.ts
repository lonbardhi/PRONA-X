import { z } from "zod";

import { getIntlLocale, type Locale } from "./i18n.ts";
import type { PropertyTransactionType } from "./properties.ts";

export const documentStorageBucket = "crm-documents";
export const documentMaxBytes = 50 * 1024 * 1024;

export const documentCategories = [
  "Pronesia",
  "Kadastra",
  "Identifikimi",
  "Autorizime",
  "Oferta",
  "Kontrata",
  "Financiare",
  "Media",
  "Teknike",
  "Te tjera",
] as const;

export const documentStatuses = [
  "Draft",
  "Uploaded",
  "Pending Review",
  "Approved",
  "Rejected",
  "Needs Changes",
  "Generated",
  "Signed",
  "Expiring Soon",
  "Expired",
  "Archived",
  "Quarantined",
] as const;

export const confidentialityLevels = [
  "public_share",
  "internal",
  "confidential",
  "restricted",
] as const;

export const entityTypes = [
  "property",
  "owner",
  "client",
  "lead",
  "deal",
  "offer",
  "contract",
  "template",
  "general",
] as const;

export const offerStatuses = [
  "Draft",
  "Pending Approval",
  "Approved",
  "Sent to Owner",
  "Accepted",
  "Rejected",
  "Superseded",
  "Archived",
] as const;

export const offerVersionStatuses = [
  "Draft",
  "Pending Approval",
  "Approved",
  "Sent",
  "Accepted",
  "Rejected",
  "Superseded",
] as const;

export const contractTypes = [
  "rent_contract",
  "buying_contract",
  "reservation_contract",
  "owner_mandate_contract",
  "buyer_brokerage_contract",
  "tenant_brokerage_contract",
  "commission_agreement",
  "annex",
  "handover_protocol",
  "termination_agreement",
] as const;

export const contractStatuses = [
  "Draft",
  "Pending Legal Review",
  "Pending Finance Review",
  "Pending Manager Approval",
  "Approved",
  "Sent for Signature",
  "Partially Signed",
  "Signature Declined",
  "Signed",
  "Active",
  "Expiring Soon",
  "Notary Scheduled",
  "Closing in Progress",
  "Completed",
  "Expired",
  "Renewed",
  "Terminated",
  "Cancelled",
  "Rejected",
  "Archived",
] as const;

export const contractPartyRoles = [
  "landlord",
  "tenant",
  "seller",
  "buyer",
  "owner",
  "agent",
  "agency",
  "payer",
  "representative",
  "witness",
  "notary",
  "other",
] as const;

export type DocumentCategory = (typeof documentCategories)[number];
export type DocumentStatus = (typeof documentStatuses)[number];
export type EntityType = (typeof entityTypes)[number];
export type OfferStatus = (typeof offerStatuses)[number];
export type ContractType = (typeof contractTypes)[number];
export type ContractStatus = (typeof contractStatuses)[number];

export const documentTypeOptions = {
  Pronesia: ["Ownership certificate", "Title deed", "Property document"],
  Kadastra: ["Cadastral map", "Parcel plan", "Boundary document"],
  Identifikimi: ["Owner ID", "Buyer ID", "Tenant ID", "Seller ID", "Company registration"],
  Autorizime: ["Power of attorney", "Owner authorization", "Agency mandate"],
  Oferta: ["Excel Offer", "Offer PDF", "Signed Offer"],
  Kontrata: [
    "Draft Contract",
    "Generated Contract PDF",
    "Signed Contract",
    "Contract Annex",
    "Termination Agreement",
    "Handover Protocol",
  ],
  Financiare: ["Invoice", "Payment proof", "Commission calculation", "Receipt"],
  Media: ["Photo", "Video", "Floor plan", "Drone media"],
  Teknike: ["Permit", "Architecture plan", "Construction document"],
  "Te tjera": ["Other"],
} satisfies Record<DocumentCategory, string[]>;

const documentCategoryLabels: Record<string, Record<Locale, string>> = {
  Autorizime: { sq: "Autorizime", en: "Authorizations" },
  Financiare: { sq: "Financiare", en: "Financial" },
  Identifikimi: { sq: "Identifikimi", en: "Identification" },
  Kadastra: { sq: "Kadastra", en: "Cadastre" },
  Kontrata: { sq: "Kontrata", en: "Contracts" },
  Media: { sq: "Media", en: "Media" },
  Oferta: { sq: "Oferta", en: "Offers" },
  Pronesia: { sq: "Pronësia", en: "Ownership" },
  Teknike: { sq: "Teknike", en: "Technical" },
  "Te tjera": { sq: "Të tjera", en: "Other" },
};

const documentTypeLabels: Record<string, Record<Locale, string>> = {
  "Agency mandate": { sq: "Mandat agjencie", en: "Agency mandate" },
  "Architecture plan": { sq: "Plan arkitekturor", en: "Architecture plan" },
  "Boundary document": { sq: "Dokument kufijsh", en: "Boundary document" },
  "Buyer ID": { sq: "ID blerësi", en: "Buyer ID" },
  "Cadastral map": { sq: "Hartë kadastrale", en: "Cadastral map" },
  "Commission calculation": { sq: "Llogaritje komisioni", en: "Commission calculation" },
  "Company registration": { sq: "Regjistrim kompanie", en: "Company registration" },
  "Construction document": { sq: "Dokument ndërtimi", en: "Construction document" },
  "Contract Annex": { sq: "Aneks kontrate", en: "Contract annex" },
  "Draft Contract": { sq: "Projekt-kontratë", en: "Draft contract" },
  "Drone media": { sq: "Media me dron", en: "Drone media" },
  "Excel Offer": { sq: "Ofertë Excel", en: "Excel offer" },
  "Floor plan": { sq: "Planimetri", en: "Floor plan" },
  "Generated Contract PDF": { sq: "PDF kontrate i gjeneruar", en: "Generated contract PDF" },
  "Handover Protocol": { sq: "Akt-dorëzim", en: "Handover protocol" },
  Invoice: { sq: "Faturë", en: "Invoice" },
  "Offer PDF": { sq: "PDF oferte", en: "Offer PDF" },
  "Other": { sq: "Tjetër", en: "Other" },
  "Owner authorization": { sq: "Autorizim pronari", en: "Owner authorization" },
  "Owner ID": { sq: "ID pronari", en: "Owner ID" },
  "Ownership certificate": { sq: "Certifikatë pronësie", en: "Ownership certificate" },
  "Parcel plan": { sq: "Plan parcele", en: "Parcel plan" },
  "Payment proof": { sq: "Dëshmi pagese", en: "Payment proof" },
  Permit: { sq: "Leje", en: "Permit" },
  Photo: { sq: "Foto", en: "Photo" },
  "Power of attorney": { sq: "Prokurë", en: "Power of attorney" },
  "Property document": { sq: "Dokument prone", en: "Property document" },
  Receipt: { sq: "Dëftesë", en: "Receipt" },
  "Seller ID": { sq: "ID shitësi", en: "Seller ID" },
  "Signed Contract": { sq: "Kontratë e firmosur", en: "Signed contract" },
  "Signed Offer": { sq: "Ofertë e firmosur", en: "Signed offer" },
  "Tenant ID": { sq: "ID qiramarrësi", en: "Tenant ID" },
  "Termination Agreement": { sq: "Marrëveshje përfundimi", en: "Termination agreement" },
  "Title deed": { sq: "Akt pronësie", en: "Title deed" },
  Video: { sq: "Video", en: "Video" },
};

const statusLabels: Record<string, Record<Locale, string>> = {
  Accepted: { sq: "Pranuar", en: "Accepted" },
  Active: { sq: "Aktive", en: "Active" },
  Approved: { sq: "Aprovuar", en: "Approved" },
  Archived: { sq: "Arkivuar", en: "Archived" },
  Cancelled: { sq: "Anuluar", en: "Cancelled" },
  "Closing in Progress": { sq: "Mbyllje në proces", en: "Closing in progress" },
  Completed: { sq: "Përfunduar", en: "Completed" },
  Draft: { sq: "Projekt", en: "Draft" },
  Expired: { sq: "Skaduar", en: "Expired" },
  "Expiring Soon": { sq: "Skadon së shpejti", en: "Expiring soon" },
  Generated: { sq: "Gjeneruar", en: "Generated" },
  "Needs Changes": { sq: "Kërkon ndryshime", en: "Needs changes" },
  "Notary Scheduled": { sq: "Noteri i planifikuar", en: "Notary scheduled" },
  "Partially Signed": { sq: "Firmosur pjesërisht", en: "Partially signed" },
  "Pending Approval": { sq: "Në pritje për aprovim", en: "Pending approval" },
  "Pending Finance Review": { sq: "Në pritje të financës", en: "Pending finance review" },
  "Pending Legal Review": { sq: "Në pritje të rishikimit ligjor", en: "Pending legal review" },
  "Pending Manager Approval": { sq: "Në pritje të menaxherit", en: "Pending manager approval" },
  "Pending Review": { sq: "Në pritje për rishikim", en: "Pending review" },
  Quarantined: { sq: "Në karantinë", en: "Quarantined" },
  Rejected: { sq: "Refuzuar", en: "Rejected" },
  Renewed: { sq: "Rinovuar", en: "Renewed" },
  Sent: { sq: "Dërguar", en: "Sent" },
  "Sent for Signature": { sq: "Dërguar për firmë", en: "Sent for signature" },
  "Sent to Owner": { sq: "Dërguar pronarit", en: "Sent to owner" },
  "Signature Declined": { sq: "Firma u refuzua", en: "Signature declined" },
  Signed: { sq: "Firmosur", en: "Signed" },
  Superseded: { sq: "Zëvendësuar", en: "Superseded" },
  Terminated: { sq: "Ndërprerë", en: "Terminated" },
  Uploaded: { sq: "Ngarkuar", en: "Uploaded" },
};

const entityTypeLabels: Record<string, Record<Locale, string>> = {
  client: { sq: "Klient", en: "Client" },
  contract: { sq: "Kontratë", en: "Contract" },
  deal: { sq: "Marrëveshje", en: "Deal" },
  general: { sq: "Bibliotekë e përgjithshme", en: "General library" },
  lead: { sq: "Lead", en: "Lead" },
  offer: { sq: "Ofertë", en: "Offer" },
  owner: { sq: "Pronar", en: "Owner" },
  property: { sq: "Pronë", en: "Property" },
  template: { sq: "Shabllon", en: "Template" },
};

const confidentialityLabels: Record<string, Record<Locale, string>> = {
  confidential: { sq: "Konfidencial", en: "Confidential" },
  internal: { sq: "I brendshëm", en: "Internal" },
  public_share: { sq: "Për shpërndarje publike", en: "Public share" },
  restricted: { sq: "I kufizuar", en: "Restricted" },
};

export const allowedDocumentMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "application/zip",
] as const;

const extensionMimeMap: Record<string, readonly string[]> = {
  pdf: ["application/pdf"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  xls: ["application/vnd.ms-excel", "application/octet-stream"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  doc: ["application/msword", "application/octet-stream"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  mp4: ["video/mp4"],
  mov: ["video/quicktime", "video/quicktime; charset=binary", "application/octet-stream"],
  zip: ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
};

export function getDocumentMimeType(file: File) {
  const extension = getFileExtension(file.name);
  const allowed = extensionMimeMap[extension];

  if (!file.type || file.type === "application/octet-stream") {
    return (
      allowed?.find((type) => type !== "application/octet-stream") ||
      allowed?.[0] ||
      "application/octet-stream"
    );
  }

  return file.type || allowed?.[0] || "application/octet-stream";
}

export function sanitizeDocumentText(value: unknown, maxLength = 500) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function getFileExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase().trim() || "";
}

export function cleanDocumentStorageName(name: string) {
  const extension = getFileExtension(name);
  const base = name
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);

  return `${base || "document"}${extension ? `.${extension}` : ""}`;
}

export function formatDocumentCategory(category: string, locale: Locale) {
  return documentCategoryLabels[category]?.[locale] || category;
}

export function formatDocumentType(type: string, locale: Locale) {
  return documentTypeLabels[type]?.[locale] || type;
}

export function formatDocumentStatus(status: string, locale: Locale) {
  return statusLabels[status]?.[locale] || status;
}

export function formatOfferStatus(status: string, locale: Locale) {
  return statusLabels[status]?.[locale] || status;
}

export function formatContractStatus(status: string, locale: Locale) {
  return statusLabels[status]?.[locale] || status;
}

export function formatEntityType(entityType: string, locale: Locale) {
  return entityTypeLabels[entityType]?.[locale] || entityType;
}

export function formatConfidentialityLevel(level: string, locale: Locale) {
  return confidentialityLabels[level]?.[locale] || level;
}

export function validateDocumentFile(file: File, locale: Locale = "sq") {
  if (file.size <= 0) {
    return locale === "sq"
      ? `${file.name} është bosh. Ngarko një skedar të vlefshëm.`
      : `${file.name} is empty. Upload a valid file.`;
  }

  if (file.size > documentMaxBytes) {
    return locale === "sq"
      ? `${file.name} është më i madh se 50 MB.`
      : `${file.name} is larger than 50 MB.`;
  }

  const extension = getFileExtension(file.name);
  const allowedMimes = extensionMimeMap[extension];

  if (!allowedMimes) {
    return locale === "sq"
      ? `${file.name} nuk mbështetet. Përdor PDF, Excel, Word, imazhe, MP4, MOV ose ZIP.`
      : `${file.name} is not supported. Use PDF, Excel, Word, images, MP4, MOV, or ZIP.`;
  }

  if (file.type && !allowedMimes.includes(file.type)) {
    return locale === "sq"
      ? `${file.name} ka format që nuk përputhet me prapashtesën.`
      : `${file.name} has a MIME type that does not match the extension.`;
  }

  return null;
}

export function isExcelDocument(file: File) {
  return ["xlsx", "xls"].includes(getFileExtension(file.name));
}

export async function checksumFileSha256(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const optionalNumber = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().optional(),
);

const positiveMoney = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().min(0).optional(),
);

const optionalDate = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.string().optional(),
);

export const documentMetadataSchema = z
  .object({
    title: z.string().trim().min(2, "Titulli eshte i detyrueshem."),
    category: z.enum(documentCategories),
    document_type: z.string().trim().min(2, "Lloji i dokumentit eshte i detyrueshem."),
    entity_type: z.enum(entityTypes),
    entity_id: z.string().uuid().optional().or(z.literal("")),
    document_number: z.string().trim().optional(),
    expires_at: optionalDate,
    confidentiality_level: z.enum(confidentialityLevels).default("internal"),
    notes: z.string().trim().optional(),
  })
  .superRefine((value, context) => {
    if (!["template", "general"].includes(value.entity_type) && !value.entity_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Lidhe dokumentin me prone, pronar, lead, oferte ose kontrate.",
        path: ["entity_id"],
      });
    }

    if (
      ["Identifikimi", "Oferta", "Kontrata"].includes(value.category) &&
      !value.document_type
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Lloji i dokumentit eshte i detyrueshem per kete kategori.",
        path: ["document_type"],
      });
    }
  });

export const offerSchema = z
  .object({
    property_id: z.string().uuid("Zgjidh pronen."),
    title: z.string().trim().min(2, "Titulli i ofertes eshte i detyrueshem."),
    owner_name: z.string().trim().optional(),
    land_area: optionalNumber,
    owner_percentage: z.coerce.number().gt(0).lt(100),
    investor_percentage: z.coerce.number().gt(0).lt(100),
    estimated_sale_price: positiveMoney,
    valid_until: optionalDate,
    notes: z.string().trim().optional(),
  })
  .superRefine((value, context) => {
    if (Math.round((value.owner_percentage + value.investor_percentage) * 100) / 100 !== 100) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Perqindja e pronarit dhe investitorit duhet te bejne 100%.",
        path: ["investor_percentage"],
      });
    }

    if (value.valid_until) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const validUntil = new Date(value.valid_until);
      if (validUntil < today) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Afati i ofertes nuk mund te jete ne te kaluaren.",
          path: ["valid_until"],
        });
      }
    }
  });

export const contractSchema = z
  .object({
    contract_type: z.enum(contractTypes),
    title: z.string().trim().min(2, "Titulli i kontrates eshte i detyrueshem."),
    property_id: z.string().uuid().optional().or(z.literal("")),
    party_a: z.string().trim().min(2, "Pala e pare eshte e detyrueshme."),
    party_b: z.string().trim().min(2, "Pala e dyte eshte e detyrueshme."),
    amount: positiveMoney,
    currency: z.string().trim().default("EUR"),
    start_date: optionalDate,
    end_date: optionalDate,
    notes: z.string().trim().optional(),
  })
  .superRefine((value, context) => {
    const propertyRequiredTypes: ContractType[] = [
      "rent_contract",
      "buying_contract",
      "reservation_contract",
      "owner_mandate_contract",
      "handover_protocol",
    ];

    if (propertyRequiredTypes.includes(value.contract_type) && !value.property_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Prona eshte e detyrueshme per kete kontrate.",
        path: ["property_id"],
      });
    }

    if (value.start_date && value.end_date && new Date(value.end_date) <= new Date(value.start_date)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data e perfundimit duhet te jete pas dates se fillimit.",
        path: ["end_date"],
      });
    }

    if (
      ["rent_contract", "buying_contract", "reservation_contract"].includes(value.contract_type) &&
      (value.amount == null || value.amount <= 0)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Shuma duhet te jete me e madhe se zero.",
        path: ["amount"],
      });
    }
  });

export function getDocumentStatusTone(status: string) {
  if (["Approved", "Signed", "Generated"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["Pending Review", "Needs Changes", "Expiring Soon"].includes(status)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["Rejected", "Expired", "Quarantined"].includes(status)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (status === "Archived") {
    return "border-slate-200 bg-slate-100 text-slate-500";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function getOfferStatusTone(status: string) {
  if (["Approved", "Accepted"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["Pending Approval", "Sent to Owner"].includes(status)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "Rejected") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function getContractStatusTone(status: string) {
  if (["Approved", "Signed", "Active", "Completed"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    [
      "Pending Legal Review",
      "Pending Finance Review",
      "Pending Manager Approval",
      "Sent for Signature",
      "Partially Signed",
      "Expiring Soon",
      "Notary Scheduled",
      "Closing in Progress",
    ].includes(status)
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["Rejected", "Expired", "Terminated", "Cancelled", "Signature Declined"].includes(status)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function formatContractType(type: string, locale: Locale = "sq") {
  const labels: Record<string, { en: string; sq: string }> = {
    rent_contract: { sq: "Kontratë qiraje", en: "Rent contract" },
    buying_contract: { sq: "Kontratë shitblerjeje", en: "Buying contract" },
    reservation_contract: { sq: "Kontratë rezervimi", en: "Reservation agreement" },
    owner_mandate_contract: { sq: "Kontratë ndërmjetësimi pronari", en: "Owner mandate contract" },
    buyer_brokerage_contract: { sq: "Kontratë ndërmjetësimi blerësi", en: "Buyer brokerage contract" },
    tenant_brokerage_contract: { sq: "Kontratë ndërmjetësimi qiramarrësi", en: "Tenant brokerage contract" },
    commission_agreement: { sq: "Marrëveshje komisioni", en: "Commission agreement" },
    annex: { sq: "Aneks kontrate", en: "Contract annex" },
    handover_protocol: { sq: "Akt-dorëzim", en: "Handover protocol" },
    termination_agreement: { sq: "Marrëveshje përfundimi", en: "Termination agreement" },
  };

  return labels[type]?.[locale] || type;
}

export function getContractTransactionScope(contractType: ContractType | string) {
  if (["rent_contract", "tenant_brokerage_contract"].includes(contractType)) {
    return "rental";
  }

  if (["buying_contract", "buyer_brokerage_contract"].includes(contractType)) {
    return "sale";
  }

  return "neutral";
}

export function isContractCompatibleWithTransaction(
  contractType: ContractType | string,
  transactionType: PropertyTransactionType | null | undefined,
) {
  const scope = getContractTransactionScope(contractType);

  if (!transactionType || scope === "neutral") {
    return true;
  }

  if (scope === "rental") {
    return transactionType === "rent" || transactionType === "rent_to_own";
  }

  return transactionType === "sale";
}

export function formatContractTransactionMismatch(
  contractType: ContractType | string,
  transactionType: PropertyTransactionType | null | undefined,
  locale: Locale = "sq",
) {
  if (isContractCompatibleWithTransaction(contractType, transactionType)) {
    return null;
  }

  const contractLabel = formatContractType(contractType, locale);
  const listingLabel =
    transactionType === "rent" || transactionType === "rent_to_own"
      ? locale === "sq"
        ? "listim me qira"
        : "rental listing"
      : locale === "sq"
        ? "listim per shitje"
        : "sale listing";

  return locale === "sq"
    ? `${contractLabel} nuk perputhet me kete ${listingLabel}. Zgjidh kontraten e duhur ose krijo listim te lidhur.`
    : `${contractLabel} does not match this ${listingLabel}. Choose the correct contract or create a linked listing.`;
}

export function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) {
    return "-";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function canTransitionDocument(from: string, to: string) {
  const allowed: Record<string, string[]> = {
    Draft: ["Pending Review", "Archived"],
    Uploaded: ["Pending Review", "Archived"],
    "Pending Review": ["Approved", "Rejected", "Needs Changes"],
    Approved: ["Archived", "Expiring Soon", "Expired"],
    Rejected: ["Archived"],
    "Needs Changes": ["Pending Review", "Archived"],
    Signed: ["Archived", "Expiring Soon", "Expired"],
    "Expiring Soon": ["Expired", "Archived"],
    Expired: ["Archived"],
    Archived: ["Draft", "Uploaded", "Approved", "Signed"],
  };

  return allowed[from]?.includes(to) ?? false;
}

export function createContractNumber() {
  const now = new Date();
  const stamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");

  return `PX-K-${stamp}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}
