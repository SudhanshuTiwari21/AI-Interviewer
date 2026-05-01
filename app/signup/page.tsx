"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authClient } from "@/lib/auth/client";
import { Mail, Lock, User, CheckCircle2 } from "lucide-react";
import { isAdminRole, isCoachRole } from "@/lib/auth/permissions";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-ink-500">
          Loading…
        </div>
      }
    >
      <SignupInner />
    </Suspense>
  );
}

type Pending = {
  email: string;
  resent: boolean;
};

type PublicSettings = {
  allowSignups: boolean;
  maintenanceMode: boolean;
};

function SignupInner() {
  const router = useRouter();
  const search = useSearchParams();
  const leadSourceFromUrl =
    search.get("utm_source") ?? search.get("source") ?? "direct";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [resending, setResending] = useState(false);
  const [resendInfo, setResendInfo] = useState<string | null>(null);
  const [settings, setSettings] = useState<PublicSettings>({
    allowSignups: true,
    maintenanceMode: false,
  });

  useEffect(() => {
    let cancelled = false;
    void authClient.me().then((user) => {
      if (cancelled || !user) return;
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

  useEffect(() => {
    void fetch("/api/settings/public", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        setSettings({
          allowSignups: Boolean(d.settings?.allowSignups ?? true),
          maintenanceMode: Boolean(d.settings?.maintenanceMode ?? false),
        });
      });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.includes("@") || password.length < 8) {
      setError("Please fill in your name, a valid email, and an 8+ char password.");
      return;
    }
    if (!settings.allowSignups || settings.maintenanceMode) {
      setError("Signups are temporarily paused. Please try again later.");
      return;
    }

    setLoading(true);
    const res = await authClient.signup({
      name: name.trim(),
      email: email.trim(),
      password,
      leadSource: leadSourceFromUrl,
    });
    setLoading(false);

    if (!res.ok) {
      if (res.code === "email_already_registered") {
        setError(
          "An account with this email already exists. Please sign in instead.",
        );
      } else {
        setError(res.message);
      }
      return;
    }

    setPending({
      email: res.email,
      resent: res.status === "verification_resent",
    });
  }

  async function onResend() {
    if (!pending) return;
    setResending(true);
    setResendInfo(null);
    const res = await authClient.resendVerification(pending.email);
    setResending(false);
    setResendInfo(
      res.ok
        ? "Verification email re-sent. Check your inbox (and spam folder)."
        : "Could not resend right now. Please try again in a moment.",
    );
  }

  if (pending) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`We sent a verification link to ${pending.email}. Click it to activate your account.`}
        footer={
          <>
            Wrong email?{" "}
            <button
              className="underline"
              onClick={() => {
                setPending(null);
                setResendInfo(null);
              }}
            >
              Use a different one
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-success-500/30 bg-success-500/10 p-4 text-sm text-ink-800">
            <CheckCircle2 className="mt-0.5 size-5 text-success-500" />
            <div>
              <div className="font-medium text-ink-900">
                {pending.resent
                  ? "Account already pending — verification re-sent"
                  : "Verification email sent"}
              </div>
              <div className="mt-0.5 text-ink-500">
                Open the link from your inbox to verify and continue.
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={onResend}
            loading={resending}
          >
            Resend verification email
          </Button>

          {resendInfo && (
            <p className="text-center text-xs text-ink-600">{resendInfo}</p>
          )}

          <p className="text-center text-sm text-ink-500">
            Already verified?{" "}
            <Link href="/login" className="font-medium text-ink-900 underline">
              Sign in
            </Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your Selectwise account"
      subtitle="Create your account and start interview practice."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Alex Morgan"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftIcon={<User className="size-4" />}
        />
        <Input
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="alex@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="size-4" />}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="size-4" />}
          error={error || undefined}
        />
        <Button
          type="submit"
          loading={loading}
          className="w-full"
          size="lg"
          disabled={!settings.allowSignups || settings.maintenanceMode}
        >
          Create account
        </Button>
        <p className="text-center text-xs text-ink-500">
          By signing up you agree to our{" "}
          <Link href="/terms-and-conditions" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy-policy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
        <p className="text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-ink-900 underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
