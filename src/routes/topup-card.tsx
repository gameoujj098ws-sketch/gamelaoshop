import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { submitCardTopup, myCardTopups } from "@/lib/cardtopup.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatKip, formatDateTime } from "@/lib/format";
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/topup-card")({
  head: () => ({
    meta: [
      { title: "ເຕີມດ້ວຍບັດເຕີມເງິນ — Gamelao" },
      { name: "description", content: "ໃສ່ເລກບັດເຕີມເງິນ 14 ຕົວ ແລ້ວສົ່ງໃຫ້ແອດມິນກວດສອບ" },
      { property: "og:title", content: "ເຕີມດ້ວຍບັດເຕີມເງິນ — Gamelao" },
      { property: "og:description", content: "ໃສ່ເລກບັດເຕີມເງິນ 14 ຕົວ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TopupCardPage,
});

interface Row {
  id: string;
  card_number: string;
  card_value: number;
  fee_percent: number;
  credit_amount: number;
  status: string;
  admin_note: string | null;
  created_at: string;
}

function TopupCardPage() {
  const { session, loading } = useAuth();
  const submit = useServerFn(submitCardTopup);
  const list = useServerFn(myCardTopups);
  const [card, setCard] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [cfg, setCfg] = useState<{ value: number; fee: number }>({ value: 10000, fee: 0 });

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("card_topup_value, card_topup_fee_percent")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) =>
        setCfg({
          value: Number(data?.card_topup_value ?? 10000),
          fee: Number(data?.card_topup_fee_percent ?? 0),
        }),
      );
  }, []);

  async function refresh() {
    try {
      const res = await list({ data: undefined as never });
      setRows((res.items ?? []) as unknown as Row[]);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (session) void refresh();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [session?.user?.id]);

  const credit = Math.floor((cfg.value * (100 - cfg.fee)) / 100);

  async function send() {
    const digits = card.replace(/\D/g, "");
    if (digits.length !== 14) {
      toast.error("ເລກບັດຕ້ອງເປັນຕົວເລກ 14 ຕົວ");
      return;
    }
    setBusy(true);
    try {
      await submit({ data: { card_number: digits } });
      setCard("");
      toast.success("ສົ່ງແລ້ວ ກຳລັງລໍຖ້າແອດມິນກວດສອບ");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-4 space-y-4">
        <Link to="/topup" className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" /> ກັບຄືນ
        </Link>

        <div className="rounded-2xl bg-gradient-to-br from-primary to-accent p-5 text-primary-foreground">
          <div className="flex items-center gap-2">
            <CreditCard className="size-6" />
            <h1 className="text-base font-bold">ເຕີມດ້ວຍບັດເຕີມເງິນ</h1>
          </div>
          <p className="text-xs opacity-90 mt-1">
            ມູນຄ່າບັດ {formatKip(cfg.value)} ₭ · ຄ່າທຳນຽມ {cfg.fee}% · ຈະໄດ້ຮັບ {formatKip(credit)} ₭
          </p>
        </div>

        {!session ? (
          <div className="card-tile p-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນເຕີມດ້ວຍບັດ</p>
            <Link to="/auth" className="btn-neon inline-block rounded-full px-6 py-2 text-sm">
              ເຂົ້າສູ່ລະບົບ
            </Link>
          </div>
        ) : (
          <div className="card-tile p-5 space-y-3">
            <Label className="text-xs">ເລກບັດ (14 ຕົວເລກ)</Label>
            <Input
              value={card}
              inputMode="numeric"
              maxLength={14}
              onChange={(e) => setCard(e.target.value.replace(/\D/g, "").slice(0, 14))}
              placeholder="12345678901234"
              className="tracking-[0.2em] font-mono"
            />
            <div className="text-[11px] text-muted-foreground">{card.length}/14</div>
            <Button onClick={send} disabled={busy} className="w-full btn-neon">
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" /> ກຳລັງສົ່ງ...
                </>
              ) : (
                "ເຕີມເງິນ"
              )}
            </Button>
          </div>
        )}

        {rows.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-bold">ລາຍການບັດຂອງທ່ານ</div>
            {rows.map((r) => (
              <div key={r.id} className="card-tile p-4 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-sm">{r.card_number}</div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-bold",
                      r.status === "approved"
                        ? "bg-success/10 text-success"
                        : r.status === "rejected"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary",
                    )}
                  >
                    {r.status === "approved"
                      ? "ສຳເລັດ"
                      : r.status === "rejected"
                        ? "ບໍ່ສຳເລັດ"
                        : "ລໍຖ້າແອດມິນກວດສອບ"}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {formatDateTime(r.created_at)} · ຈະໄດ້ຮັບ {formatKip(r.credit_amount)} ₭ (ຄ່າທຳນຽມ {r.fee_percent}%)
                </div>
                {r.admin_note && <div className="text-[11px] text-destructive">{r.admin_note}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
