"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { store } from "@/lib/store";
import { authClient } from "@/lib/auth/client";
import { isAdminRole } from "@/lib/auth/permissions";
import { AlertTriangle, Lock, Mail } from "lucide-react";

type UnverifiedState = {
  email: string;
  resent: boolean;
  resending: boolean;
  info: string | null;
};

function isCoachRole(role: string | undefined) {
  return role === "coach";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState<UnverifiedState | null>(null);

  useEffect(() => {
    let cancelled = false;
    void authClient.me().then((user) => {
      if (cancelled || !user) return;
      if (user.status === "suspended") return;
      if (isAdminRole(user.role)) {
        router.replace("/admin");
        return;
      }
      router.replace(isCoachRole(user.role) ? "/coach" : "/dashboard");
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnverified(null);

    if (!email.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setLoading(true);
    const res = await authClient.login({ email: email.trim(), password });
    setLoading(false);

    if (!res.ok) {
      if (res.code === "account_suspended") {
        setError(res.message || "Your account is suspended. Please contact support.");
        return;
      }
      if (res.code === "email_not_verified") {
        const unverifiedEmail =
          (typeof res.email === "string" && res.email) || email.trim();
        setUnverified({
          email: unverifiedEmail,
          resent: false,
          resending: false,
          info: null,
        });
        return;
      }
      setError(res.message || "Could not sign in.");
      return;
    }

    store.setUser({
      id: res.user.id,
      name: res.user.name,
      email: res.user.email,
      createdAt: new Date().toISOString(),
      plan: (res.user.plan as never) ?? "free",
      role:
        (res.user.role as "user" | "coach" | "sub_admin" | "admin" | "super_admin") ??
        "user",
      status: "active",
    });
    if (isAdminRole(res.user.role)) {
      router.push("/admin");
      return;
    }
    router.push(isCoachRole(res.user.role) ? "/coach" : "/dashboard");
  }

  async function onResend() {
    if (!unverified) return;
    setUnverified({ ...unverified, resending: true, info: null });
    const res = await authClient.resendVerification(unverified.email);
    setUnverified({
      email: unverified.email,
      resent: true,
      resending: false,
      info: res.ok
        ? res.message
        : "Could not resend right now. Please try again in a moment.",
    });
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your interview prep."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="size-4" />}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="size-4" />}
          error={error || undefined}
        />

        {unverified && (
          <div className="rounded-xl border border-warn-500/30 bg-warn-500/10 p-4 text-sm text-ink-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 text-warn-500" />
              <div className="flex-1">
                <div className="font-medium text-ink-900">
                  Email isn't verified yet
                </div>
                <div className="mt-0.5 text-ink-600">
                  <span>We sent a verification link to </span>
                  <span className="font-medium text-ink-900">
                    {unverified.email}
                  </span>
                  <span>. Click it to activate your account, or request a new one below.</span>
                </div>
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={unverified.resending}
                    onClick={onResend}
                  >
                    {unverified.resent ? "Resend again" : "Resend verification"}
                  </Button>
                </div>
                {unverified.info && (
                  <p className="mt-2 text-xs text-ink-600">{unverified.info}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <label className="inline-flex items-center gap-2 text-ink-500">
            <input type="checkbox" className="size-3.5 rounded border-ink-300" />
            <span>Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-ink-700 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Sign in
        </Button>
        <p className="text-center text-sm text-ink-500">
          Need an account?{" "}
          <Link href="/signup" className="font-medium text-ink-900 underline">
            Sign up
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
