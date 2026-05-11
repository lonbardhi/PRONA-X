import { NextResponse } from "next/server";

import { createPropertyFromFormData } from "@/app/properties/actions";

export async function POST(request: Request) {
  const redirectPath = await createPropertyFromFormData(await request.formData());

  return NextResponse.redirect(new URL(redirectPath, request.url), {
    status: 303,
  });
}
