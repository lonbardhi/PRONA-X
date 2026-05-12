import Image from "next/image";

type RentalsIconProps = {
  className?: string;
};

export function RentalsIcon({ className = "h-5 w-5" }: RentalsIconProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      height={32}
      src="/brand/rentals-key.png"
      width={32}
    />
  );
}
