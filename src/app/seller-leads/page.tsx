import Link from "next/link";
import { ArrowRight, Building2, ClipboardList, UserPlus } from "lucide-react";

import { DashboardShell } from "@/components/DashboardShell";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseEnv } from "@/lib/env";
import { requireOperatorUser } from "@/lib/supabase/server";

export default async function SellerLeadsPage() {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const { profile, user } = await requireOperatorUser();

  return (
    <DashboardShell userEmail={user.email} userRole={profile.role}>
      <section className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-6 sm:py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                <UserPlus className="h-3.5 w-3.5" />
                Seller Leads
              </span>
              <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                Seller Lead Pipeline
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Qualify owners, prepare listing handoff, and move accepted sellers into
                the PRONA X sales inventory.
              </p>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:min-w-[420px]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 sm:tracking-[0.12em]">
                  New Leads
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                  0
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 sm:p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700 sm:tracking-[0.12em]">
                  Follow-up
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                  0
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 sm:p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700 sm:tracking-[0.12em]">
                  Converted
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
                  0
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ClipboardList className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-950">
              No seller leads yet
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Accepted sellers can be moved into a manual property listing while the
              dedicated lead database is added.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
                href="/sales#add-property"
                prefetch={false}
              >
                Add property
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                href="/sales"
                prefetch={false}
              >
                Sales inventory
              </Link>
            </div>
          </section>

          <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                <Building2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-950">
                  Sales handoff
                </h2>
                <p className="text-sm text-slate-500">Lead to active listing</p>
              </div>
            </div>
            <ol className="mt-5 grid gap-3 text-sm text-slate-600">
              {[
                "Seller lead qualified",
                "Property record created",
                "Media and documents prepared",
                "Manager review completed",
                "Listing published for sale",
              ].map((item, index) => (
                <li
                  className="flex items-center gap-3 rounded-lg bg-slate-50 p-3"
                  key={item}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-700">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>
    </DashboardShell>
  );
}
