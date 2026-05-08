"use client";

import { MessageCircle } from "lucide-react";

type SharePropertyButtonProps = {
  propertyId: string;
  title: string;
  isPublished: boolean;
};

export function SharePropertyButton({
  propertyId,
  title,
  isPublished,
}: SharePropertyButtonProps) {
  function shareOnWhatsApp() {
    const propertyUrl = `${window.location.origin}/properties/${propertyId}`;
    const text = `PRONA X property: ${title}\n${propertyUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  if (!isPublished) {
    return (
      <button
        className="inline-flex h-9 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-400 min-[420px]:w-auto"
        disabled
        title="Publish the property before sharing it publicly."
        type="button"
      >
        <MessageCircle className="h-4 w-4" />
        Share
      </button>
    );
  }

  return (
    <button
      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 min-[420px]:w-auto"
      onClick={shareOnWhatsApp}
      title="Share this public property page on WhatsApp"
      type="button"
    >
      <MessageCircle className="h-4 w-4" />
      WhatsApp
    </button>
  );
}
