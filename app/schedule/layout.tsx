import { AppShell } from "@/components/app/AppShell";

export default function ScheduleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
