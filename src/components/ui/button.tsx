import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "success" | "destructive";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const buttonVariantClasses: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
  destructive:
    "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
  ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
  outline:
    "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
  secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
  success:
    "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 focus-visible:ring-emerald-600/30",
};

const buttonSizeClasses: Record<ButtonSize, string> = {
  default: "h-9 px-4 py-2 has-[>svg]:px-3",
  icon: "size-9",
  lg: "h-10 px-6 has-[>svg]:px-4",
  sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
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
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-all disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
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
