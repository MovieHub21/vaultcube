import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyWallet } from "@/lib/wallet.functions";
import { PageShell } from "@/components/PageShell";
import { TokenIcon } from "@/components/TokenIcon";
import { NETWORKS, TOKENS, tokenKey, type NetworkCode, type Token } from "@/lib/networks";
import { useMemo, useState } from "react";
import { ArrowLeft, Search, Copy, QrCode, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/receive")({
  component: Receive,
  head: () => ({ meta: [{ title: "Receive — Vaultcube" }] }),
});

function Receive() {
  const fetchWallet = useServerFn(getMyWallet);
  const { data } = useQuery({ queryKey: ["wallet"], queryFn: () => fetchWallet() });
  const [filter, setFilter] = useState<"ALL" | NetworkCode>("ALL");
  const [q, setQ] = useState("");
  const [qr, setQr] = useState<{ token: Token; address: string } | null>(null);

  const addrByNet = useMemo(() => {
    const m = new Map<string, string>();
    (data?.addresses ?? []).forEach((a) => m.set(a.network, a.address));
    return m;
  }, [data]);

  const list = useMemo(() => {
    return TOKENS.filter((t) => {
      if (filter !== "ALL" && t.network !== filter) return false;
      if (q && !`${t.symbol} ${t.name} ${t.chainLabel}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [filter, q]);

  const popular = list.filter((t) => t.popular);
  const others = list.filter((t) => !t.popular);

  async function copy(addr: string) {
    await navigator.clipboard.writeText(addr);
    toast.success("Address copied");
  }

  return (
    <PageShell className="pb-8">
      <header className="grid grid-cols-[auto_1fr_auto] items-center mb-4">
        <Link to="/home" className="p-1.5 -ml-1.5"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-base font-semibold text-center">Receive</h1>
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

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 mt-3 no-scrollbar">
        <button
          onClick={() => setFilter("ALL")}
          className={`shrink-0 h-11 px-4 rounded-xl border-2 text-sm font-semibold ${filter === "ALL" ? "border-primary text-primary" : "border-border"}`}
        >All</button>
        {NETWORKS.map((n) => (
          <button
            key={n.code}
            onClick={() => setFilter(n.code)}
            className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-sm border-2 ${filter === n.code ? "border-primary" : "border-transparent"}`}
            style={{ background: n.color }}
          >{n.emoji}</button>
        ))}
      </div>

      {popular.length > 0 && (
        <>
          <div className="mt-4 text-xs text-muted-foreground">Popular</div>
          <TokenList tokens={popular} addrByNet={addrByNet} onQr={(t, a) => setQr({ token: t, address: a })} onCopy={copy} />
        </>
      )}
      {others.length > 0 && (
        <>
          <div className="mt-4 text-xs text-muted-foreground">All crypto</div>
          <TokenList tokens={others} addrByNet={addrByNet} onQr={(t, a) => setQr({ token: t, address: a })} onCopy={copy} />
        </>
      )}

      {qr && <QrModal token={qr.token} address={qr.address} onClose={() => setQr(null)} onCopy={copy} />}
    </PageShell>
  );
}

function TokenList({
  tokens,
  addrByNet,
  onQr,
  onCopy,
}: {
  tokens: Token[];
  addrByNet: Map<string, string>;
  onQr: (t: Token, a: string) => void;
  onCopy: (a: string) => void;
}) {
  return (
    <div className="mt-1">
      {tokens.map((t) => {
        const addr = addrByNet.get(t.network) ?? "";
        const short = addr ? `${addr.slice(0, 7)}...${addr.slice(-7)}` : "—";
        return (
          <div key={tokenKey(t)} className="flex items-center gap-3 py-2.5">
            <TokenIcon token={t} size={38} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold flex items-center gap-1.5">
                {t.symbol}
                <span className="text-[10px] text-muted-foreground bg-surface-elevated px-1.5 py-0.5 rounded-md">{t.chainLabel}</span>
              </div>
              <div className="text-[11px] text-muted-foreground font-mono">{short}</div>
            </div>
            <button onClick={() => onQr(t, addr)} className="w-9 h-9 rounded-full bg-surface-elevated flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </button>
            <button onClick={() => onCopy(addr)} className="w-9 h-9 rounded-full bg-surface-elevated flex items-center justify-center">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function QrModal({ token, address, onClose, onCopy }: { token: Token; address: string; onClose: () => void; onCopy: (a: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background w-full max-w-md rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TokenIcon token={token} size={32} />
            <div>
              <div className="text-sm font-semibold">{token.symbol}</div>
              <div className="text-[11px] text-muted-foreground">{token.chainLabel}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2"><X className="w-4 h-4" /></button>
        </div>
        <div className="mt-4 flex flex-col items-center">
          <div className="bg-white p-4 rounded-2xl"><QRCodeSVG value={address} size={200} /></div>
          <div className="mt-3 font-mono text-xs text-center break-all">{address}</div>
          <button onClick={() => onCopy(address)} className="mt-4 h-11 px-5 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2">
            <Copy className="w-4 h-4" /> Copy address
          </button>
          <p className="text-[11px] text-muted-foreground text-center mt-3">
            Only send {token.symbol} on the {token.chainLabel} network. Other assets may be lost.
          </p>
        </div>
      </div>
    </div>
  );
}
