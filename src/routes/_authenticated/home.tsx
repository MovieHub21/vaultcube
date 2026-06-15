import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyWallet, getMyTransactions, demoFund } from "@/lib/wallet.functions";
import { PageShell } from "@/components/PageShell";
import { TOKENS, tokenKey } from "@/lib/networks";
import { ArrowUp, ArrowDown, Plus, RefreshCw, LogOut, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TokenIcon } from "@/components/TokenIcon";

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

  const { data: wallet, isLoading, refetch } = useQuery({ queryKey: ["wallet"], queryFn: () => fetchWallet() });
  useQuery({ queryKey: ["transactions"], queryFn: () => fetchTx() });

  const fundMut = useMutation({
    mutationFn: () => fund({ data: { network: "ETH", token: "ETH", amount: 1 } }),
    onSuccess: () => {
      toast.success("Funded 1 ETH (demo)");
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const balances = wallet?.balances ?? [];
  const held = TOKENS.map((t) => {
    const b = balances.find((x) => x.network === t.network && x.token === t.symbol);
    const amount = Number(b?.amount ?? 0);
    return { ...t, amount, usd: amount * t.priceUsd };
  });
  const total = held.reduce((s, h) => s + h.usd, 0);
  const visible = held.filter((h) => h.amount > 0 || h.popular);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/onboarding", replace: true });
  }

  return (
    <PageShell className="pb-24">
      <header className="flex items-center gap-2">
        <button onClick={signOut} className="p-2 rounded-full bg-surface-elevated"><LogOut className="w-4 h-4" /></button>
        <div className="flex-1 h-9 rounded-full bg-surface-elevated flex items-center px-3 text-muted-foreground text-xs">Search</div>
        <button onClick={() => refetch()} className="p-2 rounded-full bg-surface-elevated"><RefreshCw className="w-4 h-4" /></button>
      </header>

      <div className="mt-6 flex flex-col items-center">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated text-xs font-medium">
          {wallet?.profile?.display_name ?? "Main Wallet"}
        </div>
        <div className="mt-4 text-4xl font-bold">${total.toFixed(2)}</div>
        <div className="text-muted-foreground text-xs mt-1">$0.00 (0.00%)</div>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-2">
        <ActionTile icon={<ArrowUp className="w-4 h-4" />} label="Send" onClick={() => navigate({ to: "/send" })} />
        <ActionTile icon={<ArrowDown className="w-4 h-4" />} label="Receive" onClick={() => navigate({ to: "/receive" })} />
        <ActionTile icon={<History className="w-4 h-4" />} label="History" onClick={() => navigate({ to: "/history" })} />
        <ActionTile icon={<Plus className="w-4 h-4" />} label="Buy" highlight onClick={() => fundMut.mutate()} />
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold mb-2 border-b-2 border-primary pb-1.5 inline-block">Crypto</h2>
        <div className="mt-1 rounded-2xl bg-surface overflow-hidden divide-y divide-border">
          {isLoading && <div className="p-5 text-center text-xs text-muted-foreground">Loading…</div>}
          {visible.map((h) => (
            <div key={tokenKey(h)} className="flex items-center gap-3 px-3 py-2.5">
              <TokenIcon token={h} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  {h.symbol}
                  <span className="text-[10px] text-muted-foreground bg-surface-elevated px-1.5 py-0.5 rounded-md">{h.chainLabel}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">${h.priceUsd.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{h.amount.toFixed(4)}</div>
                <div className="text-[11px] text-muted-foreground">${h.usd.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto px-4 pb-3">
        <div className="bg-surface-elevated/95 backdrop-blur border border-border rounded-full h-14 flex items-center justify-around px-3">
          <span className="text-primary text-[11px] font-medium">Home</span>
          <Link to="/history" className="text-muted-foreground text-[11px]">History</Link>
          <Link to="/send" className="bg-primary text-primary-foreground rounded-full w-11 h-11 flex items-center justify-center -mt-5">
            <ArrowUp className="w-4 h-4" />
          </Link>
          <Link to="/receive" className="text-muted-foreground text-[11px]">Receive</Link>
          <span className="text-muted-foreground text-[11px]">Discover</span>
        </div>
      </nav>
    </PageShell>
  );
}

function ActionTile({ icon, label, onClick, highlight }: { icon: React.ReactNode; label: string; onClick?: () => void; highlight?: boolean }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5">
      <div className={`w-13 h-13 w-[52px] h-[52px] rounded-2xl flex items-center justify-center ${highlight ? "bg-primary text-primary-foreground" : "bg-surface-elevated"}`}>
        {icon}
      </div>
      <span className="text-[11px]">{label}</span>
    </button>
  );
}
