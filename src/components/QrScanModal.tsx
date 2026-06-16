import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { X } from "lucide-react";
import type { NetworkCode } from "@/lib/networks";

export type ScanResult = { address: string; network: NetworkCode | null };

export function detectNetwork(address: string): NetworkCode | null {
  const a = address.trim();
  if (/^bc1[qp][a-z0-9]{20,}$/i.test(a) || /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(a)) return "BTC";
  if (/^ltc1[a-z0-9]{20,}$/i.test(a) || /^[LM3][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(a)) return "LTC";
  if (/^addr1[a-z0-9]{20,}$/i.test(a)) return "ADA";
  if (/^T[a-zA-Z0-9]{33}$/.test(a)) return "TRX";
  if (/^D[a-km-zA-HJ-NP-Z1-9]{33}$/.test(a)) return "DOGE";
  if (/^0x[a-fA-F0-9]{40}$/.test(a)) return "ETH"; // EVM — default ETH; user can switch
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) return "SOL";
  return null;
}

export function QrScanModal({ onClose, onResult }: { onClose: () => void; onResult: (r: ScanResult) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!videoRef.current) return;
    const scanner = new QrScanner(
      videoRef.current,
      (res) => {
        const addr = res.data.trim();
        scanner.stop();
        onResult({ address: addr, network: detectNetwork(addr) });
      },
      { highlightScanRegion: true, highlightCodeOutline: true, preferredCamera: "environment" }
    );
    scanner.start().catch((e) => setError(e?.message || "Camera unavailable"));
    return () => { scanner.stop(); scanner.destroy(); };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 safe-top">
        <h2 className="text-white font-semibold">Scan QR Code</h2>
        <button onClick={onClose} className="p-2 text-white"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 relative">
        <video ref={videoRef} className="w-full h-full object-cover" />
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black text-white">
            <p className="text-sm text-white/70 mb-3">Camera not available</p>
            <p className="text-[11px] text-white/50 mb-4">{error}</p>
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Paste wallet address"
              className="w-full max-w-sm h-11 px-3 rounded-full bg-white/10 text-white outline-none"
            />
            <button
              onClick={() => manual && onResult({ address: manual.trim(), network: detectNetwork(manual) })}
              className="mt-3 h-11 px-5 rounded-full bg-primary text-primary-foreground font-semibold text-sm"
            >Use address</button>
          </div>
        )}
      </div>
      <div className="p-4 text-center text-white/70 text-xs safe-bottom">
        Point the camera at a wallet QR code
      </div>
    </div>
  );
}
