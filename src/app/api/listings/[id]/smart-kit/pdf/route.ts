import { NextResponse } from "next/server";

import {
  getSmartListingKitApiContext,
  smartListingKitApiError,
} from "@/modules/smart-listing-kit/smart-listing-kit.api";
import { generateSmartKitPdf } from "@/modules/smart-listing-kit/smart-listing-kit.service";
import {
  pdfGenerationRequestSchema,
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
    body = {};
  }

  const parsed = pdfGenerationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "Invalid PDF generation options.",
        success: false,
      },
      { status: 400 },
    );
  }

  const { locale, ...input } = parsed.data;

  try {
    const data = await generateSmartKitPdf({
      input,
      listingId: params.data.id,
      locale,
      supabase: apiContext.supabase,
      userId: apiContext.user.id,
    });

    return NextResponse.json({ data, success: true });
  } catch (error) {
    return smartListingKitApiError(error, "Could not generate listing PDF.");
  }
}
