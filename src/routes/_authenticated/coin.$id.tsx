import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { fetchCoinChart, fetchCoinDetail, formatPct, formatUsd } from "@/lib/coingecko";
import { getWatchlist, toggleWatchlist, getMyWallet } from "@/lib/wallet.functions";
import { ArrowLeft, Star, ArrowUp, QrCode, RefreshCw, ChevronRight, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TOKENS } from "@/lib/networks";
import { coingeckoId } from "@/lib/coingecko";

export const Route = createFileRoute("/_authenticated/coin/$id")({
  component: CoinDetail,
});

const RANGES = [
  { label: "LIVE", days: "1" },
  { label: "1H", days: "0.04" },
  { label: "1D", days: "1" },
  { label: "1W", days: "7" },
  { label: "1M", days: "30" },
  { label: "1Y", days: "365" },
] as const;

function CoinDetail() {
  const { id } = useParams({ from: "/_authenticated/coin/$id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[3]);
  const [view, setView] = useState<"chart" | "stats">("chart");

  const getWl = useServerFn(getWatchlist);
  const toggleWl = useServerFn(toggleWatchlist);
  const fetchWallet = useServerFn(getMyWallet);

  const { data: coin } = useQuery({ queryKey: ["coin", id], queryFn: () => fetchCoinDetail(id) });
  const { data: chart } = useQuery({ queryKey: ["coin-chart", id, range.days], queryFn: () => fetchCoinChart(id, range.days) });
  const { data: watchlist = [] } = useQuery({ queryKey: ["watchlist"], queryFn: () => getWl() });
  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: () => fetchWallet() });

  const starred = watchlist.includes(id);

  // Find matching local token to compute balance
  const token = TOKENS.find((t) => coingeckoId(t.symbol, t.network) === id);
  const balance = token ? Number((wallet?.balances ?? []).find((b) => b.network === token.network && b.token === token.symbol)?.amount ?? 0) : 0;

  const wlMut = useMutation({
    mutationFn: () => toggleWl({ data: { coinId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const pathD = useMemo(() => {
    const prices = chart?.prices ?? [];
    if (prices.length < 2) return "";
    const ys = prices.map((p) => p[1]);
    const min = Math.min(...ys), max = Math.max(...ys);
    const w = 360, h = 180;
    return prices.map(([, y], i) => {
      const x = (i / (prices.length - 1)) * w;
      const ny = h - ((y - min) / (max - min || 1)) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${ny.toFixed(2)}`;
    }).join(" ");
  }, [chart]);

  const change = coin?.price_change_percentage_24h ?? 0;
  const up = change >= 0;
  const stroke = up ? "rgb(74, 222, 128)" : "rgb(239, 68, 68)";

  return (
    <PageShell className="pb-28">
      <header className="flex items-center justify-between mb-4">
        <button onClick={() => navigate({ to: "/markets" })} className="p-1.5 -ml-1.5"><ArrowLeft className="w-5 h-5" /></button>
        <button onClick={() => wlMut.mutate()}>
          <Star className={`w-6 h-6 ${starred ? "fill-primary text-primary" : "text-muted-foreground"}`} />
        </button>
      </header>

      <div className="flex items-start gap-3">
        {coin?.image && <img src={coin.image} alt={coin.symbol} className="w-12 h-12 rounded-full" />}
        <div className="flex-1 min-w-0">
          <div className="text-xl font-bold uppercase">{coin?.symbol}</div>
          <div className="text-sm text-muted-foreground truncate">{coin?.name}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold">{coin ? formatUsd(coin.current_price) : "…"}</div>
          <div className={`text-sm ${up ? "text-primary" : "text-destructive"}`}>{formatPct(change)}</div>
        </div>
      </div>

      {view === "chart" ? (
        <>
          <div className="mt-6 -mx-2">
            <svg viewBox="0 0 360 180" className="w-full h-44">
              <path d={pathD} fill="none" stroke={stroke} strokeWidth={2} />
            </svg>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            {RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => setRange(r)}
                className={`h-8 px-3 rounded-full font-semibold ${range.label === r.label ? "bg-surface-elevated" : "text-muted-foreground"}`}
              >{r.label}</button>
            ))}
          </div>
        </>
      ) : null}

      <div className="mt-6 flex items-center justify-between">
        <div className="text-base font-bold">Your balance</div>
        <div className="text-right">
          <div className="text-base font-bold">${(balance * (coin?.current_price ?? 0)).toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">{balance.toFixed(4)} {coin?.symbol?.toUpperCase()}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => navigate({ to: "/send" })} className="h-11 rounded-full bg-surface-elevated text-sm font-semibold flex items-center justify-center gap-2">
          <ArrowUp className="w-4 h-4" /> Send
        </button>
        <button onClick={() => navigate({ to: "/receive" })} className="h-11 rounded-full bg-surface-elevated text-sm font-semibold flex items-center justify-center gap-2">
          <QrCode className="w-4 h-4" /> Receive
        </button>
      </div>

      <button onClick={() => navigate({ to: "/history" })} className="mt-5 flex items-center text-base font-bold">
        Recent history <ChevronRight className="w-4 h-4 ml-1" />
      </button>

      <button onClick={() => setView(view === "stats" ? "chart" : "stats")} className="mt-6 text-left text-base font-bold">
        Stats {view === "stats" ? "(hide)" : ""}
      </button>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
        <Stat label="Market Cap" value={formatUsd(coin?.market_cap)} />
        <Stat label="24h Volume" value={formatUsd(coin?.total_volume)} />
        <Stat label="Rank" value={coin?.market_cap_rank ? `#${coin.market_cap_rank}` : "—"} />
        <Stat label="All-time High" value={formatUsd(coin?.ath)} />
        <Stat label="Circulating" value={coin?.circulating_supply ? `${(coin.circulating_supply / 1e6).toFixed(2)}M` : "—"} />
        <Stat label="FDV" value={formatUsd(coin?.fully_diluted_valuation)} />
      </div>

      {view === "stats" && coin?.links && (
        <>
          <div className="mt-6 text-base font-bold">About</div>
          <div className="mt-3 flex gap-2 flex-wrap">
            {coin.links.homepage?.[0] && <LinkChip href={coin.links.homepage[0]} label="Website" />}
            {coin.links.twitter_screen_name && <LinkChip href={`https://x.com/${coin.links.twitter_screen_name}`} label="X" />}
            {coin.links.subreddit_url && <LinkChip href={coin.links.subreddit_url} label="Reddit" />}
            {coin.links.whitepaper && <LinkChip href={coin.links.whitepaper} label="Whitepaper" />}
          </div>
        </>
      )}

      <div className="fixed inset-x-0 safe-bottom-nav z-30 px-5">
        <div className="max-w-md mx-auto">
          <button onClick={() => navigate({ to: "/swap" })} className="w-full h-14 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> Trade
          </button>
        </div>
      </div>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold">{value ?? "—"}</div>
    </div>
  );
}

function LinkChip({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="h-9 px-3 rounded-full bg-surface-elevated text-xs font-semibold flex items-center gap-1.5">
      <ExternalLink className="w-3 h-3" /> {label}
    </a>
  );
}
