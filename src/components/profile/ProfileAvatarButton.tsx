"use client";

import { UserCircle } from "lucide-react";

import { getInitials, type UserProfile } from "@/lib/agent-workspace";

type ProfileAvatarButtonProps = {
  onClick: () => void;
  profile: UserProfile;
  unreadCount: number;
};

export function ProfileAvatarButton({
  onClick,
  profile,
  unreadCount,
}: ProfileAvatarButtonProps) {
  const label = profile.full_name || profile.email || "PRONA X user";

  return (
    <button
      aria-label="Open profile workspace"
      className="crm-icon-button relative h-10 min-h-10 w-10 text-slate-700"
      onClick={onClick}
      type="button"
    >
      {profile.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={label}
          className="h-full w-full rounded-full object-cover"
          src={profile.avatar_url}
        />
      ) : profile.full_name || profile.email ? (
        <span className="text-xs font-bold text-slate-800">{getInitials(label)}</span>
      ) : (
        <UserCircle className="h-5 w-5" />
      )}
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}
