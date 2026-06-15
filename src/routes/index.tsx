import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Splash,
  ssr: false,
});

function Splash() {
  const navigate = useNavigate();
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (data.user) navigate({ to: "/home", replace: true });
      else navigate({ to: "/onboarding", replace: true });
    })();
    return () => { mounted = false; };
  }, [navigate]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background">
      <ShieldLogo />
    </div>
  );
}

function ShieldLogo() {
  return (
    <div className="relative h-40 w-36 animate-pulse">
      <svg viewBox="0 0 100 110" className="w-full h-full drop-shadow-[0_0_30px_oklch(0.6_0.2_152/.5)]">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
        </defs>
        <path d="M50 4 L92 18 L92 60 Q92 92 50 106 Q8 92 8 60 L8 18 Z" fill="url(#g)" opacity="0.85" />
        <g fill="#86efac">
          <rect x="42" y="52" width="4" height="10" />
          <rect x="50" y="48" width="4" height="14" />
          <rect x="58" y="44" width="4" height="18" />
        </g>
      </svg>
    </div>
  );
}
