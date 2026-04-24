import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warn" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700 ring-ink-200",
  accent: "bg-accent-50 text-accent-700 ring-accent-200",
  success: "bg-success-50 text-success-600 ring-success-500/30",
  warn: "bg-warn-50 text-warn-600 ring-warn-500/30",
  danger: "bg-danger-50 text-danger-600 ring-danger-500/30",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  dot,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("size-1.5 rounded-full", {
            "bg-ink-500": tone === "neutral",
            "bg-accent-500": tone === "accent",
            "bg-success-500": tone === "success",
            "bg-warn-500": tone === "warn",
            "bg-danger-500": tone === "danger",
          })}
        />
      )}
      {children}
    </span>
  );
}
