import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAdmin } from "@/lib/admin";
import { DashboardShell } from "@/components/organizer/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, admin] = await Promise.all([
    prisma.profile.findUnique({ where: { id: user.id }, select: { fullName: true, email: true, plan: true } }),
    getAdmin(),
  ]);

  const email = profile?.email ?? user.email ?? "";
  return (
    <DashboardShell
      user={{
        name: profile?.fullName || email.split("@")[0] || "Organizer",
        email,
        plan: profile?.plan ?? "FREE",
        isAdmin: !!admin,
      }}
    >
      {children}
    </DashboardShell>
  );
}
