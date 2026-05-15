"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { authClient } from "@/lib/auth/client";
import { store } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  hasPermission,
  isAdminRole,
  normalizeRole,
  roleLabel,
  roleTone,
  type Permission,
  type Role,
} from "@/lib/auth/permissions";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  GraduationCap,
  Activity,
  FileText,
  CreditCard,
  RotateCcw,
  PieChart,
  Filter,
  MousePointerClick,
  CalendarClock,
  Siren,
  Settings,
  List,
  ScrollText,
  LifeBuoy,
  ArrowLeft,
  LogOut,
  Menu,
  X,
} from "lucide-react";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

type AdminCtx = {
  user: AdminUser;
  has: (p: Permission) => boolean;
};

const AdminContext = createContext<AdminCtx | null>(null);

export function useAdmin(): AdminCtx {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdmin must be called inside <AdminShell />");
  }
  return ctx;
}

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, permission: "overview.view" },
  { href: "/admin/users", label: "Users", icon: Users, permission: "users.view" },
  { href: "/admin/team", label: "Admin team", icon: ShieldCheck, permission: "team.view" },
  { href: "/admin/coaches", label: "Coaches", icon: GraduationCap, permission: "coaches.view" },
  { href: "/admin/sessions", label: "Sessions", icon: Activity, permission: "sessions.view" },
  { href: "/admin/reports", label: "Reports", icon: FileText, permission: "reports.view" },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarClock, permission: "bookings.view" },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, permission: "payments.view" },
  { href: "/admin/refunds", label: "Refunds", icon: RotateCcw, permission: "refunds.view" },
  { href: "/admin/support", label: "Support tickets", icon: LifeBuoy, permission: "support.view" },
  { href: "/admin/analytics", label: "Freshers vs Pros", icon: PieChart, permission: "analytics.freshers_vs_professionals" },
  { href: "/admin/conversion", label: "Conversion", icon: Filter, permission: "analytics.conversion" },
  { href: "/admin/lead-sources", label: "Lead sources", icon: MousePointerClick, permission: "analytics.lead_sources" },
  { href: "/admin/meeting-alerts", label: "Meeting alerts", icon: Siren, permission: "bookings.view" },
  { href: "/admin/roles", label: "Roles", icon: List, permission: "settings.view" },
  { href: "/admin/settings", label: "Settings", icon: Settings, permission: "settings.view" },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, permission: "audit.view" },
];

export function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const enforceSession = useCallback(async () => {
    const sessionUser = await authClient.me();
    if (sessionUser && isAdminRole(sessionUser.role)) return;
    store.setUser(null);
    router.replace("/login?next=/admin");
    router.refresh();
  }, [router]);

  async function handleSignOut() {
    await authClient.logout();
    store.setUser(null);
    router.replace("/");
    router.refresh();
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        const u = data?.user;
        if (!u || !isAdminRole(u.role)) {
          router.replace("/dashboard");
          return;
        }
        setUser({ id: u.id, email: u.email, name: u.name, role: normalizeRole(u.role) });
      } catch {
        router.replace("/login?next=/admin");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

  const ctxValue = useMemo<AdminCtx | null>(() => {
    if (!user) return null;
    return {
      user,
      has: (p) => hasPermission(user.role, p),
    };
  }, [user]);

  if (loading || !user || !ctxValue) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-500">
        Loading admin…
      </div>
    );
  }

  const visibleNav = NAV.filter((item) => ctxValue.has(item.permission));

  return (
    <AdminContext.Provider value={ctxValue}>
      <div className="grid min-h-screen lg:grid-cols-[260px,1fr]">
        <aside className="hidden flex-col border-r border-ink-100 bg-white lg:flex">
          <SidebarBody
            user={user}
            pathname={pathname}
            visibleNav={visibleNav}
            onSignOut={() => {
              void handleSignOut();
            }}
          />
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              aria-label="Close menu"
              className="absolute inset-0 bg-ink-900/40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col bg-white shadow-xl">
              <div className="flex items-center justify-between px-4 py-3">
                <Logo size={26} />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"
                >
                  <X className="size-5" />
                </button>
              </div>
              <SidebarBody
                user={user}
                pathname={pathname}
                visibleNav={visibleNav}
                onSignOut={() => {
                  void handleSignOut();
                }}
                hideHeader
              />
            </div>
          </div>
        )}

        <div className="flex min-h-screen min-w-0 flex-col bg-ink-50/40">
          <header className="flex h-14 items-center justify-between gap-2 border-b border-ink-100 bg-white px-3 lg:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-ink-700 hover:bg-ink-100"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0 shrink">
              <Logo size={22} />
            </div>
            <Badge tone={roleTone(user.role)} dot className="shrink-0 whitespace-nowrap px-2 py-0.5 text-[10px]">
              {roleLabel(user.role)}
            </Badge>
          </header>
          <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-10">{children}</main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}

function SidebarBody({
  user,
  pathname,
  visibleNav,
  onSignOut,
  hideHeader,
}: Readonly<{
  user: AdminUser;
  pathname: string;
  visibleNav: NavItem[];
  onSignOut: () => void;
  hideHeader?: boolean;
}>) {
  return (
    <>
      {!hideHeader && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0 shrink">
            <Logo />
          </div>
          <Badge tone={roleTone(user.role)} dot className="shrink-0 whitespace-nowrap text-[11px]">
            {roleLabel(user.role)}
          </Badge>
        </div>
      )}
      <div className="px-4 pb-2 pt-2">
        <Button
          href="/dashboard"
          size="sm"
          variant="outline"
          className="w-full"
          leftIcon={<ArrowLeft className="size-4" />}
        >
          Back to app
        </Button>
      </div>
      <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-3">
        {visibleNav.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(pathname, item.href)}
          />
        ))}
        <button
          onClick={onSignOut}
          className="mt-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </nav>
      <div className="border-t border-ink-100 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={user.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-900">{user.name}</p>
            <p className="truncate text-xs text-ink-500">{user.email}</p>
          </div>
        </div>
      </div>
    </>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: Readonly<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}>) {
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
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export function AdminPageHeader({
  title,
  description,
  actions,
}: Readonly<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
}>) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
