import { Link, useLocation } from "@tanstack/react-router";
import { Gamepad2, Clock, Wallet, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "ເຕີມເກມ", icon: Gamepad2 },
  { to: "/history", label: "ປະຫວັດ", icon: Clock },
  { to: "/topup", label: "ເຕີມເຄຣດິດ", icon: Wallet },
  { to: "/cards", label: "ບັດເກມ", icon: CreditCard },
] as const;

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 mx-auto max-w-md">
      <div className="mx-3 mb-3 rounded-2xl border border-border/60 bg-surface-2/90 backdrop-blur-md px-2 py-2 shadow-lg">
        <ul className="grid grid-cols-4">
          {items.map((it) => {
            const active =
              it.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(it.to);
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
                      active
                        ? "bg-primary/15 text-primary neon-glow"
                        : "bg-transparent",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="text-[11px] font-medium">{it.label}</span>
                  {active && <span className="h-0.5 w-6 rounded-full bg-primary" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
