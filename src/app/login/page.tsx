import { redirect } from "next/navigation";

import {
  requestPasswordResetAction,
  signInAction,
  signInWithOAuthAction,
  signUpAction,
} from "@/app/login/actions";
import { AuthEntry } from "@/components/AuthEntry";
import { authMessages, getSafeInternalRedirect } from "@/lib/auth/security";
import { SetupNotice } from "@/components/SetupNotice";
import { getAuthDisplayMessage } from "@/lib/auth-messages";
import { hasSupabaseEnv } from "@/lib/env";
import { getCurrentLocale } from "@/lib/i18n-server";
import {
  getClearSessionPath,
  getCurrentUserWithProfile,
  isApprovedProfile,
  isInvalidRefreshTokenError,
} from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    error_code?: string;
    error_description?: string;
    message?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const params = await searchParams;
  const safeNext = getSafeInternalRedirect(params.next);
  const { authError, profile, user } = await getCurrentUserWithProfile();

  if (authError && isInvalidRefreshTokenError(authError)) {
    redirect(
      getClearSessionPath(
        "/login",
        authMessages.sessionExpiredSq,
      ),
    );
  }

  if (user) {
    if (!isApprovedProfile(profile)) {
      redirect("/pending-approval");
    }

    redirect(safeNext);
  }

  const locale = await getCurrentLocale();

  return (
    <AuthEntry
      locale={locale}
      message={getAuthDisplayMessage(params, locale)}
      nextPath={safeNext}
      requestPasswordResetAction={requestPasswordResetAction}
      signInAction={signInAction}
      signInWithAppleAction={signInWithOAuthAction.bind(null, "apple")}
      signInWithGoogleAction={signInWithOAuthAction.bind(null, "google")}
      signUpAction={signUpAction}
    />
  );
}
