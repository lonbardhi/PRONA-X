import { cookies, headers } from "next/headers";

import { LOCALE_COOKIE, normalizeLocale, type Locale } from "@/lib/i18n";

export async function getCurrentLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
}

export async function getSafeLocaleReturnPath(fallback = "/") {
  const headersList = await headers();
  const referer = headersList.get("referer");

  if (!referer) {
    return fallback;
  }

  try {
    const url = new URL(referer);
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}
