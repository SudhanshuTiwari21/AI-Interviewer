import { CoachShell } from "@/components/coach/CoachShell";

export default function CoachLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <CoachShell>{children}</CoachShell>;
}
