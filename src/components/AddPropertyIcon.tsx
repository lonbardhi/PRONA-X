import Image from "next/image";

type AddPropertyIconProps = {
  className?: string;
};

export function AddPropertyIcon({ className = "h-5 w-5" }: AddPropertyIconProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      height={32}
      src="/brand/add-property.png"
      width={32}
    />
  );
}
