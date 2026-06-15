export type NetworkCode = "BTC" | "ETH" | "SOL" | "BNB" | "TRX" | "LTC" | "DOGE" | "AVAX" | "ADA";

export const NETWORKS: { code: NetworkCode; name: string; symbol: string; color: string; emoji: string }[] = [
  { code: "BTC", name: "Bitcoin", symbol: "BTC", color: "#f7931a", emoji: "₿" },
  { code: "ETH", name: "Ethereum", symbol: "ETH", color: "#627eea", emoji: "Ξ" },
  { code: "SOL", name: "Solana", symbol: "SOL", color: "#14f195", emoji: "◎" },
  { code: "BNB", name: "BNB Chain", symbol: "BNB", color: "#f3ba2f", emoji: "B" },
  { code: "TRX", name: "Tron", symbol: "TRX", color: "#ff060a", emoji: "T" },
  { code: "LTC", name: "Litecoin", symbol: "LTC", color: "#a6a9aa", emoji: "Ł" },
  { code: "DOGE", name: "Dogecoin", symbol: "DOGE", color: "#c3a634", emoji: "Ð" },
  { code: "AVAX", name: "Avalanche", symbol: "AVAX", color: "#e84142", emoji: "A" },
  { code: "ADA", name: "Cardano", symbol: "ADA", color: "#0033ad", emoji: "₳" },
];

export const NETWORK_BY_CODE = Object.fromEntries(NETWORKS.map((n) => [n.code, n])) as Record<NetworkCode, (typeof NETWORKS)[number]>;
