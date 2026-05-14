import "server-only";

import type { UserRow } from "@/lib/db/schema";
import { fail } from "@/lib/api/response";

export const ACCOUNT_SUSPENDED_MESSAGE =
  "Your account is suspended. Please contact support.";

export function isUserSuspended(user: Pick<UserRow, "status"> | null | undefined): boolean {
  return user?.status === "suspended";
}

/** Returns a 403 response if the user is suspended; otherwise null. */
export function suspendResponseIfNeeded(user: UserRow | null) {
  if (!user) return null;
  if (isUserSuspended(user)) {
    return fail("account_suspended", ACCOUNT_SUSPENDED_MESSAGE, 403);
  }
  return null;
}
