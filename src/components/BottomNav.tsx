import { Link, useLocation } from "@tanstack/react-router";
import { Home as HomeIcon, TrendingUp, Infinity as InfinityIcon, ArrowLeftRight } from "lucide-react";

const items = [
  { to: "/home", label: "Home", icon: HomeIcon },
  { to: "/markets", label: "Markets", icon: TrendingUp },
  { to: "/perps", label: "Perps", icon: InfinityIcon },
] as const;

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed inset-x-0 safe-bottom-nav z-40 pointer-events-none">
      <div className="max-w-md mx-auto px-4 pointer-events-auto">
        <div className="relative bg-surface-elevated/95 backdrop-blur border border-border rounded-full h-15 h-[60px] flex items-center justify-around px-3">
          <NavItem to="/home" label="Home" active={loc.pathname === "/home"} Icon={HomeIcon} />
          <NavItem to="/markets" label="Markets" active={loc.pathname.startsWith("/markets") || loc.pathname.startsWith("/coin")} Icon={TrendingUp} />
          <div className="w-12" />
          <NavItem to="/perps" label="Perps" active={loc.pathname === "/perps"} Icon={InfinityIcon} />
          <NavItem to="/receive" label="Receive" active={loc.pathname === "/receive"} Icon={ArrowLeftRight} />
          <Link
            to="/swap"
            className="absolute left-1/2 -translate-x-1/2 -top-5 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
            aria-label="Swap"
          >
            <ArrowLeftRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

function NavItem({ to, label, active, Icon }: { to: string; label: string; active: boolean; Icon: typeof HomeIcon }) {
  return (
    <Link to={to} className={`flex flex-col items-center gap-0.5 ${active ? "text-primary" : "text-muted-foreground"}`}>
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

// keep items export to satisfy potential consumers
export { items as _items };
