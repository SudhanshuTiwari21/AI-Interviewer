import { AppShell } from "@/components/app/AppShell";

export default function SupportLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
