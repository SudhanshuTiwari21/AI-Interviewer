"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/app/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { store } from "@/lib/store";

type UserSettings = {
  timezone: string;
  emailNotifications: boolean;
  interviewReminders: boolean;
  marketingEmails: boolean;
  defaultInterviewType: string | null;
  defaultCompanyType: string | null;
};

type ProfileSettings = {
  firstName: string;
  lastName: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [profile, setProfile] = useState<ProfileSettings>({ firstName: "", lastName: "" });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "danger">("success");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/user/settings", { cache: "no-store" });
        if (res.status === 401) {
          if (!cancelled) {
            router.replace("/login?next=/settings");
          }
          return;
        }
        const raw = await res.text();
        let data: {
          ok?: boolean;
          settings?: UserSettings;
          profile?: ProfileSettings;
          message?: string;
        } = {};
        try {
          data = raw ? (JSON.parse(raw) as typeof data) : {};
        } catch {
          data = {
            ok: false,
            message: `Settings API error (${res.status}).`,
          };
        }
        if (cancelled) return;
        if (data.ok && data.settings) {
          setSettings(data.settings);
          setProfile(data.profile ?? { firstName: "", lastName: "" });
          setLoadError(null);
          return;
        }
        setLoadError(data.message ?? "Could not load settings.");
      } catch {
        if (!cancelled) setLoadError("Could not load settings right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    setMessageTone("success");
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...settings,
          firstName: profile.firstName,
          lastName: profile.lastName || null,
          currentPassword: passwordForm.currentPassword || undefined,
          newPassword: passwordForm.newPassword || undefined,
          confirmPassword: passwordForm.confirmPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMessage(data.message ?? "Could not save settings.");
        setMessageTone("danger");
        return;
      }
      setSettings(data.settings);
      setProfile(data.profile ?? profile);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      const existingUser = store.getUser();
      if (existingUser) {
        const nextName = [data.profile?.firstName, data.profile?.lastName].filter(Boolean).join(" ");
        store.setUser({
          ...existingUser,
          name: nextName || existingUser.name,
        });
      }
      setMessage(data.passwordUpdated ? "Settings and password updated." : "Settings saved.");
    } catch {
      setMessage("Network error while saving settings.");
      setMessageTone("danger");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container max-w-5xl px-4 py-10 text-sm text-ink-500">
        Loading settings...
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <div className="container max-w-5xl px-4 py-10">
        <p className="text-sm text-danger-600">{loadError ?? "Could not load settings."}</p>
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              router.refresh();
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl px-4 py-8 sm:py-10">
      <PageHeader
        title="Settings"
        description="Manage your interview preferences and notification controls."
        actions={message ? <Badge tone={messageTone}>{message}</Badge> : undefined}
      />

      <div className="mt-6 space-y-4">
        <Card>
          <CardBody className="space-y-3">
            <p className="text-sm font-semibold text-ink-900">Profile</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-ink-600">
                <span>First name</span>
                <input
                  value={profile.firstName}
                  onChange={(e) => setProfile((prev) => ({ ...prev, firstName: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                  placeholder="John"
                />
              </label>
              <label className="block text-xs text-ink-600">
                <span>Last name</span>
                <input
                  value={profile.lastName}
                  onChange={(e) => setProfile((prev) => ({ ...prev, lastName: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                  placeholder="Doe"
                />
              </label>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <p className="text-sm font-semibold text-ink-900">Preferences</p>
            <label className="block text-xs text-ink-600">
              <span>Timezone</span>
              <input
                value={settings.timezone}
                onChange={(e) =>
                  setSettings((prev) => (prev ? { ...prev, timezone: e.target.value } : prev))
                }
                className="mt-1 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
              />
            </label>
            <label className="block text-xs text-ink-600">
              <span>Default interview type</span>
              <input
                value={settings.defaultInterviewType ?? ""}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev ? { ...prev, defaultInterviewType: e.target.value || null } : prev,
                  )
                }
                className="mt-1 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                placeholder="Technical Round"
              />
            </label>
            <label className="block text-xs text-ink-600">
              <span>Default company type</span>
              <input
                value={settings.defaultCompanyType ?? ""}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev ? { ...prev, defaultCompanyType: e.target.value || null } : prev,
                  )
                }
                className="mt-1 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                placeholder="Product Company"
              />
            </label>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <p className="text-sm font-semibold text-ink-900">Notifications</p>
            <Toggle
              label="Email notifications"
              checked={settings.emailNotifications}
              onChange={(value) =>
                setSettings((prev) => (prev ? { ...prev, emailNotifications: value } : prev))
              }
            />
            <Toggle
              label="Interview reminders"
              checked={settings.interviewReminders}
              onChange={(value) =>
                setSettings((prev) => (prev ? { ...prev, interviewReminders: value } : prev))
              }
            />
            <Toggle
              label="Marketing emails"
              checked={settings.marketingEmails}
              onChange={(value) =>
                setSettings((prev) => (prev ? { ...prev, marketingEmails: value } : prev))
              }
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <p className="text-sm font-semibold text-ink-900">Change password</p>
            <label className="block text-xs text-ink-600">
              <span>Current password</span>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                }
                className="mt-1 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                placeholder="Current password"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-ink-600">
                <span>New password</span>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                  placeholder="At least 8 characters"
                />
              </label>
              <label className="block text-xs text-ink-600">
                <span>Confirm new password</span>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                  placeholder="Repeat new password"
                />
              </label>
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: Readonly<{
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}>) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4"
      />
    </label>
  );
}
