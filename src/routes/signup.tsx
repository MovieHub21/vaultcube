import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: Signup,
  ssr: false,
  head: () => ({ meta: [{ title: "Create wallet — Vaultcube" }] }),
});

function Signup() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (cleanUsername.length < 3) {
      toast.error("Username must be at least 3 characters");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: cleanUsername, display_name: cleanUsername } },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/passcode", replace: true });
  }

  return (
    <PageShell>
      <header className="flex items-center justify-between mb-8">
        <Link to="/onboarding" className="p-2 -ml-2"><ArrowLeft className="w-6 h-6" /></Link>
        <h1 className="font-semibold">Create wallet</h1>
        <span className="w-6" />
      </header>
      <form onSubmit={onSubmit} className="flex-1 flex flex-col gap-4">
        <div>
          <label className="text-xs text-muted-foreground">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="satoshi"
            autoCapitalize="none"
            className="mt-1 w-full h-14 px-4 rounded-2xl bg-surface border border-border text-base outline-none focus:border-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">Other users can send to you by username.</p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoCapitalize="none"
            className="mt-1 w-full h-14 px-4 rounded-2xl bg-surface border border-border text-base outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="mt-1 w-full h-14 px-4 rounded-2xl bg-surface border border-border text-base outline-none focus:border-primary"
          />
        </div>
        <div className="flex-1" />
        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold text-base disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create wallet"}
        </button>
      </form>
    </PageShell>
  );
}
