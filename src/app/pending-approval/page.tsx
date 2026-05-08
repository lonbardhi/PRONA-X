import { redirect } from "next/navigation";
import { Clock3, LogOut, ShieldCheck } from "lucide-react";

import { signOutAction } from "@/app/login/actions";
import { BrandLockup } from "@/components/BrandLogo";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseEnv } from "@/lib/env";
import {
  getClearSessionPath,
  getCurrentUserWithProfile,
  isApprovedProfile,
  isInvalidRefreshTokenError,
} from "@/lib/supabase/server";

export default async function PendingApprovalPage() {
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

  if (!user) {
    redirect("/login");
  }

  if (isApprovedProfile(profile)) {
    redirect("/sales");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(#eef2f7_1px,transparent_1px),linear-gradient(90deg,#eef2f7_1px,transparent_1px)] bg-[size:40px_40px] px-3 py-6 text-slate-950 sm:px-6">
      <section className="mx-auto grid min-h-[calc(100dvh-3rem)] max-w-3xl place-items-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <BrandLockup subtitle="Access approval" />
            <form action={signOutAction}>
              <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>

          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">
                <Clock3 className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Pending admin approval
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                  Your PRONA X account is waiting for access.
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  New users can sign up with Google or email, but workspace access
                  is released by an admin. Once approved, you can enter the CRM.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Signed in as
              </p>
              <p className="mt-1 break-words font-semibold text-slate-950">
                {user.email}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Current role
              </p>
              <p className="mt-1 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 font-semibold capitalize text-slate-950">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                {profile?.role || "viewer"}
              </p>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-slate-500">
            Ask a PRONA X admin to open Admin Users and promote this account to
            Agent, Manager, or Admin.
          </p>
        </div>
      </section>
    </main>
  );
}
