"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createLeadActivityEvent } from "@/lib/ai-followup/client";
import type { Locale } from "@/lib/i18n";
import {
  type FollowUpInsight,
  type LeadActivityEvent,
  type LeadActivityEventType,
  type LeadChannel,
} from "@/modules/ai-followup/followup.types";

const loggerEventOptions: Array<{
  channel: LeadChannel;
  labelEn: string;
  labelSq: string;
  value: LeadActivityEventType;
}> = [
  {
    channel: "whatsapp",
    labelEn: "WhatsApp reply received",
    labelSq: "U pranua përgjigje në WhatsApp",
    value: "whatsapp_reply_received",
  },
  {
    channel: "phone",
    labelEn: "Phone call answered",
    labelSq: "Telefonata u përgjigj",
    value: "phone_call_answered",
  },
  {
    channel: "phone",
    labelEn: "Phone call missed",
    labelSq: "Telefonata u humb",
    value: "phone_call_missed",
  },
  {
    channel: "crm",
    labelEn: "Viewing requested",
    labelSq: "Kërkoi vizitë",
    value: "viewing_requested",
  },
  {
    channel: "crm",
    labelEn: "Appointment booked",
    labelSq: "Takimi u rezervua",
    value: "appointment_booked",
  },
  {
    channel: "crm",
    labelEn: "Property viewed",
    labelSq: "Pa pronë",
    value: "property_viewed",
  },
  {
    channel: "crm",
    labelEn: "Property saved",
    labelSq: "Ruajti pronë",
    value: "property_saved",
  },
  {
    channel: "email",
    labelEn: "Email replied",
    labelSq: "U përgjigj me email",
    value: "email_replied",
  },
  {
    channel: "manual",
    labelEn: "No response",
    labelSq: "Nuk pati përgjigje",
    value: "no_response",
  },
  {
    channel: "manual",
    labelEn: "Manual note added",
    labelSq: "U shtua shënim manual",
    value: "manual_note_added",
  },
];

const channelOptions: Array<{ label: string; value: LeadChannel }> = [
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Email", value: "email" },
  { label: "Phone", value: "phone" },
  { label: "CRM", value: "crm" },
  { label: "Manual", value: "manual" },
  { label: "Unknown", value: "unknown" },
];

type LeadActivityLoggerProps = {
  leadId: string;
  locale: Locale;
  onLogged?: (result: {
    event: LeadActivityEvent;
    insight: FollowUpInsight;
  }) => void;
};

export function LeadActivityLogger({
  leadId,
  locale,
  onLogged,
}: LeadActivityLoggerProps) {
  const [channel, setChannel] = useState<LeadChannel>("whatsapp");
  const [eventType, setEventType] = useState<LeadActivityEventType>(
    "whatsapp_reply_received",
  );
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedEvent = useMemo(
    () => loggerEventOptions.find((option) => option.value === eventType),
    [eventType],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const result = await createLeadActivityEvent({
        channel,
        eventType,
        leadId,
        metadata: note.trim() ? { note: note.trim() } : {},
      });
      setNote("");
      setSuccess(locale === "sq" ? "Aktiviteti u regjistrua." : "Activity logged.");
      onLogged?.(result);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : locale === "sq"
            ? "Aktiviteti nuk u regjistrua."
            : "Activity could not be logged.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="grid gap-3 rounded-2xl border border-indigo-100 bg-white/80 p-3 shadow-sm sm:p-4"
      onSubmit={handleSubmit}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950">
            {locale === "sq" ? "Regjistro ndërveprim" : "Log interaction"}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {locale === "sq"
              ? "Shto sinjale manuale derisa integrimet reale WhatsApp/email të lidhen."
              : "Add manual signals until live WhatsApp/email tracking is connected."}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-800">
          {locale === "sq" ? "Lloji i aktivitetit" : "Activity type"}
          <Select
            value={eventType}
            onChange={(changeEvent) => {
              const nextType = changeEvent.target.value as LeadActivityEventType;
              const option = loggerEventOptions.find((item) => item.value === nextType);
              setEventType(nextType);
              setChannel(option?.channel || "unknown");
            }}
          >
            {loggerEventOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {locale === "sq" ? option.labelSq : option.labelEn}
              </option>
            ))}
          </Select>
        </label>

        <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-800">
          {locale === "sq" ? "Kanali" : "Channel"}
          <Select
            value={channel}
            onChange={(changeEvent) => setChannel(changeEvent.target.value as LeadChannel)}
          >
            {channelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <label className="grid gap-1.5 text-sm font-medium text-slate-800">
        {locale === "sq" ? "Shënim opsional" : "Optional note"}
        <Textarea
          className="min-h-20"
          maxLength={600}
          onChange={(changeEvent) => setNote(changeEvent.target.value)}
          placeholder={
            locale === "sq"
              ? "P.sh. kërkoi vizitë këtë javë..."
              : "E.g. asked for a viewing this week..."
          }
          value={note}
        />
      </label>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <Button
        aria-label={
          locale === "sq"
            ? `Regjistro aktivitetin ${selectedEvent?.labelSq || ""}`
            : `Log ${selectedEvent?.labelEn || "activity"}`
        }
        className="h-11 min-h-11 w-full sm:w-auto sm:justify-self-start"
        disabled={isSubmitting}
        type="submit"
        variant="success"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {locale === "sq" ? "Regjistro aktivitet" : "Log Activity"}
      </Button>
    </form>
  );
}
