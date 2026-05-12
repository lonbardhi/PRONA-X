import { NextResponse } from "next/server";

import { createPropertyFromFormData } from "@/app/properties/actions";

export async function POST(request: Request) {
  const result = await createPropertyFromFormData(await request.formData());

  if (request.headers.get("x-prona-response") === "json") {
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  }

  return NextResponse.redirect(new URL(result.redirectPath, request.url), {
    status: 303,
  });
}
