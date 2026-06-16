import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyTransactions } from "@/lib/wallet.functions";
import { PageShell } from "@/components/PageShell";
import { ArrowLeft, ArrowDown, ArrowUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/history")({
  component: History,
  head: () => ({ meta: [{ title: "History — Vaultcube" }] }),
});

function History() {
  const navigate = useNavigate();
  const fetchTx = useServerFn(getMyTransactions);
  const { data: txs } = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTx() });
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  return (
    <PageShell>
      <header className="flex items-center justify-between mb-6">
        <Link to="/home" className="p-2 -ml-2"><ArrowLeft className="w-6 h-6" /></Link>
        <h1 className="font-semibold">History</h1>
        <span className="w-6" />
      </header>

      <div className="flex flex-col gap-2">
        {(!txs || txs.length === 0) && (
          <div className="text-center text-muted-foreground py-16">No transactions yet</div>
        )}
        {txs?.map((t) => {
          const incoming = t.to_user_id === me;
          const symbol = (t as { token?: string }).token ?? t.network;
          return (
            <button
              key={t.id}
              onClick={() => navigate({ to: "/tx/$id", params: { id: t.id } })}
              className="flex items-center gap-3 p-4 rounded-2xl bg-surface text-left active:bg-surface-elevated"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${incoming ? "bg-primary/20 text-primary" : "bg-secondary"}`}>
                {incoming ? <ArrowDown className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{incoming ? "Received" : "Sent"} {symbol}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {incoming ? `From ${t.from_address ?? "?"}` : `To ${t.to_address}`} · {t.network}
                </div>
              </div>
              <div className={`font-semibold ${incoming ? "text-primary" : ""}`}>
                {incoming ? "+" : "-"}{fmt(Number(t.amount), 4)} {symbol}
              </div>
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}
