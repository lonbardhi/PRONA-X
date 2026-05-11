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
  const redirectPath = await updatePropertyFromFormData(id, await request.formData());

  return NextResponse.redirect(new URL(redirectPath, request.url), {
    status: 303,
  });
}
