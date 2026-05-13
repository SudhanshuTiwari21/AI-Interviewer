"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authClient } from "@/lib/auth/client";
import {
  formatPasswordPolicyError,
  PASSWORD_POLICY_BULLETS,
} from "@/lib/auth/password-policy";
import { Lock } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!token) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const policyError = formatPasswordPolicyError(password);
    if (policyError) {
      setError(policyError);
      return;
    }

    setLoading(true);
    const res = await authClient.resetPassword({
      token,
      password,
      confirmPassword,
    });
    setLoading(false);

    if (!res.ok) {
      setError(res.message || "Could not reset password.");
      return;
    }
    setInfo("Password reset successful. You can now sign in.");
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle="Set a new password for your account."
      footer={
        <>
          Need a new reset link?{" "}
          <Link href="/forgot-password" className="underline">
            Request again
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="Strong password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="size-4" />}
          error={error || undefined}
        />
        <ul className="list-inside list-disc text-xs text-ink-500">
          {PASSWORD_POLICY_BULLETS.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock className="size-4" />}
        />
        {info && (
          <p className="rounded-xl border border-success-200 bg-success-50 px-3 py-2 text-xs text-success-700">
            {info}{" "}
            <Link href="/login" className="underline">
              Go to sign in
            </Link>
            .
          </p>
        )}
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Reset password
        </Button>
      </form>
    </AuthShell>
  );
}
