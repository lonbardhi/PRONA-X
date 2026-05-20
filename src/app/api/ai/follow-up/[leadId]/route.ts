import { NextResponse } from "next/server";

import { getFollowUpApiContext, followUpApiError } from "@/modules/ai-followup/followup.api";
import { generateAndStoreFollowUpInsight } from "@/modules/ai-followup/followup.service";
import { leadIdSchema } from "@/modules/ai-followup/followup.validation";

type RouteContext = {
  params: Promise<{ leadId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
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

  try {
    const insight = await generateAndStoreFollowUpInsight({
      leadId: parsedLeadId.data,
      supabase: apiContext.supabase,
    });

    return NextResponse.json({ data: insight, success: true });
  } catch (error) {
    return followUpApiError(error, "Could not load follow-up insight.");
  }
}
