import type { Token } from "@/lib/networks";

export function TokenIcon({ token, size = 40 }: { token: Pick<Token, "symbol" | "color" | "network">; size?: number }) {
  const letter = token.symbol.slice(0, 1);
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0 relative"
      style={{ width: size, height: size, background: token.color, fontSize: size * 0.4 }}
    >
      {letter}
      {token.symbol !== token.network && (
        <span
          className="absolute -bottom-0.5 -right-0.5 rounded-full text-white text-[8px] font-bold flex items-center justify-center border-2 border-background"
          style={{ width: size * 0.42, height: size * 0.42, background: networkColor(token.network) }}
        >
          {token.network.slice(0, 1)}
        </span>
      )}
    </div>
  );
}

function networkColor(net: string): string {
  const m: Record<string, string> = {
    BTC: "#f7931a", ETH: "#627eea", SOL: "#9945ff", BNB: "#f3ba2f", TRX: "#ff060a",
    LTC: "#a6a9aa", DOGE: "#c3a634", AVAX: "#e84142", ADA: "#0033ad",
  };
  return m[net] ?? "#666";
}
