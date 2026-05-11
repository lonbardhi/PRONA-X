type UnreadBadgeProps = {
  count: number;
  subtle?: boolean;
};

export function UnreadBadge({ count, subtle = false }: UnreadBadgeProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
        subtle ? "bg-slate-200 text-slate-700" : "bg-rose-600 text-white"
      }`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

