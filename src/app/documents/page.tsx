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
  formatBytes,
  formatContractType,
  formatDate,
  getContractStatusTone,
  getDocumentStatusTone,
  getOfferStatusTone,
} from "@/lib/documents-contracts";
import { hasSupabaseEnv } from "@/lib/env";
import { getCurrentLocale } from "@/lib/i18n-server";
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

const tabs = [
  { value: "all", label: "Të gjitha dokumentet" },
  { value: "property-docs", label: "Dokumente prone" },
  { value: "owner-docs", label: "Dokumente pronari" },
  { value: "offers", label: "Oferta për pronarë" },
  { value: "contracts", label: "Kontrata" },
  { value: "approvals", label: "Në pritje për aprovim" },
  { value: "signatures", label: "Në pritje për nënshkrim" },
  { value: "archive", label: "Arkiva" },
];

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
    <div className={`rounded-xl border p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function getPropertyLabel(property: PropertyOption | undefined) {
  if (!property) {
    return "Pa pronë";
  }

  return [property.title, property.city, property.neighborhood].filter(Boolean).join(" - ");
}

function formatMoney(value: number | null | undefined) {
  if (value == null) {
    return "-";
  }

  return new Intl.NumberFormat("sq-AL", {
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
    dark: "border-slate-950 bg-slate-950 text-white hover:bg-slate-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    red: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    slate: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  };

  return (
    <button
      className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition ${tones[tone]}`}
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
      className={`h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 ${props.className || ""}`}
    />
  );
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 ${props.className || ""}`}
    />
  );
}

function TextAreaInput(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 ${props.className || ""}`}
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
        .select("id,title,type,status,city,neighborhood,plot_size_m2")
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
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 text-sm leading-6 text-orange-900">
            <p className="font-semibold">Nevojitet konfigurim Supabase.</p>
            <p className="mt-2">
              Run{" "}
              <span className="font-mono">supabase/migrations/0017_documents_offers_contracts.sql</span>{" "}
              in Supabase SQL Editor, then refresh this page.
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
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                <FolderKanban className="h-3.5 w-3.5" />
                PRONA X Dokumente
              </span>
              <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                Dokumente, Oferta & Kontrata
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Menaxho dokumente private, oferta Excel për pronarë, aprovime dhe ciklin e
                kontratave pa i trajtuar si skedarë të izoluar.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[560px]">
              {statCard("Dok. review", pendingDocuments, "amber")}
              {statCard("Oferta", pendingOffers, "cyan")}
              {statCard("Legal", pendingLegalContracts, "rose")}
              {statCard("Nënshkrime", pendingSignatureContracts, "emerald")}
            </div>
          </div>
        </div>

        {params.message ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {params.message}
          </div>
        ) : null}

        <nav className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]" action="/documents">
                <input name="tab" type="hidden" value={activeTab} />
                <label className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-slate-400"
                    defaultValue={params.q || ""}
                    name="q"
                    placeholder="Kërko titull, numër dokumenti, pronë..."
                  />
                </label>
                <SelectInput defaultValue={params.category || ""} name="category">
                  <option value="">Të gjitha kategoritë</option>
                  {documentCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </SelectInput>
                <SelectInput defaultValue={params.status || ""} name="status">
                  <option value="">Të gjitha statuset</option>
                  {[
                    "Uploaded",
                    "Pending Review",
                    "Approved",
                    "Rejected",
                    "Signed",
                    "Archived",
                  ].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </SelectInput>
                <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
                  <Filter className="h-4 w-4" />
                  Filtro
                </button>
              </form>
            </div>

            {activeTab !== "offers" && activeTab !== "contracts" ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Qendra e dokumenteve</h2>
                    <p className="text-sm text-slate-500">
                      Versionim, preview, shkarkim, aprovim dhe lidhje me rekordet CRM.
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
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                          key={document.id}
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {statusBadge(document.status, getDocumentStatusTone(document.status))}
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                  {document.category}
                                </span>
                                <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                                  {document.document_type}
                                </span>
                              </div>
                              <h3 className="mt-3 break-words text-base font-semibold text-slate-950">
                                {document.title}
                              </h3>
                              <p className="mt-1 text-sm text-slate-500">
                                {linkedProperty
                                  ? getPropertyLabel(linkedProperty)
                                  : documentLinks.length
                                    ? `${documentLinks[0].entity_type}: ${documentLinks[0].entity_id}`
                                    : "Pa lidhje"}
                              </p>
                              <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                                <span>Version: {version?.version_number || "-"}</span>
                                <span>Skedar: {version?.original_file_name || "-"}</span>
                                <span>Madhësia: {formatBytes(version?.file_size)}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {url ? (
                                <>
                                  <Link
                                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                    href={url}
                                    target="_blank"
                                    prefetch={false}
                                  >
                                    <ImageIcon className="h-4 w-4" />
                                    Shiko
                                  </Link>
                                  <Link
                                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                    href={url}
                                    target="_blank"
                                    prefetch={false}
                                  >
                                    <Download className="h-4 w-4" />
                                    Shkarko
                                  </Link>
                                </>
                              ) : null}
                              {canWrite ? (
                                <form action={updateDocumentStatusAction}>
                                  <input name="return_to" type="hidden" value="/documents" />
                                  <input name="document_id" type="hidden" value={document.id} />
                                  <input name="status" type="hidden" value="Pending Review" />
                                  <ActionButton>Dërgo për aprovim</ActionButton>
                                </form>
                              ) : null}
                              {canManage && document.status === "Pending Review" ? (
                                <>
                                  <form action={updateDocumentStatusAction}>
                                    <input name="return_to" type="hidden" value="/documents" />
                                    <input name="document_id" type="hidden" value={document.id} />
                                    <input name="status" type="hidden" value="Approved" />
                                    <ActionButton tone="green">Aprovo</ActionButton>
                                  </form>
                                  <form action={updateDocumentStatusAction}>
                                    <input name="return_to" type="hidden" value="/documents" />
                                    <input name="document_id" type="hidden" value={document.id} />
                                    <input name="status" type="hidden" value="Rejected" />
                                    <input name="reason" type="hidden" value="Rejected from review" />
                                    <ActionButton tone="red">Refuzo</ActionButton>
                                  </form>
                                </>
                              ) : null}
                            </div>
                          </div>

                          {canWrite ? (
                            <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                                Krijo version të ri
                              </summary>
                              <form action={createDocumentVersionAction} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                                <input name="return_to" type="hidden" value="/documents" />
                                <input name="document_id" type="hidden" value={document.id} />
                                <input
                                  className="rounded-lg border border-slate-200 bg-white p-2 text-sm"
                                  name="file"
                                  type="file"
                                />
                                <TextInput name="change_notes" placeholder="Çfarë ndryshoi?" />
                                <ActionButton tone="dark">Ruaj versionin</ActionButton>
                              </form>
                            </details>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <FileArchive className="mx-auto h-10 w-10 text-slate-400" />
                    <h3 className="mt-3 text-lg font-semibold text-slate-950">
                      Nuk ka dokumente për këtë pamje
                    </h3>
                    <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                      Ngarko dokumente, lidhi me prona/oferta/kontrata dhe dërgoji për review kur janë gati.
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {(activeTab === "all" || activeTab === "offers" || activeTab === "approvals" || activeTab === "archive") ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                    <FileSpreadsheet className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Oferta për pronarë</h2>
                    <p className="text-sm text-slate-500">
                      Oferta janë rekorde komerciale me Excel, versionim dhe aprovim.
                    </p>
                  </div>
                </div>
                {visibleOffers.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {visibleOffers.map((offer) => {
                      const latestVersion = offerVersionsByOfferId[offer.id]?.[0];
                      return (
                        <article className="rounded-xl border border-slate-200 p-4" key={offer.id}>
                          <div className="flex flex-wrap items-center gap-2">
                            {statusBadge(offer.status, getOfferStatusTone(offer.status))}
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              v{latestVersion?.version_number || 1}
                            </span>
                          </div>
                          <h3 className="mt-3 text-base font-semibold text-slate-950">{offer.title}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {getPropertyLabel(propertyById.get(offer.property_id))}
                          </p>
                          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                            <div className="rounded-lg bg-slate-50 p-3">
                              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Pronar</p>
                              <p className="font-semibold text-slate-950">{offer.owner_percentage || "-"}%</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Investor</p>
                              <p className="font-semibold text-slate-950">{offer.investor_percentage || "-"}%</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Vlerë</p>
                              <p className="font-semibold text-slate-950">{formatMoney(offer.estimated_sale_price)}</p>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {offer.status === "Draft" ? (
                              <form action={updateOfferStatusAction}>
                                <input name="return_to" type="hidden" value="/documents?tab=offers" />
                                <input name="offer_id" type="hidden" value={offer.id} />
                                <input name="status" type="hidden" value="Pending Approval" />
                                <ActionButton>Dërgo për aprovim</ActionButton>
                              </form>
                            ) : null}
                            {canManage && offer.status === "Pending Approval" ? (
                              <form action={updateOfferStatusAction}>
                                <input name="return_to" type="hidden" value="/documents?tab=offers" />
                                <input name="offer_id" type="hidden" value={offer.id} />
                                <input name="status" type="hidden" value="Approved" />
                                <ActionButton tone="green">Aprovo</ActionButton>
                              </form>
                            ) : null}
                            {offer.status === "Approved" ? (
                              <form action={updateOfferStatusAction}>
                                <input name="return_to" type="hidden" value="/documents?tab=offers" />
                                <input name="offer_id" type="hidden" value={offer.id} />
                                <input name="status" type="hidden" value="Sent to Owner" />
                                <ActionButton>Dërguar</ActionButton>
                              </form>
                            ) : null}
                            {offer.status === "Sent to Owner" ? (
                              <form action={updateOfferStatusAction}>
                                <input name="return_to" type="hidden" value="/documents?tab=offers" />
                                <input name="offer_id" type="hidden" value={offer.id} />
                                <input name="status" type="hidden" value="Accepted" />
                                <ActionButton tone="green">Pranuar</ActionButton>
                              </form>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-cyan-200 bg-cyan-50 p-6 text-sm text-cyan-900">
                    Nuk ka oferta në këtë pamje. Krijo një ofertë me përqindje dhe Excel kur prona e pronarit është gati për negocim.
                  </div>
                )}
              </div>
            ) : null}

            {(activeTab === "all" || activeTab === "contracts" || activeTab === "approvals" || activeTab === "signatures" || activeTab === "archive") ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Gavel className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Kontrata</h2>
                    <p className="text-sm text-slate-500">
                      Lifecycle, palë, review ligjor/menaxherial dhe nënshkrim manual.
                    </p>
                  </div>
                </div>
                {visibleContracts.length ? (
                  <div className="grid gap-3">
                    {visibleContracts.map((contract) => {
                      const contractParties = partiesByContractId[contract.id] || [];
                      return (
                        <article className="rounded-xl border border-slate-200 p-4" key={contract.id}>
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                {statusBadge(contract.status, getContractStatusTone(contract.status))}
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                  {formatContractType(contract.contract_type, locale)}
                                </span>
                              </div>
                              <h3 className="mt-3 text-base font-semibold text-slate-950">
                                {contract.title}
                              </h3>
                              <p className="mt-1 text-sm text-slate-500">
                                {contract.contract_number} · {contract.property_id ? getPropertyLabel(propertyById.get(contract.property_id)) : "Pa pronë"}
                              </p>
                              <p className="mt-2 text-sm text-slate-600">
                                {contractParties
                                  .map((party) => party.display_name)
                                  .filter(Boolean)
                                  .join(" / ") || "Palët nuk janë vendosur"}
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
                                  <ActionButton>Dërgo për legal</ActionButton>
                                </form>
                              ) : null}
                              {canLegalApprove && contract.status === "Pending Legal Review" ? (
                                <form action={updateContractStatusAction}>
                                  <input name="return_to" type="hidden" value="/documents?tab=contracts" />
                                  <input name="contract_id" type="hidden" value={contract.id} />
                                  <input name="status" type="hidden" value="Pending Manager Approval" />
                                  <ActionButton tone="green">Legal OK</ActionButton>
                                </form>
                              ) : null}
                              {canManage && contract.status === "Pending Manager Approval" ? (
                                <form action={updateContractStatusAction}>
                                  <input name="return_to" type="hidden" value="/documents?tab=contracts" />
                                  <input name="contract_id" type="hidden" value={contract.id} />
                                  <input name="status" type="hidden" value="Approved" />
                                  <ActionButton tone="green">Aprovo</ActionButton>
                                </form>
                              ) : null}
                              {canWrite && ["Approved", "Sent for Signature", "Partially Signed"].includes(contract.status) ? (
                                <details className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                  <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                                    Ngarko PDF të firmosur
                                  </summary>
                                  <form action={uploadSignedContractAction} className="mt-3 grid gap-2">
                                    <input name="return_to" type="hidden" value="/documents?tab=contracts" />
                                    <input name="contract_id" type="hidden" value={contract.id} />
                                    <input className="text-sm" name="signed_file" type="file" accept=".pdf,application/pdf" />
                                    <ActionButton tone="dark">Ngarko</ActionButton>
                                  </form>
                                </details>
                              ) : null}
                              {canManage && contract.status === "Signed" ? (
                                <form action={completeContractAction}>
                                  <input name="return_to" type="hidden" value="/documents?tab=contracts" />
                                  <input name="contract_id" type="hidden" value={contract.id} />
                                  <ActionButton tone="green">Përfundo</ActionButton>
                                </form>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
                    Nuk ka kontrata në këtë pamje. Krijo draft kontrate, shto palët dhe dërgoje për review ligjor.
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <aside className="grid gap-5 self-start">
            {canWrite ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <UploadCloud className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-950">Ngarko dokument</h2>
                    <p className="text-sm text-slate-500">PDF, Excel, Word, imazhe, video ose ZIP.</p>
                  </div>
                </div>
                <form action={uploadDocumentAction} className="grid gap-3">
                  <input name="return_to" type="hidden" value="/documents" />
                  <div className="grid gap-1.5">
                    <FieldLabel>Skedarët</FieldLabel>
                    <input className="rounded-lg border border-dashed border-slate-300 p-3 text-sm" multiple name="files" type="file" />
                    <p className="text-xs text-slate-500">Maksimumi 50 MB për skedar. Skedarët ruhen privatisht.</p>
                  </div>
                  <div className="grid gap-1.5">
                    <FieldLabel>Titulli</FieldLabel>
                    <TextInput name="title" placeholder="p.sh. Certifikatë pronësie" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <div className="grid gap-1.5">
                      <FieldLabel>Kategoria</FieldLabel>
                      <SelectInput name="category" defaultValue="Pronesia">
                        {documentCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </SelectInput>
                    </div>
                    <div className="grid gap-1.5">
                      <FieldLabel>Lloji</FieldLabel>
                      <SelectInput name="document_type" defaultValue="Property document">
                        {Object.entries(documentTypeOptions).map(([category, types]) => (
                          <optgroup key={category} label={category}>
                            {types.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </SelectInput>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <div className="grid gap-1.5">
                      <FieldLabel>Lidhe me</FieldLabel>
                      <SelectInput name="entity_type" defaultValue={params.entity_type || "property"}>
                        {entityTypes.map((entityType) => (
                          <option key={entityType} value={entityType}>
                            {entityType}
                          </option>
                        ))}
                      </SelectInput>
                    </div>
                    <div className="grid gap-1.5">
                      <FieldLabel>Rekordi</FieldLabel>
                      <TextInput
                        defaultValue={params.entity_id || ""}
                        list="document-entity-options"
                        name="entity_id"
                        placeholder="Zgjidh pronë ose vendos UUID"
                      />
                      <datalist id="document-entity-options">
                        {properties.map((property) => (
                          <option key={property.id} label={getPropertyLabel(property)} value={property.id} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <div className="grid gap-1.5">
                      <FieldLabel>Numri</FieldLabel>
                      <TextInput name="document_number" placeholder="Nr. dokumenti" />
                    </div>
                    <div className="grid gap-1.5">
                      <FieldLabel>Skadon</FieldLabel>
                      <TextInput name="expires_at" type="date" />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <FieldLabel>Konfidencialiteti</FieldLabel>
                    <SelectInput name="confidentiality_level" defaultValue="internal">
                      {confidentialityLevels.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <div className="grid gap-1.5">
                    <FieldLabel>Shënime</FieldLabel>
                    <TextAreaInput name="notes" placeholder="Kontekst, burim, arsye review..." />
                  </div>
                  <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
                    <UploadCloud className="h-4 w-4" />
                    Ngarko dokument
                  </button>
                </form>
              </div>
            ) : null}

            {canWrite ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                    <FileSpreadsheet className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-950">Krijo ofertë</h2>
                    <p className="text-sm text-slate-500">Përqindje pronari/investitori + Excel.</p>
                  </div>
                </div>
                <form action={createOfferAction} className="grid gap-3">
                  <div className="grid gap-1.5">
                    <FieldLabel>Prona</FieldLabel>
                    <SelectInput name="property_id" required>
                      <option value="">Zgjidh pronën</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {getPropertyLabel(property)}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <TextInput name="title" placeholder="Titulli i ofertës" required />
                  <TextInput name="owner_name" placeholder="Pronari / përfaqësuesi" />
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput name="owner_percentage" placeholder="Pronar %" type="number" step="0.01" required />
                    <TextInput name="investor_percentage" placeholder="Investor %" type="number" step="0.01" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput name="land_area" placeholder="Sipërfaqe toke" type="number" step="0.01" />
                    <TextInput name="estimated_sale_price" placeholder="Vlerë e pritshme" type="number" step="0.01" />
                  </div>
                  <TextInput name="valid_until" type="date" />
                  <input className="rounded-lg border border-dashed border-slate-300 p-3 text-sm" name="excel_file" type="file" accept=".xls,.xlsx" />
                  <TextAreaInput name="notes" placeholder="Shënime negocimi..." />
                  <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
                    <FileSpreadsheet className="h-4 w-4" />
                    Krijo ofertë
                  </button>
                </form>
              </div>
            ) : null}

            {canWrite ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <ClipboardCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-950">Krijo kontratë</h2>
                    <p className="text-sm text-slate-500">Draft, palë dhe review ligjor.</p>
                  </div>
                </div>
                <form action={createContractAction} className="grid gap-3">
                  <SelectInput name="contract_type" defaultValue="rent_contract">
                    {contractTypes.map((type) => (
                      <option key={type} value={type}>
                        {formatContractType(type, locale)}
                      </option>
                    ))}
                  </SelectInput>
                  <TextInput name="title" placeholder="Titulli i kontratës" required />
                  <SelectInput name="property_id">
                    <option value="">Pa pronë</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {getPropertyLabel(property)}
                      </option>
                    ))}
                  </SelectInput>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <TextInput name="party_a" placeholder="Pala A" required />
                    <TextInput name="party_b" placeholder="Pala B" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput name="amount" placeholder="Shuma" type="number" step="0.01" />
                    <TextInput name="currency" defaultValue="EUR" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput name="start_date" type="date" />
                    <TextInput name="end_date" type="date" />
                  </div>
                  <TextAreaInput name="notes" placeholder="Terma, kushte, noteri, pagesa..." />
                  <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
                    <Gavel className="h-4 w-4" />
                    Krijo kontratë
                  </button>
                </form>
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h2 className="font-semibold text-slate-950">Kontroll operativ</h2>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-600">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-slate-950">Dokumente që mungojnë</p>
                  <p>{missingChecklist} checklist items nuk janë të aprovuar.</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-slate-950">Rregulli i ruajtjes</p>
                  <p>Skedarët ruhen në bucket privat dhe hapen me URL të përkohshme.</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-slate-950">Audit</p>
                  <p>Ngarkimet, versionet, aprovimet dhe nënshkrimet logohen si aktivitet.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </DashboardShell>
  );
}
