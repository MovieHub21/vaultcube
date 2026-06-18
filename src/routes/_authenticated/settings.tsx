import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { getMyWallet } from "@/lib/wallet.functions";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ChevronRight, LogOut, Shield, User, Bell, Lock, HelpCircle, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
  head: () => ({ meta: [{ title: "Settings — Vaultcube" }] }),
});

function Settings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchWallet = useServerFn(getMyWallet);
  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: () => fetchWallet() });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/onboarding", replace: true });
  }

  return (
    <PageShell className="pb-8">
      <header className="grid grid-cols-[auto_1fr_auto] items-center mb-4">
        <Link to="/home" className="p-1.5 -ml-1.5"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-base font-semibold text-center">Settings</h1>
        <span className="w-7" />
      </header>

      <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
          {(wallet?.profile?.display_name ?? wallet?.profile?.username ?? "U").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{wallet?.profile?.display_name ?? wallet?.profile?.username}</div>
          <div className="text-xs text-muted-foreground truncate">@{wallet?.profile?.username}</div>
        </div>
      </div>

      <Section title="Account">
        <Row icon={<User className="w-4 h-4" />} label="Profile" />
        <Row icon={<Lock className="w-4 h-4" />} label="Security & Passcode" to="/security" />
        <Row icon={<Bell className="w-4 h-4" />} label="Notifications" />
      </Section>

      {wallet?.isAdmin && (
        <Section title="Admin">
          <Row icon={<Shield className="w-4 h-4 text-primary" />} label="Manage user balances" to="/admin" />
        </Section>
      )}

      <Section title="Support">
        <Row icon={<HelpCircle className="w-4 h-4" />} label="Help center" />
        <Row icon={<FileText className="w-4 h-4" />} label="Terms & Privacy" />
      </Section>

      <button
        onClick={signOut}
        className="mt-6 w-full h-12 rounded-2xl bg-destructive/15 text-destructive font-semibold text-sm flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" /> Log out
      </button>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">Vaultcube</p>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">{title}</div>
      <div className="rounded-2xl bg-surface divide-y divide-border overflow-hidden">{children}</div>
    </div>
  );
}

function Row({ icon, label, to }: { icon: React.ReactNode; label: string; to?: string }) {
  const inner = (
    <div className="flex items-center gap-3 p-4">
      <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center">{icon}</div>
      <div className="flex-1 text-sm font-medium">{label}</div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  );
  if (to) return <Link to={to as any}>{inner}</Link>;
  return <button type="button" className="w-full text-left">{inner}</button>;
}
