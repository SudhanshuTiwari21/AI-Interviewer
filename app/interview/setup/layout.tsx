import { AppShell } from "@/components/app/AppShell";

export default function InterviewSetupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
