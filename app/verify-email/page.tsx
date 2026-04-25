"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, Loader2, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authClient, type AuthUser } from "@/lib/auth/client";
import { store } from "@/lib/store";

type Status = "verifying" | "success" | "error";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-ink-500">
          Loading…
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token");

  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState<string>("Verifying your email…");
  const [user, setUser] = useState<AuthUser | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (!token) {
      setStatus("error");
      setMessage("Missing verification token. Please use the link from your email.");
      return;
    }

    void (async () => {
      const res = await authClient.verifyEmail(token);
      if (res.ok) {
        setUser(res.user);
        store.setUser({
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          createdAt: new Date().toISOString(),
          plan: (res.user.plan as never) ?? "free",
          role: (res.user.role as "user" | "admin") ?? "user",
        });
        setStatus("success");
        setMessage("Email verified. You're all set.");
      } else {
        setStatus("error");
        setMessage(res.message);
      }
    })();
  }, [token]);

  return (
    <AuthShell
      title={
        status === "success"
          ? "You're verified"
          : status === "error"
            ? "Verification failed"
            : "Verifying your email"
      }
      subtitle={
        status === "success"
          ? "Your account is active. Continue to your dashboard to start your first interview."
          : status === "error"
            ? "The link may have expired or already been used."
            : "Hang tight while we confirm your email address."
      }
      footer={
        status === "success" ? (
          <>
            Need help?{" "}
            <Link href="/" className="underline">
              Contact support
            </Link>
          </>
        ) : (
          <>
            Already verified?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </>
        )
      }
    >
      {status === "verifying" && (
        <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-ink-50 px-4 py-3 text-sm text-ink-700">
          <Loader2 className="size-4 animate-spin" />
          {message}
        </div>
      )}

      {status === "success" && (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-success-500/30 bg-success-500/10 p-4 text-sm text-ink-800">
            <CheckCircle2 className="mt-0.5 size-5 text-success-500" />
            <div>
              <div className="font-medium text-ink-900">{message}</div>
              {user?.email && (
                <div className="mt-0.5 text-ink-500">{user.email}</div>
              )}
            </div>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={() => router.push("/dashboard")}
          >
            Continue to dashboard
          </Button>
        </div>
      )}

      {status === "error" && <ResendBlock initialError={message} />}
    </AuthShell>
  );
}

function ResendBlock({ initialError }: { initialError: string }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function onResend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSending(true);
    setInfo(null);
    const res = await authClient.resendVerification(email.trim());
    setSending(false);
    setInfo(
      res.ok
        ? res.message
        : "Could not send verification email. Please try again.",
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-danger-500/30 bg-danger-500/10 p-4 text-sm text-ink-800">
        <AlertTriangle className="mt-0.5 size-5 text-danger-500" />
        <div>
          <div className="font-medium text-ink-900">{initialError}</div>
          <div className="mt-0.5 text-ink-500">
            Enter your email below and we'll send a fresh verification link.
          </div>
        </div>
      </div>

      <form onSubmit={onResend} className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="size-4" />}
        />
        <Button
          type="submit"
          loading={sending}
          className="w-full"
          size="lg"
        >
          Send new verification link
        </Button>
        {info && (
          <p className="text-center text-xs text-ink-600">{info}</p>
        )}
      </form>
    </div>
  );
}
