import Image from "next/image";

type MessageIconProps = {
  className?: string;
};

export function MessageIcon({ className = "h-5 w-5" }: MessageIconProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      height={32}
      src="/brand/messages-tab.png"
      width={32}
    />
  );
}
