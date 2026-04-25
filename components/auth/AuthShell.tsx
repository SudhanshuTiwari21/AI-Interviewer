import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr,1.05fr]">
      <div className="relative flex flex-col justify-between p-8 lg:p-12">
        <Logo />
        <div className="mx-auto w-full max-w-sm py-10">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>
          )}
          <div className="mt-8">{children}</div>
        </div>
        <div className="text-xs text-ink-400">{footer}</div>
      </div>
      <div className="relative hidden overflow-hidden bg-ink-950 lg:block">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.06]" />
        <div className="pointer-events-none absolute -left-32 top-10 size-96 rounded-full bg-accent-500/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-10 size-96 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="text-xs text-ink-300">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
              <span className="size-1.5 rounded-full bg-success-500" />
              Live · 4,128 interviews this week
            </span>
          </div>
          <div className="max-w-md">
            <p className="text-2xl font-semibold leading-snug tracking-tight">
              "Hiro felt like the interview before the interview. By the time I
              walked into the real loop, I'd already heard the hardest
              questions."
            </p>
            <p className="mt-4 text-sm text-ink-300">
              - Aisha P., Staff Engineer · Datadog
            </p>
          </div>
          <Link
            href="/"
            className="text-xs text-ink-300 transition-colors hover:text-white"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
