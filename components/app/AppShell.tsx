"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { store, type User } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Mic,
  FileText,
  CalendarClock,
  Settings,
  LifeBuoy,
  ShieldCheck,
  LogOut,
  Plus,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/interview/setup", label: "Run interview", icon: Mic },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/schedule", label: "Coaching", icon: CalendarClock },
];

const SECONDARY = [
  { href: "#", label: "Settings", icon: Settings },
  { href: "#", label: "Support", icon: LifeBuoy },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const u = store.getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
  }, [router]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-500">
        Loading workspace…
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[260px,1fr]">
      <aside className="hidden flex-col border-r border-ink-100 bg-white lg:flex">
        <div className="flex h-16 items-center px-6">
          <Logo />
        </div>
        <div className="px-4 pb-2 pt-2">
          <Button
            href="/interview/setup"
            size="sm"
            className="w-full"
            leftIcon={<Plus className="size-4" />}
          >
            New interview
          </Button>
        </div>
        <nav className="mt-2 flex-1 space-y-0.5 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={isActive(pathname, item.href)}
            />
          ))}
          <div className="my-4 h-px bg-ink-100" />
          {user.role === "admin" && (
            <NavLink
              href="/admin"
              label="Admin"
              icon={ShieldCheck}
              active={isActive(pathname, "/admin")}
            />
          )}
          {SECONDARY.map((item) => (
            <NavLink
              key={item.label}
              {...item}
              active={isActive(pathname, item.href)}
            />
          ))}
        </nav>
        <div className="border-t border-ink-100 p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">
                {user.name}
              </p>
              <p className="truncate text-xs text-ink-500">{user.email}</p>
            </div>
            <button
              title="Sign out"
              onClick={() => {
                store.setUser(null);
                router.push("/");
              }}
              className="inline-flex size-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
      <div className="flex min-h-screen flex-col bg-ink-50/40">
        <MobileTopBar user={user} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: any;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-ink-900 text-white"
          : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

function MobileTopBar({ user }: { user: User }) {
  return (
    <div className="flex h-14 items-center justify-between border-b border-ink-100 bg-white px-4 lg:hidden">
      <Logo />
      <Avatar name={user.name} size="sm" />
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-ink-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
