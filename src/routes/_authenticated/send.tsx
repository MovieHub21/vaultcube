import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyWallet, sendFunds } from "@/lib/wallet.functions";
import { PageShell } from "@/components/PageShell";
import { TokenIcon } from "@/components/TokenIcon";
import { NETWORKS, TOKENS, tokenKey, type NetworkCode, type Token } from "@/lib/networks";
import { useMemo, useState } from "react";
import { ArrowLeft, Search, FileSearch } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/send")({
  component: Send,
  head: () => ({ meta: [{ title: "Send — Vaultcube" }] }),
});

function Send() {
  const fetchWallet = useServerFn(getMyWallet);
  const { data } = useQuery({ queryKey: ["wallet"], queryFn: () => fetchWallet() });

  const [filter, setFilter] = useState<"ALL" | NetworkCode>("ALL");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Token | null>(null);

  const held = useMemo(() => {
    const bals = data?.balances ?? [];
    return TOKENS.map((t) => {
      const b = bals.find((x) => x.network === t.network && x.token === t.symbol);
      return { ...t, amount: Number(b?.amount ?? 0) };
    }).filter((t) => t.amount > 0);
  }, [data]);

  const filtered = useMemo(() => {
    return held.filter((t) => {
      if (filter !== "ALL" && t.network !== filter) return false;
      if (q && !`${t.symbol} ${t.name}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [held, filter, q]);

  if (picked) return <SendForm token={picked} balance={held.find((h) => tokenKey(h) === tokenKey(picked))?.amount ?? 0} onBack={() => setPicked(null)} />;

  return (
    <PageShell>
      <header className="grid grid-cols-[auto_1fr_auto] items-center mb-4">
        <Link to="/home" className="p-1.5 -ml-1.5"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-base font-semibold text-center">Send</h1>
        <span className="w-7" />
      </header>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          className="w-full h-10 pl-9 pr-3 rounded-full bg-surface-elevated text-sm outline-none"
        />
      </div>

      <ChainFilter value={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
          <FileSearch className="w-16 h-16 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground mt-4">No assets found</p>
          <Link to="/home" className="text-primary font-semibold text-sm mt-8">Buy Cryptocurrency</Link>
        </div>
      ) : (
        <div className="mt-2 -mx-1">
          {filtered.map((t) => (
            <button
              key={tokenKey(t)}
              onClick={() => setPicked(t)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-surface-elevated"
            >
              <TokenIcon token={t} size={38} />
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  {t.symbol}
                  <span className="text-[10px] text-muted-foreground bg-surface-elevated px-1.5 py-0.5 rounded-md">{t.chainLabel}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{t.name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{t.amount.toFixed(4)}</div>
                <div className="text-[11px] text-muted-foreground">${(t.amount * t.priceUsd).toFixed(2)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function ChainFilter({ value, onChange }: { value: "ALL" | NetworkCode; onChange: (v: "ALL" | NetworkCode) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 mt-3 no-scrollbar">
      <FilterChip active={value === "ALL"} onClick={() => onChange("ALL")} label="All" />
      {NETWORKS.map((n) => (
        <button
          key={n.code}
          onClick={() => onChange(n.code)}
          className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-sm border-2 ${value === n.code ? "border-primary" : "border-transparent"}`}
          style={{ background: n.color }}
          title={n.name}
        >
          {n.emoji}
        </button>
      ))}
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 h-11 px-4 rounded-xl border-2 text-sm font-semibold ${active ? "border-primary text-primary" : "border-border text-foreground"}`}
    >
      {label}
    </button>
  );
}

function SendForm({ token, balance, onBack }: { token: Token; balance: number; onBack: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const send = useServerFn(sendFunds);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const mut = useMutation({
    mutationFn: () => send({ data: { toAddress: to.trim(), network: token.network, token: token.symbol, amount: parseFloat(amount), note: note || undefined } }),
    onSuccess: () => {
      toast.success(`Sent ${amount} ${token.symbol}`);
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      navigate({ to: "/home" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const a = parseFloat(amount);
    if (!to.trim() || !a || a <= 0) return toast.error("Enter address and amount");
    mut.mutate();
  }

  return (
    <PageShell>
      <header className="grid grid-cols-[auto_1fr_auto] items-center mb-4">
        <button onClick={onBack} className="p-1.5 -ml-1.5"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-base font-semibold text-center">Send {token.symbol}</h1>
        <span className="w-7" />
      </header>

      <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface">
        <TokenIcon token={token} size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{token.name}</div>
          <div className="text-[11px] text-muted-foreground">{token.chainLabel}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">{balance.toFixed(4)}</div>
          <div className="text-[11px] text-muted-foreground">${(balance * token.priceUsd).toFixed(2)}</div>
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 flex-1">
        <div>
          <label className="text-[11px] text-muted-foreground">Recipient {token.chainLabel} address</label>
          <textarea
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={`Paste address`}
            rows={2}
            className="mt-1 w-full p-3 rounded-2xl bg-surface border border-border outline-none focus:border-primary font-mono text-xs resize-none"
          />
        </div>
        <div>
          <div className="flex justify-between items-baseline">
            <label className="text-[11px] text-muted-foreground">Amount</label>
            <button type="button" onClick={() => setAmount(String(balance))} className="text-[11px] text-primary">
              Max: {balance.toFixed(4)} {token.symbol}
            </button>
          </div>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="mt-1 w-full h-12 px-3 rounded-2xl bg-surface border border-border outline-none focus:border-primary text-base"
          />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground">Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            className="mt-1 w-full h-12 px-3 rounded-2xl bg-surface border border-border outline-none focus:border-primary text-sm"
          />
        </div>
        <div className="flex-1" />
        <button
          type="submit"
          disabled={mut.isPending}
          className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
        >
          {mut.isPending ? "Sending…" : `Send ${token.symbol}`}
        </button>
      </form>
    </PageShell>
  );
}
