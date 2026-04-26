"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
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

  useEffect(() => {
    const u = store.getUser();
    if (!u) {
      router.replace("/login?next=/coach");
      return;
    }
    if (u.role !== "coach") {
      router.replace("/dashboard");
      return;
    }
    setUser(u);
  }, [router]);

  if (!user) {
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
      <main className="min-h-screen bg-ink-50/40 p-4 lg:p-8">{children}</main>
    </div>
  );
}
