import { NextResponse } from "next/server";

import { getNotificationApiContext, notificationApiError } from "@/lib/notifications/api";
import { snoozeNotification } from "@/lib/notifications/service";
import { notificationSnoozeSchema } from "@/lib/notifications/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getNotificationApiContext();
  if ("response" in context) {
    return context.response;
  }

  const { id } = await params;
  const parsed = notificationSnoozeSchema.safeParse(await request.json().catch(() => ({})));
  if (!id || !parsed.success) {
    return NextResponse.json(
      { error: parsed.success ? "Notification ID is required." : parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  try {
    await snoozeNotification({
      notificationId: id,
      snoozedUntil: parsed.data.snoozedUntil,
      supabase: context.supabase,
      userId: context.user.id,
      workspaceId: context.workspaceId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return notificationApiError(error);
  }
}
