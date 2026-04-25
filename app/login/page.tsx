"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { store } from "@/lib/store";
import { authClient } from "@/lib/auth/client";
import { AlertTriangle, Lock, Mail } from "lucide-react";

type UnverifiedState = {
  email: string;
  resent: boolean;
  resending: boolean;
  info: string | null;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState<UnverifiedState | null>(null);

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
      role: (res.user.role as "user" | "admin") ?? "user",
    });
    router.push("/dashboard");
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
        ? "Verification email re-sent. Check your inbox (and spam folder)."
        : "Could not resend right now. Please try again in a moment.",
    });
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your interview prep."
      footer={
        <>
          Need an account?{" "}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </>
      }
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
                  We sent a verification link to{" "}
                  <span className="font-medium text-ink-900">
                    {unverified.email}
                  </span>
                  . Click it to activate your account, or request a new one
                  below.
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
            Remember me
          </label>
          <Link href="#" className="text-ink-700 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
