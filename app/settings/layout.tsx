import { AppShell } from "@/components/app/AppShell";

export default function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
