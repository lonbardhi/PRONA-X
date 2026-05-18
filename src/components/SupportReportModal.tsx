"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, FileUp, Plus, X } from "lucide-react";

import { createSupportTicketAction } from "@/app/support/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type Locale, t } from "@/lib/i18n";
import {
  getSupportCategoryLabels,
  getSupportModuleLabel,
  getSupportPriorityLabels,
  supportModules,
  supportTicketCategories,
  supportTicketPriorities,
  type SupportPropertyOption,
} from "@/lib/support";

type SupportReportModalProps = {
  locale: Locale;
  properties: SupportPropertyOption[];
};

type ClientEnvironment = {
  browser: string;
  device: string;
  os: string;
  pageUrl: string;
  screenSize: string;
};

function SubmitButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
    >
      <AlertCircle className="h-4 w-4" />
      {pending ? t(locale, "support.submitting") : t(locale, "support.submit")}
    </Button>
  );
}

function getClientEnvironment(): ClientEnvironment {
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform || "Unknown platform";
  const hasTouch = window.navigator.maxTouchPoints > 0;

  return {
    browser: userAgent,
    device: hasTouch ? "Touch device" : "Desktop or laptop",
    os: platform,
    pageUrl: window.location.href,
    screenSize: `${window.screen.width} x ${window.screen.height}`,
  };
}

export function SupportReportModal({ locale, properties }: SupportReportModalProps) {
  const [open, setOpen] = useState(false);
  const categoryLabels = getSupportCategoryLabels(locale);
  const priorityLabels = getSupportPriorityLabels(locale);
  const [environment, setEnvironment] = useState<ClientEnvironment>({
    browser: "",
    device: "",
    os: "",
    pageUrl: "",
    screenSize: "",
  });

  return (
    <>
      <Button
        className="w-full sm:w-auto"
        onClick={() => {
          setEnvironment(getClientEnvironment());
          setOpen(true);
        }}
        type="button"
      >
        <Plus className="h-4 w-4" />
        {t(locale, "support.report")}
      </Button>

      {open ? (
        <div
          aria-modal="true"
          className="crm-modal-backdrop fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 px-3 py-4 backdrop-blur-sm"
          role="dialog"
        >
          <div className="crm-modal-panel mx-auto max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                  {t(locale, "support.request")}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {t(locale, "support.report")}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {t(locale, "support.whatInclude")}
                </p>
              </div>
              <Button
                aria-label={t(locale, "common.cancel")}
                className="shrink-0 rounded-full"
                onClick={() => setOpen(false)}
                size="icon"
                type="button"
                variant="outline"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form action={createSupportTicketAction} className="grid gap-5 p-4 sm:p-6">
              <input name="page_url" type="hidden" value={environment.pageUrl} />
              <input name="browser" type="hidden" value={environment.browser} />
              <input name="device" type="hidden" value={environment.device} />
              <input name="os" type="hidden" value={environment.os} />
              <input name="screen_size" type="hidden" value={environment.screenSize} />

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {t(locale, "support.title")}
                <Input
                  name="title"
                  placeholder={t(locale, "support.titlePlaceholder")}
                  required
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {t(locale, "support.category")}
                  <Select
                    name="category"
                    required
                  >
                    {supportTicketCategories.map((category) => (
                      <option key={category} value={category}>
                        {categoryLabels[category]}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {t(locale, "support.priority")}
                  <Select
                    name="priority"
                    required
                  >
                    {supportTicketPriorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priorityLabels[priority]}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {t(locale, "support.module")}
                  <Select
                    name="related_module"
                  >
                    <option value="">{t(locale, "support.module")}</option>
                    {supportModules.map((module) => (
                      <option key={module} value={module}>
                        {getSupportModuleLabel(locale, module)}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {t(locale, "support.property")}
                <Select
                  name="related_property_id"
                >
                  <option value="">{t(locale, "support.noProperty")}</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title}
                      {property.city ? ` - ${property.city}` : ""}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {t(locale, "support.description")}
                <Textarea
                  className="min-h-32"
                  minLength={20}
                  name="description"
                  placeholder={t(locale, "support.descriptionPlaceholder")}
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {t(locale, "support.steps")}
                <Textarea
                  className="min-h-24"
                  name="steps_to_reproduce"
                  placeholder={t(locale, "support.stepsPlaceholder")}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {t(locale, "support.files")}
                <span className="crm-card-interactive flex min-h-24 cursor-pointer flex-col items-center justify-center border-dashed bg-slate-50 px-4 py-5 text-center">
                  <FileUp className="h-6 w-6 text-slate-400" />
                  <span className="mt-2 text-sm font-semibold text-slate-700">
                    {t(locale, "support.filesTitle")}
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    {t(locale, "support.filesHint")}
                  </span>
                  <input
                    accept=".png,.jpg,.jpeg,.webp,.pdf,.mp4,image/png,image/jpeg,image/webp,application/pdf,video/mp4"
                    className="sr-only"
                    multiple
                    name="attachments"
                    type="file"
                  />
                </span>
              </label>

              <div className="crm-card bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">
                  {t(locale, "support.autoContext")}
                </p>
                <div className="mt-2 grid gap-1 text-xs text-slate-500">
                  <p className="break-words">{t(locale, "support.url")}: {environment.pageUrl || "-"}</p>
                  <p className="break-words">{t(locale, "support.browser")}: {environment.browser || "-"}</p>
                  <p>
                    {t(locale, "support.device")}: {environment.device || "-"} / OS:{" "}
                    {environment.os || "-"} / {t(locale, "support.screen")}:{" "}
                    {environment.screenSize || "-"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <Button
                  onClick={() => setOpen(false)}
                  type="button"
                  variant="secondary"
                >
                  {t(locale, "common.cancel")}
                </Button>
                <SubmitButton locale={locale} />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
