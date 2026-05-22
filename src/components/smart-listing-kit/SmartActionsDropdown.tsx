"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  FileText,
  Loader2,
  MessageCircle,
  Sparkles,
  WandSparkles,
  XCircle,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  AiDescriptionAudience,
  AiDescriptionLength,
  AiDescriptionResponse,
  AiDescriptionTone,
  ListingMarketingAsset,
  QualityCheckItem,
  QualityCheckResponse,
  WhatsAppMessageResponse,
} from "@/modules/smart-listing-kit/smart-listing-kit.types";
import type { Locale } from "@/lib/i18n";

type SmartAction = "pdf" | "description" | "whatsapp" | "quality";

type ApiResult<T> = {
  data?: T;
  error?: string;
  success: boolean;
};

type GenerateDescriptionData = {
  asset: ListingMarketingAsset;
  result: AiDescriptionResponse;
};

type GenerateWhatsAppData = {
  asset: ListingMarketingAsset;
  result: WhatsAppMessageResponse;
};

type GenerateQualityData = {
  asset: ListingMarketingAsset;
  result: QualityCheckResponse;
};

type GeneratePdfData = {
  asset: ListingMarketingAsset;
  fileName: string;
  fileUrl: string | null;
  sizeBytes: number;
};

type SmartActionsDropdownProps = {
  listingId: string;
  locale: Locale;
};

const toneOptions: Array<{ label: Record<Locale, string>; value: AiDescriptionTone }> = [
  { label: { en: "Professional", sq: "Profesional" }, value: "professional" },
  { label: { en: "Luxury", sq: "Luksoz" }, value: "luxury" },
  { label: { en: "Friendly", sq: "Miqësor" }, value: "friendly" },
  { label: { en: "Investor-focused", sq: "Për investitorë" }, value: "investor_focused" },
];

const lengthOptions: Array<{ label: Record<Locale, string>; value: AiDescriptionLength }> = [
  { label: { en: "Short", sq: "I shkurtër" }, value: "short" },
  { label: { en: "Medium", sq: "Mesatar" }, value: "medium" },
  { label: { en: "Long", sq: "I gjatë" }, value: "long" },
];

const audienceOptions: Array<{ label: Record<Locale, string>; value: AiDescriptionAudience }> = [
  { label: { en: "Buyer", sq: "Blerës" }, value: "buyer" },
  { label: { en: "Renter", sq: "Qiramarrës" }, value: "renter" },
  { label: { en: "Investor", sq: "Investitor" }, value: "investor" },
];

async function postJson<T>(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json().catch(() => ({
    error: "Invalid server response.",
    success: false,
  }))) as ApiResult<T>;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload.data;
}

function getCopy(locale: Locale) {
  const isSq = locale === "sq";

  return {
    cancel: isSq ? "Anulo" : "Cancel",
    checkQuality: isSq ? "Kontrollo cilësinë" : "Check Listing Quality",
    copied: isSq ? "U kopjua." : "Copied.",
    copy: isSq ? "Kopjo" : "Copy",
    description: isSq ? "Gjenero përshkrim AI" : "Generate AI Description",
    error: isSq ? "Veprimi dështoi. Provo përsëri." : "Action failed. Please try again.",
    generate: isSq ? "Gjenero" : "Generate",
    generatePdf: isSq ? "Gjenero PDF" : "Generate PDF",
    openWhatsApp: isSq ? "Hap WhatsApp" : "Open WhatsApp",
    pdf: isSq ? "PDF për klientin" : "Client PDF",
    regenerate: isSq ? "Rigjenero" : "Regenerate",
    saveToListing: isSq ? "Ruaj te listimi" : "Save to listing",
    saved: isSq ? "U ruajt te listimi." : "Saved to listing.",
    smartActions: "Smart Actions",
    whatsapp: isSq ? "Mesazh WhatsApp" : "WhatsApp Message",
  };
}

function StatusMessage({
  error,
  success,
}: {
  error: string | null;
  success: string | null;
}) {
  if (!error && !success) {
    return null;
  }

  return (
    <Alert className={success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}>
      <AlertDescription>{success || error}</AlertDescription>
    </Alert>
  );
}

function LoadingLabel({ label }: { label: string }) {
  return (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </>
  );
}

function CopyButton({
  children,
  onCopied,
  text,
}: {
  children: ReactNode;
  onCopied: () => void;
  text: string;
}) {
  return (
    <Button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        onCopied();
      }}
      type="button"
      variant="outline"
    >
      <Clipboard className="h-4 w-4" />
      {children}
    </Button>
  );
}

function QualityGroup({
  items,
  title,
}: {
  items: QualityCheckItem[];
  title: string;
}) {
  return (
    <section className="grid gap-2">
      <h4 className="text-sm font-semibold text-slate-950">{title}</h4>
      <div className="grid gap-2">
        {items.map((item) => (
          <div
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3"
            key={item.key}
          >
            {item.passed ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">{item.label}</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-600">{item.message}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SmartActionsDropdown({ listingId, locale }: SmartActionsDropdownProps) {
  const router = useRouter();
  const copy = useMemo(() => getCopy(locale), [locale]);
  const [activeAction, setActiveAction] = useState<SmartAction | null>(null);
  const [loading, setLoading] = useState<SmartAction | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [pdfResult, setPdfResult] = useState<GeneratePdfData | null>(null);
  const [descriptionResult, setDescriptionResult] = useState<GenerateDescriptionData | null>(null);
  const [whatsAppResult, setWhatsAppResult] = useState<GenerateWhatsAppData | null>(null);
  const [qualityResult, setQualityResult] = useState<GenerateQualityData | null>(null);

  const [descriptionOptions, setDescriptionOptions] = useState({
    language: locale,
    length: "medium" as AiDescriptionLength,
    targetAudience: "buyer" as AiDescriptionAudience,
    tone: "professional" as AiDescriptionTone,
  });
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [whatsAppMessage, setWhatsAppMessage] = useState("");

  const resetStatus = () => {
    setError(null);
    setSuccess(null);
  };

  const openAction = (action: SmartAction) => {
    resetStatus();
    setActiveAction(action);
  };

  const generateDescription = async () => {
    resetStatus();
    setLoading("description");
    try {
      const data = await postJson<GenerateDescriptionData>(
        `/api/listings/${listingId}/smart-kit/description`,
        descriptionOptions,
      );
      setDescriptionResult(data);
      setGeneratedDescription(data.result.full_description);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.error);
    } finally {
      setLoading(null);
    }
  };

  const saveDescription = async () => {
    resetStatus();
    setLoading("save");
    try {
      await postJson<{ description: string }>(
        `/api/listings/${listingId}/smart-kit/description/save`,
        {
          assetId: descriptionResult?.asset.id,
          description: generatedDescription,
        },
      );
      setSuccess(copy.saved);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.error);
    } finally {
      setLoading(null);
    }
  };

  const generateWhatsApp = async () => {
    resetStatus();
    setLoading("whatsapp");
    try {
      const data = await postJson<GenerateWhatsAppData>(
        `/api/listings/${listingId}/smart-kit/whatsapp`,
        { locale },
      );
      setWhatsAppResult(data);
      setWhatsAppMessage(data.result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.error);
    } finally {
      setLoading(null);
    }
  };

  const generateQuality = async () => {
    resetStatus();
    setLoading("quality");
    try {
      const data = await postJson<GenerateQualityData>(
        `/api/listings/${listingId}/smart-kit/quality-check`,
        { locale },
      );
      setQualityResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.error);
    } finally {
      setLoading(null);
    }
  };

  const generatePdf = async () => {
    resetStatus();
    setLoading("pdf");
    try {
      const data = await postJson<GeneratePdfData>(
        `/api/listings/${listingId}/smart-kit/pdf`,
        {
          includeAgentContact: true,
          includePrice: true,
          includeQrCode: true,
          locale,
          templateKey: "client_brochure_default",
        },
      );
      setPdfResult(data);
      if (data.fileUrl) {
        window.open(data.fileUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.error);
    } finally {
      setLoading(null);
    }
  };

  const closeDialog = () => {
    setActiveAction(null);
    resetStatus();
  };

  const whatsAppShareUrl = `https://wa.me/?text=${encodeURIComponent(whatsAppMessage)}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={locale === "sq" ? "Hap Smart Actions" : "Open Smart Actions"}
            className="w-full sm:w-auto"
            type="button"
            variant="default"
          >
            <Sparkles className="h-4 w-4" />
            {copy.smartActions}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-[min(19rem,calc(100vw-2rem))] p-2"
        >
          <DropdownMenuLabel>PRONA X Smart Listing Kit</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="min-h-11 gap-3" onSelect={() => openAction("pdf")}>
            <FileText className="h-4 w-4 text-cyan-600" />
            <span>{copy.generatePdf}</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11 gap-3" onSelect={() => openAction("description")}>
            <WandSparkles className="h-4 w-4 text-violet-600" />
            <span>{copy.description}</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11 gap-3" onSelect={() => openAction("whatsapp")}>
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            <span>{copy.whatsapp}</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11 gap-3" onSelect={() => openAction("quality")}>
            <CheckCircle2 className="h-4 w-4 text-amber-600" />
            <span>{copy.checkQuality}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={activeAction === "pdf"} onOpenChange={(open) => (open ? openAction("pdf") : closeDialog())}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{copy.generatePdf}</DialogTitle>
            <DialogDescription>
              {locale === "sq"
                ? "Krijo një PDF klienti me të dhëna publike të listimit."
                : "Create a client-facing PDF using public listing data only."}
            </DialogDescription>
          </DialogHeader>
          <StatusMessage error={error} success={success} />
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            {locale === "sq"
              ? "PDF-ja përjashton pronarin, shënimet e brendshme, komisionet dhe të dhëna të ndjeshme."
              : "The PDF excludes owner data, internal notes, commissions, and sensitive CRM fields."}
          </div>
          {pdfResult ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">{pdfResult.fileName}</p>
              <p className="mt-1">{Math.round(pdfResult.sizeBytes / 1024)} KB</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={closeDialog} type="button" variant="outline">
              {copy.cancel}
            </Button>
            <Button disabled={loading === "pdf"} onClick={generatePdf} type="button">
              {loading === "pdf" ? <LoadingLabel label={copy.generate} /> : copy.generate}
            </Button>
            {pdfResult?.fileUrl ? (
              <Button
                onClick={() => window.open(pdfResult.fileUrl || "", "_blank", "noopener,noreferrer")}
                type="button"
                variant="success"
              >
                {locale === "sq" ? "Hap PDF" : "Open PDF"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeAction === "description"}
        onOpenChange={(open) => (open ? openAction("description") : closeDialog())}
      >
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{copy.description}</DialogTitle>
            <DialogDescription>
              {locale === "sq"
                ? "Përdor gjeneratorin praktik PRONA X AI pa mbishkruar automatikisht listimin."
                : "Use the practical PRONA X AI generator without automatically overwriting the listing."}
            </DialogDescription>
          </DialogHeader>
          <StatusMessage error={error} success={success} />
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="grid gap-1.5">
              <Label htmlFor="smart-kit-language">{locale === "sq" ? "Gjuha" : "Language"}</Label>
              <Select
                id="smart-kit-language"
                onChange={(event) =>
                  setDescriptionOptions((current) => ({
                    ...current,
                    language: event.target.value as Locale,
                  }))
                }
                value={descriptionOptions.language}
              >
                <option value="sq">Shqip</option>
                <option value="en">English</option>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="smart-kit-tone">{locale === "sq" ? "Toni" : "Tone"}</Label>
              <Select
                id="smart-kit-tone"
                onChange={(event) =>
                  setDescriptionOptions((current) => ({
                    ...current,
                    tone: event.target.value as AiDescriptionTone,
                  }))
                }
                value={descriptionOptions.tone}
              >
                {toneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label[locale]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="smart-kit-length">{locale === "sq" ? "Gjatësia" : "Length"}</Label>
              <Select
                id="smart-kit-length"
                onChange={(event) =>
                  setDescriptionOptions((current) => ({
                    ...current,
                    length: event.target.value as AiDescriptionLength,
                  }))
                }
                value={descriptionOptions.length}
              >
                {lengthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label[locale]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="smart-kit-audience">
                {locale === "sq" ? "Audienca" : "Audience"}
              </Label>
              <Select
                id="smart-kit-audience"
                onChange={(event) =>
                  setDescriptionOptions((current) => ({
                    ...current,
                    targetAudience: event.target.value as AiDescriptionAudience,
                  }))
                }
                value={descriptionOptions.targetAudience}
              >
                {audienceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label[locale]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-3">
            <Button
              className="w-full sm:w-fit"
              disabled={loading === "description"}
              onClick={generateDescription}
              type="button"
              variant="default"
            >
              {loading === "description" ? (
                <LoadingLabel label={copy.generate} />
              ) : descriptionResult ? (
                copy.regenerate
              ) : (
                copy.generate
              )}
            </Button>
            {descriptionResult ? (
              <div className="grid gap-4">
                <section className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">
                    {locale === "sq" ? "Sugjerime titulli" : "Title suggestions"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {descriptionResult.result.title_suggestions.map((title) => (
                      <Badge key={title} variant="secondary">
                        {title}
                      </Badge>
                    ))}
                  </div>
                </section>
                <section className="grid gap-2">
                  <Label htmlFor="smart-kit-description">
                    {locale === "sq" ? "Përshkrimi i plotë" : "Full description"}
                  </Label>
                  <Textarea
                    className="min-h-48"
                    id="smart-kit-description"
                    onChange={(event) => setGeneratedDescription(event.target.value)}
                    value={generatedDescription}
                  />
                </section>
                <div className="grid gap-3 sm:grid-cols-2">
                  <section className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-950">
                      {locale === "sq" ? "Pikat kryesore" : "Highlights"}
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600">
                      {descriptionResult.result.highlights.map((highlight) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                  </section>
                  <section className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-950">
                      {locale === "sq" ? "Të dhëna që mungojnë" : "Missing data notes"}
                    </p>
                    {descriptionResult.result.missing_data_notes.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600">
                        {descriptionResult.result.missing_data_notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        {locale === "sq" ? "Nuk ka boshllëqe të dukshme." : "No obvious gaps."}
                      </p>
                    )}
                  </section>
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={closeDialog} type="button" variant="outline">
              {copy.cancel}
            </Button>
            {generatedDescription ? (
              <>
                <CopyButton onCopied={() => setSuccess(copy.copied)} text={generatedDescription}>
                  {copy.copy}
                </CopyButton>
                <Button disabled={loading === "save"} onClick={saveDescription} type="button" variant="success">
                  {loading === "save" ? <LoadingLabel label={copy.saveToListing} /> : copy.saveToListing}
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeAction === "whatsapp"}
        onOpenChange={(open) => (open ? openAction("whatsapp") : closeDialog())}
      >
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{copy.whatsapp}</DialogTitle>
            <DialogDescription>
              {locale === "sq"
                ? "Krijo një mesazh të shkurtër dhe të redaktueshëm për klientin."
                : "Create a short editable client-facing message."}
            </DialogDescription>
          </DialogHeader>
          <StatusMessage error={error} success={success} />
          <Button
            className="w-full sm:w-fit"
            disabled={loading === "whatsapp"}
            onClick={generateWhatsApp}
            type="button"
          >
            {loading === "whatsapp" ? <LoadingLabel label={copy.generate} /> : copy.generate}
          </Button>
          <Textarea
            className="min-h-44"
            onChange={(event) => setWhatsAppMessage(event.target.value)}
            placeholder={locale === "sq" ? "Gjenero mesazhin..." : "Generate the message..."}
            value={whatsAppMessage}
          />
          {whatsAppResult?.result.message && !whatsAppResult.result.message.includes("http") ? (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertDescription>
                {locale === "sq"
                  ? "Ky listim nuk ka URL publike të qartë; mesazhi mbetet i sigurt pa link të brendshëm."
                  : "This listing has no clear public URL; the message stays safe without an internal link."}
              </AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button onClick={closeDialog} type="button" variant="outline">
              {copy.cancel}
            </Button>
            {whatsAppMessage ? (
              <>
                <CopyButton onCopied={() => setSuccess(copy.copied)} text={whatsAppMessage}>
                  {copy.copy}
                </CopyButton>
                <Button
                  onClick={() => window.open(whatsAppShareUrl, "_blank", "noopener,noreferrer")}
                  type="button"
                  variant="success"
                >
                  <MessageCircle className="h-4 w-4" />
                  {copy.openWhatsApp}
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeAction === "quality"}
        onOpenChange={(open) => (open ? openAction("quality") : closeDialog())}
      >
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{copy.checkQuality}</DialogTitle>
            <DialogDescription>
              {locale === "sq"
                ? "Kontroll praktik i gatishmërisë së listimit. Nuk është ende skorim i avancuar AI."
                : "A practical listing readiness check. This is not advanced AI scoring yet."}
            </DialogDescription>
          </DialogHeader>
          <StatusMessage error={error} success={success} />
          <Button
            className="w-full sm:w-fit"
            disabled={loading === "quality"}
            onClick={generateQuality}
            type="button"
          >
            {loading === "quality" ? <LoadingLabel label={copy.generate} /> : copy.generate}
          </Button>
          {qualityResult ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <Bot className="h-4 w-4 text-emerald-700" />
                <span className="text-sm font-semibold text-slate-950">
                  {locale === "sq" ? "Statusi" : "Status"}
                </span>
                <Badge
                  className={
                    qualityResult.result.status === "ready"
                      ? "bg-emerald-100 text-emerald-800"
                      : qualityResult.result.status === "incomplete"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                  }
                >
                  {qualityResult.result.status === "ready"
                    ? locale === "sq"
                      ? "Gati"
                      : "Ready"
                    : qualityResult.result.status === "incomplete"
                      ? locale === "sq"
                        ? "I paplotë"
                        : "Incomplete"
                      : locale === "sq"
                        ? "Kërkon vëmendje"
                        : "Needs attention"}
                </Badge>
              </div>
              <QualityGroup
                items={qualityResult.result.required}
                title={locale === "sq" ? "Të detyrueshme" : "Required"}
              />
              <QualityGroup
                items={qualityResult.result.recommended}
                title={locale === "sq" ? "Të rekomanduara" : "Recommended"}
              />
              <QualityGroup
                items={qualityResult.result.marketing_quality}
                title={locale === "sq" ? "Cilësia e marketingut" : "Marketing quality"}
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={closeDialog} type="button" variant="outline">
              {copy.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
