import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — Vaultcube" }] }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/home", replace: true });
  }

  return (
    <PageShell>
      <header className="flex items-center justify-between mb-8">
        <Link to="/onboarding" className="p-2 -ml-2"><ArrowLeft className="w-6 h-6" /></Link>
        <h1 className="font-semibold">Sign in</h1>
        <span className="w-6" />
      </header>
      <form onSubmit={onSubmit} className="flex-1 flex flex-col gap-4">
        <div>
          <label className="text-xs text-muted-foreground">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
            className="mt-1 w-full h-14 px-4 rounded-2xl bg-surface border border-border outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full h-14 px-4 rounded-2xl bg-surface border border-border outline-none focus:border-primary"
          />
        </div>
        <div className="flex-1" />
        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold text-base disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <Link to="/signup" className="text-center text-sm text-muted-foreground">
          Don't have a wallet? <span className="text-primary font-medium">Create one</span>
        </Link>
      </form>
    </PageShell>
  );
}
