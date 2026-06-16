import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { adminListUsers, adminGetUserBalances, adminCreditUser, getMyWallet } from "@/lib/wallet.functions";
import { TOKENS, tokenKey, NETWORKS, type Token } from "@/lib/networks";
import { TokenIcon } from "@/components/TokenIcon";
import { useMemo, useState } from "react";
import { ArrowLeft, Search, Plus, Minus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: Admin,
  head: () => ({ meta: [{ title: "Admin — Vaultcube" }] }),
});

function Admin() {
  const navigate = useNavigate();
  const fetchWallet = useServerFn(getMyWallet);
  const listUsers = useServerFn(adminListUsers);
  const { data: wallet, isLoading: walletLoading } = useQuery({ queryKey: ["wallet"], queryFn: () => fetchWallet() });
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsers(),
    enabled: !!wallet?.isAdmin,
  });
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!walletLoading && !wallet?.isAdmin) {
    return (
      <PageShell>
        <header className="grid grid-cols-[auto_1fr_auto] items-center mb-4">
          <Link to="/settings" className="p-1.5 -ml-1.5"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-base font-semibold text-center">Admin</h1><span className="w-7" />
        </header>
        <div className="mt-10 text-center text-sm text-muted-foreground">You don't have admin access.</div>
      </PageShell>
    );
  }

  const filtered = users.filter((u) => !q || `${u.username} ${u.display_name ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const selected = users.find((u) => u.id === selectedId);

  return (
    <PageShell className="pb-8">
      <header className="grid grid-cols-[auto_1fr_auto] items-center mb-4">
        <button onClick={() => (selectedId ? setSelectedId(null) : navigate({ to: "/settings" }))} className="p-1.5 -ml-1.5"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-base font-semibold text-center">{selected ? selected.display_name ?? selected.username : "Manage Users"}</h1>
        <span className="w-7" />
      </header>

      {!selected ? (
        <>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users" className="w-full h-10 pl-9 pr-3 rounded-full bg-surface-elevated outline-none" />
          </div>
          {isLoading ? (
            <div className="mt-6 text-center text-sm text-muted-foreground">Loading users…</div>
          ) : (
            <div className="mt-3 divide-y divide-border">
              {filtered.map((u) => (
                <button key={u.id} onClick={() => setSelectedId(u.id)} className="w-full flex items-center gap-3 py-3 text-left">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold">
                    {(u.display_name ?? u.username).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{u.display_name ?? u.username}</div>
                    <div className="text-[11px] text-muted-foreground truncate">@{u.username}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</div>
                </button>
              ))}
              {filtered.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">No users</div>}
            </div>
          )}
        </>
      ) : (
        <UserBalances userId={selected.id} username={selected.username} />
      )}
    </PageShell>
  );
}

function UserBalances({ userId, username }: { userId: string; username: string }) {
  const qc = useQueryClient();
  const getBals = useServerFn(adminGetUserBalances);
  const credit = useServerFn(adminCreditUser);
  const { data: bals = [], refetch } = useQuery({
    queryKey: ["admin-user-bals", userId],
    queryFn: () => getBals({ data: { userId } }),
  });
  const [editing, setEditing] = useState<Token | null>(null);
  const [filter, setFilter] = useState<"ALL" | string>("ALL");
  const [q, setQ] = useState("");

  const balanceOf = (t: Token) => Number(bals.find((b) => b.network === t.network && b.token === t.symbol)?.amount ?? 0);

  const list = useMemo(() => TOKENS.filter((t) => {
    if (filter !== "ALL" && t.network !== filter) return false;
    if (q && !`${t.symbol} ${t.name}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [filter, q]);

  const mut = useMutation({
    mutationFn: (vars: { token: Token; amount: number; note?: string }) =>
      credit({ data: { userId, network: vars.token.network, token: vars.token.symbol, amount: vars.amount, note: vars.note } }),
    onSuccess: () => {
      toast.success("Balance updated");
      qc.invalidateQueries({ queryKey: ["admin-user-bals", userId] });
      refetch();
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="text-xs text-muted-foreground mb-2">@{username} · tap any coin to add/remove balance</div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search coin" className="w-full h-10 pl-9 pr-3 rounded-full bg-surface-elevated outline-none" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 mt-3 no-scrollbar">
        <button onClick={() => setFilter("ALL")} className={`shrink-0 h-10 px-3 rounded-xl border-2 text-xs font-semibold ${filter === "ALL" ? "border-primary text-primary" : "border-border"}`}>All</button>
        {NETWORKS.map((n) => (
          <button key={n.code} onClick={() => setFilter(n.code)} className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs border-2 ${filter === n.code ? "border-primary" : "border-transparent"}`} style={{ background: n.color }}>
            {n.emoji}
          </button>
        ))}
      </div>

      <div className="mt-3 divide-y divide-border">
        {list.map((t) => {
          const bal = balanceOf(t);
          return (
            <button key={tokenKey(t)} onClick={() => setEditing(t)} className="w-full flex items-center gap-3 py-3 text-left">
              <TokenIcon token={t} size={38} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  {t.symbol}
                  <span className="text-[10px] text-muted-foreground bg-surface-elevated px-1.5 py-0.5 rounded">{t.chainLabel}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{t.name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{bal.toFixed(4)}</div>
                <div className="text-[11px] text-muted-foreground">${(bal * t.priceUsd).toFixed(2)}</div>
              </div>
            </button>
          );
        })}
      </div>

      {editing && <CreditModal token={editing} current={balanceOf(editing)} onClose={() => setEditing(null)} onSubmit={(amount, note) => mut.mutate({ token: editing, amount, note })} pending={mut.isPending} />}
    </>
  );
}

function CreditModal({ token, current, onClose, onSubmit, pending }: { token: Token; current: number; onClose: () => void; onSubmit: (amount: number, note?: string) => void; pending: boolean }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"add" | "remove">("add");

  function submit() {
    const a = parseFloat(amount);
    if (!a || a <= 0) return toast.error("Enter amount");
    onSubmit(mode === "add" ? a : -a, note || undefined);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={onClose}>
      <div className="bg-background w-full max-w-md mx-auto rounded-t-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TokenIcon token={token} size={36} />
            <div>
              <div className="font-semibold">{token.symbol}</div>
              <div className="text-[11px] text-muted-foreground">{token.chainLabel}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2"><X className="w-4 h-4" /></button>
        </div>
        <div className="text-xs text-muted-foreground">Current balance</div>
        <div className="text-2xl font-bold">{current.toFixed(6)} {token.symbol}</div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => setMode("add")} className={`h-11 rounded-full font-semibold text-sm flex items-center justify-center gap-2 ${mode === "add" ? "bg-primary text-primary-foreground" : "bg-surface-elevated"}`}><Plus className="w-4 h-4" /> Add</button>
          <button onClick={() => setMode("remove")} className={`h-11 rounded-full font-semibold text-sm flex items-center justify-center gap-2 ${mode === "remove" ? "bg-destructive text-destructive-foreground" : "bg-surface-elevated"}`}><Minus className="w-4 h-4" /> Remove</button>
        </div>

        <label className="mt-4 block text-[11px] text-muted-foreground">Amount</label>
        <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="mt-1 w-full h-12 px-3 rounded-2xl bg-surface border border-border outline-none" />

        <label className="mt-3 block text-[11px] text-muted-foreground">Note (optional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full h-11 px-3 rounded-2xl bg-surface border border-border outline-none" />

        <button onClick={submit} disabled={pending} className="mt-5 w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-50">
          {pending ? "Saving…" : mode === "add" ? `Add ${amount || "0"} ${token.symbol}` : `Remove ${amount || "0"} ${token.symbol}`}
        </button>
      </div>
    </div>
  );
}
