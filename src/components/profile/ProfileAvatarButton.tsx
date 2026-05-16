"use client";

import { PronaAvatar } from "@/components/PronaAvatar";
import type { AvailabilityStatus, UserProfile } from "@/lib/agent-workspace";

type ProfileAvatarButtonProps = {
  onClick: () => void;
  profile: UserProfile;
  status?: AvailabilityStatus;
  statusLabel?: string;
  unreadCount: number;
};

export function ProfileAvatarButton({
  onClick,
  profile,
  status,
  statusLabel,
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
      <PronaAvatar
        alt={label}
        count={unreadCount}
        email={profile.email}
        name={profile.full_name}
        showBorder={false}
        size="md"
        src={profile.avatar_url}
        status={status}
        statusLabel={statusLabel}
      />
    </button>
  );
}
