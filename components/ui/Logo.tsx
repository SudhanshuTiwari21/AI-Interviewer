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
      <HiroMark size={size} />
      {withWordmark && (
        <span
          className={cn(
            "font-semibold leading-none tracking-tight",
            wordmarkColor,
          )}
          style={{ fontSize: wordmarkSize, letterSpacing: "-0.02em" }}
        >
          Hiro
        </span>
      )}
    </span>
  );

  return href ? (
    <Link href={href} aria-label="Hiro home" className="inline-flex">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function HiroMark({ size }: { readonly size: number }) {
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
      {/* H — left + right vertical strokes */}
      <rect x="8" y="8" width="3.6" height="16" rx="1" fill="#FFFFFF" />
      <rect x="20.4" y="8" width="3.6" height="16" rx="1" fill="#FFFFFF" />
      {/* H — horizontal crossbar */}
      <rect x="8" y="14.4" width="16" height="3.2" rx="1" fill="#FFFFFF" />
      {/* Accent diagonal slash through the crossbar */}
      <path
        d="M19.4 9.8L12.6 22.2 16.2 22.2 23 9.8z"
        fill="#3A66F5"
      />
    </svg>
  );
}
