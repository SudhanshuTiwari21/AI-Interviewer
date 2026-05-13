"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { authClient } from "@/lib/auth/client";
import { isAdminRole, isCoachRole } from "@/lib/auth/permissions";
import { store } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

const NAV = [
  { label: "Product", href: "/#features" },
  { label: "How it works", href: "/#how" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

function sessionFromRole(role: string | null | undefined): {
  href: string;
  label: string;
  signedIn: boolean;
} {
  let href = "/dashboard";
  if (isAdminRole(role)) href = "/admin";
  else if (isCoachRole(role)) href = "/coach";
  return { href, label: "Dashboard", signedIn: true };
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [sessionHref, setSessionHref] = useState("/login");
  const [sessionLabel, setSessionLabel] = useState("Sign in");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    const cached = store.getUser();
    if (cached?.id) {
      const s = sessionFromRole(cached.role);
      setSessionHref(s.href);
      setSessionLabel(s.label);
      setSignedIn(s.signedIn);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void authClient.me().then((user) => {
      if (cancelled) return;
      if (user) {
        const s = sessionFromRole(user.role);
        setSessionHref(s.href);
        setSessionLabel(s.label);
        setSignedIn(s.signedIn);
      } else {
        setSessionHref("/login");
        setSessionLabel("Sign in");
        setSignedIn(false);
      }
      setAuthReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 w-full transition-colors",
          scrolled
            ? "border-b border-ink-100 bg-white/80 backdrop-blur-md"
            : "border-b border-transparent bg-white/95 backdrop-blur-md",
        )}
      >
        <div className="container flex h-16 max-w-6xl items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden items-center gap-6 md:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-ink-600 transition-colors hover:text-ink-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            {authReady ? (
              <Button href={sessionHref} variant={signedIn ? "outline" : "ghost"} size="sm">
                {sessionLabel}
              </Button>
            ) : (
              <div
                className="h-9 min-w-[5.75rem] rounded-lg bg-ink-100/90 animate-pulse"
                aria-busy
                aria-label="Loading account"
              />
            )}
          </div>
          <button
            className="inline-flex size-9 items-center justify-center rounded-lg text-ink-700 hover:bg-ink-100 md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Open menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {open && (
          <div className="border-t border-ink-100 bg-white md:hidden">
            <div className="container flex flex-col gap-1 py-3">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-100"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2 px-1">
                {authReady ? (
                  <>
                    <Button href={sessionHref} variant="outline" size="sm">
                      {sessionLabel}
                    </Button>
                    {!signedIn && (
                      <Button href="/signup" size="sm">
                        Get started
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <div
                      className="h-9 rounded-lg bg-ink-100/90 animate-pulse"
                      aria-busy
                      aria-hidden
                    />
                    <div
                      className="h-9 rounded-lg bg-ink-100/90 animate-pulse"
                      aria-hidden
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
      <div className="h-16" aria-hidden />
    </>
  );
}
