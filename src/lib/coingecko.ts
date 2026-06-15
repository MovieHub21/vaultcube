// Real market data via CoinGecko public API (no key, CORS enabled)

export type MarketCoin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number | null;
  sparkline_in_7d?: { price: number[] };
  circulating_supply?: number;
  total_supply?: number | null;
  market_cap_rank?: number;
  ath?: number;
  atl?: number;
  fully_diluted_valuation?: number;
};

const BASE = "https://api.coingecko.com/api/v3";

export async function fetchMarkets(ids?: string[], opts?: { perPage?: number; sparkline?: boolean }): Promise<MarketCoin[]> {
  const params = new URLSearchParams({
    vs_currency: "usd",
    order: "market_cap_desc",
    per_page: String(opts?.perPage ?? 50),
    page: "1",
    sparkline: String(opts?.sparkline ?? true),
    price_change_percentage: "24h",
  });
  if (ids && ids.length) params.set("ids", ids.join(","));
  const res = await fetch(`${BASE}/coins/markets?${params.toString()}`);
  if (!res.ok) throw new Error("Market data unavailable");
  return res.json();
}

export async function fetchCoinDetail(id: string): Promise<MarketCoin & { description?: { en: string }; links?: { homepage: string[]; subreddit_url?: string; whitepaper?: string; twitter_screen_name?: string } }> {
  const res = await fetch(`${BASE}/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`);
  if (!res.ok) throw new Error("Coin not found");
  const j = await res.json();
  return {
    id: j.id, symbol: j.symbol, name: j.name, image: j.image?.large,
    current_price: j.market_data?.current_price?.usd,
    market_cap: j.market_data?.market_cap?.usd,
    total_volume: j.market_data?.total_volume?.usd,
    price_change_percentage_24h: j.market_data?.price_change_percentage_24h,
    circulating_supply: j.market_data?.circulating_supply,
    total_supply: j.market_data?.total_supply,
    market_cap_rank: j.market_cap_rank,
    ath: j.market_data?.ath?.usd,
    atl: j.market_data?.atl?.usd,
    fully_diluted_valuation: j.market_data?.fully_diluted_valuation?.usd,
    description: j.description,
    links: j.links,
  };
}

export async function fetchCoinChart(id: string, days: string | number): Promise<{ prices: [number, number][] }> {
  const res = await fetch(`${BASE}/coins/${id}/market_chart?vs_currency=usd&days=${days}`);
  if (!res.ok) throw new Error("Chart unavailable");
  return res.json();
}

// Map our internal token symbol+network to a CoinGecko id
export const COINGECKO_IDS: Record<string, string> = {
  "BTC-BTC": "bitcoin",
  "ETH-ETH": "ethereum",
  "SOL-SOL": "solana",
  "BNB-BNB": "binancecoin",
  "TRX-TRX": "tron",
  "LTC-LTC": "litecoin",
  "DOGE-DOGE": "dogecoin",
  "AVAX-AVAX": "avalanche-2",
  "ADA-ADA": "cardano",
  "USDT-ETH": "tether", "USDT-BNB": "tether", "USDT-TRX": "tether",
  "USDC-ETH": "usd-coin", "USDC-SOL": "usd-coin", "USDC-AVAX": "usd-coin",
  "DAI-ETH": "dai",
  "BUSD-BNB": "binance-usd",
  "SHIB-ETH": "shiba-inu",
  "LINK-ETH": "chainlink",
  "UNI-ETH": "uniswap",
  "PEPE-ETH": "pepe",
  "MATIC-ETH": "matic-network",
  "CAKE-BNB": "pancakeswap-token",
  "TWT-BNB": "trust-wallet-token",
  "BONK-SOL": "bonk",
  "JUP-SOL": "jupiter-exchange-solana",
};

export function coingeckoId(symbol: string, network: string): string | undefined {
  return COINGECKO_IDS[`${symbol}-${network}`];
}

export function formatUsd(n: number | null | undefined): string {
  if (n == null) return "$—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toPrecision(4)}`;
}

export function formatPct(n: number | null | undefined): string {
  if (n == null) return "—";
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}
