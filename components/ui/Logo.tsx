import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  withWordmark = true,
}: {
  className?: string;
  href?: string;
  withWordmark?: boolean;
}) {
  const inner = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="relative inline-flex size-7 items-center justify-center rounded-lg bg-ink-900 text-white"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 20 12 4l8 16" />
          <path d="M7.5 14h9" />
        </svg>
      </span>
      {withWordmark && (
        <span className="text-[15px] font-semibold tracking-tight text-ink-900">
          Apex
        </span>
      )}
    </span>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
