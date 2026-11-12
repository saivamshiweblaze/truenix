import { Suspense } from "react";
import { AdminShell } from "@/features/admin/admin-shell";
import { Splash } from "@/components/shell/session-gate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Splash />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
