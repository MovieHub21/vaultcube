import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyWallet, getMyTransactions, demoFund, getWatchlist, toggleWatchlist } from "@/lib/wallet.functions";
import { PageShell } from "@/components/PageShell";
import { BottomNav } from "@/components/BottomNav";
import { TOKENS, tokenKey } from "@/lib/networks";
import { ArrowUp, ArrowDown, Plus, Settings, Search, ScanLine, RotateCw, Star } from "lucide-react";
import { toast } from "sonner";
import { TokenIcon } from "@/components/TokenIcon";
import { useMemo, useState } from "react";
import { coingeckoId, fetchMarkets, formatPct } from "@/lib/coingecko";
import { QrScanModal } from "@/components/QrScanModal";
import { fmt, fmtUsd } from "@/lib/format";


export const Route = createFileRoute("/_authenticated/home")({
  component: Home,
  head: () => ({ meta: [{ title: "Wallet — Vaultcube" }] }),
});

type Tab = "Crypto" | "Watchlist" | "NFTs";

function Home() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchWallet = useServerFn(getMyWallet);
  const fetchTx = useServerFn(getMyTransactions);
  const fund = useServerFn(demoFund);
  const getWl = useServerFn(getWatchlist);
  const toggleWl = useServerFn(toggleWatchlist);
  const [tab, setTab] = useState<Tab>("Crypto");
  const [scanOpen, setScanOpen] = useState(false);

  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: () => fetchWallet() });
  useQuery({ queryKey: ["transactions"], queryFn: () => fetchTx() });
  const { data: watchlist = [] } = useQuery({ queryKey: ["watchlist"], queryFn: () => getWl() });

  const allIds = useMemo(() => {
    const ids = new Set<string>();
    TOKENS.forEach((t) => { const id = coingeckoId(t.symbol, t.network); if (id) ids.add(id); });
    watchlist.forEach((id) => ids.add(id));
    return Array.from(ids);
  }, [watchlist]);

  const { data: markets } = useQuery({
    queryKey: ["markets", allIds.join(",")],
    queryFn: () => fetchMarkets(allIds, { perPage: 100, sparkline: false }),
    refetchInterval: 60_000,
    enabled: allIds.length > 0,
  });
  const priceMap = useMemo(() => {
    const m = new Map<string, { price: number; change: number | null; image: string }>();
    (markets ?? []).forEach((c) => m.set(c.id, { price: c.current_price, change: c.price_change_percentage_24h, image: c.image }));
    return m;
  }, [markets]);

  const balances = wallet?.balances ?? [];
  const held = TOKENS.map((t) => {
    const b = balances.find((x) => x.network === t.network && x.token === t.symbol);
    const amount = Number(b?.amount ?? 0);
    const id = coingeckoId(t.symbol, t.network);
    const live = id ? priceMap.get(id) : undefined;
    const price = live?.price ?? t.priceUsd;
    return { ...t, amount, price, change: live?.change ?? 0, image: live?.image, coingecko: id, usd: amount * price };
  });
  const total = held.reduce((s, h) => s + h.usd, 0);
  const totalPrev = held.reduce((s, h) => s + (h.change ? h.usd / (1 + h.change / 100) : h.usd), 0);
  const totalChangeUsd = total - totalPrev;
  const totalChangePct = totalPrev > 0 ? (totalChangeUsd / totalPrev) * 100 : 0;


  const cryptoList = [...held].sort((a, b) => {
    if (a.amount > 0 && b.amount === 0) return -1;
    if (b.amount > 0 && a.amount === 0) return 1;
    if (a.amount !== b.amount) return b.usd - a.usd;
    return (b.popular ? 1 : 0) - (a.popular ? 1 : 0);
  });

  const watchSet = new Set(watchlist);
  const watchedList = held.filter((h) => h.coingecko && watchSet.has(h.coingecko));

  const wlMut = useMutation({
    mutationFn: (coinId: string) => toggleWl({ data: { coinId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function onBuy() {
    toast.info("Buy is coming soon");
  }


  function handleScan({ address, network }: { address: string; network: string | null }) {
    setScanOpen(false);
    if (!network) {
      toast.error("Couldn't detect a coin network from that QR code");
      return;
    }
    navigate({ to: "/send", search: { address, network } as any });
  }

  return (
    <PageShell className="pb-28">
      <header className="flex items-center gap-2">
        <Link to="/settings" className="p-2 rounded-full bg-surface-elevated">
          <Settings className="w-4 h-4" />
        </Link>
        <div className="flex-1 h-10 rounded-full bg-surface-elevated flex items-center px-3 text-muted-foreground text-sm gap-2">
          <Search className="w-4 h-4" /> Search
        </div>
        <button onClick={() => setScanOpen(true)} className="p-2 rounded-full bg-surface-elevated" aria-label="Scan QR">
          <ScanLine className="w-4 h-4" />
        </button>
      </header>

      <div className="mt-7 flex flex-col items-center">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated text-sm font-medium relative">
          {wallet?.profile?.display_name ?? "Main Wallet"} ›
        </div>
        <div className="mt-5 text-5xl font-bold tracking-tight">{fmtUsd(total)}</div>
        <div className={`text-xs mt-1 ${totalChangeUsd >= 0 ? "text-primary" : "text-destructive"}`}>
          {totalChangeUsd >= 0 ? "+" : "-"}{fmtUsd(Math.abs(totalChangeUsd))} ({formatPct(totalChangePct)})
        </div>

      </div>

      <div className="mt-6 grid grid-cols-4 gap-2">
        <ActionTile icon={<ArrowUp className="w-5 h-5" />} label="Send" onClick={() => navigate({ to: "/send" })} />
        <ActionTile icon={<ArrowDown className="w-5 h-5" />} label="Receive" onClick={() => navigate({ to: "/receive" })} />
        <ActionTile icon={<RotateCw className="w-5 h-5" />} label="Swap" onClick={() => navigate({ to: "/swap" })} />
        <ActionTile icon={<Plus className="w-5 h-5" />} label="Buy" highlight onClick={onBuy} />
      </div>

      <div className="mt-6 rounded-2xl bg-surface p-3 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-2xl shrink-0">🏆</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight">Win 10,000 USDT — Trade Tournament</div>
          <Link to="/markets" className="text-primary text-xs font-medium mt-1 inline-flex items-center gap-1">Dive in →</Link>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-5 border-b border-border">
        {(["Crypto", "Watchlist", "NFTs"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-base font-semibold relative ${tab === t ? "text-foreground" : "text-muted-foreground"}`}
          >
            {t}
            {tab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      <div className="mt-2">
        {tab === "Crypto" && (
          <CoinList items={cryptoList} watchlist={watchSet} onStar={(id) => wlMut.mutate(id)} navigate={navigate} />
        )}
        {tab === "Watchlist" && (
          watchedList.length === 0 ? (
            <EmptyState text="Tap the ★ on Markets or a coin to add to your watchlist." />
          ) : (
            <CoinList items={watchedList} watchlist={watchSet} onStar={(id) => wlMut.mutate(id)} navigate={navigate} />
          )
        )}
        {tab === "NFTs" && <EmptyState text="No NFTs yet." />}
      </div>

      <BottomNav />
      {scanOpen && <QrScanModal onClose={() => setScanOpen(false)} onResult={handleScan} />}
    </PageShell>
  );
}

function ActionTile({ icon, label, onClick, highlight }: { icon: React.ReactNode; label: string; onClick?: () => void; highlight?: boolean }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${highlight ? "bg-primary text-primary-foreground" : "bg-surface-elevated"}`}>
        {icon}
      </div>
      <span className="text-xs">{label}</span>
    </button>
  );
}

type CoinItem = (typeof TOKENS)[number] & { amount: number; price: number; change: number; usd: number; image?: string; coingecko?: string };

function CoinList({ items, watchlist, onStar, navigate }: {
  items: CoinItem[];
  watchlist: Set<string>;
  onStar: (id: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  if (items.length === 0) return <EmptyState text="No assets" />;
  return (
    <div className="divide-y divide-border">
      {items.map((h) => {
        const starred = h.coingecko ? watchlist.has(h.coingecko) : false;
        return (
          <button
            key={tokenKey(h)}
            onClick={() => h.coingecko && navigate({ to: "/coin/$id", params: { id: h.coingecko } })}
            className="w-full flex items-center gap-3 py-3 text-left"
          >
            {h.image ? (
              <img src={h.image} alt={h.symbol} className="w-10 h-10 rounded-full shrink-0" />
            ) : (
              <TokenIcon token={h} size={40} />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-base font-bold truncate">{h.symbol}</span>
                <span className="text-[10px] text-muted-foreground bg-surface-elevated px-1.5 py-0.5 rounded-md whitespace-nowrap">{h.chainLabel}</span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span>${h.price < 1 ? h.price.toPrecision(3) : h.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                <span className={h.change >= 0 ? "text-primary" : "text-destructive"}>{formatPct(h.change)}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold">{h.amount > 0 ? fmtUsd(h.usd) : "$0.00"}</div>
              <div className="text-xs text-muted-foreground">{fmt(h.amount, 4)} {h.symbol}</div>
            </div>


            {h.coingecko && (
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); onStar(h.coingecko!); }}
                className="p-1.5 ml-1"
              >
                <Star className={`w-4 h-4 ${starred ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="py-12 text-center text-xs text-muted-foreground">{text}</div>;
}
