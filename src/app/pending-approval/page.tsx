import { redirect } from "next/navigation";
import { Clock3, LogOut, ShieldCheck } from "lucide-react";

import { signOutAction } from "@/app/login/actions";
import { BrandLockup } from "@/components/BrandLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseEnv } from "@/lib/env";
import { getRoleLabel, t } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import {
  getClearSessionPath,
  getCurrentUserWithProfile,
  isApprovedProfile,
  isInvalidRefreshTokenError,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PendingApprovalPage() {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const { authError, profile, profileError, user } =
    await getCurrentUserWithProfile();

  if (authError && isInvalidRefreshTokenError(authError)) {
    redirect(
      getClearSessionPath(
        "/login",
        "Your session expired. Sign in again to continue.",
      ),
    );
  }

  if (!user) {
    redirect("/login");
  }

  if (isApprovedProfile(profile)) {
    redirect("/sales");
  }
  const locale = await getCurrentLocale();

  return (
    <main className="min-h-screen bg-[linear-gradient(#eef2f7_1px,transparent_1px),linear-gradient(90deg,#eef2f7_1px,transparent_1px)] bg-[size:40px_40px] px-3 py-6 text-slate-950 sm:px-6">
      <section className="mx-auto grid min-h-[calc(100dvh-3rem)] max-w-3xl place-items-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <BrandLockup subtitle={t(locale, "pending.adminApproval")} />
            <div className="flex flex-wrap items-center gap-2">
              <LanguageToggle locale={locale} returnTo="/pending-approval" />
              <form action={signOutAction}>
                <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  <LogOut className="h-4 w-4" />
                  {t(locale, "pending.signOut")}
                </button>
              </form>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">
                <Clock3 className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                  {t(locale, "pending.adminApproval")}
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                  {t(locale, "pending.heading")}
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {t(locale, "pending.description")}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {t(locale, "admin.signedIn")}
              </p>
              <p className="mt-1 break-words font-semibold text-slate-950">
                {user.email}
              </p>
              <p className="mt-1 break-all font-mono text-xs text-slate-500">
                {user.id}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {t(locale, "pending.currentRole")}
              </p>
              <p className="mt-1 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 font-semibold capitalize text-slate-950">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                {getRoleLabel(locale, profile?.role || "pending")}
              </p>
            </div>
          </div>

          {profileError ? (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {t(locale, "pending.profileFailed")} {profileError.message}
            </div>
          ) : null}

          <p className="mt-5 text-sm leading-6 text-slate-500">
            {t(locale, "pending.askAdmin")}
          </p>
        </div>
      </section>
    </main>
  );
}
