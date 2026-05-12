import { Database } from "lucide-react";

import { DashboardShell } from "@/components/DashboardShell";
import { MessagesWorkspace } from "@/components/messaging/MessagesWorkspace";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseEnv } from "@/lib/env";
import { getCurrentLocale } from "@/lib/i18n-server";
import {
  getMessagingPageData,
  getMessagingSetupWarning,
} from "@/lib/messaging-data";
import { requireApprovedUser } from "@/lib/supabase/server";

type MessagesPageProps = {
  searchParams: Promise<{
    conversation?: string;
    message?: string;
  }>;
};

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const params = await searchParams;
  const locale = await getCurrentLocale();
  const { profile, supabase, user } = await requireApprovedUser();
  const setupWarning = await getMessagingSetupWarning(supabase);

  if (setupWarning) {
    return (
      <DashboardShell userEmail={user.email} userRole={profile.role}>
        <section className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-6 sm:py-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
            <Database className="mx-auto h-8 w-8" />
            <h1 className="mt-3 text-xl font-semibold">
              {locale === "sq"
                ? "Aktivizo databazen e mesazheve"
                : "Enable the messaging database"}
            </h1>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6">{setupWarning}</p>
          </div>
        </section>
      </DashboardShell>
    );
  }

  const data = await getMessagingPageData({
    selectedConversationId: params.conversation,
    supabase,
    user,
  });

  return (
    <DashboardShell userEmail={user.email} userRole={profile.role}>
      <MessagesWorkspace
        canManageConversations={profile.role === "admin" || profile.role === "manager"}
        currentUserId={user.id}
        initialConversationId={data.activeConversationId}
        initialConversations={data.conversations}
        initialMessages={data.messages}
        locale={locale}
        message={params.message}
        openConversationOnMobile={Boolean(params.conversation)}
        profiles={data.profiles}
      />
    </DashboardShell>
  );
}

