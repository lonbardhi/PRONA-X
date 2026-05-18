import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success" | "warning";

const badgeVariants: Record<BadgeVariant, string> = {
  default: "border-transparent bg-slate-950 text-white",
  destructive: "border-transparent bg-rose-600 text-white",
  outline: "border-slate-200 bg-white text-slate-700",
  secondary: "border-transparent bg-slate-100 text-slate-700",
  success: "border-transparent bg-emerald-100 text-emerald-800",
  warning: "border-transparent bg-amber-100 text-amber-800",
};

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & {
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold leading-5",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
