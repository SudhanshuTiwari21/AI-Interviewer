"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { store } from "@/lib/store";
import { uid } from "@/lib/utils";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setLoading(true);
    setTimeout(() => {
      const existing = store.getUser();
      store.setUser(
        existing ?? {
          id: uid("user"),
          name: email.split("@")[0]!.replace(/\W+/g, " "),
          email,
          createdAt: new Date().toISOString(),
          plan: email.endsWith(".demo") ? "team" : undefined,
        },
      );
      router.push("/dashboard");
    }, 500);
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
        />
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
