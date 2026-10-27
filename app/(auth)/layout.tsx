import { AuthSidePanel } from "@/components/auth/AuthSidePanel";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
      <AuthSidePanel />
    </div>
  );
}
