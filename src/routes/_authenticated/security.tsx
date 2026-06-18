import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { hasPasscode, setPasscode, verifyPasscode, clearPasscode } from "@/lib/passcode";
import { ArrowLeft, Delete } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/security")({
  component: Security,
  ssr: false,
  head: () => ({ meta: [{ title: "Security & Passcode — Vaultcube" }] }),
});

type Stage = "menu" | "current" | "new" | "confirm";

function Security() {
  const navigate = useNavigate();
  const LEN = 6;
  const [exists, setExists] = useState(false);
  const [stage, setStage] = useState<Stage>("menu");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { setExists(hasPasscode()); }, []);

  useEffect(() => {
    if (pin.length !== LEN) return;
    (async () => {
      if (stage === "current") {
        const ok = await verifyPasscode(pin);
        if (!ok) { setError("Incorrect passcode"); setPin(""); return; }
        setError(""); setPin(""); setStage("new");
      } else if (stage === "new") {
        setNewPin(pin); setPin(""); setStage("confirm");
      } else if (stage === "confirm") {
        if (pin !== newPin) { setError("Passcodes don't match"); setPin(""); setNewPin(""); setStage("new"); return; }
        await setPasscode(pin);
        toast.success("Passcode updated");
        setPin(""); setNewPin(""); setStage("menu"); setExists(true);
      }
    })();
  }, [pin, stage, newPin]);

  function press(n: string) { setError(""); setPin((p) => (p.length < LEN ? p + n : p)); }
  function back() { setPin((p) => p.slice(0, -1)); }

  if (stage === "menu") {
    return (
      <PageShell className="pb-8">
        <header className="grid grid-cols-[auto_1fr_auto] items-center mb-4">
          <Link to="/settings" className="p-1.5 -ml-1.5"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-base font-semibold text-center">Security & Passcode</h1>
          <span className="w-7" />
        </header>

        <div className="rounded-2xl bg-surface divide-y divide-border overflow-hidden">
          <button
            type="button"
            onClick={() => { setError(""); setStage(exists ? "current" : "new"); }}
            className="w-full text-left p-4 text-sm font-medium"
          >
            {exists ? "Change passcode" : "Set passcode"}
          </button>
          {exists && (
            <button
              type="button"
              onClick={() => { clearPasscode(); setExists(false); toast.success("Passcode removed"); }}
              className="w-full text-left p-4 text-sm font-medium text-destructive"
            >
              Remove passcode
            </button>
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground text-center">
          Your passcode protects sending and swapping. It is stored only on this device.
        </p>
      </PageShell>
    );
  }

  const title =
    stage === "current" ? "Enter current passcode" :
    stage === "new" ? "Enter new passcode" :
    "Confirm new passcode";

  const keys = ["1","2","3","4","5","6","7","8","9"];

  return (
    <PageShell>
      <header className="flex items-center justify-between mb-12">
        <button onClick={() => { setPin(""); setNewPin(""); setError(""); setStage("menu"); }} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-semibold">Passcode</h1>
        <span className="w-6" />
      </header>
      <div className="flex-1 flex flex-col items-center justify-center">
        <h2 className="text-xl font-semibold mb-6">{title}</h2>
        <div className="flex gap-3 mb-4">
          {Array.from({ length: LEN }).map((_, i) => (
            <div key={i} className={`w-10 h-12 rounded-xl border-2 ${i < pin.length ? "border-primary bg-primary/20" : "border-border"}`} />
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <div className="grid grid-cols-3 gap-3 mt-6">
        {keys.map((k) => (
          <button key={k} onClick={() => press(k)} className="h-16 rounded-2xl bg-surface-elevated text-2xl font-semibold active:bg-secondary">{k}</button>
        ))}
        <span />
        <button onClick={() => press("0")} className="h-16 rounded-2xl bg-surface-elevated text-2xl font-semibold active:bg-secondary">0</button>
        <button onClick={back} className="h-16 rounded-2xl flex items-center justify-center active:bg-secondary"><Delete className="w-6 h-6" /></button>
      </div>
    </PageShell>
  );
}
