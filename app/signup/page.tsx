"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { store } from "@/lib/store";
import { uid } from "@/lib/utils";
import { Mail, Lock, User } from "lucide-react";

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

function SignupInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next");
  const plan = search.get("plan");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.includes("@") || password.length < 6) {
      setError("Please fill in your name, a valid email, and a 6+ char password.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      store.setUser({
        id: uid("user"),
        name: name.trim(),
        email: email.trim(),
        createdAt: new Date().toISOString(),
      });
      const target =
        next ||
        (plan ? `/checkout?plan=${plan}` : "/checkout?plan=pro");
      router.push(target);
    }, 600);
  }

  return (
    <AuthShell
      title="Create your Apex account"
      subtitle="Start with one free mock interview — no credit card required."
      footer={
        <>
          By signing up you agree to our{" "}
          <Link href="#" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="#" className="underline">
            Privacy Policy
          </Link>
          .
        </>
      }
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
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="size-4" />}
          error={error || undefined}
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Create account
        </Button>
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-ink-100" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-xs text-ink-400">or</span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          onClick={() => {
            store.setUser({
              id: uid("user"),
              name: "Alex Morgan",
              email: "alex@apex.demo",
              createdAt: new Date().toISOString(),
              plan: "team",
            });
            router.push("/dashboard");
          }}
        >
          Continue with demo account (Team plan)
        </Button>
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
