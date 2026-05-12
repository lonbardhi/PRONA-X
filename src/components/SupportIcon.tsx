import Image from "next/image";

type SupportIconProps = {
  className?: string;
};

export function SupportIcon({ className = "h-5 w-5" }: SupportIconProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      height={32}
      src="/brand/support-customer-service.png"
      width={32}
    />
  );
}
