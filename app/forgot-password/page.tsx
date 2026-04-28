"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authClient } from "@/lib/auth/client";
import { Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    setLoading(true);
    const res = await authClient.forgotPassword(email.trim());
    setLoading(false);
    if (!res.ok) {
      setError(res.message || "Could not send reset instructions.");
      return;
    }
    setInfo(
      "If an account exists for that email, we sent password reset instructions.",
    );
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your account email and we'll send a reset link."
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
          error={error || undefined}
        />
        {info && (
          <p className="rounded-xl border border-success-200 bg-success-50 px-3 py-2 text-xs text-success-700">
            {info}
          </p>
        )}
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Send reset link
        </Button>
        <p className="text-center text-sm text-ink-500">
          Remembered your password?{" "}
          <Link href="/login" className="font-medium text-ink-900 underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
