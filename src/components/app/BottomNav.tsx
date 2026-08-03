import { Link, useLocation } from "@tanstack/react-router";
import { Gamepad2, Clock, Wallet, CreditCard, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const left = [
  { to: "/", label: "ເຕີມເກມ", icon: Gamepad2 },
  { to: "/history", label: "ປະຫວັດ", icon: Clock },
] as const;

const right = [
  { to: "/topup", label: "ເຕີມເຄຣດິດ", icon: Wallet },
  { to: "/cards", label: "ບັດເກມ", icon: CreditCard },
] as const;

export function BottomNav() {
  const loc = useLocation();
  const isActive = (to: string) => (to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(to));

  const item = (it: { to: string; label: string; icon: typeof Home }) => {
    const active = isActive(it.to);
    const Icon = it.icon;
    return (
      <li key={it.to}>
        <Link
          to={it.to}
          className={cn(
            "flex flex-col items-center gap-1 py-1.5 rounded-xl transition-colors",
            active ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span
            className={cn(
              "grid place-items-center size-9 rounded-xl transition-all",
              active ? "bg-primary/15 text-primary neon-glow" : "bg-transparent",
            )}
          >
            <Icon className="size-5" />
          </span>
          <span className="text-[11px] font-medium">{it.label}</span>
          {active && <span className="h-0.5 w-6 rounded-full bg-primary" />}
        </Link>
      </li>
    );
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 mx-auto max-w-md">
      <div className="mx-3 mb-3 rounded-2xl border border-border/60 bg-surface-2/90 backdrop-blur-md px-2 py-2 shadow-lg">
        <ul className="grid grid-cols-5 items-end">
          {left.map(item)}
          <li className="flex justify-center">
            <Link
              to="/home"
              aria-label="ໜ້າຫຼັກ"
              className="-mt-6 flex flex-col items-center gap-1"
            >
              <span
                className={cn(
                  "grid place-items-center size-14 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg ring-4 ring-background transition-transform active:scale-95",
                  isActive("/home") && "neon-glow",
                )}
              >
                <Home className="size-6" />
              </span>
              <span className={cn("text-[11px] font-medium", isActive("/home") ? "text-primary" : "text-muted-foreground")}>
                ໜ້າຫຼັກ
              </span>
            </Link>
          </li>
          {right.map(item)}
        </ul>
      </div>
    </nav>
  );
}
