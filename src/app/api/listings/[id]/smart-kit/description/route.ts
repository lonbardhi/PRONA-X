import { NextResponse } from "next/server";

import {
  getSmartListingKitApiContext,
  smartListingKitApiError,
} from "@/modules/smart-listing-kit/smart-listing-kit.api";
import { generateSmartKitDescription } from "@/modules/smart-listing-kit/smart-listing-kit.service";
import {
  aiDescriptionRequestSchema,
  smartKitListingParamsSchema,
} from "@/modules/smart-listing-kit/smart-listing-kit.validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const apiContext = await getSmartListingKitApiContext();
  if ("response" in apiContext) {
    return apiContext.response;
  }

  const params = smartKitListingParamsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json(
      { error: params.error.issues[0]?.message || "Invalid listing id.", success: false },
      { status: 400 },
    );
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

  const parsed = aiDescriptionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "Invalid AI description options.",
        success: false,
      },
      { status: 400 },
    );
  }

  try {
    const data = await generateSmartKitDescription({
      input: parsed.data,
      listingId: params.data.id,
      locale: parsed.data.language,
      supabase: apiContext.supabase,
      userId: apiContext.user.id,
    });

    return NextResponse.json({ data, success: true });
  } catch (error) {
    return smartListingKitApiError(error, "Could not generate listing description.");
  }
}
