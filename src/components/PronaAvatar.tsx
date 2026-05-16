"use client";

import { useState } from "react";
import { CheckCircle2, UserCircle } from "lucide-react";

type PronaAvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
type PronaAvatarShape = "circle" | "rounded";
type PronaAvatarStatus =
  | "available"
  | "away"
  | "busy"
  | "do_not_disturb"
  | "driving"
  | "in_meeting"
  | "offline"
  | "online"
  | "property_visit"
  | "vacation";

type PronaAvatarProps = {
  alt?: string;
  className?: string;
  count?: number;
  email?: string | null;
  name?: string | null;
  shape?: PronaAvatarShape;
  showBorder?: boolean;
  size?: PronaAvatarSize;
  src?: string | null;
  status?: PronaAvatarStatus | null;
  statusLabel?: string;
  verified?: boolean;
};

const sizeStyles: Record<
  PronaAvatarSize,
  {
    count: string;
    icon: string;
    initials: string;
    root: string;
    status: string;
    verified: string;
  }
> = {
  xs: {
    count: "h-4 min-w-4 px-1 text-[9px]",
    icon: "h-3.5 w-3.5",
    initials: "text-[10px]",
    root: "h-6 w-6",
    status: "h-2.5 w-2.5 border-[1.5px]",
    verified: "h-3.5 w-3.5",
  },
  sm: {
    count: "h-5 min-w-5 px-1 text-[10px]",
    icon: "h-4 w-4",
    initials: "text-xs",
    root: "h-8 w-8",
    status: "h-3 w-3 border-2",
    verified: "h-4 w-4",
  },
  md: {
    count: "h-5 min-w-5 px-1 text-[10px]",
    icon: "h-5 w-5",
    initials: "text-sm",
    root: "h-10 w-10",
    status: "h-3.5 w-3.5 border-2",
    verified: "h-5 w-5",
  },
  lg: {
    count: "h-5 min-w-5 px-1 text-[10px]",
    icon: "h-6 w-6",
    initials: "text-base",
    root: "h-12 w-12",
    status: "h-4 w-4 border-2",
    verified: "h-5 w-5",
  },
  xl: {
    count: "h-6 min-w-6 px-1.5 text-[11px]",
    icon: "h-7 w-7",
    initials: "text-lg",
    root: "h-14 w-14",
    status: "h-4 w-4 border-2",
    verified: "h-5 w-5",
  },
  "2xl": {
    count: "h-6 min-w-6 px-1.5 text-[11px]",
    icon: "h-8 w-8",
    initials: "text-xl",
    root: "h-16 w-16",
    status: "h-5 w-5 border-[2.5px]",
    verified: "h-6 w-6",
  },
};

const statusStyles: Record<PronaAvatarStatus, string> = {
  available: "bg-emerald-500",
  away: "bg-amber-500",
  busy: "bg-rose-500",
  do_not_disturb: "bg-rose-500",
  driving: "bg-blue-500",
  in_meeting: "bg-amber-500",
  offline: "bg-slate-400",
  online: "bg-emerald-500",
  property_visit: "bg-blue-500",
  vacation: "bg-violet-500",
};

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function getInitials(name?: string | null, email?: string | null) {
  const source = (name || email || "").trim();

  if (!source) {
    return "";
  }

  const parts = source
    .replace(/@.*/, "")
    .split(/\s+|[._-]+/)
    .filter(Boolean);

  return (parts[0]?.[0] || "")
    .concat(parts.length > 1 ? parts[1]?.[0] || "" : parts[0]?.[1] || "")
    .toUpperCase();
}

export function PronaAvatar({
  alt,
  className,
  count,
  email,
  name,
  shape = "circle",
  showBorder = true,
  size = "md",
  src,
  status,
  statusLabel,
  verified,
}: PronaAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = getInitials(name, email);
  const canShowImage = Boolean(src && !imageFailed);
  const roundedClass = shape === "circle" ? "rounded-full" : "rounded-xl";
  const label = alt || name || email || "PRONA X user";
  const boundedCount = count && count > 99 ? "99+" : count;

  return (
    <span
      aria-label={label}
      className={classes(
        "relative inline-flex shrink-0 items-center justify-center",
        sizeStyles[size].root,
        roundedClass,
        showBorder && "ring-1 ring-slate-200 ring-offset-2 ring-offset-white",
        className,
      )}
      role="img"
      title={label}
    >
      <span
        className={classes(
          "relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-950 text-white shadow-sm",
          roundedClass,
          canShowImage ? "bg-slate-100" : "bg-slate-950",
        )}
      >
        {canShowImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={label}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
            src={src || undefined}
          />
        ) : initials ? (
          <span className={classes("font-bold tracking-normal", sizeStyles[size].initials)}>
            {initials}
          </span>
        ) : (
          <UserCircle className={classes("text-white", sizeStyles[size].icon)} />
        )}
      </span>

      {status ? (
        <span
          aria-label={statusLabel || status}
          className={classes(
            "absolute bottom-0 right-0 rounded-full border-white shadow-sm",
            sizeStyles[size].status,
            statusStyles[status],
          )}
          title={statusLabel || status}
        />
      ) : null}

      {verified ? (
        <CheckCircle2
          aria-label="Verified"
          className={classes(
            "absolute -bottom-0.5 -right-0.5 rounded-full bg-white text-blue-600",
            sizeStyles[size].verified,
          )}
        />
      ) : null}

      {count && count > 0 ? (
        <span
          aria-label={`${count} unread`}
          className={classes(
            "absolute -right-1 -top-1 flex items-center justify-center rounded-full bg-rose-600 font-bold leading-none text-white shadow-sm ring-2 ring-white",
            sizeStyles[size].count,
          )}
        >
          {boundedCount}
        </span>
      ) : null}
    </span>
  );
}
