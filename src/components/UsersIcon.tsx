import Image from "next/image";

type UsersIconProps = {
  className?: string;
};

export function UsersIcon({ className = "h-5 w-5" }: UsersIconProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      height={32}
      src="/brand/user-gear.png"
      width={32}
    />
  );
}
