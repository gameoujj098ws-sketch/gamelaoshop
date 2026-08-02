import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Gamepad2, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatKip } from "@/lib/format";
import { ProfileMenu } from "./ProfileMenu";

export function TopBar() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("wallet_balance, username")
        .eq("id", user.id)
        .maybeSingle();
      if (mounted && data) {
        setBalance(data.wallet_balance ?? 0);
        setUsername(data.username ?? "");
      }
    };
    load();

    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as { wallet_balance?: number };
          if (row?.wallet_balance != null) setBalance(row.wallet_balance);
        },
      )
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [user]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/50">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center neon-glow">
            <Gamepad2 className="size-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-wide">Gamelao</div>
            <div className="text-[10px] text-muted-foreground -mt-0.5">ເຕີມເກມອອນລາຍ</div>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Moon className="size-4 text-muted-foreground" aria-hidden />
              <div className="text-sm font-bold text-success">{formatKip(balance)} ₭</div>
              <ProfileMenu username={username} />
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-bold text-foreground"
              >
                ເຂົ້າສູ່ລະບົບ
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" } as never}
                className="btn-neon px-3 py-1.5 text-xs font-bold"
              >
                ສະໝັກສະມາຊິກ
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
