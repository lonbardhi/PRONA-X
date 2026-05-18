"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Inbox } from "lucide-react";

import { CommunicationChannelTabs } from "@/components/messaging/CommunicationChannelTabs";
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
  openConversationOnMobile?: boolean;
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
  openConversationOnMobile = false,
  profiles,
}: MessagesWorkspaceProps) {
  const router = useRouter();
  const [activeConversationId, setActiveConversationId] = useState(initialConversationId);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<"list" | "conversation">(
    openConversationOnMobile && initialConversationId ? "conversation" : "list",
  );
  const pendingNavbarRefreshIdsRef = useRef<Set<string>>(new Set());
  const { conversations, markConversationRead, upsertLastMessage } = useConversations(
    initialConversations,
    currentUserId,
  );
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

  const handleConversationRead = useCallback(
    (conversationId: string, latestMessage: MessageRecord) => {
      const conversation = conversations.find((item) => item.id === conversationId);

      if (conversation && conversation.unreadCount > 0) {
        pendingNavbarRefreshIdsRef.current.add(conversationId);
      }

      markConversationRead(conversationId, latestMessage);
    },
    [conversations, markConversationRead],
  );

  const handleConversationReadCommitted = useCallback(
    (conversationId: string) => {
      if (!pendingNavbarRefreshIdsRef.current.delete(conversationId)) {
        return;
      }

      router.refresh();
    },
    [router],
  );

  function selectConversation(conversationId: string) {
    const conversation = conversations.find((item) => item.id === conversationId);

    if (conversation?.lastMessage) {
      handleConversationRead(conversationId, conversation.lastMessage);
    }

    setActiveConversationId(conversationId);
    setMobilePane("conversation");
    router.replace(`/messages?conversation=${conversationId}`, { scroll: false });
  }

  function handleLatestMessage(conversationId: string, latestMessage: MessageRecord) {
    upsertLastMessage(conversationId, latestMessage);
  }

  return (
    <>
      <section className="mx-auto grid max-w-[1500px] gap-4 overflow-x-hidden px-3 py-4 sm:gap-5 sm:px-6 sm:py-6">
        <div className="crm-card p-4 sm:p-5">
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

            <div className="grid w-full grid-cols-1 gap-3 lg:w-auto lg:min-w-[420px]">
              <CommunicationChannelTabs active="internal" locale={locale} />
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                <div className="crm-card min-w-0 bg-slate-50 p-2.5 sm:p-3">
                  <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:text-xs sm:tracking-[0.12em]">
                    {locale === "sq" ? "Biseda" : "Threads"}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                    {conversations.length}
                  </p>
                </div>
                <div className="crm-card min-w-0 border-rose-200 bg-rose-50 p-2.5 sm:p-3">
                  <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-rose-700 sm:text-xs sm:tracking-[0.12em]">
                    {locale === "sq" ? "Pa lexuar" : "Unread"}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                    {conversations.reduce(
                      (total, conversation) => total + conversation.unreadCount,
                      0,
                    )}
                  </p>
                </div>
                <div className="crm-card min-w-0 border-emerald-200 bg-emerald-50 p-2.5 sm:p-3">
                  <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700 sm:text-xs sm:tracking-[0.12em]">
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
        </div>

        {message ? (
          <div className="crm-card border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {message}
          </div>
        ) : null}

        <div className="xl:hidden">
          <div className="crm-card grid grid-cols-2 p-1">
            <button
              className={`h-10 rounded-lg text-sm font-semibold transition ${
                mobilePane === "list"
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
              onClick={() => setMobilePane("list")}
              type="button"
            >
              {locale === "sq" ? "Bisedat" : "Threads"}
            </button>
            <button
              className={`h-10 rounded-lg text-sm font-semibold transition ${
                mobilePane === "conversation"
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              } disabled:cursor-not-allowed disabled:opacity-45`}
              disabled={!activeConversationId}
              onClick={() => setMobilePane("conversation")}
              type="button"
            >
              {locale === "sq" ? "Biseda aktive" : "Active thread"}
            </button>
          </div>
        </div>

        <div className="grid min-h-0 gap-4 xl:grid-cols-[380px_minmax(0,1fr)] xl:gap-5">
          <div className={`${mobilePane === "list" ? "block" : "hidden"} min-w-0 xl:block`}>
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
          </div>

          <div className={`${mobilePane === "conversation" ? "block" : "hidden"} min-w-0 xl:block`}>
            {activeConversation ? (
              <div className="mb-2 flex items-center justify-between gap-2 xl:hidden">
                <button
                  className="crm-button crm-button-secondary h-10 min-h-10 px-3"
                  onClick={() => setMobilePane("list")}
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {locale === "sq" ? "Bisedat" : "Threads"}
                </button>
                <span className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {locale === "sq" ? "Biseda aktive" : "Active thread"}
                </span>
              </div>
            ) : null}

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
              onConversationRead={handleConversationRead}
              onConversationReadCommitted={handleConversationReadCommitted}
              onLatestMessage={handleLatestMessage}
              profiles={profiles}
              returnTo={
                activeConversationId
                  ? `/messages?conversation=${activeConversationId}`
                  : "/messages"
              }
            />
          </div>
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
