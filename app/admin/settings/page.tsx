"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAdmin, AdminPageHeader } from "@/components/admin/AdminShell";
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Megaphone,
  Wrench,
  Mail,
  Loader2,
} from "lucide-react";

type Settings = {
  pricePerInterviewInr: number;
  banner?: { enabled: boolean; message: string; tone: "info" | "warn" | "success" };
  maintenanceMode: boolean;
  supportEmail: string;
  allowSignups: boolean;
  coachingTechnologyCategories: string[];
};

export default function AdminSettingsPage() {
  const { has } = useAdmin();
  const canEdit = has("settings.update");

  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // form state
  const [price, setPrice] = useState("299");
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [bannerTone, setBannerTone] = useState<"info" | "warn" | "success">("info");
  const [maintenance, setMaintenance] = useState(false);
  const [supportEmail, setSupportEmail] = useState("hi@selectwise.app");
  const [allowSignups, setAllowSignups] = useState(true);
  const [coachingCategories, setCoachingCategories] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/settings", { cache: "no-store" });
        const data = await res.json();
        if (cancelled || !data.ok) return;
        const s: Settings = data.settings;
        setSettings(s);
        setPrice(String(s.pricePerInterviewInr));
        setBannerEnabled(s.banner?.enabled ?? false);
        setBannerMessage(s.banner?.message ?? "");
        setBannerTone(s.banner?.tone ?? "info");
        setMaintenance(s.maintenanceMode);
        setSupportEmail(s.supportEmail);
        setAllowSignups(s.allowSignups);
        setCoachingCategories((s.coachingTechnologyCategories ?? []).join("\n"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(patch: Partial<Settings>) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!data.ok) {
        setMsg({ type: "err", text: data.message ?? "Save failed" });
        return;
      }
      setSettings(data.settings);
      setMsg({ type: "ok", text: "Saved." });
    } catch {
      setMsg({ type: "err", text: "Network error." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-ink-500">
        <Loader2 className="mr-2 size-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center text-sm text-ink-500">
        Settings could not be loaded.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader
        title="Platform settings"
        description="Pricing, banners, maintenance toggles, and support contact."
        actions={
          !canEdit && (
            <Badge tone="warn" dot>
              Read only
            </Badge>
          )
        }
      />

      {msg && (
        <div
          className={
            "mb-4 rounded-lg border px-3 py-2 text-sm " +
            (msg.type === "ok"
              ? "border-success-200 bg-success-50 text-success-700"
              : "border-danger-200 bg-danger-50 text-danger-700")
          }
        >
          {msg.type === "ok" ? (
            <CheckCircle2 className="mr-2 inline size-4" />
          ) : (
            <AlertTriangle className="mr-2 inline size-4" />
          )}
          {msg.text}
        </div>
      )}

      <SettingCard
        icon={DollarSign}
        title="Pricing"
        description="Flat per-interview price displayed at checkout."
      >
        <div className="grid grid-cols-[auto,1fr,auto] items-end gap-3">
          <span className="self-center text-lg font-semibold text-ink-900">₹</span>
          <input
            disabled={!canEdit}
            type="number"
            min="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm disabled:bg-ink-50"
          />
          <Button
            size="sm"
            disabled={!canEdit || saving || Number(price) === settings.pricePerInterviewInr}
            onClick={() => void save({ pricePerInterviewInr: Number(price) })}
          >
            Save price
          </Button>
        </div>
      </SettingCard>

      <SettingCard
        icon={Megaphone}
        title="Site banner"
        description="Optional message shown at the top of the marketing site and dashboard."
      >
        <label className="mb-3 inline-flex items-center gap-2 text-sm text-ink-700">
          <input
            disabled={!canEdit}
            type="checkbox"
            checked={bannerEnabled}
            onChange={(e) => setBannerEnabled(e.target.checked)}
          />
          <span>Show banner</span>
        </label>
        <Field label="Message">
          <input
            disabled={!canEdit}
            value={bannerMessage}
            onChange={(e) => setBannerMessage(e.target.value)}
            placeholder="e.g. Limited-time onboarding event next Friday"
            maxLength={280}
            className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm disabled:bg-ink-50"
          />
        </Field>
        <Field label="Tone">
          <select
            disabled={!canEdit}
            value={bannerTone}
            onChange={(e) =>
              setBannerTone(e.target.value as "info" | "warn" | "success")
            }
            className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm disabled:bg-ink-50"
          >
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warn">Warning</option>
          </select>
        </Field>
        <Button
          size="sm"
          disabled={!canEdit || saving}
          onClick={() =>
            void save({
              banner: {
                enabled: bannerEnabled,
                message: bannerMessage,
                tone: bannerTone,
              },
            })
          }
        >
          Save banner
        </Button>
      </SettingCard>

      <SettingCard
        icon={Wrench}
        title="Coaching technology taxonomy"
        description="Controls technology chips shown on the coaching schedule page."
      >
        <Field label="One category per line">
          <textarea
            disabled={!canEdit}
            value={coachingCategories}
            onChange={(e) => setCoachingCategories(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm disabled:bg-ink-50"
            placeholder={"Frontend\nBackend\nFull Stack"}
          />
        </Field>
        <Button
          size="sm"
          disabled={!canEdit || saving}
          onClick={() => {
            const parsed = coachingCategories
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean);
            void save({ coachingTechnologyCategories: parsed });
          }}
        >
          Save categories
        </Button>
      </SettingCard>

      <SettingCard
        icon={Wrench}
        title="Operational toggles"
        description="Tune candidate-facing behavior."
      >
        <Toggle
          disabled={!canEdit || saving}
          label="Allow new signups"
          description="Hide the signup CTAs and block API signups when off."
          checked={allowSignups}
          onChange={(value) => {
            setAllowSignups(value);
            void save({ allowSignups: value });
          }}
        />
        <Toggle
          disabled={!canEdit || saving}
          label="Maintenance mode"
          description="Redirect candidate flows to a maintenance screen."
          checked={maintenance}
          onChange={(value) => {
            setMaintenance(value);
            void save({ maintenanceMode: value });
          }}
        />
      </SettingCard>

      <SettingCard
        icon={Mail}
        title="Support contact"
        description="Shown in receipts and verification emails."
      >
        <div className="grid grid-cols-[1fr,auto] gap-3">
          <input
            disabled={!canEdit}
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm disabled:bg-ink-50"
          />
          <Button
            size="sm"
            disabled={!canEdit || saving || supportEmail === settings.supportEmail}
            onClick={() => void save({ supportEmail })}
          >
            Save email
          </Button>
        </div>
      </SettingCard>
    </div>
  );
}

function SettingCard({
  icon: Icon,
  title,
  description,
  children,
}: Readonly<{
  icon: typeof DollarSign;
  title: string;
  description: string;
  children: React.ReactNode;
}>) {
  return (
    <Card className="mb-4">
      <CardBody className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
            <Icon className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink-900">{title}</p>
            <p className="text-xs text-ink-500">{description}</p>
          </div>
        </div>
        <div className="space-y-2">{children}</div>
      </CardBody>
    </Card>
  );
}

function Field({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-600">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: Readonly<{
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}>) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-lg border border-ink-200 bg-white p-3">
      <div>
        <p className="text-sm font-medium text-ink-900">{label}</p>
        <p className="text-xs text-ink-500">{description}</p>
      </div>
      <input
        aria-label={label}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4"
      />
    </label>
  );
}
