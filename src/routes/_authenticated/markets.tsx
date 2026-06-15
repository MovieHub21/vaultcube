import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { BottomNav } from "@/components/BottomNav";
import { fetchMarkets, formatPct, formatUsd } from "@/lib/coingecko";
import { getWatchlist, toggleWatchlist } from "@/lib/wallet.functions";
import { Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/markets")({
  component: Markets,
  head: () => ({ meta: [{ title: "Markets — Vaultcube" }] }),
});

const TABS = ["Hot tokens", "Top Gainers", "Stablecoins", "DeFi"] as const;
type TabKey = typeof TABS[number];

function Markets() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getWl = useServerFn(getWatchlist);
  const toggleWl = useServerFn(toggleWatchlist);
  const [tab, setTab] = useState<TabKey>("Hot tokens");
  const [q, setQ] = useState("");

  const { data: coins = [] } = useQuery({
    queryKey: ["markets-top"],
    queryFn: () => fetchMarkets(undefined, { perPage: 50, sparkline: true }),
    refetchInterval: 60_000,
  });
  const { data: watchlist = [] } = useQuery({ queryKey: ["watchlist"], queryFn: () => getWl() });
  const watchSet = new Set(watchlist);

  const wlMut = useMutation({
    mutationFn: (coinId: string) => toggleWl({ data: { coinId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    let list = coins;
    if (tab === "Top Gainers") list = [...list].sort((a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0));
    if (tab === "Stablecoins") list = list.filter((c) => ["tether", "usd-coin", "dai", "binance-usd"].includes(c.id));
    if (q) list = list.filter((c) => `${c.name} ${c.symbol}`.toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [coins, tab, q]);

  const top3 = coins.slice(0, 3);

  return (
    <PageShell className="pb-28">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center mb-4">
        <span />
        <h1 className="text-lg font-semibold text-center">Markets</h1>
        <button className="justify-self-end p-2"><Search className="w-5 h-5" /></button>
      </header>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search coins"
          className="w-full h-10 pl-9 pr-3 rounded-full bg-surface-elevated text-sm outline-none"
        />
      </div>

      <div className="mt-4">
        <div className="text-sm font-semibold mb-2">Top traded (24h)</div>
        <div className="flex gap-3 overflow-x-auto -mx-5 px-5 no-scrollbar pb-1">
          {top3.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate({ to: "/coin/$id", params: { id: c.id } })}
              className="shrink-0 w-44 p-3 rounded-2xl bg-surface text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground truncate">{c.name}</span>
                <img src={c.image} alt={c.symbol} className="w-5 h-5 rounded-full" />
              </div>
              <div className="text-lg font-bold mt-1">{formatUsd(c.current_price)}</div>
              <div className={`text-xs ${(c.price_change_percentage_24h ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>
                {formatPct(c.price_change_percentage_24h)}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 mt-4 pb-1 no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 h-9 px-4 rounded-full text-xs font-semibold ${tab === t ? "bg-surface-elevated text-foreground" : "text-muted-foreground"}`}
          >{t}</button>
        ))}
      </div>

      <div className="mt-3 divide-y divide-border">
        {filtered.map((c) => {
          const up = (c.price_change_percentage_24h ?? 0) >= 0;
          return (
            <div key={c.id} className="flex items-center gap-3 py-3">
              <button onClick={() => navigate({ to: "/coin/$id", params: { id: c.id } })} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <img src={c.image} alt={c.symbol} className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold uppercase truncate">{c.symbol}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{formatUsd(c.market_cap)} MCap</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{formatUsd(c.current_price)}</div>
                  <div className={`text-xs ${up ? "text-primary" : "text-destructive"}`}>{formatPct(c.price_change_percentage_24h)}</div>
                </div>
              </button>
              <button onClick={() => wlMut.mutate(c.id)} className="p-1.5">
                <Star className={`w-4 h-4 ${watchSet.has(c.id) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="py-10 text-center text-xs text-muted-foreground">Loading markets…</div>}
      </div>

      <BottomNav />
    </PageShell>
  );
}
