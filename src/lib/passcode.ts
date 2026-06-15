// Simple device-local passcode (PIN). Stored as SHA-256 hash in localStorage.
const KEY = "wallet.passcode.hash";

async function sha(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function setPasscode(pin: string) {
  localStorage.setItem(KEY, await sha(pin));
}

export async function verifyPasscode(pin: string) {
  const stored = localStorage.getItem(KEY);
  if (!stored) return false;
  return stored === (await sha(pin));
}

export function hasPasscode() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(KEY);
}

export function clearPasscode() {
  localStorage.removeItem(KEY);
}
