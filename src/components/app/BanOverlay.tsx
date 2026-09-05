import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

interface BanInfo {
  is_banned: boolean | null;
  ban_reason: string | null;
  username?: string | null;
  email?: string | null;
}

export function BanOverlay() {
  const { user } = useAuth();
  const [ban, setBan] = useState<BanInfo | null>(null);

  useEffect(() => {
    if (!user) {
      setBan(null);
      return;
    }
    let active = true;
    supabase
      .from("profiles")
      .select("is_banned, ban_reason, username, email")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setBan((data as BanInfo | null) ?? null);
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (ban?.is_banned) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [ban?.is_banned]);

  if (!ban?.is_banned) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border-2 border-destructive bg-destructive/95 p-6 text-center text-destructive-foreground shadow-2xl">
        <h2 className="text-xl font-bold">ບັນຊີຂອງທ່ານຖືກລະງັບ</h2>
        <p className="mt-2 text-sm opacity-90">
          {ban.username || ban.email || ""}
        </p>
        <p className="mt-4 text-sm">
          ເຫດຜົນ: {ban.ban_reason || "ບໍ່ໄດ້ລະບຸ"}
        </p>
        <p className="mt-4 text-xs opacity-90">
          ທ່ານບໍ່ສາມາດໃຊ້ງານເວັບໄຊໄດ້ ຈົນກວ່າຜູ້ດູແລລະບົບຈະປົດລ໋ອກ
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-6 w-full rounded-full bg-background px-6 py-2 text-sm font-semibold text-foreground"
        >
          ອອກຈາກລະບົບ
        </button>
      </div>
    </div>
  );
}
