import * as React from "react";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value = 0,
  ...props
}: React.ComponentProps<"div"> & {
  value?: number;
}) {
  const normalizedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}
      role="progressbar"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={normalizedValue}
      {...props}
    >
      <div
        className="h-full rounded-full bg-emerald-600 transition-all"
        style={{ width: `${normalizedValue}%` }}
      />
    </div>
  );
}

export { Progress };
