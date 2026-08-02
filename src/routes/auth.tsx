import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Gamepad2, LogIn, UserPlus } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: "login" | "signup" } => ({
    mode: search.mode === "signup" ? "signup" : undefined,
  }),
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

const fieldClass = "mt-1 h-12 rounded-2xl border-primary/25 bg-secondary/40 text-base";

function Req() {
  return <span className="text-destructive"> *</span>;
}

function AuthPage() {
  const { mode } = Route.useSearch();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">(mode ?? "login");
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  async function handleForgot() {
    const email = forgotEmail.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast.error("ອີເມວບໍ່ຖືກຕ້ອງ"); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("ສົ່ງລິ້ງປ່ຽນລະຫັດຜ່ານໄປອີເມວແລ້ວ ກະລຸນາກວດກ່ອງຂໍ້ຄວາມ");
    setForgotOpen(false);
  }

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
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) supabase.from("login_history").insert({ user_id: data.user.id, user_agent: navigator.userAgent });
    });
    toast.success("ເຂົ້າສູ່ລະບົບສຳເລັດ");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen px-3 py-4">
      <div className="mx-auto w-full max-w-md space-y-3">
        {/* header bar: logo + switch pills */}
        <div className="flex items-center gap-3 rounded-3xl bg-secondary/50 p-3 shadow-sm">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent">
            <Gamepad2 className="size-7 text-primary-foreground" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("login")}
              className={cn(
                "rounded-2xl border-2 px-4 py-2.5 text-sm font-bold cursor-pointer",
                tab === "login" ? "border-primary text-primary" : "border-transparent text-muted-foreground",
              )}
            >
              ເຂົ້າສູ່ລະບົບ
            </button>
            <button
              type="button"
              onClick={() => setTab("signup")}
              className={cn(
                "rounded-2xl px-4 py-2.5 text-sm font-bold cursor-pointer",
                tab === "signup"
                  ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              ສະໝັກ
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-secondary/40 shadow-sm">
          {/* gradient card header */}
          <div className="bg-gradient-to-r from-primary/90 to-primary px-5 py-5 text-primary-foreground">
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              {tab === "login" ? <LogIn className="size-6" /> : <UserPlus className="size-6" />}
              {tab === "login" ? "ເຂົ້າສູ່ລະບົບ" : "ສະໝັກສະມາຊິກ"}
            </h1>
            <p className="mt-1 text-sm opacity-90">
              {tab === "login" ? "ຫາກຍັງບໍ່ມີບັນຊີ? " : "ຫາກມີບັນຊີແລ້ວ? "}
              <button
                type="button"
                onClick={() => setTab(tab === "login" ? "signup" : "login")}
                className="font-bold underline underline-offset-4 cursor-pointer"
              >
                {tab === "login" ? "ສະໝັກສະມາຊິກ" : "ເຂົ້າສູ່ລະບົບ"}
              </button>
            </p>
          </div>

          <div className="px-5 py-6">
            {tab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <Label htmlFor="l-email" className="text-base font-bold">ອີເມວ<Req /></Label>
                  <Input id="l-email" name="email" type="email" autoComplete="email" required
                    placeholder="user@gmail.com" className={fieldClass} />
                </div>
                <div>
                  <Label htmlFor="l-pw" className="text-base font-bold">ລະຫັດຜ່ານ<Req /></Label>
                  <Input id="l-pw" name="password" type="password" autoComplete="current-password" required
                    placeholder="**********" className={fieldClass} />
                </div>
                <label className="flex items-center gap-3 text-base font-bold cursor-pointer">
                  <input type="checkbox" defaultChecked className="size-5 accent-primary rounded" />
                  ຢູ່ໃນລະບົບຕະຫຼອດ
                </label>
                <Button type="submit" disabled={busy}
                  className="h-13 w-full rounded-2xl bg-gradient-to-r from-primary/80 to-primary text-lg font-bold">
                  {busy ? "ກຳລັງດຳເນີນການ..." : "ເຂົ້າສູ່ລະບົບ"}
                </Button>
                <button type="button" onClick={() => setForgotOpen(true)}
                  className="w-full text-center text-base font-bold text-primary underline underline-offset-4 cursor-pointer">
                  ລືມລະຫັດຜ່ານ
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-5">
                <div>
                  <Label htmlFor="s-username" className="text-base font-bold">ຊື່ຜູ້ໃຊ້<Req /></Label>
                  <Input id="s-username" name="username" required maxLength={50}
                    placeholder="Username" className={fieldClass} />
                </div>
                <div>
                  <Label htmlFor="s-email" className="text-base font-bold">ອີເມວ<Req /></Label>
                  <Input id="s-email" name="email" type="email" required
                    placeholder="user@gmail.com" className={fieldClass} />
                </div>
                <div>
                  <Label htmlFor="s-pw" className="text-base font-bold">ລະຫັດຜ່ານ<Req /></Label>
                  <Input id="s-pw" name="password" type="password" minLength={8} required
                    placeholder="**********" className={fieldClass} />
                </div>
                <div>
                  <Label htmlFor="s-confirm" className="text-base font-bold">ຢືນຢັນລະຫັດຜ່ານ<Req /></Label>
                  <Input id="s-confirm" name="confirm" type="password" minLength={8} required
                    placeholder="**********" className={fieldClass} />
                </div>
                <p className="text-xs text-muted-foreground">ລະຫັດຜ່ານຢ່າງນ້ອຍ 8 ຕົວອັກສອນ</p>
                <Button type="submit" disabled={busy}
                  className="h-13 w-full rounded-2xl bg-gradient-to-r from-primary/80 to-primary text-lg font-bold">
                  {busy ? "ກຳລັງດຳເນີນການ..." : "ສະໝັກສະມາຊິກ"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="bg-surface-2 border-border max-w-sm">
          <DialogHeader>
            <DialogTitle>ລືມລະຫັດຜ່ານ</DialogTitle>
            <DialogDescription>ໃສ່ອີເມວຂອງທ່ານ ພວກເຮົາຈະສົ່ງລິ້ງປ່ຽນລະຫັດຜ່ານໄປໃຫ້</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="you@email.com" autoComplete="email" />
            <Button className="w-full btn-neon" disabled={busy} onClick={handleForgot}>
              {busy ? "ກຳລັງສົ່ງ..." : "ສົ່ງລິ້ງປ່ຽນລະຫັດຜ່ານ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
