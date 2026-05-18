import Image from "next/image";

import { cn } from "@/lib/utils";

type RequestIconProps = {
  className?: string;
};

export function RequestIcon({ className }: RequestIconProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={cn("h-4 w-4 object-contain", className)}
      height={24}
      src="/icons/request.png"
      width={24}
    />
  );
}
