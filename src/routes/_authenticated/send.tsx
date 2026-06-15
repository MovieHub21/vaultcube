import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyWallet, sendFunds } from "@/lib/wallet.functions";
import { PageShell } from "@/components/PageShell";
import { NETWORKS, NETWORK_BY_CODE, type NetworkCode } from "@/lib/networks";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/send")({
  component: Send,
  head: () => ({ meta: [{ title: "Send — Vaultcube" }] }),
});

function Send() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchWallet = useServerFn(getMyWallet);
  const send = useServerFn(sendFunds);
  const { data } = useQuery({ queryKey: ["wallet"], queryFn: () => fetchWallet() });

  const [network, setNetwork] = useState<NetworkCode>("ETH");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const bal = Number(data?.balances.find((b) => b.network === network)?.amount ?? 0);

  const mut = useMutation({
    mutationFn: () =>
      send({ data: { toAddress: to.trim(), network, amount: parseFloat(amount), note: note || undefined } }),
    onSuccess: () => {
      toast.success("Sent!");
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      navigate({ to: "/home" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const a = parseFloat(amount);
    if (!to.trim() || !a || a <= 0) {
      toast.error("Enter a valid address and amount");
      return;
    }
    mut.mutate();
  }

  const net = NETWORK_BY_CODE[network];

  return (
    <PageShell>
      <header className="flex items-center justify-between mb-6">
        <Link to="/home" className="p-2 -ml-2"><ArrowLeft className="w-6 h-6" /></Link>
        <h1 className="font-semibold">Send crypto</h1>
        <span className="w-6" />
      </header>

      <form onSubmit={submit} className="flex flex-col gap-4 flex-1">
        <div>
          <label className="text-xs text-muted-foreground">Network</label>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 mt-1">
            {NETWORKS.map((n) => (
              <button
                type="button"
                key={n.code}
                onClick={() => setNetwork(n.code)}
                className={`px-4 h-10 rounded-full text-sm font-medium shrink-0 border ${network === n.code ? "bg-primary text-primary-foreground border-primary" : "bg-surface border-border"}`}
              >
                {n.symbol}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Recipient {net.symbol} address</label>
          <textarea
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={`Paste a ${net.name} address`}
            rows={2}
            className="mt-1 w-full p-4 rounded-2xl bg-surface border border-border outline-none focus:border-primary font-mono text-sm resize-none"
          />
        </div>

        <div>
          <div className="flex justify-between items-baseline">
            <label className="text-xs text-muted-foreground">Amount</label>
            <button type="button" onClick={() => setAmount(String(bal))} className="text-xs text-primary">
              Max: {bal.toFixed(4)} {net.symbol}
            </button>
          </div>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="mt-1 w-full h-14 px-4 rounded-2xl bg-surface border border-border outline-none focus:border-primary text-lg"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            className="mt-1 w-full h-14 px-4 rounded-2xl bg-surface border border-border outline-none focus:border-primary"
          />
        </div>

        <div className="flex-1" />
        <button
          type="submit"
          disabled={mut.isPending}
          className="w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-60"
        >
          {mut.isPending ? "Sending…" : `Send ${net.symbol}`}
        </button>
      </form>
    </PageShell>
  );
}
