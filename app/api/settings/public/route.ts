import "server-only";

import { ok } from "@/lib/api/response";
import { getAdminSettings } from "@/lib/admin-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getAdminSettings();
  return ok({
    settings: {
      pricePerInterviewInr: settings.pricePerInterviewInr,
      supportEmail: settings.supportEmail,
      maintenanceMode: settings.maintenanceMode,
      allowSignups: settings.allowSignups,
      banner: settings.banner ?? { enabled: false, message: "", tone: "info" },
    },
  });
}
