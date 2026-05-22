import { NextResponse } from "next/server";

import {
  getSmartListingKitApiContext,
  smartListingKitApiError,
} from "@/modules/smart-listing-kit/smart-listing-kit.api";
import { generateSmartKitWhatsApp } from "@/modules/smart-listing-kit/smart-listing-kit.service";
import {
  smartKitListingParamsSchema,
  smartKitLocaleRequestSchema,
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

  const body = await request.json().catch(() => ({}));
  const parsed = smartKitLocaleRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid locale.", success: false },
      { status: 400 },
    );
  }

  try {
    const data = await generateSmartKitWhatsApp({
      listingId: params.data.id,
      locale: parsed.data.locale,
      supabase: apiContext.supabase,
      userId: apiContext.user.id,
    });

    return NextResponse.json({ data, success: true });
  } catch (error) {
    return smartListingKitApiError(error, "Could not generate WhatsApp message.");
  }
}
