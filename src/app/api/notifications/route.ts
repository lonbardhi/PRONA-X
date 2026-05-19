import { NextResponse, type NextRequest } from "next/server";

import { getNotificationApiContext, notificationApiError } from "@/lib/notifications/api";
import { listNotificationsForUser } from "@/lib/notifications/service";
import { notificationListQuerySchema } from "@/lib/notifications/validation";

export async function GET(request: NextRequest) {
  const context = await getNotificationApiContext();
  if ("response" in context) {
    return context.response;
  }

  const parsed = notificationListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid notification filters." },
      { status: 400 },
    );
  }

  try {
    const result = await listNotificationsForUser({
      ...parsed.data,
      supabase: context.supabase,
      userId: context.user.id,
      workspaceId: context.workspaceId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return notificationApiError(error);
  }
}
