import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";
import { Gamepad2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "ເຂົ້າສູ່ລະບົບ — Gamelao" },
      { name: "description", content: "ເຂົ້າສູ່ລະບົບ ຫຼື ສະໝັກສະມາຊິກ ເພື່ອເຕີມເກມ" },
      { property: "og:title", content: "ເຂົ້າສູ່ລະບົບ — Gamelao" },
      { property: "og:description", content: "ເຂົ້າສູ່ລະບົບ ຫຼື ສະໝັກສະມາຊິກ" },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  username: z.string().trim().min(2, "ຊື່ຢ່າງນ້ອຍ 2 ຕົວ").max(50),
  email: z.string().trim().email("ອີເມວບໍ່ຖືກຕ້ອງ").max(255),
  password: z.string().min(8, "ລະຫັດຢ່າງນ້ອຍ 8 ຕົວ").max(72),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "ລະຫັດຢືນຢັນບໍ່ຕົງ", path: ["confirm"] });

const loginSchema = z.object({
  email: z.string().trim().email("ອີເມວບໍ່ຖືກຕ້ອງ").max(255),
  password: z.string().min(1, "ກະລຸນາໃສ່ລະຫັດ"),
});

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to="/" replace />;

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { username: parsed.data.username },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("ສະໝັກສະມາຊິກສຳເລັດ");
    navigate({ to: "/" });
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    // log login history (fire and forget)
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) supabase.from("login_history").insert({ user_id: data.user.id, user_agent: navigator.userAgent });
    });
    toast.success("ເຂົ້າສູ່ລະບົບສຳເລັດ");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="rounded-2xl p-3 bg-gradient-to-br from-primary to-accent neon-glow">
            <Gamepad2 className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Gamelao</h1>
          <p className="text-sm text-muted-foreground">ເຕີມເກມອອນລາຍ — ໄວ, ປອດໄພ</p>
        </div>

        <div className="card-tile p-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary">
              <TabsTrigger value="login">ເຂົ້າສູ່ລະບົບ</TabsTrigger>
              <TabsTrigger value="signup">ສະໝັກສະມາຊິກ</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="l-email">ອີເມວ</Label>
                  <Input id="l-email" name="email" type="email" autoComplete="email" required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="l-pw">ລະຫັດຜ່ານ</Label>
                  <Input id="l-pw" name="password" type="password" autoComplete="current-password" required className="mt-1" />
                </div>
                <Button type="submit" disabled={busy} className="w-full btn-neon">
                  {busy ? "ກຳລັງດຳເນີນການ..." : "ເຂົ້າສູ່ລະບົບ"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="s-username">ຊື່ຜູ້ໃຊ້</Label>
                  <Input id="s-username" name="username" required maxLength={50} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="s-email">ອີເມວ</Label>
                  <Input id="s-email" name="email" type="email" required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="s-pw">ລະຫັດຜ່ານ (ຢ່າງນ້ອຍ 8 ຕົວ)</Label>
                  <Input id="s-pw" name="password" type="password" minLength={8} required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="s-confirm">ຢືນຢັນລະຫັດຜ່ານ</Label>
                  <Input id="s-confirm" name="confirm" type="password" minLength={8} required className="mt-1" />
                </div>
                <Button type="submit" disabled={busy} className="w-full btn-neon">
                  {busy ? "ກຳລັງດຳເນີນການ..." : "ສະໝັກສະມາຊິກ"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
