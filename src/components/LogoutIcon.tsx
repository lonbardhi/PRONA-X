import Image from "next/image";

type LogoutIconProps = {
  className?: string;
};

export function LogoutIcon({ className = "h-5 w-5" }: LogoutIconProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      height={32}
      src="/brand/check-out.png"
      width={32}
    />
  );
}
