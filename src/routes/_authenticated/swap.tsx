import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { getMyWallet, swapTokens } from "@/lib/wallet.functions";
import { TOKENS, tokenKey, type Token } from "@/lib/networks";
import { TokenIcon } from "@/components/TokenIcon";
import { X, ChevronDown, ArrowDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { coingeckoId, fetchMarkets } from "@/lib/coingecko";

export const Route = createFileRoute("/_authenticated/swap")({
  component: Swap,
  head: () => ({ meta: [{ title: "Swap — Vaultcube" }] }),
});

const FEE = 0.1;

function Swap() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchWallet = useServerFn(getMyWallet);
  const swap = useServerFn(swapTokens);

  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: () => fetchWallet() });

  const ids = useMemo(() => Array.from(new Set(TOKENS.map((t) => coingeckoId(t.symbol, t.network)).filter(Boolean))) as string[], []);
  const { data: markets } = useQuery({ queryKey: ["markets", ids.join(",")], queryFn: () => fetchMarkets(ids, { perPage: 100, sparkline: false }), refetchInterval: 60_000 });
  const priceMap = useMemo(() => {
    const m = new Map<string, number>();
    (markets ?? []).forEach((c) => m.set(c.id, c.current_price));
    return m;
  }, [markets]);
  function priceOf(t: Token): number {
    const id = coingeckoId(t.symbol, t.network);
    return (id && priceMap.get(id)) || t.priceUsd;
  }

  const [from, setFrom] = useState<Token>(TOKENS.find((t) => t.symbol === "BNB")!);
  const [to, setTo] = useState<Token | null>(null);
  const [amount, setAmount] = useState("");
  const [picker, setPicker] = useState<null | "from" | "to">(null);
  const [confirming, setConfirming] = useState(false);

  const balanceOf = (t: Token) => {
    const b = (wallet?.balances ?? []).find((x) => x.network === t.network && x.token === t.symbol);
    return Number(b?.amount ?? 0);
  };

  const fromBal = balanceOf(from);
  const a = parseFloat(amount) || 0;
  const fromUsd = a * priceOf(from);
  const feeUsd = fromUsd * FEE;
  const netUsd = fromUsd - feeUsd;
  const toAmount = to ? netUsd / priceOf(to) : 0;

  const mut = useMutation({
    mutationFn: () => {
      if (!to) throw new Error("Select a token");
      if (a <= 0) throw new Error("Enter amount");
      if (a > fromBal) throw new Error(`Insufficient ${from.symbol}`);
      return swap({ data: {
        fromNetwork: from.network, fromToken: from.symbol,
        toNetwork: to.network, toToken: to.symbol,
        fromAmount: a, toAmount,
      }});
    },
    onSuccess: () => {
      toast.success(`Swapped ${a} ${from.symbol} → ${toAmount.toFixed(6)} ${to!.symbol}`);
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setAmount("");
      setConfirming(false);
      navigate({ to: "/home" });
    },
    onError: (e: Error) => { toast.error(e.message); setConfirming(false); },
  });

  function openConfirm() {
    if (!to) return toast.error("Select a destination token");
    if (a <= 0) return toast.error("Enter an amount");
    if (a > fromBal) return toast.error(`Insufficient ${from.symbol}`);
    setConfirming(true);
  }

  return (
    <PageShell className="pb-8">
      <header className="grid grid-cols-[auto_1fr_auto] items-center mb-6">
        <button onClick={() => navigate({ to: "/home" })} className="p-1.5 -ml-1.5"><X className="w-5 h-5" /></button>
        <h1 className="text-base font-semibold text-center">Swap</h1>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">Market <ChevronDown className="w-3 h-3" /></div>
      </header>

      {/* From */}
      <div className="rounded-2xl bg-surface p-4">
        <div className="flex items-center gap-3">
          <input
            type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="flex-1 min-w-0 bg-transparent !text-4xl font-bold outline-none"
            style={{ fontSize: "2.25rem" }}
          />
          <button onClick={() => setPicker("from")} className="flex items-center gap-2 h-10 px-3 rounded-full bg-surface-elevated shrink-0">
            <TokenIcon token={from} size={24} />
            <span className="text-sm font-semibold">{from.symbol}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>${fromUsd.toFixed(2)}</span>
          <button onClick={() => setAmount(String(fromBal))} className="text-primary font-medium">
            Bal: {fromBal.toFixed(4)} • Max
          </button>
        </div>
      </div>

      <div className="flex justify-center -my-2 relative z-10">
        <div className="w-9 h-9 rounded-full bg-background border-4 border-background flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-surface-elevated flex items-center justify-center">
            <ArrowDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* To */}
      <div className="rounded-2xl bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0 text-4xl font-bold text-muted-foreground/60 truncate">
            {to ? toAmount.toFixed(6) : "0"}
          </div>
          {to ? (
            <button onClick={() => setPicker("to")} className="flex items-center gap-2 h-10 px-3 rounded-full bg-surface-elevated shrink-0">
              <TokenIcon token={to} size={24} />
              <span className="text-sm font-semibold">{to.symbol}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => setPicker("to")} className="h-10 px-4 rounded-full bg-primary/15 text-primary text-sm font-bold shrink-0">
              Select token
            </button>
          )}
        </div>
        {to && (
          <div className="mt-2 text-xs text-muted-foreground">
            ${(toAmount * priceOf(to)).toFixed(2)} · 10% fee
          </div>
        )}
      </div>

      <div className="flex-1" />

      <button
        onClick={openConfirm}
        disabled={!to || a <= 0 || a > fromBal}
        className="w-full h-14 rounded-full bg-primary text-primary-foreground font-bold text-base disabled:opacity-40"
      >
        {to ? `Review Swap` : "Select destination token"}
      </button>

      {picker && (
        <TokenPicker
          exclude={picker === "from" ? to : from}
          onPick={(t) => { picker === "from" ? setFrom(t) : setTo(t); setPicker(null); }}
          onClose={() => setPicker(null)}
          balanceOf={balanceOf}
        />
      )}

      {confirming && to && (
        <ConfirmModal
          from={from} to={to} fromAmount={a} toAmount={toAmount}
          fromPrice={priceOf(from)} toPrice={priceOf(to)} feeUsd={feeUsd}
          pending={mut.isPending}
          onClose={() => setConfirming(false)}
          onConfirm={() => mut.mutate()}
        />
      )}
    </PageShell>
  );
}

function ConfirmModal({
  from, to, fromAmount, toAmount, fromPrice, toPrice, feeUsd, pending, onClose, onConfirm,
}: {
  from: Token; to: Token; fromAmount: number; toAmount: number; fromPrice: number; toPrice: number;
  feeUsd: number; pending: boolean; onClose: () => void; onConfirm: () => void;
}) {
  const rate = toAmount / fromAmount;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={onClose}>
      <div className="bg-background w-full max-w-md mx-auto rounded-t-3xl p-5 safe-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Confirm Swap</h2>
          <button onClick={onClose} className="p-2"><X className="w-4 h-4" /></button>
        </div>

        <div className="rounded-2xl bg-surface p-4 flex items-center gap-3">
          <TokenIcon token={from} size={40} />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-muted-foreground">You pay</div>
            <div className="text-lg font-bold">{fromAmount} {from.symbol}</div>
            <div className="text-[11px] text-muted-foreground">{from.chainLabel} · ${(fromAmount * fromPrice).toFixed(2)}</div>
          </div>
        </div>

        <div className="flex justify-center -my-2 relative z-10">
          <div className="w-9 h-9 rounded-full bg-background border-4 border-background flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-surface-elevated flex items-center justify-center">
              <ArrowDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-4 flex items-center gap-3">
          <TokenIcon token={to} size={40} />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-muted-foreground">You receive (est.)</div>
            <div className="text-lg font-bold">{toAmount.toFixed(6)} {to.symbol}</div>
            <div className="text-[11px] text-muted-foreground">{to.chainLabel} · ${(toAmount * toPrice).toFixed(2)}</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-surface-elevated p-4 text-xs space-y-2">
          <Row label="Rate" value={`1 ${from.symbol} ≈ ${rate.toFixed(6)} ${to.symbol}`} />
          <Row label="Network fee (10%)" value={`$${feeUsd.toFixed(2)}`} highlight />
          <Row label="Route" value={`${from.chainLabel} → ${to.chainLabel}`} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={onClose} className="h-12 rounded-full bg-surface-elevated font-semibold text-sm">Back</button>
          <button onClick={onConfirm} disabled={pending} className="h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50">
            {pending ? "Swapping…" : "Confirm Swap"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${highlight ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}

function TokenPicker({ exclude, onPick, onClose, balanceOf }: {
  exclude: Token | null; onPick: (t: Token) => void; onClose: () => void; balanceOf: (t: Token) => number;
}) {
  const [q, setQ] = useState("");
  const list = TOKENS.filter((t) => !exclude || tokenKey(t) !== tokenKey(exclude))
    .filter((t) => !q || `${t.symbol} ${t.name}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={onClose}>
      <div className="bg-background w-full max-w-md mx-auto rounded-t-3xl p-5 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Select token</h2>
          <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-full h-10 pl-9 pr-3 rounded-full bg-surface-elevated outline-none" />
        </div>
        <div className="mt-3 overflow-y-auto divide-y divide-border">
          {list.map((t) => {
            const bal = balanceOf(t);
            return (
              <button key={tokenKey(t)} onClick={() => onPick(t)} className="w-full flex items-center gap-3 py-2.5 text-left">
                <TokenIcon token={t} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{t.symbol}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{t.chainLabel}</div>
                </div>
                {bal > 0 && <div className="text-xs text-muted-foreground">{bal.toFixed(4)}</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
