"use client";

import { MessageCircle } from "lucide-react";

import { defaultLocale, type Locale } from "@/lib/i18n";

type SharePropertyButtonProps = {
  isPublished: boolean;
  locale?: Locale;
  propertyId: string;
  title: string;
};

export function SharePropertyButton({
  isPublished,
  locale = defaultLocale,
  propertyId,
  title,
}: SharePropertyButtonProps) {
  const isSq = locale === "sq";

  function shareOnWhatsApp() {
    const propertyUrl = `${window.location.origin}/properties/${propertyId}`;
    const text = `${isSq ? "Pronë PRONA X" : "PRONA X property"}: ${title}\n${propertyUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  if (!isPublished) {
    return (
      <button
        className="crm-button crm-button-secondary h-9 min-h-9 w-full cursor-not-allowed px-3 text-slate-400 min-[420px]:w-auto"
        disabled
        title={
          isSq
            ? "Publiko pronën përpara se ta shpërndash publikisht."
            : "Publish the property before sharing it publicly."
        }
        type="button"
      >
        <MessageCircle className="h-4 w-4" />
        {isSq ? "Shpërndaj" : "Share"}
      </button>
    );
  }

  return (
    <button
      className="crm-button crm-button-secondary h-9 min-h-9 w-full border-emerald-200 px-3 text-emerald-700 min-[420px]:w-auto"
      onClick={shareOnWhatsApp}
      title={
        isSq
          ? "Shpërndaje këtë faqe publike të pronës në WhatsApp"
          : "Share this public property page on WhatsApp"
      }
      type="button"
    >
      <MessageCircle className="h-4 w-4" />
      WhatsApp
    </button>
  );
}
