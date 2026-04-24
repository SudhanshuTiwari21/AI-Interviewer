import { cn, initialsOf } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg";
const sizes: Record<Size, string> = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
};

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: Size;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-ink-900 font-semibold text-white",
        sizes[size],
        className,
      )}
      aria-label={name}
      title={name}
    >
      {initialsOf(name)}
    </div>
  );
}
