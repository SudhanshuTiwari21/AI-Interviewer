import { cn, clamp } from "@/lib/utils";

export function Progress({
  value,
  className,
  tone = "accent",
}: {
  value: number;
  className?: string;
  tone?: "accent" | "success" | "warn" | "danger";
}) {
  const v = clamp(value, 0, 100);
  const colors = {
    accent: "bg-accent-500",
    success: "bg-success-500",
    warn: "bg-warn-500",
    danger: "bg-danger-500",
  } as const;
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-ink-100",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all", colors[tone])}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
