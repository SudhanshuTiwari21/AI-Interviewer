import "server-only";

import { ok } from "@/lib/api/response";
import { listCoaches } from "@/lib/server/coaches";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const coaches = await listCoaches({ activeOnly: true });
  return ok({ coaches });
}
