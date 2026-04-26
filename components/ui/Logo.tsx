import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  href?: string;
  withWordmark?: boolean;
  /** Pixel size of the mark. Wordmark scales with it. */
  size?: number;
  /** Use light marks/text for dark backgrounds. */
  tone?: "dark" | "light";
};

export function Logo({
  className,
  href = "/",
  withWordmark = true,
  size = 28,
  tone = "dark",
}: LogoProps) {
  const wordmarkColor =
    tone === "light" ? "text-white" : "text-ink-900";
  const wordmarkSize = Math.round(size * 0.62);

  const inner = (
    <span
      className={cn(
        "inline-flex select-none items-center",
        className,
      )}
      style={{ gap: Math.round(size * 0.32) }}
    >
      <SelectwiseMark size={size} />
      {withWordmark && (
        <span
          className={cn(
            "font-semibold leading-none tracking-tight",
            wordmarkColor,
          )}
          style={{ fontSize: wordmarkSize, letterSpacing: "-0.02em" }}
        >
          SelectWise
        </span>
      )}
    </span>
  );

  return href ? (
    <Link href={href} aria-label="Selectwise home" className="inline-flex">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function SelectwiseMark({ size }: { readonly size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="block flex-none"
    >
      <rect width="32" height="32" rx="8" fill="#0E1220" />
      {/* Stylized S with two smooth bands */}
      <path
        d="M23.4 10.4C22.2 8.7 20.1 8 16.9 8C13.1 8 10.4 9.8 10.4 12.8c0 2.7 2 4 6.1 4.5 2.6.3 3.6.9 3.6 2.1 0 1.5-1.4 2.3-3.8 2.3-2.5 0-4.5-.8-5.9-2.2"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.8 9.7L12.2 22.6h3.5l8.6-12.9h-3.5z"
        fill="#3A66F5"
      />
    </svg>
  );
}
