import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_authenticated/perps")({
  component: Perps,
  head: () => ({ meta: [{ title: "Perps — Vaultcube" }] }),
});

function Perps() {
  return (
    <PageShell className="pb-28">
      <h1 className="text-lg font-semibold text-center">Perps</h1>
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="text-6xl">♾️</div>
        <p className="mt-4 text-sm text-muted-foreground">Perpetual futures coming soon.</p>
      </div>
      <BottomNav />
    </PageShell>
  );
}
