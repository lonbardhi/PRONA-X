"use client";

import { PronaAvatar } from "@/components/PronaAvatar";
import {
  getMentionHandle,
  getProfileDisplayName,
  type MessagingProfile,
} from "@/lib/messaging";
import type { Locale } from "@/lib/i18n";

type MentionPickerProps = {
  locale: Locale;
  onSelect: (profile: MessagingProfile) => void;
  profiles: MessagingProfile[];
  query: string;
  selectedIds: string[];
};

export function MentionPicker({
  locale,
  onSelect,
  profiles,
  query,
  selectedIds,
}: MentionPickerProps) {
  const normalizedQuery = query.toLowerCase();
  const selected = new Set(selectedIds);
  const matches = profiles
    .filter((profile) => !selected.has(profile.id))
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
    })
    .slice(0, 6);

  if (matches.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-full left-0 z-20 mb-2 grid max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
      <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {locale === "sq" ? "Permend perdorues" : "Mention teammate"}
      </p>
      {matches.map((profile) => (
        <button
          className="flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-emerald-50"
          key={profile.id}
          onClick={() => onSelect(profile)}
          type="button"
        >
          <PronaAvatar
            alt={getProfileDisplayName(profile)}
            email={profile.email}
            name={profile.full_name}
            shape="rounded"
            showBorder={false}
            size="sm"
            src={profile.avatar_url}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-950">
              {getProfileDisplayName(profile)}
            </span>
            <span className="block truncate text-xs text-slate-500">
              @{getMentionHandle(profile)}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

