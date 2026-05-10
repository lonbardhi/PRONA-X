import { redirect } from "next/navigation";

import {
  requestPasswordResetAction,
  signInAction,
  signInWithOAuthAction,
  signUpAction,
} from "@/app/login/actions";
import { AuthEntry } from "@/components/AuthEntry";
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

type HomePageProps = {
  searchParams: Promise<{
    error?: string;
    error_code?: string;
    error_description?: string;
    message?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const { authError, profile, user } = await getCurrentUserWithProfile();

  if (authError && isInvalidRefreshTokenError(authError)) {
    redirect(
      getClearSessionPath("/", "Your session expired. Sign in again to continue."),
    );
  }

  if (user) {
    if (!isApprovedProfile(profile)) {
      redirect("/pending-approval");
    }

    redirect("/sales");
  }

  const params = await searchParams;
  const locale = await getCurrentLocale();

  return (
    <AuthEntry
      locale={locale}
      message={getAuthDisplayMessage(params, locale)}
      requestPasswordResetAction={requestPasswordResetAction}
      signInAction={signInAction}
      signInWithAppleAction={signInWithOAuthAction.bind(null, "apple")}
      signInWithGoogleAction={signInWithOAuthAction.bind(null, "google")}
      signUpAction={signUpAction}
    />
  );
}
