"use client";

import { Mail, MessageCircle, Phone, UserCheck } from "lucide-react";

import { PronaAvatar } from "@/components/PronaAvatar";
import {
  getAssignedAgentDisplayName,
  type PropertyAssignedAgent,
} from "@/lib/properties";
import type { Locale } from "@/lib/i18n";

type PropertyAssignedAgentCardProps = {
  agent?: PropertyAssignedAgent | null;
  compact?: boolean;
  locale: Locale;
};

function getWhatsAppHref(phone?: string | null) {
  if (!phone) {
    return null;
  }

  let digits = phone.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0")) {
    digits = `355${digits.slice(1)}`;
  }

  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

function getPhoneHref(phone?: string | null) {
  if (!phone) {
    return null;
  }

  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function PropertyAssignedAgentCard({
  agent,
  compact = false,
  locale,
}: PropertyAssignedAgentCardProps) {
  const isSq = locale === "sq";
  const name = agent ? getAssignedAgentDisplayName(agent) : null;
  const whatsAppHref = getWhatsAppHref(agent?.phone);
  const phoneHref = getPhoneHref(agent?.phone);
  const emailHref = agent?.email ? `mailto:${agent.email}` : null;

  return (
    <div className="min-w-0 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
      <div className="flex min-w-0 items-start gap-3">
        {agent ? (
          <PronaAvatar
            email={agent.email}
            name={agent.full_name}
            shape="rounded"
            size={compact ? "md" : "lg"}
            src={agent.avatar_url}
            verified
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100">
            <UserCheck className="h-5 w-5" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
            {isSq ? "Agjenti pergjegjes" : "Responsible agent"}
          </p>
          <h3 className="mt-1 break-words text-base font-semibold text-slate-950">
            {name || (isSq ? "Pa agjent te caktuar" : "No agent assigned")}
          </h3>
          {agent ? (
            <div className="mt-1 grid gap-1 text-xs text-slate-600">
              <p className="break-words">
                {agent.role ? agent.role.replaceAll("_", " ") : "agent"}
                {agent.agency_name ? ` / ${agent.agency_name}` : ""}
              </p>
              {agent.email ? <p className="break-all">{agent.email}</p> : null}
              {agent.phone ? <p className="break-words">{agent.phone}</p> : null}
            </div>
          ) : (
            <p className="mt-1 text-sm leading-5 text-slate-600">
              {isSq
                ? "Zgjidh nje agjent para publikimit."
                : "Choose an agent before publishing."}
            </p>
          )}
        </div>
      </div>

      {agent ? (
        <div className="mt-3 grid grid-cols-2 gap-2 min-[420px]:flex min-[420px]:flex-wrap">
          {whatsAppHref ? (
            <a
              className="crm-button crm-button-success h-9 min-h-9 px-3 text-xs"
              href={whatsAppHref}
              rel="noreferrer"
              target="_blank"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          ) : null}
          {phoneHref ? (
            <a
              className="crm-button crm-button-secondary h-9 min-h-9 px-3 text-xs"
              href={phoneHref}
            >
              <Phone className="h-4 w-4" />
              {isSq ? "Telefon" : "Call"}
            </a>
          ) : null}
          {emailHref ? (
            <a
              className="crm-button crm-button-secondary h-9 min-h-9 px-3 text-xs"
              href={emailHref}
            >
              <Mail className="h-4 w-4" />
              Email
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
