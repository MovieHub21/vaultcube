import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import cubeImg from "@/assets/cube.png";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
  ssr: false,
  head: () => ({ meta: [{ title: "Get started — Vaultcube" }] }),
});

function Onboarding() {
  return (
    <PageShell>
      <div className="flex-1 flex flex-col items-center justify-center">
        <img src={cubeImg} alt="Crypto cube" className="w-72 h-72 object-contain drop-shadow-[0_0_60px_rgba(59,130,246,0.4)]" />
        <h1 className="mt-10 text-4xl font-bold leading-tight">
          Unlock opportunities<br />across 9+ chains
        </h1>
      </div>
      <div className="flex flex-col gap-3 mt-6">
        <Link
          to="/signup"
          className="w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center active:scale-[0.98] transition"
        >
          Create new wallet
        </Link>
        <Link
          to="/auth"
          className="w-full h-14 rounded-full bg-secondary text-secondary-foreground font-semibold text-base flex items-center justify-center active:scale-[0.98] transition"
        >
          I already have a wallet
        </Link>
        <p className="text-xs text-center text-muted-foreground mt-3">
          By tapping any button you agree to our{" "}
          <span className="text-primary">Terms of Service</span> and{" "}
          <span className="text-primary">Privacy Policy</span>.
        </p>
      </div>
    </PageShell>
  );
}
