import { NextResponse } from "next/server";

import { getNotificationApiContext, notificationApiError } from "@/lib/notifications/api";
import { markAllNotificationsRead } from "@/lib/notifications/service";
import { markAllNotificationsSchema } from "@/lib/notifications/validation";

export async function PATCH(request: Request) {
  const context = await getNotificationApiContext();
  if ("response" in context) {
    return context.response;
  }

  const parsed = markAllNotificationsSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid notification action." },
      { status: 400 },
    );
  }

  try {
    await markAllNotificationsRead({
      category: parsed.data.category,
      supabase: context.supabase,
      userId: context.user.id,
      workspaceId: context.workspaceId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return notificationApiError(error);
  }
}
