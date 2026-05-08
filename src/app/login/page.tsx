import { redirect } from "next/navigation";

import {
  requestPasswordResetAction,
  signInAction,
  signInWithOAuthAction,
  signUpAction,
} from "@/app/login/actions";
import { AuthEntry } from "@/components/AuthEntry";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseEnv } from "@/lib/env";
import {
  getClearSessionPath,
  getCurrentUserWithProfile,
  isApprovedProfile,
  isInvalidRefreshTokenError,
} from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const { authError, profile, user } = await getCurrentUserWithProfile();

  if (authError && isInvalidRefreshTokenError(authError)) {
    redirect(
      getClearSessionPath(
        "/login",
        "Your session expired. Sign in again to continue.",
      ),
    );
  }

  if (user) {
    if (!isApprovedProfile(profile)) {
      redirect("/pending-approval");
    }

    redirect("/sales");
  }

  const params = await searchParams;

  return (
    <AuthEntry
      message={params.message}
      requestPasswordResetAction={requestPasswordResetAction}
      signInAction={signInAction}
      signInWithAppleAction={signInWithOAuthAction.bind(null, "apple")}
      signInWithGoogleAction={signInWithOAuthAction.bind(null, "google")}
      signUpAction={signUpAction}
    />
  );
}
