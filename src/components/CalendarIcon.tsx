import Image from "next/image";

type CalendarIconProps = {
  className?: string;
};

export function CalendarIcon({ className = "h-5 w-5" }: CalendarIconProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      height={32}
      src="/brand/calendar-tab.png"
      width={32}
    />
  );
}
