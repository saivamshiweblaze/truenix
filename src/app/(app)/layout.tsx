import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { SessionGate, Splash } from "@/components/shell/session-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Splash />}>
      <SessionGate>
        <AppShell>{children}</AppShell>
      </SessionGate>
    </Suspense>
  );
}
