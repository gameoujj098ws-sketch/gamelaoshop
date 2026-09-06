import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { createTopupRequest, cancelTopup, submitSlip, getActiveTopup } from "@/lib/topup.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import QRCode from "qrcode";
import { CheckCircle2, XCircle, Upload, Copy, Loader2, ArrowLeft, Wallet } from "lucide-react";
import { formatKip } from "@/lib/format";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import qrIcon from "@/assets/topup-qr-bank.png.asset.json";
import codeIcon from "@/assets/topup-code-icon.png.asset.json";
import cardIcon from "@/assets/topup-card-icon.png.asset.json";


export const Route = createFileRoute("/topup")({
  head: () => ({
    meta: [
      { title: "ເຕີມເຄຣດິດ — Gamelao" },
      { name: "description", content: "ເຕີມເງິນເຂົ້າກະເປົາ Gamelao ຜ່ານ QR Code ຫຼື ໂຄດ" },
      { property: "og:title", content: "ເຕີມເຄຣດິດ — Gamelao" },
      { property: "og:description", content: "ເຕີມເງິນເຂົ້າກະເປົາ Gamelao" },
    ],
  }),
  component: TopupPage,
});

const PRESETS = [10_000, 50_000, 100_000, 200_000, 500_000, 1_000_000];
const RECEIVER_NAME = "SOMYONE KHAMKHEUNG MR";

type Step = "choose" | "qr" | "amount";

function TopupPage() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <AppShell>
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <div className="px-4">
          <div className="card-tile p-6 text-center">
            <Wallet className="size-8 text-primary mx-auto mb-3" />
            <h2 className="font-bold">ເຕີມເຄຣດິດ</h2>
            <p className="text-sm text-muted-foreground mt-2 mb-4">
              ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນຈຶ່ງຈະສາມາດເຕີມເງິນໄດ້
            </p>
            <Link to="/auth" className="btn-neon inline-block rounded-full px-6 py-2 text-sm">
              ເຂົ້າສູ່ລະບົບ
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopupFlow />
    </AppShell>
  );
}

function TopupFlow() {
  const [step, setStep] = useState<Step>("choose");
  const [amount, setAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [request, setRequest] = useState<{ id: string; amount: number; expires_at: string; reference_code: string | null } | null>(null);
  const [creating, setCreating] = useState(false);

  const create = useServerFn(createTopupRequest);
  const cancel = useServerFn(cancelTopup);
  const active = useServerFn(getActiveTopup);
  const [restoring, setRestoring] = useState(true);

  // An active QR request survives navigating away: it is restored here and only
  // disappears when it expires, is submitted, or is cancelled explicitly.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await active({ data: undefined as never });
        const req = res.request as { id: string; amount: number; expires_at: string; reference_code: string | null } | null;
        if (alive && req && new Date(req.expires_at).getTime() > Date.now()) {
          setRequest(req);
          setStep("qr");
        }
      } catch {
        /* ignore */
      } finally {
        if (alive) setRestoring(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function proceedQr() {
    if (creating) return;
    const value = customAmount ? parseInt(customAmount, 10) : amount;
    if (!value || value < 1000) {
      toast.error("ກະລຸນາເລືອກ ຫຼື ໃສ່ຈຳນວນເງິນ (ຢ່າງໜ້ອຍ 1,000 ₭)");
      return;
    }
    setCreating(true);
    try {
      const res = await create({ data: { amount: value } });
      setRequest(res.request);
      setStep("qr");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ");
    } finally {
      setCreating(false);
    }
  }

  /** Closes the current request and resets every field back to a fresh start. */
  async function resetFlow(next: Step = "amount") {
    if (request) {
      try { await cancel({ data: { id: request.id } }); } catch { /* ignore */ }
    }
    setRequest(null);
    setAmount(0);
    setCustomAmount("");
    setStep(next);
  }

  if (restoring) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (step === "qr" && request) {
    return (
      <QrStep
        key={request.id}
        request={request}
        onExpire={() => resetFlow("choose")}
        onDone={() => resetFlow("choose")}
      />
    );
  }


  if (step === "amount") {
    return (
      <AmountStep
        amount={amount}
        setAmount={setAmount}
        customAmount={customAmount}
        setCustomAmount={setCustomAmount}
        creating={creating}
        onBack={() => setStep("choose")}
        onNext={proceedQr}
      />
    );
  }

  return <ChooseMethod onQr={() => setStep("amount")} />;
}

interface ChannelSettings {
  enable_card_topup: boolean;
  enable_code_topup: boolean;
  enable_qr_topup: boolean;
  card_topup_value: number;
  card_topup_fee_percent: number;
}

function ChooseMethod({ onQr }: { onQr: () => void }) {
  const { session } = useAuth();
  const [balance, setBalance] = useState(0);
  const [cfg, setCfg] = useState<ChannelSettings | null>(null);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => setBalance(Number(data?.wallet_balance ?? 0)));
  }, [session?.user?.id]);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("enable_card_topup, enable_code_topup, enable_qr_topup, card_topup_value, card_topup_fee_percent")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        setCfg({
          enable_card_topup: data?.enable_card_topup ?? true,
          enable_code_topup: data?.enable_code_topup ?? true,
          enable_qr_topup: data?.enable_qr_topup ?? true,
          card_topup_value: Number(data?.card_topup_value ?? 10000),
          card_topup_fee_percent: Number(data?.card_topup_fee_percent ?? 0),
        });
      });
  }, []);

  if (!cfg) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const none = !cfg.enable_card_topup && !cfg.enable_code_topup && !cfg.enable_qr_topup;

  return (
    <div className="px-4 space-y-3">
      <div className="rounded-3xl bg-gradient-to-br from-primary to-accent p-5 text-primary-foreground">
        <div className="text-xs opacity-90">ຍອດເງິນໃນກະເປົາ</div>
        <div className="text-2xl font-extrabold mt-1">
          {formatKip(balance)} ₭
        </div>
        <div className="text-xs opacity-90 mt-2">ເລືອກຊ່ອງທາງເຕີມເງິນຂ້າງລຸ່ມ</div>
      </div>

      {none && (
        <div className="card-tile p-6 text-center text-sm text-muted-foreground">
          ຊ່ອງທາງເຕີມເງິນທັງໝົດຖືກປິດຢູ່ໃນເວລານີ້
        </div>
      )}

      <div className="space-y-2">
        {cfg.enable_card_topup && (
          <Link
            to="/topup-card"
            className="w-full rounded-2xl border border-border/60 bg-card p-3 flex items-center gap-3 text-left shadow-sm transition hover:border-primary/60 active:scale-[0.99]"
          >
            <img src={cardIcon.url} alt="ບັດເຕີມເງິນ" className="size-14 rounded-xl object-cover shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm">ບັດເຕີມເງິນ</div>
              <div className="text-[11px] text-muted-foreground">
                ໃສ່ເລກບັດ 14 ຕົວ · ມູນຄ່າ {formatKip(cfg.card_topup_value)} ₭
              </div>
            </div>
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-bold text-destructive shrink-0">
              ຄ່າທຳນຽມ {cfg.card_topup_fee_percent}%
            </span>
          </Link>
        )}

        {cfg.enable_code_topup && (
          <Link
            to="/redeem"
            className="w-full rounded-2xl border border-border/60 bg-card p-3 flex items-center gap-3 text-left shadow-sm transition hover:border-primary/60 active:scale-[0.99]"
          >
            <img src={codeIcon.url} alt="ໂຄດ" className="size-14 rounded-xl object-cover shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm">ໃຊ້ໂຄດເຕີມເງິນ</div>
              <div className="text-[11px] text-muted-foreground">ໃສ່ໂຄດ ເງິນເຂົ້າກະເປົາທັນທີ</div>
            </div>
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-bold text-success shrink-0">
              ທັນທີ
            </span>
          </Link>
        )}

        {cfg.enable_qr_topup && (
          <button
            onClick={onQr}
            className="w-full rounded-2xl border border-border/60 bg-card p-3 flex items-center gap-3 text-left shadow-sm transition hover:border-primary/60 active:scale-[0.99] cursor-pointer"
          >
            <img src={qrIcon.url} alt="QR Code" className="size-14 rounded-xl object-cover shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm">ໂອນຜ່ານ QR Code</div>
              <div className="text-[11px] text-muted-foreground">ໂອນຜ່ານທະນາຄານ + ແນບສະລິບ</div>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary shrink-0">
              Auto
            </span>
          </button>
        )}
      </div>
    </div>
  );
}



function AmountStep({
  amount, setAmount, customAmount, setCustomAmount, onBack, onNext, creating,
}: {
  amount: number;
  setAmount: (v: number) => void;
  customAmount: string;
  setCustomAmount: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
  creating?: boolean;
}) {
  return (
    <div className="px-4 space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> ກັບຄືນ
      </button>
      <div className="card-tile p-5">
        <h2 className="text-base font-bold mb-3">ເລືອກຈຳນວນເງິນ</h2>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => { setAmount(p); setCustomAmount(String(p)); }}
              className={cn(
                "rounded-xl border p-3 text-sm font-semibold cursor-pointer transition-all",
                Number(customAmount) === p
                  ? "border-primary bg-primary/10 neon-glow"
                  : "border-border/60 bg-surface hover:border-primary/50",
              )}
            >
              {formatKip(p)} ₭
            </button>
          ))}
        </div>

        <div className="mt-4">
          <Label className="text-xs">ຫຼື ກຳນົດຈຳນວນເອງ</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={customAmount}
            onChange={(e) => { setCustomAmount(e.target.value); setAmount(0); }}
            placeholder="ຈຳນວນເງິນ (ກີບ)"
            className="mt-1"
          />
        </div>
      </div>

      <Button onClick={onNext} disabled={creating} className="w-full btn-neon">
        {creating ? <><Loader2 className="size-4 animate-spin mr-2" /> ກຳລັງສ້າງ...</> : "ສ້າງ QR Code"}
      </Button>
    </div>
  );
}

function QrStep({
  request, onExpire, onDone,
}: {
  request: { id: string; amount: number; expires_at: string; reference_code: string | null };
  onExpire: () => void;
  onDone: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [bankQr, setBankQr] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(request.expires_at).getTime() - Date.now()) / 1000)),
  );
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const submit = useServerFn(submitSlip);
  const fileRef = useRef<HTMLInputElement>(null);

  // Prefer the real bank QR image configured by the admin.
  useEffect(() => {
    supabase
      .from("site_settings")
      .select("bank_qr_image_url")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        const url = data?.bank_qr_image_url?.trim();
        if (url) setBankQr(url);
      });
  }, []);

  // Fallback QR payload — a plain text description customer/bank apps can read.
  const qrPayload = useMemo(
    () => `Gamelao Topup\nBank: ${RECEIVER_NAME}\nAmount: ${request.amount} LAK`,
    [request],
  );


  useEffect(() => {
    QRCode.toDataURL(qrPayload, { width: 320, margin: 1, color: { dark: "#0a0a12", light: "#ffffff" } }).then(setQrDataUrl);
  }, [qrPayload]);

  useEffect(() => {
    const t = setInterval(() => {
      const s = Math.max(0, Math.floor((new Date(request.expires_at).getTime() - Date.now()) / 1000));
      setSecondsLeft(s);
      if (s <= 0) {
        clearInterval(t);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [request.expires_at, onExpire]);

  // Auto-close only on success; failures stay open so the reason can be read.
  useEffect(() => {
    if (!result || !result.ok) return;
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [result, onDone]);


  async function onFile(file: File) {
    if (submitted || busy) return;
    if (!file.type.startsWith("image/")) {
      toast.error("ກະລຸນາເລືອກຮູບພາບ");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error("ຮູບໃຫຍ່ເກີນ 6MB");
      return;
    }
    setSubmitted(true);
    setBusy(true);
    try {
      const b64 = await fileToBase64(file);
      const res = await submit({
        data: { request_id: request.id, image_base64: b64, mime: file.type },
      });
      if (res.ok) {
        setResult({ ok: true, message: "ເຕີມເງິນສຳເລັດ! ຍອດເງິນເຂົ້າແລ້ວ" });
      } else {
        setResult({ ok: false, message: res.reason ?? "ສະລິບບໍ່ຖືກຕ້ອງ" });
      }
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : "ສະລິບບໍ່ຖືກຕ້ອງ" });
    } finally {
      setBusy(false);
    }
  }


  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="px-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">ຢືນຢັນການໂອນເງິນ</div>
        <div className={cn("text-sm font-mono font-bold", secondsLeft < 60 ? "text-destructive" : "text-primary")}>
          {mm}:{ss}
        </div>
      </div>

      <div className="card-tile p-5 text-center space-y-3">
        {bankQr ? (
          <img src={bankQr} alt="QR" className="mx-auto rounded-xl bg-white p-2 size-64 object-contain" />
        ) : qrDataUrl ? (
          <img src={qrDataUrl} alt="QR" className="mx-auto rounded-xl bg-white p-2 size-64 object-contain" />
        ) : (
          <div className="size-64 mx-auto rounded-xl bg-surface grid place-items-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}
        <div className="text-xs text-muted-foreground">ຊື່ບັນຊີຜູ້ຮັບ</div>
        <div className="font-bold flex items-center justify-center gap-2">
          {RECEIVER_NAME}
          <button
            onClick={() => { navigator.clipboard.writeText(RECEIVER_NAME); toast.success("ຄັດລອກແລ້ວ"); }}
            className="opacity-70 hover:opacity-100"
          >
            <Copy className="size-4" />
          </button>
        </div>
        <div className="text-2xl font-bold text-success">{formatKip(request.amount)} ₭</div>
      </div>

      <div className="card-tile p-5">
        <h3 className="font-bold text-sm mb-2">ແນບຮູບສະລິບການໂອນ</h3>
        <p className="text-xs text-muted-foreground mb-3">
          ຫຼັງຈາກໂອນເງິນສຳເລັດ ໃຫ້ແນບຮູບສະລິບ 1 ຮູບ ລະບົບຈະກວດອັດຕະໂນມັດ
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
        />
        <Button
          onClick={() => fileRef.current?.click()}
          disabled={busy || submitted || secondsLeft <= 0}
          className="w-full btn-neon"
        >
          {busy ? (
            <><Loader2 className="size-4 animate-spin mr-2" /> ກຳລັງກວດສະລິບ...</>
          ) : (
            <><Upload className="size-4 mr-2" /> ແນບຮູບສະລິບ</>
          )}
        </Button>
      </div>

      <Button variant="ghost" onClick={onDone} className="w-full text-muted-foreground">
        ຍົກເລີກ
      </Button>

      {result && <ResultPopup ok={result.ok} onClose={onDone} />}

    </div>
  );
}

function ResultPopup({ ok, onClose }: { ok: boolean; message?: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/35 backdrop-blur-sm px-4">
      <div className="w-full max-w-xs card-tile p-6 text-center space-y-3">
        {ok ? (
          <CheckCircle2 className="size-16 text-success mx-auto" />
        ) : (
          <XCircle className="size-16 text-destructive mx-auto" />
        )}
        <div className="text-xl font-extrabold">{ok ? "ສຳເລັດ" : "ບໍ່ສຳເລັດ"}</div>
        <Button onClick={onClose} className="w-full btn-neon">ຕົກລົງ</Button>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      const idx = s.indexOf(",");
      resolve(idx >= 0 ? s.slice(idx + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
