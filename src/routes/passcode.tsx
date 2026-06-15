import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { setPasscode } from "@/lib/passcode";
import { ArrowLeft, Delete } from "lucide-react";

export const Route = createFileRoute("/passcode")({
  component: Passcode,
  ssr: false,
  head: () => ({ meta: [{ title: "Create passcode — Vaultcube" }] }),
});

function Passcode() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [firstPin, setFirstPin] = useState("");

  const LEN = 6;

  useEffect(() => {
    if (pin.length !== LEN) return;
    if (!confirming) {
      setFirstPin(pin);
      setPin("");
      setConfirming(true);
    } else {
      if (pin !== firstPin) {
        setPin("");
        setFirstPin("");
        setConfirming(false);
        return;
      }
      (async () => {
        await setPasscode(pin);
        navigate({ to: "/ready", replace: true });
      })();
    }
  }, [pin, confirming, firstPin, navigate]);

  function press(n: string) {
    setPin((p) => (p.length < LEN ? p + n : p));
  }
  function back() {
    setPin((p) => p.slice(0, -1));
  }

  const keys = ["1","2","3","4","5","6","7","8","9"];

  return (
    <PageShell>
      <header className="flex items-center justify-between mb-12">
        <Link to="/signup" className="p-2 -ml-2"><ArrowLeft className="w-6 h-6" /></Link>
        <h1 className="font-semibold">Passcode</h1>
        <span className="w-6" />
      </header>
      <div className="flex-1 flex flex-col items-center justify-center">
        <h2 className="text-xl font-semibold mb-6">
          {confirming ? "Confirm passcode" : "Create passcode"}
        </h2>
        <div className="flex gap-3 mb-6">
          {Array.from({ length: LEN }).map((_, i) => (
            <div
              key={i}
              className={`w-10 h-12 rounded-xl border-2 ${i < pin.length ? "border-primary bg-primary/20" : "border-border"}`}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Enter your passcode. Be sure to remember it so you can unlock your wallet.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-6">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className="h-16 rounded-2xl bg-surface-elevated text-2xl font-semibold active:bg-secondary"
          >
            {k}
          </button>
        ))}
        <span />
        <button onClick={() => press("0")} className="h-16 rounded-2xl bg-surface-elevated text-2xl font-semibold active:bg-secondary">0</button>
        <button onClick={back} className="h-16 rounded-2xl flex items-center justify-center active:bg-secondary">
          <Delete className="w-6 h-6" />
        </button>
      </div>
    </PageShell>
  );
}
