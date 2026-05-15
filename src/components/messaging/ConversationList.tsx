"use client";

import {
  Archive,
  Building2,
  CalendarClock,
  Hash,
  MessageCircle,
  Search,
  Users,
} from "lucide-react";

import { UnreadBadge } from "@/components/messaging/UnreadBadge";
import {
  formatMessagingDateTime,
  getConversationTitle,
  getConversationTypeLabel,
  getConversationTypeTone,
  getMessagePreview,
  type ConversationListItem,
  type ConversationType,
} from "@/lib/messaging";
import type { Locale } from "@/lib/i18n";

type ConversationListProps = {
  activeConversationId: string | null;
  conversations: ConversationListItem[];
  currentUserId: string;
  filter: string;
  locale: Locale;
  onCreateClick: () => void;
  onFilterChange: (filter: string) => void;
  onQueryChange: (query: string) => void;
  onSelectConversation: (conversationId: string) => void;
  query: string;
};

type FilterOption = {
  label: string;
  value: string;
};

function getFilters(locale: Locale): FilterOption[] {
  return [
    { label: locale === "sq" ? "Te gjitha" : "All", value: "all" },
    { label: locale === "sq" ? "Pa lexuar" : "Unread", value: "unread" },
    { label: locale === "sq" ? "Direkt" : "Direct", value: "direct" },
    { label: locale === "sq" ? "Prona" : "Properties", value: "property_thread" },
    { label: locale === "sq" ? "Takime" : "Meetings", value: "meeting_thread" },
    { label: "Deals", value: "deal_room" },
    { label: locale === "sq" ? "Ekipi" : "Team", value: "team_channel" },
    { label: locale === "sq" ? "Arkiv" : "Archived", value: "archived" },
  ];
}

function getConversationIcon(type: ConversationType) {
  if (type === "property_thread" || type === "media_request") {
    return Building2;
  }

  if (type === "meeting_thread") {
    return CalendarClock;
  }

  if (type === "team_channel") {
    return Hash;
  }

  if (type === "group" || type === "deal_room") {
    return Users;
  }

  return MessageCircle;
}

export function ConversationList({
  activeConversationId,
  conversations,
  currentUserId,
  filter,
  locale,
  onCreateClick,
  onFilterChange,
  onQueryChange,
  onSelectConversation,
  query,
}: ConversationListProps) {
  const filters = getFilters(locale);

  return (
    <aside className="crm-card min-h-0 min-w-0 overflow-hidden">
      <div className="border-b border-slate-200 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-950">
              {locale === "sq" ? "Bisedat" : "Conversations"}
            </h2>
            <p className="text-xs text-slate-500">
              {locale === "sq"
                ? "Mesazhe te lidhura me punen ne CRM"
                : "Messages tied to CRM work"}
            </p>
          </div>
          <button
            className="crm-button crm-button-primary h-9 min-h-9 shrink-0 px-3"
            onClick={onCreateClick}
            type="button"
          >
            {locale === "sq" ? "I ri" : "New"}
          </button>
        </div>

        <label className="relative mt-3 block">
          <span className="sr-only">{locale === "sq" ? "Kerko mesazhe" : "Search messages"}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="crm-input h-10 min-h-10 bg-slate-50 pl-9 pr-3 text-sm text-slate-950 focus:bg-white"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={locale === "sq" ? "Kerko biseda, prona, dergues" : "Search conversations, properties, senders"}
            value={query}
          />
        </label>

        <div className="crm-scroll-area mt-3 flex gap-1 overflow-x-auto pb-1">
          {filters.map((item) => (
            <button
              className={`h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition ${
                filter === item.value
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              key={item.value}
              onClick={() => onFilterChange(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid max-h-[min(70dvh,620px)] min-h-[360px] content-start gap-1 overflow-y-auto p-2 xl:max-h-[72dvh]">
        {conversations.length === 0 ? (
          <div className="crm-empty-state m-2 p-4 text-sm leading-6 text-slate-500">
            {filter === "unread"
              ? locale === "sq"
                ? "Nuk ka mesazhe te palexuara."
                : "You're all caught up."
              : locale === "sq"
                ? "Nis nje bisede me ekipin ose hap diskutimin e nje prone."
                : "Start a conversation with your team or open a property discussion."}
          </div>
        ) : null}

        {conversations.map((conversation) => {
          const Icon = getConversationIcon(conversation.type);
          const active = conversation.id === activeConversationId;
          const title = getConversationTitle(conversation, currentUserId, locale);

          return (
            <button
              className={`grid w-full min-w-0 gap-2 rounded-xl p-3 text-left transition ${
                active
                  ? "bg-emerald-50 ring-1 ring-emerald-200"
                  : "hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100"
              }`}
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              type="button"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getConversationTypeTone(conversation.type)}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="line-clamp-1 text-sm font-semibold text-slate-950">
                        {title}
                      </h3>
                      {conversation.is_archived ? (
                        <Archive className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      {getConversationTypeLabel(conversation.type, locale)}
                    </p>
                  </div>
                </div>
                <UnreadBadge count={conversation.unreadCount} />
              </div>

              <p className="line-clamp-2 break-words text-xs leading-5 text-slate-500">
                {getMessagePreview(conversation.lastMessage, locale)}
              </p>
              <p className="text-[11px] text-slate-400">
                {formatMessagingDateTime(
                  conversation.last_message_at || conversation.created_at,
                  locale,
                )}
              </p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

