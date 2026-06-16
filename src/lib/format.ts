import type { NetworkCode } from "./networks";

export function fmt(n: number, max = 4): string {
  if (!isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: max });
}

export function fmtUsd(n: number, max = 2): string {
  if (!isFinite(n)) return "$0.00";
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: max });
}

export function shortAddr(a: string, head = 6, tail = 6): string {
  if (!a) return "";
  if (a.length <= head + tail + 3) return a;
  return `${a.slice(0, head)}...${a.slice(-tail)}`;
}

// Simulated typical network fees in native units (demo wallet)
export const NETWORK_FEE_NATIVE: Record<NetworkCode, number> = {
  BTC: 0.00005,
  ETH: 0.00021,
  SOL: 0.000005,
  BNB: 0.0000095,
  TRX: 1,
  LTC: 0.0001,
  DOGE: 1,
  AVAX: 0.001,
  ADA: 0.17,
};

export const NETWORK_NATIVE_SYMBOL: Record<NetworkCode, string> = {
  BTC: "BTC", ETH: "ETH", SOL: "SOL", BNB: "BNB", TRX: "TRX",
  LTC: "LTC", DOGE: "DOGE", AVAX: "AVAX", ADA: "ADA",
};
