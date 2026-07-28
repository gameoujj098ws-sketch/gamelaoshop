import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "ຕັ້ງລະຫັດຜ່ານໃໝ່ — Gamelao" },
      { name: "description", content: "ຕັ້ງລະຫັດຜ່ານໃໝ່ສຳລັບບັນຊີ Gamelao ຂອງທ່ານ" },
      { property: "og:title", content: "ຕັ້ງລະຫັດຜ່ານໃໝ່ — Gamelao" },
      { property: "og:description", content: "ຕັ້ງລະຫັດຜ່ານໃໝ່ສຳລັບບັນຊີ Gamelao" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setReady(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const pw = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (pw.length < 8) { toast.error("ລະຫັດຢ່າງນ້ອຍ 8 ຕົວ"); return; }
    if (pw !== confirm) { toast.error("ລະຫັດຢືນຢັນບໍ່ຕົງກັນ"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("ປ່ຽນລະຫັດຜ່ານສຳເລັດ");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="rounded-2xl p-3 bg-gradient-to-br from-primary to-accent neon-glow">
            <KeyRound className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">ຕັ້ງລະຫັດຜ່ານໃໝ່</h1>
        </div>

        <div className="card-tile p-6">
          {!ready ? (
            <p className="text-sm text-muted-foreground text-center">
              ລິ້ງບໍ່ຖືກຕ້ອງ ຫຼື ໝົດອາຍຸແລ້ວ ກະລຸນາຂໍລິ້ງລືມລະຫັດຜ່ານໃໝ່ອີກຄັ້ງ
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="r-pw">ລະຫັດຜ່ານໃໝ່ (ຢ່າງນ້ອຍ 8 ຕົວ)</Label>
                <Input id="r-pw" name="password" type="password" minLength={8} required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="r-confirm">ຢືນຢັນລະຫັດຜ່ານໃໝ່</Label>
                <Input id="r-confirm" name="confirm" type="password" minLength={8} required className="mt-1" />
              </div>
              <Button type="submit" disabled={busy} className="w-full btn-neon">
                {busy ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກລະຫັດຜ່ານ"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
