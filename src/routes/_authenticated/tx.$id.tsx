import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyTransactions } from "@/lib/wallet.functions";
import { PageShell } from "@/components/PageShell";
import { ArrowLeft, ArrowDown, ArrowUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { fmt, fmtUsd, shortAddr, NETWORK_FEE_NATIVE, NETWORK_NATIVE_SYMBOL } from "@/lib/format";
import { TOKENS, type NetworkCode } from "@/lib/networks";
import { TokenIcon } from "@/components/TokenIcon";

export const Route = createFileRoute("/_authenticated/tx/$id")({
  component: TxDetail,
  head: () => ({ meta: [{ title: "Transaction — Vaultcube" }] }),
});

function TxDetail() {
  const { id } = useParams({ from: "/_authenticated/tx/$id" });
  const fetchTx = useServerFn(getMyTransactions);
  const { data: txs } = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTx() });
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);

  const tx = txs?.find((t) => t.id === id);

  if (!tx) {
    return (
      <PageShell>
        <header className="grid grid-cols-[auto_1fr_auto] items-center mb-4">
          <Link to="/history" className="p-1.5"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-base font-semibold text-center">Transaction</h1>
          <span className="w-7" />
        </header>
        <div className="text-center text-muted-foreground py-12 text-sm">Loading…</div>
      </PageShell>
    );
  }

  const incoming = tx.to_user_id === me;
  const symbol = (tx as { token?: string }).token ?? tx.network;
  const tokenMeta = TOKENS.find((t) => t.symbol === symbol && t.network === tx.network);
  const priceUsd = tokenMeta?.priceUsd ?? 0;
  const amt = Number(tx.amount);
  const usd = amt * priceUsd;
  const feeNative = NETWORK_FEE_NATIVE[tx.network as NetworkCode] ?? 0;
  const nativeSym = NETWORK_NATIVE_SYMBOL[tx.network as NetworkCode] ?? tx.network;
  const date = new Date(tx.created_at);

  return (
    <PageShell>
      <header className="grid grid-cols-[auto_1fr_auto] items-center mb-6">
        <Link to="/history" className="p-1.5"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-base font-semibold text-center">Transaction details</h1>
        <span className="w-7" />
      </header>

      <div className="flex flex-col items-center text-center mb-6">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${incoming ? "bg-primary/20 text-primary" : "bg-surface-elevated"}`}>
          {incoming ? <ArrowDown className="w-7 h-7" /> : <ArrowUp className="w-7 h-7" />}
        </div>
        <div className={`text-3xl font-bold ${incoming ? "text-primary" : ""}`}>
          {incoming ? "+" : "-"}{fmt(amt, 6)} {symbol}
        </div>
        <div className="text-sm text-muted-foreground mt-1">{fmtUsd(usd)}</div>
      </div>

      <div className="rounded-2xl bg-surface p-4 flex flex-col gap-3 mb-3">
        <Row label="Date" value={date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} />
        <Row label="Status" value={<span className="text-primary font-semibold">Completed</span>} />
        <Row label="Type" value={incoming ? "Received" : "Sent"} />
        <Row label="Network" value={tokenMeta?.chainLabel ?? tx.network} />
        <Row label="Sender" value={<span className="font-mono text-xs">{shortAddr(tx.from_address ?? "", 6, 6)}</span>} />
        <Row label="Recipient" value={<span className="font-mono text-xs">{shortAddr(tx.to_address ?? "", 6, 6)}</span>} />
        {tx.note && <Row label="Note" value={tx.note} />}
      </div>

      <div className="rounded-2xl bg-surface p-4 mb-3">
        <Row label="Network fee" value={
          <div className="text-right">
            <div className="font-semibold">{fmt(feeNative, 8)} {nativeSym}</div>
            <div className="text-[11px] text-muted-foreground">({fmtUsd(feeNative * (TOKENS.find((t) => t.symbol === nativeSym && t.network === tx.network)?.priceUsd ?? 0))})</div>
          </div>
        } />
      </div>

      {tokenMeta && (
        <div className="rounded-2xl bg-surface p-3 flex items-center gap-3">
          <TokenIcon token={tokenMeta} size={36} />
          <div className="text-sm">
            <div className="font-semibold">{tokenMeta.name}</div>
            <div className="text-[11px] text-muted-foreground">{tokenMeta.chainLabel}</div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-sm text-right min-w-0">{value}</div>
    </div>
  );
}
