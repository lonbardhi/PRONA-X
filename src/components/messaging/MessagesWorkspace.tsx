"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox } from "lucide-react";

import { ConversationList } from "@/components/messaging/ConversationList";
import { ConversationView } from "@/components/messaging/ConversationView";
import { CreateConversationModal } from "@/components/messaging/CreateConversationModal";
import {
  useConversationSearch,
  useConversations,
} from "@/hooks/useMessaging";
import type { Locale } from "@/lib/i18n";
import type {
  ConversationListItem,
  MessageRecord,
  MessagingProfile,
} from "@/lib/messaging";

type MessagesWorkspaceProps = {
  canManageConversations: boolean;
  currentUserId: string;
  initialConversationId: string | null;
  initialConversations: ConversationListItem[];
  initialMessages: MessageRecord[];
  locale: Locale;
  message?: string;
  profiles: MessagingProfile[];
};

export function MessagesWorkspace({
  canManageConversations,
  currentUserId,
  initialConversationId,
  initialConversations,
  initialMessages,
  locale,
  message,
  profiles,
}: MessagesWorkspaceProps) {
  const router = useRouter();
  const [activeConversationId, setActiveConversationId] = useState(initialConversationId);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const { conversations, upsertLastMessage } = useConversations(initialConversations);
  const filteredConversations = useConversationSearch({
    conversations,
    currentUserId,
    filter,
    locale,
    query,
  });
  const activeConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === activeConversationId) ||
      null,
    [activeConversationId, conversations],
  );

  function selectConversation(conversationId: string) {
    setActiveConversationId(conversationId);
    router.replace(`/messages?conversation=${conversationId}`, { scroll: false });
  }

  function handleLatestMessage(conversationId: string, latestMessage: MessageRecord) {
    upsertLastMessage(conversationId, latestMessage);
  }

  return (
    <>
      <section className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-6 sm:py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                <Inbox className="h-3.5 w-3.5" />
                {locale === "sq" ? "Mesazhe te brendshme" : "Internal Messages"}
              </span>
              <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                {locale === "sq" ? "Qendra e komunikimit PRONA X" : "PRONA X communication center"}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {locale === "sq"
                  ? "Biseda direkte, diskutime pronash, takime dhe koordinim ekipi te lidhura me kontekstin e CRM."
                  : "Direct messages, property threads, meeting logistics, and team coordination tied to CRM context."}
              </p>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:min-w-[420px]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 sm:tracking-[0.12em]">
                  {locale === "sq" ? "Biseda" : "Threads"}
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                  {conversations.length}
                </p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 sm:p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-rose-700 sm:tracking-[0.12em]">
                  {locale === "sq" ? "Pa lexuar" : "Unread"}
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                  {conversations.reduce(
                    (total, conversation) => total + conversation.unreadCount,
                    0,
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 sm:p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700 sm:tracking-[0.12em]">
                  {locale === "sq" ? "Prona" : "Properties"}
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                  {
                    conversations.filter(
                      (conversation) => conversation.type === "property_thread",
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {message ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {message}
          </div>
        ) : null}

        <div className="grid min-h-0 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <ConversationList
            activeConversationId={activeConversationId}
            conversations={filteredConversations}
            currentUserId={currentUserId}
            filter={filter}
            locale={locale}
            onCreateClick={() => setCreateOpen(true)}
            onFilterChange={setFilter}
            onQueryChange={setQuery}
            onSelectConversation={selectConversation}
            query={query}
          />

          <ConversationView
            canManageConversation={
              canManageConversations ||
              Boolean(activeConversation?.created_by === currentUserId)
            }
            conversation={activeConversation}
            currentUserId={currentUserId}
            initialConversationId={initialConversationId}
            initialMessages={initialMessages}
            locale={locale}
            onLatestMessage={handleLatestMessage}
            profiles={profiles}
            returnTo={
              activeConversationId
                ? `/messages?conversation=${activeConversationId}`
                : "/messages"
            }
          />
        </div>
      </section>

      <CreateConversationModal
        currentUserId={currentUserId}
        locale={locale}
        onClose={() => setCreateOpen(false)}
        open={createOpen}
        profiles={profiles}
      />
    </>
  );
}
