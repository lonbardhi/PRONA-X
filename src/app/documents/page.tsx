import Link from "next/link";
import {
  ClipboardCheck,
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderKanban,
  Gavel,
  ImageIcon,
  Search,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import {
  completeContractAction,
  createContractAction,
  createDocumentVersionAction,
  createOfferAction,
  updateContractStatusAction,
  updateDocumentStatusAction,
  updateOfferStatusAction,
  uploadDocumentAction,
  uploadSignedContractAction,
} from "@/app/documents/actions";
import { DashboardShell } from "@/components/DashboardShell";
import { SetupNotice } from "@/components/SetupNotice";
import {
  confidentialityLevels,
  contractTypes,
  documentCategories,
  documentStorageBucket,
  documentTypeOptions,
  entityTypes,
  formatConfidentialityLevel,
  formatBytes,
  formatContractType,
  formatContractTransactionMismatch,
  formatContractStatus,
  formatDate,
  formatDocumentCategory,
  formatDocumentStatus,
  formatDocumentType,
  formatEntityType,
  formatOfferStatus,
  getContractStatusTone,
  getDocumentStatusTone,
  getOfferStatusTone,
} from "@/lib/documents-contracts";
import { hasSupabaseEnv } from "@/lib/env";
import type { Locale } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import type { PropertyTransactionType } from "@/lib/properties";
import { requireApprovedUser } from "@/lib/supabase/server";

type DocumentsPageProps = {
  searchParams: Promise<{
    category?: string;
    entity_id?: string;
    entity_type?: string;
    message?: string;
    q?: string;
    status?: string;
    tab?: string;
  }>;
};

type PropertyOption = {
  id: string;
  title: string | null;
  type: string | null;
  status: string | null;
  city: string | null;
  neighborhood: string | null;
  plot_size_m2?: number | null;
  transaction_type: PropertyTransactionType | null;
};

type DocumentRow = {
  id: string;
  title: string;
  category: string;
  document_type: string;
  status: string;
  confidentiality_level: string;
  document_number: string | null;
  expires_at: string | null;
  current_version_id: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archive_reason: string | null;
};

type DocumentVersionRow = {
  id: string;
  document_id: string;
  version_number: number;
  storage_key: string;
  original_file_name: string;
  file_size: number;
  mime_type: string;
  file_extension: string;
  status: string;
  created_at: string;
};

type DocumentLinkRow = {
  id: string;
  document_id: string;
  entity_type: string;
  entity_id: string;
};

type OfferRow = {
  id: string;
  property_id: string;
  title: string;
  status: string;
  owner_percentage: number | null;
  investor_percentage: number | null;
  estimated_sale_price: number | null;
  valid_until: string | null;
  created_by_user_id: string | null;
  created_at: string;
  archived_at: string | null;
};

type OfferVersionRow = {
  id: string;
  offer_id: string;
  version_number: number;
  status: string;
  excel_document_id: string | null;
  pdf_document_id: string | null;
  created_at: string;
};

type ContractRow = {
  id: string;
  contract_number: string;
  title: string;
  contract_type: string;
  status: string;
  property_id: string | null;
  created_by_user_id: string | null;
  assigned_agent_id: string | null;
  start_date: string | null;
  end_date: string | null;
  signed_at: string | null;
  created_at: string;
  archived_at: string | null;
};

type ContractPartyRow = {
  id: string;
  contract_id: string;
  party_role: string;
  display_name: string | null;
  signature_status: string;
};

type ChecklistItemRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  required_document_type: string;
  status: string;
};

const documentsCopy = {
  sq: {
    accepted: "Pranuar",
    allCategories: "Të gjitha kategoritë",
    allStatuses: "Të gjitha statuset",
    approve: "Aprovo",
    auditBody: "Ngarkimet, versionet, aprovimet dhe nënshkrimet regjistrohen si aktivitet.",
    auditTitle: "Audit",
    contractCreateDescription: "Projekt-kontratë, palë dhe rishikim ligjor.",
    contractCreateTitle: "Krijo kontratë",
    contractEmpty:
      "Nuk ka kontrata në këtë pamje. Krijo projekt-kontratë, shto palët dhe dërgoje për rishikim ligjor.",
    contractLifecycleDescription:
      "Cikli i kontratës, palët, rishikimi ligjor/menaxherial dhe nënshkrimi manual.",
    contractsTitle: "Kontrata",
    documentCenterDescription:
      "Versionim, shikim, shkarkim, aprovim dhe lidhje me rekordet CRM.",
    documentCenterTitle: "Qendra e dokumenteve",
    documentEmpty:
      "Ngarko dokumente, lidhi me prona/oferta/kontrata dhe dërgoji për rishikim kur janë gati.",
    documentEmptyTitle: "Nuk ka dokumente për këtë pamje",
    filter: "Filtro",
    file: "Skedar",
    files: "Skedarët",
    fileHint: "Maksimumi 50 MB për skedar. Skedarët ruhen privatisht.",
    headerBadge: "PRONA X Dokumente",
    headerSubtitle:
      "Menaxho dokumente private, oferta Excel për pronarë, aprovime dhe ciklin e kontratave pa i trajtuar si skedarë të izoluar.",
    headerTitle: "Dokumente, Oferta & Kontrata",
    linkWith: "Lidhe me",
    amount: "Shuma",
    chooseProperty: "Zgjidh pronën",
    contractNotesPlaceholder: "Terma, kushte, noteri, pagesa...",
    contractTitlePlaceholder: "Titulli i kontratës",
    contractType: "Lloji i kontratës",
    currency: "Valuta",
    endDate: "Data e mbarimit",
    estimatedValuePlaceholder: "Vlerë e pritshme",
    excelFile: "Excel i ofertës",
    investorPercentagePlaceholder: "Investitor %",
    landAreaPlaceholder: "Sipërfaqe toke",
    missingBody: (count: number) => `${count} elemente të listës së kontrollit nuk janë të aprovuara.`,
    missingTitle: "Dokumente që mungojnë",
    noLink: "Pa lidhje",
    noParties: "Palët nuk janë vendosur",
    noProperty: "Pa pronë",
    notes: "Shënime",
    notesPlaceholder: "Kontekst, burim, arsye rishikimi...",
    number: "Numri",
    offerCreateDescription: "Përqindje pronari/investitori + Excel.",
    offerCreateTitle: "Krijo ofertë",
    offerTitlePlaceholder: "Titulli i ofertës",
    offerEmpty:
      "Nuk ka oferta në këtë pamje. Krijo një ofertë me përqindje dhe Excel kur prona e pronarit është gati për negocim.",
    offerSectionDescription: "Ofertat janë rekorde komerciale me Excel, versionim dhe aprovim.",
    offersTitle: "Oferta për pronarë",
    operationalControl: "Kontroll operativ",
    owner: "Pronar",
    ownerPercentagePlaceholder: "Pronar %",
    ownerRepresentativePlaceholder: "Pronari / përfaqësuesi",
    partyA: "Pala A",
    partyB: "Pala B",
    preview: "Shiko",
    property: "Prona",
    record: "Rekordi",
    reject: "Refuzo",
    saveRuleBody: "Skedarët ruhen në hapësirë private dhe hapen me lidhje të përkohshme.",
    saveRuleTitle: "Rregulli i ruajtjes",
    searchPlaceholder: "Kërko titull, numër dokumenti, pronë...",
    sent: "Dërguar",
    sendForApproval: "Dërgo për aprovim",
    sendForLegal: "Dërgo për rishikim ligjor",
    setupBody:
      "Hap Supabase SQL Editor, ekzekuto supabase/migrations/0017_documents_offers_contracts.sql dhe rifresko këtë faqe.",
    setupTitle: "Nevojitet konfigurim Supabase.",
    signedPdf: "Ngarko PDF të firmosur",
    size: "Madhësia",
    startDate: "Data e fillimit",
    statDocuments: "Për rishikim",
    statLegal: "Ligjore",
    statOffers: "Oferta",
    statSignatures: "Nënshkrime",
    storageFormats: "PDF, Excel, Word, imazhe, video ose ZIP.",
    tabAll: "Të gjitha dokumentet",
    tabApprovals: "Në pritje për aprovim",
    tabArchive: "Arkiva",
    tabContracts: "Kontrata",
    tabOffers: "Oferta për pronarë",
    tabOwnerDocs: "Dokumente pronari",
    tabPropertyDocs: "Dokumente prone",
    tabSignatures: "Në pritje për nënshkrim",
    title: "Titulli",
    upload: "Ngarko",
    uploadDocument: "Ngarko dokument",
    validUntil: "E vlefshme deri",
    value: "Vlerë",
    version: "Version",
  },
  en: {
    accepted: "Accepted",
    allCategories: "All categories",
    allStatuses: "All statuses",
    approve: "Approve",
    auditBody: "Uploads, versions, approvals, and signatures are recorded as activity.",
    auditTitle: "Audit",
    contractCreateDescription: "Draft, parties, and legal review.",
    contractCreateTitle: "Create contract",
    contractEmpty:
      "No contracts in this view. Create a draft contract, add parties, and send it for legal review.",
    contractLifecycleDescription:
      "Contract lifecycle, parties, legal/manager review, and manual signature tracking.",
    contractsTitle: "Contracts",
    documentCenterDescription:
      "Versioning, preview, download, approval, and CRM record linking.",
    documentCenterTitle: "Document center",
    documentEmpty:
      "Upload documents, link them to properties/offers/contracts, and submit them for review when ready.",
    documentEmptyTitle: "No documents in this view",
    filter: "Filter",
    file: "File",
    files: "Files",
    fileHint: "Maximum 50 MB per file. Files are stored privately.",
    headerBadge: "PRONA X Documents",
    headerSubtitle:
      "Manage private documents, Excel owner offers, approvals, and contract lifecycles without treating them as isolated files.",
    headerTitle: "Documents, Offers & Contracts",
    linkWith: "Link with",
    amount: "Amount",
    chooseProperty: "Choose property",
    contractNotesPlaceholder: "Terms, conditions, notary, payments...",
    contractTitlePlaceholder: "Contract title",
    contractType: "Contract type",
    currency: "Currency",
    endDate: "End date",
    estimatedValuePlaceholder: "Estimated value",
    excelFile: "Offer Excel",
    investorPercentagePlaceholder: "Investor %",
    landAreaPlaceholder: "Land area",
    missingBody: (count: number) => `${count} checklist items are not approved.`,
    missingTitle: "Missing documents",
    noLink: "No link",
    noParties: "Parties are not set",
    noProperty: "No property",
    notes: "Notes",
    notesPlaceholder: "Context, source, review reason...",
    number: "Number",
    offerCreateDescription: "Owner/investor percentages + Excel.",
    offerCreateTitle: "Create offer",
    offerTitlePlaceholder: "Offer title",
    offerEmpty:
      "No offers in this view. Create a percentage-based Excel offer when the owner property is ready for negotiation.",
    offerSectionDescription: "Offers are commercial records with Excel files, versioning, and approval.",
    offersTitle: "Owner offers",
    operationalControl: "Operational control",
    owner: "Owner",
    ownerPercentagePlaceholder: "Owner %",
    ownerRepresentativePlaceholder: "Owner / representative",
    partyA: "Party A",
    partyB: "Party B",
    preview: "Preview",
    property: "Property",
    record: "Record",
    reject: "Reject",
    saveRuleBody: "Files are stored in a private bucket and opened through temporary URLs.",
    saveRuleTitle: "Storage rule",
    searchPlaceholder: "Search title, document number, property...",
    sent: "Sent",
    sendForApproval: "Send for approval",
    sendForLegal: "Send for legal",
    setupBody:
      "Open Supabase SQL Editor, run supabase/migrations/0017_documents_offers_contracts.sql, then refresh this page.",
    setupTitle: "Supabase setup required.",
    signedPdf: "Upload signed PDF",
    size: "Size",
    startDate: "Start date",
    statDocuments: "Doc. review",
    statLegal: "Legal",
    statOffers: "Offers",
    statSignatures: "Signatures",
    storageFormats: "PDF, Excel, Word, images, video, or ZIP.",
    tabAll: "All documents",
    tabApprovals: "Pending approval",
    tabArchive: "Archive",
    tabContracts: "Contracts",
    tabOffers: "Owner offers",
    tabOwnerDocs: "Owner documents",
    tabPropertyDocs: "Property documents",
    tabSignatures: "Pending signature",
    title: "Title",
    upload: "Upload",
    uploadDocument: "Upload document",
    validUntil: "Valid until",
    value: "Value",
    version: "Version",
  },
} satisfies Record<Locale, Record<string, string | ((count: number) => string)>>;

function getDocumentsCopy(locale: Locale) {
  return documentsCopy[locale];
}

function getTabs(locale: Locale) {
  const copy = getDocumentsCopy(locale);

  return [
    { value: "all", label: copy.tabAll as string },
    { value: "property-docs", label: copy.tabPropertyDocs as string },
    { value: "owner-docs", label: copy.tabOwnerDocs as string },
    { value: "offers", label: copy.tabOffers as string },
    { value: "contracts", label: copy.tabContracts as string },
    { value: "approvals", label: copy.tabApprovals as string },
    { value: "signatures", label: copy.tabSignatures as string },
    { value: "archive", label: copy.tabArchive as string },
  ];
}

const setupErrorCodes = new Set(["42P01", "PGRST205", "PGRST200"]);

function isSetupError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) {
    return false;
  }

  return (
    setupErrorCodes.has(error.code || "") ||
    String(error.message || "").includes("schema cache") ||
    String(error.message || "").includes("does not exist")
  );
}

function getSearchPattern(value?: string) {
  const term = value?.trim();

  return term ? `%${term.replace(/[%_]/g, "")}%` : "";
}

function statCard(label: string, value: number, tone = "slate") {
  const tones: Record<string, string> = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    slate: "border-slate-200 bg-white text-slate-600",
  };

  return (
    <div className={`crm-card p-4 ${tones[tone] || tones.slate}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function getPropertyLabel(property: PropertyOption | undefined, locale: Locale = "sq") {
  if (!property) {
    return locale === "sq" ? "Pa pronë" : "No property";
  }

  const workflow = getPropertyWorkflowLabel(property, locale);
  const title = [workflow, property.title].filter(Boolean).join(" / ");

  return [title, property.city, property.neighborhood].filter(Boolean).join(" - ");
}

function getPropertyWorkflowLabel(property: PropertyOption | undefined, locale: Locale = "sq") {
  if (!property?.transaction_type) {
    return locale === "sq" ? "Pa modul" : "No module";
  }

  if (property.transaction_type === "rent_to_own") {
    return locale === "sq" ? "Qira + blerje" : "Rent + buy";
  }

  if (property.transaction_type === "rent") {
    return locale === "sq" ? "Qira" : "Rental";
  }

  return locale === "sq" ? "Shitje" : "Sale";
}

function getPropertyWorkflowTone(property: PropertyOption | undefined) {
  if (property?.transaction_type === "rent" || property?.transaction_type === "rent_to_own") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function formatMoney(value: number | null | undefined, locale: Locale) {
  if (value == null) {
    return "-";
  }

  return new Intl.NumberFormat(locale === "sq" ? "sq-AL" : "en-US", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(value));
}

function statusBadge(status: string, tone: string) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {status}
    </span>
  );
}

function ActionButton({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "dark" | "green" | "red" | "slate";
}) {
  const tones = {
    dark: "crm-button-primary",
    green: "crm-button-success",
    red: "crm-button-danger",
    slate: "crm-button-secondary",
  };

  return (
    <button
      className={`crm-button h-9 min-h-9 px-3 ${tones[tone]}`}
      type="submit"
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-slate-900">{children}</label>;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`crm-input text-sm ${props.className || ""}`}
    />
  );
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`crm-input text-sm ${props.className || ""}`}
    />
  );
}

function TextAreaInput(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`crm-textarea min-h-24 text-sm ${props.className || ""}`}
    />
  );
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const params = await searchParams;
  const activeTab = params.tab || "all";
  const locale = await getCurrentLocale();
  const copy = getDocumentsCopy(locale);
  const tabs = getTabs(locale);
  const { profile, supabase, user } = await requireApprovedUser();
  const canWrite = ["admin", "manager", "agent", "legal", "finance"].includes(profile.role);
  const canManage = ["admin", "manager"].includes(profile.role);
  const canLegalApprove = ["admin", "manager", "legal"].includes(profile.role);
  const searchPattern = getSearchPattern(params.q);

  let documentsQuery = supabase
    .from("documents")
    .select(
      "id,title,category,document_type,status,confidentiality_level,document_number,expires_at,current_version_id,created_by_user_id,created_at,updated_at,archived_at,archive_reason",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (activeTab !== "archive") {
    documentsQuery = documentsQuery.is("archived_at", null).neq("status", "Archived");
  } else {
    documentsQuery = documentsQuery.or("archived_at.not.is.null,status.eq.Archived");
  }

  if (params.category && documentCategories.includes(params.category as never)) {
    documentsQuery = documentsQuery.eq("category", params.category);
  }

  if (params.status) {
    documentsQuery = documentsQuery.eq("status", params.status);
  }

  if (searchPattern) {
    documentsQuery = documentsQuery.or(
      `title.ilike.${searchPattern},document_type.ilike.${searchPattern},document_number.ilike.${searchPattern},notes.ilike.${searchPattern}`,
    );
  }

  const [documentsResult, offersResult, contractsResult, propertiesResult, checklistResult] =
    await Promise.all([
      documentsQuery,
      supabase
        .from("offers")
        .select(
          "id,property_id,title,status,owner_percentage,investor_percentage,estimated_sale_price,valid_until,created_by_user_id,created_at,archived_at",
        )
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("contracts")
        .select(
          "id,contract_number,title,contract_type,status,property_id,created_by_user_id,assigned_agent_id,start_date,end_date,signed_at,created_at,archived_at",
        )
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("properties")
        .select("id,title,type,status,city,neighborhood,plot_size_m2,transaction_type")
        .order("created_at", { ascending: false })
        .limit(250),
      supabase
        .from("document_checklist_items")
        .select("id,entity_type,entity_id,required_document_type,status")
        .limit(200),
    ]);

  const setupError =
    documentsResult.error ||
    offersResult.error ||
    contractsResult.error ||
    checklistResult.error;

  if (isSetupError(setupError)) {
    return (
      <DashboardShell userEmail={user.email} userRole={profile.role}>
        <section className="mx-auto max-w-4xl px-3 py-6 sm:px-6">
          <div className="crm-card border-orange-200 bg-orange-50 p-5 text-sm leading-6 text-orange-900">
            <p className="font-semibold">{copy.setupTitle as string}</p>
            <p className="mt-2">
              {copy.setupBody as string}
            </p>
          </div>
        </section>
      </DashboardShell>
    );
  }

  const documents = (documentsResult.data || []) as DocumentRow[];
  const offers = (offersResult.data || []) as OfferRow[];
  const contracts = (contractsResult.data || []) as ContractRow[];
  const properties = (propertiesResult.data || []) as PropertyOption[];
  const checklistItems = (checklistResult.data || []) as ChecklistItemRow[];
  const propertyById = new Map(properties.map((property) => [property.id, property]));
  const documentIds = documents.map((document) => document.id);
  const currentVersionIds = documents
    .map((document) => document.current_version_id)
    .filter(Boolean) as string[];
  const offerIds = offers.map((offer) => offer.id);
  const contractIds = contracts.map((contract) => contract.id);

  const [versionsResult, linksResult, offerVersionsResult, partiesResult] = await Promise.all([
    currentVersionIds.length
      ? supabase
          .from("document_versions")
          .select(
            "id,document_id,version_number,storage_key,original_file_name,file_size,mime_type,file_extension,status,created_at",
          )
          .in("id", currentVersionIds)
      : Promise.resolve({ data: [], error: null }),
    documentIds.length
      ? supabase
          .from("document_links")
          .select("id,document_id,entity_type,entity_id")
          .in("document_id", documentIds)
      : Promise.resolve({ data: [], error: null }),
    offerIds.length
      ? supabase
          .from("offer_versions")
          .select("id,offer_id,version_number,status,excel_document_id,pdf_document_id,created_at")
          .in("offer_id", offerIds)
      : Promise.resolve({ data: [], error: null }),
    contractIds.length
      ? supabase
          .from("contract_parties")
          .select("id,contract_id,party_role,display_name,signature_status")
          .in("contract_id", contractIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const versions = (versionsResult.data || []) as DocumentVersionRow[];
  const links = (linksResult.data || []) as DocumentLinkRow[];
  const offerVersions = (offerVersionsResult.data || []) as OfferVersionRow[];
  const parties = (partiesResult.data || []) as ContractPartyRow[];
  const versionById = new Map(versions.map((version) => [version.id, version]));
  const linksByDocumentId = links.reduce<Record<string, DocumentLinkRow[]>>((acc, link) => {
    acc[link.document_id] = [...(acc[link.document_id] || []), link];
    return acc;
  }, {});
  const offerVersionsByOfferId = offerVersions.reduce<Record<string, OfferVersionRow[]>>(
    (acc, version) => {
      acc[version.offer_id] = [...(acc[version.offer_id] || []), version].sort(
        (a, b) => b.version_number - a.version_number,
      );
      return acc;
    },
    {},
  );
  const partiesByContractId = parties.reduce<Record<string, ContractPartyRow[]>>((acc, party) => {
    acc[party.contract_id] = [...(acc[party.contract_id] || []), party];
    return acc;
  }, {});

  const signedUrls = new Map<string, string>();
  for (const version of versions) {
    const { data } = await supabase.storage
      .from(documentStorageBucket)
      .createSignedUrl(version.storage_key, 600);
    if (data?.signedUrl) {
      signedUrls.set(version.id, data.signedUrl);
    }
  }

  const filteredDocuments = documents.filter((document) => {
    const documentLinks = linksByDocumentId[document.id] || [];
    if (activeTab === "property-docs") {
      return documentLinks.some((link) => link.entity_type === "property");
    }
    if (activeTab === "owner-docs") {
      return documentLinks.some((link) => link.entity_type === "owner");
    }
    if (activeTab === "approvals") {
      return ["Pending Review", "Needs Changes"].includes(document.status);
    }
    if (activeTab === "signatures") {
      return document.document_type.toLowerCase().includes("signed") || document.status === "Signed";
    }
    if (params.entity_type && params.entity_id) {
      return documentLinks.some(
        (link) => link.entity_type === params.entity_type && link.entity_id === params.entity_id,
      );
    }
    return true;
  });

  const visibleOffers = offers.filter((offer) => {
    if (activeTab === "approvals") {
      return offer.status === "Pending Approval";
    }
    if (activeTab === "archive") {
      return offer.status === "Archived" || Boolean(offer.archived_at);
    }
    return activeTab === "offers" || activeTab === "all";
  });

  const visibleContracts = contracts.filter((contract) => {
    if (activeTab === "approvals") {
      return ["Pending Legal Review", "Pending Finance Review", "Pending Manager Approval"].includes(
        contract.status,
      );
    }
    if (activeTab === "signatures") {
      return ["Sent for Signature", "Partially Signed", "Approved"].includes(contract.status);
    }
    if (activeTab === "archive") {
      return contract.status === "Archived" || Boolean(contract.archived_at);
    }
    return activeTab === "contracts" || activeTab === "all";
  });

  const pendingDocuments = documents.filter((document) => document.status === "Pending Review").length;
  const pendingOffers = offers.filter((offer) => offer.status === "Pending Approval").length;
  const pendingLegalContracts = contracts.filter(
    (contract) => contract.status === "Pending Legal Review",
  ).length;
  const pendingSignatureContracts = contracts.filter((contract) =>
    ["Approved", "Sent for Signature", "Partially Signed"].includes(contract.status),
  ).length;
  const missingChecklist = checklistItems.filter((item) =>
    ["Missing", "Rejected", "Expired"].includes(item.status),
  ).length;

  return (
    <DashboardShell userEmail={user.email} userRole={profile.role}>
      <section className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-6 sm:py-6">
        <div className="crm-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                <FolderKanban className="h-3.5 w-3.5" />
                {copy.headerBadge as string}
              </span>
              <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                {copy.headerTitle as string}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {copy.headerSubtitle as string}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[560px]">
              {statCard(copy.statDocuments as string, pendingDocuments, "amber")}
              {statCard(copy.statOffers as string, pendingOffers, "cyan")}
              {statCard(copy.statLegal as string, pendingLegalContracts, "rose")}
              {statCard(copy.statSignatures as string, pendingSignatureContracts, "emerald")}
            </div>
          </div>
        </div>

        {params.message ? (
          <div className="crm-card border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {params.message}
          </div>
        ) : null}

        <nav className="crm-card crm-scroll-area flex gap-2 overflow-x-auto p-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <Link
                className={`inline-flex h-10 shrink-0 items-center rounded-lg px-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-slate-950 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
                href={`/documents?tab=${tab.value}`}
                key={tab.value}
                prefetch={false}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-5">
            <div className="crm-card p-4">
              <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]" action="/documents">
                <input name="tab" type="hidden" value={activeTab} />
                <label className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    className="crm-input pl-9 pr-3 text-sm"
                    defaultValue={params.q || ""}
                    name="q"
                    placeholder={copy.searchPlaceholder as string}
                  />
                </label>
                <SelectInput defaultValue={params.category || ""} name="category">
                  <option value="">{copy.allCategories as string}</option>
                  {documentCategories.map((category) => (
                    <option key={category} value={category}>
                      {formatDocumentCategory(category, locale)}
                    </option>
                  ))}
                </SelectInput>
                <SelectInput defaultValue={params.status || ""} name="status">
                  <option value="">{copy.allStatuses as string}</option>
                  {[
                    "Uploaded",
                    "Pending Review",
                    "Approved",
                    "Rejected",
                    "Signed",
                    "Archived",
                  ].map((status) => (
                    <option key={status} value={status}>
                      {formatDocumentStatus(status, locale)}
                    </option>
                  ))}
                </SelectInput>
                <button className="crm-button crm-button-primary">
                  <Filter className="h-4 w-4" />
                  {copy.filter as string}
                </button>
              </form>
            </div>

            {activeTab !== "offers" && activeTab !== "contracts" ? (
              <div className="crm-card p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">{copy.documentCenterTitle as string}</h2>
                    <p className="text-sm text-slate-500">
                      {copy.documentCenterDescription as string}
                    </p>
                  </div>
                </div>

                {filteredDocuments.length ? (
                  <div className="grid gap-3">
                    {filteredDocuments.map((document) => {
                      const version = document.current_version_id
                        ? versionById.get(document.current_version_id)
                        : null;
                      const url = version ? signedUrls.get(version.id) : null;
                      const documentLinks = linksByDocumentId[document.id] || [];
                      const firstPropertyLink = documentLinks.find(
                        (link) => link.entity_type === "property",
                      );
                      const linkedProperty = firstPropertyLink
                        ? propertyById.get(firstPropertyLink.entity_id)
                        : undefined;

                      return (
                        <article
                          className="crm-card-interactive p-4"
                          key={document.id}
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {statusBadge(
                                  formatDocumentStatus(document.status, locale),
                                  getDocumentStatusTone(document.status),
                                )}
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                  {formatDocumentCategory(document.category, locale)}
                                </span>
                                <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                                  {formatDocumentType(document.document_type, locale)}
                                </span>
                              </div>
                              <h3 className="mt-3 break-words text-base font-semibold text-slate-950">
                                {document.title}
                              </h3>
                              <p className="mt-1 text-sm text-slate-500">
                                {linkedProperty
                                  ? getPropertyLabel(linkedProperty, locale)
                                  : documentLinks.length
                                    ? `${formatEntityType(documentLinks[0].entity_type, locale)}: ${documentLinks[0].entity_id}`
                                    : (copy.noLink as string)}
                              </p>
                              {linkedProperty ? (
                                <span
                                  className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getPropertyWorkflowTone(linkedProperty)}`}
                                >
                                  {getPropertyWorkflowLabel(linkedProperty, locale)}
                                </span>
                              ) : null}
                              <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                                <span>{copy.version as string}: {version?.version_number || "-"}</span>
                                <span>{copy.file as string}: {version?.original_file_name || "-"}</span>
                                <span>{copy.size as string}: {formatBytes(version?.file_size)}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {url ? (
                                <>
                                  <Link
                                    className="crm-button crm-button-secondary h-9 min-h-9 px-3"
                                    href={url}
                                    target="_blank"
                                    prefetch={false}
                                  >
                                    <ImageIcon className="h-4 w-4" />
                                    {copy.preview as string}
                                  </Link>
                                  <Link
                                    className="crm-button crm-button-secondary h-9 min-h-9 px-3"
                                    href={url}
                                    target="_blank"
                                    prefetch={false}
                                  >
                                    <Download className="h-4 w-4" />
                                    {locale === "sq" ? "Shkarko" : "Download"}
                                  </Link>
                                </>
                              ) : null}
                              {canWrite ? (
                                <form action={updateDocumentStatusAction}>
                                  <input name="return_to" type="hidden" value="/documents" />
                                  <input name="document_id" type="hidden" value={document.id} />
                                  <input name="status" type="hidden" value="Pending Review" />
                                  <ActionButton>{copy.sendForApproval as string}</ActionButton>
                                </form>
                              ) : null}
                              {canManage && document.status === "Pending Review" ? (
                                <>
                                  <form action={updateDocumentStatusAction}>
                                    <input name="return_to" type="hidden" value="/documents" />
                                    <input name="document_id" type="hidden" value={document.id} />
                                    <input name="status" type="hidden" value="Approved" />
                                    <ActionButton tone="green">{copy.approve as string}</ActionButton>
                                  </form>
                                  <form action={updateDocumentStatusAction}>
                                    <input name="return_to" type="hidden" value="/documents" />
                                    <input name="document_id" type="hidden" value={document.id} />
                                    <input name="status" type="hidden" value="Rejected" />
                                    <input name="reason" type="hidden" value="Rejected from review" />
                                    <ActionButton tone="red">{copy.reject as string}</ActionButton>
                                  </form>
                                </>
                              ) : null}
                            </div>
                          </div>

                          {canWrite ? (
                            <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                                {locale === "sq" ? "Krijo version të ri" : "Create new version"}
                              </summary>
                              <form action={createDocumentVersionAction} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                                <input name="return_to" type="hidden" value="/documents" />
                                <input name="document_id" type="hidden" value={document.id} />
                                <input
                                  className="rounded-lg border border-slate-200 bg-white p-2 text-sm"
                                  name="file"
                                  type="file"
                                />
                                <TextInput
                                  name="change_notes"
                                  placeholder={locale === "sq" ? "Çfarë ndryshoi?" : "What changed?"}
                                />
                                <ActionButton tone="dark">{locale === "sq" ? "Ruaj versionin" : "Save version"}</ActionButton>
                              </form>
                            </details>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="crm-empty-state bg-slate-50 p-8">
                    <FileArchive className="mx-auto h-10 w-10 text-slate-400" />
                    <h3 className="mt-3 text-lg font-semibold text-slate-950">
                      {copy.documentEmptyTitle as string}
                    </h3>
                    <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                      {copy.documentEmpty as string}
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {(activeTab === "all" || activeTab === "offers" || activeTab === "approvals" || activeTab === "archive") ? (
              <div className="crm-card p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                    <FileSpreadsheet className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">{copy.offersTitle as string}</h2>
                    <p className="text-sm text-slate-500">
                      {copy.offerSectionDescription as string}
                    </p>
                  </div>
                </div>
                {visibleOffers.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {visibleOffers.map((offer) => {
                      const latestVersion = offerVersionsByOfferId[offer.id]?.[0];
                      const linkedProperty = propertyById.get(offer.property_id);
                      return (
                        <article className="crm-card-interactive p-4" key={offer.id}>
                          <div className="flex flex-wrap items-center gap-2">
                            {statusBadge(formatOfferStatus(offer.status, locale), getOfferStatusTone(offer.status))}
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              v{latestVersion?.version_number || 1}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getPropertyWorkflowTone(linkedProperty)}`}
                            >
                              {getPropertyWorkflowLabel(linkedProperty, locale)}
                            </span>
                          </div>
                          <h3 className="mt-3 text-base font-semibold text-slate-950">{offer.title}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {getPropertyLabel(linkedProperty, locale)}
                          </p>
                          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                            <div className="rounded-lg bg-slate-50 p-3">
                              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{copy.owner as string}</p>
                              <p className="font-semibold text-slate-950">{offer.owner_percentage || "-"}%</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                                {locale === "sq" ? "Investitor" : "Investor"}
                              </p>
                              <p className="font-semibold text-slate-950">{offer.investor_percentage || "-"}%</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{copy.value as string}</p>
                              <p className="font-semibold text-slate-950">{formatMoney(offer.estimated_sale_price, locale)}</p>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {offer.status === "Draft" ? (
                              <form action={updateOfferStatusAction}>
                                <input name="return_to" type="hidden" value="/documents?tab=offers" />
                                <input name="offer_id" type="hidden" value={offer.id} />
                                <input name="status" type="hidden" value="Pending Approval" />
                                <ActionButton>{copy.sendForApproval as string}</ActionButton>
                              </form>
                            ) : null}
                            {canManage && offer.status === "Pending Approval" ? (
                              <form action={updateOfferStatusAction}>
                                <input name="return_to" type="hidden" value="/documents?tab=offers" />
                                <input name="offer_id" type="hidden" value={offer.id} />
                                <input name="status" type="hidden" value="Approved" />
                                <ActionButton tone="green">{copy.approve as string}</ActionButton>
                              </form>
                            ) : null}
                            {offer.status === "Approved" ? (
                              <form action={updateOfferStatusAction}>
                                <input name="return_to" type="hidden" value="/documents?tab=offers" />
                                <input name="offer_id" type="hidden" value={offer.id} />
                                <input name="status" type="hidden" value="Sent to Owner" />
                                <ActionButton>{copy.sent as string}</ActionButton>
                              </form>
                            ) : null}
                            {offer.status === "Sent to Owner" ? (
                              <form action={updateOfferStatusAction}>
                                <input name="return_to" type="hidden" value="/documents?tab=offers" />
                                <input name="offer_id" type="hidden" value={offer.id} />
                                <input name="status" type="hidden" value="Accepted" />
                                <ActionButton tone="green">{copy.accepted as string}</ActionButton>
                              </form>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="crm-empty-state border-cyan-200 bg-cyan-50 p-6 text-sm text-cyan-900">
                    {copy.offerEmpty as string}
                  </div>
                )}
              </div>
            ) : null}

            {(activeTab === "all" || activeTab === "contracts" || activeTab === "approvals" || activeTab === "signatures" || activeTab === "archive") ? (
              <div className="crm-card p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Gavel className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">{copy.contractsTitle as string}</h2>
                    <p className="text-sm text-slate-500">
                      {copy.contractLifecycleDescription as string}
                    </p>
                  </div>
                </div>
                {visibleContracts.length ? (
                  <div className="grid gap-3">
                    {visibleContracts.map((contract) => {
                      const contractParties = partiesByContractId[contract.id] || [];
                      const linkedProperty = contract.property_id
                        ? propertyById.get(contract.property_id)
                        : undefined;
                      const transactionMismatch = formatContractTransactionMismatch(
                        contract.contract_type,
                        linkedProperty?.transaction_type,
                        locale,
                      );
                      return (
                        <article className="crm-card-interactive p-4" key={contract.id}>
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                {statusBadge(
                                  formatContractStatus(contract.status, locale),
                                  getContractStatusTone(contract.status),
                                )}
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                  {formatContractType(contract.contract_type, locale)}
                                </span>
                                {linkedProperty ? (
                                  <span
                                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getPropertyWorkflowTone(linkedProperty)}`}
                                  >
                                    {getPropertyWorkflowLabel(linkedProperty, locale)}
                                  </span>
                                ) : null}
                              </div>
                              <h3 className="mt-3 text-base font-semibold text-slate-950">
                                {contract.title}
                              </h3>
                              <p className="mt-1 text-sm text-slate-500">
                                {contract.contract_number} ·{" "}
                                {linkedProperty
                                  ? getPropertyLabel(linkedProperty, locale)
                                  : (copy.noProperty as string)}
                              </p>
                              {transactionMismatch ? (
                                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                                  {transactionMismatch}
                                </p>
                              ) : null}
                              <p className="mt-2 text-sm text-slate-600">
                                {contractParties
                                  .map((party) => party.display_name)
                                  .filter(Boolean)
                                  .join(" / ") || (copy.noParties as string)}
                              </p>
                              <p className="mt-2 text-xs text-slate-500">
                                {formatDate(contract.start_date, locale)} - {formatDate(contract.end_date, locale)}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {contract.status === "Draft" ? (
                                <form action={updateContractStatusAction}>
                                  <input name="return_to" type="hidden" value="/documents?tab=contracts" />
                                  <input name="contract_id" type="hidden" value={contract.id} />
                                  <input name="status" type="hidden" value="Pending Legal Review" />
                                  <ActionButton>{copy.sendForLegal as string}</ActionButton>
                                </form>
                              ) : null}
                              {canLegalApprove && contract.status === "Pending Legal Review" ? (
                                <form action={updateContractStatusAction}>
                                  <input name="return_to" type="hidden" value="/documents?tab=contracts" />
                                  <input name="contract_id" type="hidden" value={contract.id} />
                                  <input name="status" type="hidden" value="Pending Manager Approval" />
                                  <ActionButton tone="green">
                                    {locale === "sq" ? "Legal OK" : "Legal approved"}
                                  </ActionButton>
                                </form>
                              ) : null}
                              {canManage && contract.status === "Pending Manager Approval" ? (
                                <form action={updateContractStatusAction}>
                                  <input name="return_to" type="hidden" value="/documents?tab=contracts" />
                                  <input name="contract_id" type="hidden" value={contract.id} />
                                  <input name="status" type="hidden" value="Approved" />
                                  <ActionButton tone="green">{copy.approve as string}</ActionButton>
                                </form>
                              ) : null}
                              {canWrite && ["Approved", "Sent for Signature", "Partially Signed"].includes(contract.status) ? (
                                <details className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                  <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                                    {copy.signedPdf as string}
                                  </summary>
                                  <form action={uploadSignedContractAction} className="mt-3 grid gap-2">
                                    <input name="return_to" type="hidden" value="/documents?tab=contracts" />
                                    <input name="contract_id" type="hidden" value={contract.id} />
                                    <input className="text-sm" name="signed_file" type="file" accept=".pdf,application/pdf" />
                                    <ActionButton tone="dark">{copy.upload as string}</ActionButton>
                                  </form>
                                </details>
                              ) : null}
                              {canManage && contract.status === "Signed" ? (
                                <form action={completeContractAction}>
                                  <input name="return_to" type="hidden" value="/documents?tab=contracts" />
                                  <input name="contract_id" type="hidden" value={contract.id} />
                                  <ActionButton tone="green">{locale === "sq" ? "Përfundo" : "Complete"}</ActionButton>
                                </form>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="crm-empty-state border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
                    {copy.contractEmpty as string}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <aside className="grid gap-5 self-start">
            {canWrite ? (
              <div className="crm-card p-4">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <UploadCloud className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-950">{copy.uploadDocument as string}</h2>
                    <p className="text-sm text-slate-500">{copy.storageFormats as string}</p>
                  </div>
                </div>
                <form action={uploadDocumentAction} className="grid gap-3">
                  <input name="return_to" type="hidden" value="/documents" />
                  <div className="grid gap-1.5">
                    <FieldLabel>{copy.files as string}</FieldLabel>
                    <input className="rounded-lg border border-dashed border-slate-300 p-3 text-sm" multiple name="files" type="file" />
                    <p className="text-xs text-slate-500">{copy.fileHint as string}</p>
                  </div>
                  <div className="grid gap-1.5">
                    <FieldLabel>{copy.title as string}</FieldLabel>
                    <TextInput
                      name="title"
                      placeholder={locale === "sq" ? "p.sh. Certifikatë pronësie" : "e.g. Ownership certificate"}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <div className="grid gap-1.5">
                      <FieldLabel>{locale === "sq" ? "Kategoria" : "Category"}</FieldLabel>
                      <SelectInput name="category" defaultValue="Pronesia">
                        {documentCategories.map((category) => (
                          <option key={category} value={category}>
                            {formatDocumentCategory(category, locale)}
                          </option>
                        ))}
                      </SelectInput>
                    </div>
                    <div className="grid gap-1.5">
                      <FieldLabel>{locale === "sq" ? "Lloji" : "Type"}</FieldLabel>
                      <SelectInput name="document_type" defaultValue="Property document">
                        {Object.entries(documentTypeOptions).map(([category, types]) => (
                          <optgroup key={category} label={formatDocumentCategory(category, locale)}>
                            {types.map((type) => (
                              <option key={type} value={type}>
                                {formatDocumentType(type, locale)}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </SelectInput>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <div className="grid gap-1.5">
                      <FieldLabel>{copy.linkWith as string}</FieldLabel>
                      <SelectInput name="entity_type" defaultValue={params.entity_type || "property"}>
                        {entityTypes.map((entityType) => (
                          <option key={entityType} value={entityType}>
                            {formatEntityType(entityType, locale)}
                          </option>
                        ))}
                      </SelectInput>
                    </div>
                    <div className="grid gap-1.5">
                      <FieldLabel>{copy.record as string}</FieldLabel>
                      <TextInput
                        defaultValue={params.entity_id || ""}
                        list="document-entity-options"
                        name="entity_id"
                        placeholder={locale === "sq" ? "Zgjidh pronë ose vendos UUID" : "Choose property or enter UUID"}
                      />
                      <datalist id="document-entity-options">
                        {properties.map((property) => (
                        <option key={property.id} label={getPropertyLabel(property, locale)} value={property.id} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <div className="grid gap-1.5">
                      <FieldLabel>{copy.number as string}</FieldLabel>
                      <TextInput
                        name="document_number"
                        placeholder={locale === "sq" ? "Nr. dokumenti" : "Document no."}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <FieldLabel>{locale === "sq" ? "Skadon" : "Expires"}</FieldLabel>
                      <TextInput name="expires_at" type="date" />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <FieldLabel>{locale === "sq" ? "Konfidencialiteti" : "Confidentiality"}</FieldLabel>
                    <SelectInput name="confidentiality_level" defaultValue="internal">
                      {confidentialityLevels.map((level) => (
                        <option key={level} value={level}>
                          {formatConfidentialityLevel(level, locale)}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <div className="grid gap-1.5">
                    <FieldLabel>{copy.notes as string}</FieldLabel>
                    <TextAreaInput name="notes" placeholder={copy.notesPlaceholder as string} />
                  </div>
                  <button className="crm-button crm-button-primary">
                    <UploadCloud className="h-4 w-4" />
                    {copy.uploadDocument as string}
                  </button>
                </form>
              </div>
            ) : null}

            {canWrite ? (
              <div className="crm-card p-4">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                    <FileSpreadsheet className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-950">{copy.offerCreateTitle as string}</h2>
                    <p className="text-sm text-slate-500">{copy.offerCreateDescription as string}</p>
                  </div>
                </div>
                <form action={createOfferAction} className="grid gap-3">
                  <div className="grid gap-1.5">
                    <FieldLabel>{copy.property as string}</FieldLabel>
                    <SelectInput name="property_id" required>
                      <option value="">{copy.chooseProperty as string}</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {getPropertyLabel(property, locale)}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <TextInput
                    name="title"
                    placeholder={copy.offerTitlePlaceholder as string}
                    required
                  />
                  <TextInput
                    name="owner_name"
                    placeholder={copy.ownerRepresentativePlaceholder as string}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput
                      name="owner_percentage"
                      placeholder={copy.ownerPercentagePlaceholder as string}
                      type="number"
                      step="0.01"
                      required
                    />
                    <TextInput
                      name="investor_percentage"
                      placeholder={copy.investorPercentagePlaceholder as string}
                      type="number"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput
                      name="land_area"
                      placeholder={copy.landAreaPlaceholder as string}
                      type="number"
                      step="0.01"
                    />
                    <TextInput
                      name="estimated_sale_price"
                      placeholder={copy.estimatedValuePlaceholder as string}
                      type="number"
                      step="0.01"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <FieldLabel>{copy.validUntil as string}</FieldLabel>
                    <TextInput name="valid_until" type="date" />
                  </div>
                  <div className="grid gap-1.5">
                    <FieldLabel>{copy.excelFile as string}</FieldLabel>
                    <input className="rounded-lg border border-dashed border-slate-300 p-3 text-sm" name="excel_file" type="file" accept=".xls,.xlsx" />
                  </div>
                  <TextAreaInput
                    name="notes"
                    placeholder={copy.notesPlaceholder as string}
                  />
                  <button className="crm-button crm-button-primary">
                    <FileSpreadsheet className="h-4 w-4" />
                    {copy.offerCreateTitle as string}
                  </button>
                </form>
              </div>
            ) : null}

            {canWrite ? (
              <div className="crm-card p-4">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <ClipboardCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-950">{copy.contractCreateTitle as string}</h2>
                    <p className="text-sm text-slate-500">{copy.contractCreateDescription as string}</p>
                  </div>
                </div>
                <form action={createContractAction} className="grid gap-3">
                  <div className="grid gap-1.5">
                    <FieldLabel>{copy.contractType as string}</FieldLabel>
                    <SelectInput name="contract_type" defaultValue="rent_contract">
                      {contractTypes.map((type) => (
                        <option key={type} value={type}>
                          {formatContractType(type, locale)}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <TextInput name="title" placeholder={copy.contractTitlePlaceholder as string} required />
                  <div className="grid gap-1.5">
                    <FieldLabel>{copy.property as string}</FieldLabel>
                    <SelectInput name="property_id">
                      <option value="">{copy.noProperty as string}</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {getPropertyLabel(property, locale)}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <TextInput name="party_a" placeholder={copy.partyA as string} required />
                    <TextInput name="party_b" placeholder={copy.partyB as string} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput name="amount" placeholder={copy.amount as string} type="number" step="0.01" />
                    <TextInput name="currency" aria-label={copy.currency as string} defaultValue="EUR" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <FieldLabel>{copy.startDate as string}</FieldLabel>
                      <TextInput name="start_date" type="date" />
                    </div>
                    <div className="grid gap-1.5">
                      <FieldLabel>{copy.endDate as string}</FieldLabel>
                      <TextInput name="end_date" type="date" />
                    </div>
                  </div>
                  <TextAreaInput name="notes" placeholder={copy.contractNotesPlaceholder as string} />
                  <button className="crm-button crm-button-primary">
                    <Gavel className="h-4 w-4" />
                    {copy.contractCreateTitle as string}
                  </button>
                </form>
              </div>
            ) : null}

            <div className="crm-card p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h2 className="font-semibold text-slate-950">{copy.operationalControl as string}</h2>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-600">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-slate-950">{copy.missingTitle as string}</p>
                  <p>{(copy.missingBody as (count: number) => string)(missingChecklist)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-slate-950">{copy.saveRuleTitle as string}</p>
                  <p>{copy.saveRuleBody as string}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-slate-950">{copy.auditTitle as string}</p>
                  <p>{copy.auditBody as string}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </DashboardShell>
  );
}
