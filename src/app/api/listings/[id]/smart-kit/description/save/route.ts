import { NextResponse } from "next/server";

import {
  getSmartListingKitApiContext,
  smartListingKitApiError,
} from "@/modules/smart-listing-kit/smart-listing-kit.api";
import { saveGeneratedDescriptionToListing } from "@/modules/smart-listing-kit/smart-listing-kit.service";
import {
  saveDescriptionRequestSchema,
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

  const parsed = saveDescriptionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "Invalid description payload.",
        success: false,
      },
      { status: 400 },
    );
  }

  try {
    const data = await saveGeneratedDescriptionToListing({
      assetId: parsed.data.assetId,
      description: parsed.data.description,
      listingId: params.data.id,
      supabase: apiContext.supabase,
      userId: apiContext.user.id,
    });

    return NextResponse.json({ data, success: true });
  } catch (error) {
    return smartListingKitApiError(error, "Could not save description to listing.");
  }
}
