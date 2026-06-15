// Guarded service worker registration. Only registers in the published production app.
export function registerPwa() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  const host = window.location.hostname;
  const inIframe = window.self !== window.top;
  const isPreview =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".beta.lovable.dev") ||
    host === "beta.lovable.dev";
  const killSwitch = url.searchParams.get("sw") === "off";

  const blocked = !import.meta.env.PROD || inIframe || isPreview || killSwitch;

  if (blocked) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs
        .filter((r) => r.active?.scriptURL.endsWith("/sw.js"))
        .forEach((r) => r.unregister());
    });
    return;
  }

  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
