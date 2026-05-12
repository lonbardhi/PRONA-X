import Image from "next/image";

type LeadsIconProps = {
  className?: string;
};

export function LeadsIcon({ className = "h-5 w-5" }: LeadsIconProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      height={32}
      src="/brand/seller-leads-funnel.png"
      width={32}
    />
  );
}
