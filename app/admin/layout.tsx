import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: "Admin — DOMNI", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return <AdminShell adminEmail={admin.email}>{children}</AdminShell>;
}
