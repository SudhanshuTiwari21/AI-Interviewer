"use client";

import { Button } from "@/components/ui/Button";
import { authClient } from "@/lib/auth/client";
import { store } from "@/lib/store";
import { useRouter } from "next/navigation";

export function SuspendedAccountNotice() {
  const router = useRouter();

  async function onSignOut() {
    await authClient.logout();
    store.setUser(null);
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-50/40 px-4 text-center">
      <div className="max-w-md rounded-2xl border border-ink-200 bg-white p-8 shadow-soft">
        <h1 className="text-xl font-semibold text-ink-900">Account suspended</h1>
        <p className="mt-3 text-sm leading-6 text-ink-600">
          Your account is suspended. Please contact support.
        </p>
        <Button className="mt-6" variant="primary" onClick={() => void onSignOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
