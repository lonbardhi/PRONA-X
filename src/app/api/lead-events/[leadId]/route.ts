import { NextResponse, type NextRequest } from "next/server";

import { getFollowUpApiContext, followUpApiError } from "@/modules/ai-followup/followup.api";
import { listLeadActivityEvents } from "@/modules/ai-followup/followup.service";
import {
  leadActivityEventQuerySchema,
  leadIdSchema,
} from "@/modules/ai-followup/followup.validation";

type RouteContext = {
  params: Promise<{ leadId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const apiContext = await getFollowUpApiContext();
  if ("response" in apiContext) {
    return apiContext.response;
  }

  const params = await context.params;
  const parsedLeadId = leadIdSchema.safeParse(params.leadId);
  if (!parsedLeadId.success) {
    return NextResponse.json(
      {
        error: parsedLeadId.error.issues[0]?.message || "Invalid lead id.",
        success: false,
      },
      { status: 400 },
    );
  }

  const parsedQuery = leadActivityEventQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: parsedQuery.error.issues[0]?.message || "Invalid activity filters.",
        success: false,
      },
      { status: 400 },
    );
  }

  try {
    const events = await listLeadActivityEvents({
      leadId: parsedLeadId.data,
      limit: parsedQuery.data.limit,
      supabase: apiContext.supabase,
    });

    return NextResponse.json({ data: events, success: true });
  } catch (error) {
    return followUpApiError(error, "Could not load lead activity events.");
  }
}
