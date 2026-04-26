import { AdminShell } from "@/components/admin/AdminShell";

export const metadata = {
  title: "Admin · Selectwise",
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AdminShell>{children}</AdminShell>;
}
