import { NextResponse } from "next/server";

import {
  getSmartListingKitApiContext,
  smartListingKitApiError,
} from "@/modules/smart-listing-kit/smart-listing-kit.api";
import { listSmartKitAssets } from "@/modules/smart-listing-kit/smart-listing-kit.service";
import { smartKitListingParamsSchema } from "@/modules/smart-listing-kit/smart-listing-kit.validation";

export async function GET(
  _request: Request,
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

  try {
    const data = await listSmartKitAssets({
      listingId: params.data.id,
      supabase: apiContext.supabase,
    });

    return NextResponse.json({ data, success: true });
  } catch (error) {
    return smartListingKitApiError(error, "Could not load Smart Listing Kit assets.");
  }
}
