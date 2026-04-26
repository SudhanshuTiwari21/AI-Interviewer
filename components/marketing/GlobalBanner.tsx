"use client";

import { useEffect, useState } from "react";

type PublicSettings = {
  banner?: { enabled: boolean; message: string; tone: "info" | "warn" | "success" };
};

export function GlobalBanner() {
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  useEffect(() => {
    void fetch("/api/settings/public", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setSettings(d.settings);
      });
  }, []);

  const banner = settings?.banner;
  if (!banner?.enabled || !banner.message.trim()) return null;

  let toneClasses = "border-accent-200 bg-accent-50 text-accent-700";
  if (banner.tone === "success") {
    toneClasses = "border-success-200 bg-success-50 text-success-700";
  } else if (banner.tone === "warn") {
    toneClasses = "border-warn-200 bg-warn-50 text-warn-700";
  }

  return (
    <div className={`border-b px-4 py-2 text-center text-xs font-medium ${toneClasses}`}>
      {banner.message}
    </div>
  );
}
