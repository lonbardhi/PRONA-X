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
  getAvailabilityStatusDotClass,
  getAvailabilityStatusToneClass,
  type AvailabilityStatus,
} from "@/lib/agent-workspace";
import {
  getConversationTitle,
  getConversationTypeLabel,
  getConversationTypeTone,
  getProfileAvailabilityTitle,
  getProfileDisplayName,
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

function getParticipantDisplayName(
  participant: ConversationListItem["participants"][number],
) {
  return participant.profile
    ? getProfileDisplayName(participant.profile)
    : `User ${participant.user_id.slice(0, 8)}`;
}

function ParticipantPresenceList({
  conversation,
  locale,
}: {
  conversation: ConversationListItem;
  locale: Locale;
}) {
  const visibleParticipants = conversation.participants.slice(0, 4);

  if (visibleParticipants.length === 0) {
    return (
      <p className="mt-1 text-sm text-slate-500">
        {locale === "sq" ? "Diskutim i brendshem" : "Internal discussion"}
      </p>
    );
  }

  return (
    <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
      {visibleParticipants.map((participant) => {
        const status = participant.profile?.availability_status;
        const title = [
          getParticipantDisplayName(participant),
          getProfileAvailabilityTitle(participant.profile, locale),
        ]
          .filter(Boolean)
          .join(" / ");

        return (
          <span
            className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              status
                ? getAvailabilityStatusToneClass(status)
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
            key={participant.id}
            title={title}
          >
            {status ? (
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${getAvailabilityStatusDotClass(status)}`}
              />
            ) : null}
            <span className="max-w-[160px] truncate">
              {getParticipantDisplayName(participant)}
            </span>
          </span>
        );
      })}
      {conversation.participants.length > visibleParticipants.length ? (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
          +{conversation.participants.length - visibleParticipants.length}
        </span>
      ) : null}
    </div>
  );
}

function getAvailabilityExpectationNotice({
  conversation,
  currentUserId,
  locale,
}: {
  conversation: ConversationListItem;
  currentUserId: string;
  locale: Locale;
}) {
  const participant = conversation.participants.find((item) => {
    const status = item.profile?.availability_status;

    return item.user_id !== currentUserId && status && status !== "available";
  });

  const profile = participant?.profile;
  const status = profile?.availability_status;

  if (!profile || !status || status === "available") {
    return null;
  }

  const name = getProfileDisplayName(profile);
  const note = profile.availability_status_message
    ? ` ${profile.availability_status_message}`
    : "";

  const messages: Record<AvailabilityStatus, { en: string; sq: string }> = {
    available: { en: "", sq: "" },
    away: {
      en: `${name} is away from desk.${note}`,
      sq: `${name} eshte larg nga tavolina.${note}`,
    },
    do_not_disturb: {
      en: `${name} is not available.${note}`,
      sq: `${name} nuk eshte i disponueshem.${note}`,
    },
    driving: {
      en: `${name} is on the move.${note}`,
      sq: `${name} eshte ne levizje.${note}`,
    },
    in_meeting: {
      en: `${name} is in a meeting.${note}`,
      sq: `${name} eshte ne takim.${note}`,
    },
    offline: {
      en: `${name} is offline.${note}`,
      sq: `${name} eshte jashte linje.${note}`,
    },
    property_visit: {
      en: `${name} is on a property visit.${note}`,
      sq: `${name} eshte ne vizite prone.${note}`,
    },
    vacation: {
      en: `${name} is on vacation.${note}`,
      sq: `${name} eshte me pushime.${note}`,
    },
  };

  const expectation =
    locale === "sq" ? messages[status].sq : messages[status].en;

  return expectation
    ? `${expectation} ${
        locale === "sq" ? "Mesazhet dergohen gjithsesi." : "Messages are still delivered."
      }`
    : null;
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
  const availabilityNotice = getAvailabilityExpectationNotice({
    conversation,
    currentUserId,
    locale,
  });

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
              <ParticipantPresenceList conversation={conversation} locale={locale} />
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

      {availabilityNotice ? (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
          {availabilityNotice}
        </div>
      ) : null}

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

