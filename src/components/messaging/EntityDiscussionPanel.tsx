import { MessageSquareText, Plus } from "lucide-react";

import { createEntityConversationAction } from "@/app/messages/actions";
import { ConversationView } from "@/components/messaging/ConversationView";
import {
  getConversationMessages,
  getEntityConversation,
  getMessagingProfiles,
} from "@/lib/messaging-data";
import type {
  ConversationEntityType,
  ConversationListItem,
  ConversationType,
} from "@/lib/messaging";
import type { Locale } from "@/lib/i18n";
import { requireApprovedUser } from "@/lib/supabase/server";

type EntityDiscussionPanelProps = {
  conversationType: Extract<
    ConversationType,
    "property_thread" | "lead_thread" | "meeting_thread" | "deal_room" | "media_request"
  >;
  entityId: string;
  entityTitle: string;
  entityType: ConversationEntityType;
  locale: Locale;
  returnTo: string;
};

export async function EntityDiscussionPanel({
  conversationType,
  entityId,
  entityTitle,
  entityType,
  locale,
  returnTo,
}: EntityDiscussionPanelProps) {
  const { profile, supabase, user } = await requireApprovedUser();
  const conversation = await getEntityConversation(
    supabase,
    entityType,
    entityId,
    conversationType,
  );

  if (!conversation) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-semibold text-slate-950">
                {locale === "sq" ? "Diskutim i brendshem" : "Internal discussion"}
              </h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {entityType === "property"
                ? locale === "sq"
                  ? "Ende nuk ka diskutim te brendshem per kete prone."
                  : "No internal discussion yet for this property."
                : locale === "sq"
                  ? "Ende nuk ka diskutim per kete rekord."
                  : "No discussion yet for this record."}
            </p>
          </div>
          <form action={createEntityConversationAction}>
            <input name="conversation_type" type="hidden" value={conversationType} />
            <input name="entity_id" type="hidden" value={entityId} />
            <input name="entity_type" type="hidden" value={entityType} />
            <input name="return_to" type="hidden" value={returnTo} />
            <input name="title" type="hidden" value={entityTitle} />
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:w-auto">
              <Plus className="h-4 w-4" />
              {locale === "sq" ? "Nis diskutimin" : "Start discussion"}
            </button>
          </form>
        </div>
      </section>
    );
  }

  const [messages, profiles] = await Promise.all([
    getConversationMessages(supabase, conversation.id),
    getMessagingProfiles(supabase),
  ]);
  const conversationItem: ConversationListItem = {
    ...conversation,
    lastMessage: messages[messages.length - 1] || null,
    participants: [],
    relatedLabel: entityTitle,
    unreadCount: conversation.unreadCount || 0,
  };

  return (
    <ConversationView
      canManageConversation={
        profile.role === "admin" ||
        profile.role === "manager" ||
        conversation.created_by === user.id
      }
      compact
      conversation={conversationItem}
      currentUserId={user.id}
      initialConversationId={conversation.id}
      initialMessages={messages}
      locale={locale}
      profiles={profiles}
      returnTo={returnTo}
    />
  );
}

