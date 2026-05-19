import { NextResponse } from "next/server";

import { getNotificationApiContext, notificationApiError } from "@/lib/notifications/api";
import { markNotificationRead } from "@/lib/notifications/service";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getNotificationApiContext();
  if ("response" in context) {
    return context.response;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Notification ID is required." }, { status: 400 });
  }

  try {
    await markNotificationRead({
      notificationId: id,
      supabase: context.supabase,
      userId: context.user.id,
      workspaceId: context.workspaceId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return notificationApiError(error);
  }
}
