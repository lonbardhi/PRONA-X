import Link from "next/link";
import { Building2, LogOut, Plus } from "lucide-react";

import { signOutAction } from "@/app/login/actions";

type DashboardShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
};

export function DashboardShell({ children, userEmail }: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/properties" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-semibold text-slate-950">PRONA X</p>
              <p className="text-xs text-slate-500">Property operations platform</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/properties"
              className="hidden h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white sm:inline-flex"
            >
              <Plus className="h-4 w-4" />
              Properties
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">{userEmail}</p>
              <p className="text-xs text-slate-500">Authenticated workspace</p>
            </div>
            <form action={signOutAction}>
              <button
                aria-label="Sign out"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}

