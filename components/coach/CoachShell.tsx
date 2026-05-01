"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { store, type User } from "@/lib/store";
import { CalendarClock, LayoutDashboard, LogOut } from "lucide-react";

const NAV = [
  { href: "/coach", label: "Overview", icon: LayoutDashboard },
  { href: "/coach/sessions", label: "Session requests", icon: CalendarClock },
];

export function CoachShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const enforceSession = useCallback(async () => {
    const sessionUser = await authClient.me();
    if (sessionUser?.role === "coach") return;
    store.setUser(null);
    router.replace("/login?next=/coach");
    router.refresh();
  }, [router]);

  async function handleLogout() {
    await authClient.logout();
    store.setUser(null);
    router.replace("/");
    router.refresh();
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setHydrated(true);
      const localUser = store.getUser();
      if (localUser) {
        if (localUser.role !== "coach") {
          router.replace("/dashboard");
          return;
        }
        if (!cancelled) setUser(localUser);
        return;
      }

      const sessionUser = await authClient.me();
      if (!sessionUser) {
        router.replace("/login?next=/coach");
        return;
      }
      if (sessionUser.role !== "coach") {
        router.replace("/dashboard");
        return;
      }
      const hydratedUser: User = {
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        createdAt: new Date().toISOString(),
        plan: (sessionUser.plan as User["plan"]) ?? "free",
        role: (sessionUser.role as User["role"]) ?? "coach",
      };
      store.setUser(hydratedUser);
      if (!cancelled) setUser(hydratedUser);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    function onPageShow() {
      void enforceSession();
    }
    function onFocus() {
      void enforceSession();
    }
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
    };
  }, [enforceSession]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-500">
        Loading coach workspace...
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[260px,1fr]">
      <aside className="hidden border-r border-ink-100 bg-white lg:flex lg:flex-col">
        <div className="flex h-16 items-center justify-between px-6">
          <Logo />
          <Badge tone="neutral" dot>
            Coach
          </Badge>
        </div>
        <nav className="space-y-1 px-3 py-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
                pathname === item.href
                  ? "bg-ink-900 text-white"
                  : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-ink-100 p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">{user.name}</p>
              <p className="truncate text-xs text-ink-500">{user.email}</p>
            </div>
            <button
              title="Sign out"
              onClick={() => {
                void handleLogout();
              }}
              className="inline-flex size-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
      <div className="min-h-screen bg-ink-50/40">
        <div className="flex h-14 items-center justify-between border-b border-ink-100 bg-white px-4 lg:hidden">
          <Logo size={24} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void handleLogout();
              }}
              className="inline-flex size-9 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
            <Avatar name={user.name} size="sm" />
          </div>
        </div>
        <main className="p-4 pb-20 lg:p-8 lg:pb-8">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
          <ul className="mx-auto grid max-w-lg grid-cols-2 gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium",
                      active
                        ? "bg-ink-900 text-white"
                        : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
