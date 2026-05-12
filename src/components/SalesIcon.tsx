import Image from "next/image";

type SalesIconProps = {
  className?: string;
};

export function SalesIcon({ className = "h-5 w-5" }: SalesIconProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      height={32}
      src="/brand/sales-home.png"
      width={32}
    />
  );
}
