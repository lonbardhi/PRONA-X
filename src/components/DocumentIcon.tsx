import Image from "next/image";

type DocumentIconProps = {
  className?: string;
};

export function DocumentIcon({ className = "h-5 w-5" }: DocumentIconProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      height={32}
      src="/brand/doc.png"
      width={32}
    />
  );
}
