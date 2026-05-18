"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import {
  Archive,
  Building2,
  CalendarClock,
  ExternalLink,
  MessageSquareText,
  Users,
} from "lucide-react";

import { archiveConversationAction } from "@/app/messages/actions";
import { MessageBubble } from "@/components/messaging/MessageBubble";
import { MessageComposer } from "@/components/messaging/MessageComposer";
import { useConversationMessages } from "@/hooks/useMessaging";
import {
  getConversationTitle,
  getConversationTypeLabel,
  getConversationTypeTone,
  type ConversationListItem,
  type MessageRecord,
  type MessagingProfile,
} from "@/lib/messaging";
import type { Locale } from "@/lib/i18n";

type ConversationViewProps = {
  canManageConversation?: boolean;
  compact?: boolean;
  conversation: ConversationListItem | null;
  currentUserId: string;
  initialConversationId: string | null;
  initialMessages: MessageRecord[];
  locale: Locale;
  onConversationRead?: (conversationId: string, latestMessage: MessageRecord) => void;
  onConversationReadCommitted?: (conversationId: string) => void;
  onLatestMessage?: (conversationId: string, message: MessageRecord) => void;
  profiles: MessagingProfile[];
  returnTo: string;
};

function getRelatedHref(conversation: ConversationListItem) {
  if (conversation.related_entity_type === "property" && conversation.related_entity_id) {
    return `/properties/${conversation.related_entity_id}/edit`;
  }

  if (conversation.related_entity_type === "meeting" && conversation.related_entity_id) {
    return "/appointments";
  }

  return null;
}

function HeaderIcon({ conversation }: { conversation: ConversationListItem }) {
  const className = `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getConversationTypeTone(conversation.type)}`;

  if (conversation.type === "property_thread" || conversation.type === "media_request") {
    return (
      <span className={className}>
        <Building2 className="h-5 w-5" />
      </span>
    );
  }

  if (conversation.type === "meeting_thread") {
    return (
      <span className={className}>
        <CalendarClock className="h-5 w-5" />
      </span>
    );
  }

  if (conversation.type === "group" || conversation.type === "deal_room") {
    return (
      <span className={className}>
        <Users className="h-5 w-5" />
      </span>
    );
  }

  return (
    <span className={className}>
      <MessageSquareText className="h-5 w-5" />
    </span>
  );
}

export function ConversationView({
  canManageConversation = false,
  compact = false,
  conversation,
  currentUserId,
  initialConversationId,
  initialMessages,
  locale,
  onConversationRead,
  onConversationReadCommitted,
  onLatestMessage,
  profiles,
  returnTo,
}: ConversationViewProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const { error, loading, messages } = useConversationMessages({
    activeConversationId: conversation?.id || null,
    currentUserId,
    initialConversationId,
    initialMessages,
    onConversationRead,
    onConversationReadCommitted,
    onLatestMessage,
  });
  const mentionProfiles = useMemo(() => {
    if (!conversation?.participants.length) {
      return profiles;
    }

    const participantIds = new Set(
      conversation.participants.map((participant) => participant.user_id),
    );
    const participantProfiles = conversation.participants
      .map((participant) => participant.profile)
      .filter((profile): profile is MessagingProfile => Boolean(profile));
    const extraProfiles = profiles.filter((profile) => participantIds.has(profile.id));
    const profileMap = new Map(
      [...participantProfiles, ...extraProfiles].map((profile) => [profile.id, profile]),
    );

    return Array.from(profileMap.values());
  }, [conversation, profiles]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, conversation?.id]);

  if (!conversation) {
    return (
      <section className="crm-empty-state grid min-h-[420px] place-items-center p-6 sm:min-h-[520px]">
        <div>
          <MessageSquareText className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-3 text-lg font-semibold text-slate-950">
            {locale === "sq" ? "Zgjidh nje bisede" : "Choose a conversation"}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            {locale === "sq"
              ? "Mesazhet e ekipit, pronave dhe takimeve do te shfaqen ketu."
              : "Team, property, and meeting messages will appear here."}
          </p>
        </div>
      </section>
    );
  }

  const title = getConversationTitle(conversation, currentUserId, locale);
  const relatedHref = getRelatedHref(conversation);
  const currentParticipant = conversation.participants.find(
    (participant) => participant.user_id === currentUserId,
  );
  const readOnly =
    conversation.is_archived || currentParticipant?.role === "readonly";

  return (
    <section
      className={`crm-card grid min-h-0 overflow-hidden ${
        compact
          ? "h-[640px]"
          : "h-[calc(100dvh-13rem)] min-h-[520px] sm:h-[calc(100dvh-10rem)] sm:min-h-[620px]"
      }`}
    >
      <div className="border-b border-slate-200 p-3 sm:p-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <HeaderIcon conversation={conversation} />
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="break-words text-base font-semibold text-slate-950 sm:text-lg">
                  {title}
                </h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getConversationTypeTone(conversation.type)}`}
                >
                  {getConversationTypeLabel(conversation.type, locale)}
                </span>
              </div>
              <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                {conversation.participants.length > 0
                  ? conversation.participants
                      .slice(0, 4)
                      .map((participant) =>
                        participant.profile?.full_name || participant.profile?.email || participant.user_id.slice(0, 8),
                      )
                      .join(", ")
                  : locale === "sq"
                    ? "Diskutim i brendshem"
                    : "Internal discussion"}
              </p>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
            {relatedHref ? (
              <Link
                className="crm-button crm-button-secondary h-9 min-h-9 min-w-0 px-3 text-xs"
                href={relatedHref}
                prefetch={false}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {locale === "sq" ? "CRM" : "CRM"}
              </Link>
            ) : null}
            {canManageConversation && !conversation.is_archived ? (
              <form action={archiveConversationAction}>
                <input name="conversation_id" type="hidden" value={conversation.id} />
                <input name="return_to" type="hidden" value={returnTo} />
                <button
                  aria-label={locale === "sq" ? "Arkivo biseden" : "Archive conversation"}
                  className="crm-button crm-button-secondary h-9 min-h-9 min-w-0 px-3 text-xs"
                >
                  <Archive className="h-3.5 w-3.5" />
                  {locale === "sq" ? "Arkivo" : "Archive"}
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto bg-slate-50 p-3 sm:p-4">
        {loading ? (
          <div className="crm-card bg-white p-4 text-sm text-slate-500">
            {locale === "sq" ? "Duke ngarkuar mesazhet..." : "Loading messages..."}
          </div>
        ) : null}

        {error ? (
          <div className="crm-card mb-3 border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {messages.length === 0 && !loading ? (
          <div className="crm-empty-state p-5 text-sm leading-6 text-slate-500">
            {conversation.related_entity_type === "property"
              ? locale === "sq"
                ? "Ende nuk ka diskutim te brendshem per kete prone."
                : "No internal discussion yet for this property."
              : conversation.related_entity_type === "meeting"
                ? locale === "sq"
                  ? "Ende nuk ka shenime per kete takim."
                  : "No meeting notes yet. Add logistics or follow-up details here."
                : locale === "sq"
                  ? "Nis biseden me ekipin."
                  : "Start the conversation with your team."}
          </div>
        ) : (
          <div className="grid gap-3">
            {messages.map((message) => (
              <MessageBubble
                currentUserId={currentUserId}
                key={message.id}
                locale={locale}
                message={message}
                returnTo={returnTo}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <MessageComposer
        conversationId={conversation.id}
        disabled={readOnly}
        locale={locale}
        profiles={mentionProfiles}
        returnTo={returnTo}
      />
    </section>
  );
}

