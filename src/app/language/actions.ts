"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";
import { getSafeLocaleReturnPath } from "@/lib/i18n-server";

export async function setLocaleAction(formData: FormData) {
  const locale = normalizeLocale(formData.get("locale"));
  const returnTo = String(formData.get("return_to") || "");
  const fallback = await getSafeLocaleReturnPath("/");
  const safeReturnTo =
    returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : fallback;
  const cookieStore = await cookies();

  cookieStore.set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect(safeReturnTo);
}
