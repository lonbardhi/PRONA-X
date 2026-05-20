import { NextResponse } from "next/server";

import { getFollowUpApiContext, followUpApiError } from "@/modules/ai-followup/followup.api";
import { createLeadActivityEvent } from "@/modules/ai-followup/followup.service";
import { createLeadActivityEventSchema } from "@/modules/ai-followup/followup.validation";

export async function POST(request: Request) {
  const apiContext = await getFollowUpApiContext();
  if ("response" in apiContext) {
    return apiContext.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON.", success: false },
      { status: 400 },
    );
  }

  const parsed = createLeadActivityEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "Invalid lead activity event.",
        success: false,
      },
      { status: 400 },
    );
  }

  try {
    const result = await createLeadActivityEvent({
      input: parsed.data,
      supabase: apiContext.supabase,
      userId: apiContext.user.id,
    });

    return NextResponse.json({ data: result, success: true });
  } catch (error) {
    return followUpApiError(error, "Could not create lead activity event.");
  }
}
