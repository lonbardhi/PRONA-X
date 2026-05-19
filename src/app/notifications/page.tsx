import { DashboardShell } from "@/components/DashboardShell";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { getCurrentLocale } from "@/lib/i18n-server";
import {
  getNotificationWorkspaceId,
  listNotificationsForUser,
} from "@/lib/notifications/service";
import { requireApprovedUser } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const locale = await getCurrentLocale();
  const { profile, supabase, user } = await requireApprovedUser();
  const initialData = await listNotificationsForUser({
    limit: 50,
    status: "active",
    supabase,
    userId: user.id,
    workspaceId: getNotificationWorkspaceId(profile),
  });

  return (
    <DashboardShell userEmail={user.email} userRole={profile.role}>
      <NotificationCenter initialData={initialData} locale={locale} />
    </DashboardShell>
  );
}
