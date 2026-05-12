import Link from "next/link";

import { MessageIcon } from "@/components/MessageIcon";
import type { Locale } from "@/lib/i18n";
import { UnreadBadge } from "@/components/messaging/UnreadBadge";

type MessagesNavItemProps = {
  locale: Locale;
  unreadCount: number;
};

export function MessagesNavItem({ locale, unreadCount }: MessagesNavItemProps) {
  return (
    <Link
      className="relative inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-950"
      href="/messages"
      prefetch={false}
    >
      <MessageIcon className="h-5 w-5 object-contain" />
      {locale === "sq" ? "Mesazhe" : "Messages"}
      <UnreadBadge count={unreadCount} subtle />
    </Link>
  );
}

