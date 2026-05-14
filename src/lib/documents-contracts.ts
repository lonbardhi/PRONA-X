import { z } from "zod";

import { getIntlLocale, type Locale } from "@/lib/i18n";

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

export function validateDocumentFile(file: File) {
  if (file.size <= 0) {
    return `${file.name} eshte bosh. Ngarko nje skedar te vlefshem.`;
  }

  if (file.size > documentMaxBytes) {
    return `${file.name} eshte me i madh se 50 MB.`;
  }

  const extension = getFileExtension(file.name);
  const allowedMimes = extensionMimeMap[extension];

  if (!allowedMimes) {
    return `${file.name} nuk mbeshtetet. Perdorni PDF, Excel, Word, imazhe, MP4, MOV ose ZIP.`;
  }

  if (file.type && !allowedMimes.includes(file.type)) {
    return `${file.name} ka format qe nuk perputhet me prapashtesen.`;
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
    rent_contract: { sq: "Kontrate Qiraje", en: "Rent Contract" },
    buying_contract: { sq: "Kontrate Shitblerjeje", en: "Buying Contract" },
    reservation_contract: { sq: "Kontrate Rezervimi", en: "Reservation Agreement" },
    owner_mandate_contract: { sq: "Kontrate Ndermjetesimi Pronari", en: "Owner Mandate" },
    buyer_brokerage_contract: { sq: "Kontrate Ndermjetesimi Bleresi", en: "Buyer Brokerage" },
    tenant_brokerage_contract: { sq: "Kontrate Ndermjetesimi Qiramarresi", en: "Tenant Brokerage" },
    commission_agreement: { sq: "Marreveshje Komisioni", en: "Commission Agreement" },
    annex: { sq: "Aneks Kontrate", en: "Contract Annex" },
    handover_protocol: { sq: "Akt-Dorezim", en: "Handover Protocol" },
    termination_agreement: { sq: "Marreveshje Perfundimi", en: "Termination Agreement" },
  };

  return labels[type]?.[locale] || type;
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
