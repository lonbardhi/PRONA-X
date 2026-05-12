import Image from "next/image";

type DashboardIconProps = {
  className?: string;
};

export function DashboardIcon({ className = "h-5 w-5" }: DashboardIconProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      height={32}
      src="/brand/dashboard-panel.png"
      width={32}
    />
  );
}
