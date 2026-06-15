export type NetworkCode = "BTC" | "ETH" | "SOL" | "BNB" | "TRX" | "LTC" | "DOGE" | "AVAX" | "ADA";

export const NETWORKS: { code: NetworkCode; name: string; color: string; emoji: string }[] = [
  { code: "BTC", name: "Bitcoin", color: "#f7931a", emoji: "₿" },
  { code: "ETH", name: "Ethereum", color: "#627eea", emoji: "Ξ" },
  { code: "SOL", name: "Solana", color: "#9945ff", emoji: "◎" },
  { code: "BNB", name: "BNB Chain", color: "#f3ba2f", emoji: "B" },
  { code: "TRX", name: "Tron", color: "#ff060a", emoji: "T" },
  { code: "LTC", name: "Litecoin", color: "#a6a9aa", emoji: "Ł" },
  { code: "DOGE", name: "Dogecoin", color: "#c3a634", emoji: "Ð" },
  { code: "AVAX", name: "Avalanche", color: "#e84142", emoji: "A" },
  { code: "ADA", name: "Cardano", color: "#0033ad", emoji: "₳" },
];

export const NETWORK_BY_CODE = Object.fromEntries(NETWORKS.map((n) => [n.code, n])) as Record<NetworkCode, (typeof NETWORKS)[number]>;

// Tokens — many tokens can share a single network address (real-wallet behavior)
export type Token = {
  symbol: string;        // e.g. USDT
  name: string;          // e.g. Tether USD
  network: NetworkCode;  // which chain it lives on
  chainLabel: string;    // display label e.g. "BNB Smart Chain"
  color: string;
  priceUsd: number;
  popular?: boolean;
};

export const TOKENS: Token[] = [
  // Native
  { symbol: "BTC", name: "Bitcoin", network: "BTC", chainLabel: "Bitcoin", color: "#f7931a", priceUsd: 65000, popular: true },
  { symbol: "ETH", name: "Ethereum", network: "ETH", chainLabel: "Ethereum", color: "#627eea", priceUsd: 3200, popular: true },
  { symbol: "SOL", name: "Solana", network: "SOL", chainLabel: "Solana", color: "#9945ff", priceUsd: 145, popular: true },
  { symbol: "BNB", name: "BNB", network: "BNB", chainLabel: "BNB Smart Chain", color: "#f3ba2f", priceUsd: 580, popular: true },
  { symbol: "TRX", name: "Tron", network: "TRX", chainLabel: "Tron", color: "#ff060a", priceUsd: 0.12 },
  { symbol: "LTC", name: "Litecoin", network: "LTC", chainLabel: "Litecoin", color: "#a6a9aa", priceUsd: 75 },
  { symbol: "DOGE", name: "Dogecoin", network: "DOGE", chainLabel: "Dogecoin", color: "#c3a634", priceUsd: 0.16 },
  { symbol: "AVAX", name: "Avalanche", network: "AVAX", chainLabel: "Avalanche", color: "#e84142", priceUsd: 35 },
  { symbol: "ADA", name: "Cardano", network: "ADA", chainLabel: "Cardano", color: "#0033ad", priceUsd: 0.42 },

  // Stablecoins / popular tokens — share the chain's address
  { symbol: "USDT", name: "Tether USD", network: "ETH", chainLabel: "Ethereum", color: "#26a17b", priceUsd: 1, popular: true },
  { symbol: "USDT", name: "Tether USD", network: "BNB", chainLabel: "BNB Smart Chain", color: "#26a17b", priceUsd: 1, popular: true },
  { symbol: "USDT", name: "Tether USD", network: "TRX", chainLabel: "Tron", color: "#26a17b", priceUsd: 1, popular: true },
  { symbol: "USDC", name: "USD Coin", network: "ETH", chainLabel: "Ethereum", color: "#2775ca", priceUsd: 1, popular: true },
  { symbol: "USDC", name: "USD Coin", network: "SOL", chainLabel: "Solana", color: "#2775ca", priceUsd: 1 },
  { symbol: "USDC", name: "USD Coin", network: "AVAX", chainLabel: "Avalanche", color: "#2775ca", priceUsd: 1 },
  { symbol: "DAI", name: "Dai", network: "ETH", chainLabel: "Ethereum", color: "#f5ac37", priceUsd: 1 },
  { symbol: "BUSD", name: "Binance USD", network: "BNB", chainLabel: "BNB Smart Chain", color: "#f0b90b", priceUsd: 1 },
  { symbol: "SHIB", name: "Shiba Inu", network: "ETH", chainLabel: "Ethereum", color: "#ffa409", priceUsd: 0.000025 },
  { symbol: "LINK", name: "Chainlink", network: "ETH", chainLabel: "Ethereum", color: "#2a5ada", priceUsd: 14 },
  { symbol: "UNI", name: "Uniswap", network: "ETH", chainLabel: "Ethereum", color: "#ff007a", priceUsd: 9 },
  { symbol: "PEPE", name: "Pepe", network: "ETH", chainLabel: "Ethereum", color: "#41a14b", priceUsd: 0.0000085 },
  { symbol: "MATIC", name: "Polygon", network: "ETH", chainLabel: "Ethereum", color: "#8247e5", priceUsd: 0.7 },
  { symbol: "CAKE", name: "PancakeSwap", network: "BNB", chainLabel: "BNB Smart Chain", color: "#d1884f", priceUsd: 2.3 },
  { symbol: "TWT", name: "Trust Wallet", network: "BNB", chainLabel: "BNB Smart Chain", color: "#3375bb", priceUsd: 1.2 },
  { symbol: "BONK", name: "Bonk", network: "SOL", chainLabel: "Solana", color: "#ffb800", priceUsd: 0.00002 },
  { symbol: "JUP", name: "Jupiter", network: "SOL", chainLabel: "Solana", color: "#22d1f8", priceUsd: 0.85 },
];

export function tokenKey(t: { symbol: string; network: string }) {
  return `${t.symbol}-${t.network}`;
}
