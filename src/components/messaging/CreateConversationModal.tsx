"use client";

import { useMemo, useState } from "react";
import { MessageSquarePlus, Search, X } from "lucide-react";

import { createConversationAction } from "@/app/messages/actions";
import { PronaAvatar } from "@/components/PronaAvatar";
import {
  getMentionHandle,
  getProfileAvailabilityLabel,
  getProfileAvailabilityTitle,
  getProfileDisplayName,
  type MessagingProfile,
} from "@/lib/messaging";
import type { Locale } from "@/lib/i18n";

type CreateConversationModalProps = {
  currentUserId: string;
  locale: Locale;
  onClose: () => void;
  open: boolean;
  profiles: MessagingProfile[];
};

const conversationTypeOptions = [
  { labelEn: "Direct", labelSq: "Direkt", value: "direct" },
  { labelEn: "Group", labelSq: "Grup", value: "group" },
  { labelEn: "Team channel", labelSq: "Kanal ekipi", value: "team_channel" },
  { labelEn: "Deal room", labelSq: "Deal room", value: "deal_room" },
] as const;

export function CreateConversationModal({
  currentUserId,
  locale,
  onClose,
  open,
  profiles,
}: CreateConversationModalProps) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<(typeof conversationTypeOptions)[number]["value"]>("direct");
  const visibleProfiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return profiles
      .filter((profile) => profile.id !== currentUserId)
      .filter((profile) => {
        if (!normalizedQuery) {
          return true;
        }

        return [
          profile.full_name || "",
          profile.email || "",
          profile.role,
          getMentionHandle(profile),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      });
  }, [currentUserId, profiles, query]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="crm-modal-backdrop fixed inset-0 z-[90] flex h-[100dvh] min-h-[100svh] items-end bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
      role="dialog"
    >
      <div className="crm-modal-panel flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-semibold text-slate-950">
                {locale === "sq" ? "Bisedë e re" : "New conversation"}
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {locale === "sq"
                ? "Zgjidh ekipin dhe mbaje bisedën brenda CRM."
                : "Choose teammates and keep the discussion inside the CRM."}
            </p>
          </div>
          <button
            aria-label={locale === "sq" ? "Mbyll" : "Close"}
            className="crm-icon-button h-9 min-h-9 w-9 shrink-0"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={createConversationAction} className="grid min-h-0 flex-1">
          <input name="return_to" type="hidden" value="/messages" />
          <div className="grid gap-4 overflow-y-auto p-4">
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-slate-950">
                {locale === "sq" ? "Lloji" : "Type"}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {conversationTypeOptions.map((option) => (
                  <label
                    className={`flex h-10 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-semibold transition ${
                      type === option.value
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                    key={option.value}
                  >
                    <input
                      checked={type === option.value}
                      className="sr-only"
                      name="type"
                      onChange={() => setType(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    {locale === "sq" ? option.labelSq : option.labelEn}
                  </label>
                ))}
              </div>
            </div>

            {type !== "direct" ? (
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {locale === "sq" ? "Titulli" : "Title"}
                <input
                  className="crm-input text-slate-950"
                  maxLength={140}
                  name="title"
                  placeholder={
                    locale === "sq" ? "p.sh. Media Requests" : "e.g. Media Requests"
                  }
                />
              </label>
            ) : null}

            <label className="relative block">
              <span className="sr-only">
                {locale === "sq" ? "Kerko perdorues" : "Search users"}
              </span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="crm-input h-10 min-h-10 bg-slate-50 pl-9 pr-3 text-sm text-slate-950 focus:bg-white"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={locale === "sq" ? "Kerko emër, email, rol" : "Search name, email, role"}
                value={query}
              />
            </label>

            <div className="grid gap-2">
              {visibleProfiles.length === 0 ? (
                <div className="crm-empty-state p-4 text-sm text-slate-500">
                  {locale === "sq" ? "Nuk u gjet asnje perdorues." : "No users found."}
                </div>
              ) : null}

              {visibleProfiles.map((profile) => (
                <label
                  className="crm-card-interactive flex cursor-pointer items-center gap-3 p-3"
                  key={profile.id}
                >
                  <input
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    name="participant_ids"
                    type="checkbox"
                    value={profile.id}
                  />
                  <PronaAvatar
                    alt={getProfileDisplayName(profile)}
                    email={profile.email}
                    name={profile.full_name}
                    shape="rounded"
                    showBorder={false}
                    size="md"
                    src={profile.avatar_url}
                    status={profile.availability_status}
                    statusLabel={getProfileAvailabilityTitle(profile, locale)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-950">
                      {getProfileDisplayName(profile)}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      @{getMentionHandle(profile)} / {profile.role}
                      {profile.availability_status
                        ? ` / ${getProfileAvailabilityLabel(profile, locale)}`
                        : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white p-4">
            <button className="crm-button crm-button-success w-full">
              {locale === "sq" ? "Krijo biseden" : "Create conversation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

