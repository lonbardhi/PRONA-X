import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "success" | "destructive";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const buttonVariantClasses: Record<ButtonVariant, string> = {
  default: "bg-slate-950 text-white shadow-sm hover:bg-slate-800",
  destructive: "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
  ghost: "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
  outline: "border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50",
  secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
  success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
};

const buttonSizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2",
  icon: "h-10 w-10",
  lg: "h-11 px-5",
  sm: "h-9 px-3",
};

function buttonVariants({
  className,
  size = "default",
  variant = "default",
}: {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    buttonVariantClasses[variant],
    buttonSizeClasses[size],
    className,
  );
}

function Button({
  className,
  size,
  variant,
  ...props
}: React.ComponentProps<"button"> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return <button className={buttonVariants({ className, size, variant })} {...props} />;
}

export { Button, buttonVariants };
