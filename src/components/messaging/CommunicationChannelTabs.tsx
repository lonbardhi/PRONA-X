import Link from "next/link";
import { MessageCircle, Send } from "lucide-react";

import type { Locale } from "@/lib/i18n";

type CommunicationChannelTabsProps = {
  active: "internal" | "whatsapp";
  locale: Locale;
};

export function CommunicationChannelTabs({
  active,
  locale,
}: CommunicationChannelTabsProps) {
  const tabs = [
    {
      href: "/messages",
      icon: MessageCircle,
      key: "internal" as const,
      label: locale === "sq" ? "Mesazhe te brendshme" : "Internal Messages",
    },
    {
      href: "/messages/whatsapp",
      icon: Send,
      key: "whatsapp" as const,
      label: "WhatsApp",
    },
  ];

  return (
    <div className="flex w-full gap-1 overflow-x-auto rounded-full border border-slate-200 bg-slate-50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:w-auto [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;

        return (
          <Link
            className={`inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition ${
              isActive
                ? "bg-slate-950 text-white shadow-sm"
                : "text-slate-600 hover:bg-white hover:text-slate-950"
            }`}
            href={tab.href}
            key={tab.key}
            prefetch={false}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

