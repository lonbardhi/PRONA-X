import Image from "next/image";
import Link from "next/link";

type LogoMarkProps = {
  className?: string;
  priority?: boolean;
  size?: number;
};

type BrandLockupProps = {
  href?: string;
  subtitle?: string;
};

export function LogoMark({
  className = "",
  priority = false,
  size = 40,
}: LogoMarkProps) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${className}`}
      style={{ height: size, width: size }}
    >
      <Image
        alt="PRONA X logo"
        className="h-full w-full object-contain"
        height={size}
        priority={priority}
        sizes={`${size}px`}
        src="/brand/prona-x-logo.png"
        width={size}
      />
    </span>
  );
}

export function BrandLockup({
  href = "/sales",
  subtitle = "Real estate CRM",
}: BrandLockupProps) {
  return (
    <Link href={href} prefetch={false} className="flex min-w-0 items-center gap-3">
      <LogoMark
        className="rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
        priority
      />
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold text-slate-950">PRONA X</p>
        <p className="truncate text-xs text-slate-500">{subtitle}</p>
      </div>
    </Link>
  );
}
