import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyWallet } from "@/lib/wallet.functions";
import { PageShell } from "@/components/PageShell";
import { NETWORK_BY_CODE, NETWORKS, type NetworkCode } from "@/lib/networks";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/receive")({
  component: Receive,
  head: () => ({ meta: [{ title: "Receive — Vaultcube" }] }),
});

function Receive() {
  const fetchWallet = useServerFn(getMyWallet);
  const { data } = useQuery({ queryKey: ["wallet"], queryFn: () => fetchWallet() });
  const [selected, setSelected] = useState<NetworkCode>("ETH");
  const [copied, setCopied] = useState(false);

  const addr = data?.addresses.find((a) => a.network === selected)?.address ?? "";

  async function copy() {
    await navigator.clipboard.writeText(addr);
    setCopied(true);
    toast.success("Address copied");
    setTimeout(() => setCopied(false), 1500);
  }

  const net = NETWORK_BY_CODE[selected];

  return (
    <PageShell>
      <header className="flex items-center justify-between mb-6">
        <Link to="/home" className="p-2 -ml-2"><ArrowLeft className="w-6 h-6" /></Link>
        <h1 className="font-semibold">Receive</h1>
        <span className="w-6" />
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5">
        {NETWORKS.map((n) => (
          <button
            key={n.code}
            onClick={() => setSelected(n.code)}
            className={`px-4 h-10 rounded-full text-sm font-medium shrink-0 border ${selected === n.code ? "bg-primary text-primary-foreground border-primary" : "bg-surface border-border"}`}
          >
            {n.symbol}
          </button>
        ))}
      </div>

      {addr && (
        <div className="mt-6 flex flex-col items-center">
          <div className="bg-white p-4 rounded-2xl">
            <QRCodeSVG value={addr} size={220} />
          </div>
          <div className="mt-4 text-center">
            <div className="text-xs text-muted-foreground">Your {net.name} address</div>
            <div className="font-mono text-sm mt-2 break-all max-w-xs">{addr}</div>
          </div>
          <button onClick={copy} className="mt-6 h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold flex items-center gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy address"}
          </button>
          <p className="text-xs text-muted-foreground text-center mt-4 max-w-xs">
            Only send {net.symbol} on the {net.name} network to this address. Sending other assets may result in permanent loss.
          </p>
        </div>
      )}
    </PageShell>
  );
}
