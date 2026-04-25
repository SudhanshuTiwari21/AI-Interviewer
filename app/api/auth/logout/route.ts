import "server-only";

import { clearSessionCookie } from "@/lib/auth/session";
import { ok } from "@/lib/api/response";

export const runtime = "nodejs";

export async function POST() {
  clearSessionCookie();
  return ok({ status: "logged_out" });
}
