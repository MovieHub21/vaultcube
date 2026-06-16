import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyWallet, sendFunds } from "@/lib/wallet.functions";
import { PageShell } from "@/components/PageShell";
import { TokenIcon } from "@/components/TokenIcon";
import { NETWORKS, TOKENS, tokenKey, type NetworkCode, type Token } from "@/lib/networks";
import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Search, FileSearch, ScanLine, Check } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { fmt, fmtUsd, shortAddr, NETWORK_FEE_NATIVE, NETWORK_NATIVE_SYMBOL } from "@/lib/format";
import { hasPasscode, verifyPasscode } from "@/lib/passcode";
import { QrScanModal, detectNetwork } from "@/components/QrScanModal";

const SendSearch = z.object({
  address: z.string().optional(),
  network: z.string().optional(),
  token: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/send")({
  component: Send,
  validateSearch: (s) => SendSearch.parse(s),
  head: () => ({ meta: [{ title: "Send — Vaultcube" }] }),
});

function Send() {
  const search = useSearch({ from: "/_authenticated/send" });
  const fetchWallet = useServerFn(getMyWallet);
  const { data } = useQuery({ queryKey: ["wallet"], queryFn: () => fetchWallet() });

  const [filter, setFilter] = useState<"ALL" | NetworkCode>((search.network as NetworkCode) ?? "ALL");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Token | null>(() => {
    if (search.token && search.network) {
      return TOKENS.find((t) => t.symbol === search.token && t.network === search.network) ?? null;
    }
    return null;
  });

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

  const myAddress = useMemo(() => {
    if (!picked) return "";
    return data?.addresses.find((a) => a.network === picked.network)?.address ?? "";
  }, [picked, data]);

  if (picked) {
    return (
      <SendFlow
        token={picked}
        balance={held.find((h) => tokenKey(h) === tokenKey(picked))?.amount ?? 0}
        myAddress={myAddress}
        prefillAddress={search.address}
        onBack={() => setPicked(null)}
      />
    );
  }

  return (
    <PageShell>
      <header className="grid grid-cols-[auto_1fr_auto] items-center mb-4">
        <Link to="/home" className="p-1.5 -ml-1.5"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-base font-semibold text-center">Send</h1>
        <span className="w-7" />
      </header>

      {search.address && (
        <div className="rounded-2xl bg-primary/10 border border-primary/30 p-3 mb-3">
          <div className="text-[11px] text-primary font-semibold uppercase tracking-wide">Scanned address</div>
          <div className="text-xs font-mono break-all mt-1">{search.address}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Pick the asset you want to send.</div>
        </div>
      )}

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-full h-10 pl-9 pr-3 rounded-full bg-surface-elevated outline-none" />
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
            <button key={tokenKey(t)} onClick={() => setPicked(t)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-surface-elevated">
              <TokenIcon token={t} size={38} />
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  {t.symbol}
                  <span className="text-[10px] text-muted-foreground bg-surface-elevated px-1.5 py-0.5 rounded-md">{t.chainLabel}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{t.name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{fmt(t.amount, 4)}</div>
                <div className="text-[11px] text-muted-foreground">{fmtUsd(t.amount * t.priceUsd)}</div>
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
        <button key={n.code} onClick={() => onChange(n.code)} className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-sm border-2 ${value === n.code ? "border-primary" : "border-transparent"}`} style={{ background: n.color }} title={n.name}>
          {n.emoji}
        </button>
      ))}
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={`shrink-0 h-11 px-4 rounded-xl border-2 text-sm font-semibold ${active ? "border-primary text-primary" : "border-border text-foreground"}`}>
      {label}
    </button>
  );
}

type Stage = "form" | "confirm" | "pin" | "processing" | "success";

function SendFlow({ token, balance, myAddress, onBack, prefillAddress }: { token: Token; balance: number; myAddress: string; onBack: () => void; prefillAddress?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const send = useServerFn(sendFunds);
  const [stage, setStage] = useState<Stage>("form");
  const [to, setTo] = useState(prefillAddress ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);

  const amountNum = parseFloat(amount) || 0;
  const feeNative = NETWORK_FEE_NATIVE[token.network as NetworkCode] ?? 0;
  const nativeSym = NETWORK_NATIVE_SYMBOL[token.network as NetworkCode];
  const nativePrice = TOKENS.find((t) => t.symbol === nativeSym && t.network === token.network)?.priceUsd ?? 0;
  const feeUsd = feeNative * nativePrice;
  const totalUsd = amountNum * token.priceUsd + feeUsd;

  const mut = useMutation({
    mutationFn: () => send({ data: { toAddress: to.trim(), network: token.network, token: token.symbol, amount: amountNum, note: note || undefined } }),
    onSuccess: (res) => {
      setTxId(res.id ?? null);
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setTimeout(() => setStage("success"), 2200);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setStage("form");
    },
  });

  useEffect(() => {
    if (stage === "processing") mut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  if (stage === "processing" || stage === "success") {
    return (
      <ProcessingScreen
        success={stage === "success"}
        onClose={() => {
          if (txId) navigate({ to: "/tx/$id", params: { id: txId } });
          else navigate({ to: "/home" });
        }}
        onDetails={() => txId && navigate({ to: "/tx/$id", params: { id: txId } })}
      />
    );
  }

  if (stage === "pin") {
    return (
      <PinModal
        onCancel={() => setStage("confirm")}
        onSuccess={() => setStage("processing")}
      />
    );
  }

  if (stage === "confirm") {
    return (
      <PageShell>
        <header className="grid grid-cols-[auto_1fr_auto] items-center mb-5">
          <button onClick={() => setStage("form")} className="p-1.5 -ml-1.5"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-base font-semibold text-center">Confirm send</h1>
          <span className="w-7" />
        </header>

        <div className="rounded-2xl bg-surface p-4 flex items-center gap-3 mb-3">
          <TokenIcon token={token} size={44} />
          <div className="min-w-0">
            <div className="text-xl font-bold">{fmtUsd(amountNum * token.priceUsd)}</div>
            <div className="text-xs text-muted-foreground">{fmt(amountNum, 6)} {token.symbol}</div>
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-4 flex flex-col gap-3 mb-3">
          <Row label="From" value={<div className="text-right"><div className="font-semibold">My Wallet</div><div className="text-[11px] text-muted-foreground font-mono">{shortAddr(myAddress)}</div></div>} />
          <Row label="To" value={<span className="font-mono text-xs">{shortAddr(to)}</span>} />
          <Row label="Network" value={<span className="font-semibold">{token.chainLabel}</span>} />
        </div>

        <div className="rounded-2xl bg-surface p-4 mb-3">
          <Row label={<span className="flex items-center gap-1">Network fee</span>} value={
            <div className="text-right">
              <div className="font-semibold">{fmtUsd(feeUsd)}</div>
              <div className="text-[11px] text-muted-foreground">{fmt(feeNative, 8)} {nativeSym}</div>
            </div>
          } />
        </div>

        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-sm text-muted-foreground">Total cost</span>
          <span className="text-base font-bold">{fmtUsd(totalUsd)}</span>
        </div>

        <div className="flex-1" />
        <button
          onClick={() => setStage("pin")}
          className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold"
        >
          Confirm
        </button>
      </PageShell>
    );
  }


  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const a = parseFloat(amount);
    if (!to.trim() || !a || a <= 0) return toast.error("Enter address and amount");
    if (a > balance) return toast.error("Insufficient balance");
    setStage("confirm");
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
          <div className="text-sm font-semibold">{fmt(balance, 4)}</div>
          <div className="text-[11px] text-muted-foreground">{fmtUsd(balance * token.priceUsd)}</div>
        </div>
      </div>

      <form onSubmit={submitForm} className="mt-4 flex flex-col gap-3 flex-1">
        <div>
          <label className="text-[11px] text-muted-foreground">Recipient {token.chainLabel} address</label>
          <div className="relative mt-1">
            <textarea
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Paste address"
              rows={2}
              className="w-full p-3 pr-12 rounded-2xl bg-surface border border-border outline-none focus:border-primary font-mono text-xs resize-none"
            />
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="absolute top-2 right-2 p-2 rounded-xl bg-surface-elevated"
              aria-label="Scan QR"
            >
              <ScanLine className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-baseline">
            <label className="text-[11px] text-muted-foreground">Amount</label>
            <button type="button" onClick={() => setAmount(String(balance))} className="text-[11px] text-primary">Max: {fmt(balance, 4)} {token.symbol}</button>
          </div>
          <input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="mt-1 w-full h-12 px-3 rounded-2xl bg-surface border border-border outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground">Note (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className="mt-1 w-full h-12 px-3 rounded-2xl bg-surface border border-border outline-none focus:border-primary" />
        </div>
        <div className="flex-1" />
        <button type="submit" className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
          Preview
        </button>
      </form>

      {scanOpen && (
        <QrScanModal
          onClose={() => setScanOpen(false)}
          onResult={({ address }) => {
            const detected = detectNetwork(address);
            if (detected && detected !== token.network) {
              toast.error(`That address looks like ${detected}, not ${token.chainLabel}`);
            }
            setTo(address);
            setScanOpen(false);
          }}
        />
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

function PinModal({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const PIN_LEN = 6;

  useEffect(() => {
    if (!hasPasscode()) {
      toast.info("Set a wallet PIN first");
      navigate({ to: "/passcode" });
    }
  }, [navigate]);

  async function check(p: string) {
    if (await verifyPasscode(p)) onSuccess();
    else {
      setErr("Incorrect PIN");
      setPin("");
    }
  }

  function press(d: string) {
    setErr(null);
    const next = (pin + d).slice(0, PIN_LEN);
    setPin(next);
    if (next.length === PIN_LEN) check(next);
  }

  return (
    <PageShell>
      <header className="grid grid-cols-[auto_1fr_auto] items-center mb-8">
        <button onClick={onCancel} className="p-1.5 -ml-1.5"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-base font-semibold text-center">Enter PIN</h1>
        <span className="w-7" />
      </header>
      <div className="flex flex-col items-center flex-1 pt-8">
        <p className="text-sm text-muted-foreground mb-6">Confirm transaction with your wallet PIN</p>
        <div className="flex gap-3 mb-4">
          {Array.from({ length: PIN_LEN }).map((_, i) => (
            <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 ${i < pin.length ? "bg-primary border-primary" : "border-muted-foreground"}`} />
          ))}
        </div>
        {err && <p className="text-destructive text-xs mb-2">{err}</p>}
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs mt-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} onClick={() => press(String(n))} className="h-14 rounded-2xl bg-surface-elevated text-xl font-semibold active:bg-surface">
              {n}
            </button>
          ))}
          <span />
          <button onClick={() => press("0")} className="h-14 rounded-2xl bg-surface-elevated text-xl font-semibold active:bg-surface">0</button>
          <button onClick={() => { setPin(pin.slice(0, -1)); setErr(null); }} className="h-14 rounded-2xl text-sm">Del</button>
        </div>
      </div>
    </PageShell>
  );
}

function ProcessingScreen({ success, onClose, onDetails }: { success: boolean; onClose: () => void; onDetails: () => void }) {
  return (
    <PageShell>
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 ${success ? "bg-primary/20" : "bg-primary/10"}`}>
          {success ? (
            <Check className="w-16 h-16 text-primary" strokeWidth={3} />
          ) : (
            <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          )}
        </div>
        <h2 className="text-2xl font-bold mb-2">{success ? "Sent!" : "Processing…"}</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          {success
            ? "Your transaction was sent successfully."
            : "Transaction in progress! Blockchain validation is underway. This may take a few seconds."}
        </p>
      </div>
      {success && (
        <div className="flex flex-col gap-2 mb-3">
          <button onClick={onDetails} className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold">Transaction details</button>
          <button onClick={onClose} className="w-full h-12 rounded-full text-sm">Done</button>
        </div>
      )}
    </PageShell>
  );
}
