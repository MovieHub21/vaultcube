import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyWallet, getMyTransactions, demoFund } from "@/lib/wallet.functions";
import { PageShell } from "@/components/PageShell";
import { NETWORKS, NETWORK_BY_CODE, type NetworkCode } from "@/lib/networks";
import { ArrowUp, ArrowDown, Plus, RefreshCw, Settings, LogOut, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/home")({
  component: Home,
  head: () => ({ meta: [{ title: "Wallet — Vaultcube" }] }),
});

function Home() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchWallet = useServerFn(getMyWallet);
  const fetchTx = useServerFn(getMyTransactions);
  const fund = useServerFn(demoFund);

  const { data: wallet, isLoading, refetch } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => fetchWallet(),
  });
  const { data: txs } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => fetchTx(),
  });

  const fundMut = useMutation({
    mutationFn: () => fund({ data: { network: "ETH", amount: 1 } }),
    onSuccess: () => {
      toast.success("Funded 1 ETH (demo)");
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const balances = wallet?.balances ?? [];
  const total = balances.reduce((s, b) => s + Number(b.amount) * mockPrice(b.network), 0);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/onboarding", replace: true });
  }

  return (
    <PageShell className="pb-24">
      <header className="flex items-center gap-3">
        <button onClick={signOut} className="p-2 rounded-full bg-surface-elevated"><LogOut className="w-5 h-5" /></button>
        <div className="flex-1 h-11 rounded-full bg-surface-elevated flex items-center px-4 text-muted-foreground text-sm">
          Search
        </div>
        <button onClick={() => refetch()} className="p-2 rounded-full bg-surface-elevated"><RefreshCw className="w-5 h-5" /></button>
      </header>

      <div className="mt-8 flex flex-col items-center">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-elevated text-sm font-medium">
          {wallet?.profile?.display_name ?? "Main Wallet"}
        </div>
        <div className="mt-6 text-5xl font-bold">${total.toFixed(2)}</div>
        <div className="text-muted-foreground mt-1">$0.00 (0.00%)</div>
      </div>

      <div className="mt-8 grid grid-cols-4 gap-2">
        <ActionTile icon={<ArrowUp />} label="Send" onClick={() => navigate({ to: "/send" })} />
        <ActionTile icon={<ArrowDown />} label="Receive" onClick={() => navigate({ to: "/receive" })} />
        <ActionTile icon={<History />} label="History" onClick={() => navigate({ to: "/history" })} />
        <ActionTile
          icon={<Plus />}
          label="Buy"
          highlight
          onClick={() => fundMut.mutate()}
        />
      </div>

      <div className="mt-8">
        <h2 className="font-semibold mb-3 border-b-2 border-primary pb-2 inline-block">Crypto</h2>
        <div className="mt-2 rounded-3xl bg-surface overflow-hidden divide-y divide-border">
          {isLoading && <div className="p-6 text-center text-muted-foreground">Loading…</div>}
          {NETWORKS.map((n) => {
            const b = balances.find((x) => x.network === n.code);
            const amt = Number(b?.amount ?? 0);
            return (
              <div key={n.code} className="flex items-center gap-3 px-4 py-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                  style={{ background: n.color }}
                >
                  {n.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{n.name}</div>
                  <div className="text-xs text-muted-foreground">${mockPrice(n.code).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{amt.toFixed(4)} {n.symbol}</div>
                  <div className="text-xs text-muted-foreground">${(amt * mockPrice(n.code)).toFixed(2)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto px-5 pb-4">
        <div className="bg-surface-elevated/95 backdrop-blur border border-border rounded-full h-16 flex items-center justify-around px-4">
          <span className="text-primary text-xs font-medium">Home</span>
          <Link to="/history" className="text-muted-foreground text-xs">History</Link>
          <Link to="/send" className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center -mt-6">
            <ArrowUp className="w-5 h-5" />
          </Link>
          <Link to="/receive" className="text-muted-foreground text-xs">Receive</Link>
          <span className="text-muted-foreground text-xs">Discover</span>
        </div>
      </nav>
    </PageShell>
  );
}

function ActionTile({ icon, label, onClick, highlight }: { icon: React.ReactNode; label: string; onClick?: () => void; highlight?: boolean }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${highlight ? "bg-primary text-primary-foreground" : "bg-surface-elevated"}`}>
        <span className="w-6 h-6 flex items-center justify-center">{icon}</span>
      </div>
      <span className="text-xs">{label}</span>
    </button>
  );
}

function mockPrice(net: string): number {
  const p: Record<string, number> = { BTC: 65000, ETH: 3200, SOL: 145, BNB: 580, TRX: 0.12, LTC: 75, DOGE: 0.16, AVAX: 35, ADA: 0.42 };
  return p[net] ?? 1;
}
