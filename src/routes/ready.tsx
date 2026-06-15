import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import walletImg from "@/assets/wallet.png";

export const Route = createFileRoute("/ready")({
  component: Ready,
  ssr: false,
  head: () => ({ meta: [{ title: "Wallet ready — Vaultcube" }] }),
});

function Ready() {
  const navigate = useNavigate();
  return (
    <PageShell>
      <div className="flex justify-end">
        <button
          onClick={() => navigate({ to: "/home", replace: true })}
          className="px-4 py-2 rounded-full bg-secondary text-sm font-medium"
        >
          Skip
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <img src={walletImg} alt="Wallet" className="w-72 h-72 object-contain drop-shadow-[0_0_60px_rgba(52,211,153,0.4)]" />
        <Confetti />
        <h1 className="mt-6 text-3xl font-bold text-center">Brilliant, your wallet is ready!</h1>
        <p className="mt-2 text-muted-foreground">Add funds to get started</p>
      </div>
      <Link
        to="/home"
        className="w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center"
      >
        Open wallet
      </Link>
    </PageShell>
  );
}

function Confetti() {
  const dots = Array.from({ length: 28 });
  const colors = ["#34d399", "#60a5fa", "#fbbf24", "#f472b6", "#a78bfa"];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {dots.map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full w-2 h-2"
          style={{
            background: colors[i % colors.length],
            left: `${(i * 37) % 100}%`,
            top: `${50 + ((i * 53) % 50)}%`,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}
