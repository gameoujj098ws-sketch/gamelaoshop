import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatKip } from "@/lib/format";
import { User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "ໂປຣຟາຍ — DANO1" },
      { name: "description", content: "ຂໍ້ມູນບັນຊີຂອງທ່ານ" },
      { property: "og:title", content: "ໂປຣຟາຍ — DANO1" },
      { property: "og:description", content: "ຂໍ້ມູນບັນຊີຂອງທ່ານ" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ username: string | null; email: string | null; wallet_balance: number } | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username, email, wallet_balance").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user]);
  return (
    <div className="px-4">
      <div className="card-tile p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-14 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center neon-glow">
            <User className="size-6 text-white" />
          </div>
          <div>
            <div className="font-bold">{profile?.username ?? "-"}</div>
            <div className="text-xs text-muted-foreground">{profile?.email ?? "-"}</div>
          </div>
        </div>
        <div className="rounded-xl bg-surface p-4">
          <div className="text-xs text-muted-foreground">ຍອດເງິນໃນກະເປົາ</div>
          <div className="text-2xl font-extrabold text-success">{formatKip(profile?.wallet_balance ?? 0)} ₭</div>
        </div>
      </div>
    </div>
  );
}
