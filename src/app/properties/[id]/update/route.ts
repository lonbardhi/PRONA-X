import { NextResponse } from "next/server";

import { updatePropertyFromFormData } from "@/app/properties/actions";

type UpdatePropertyRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: UpdatePropertyRouteContext,
) {
  const { id } = await params;
  const result = await updatePropertyFromFormData(id, await request.formData());

  if (request.headers.get("x-prona-response") === "json") {
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  }

  return NextResponse.redirect(new URL(result.redirectPath, request.url), {
    status: 303,
  });
}
