import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatKip } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { placeCardOrder } from "@/lib/cards.functions";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Star, AlertTriangle } from "lucide-react";

interface Card { id: string; name: string; image_url: string | null }
interface Field { id: string; label: string; placeholder: string | null; sort_order: number }
interface Pkg {
  id: string; name: string; price: number; sort_order: number;
  image_url: string | null; description: string | null;
  original_price: number | null; is_best_seller: boolean; stock: number;
}

export const Route = createFileRoute("/card/$id")({
  head: () => ({
    meta: [
      { title: "ບັດເຕີມເງິນ — Gamelao" },
      { name: "description", content: "ເລືອກແພັກເກັດບັດເຕີມເງິນ ຊື້ໄດ້ທັນທີ" },
      { property: "og:title", content: "ບັດເຕີມເງິນ — Gamelao" },
      { property: "og:description", content: "ເລືອກແພັກເກັດບັດເຕີມເງິນ ຊື້ໄດ້ທັນທີ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CardDetailPage,
});

function StepBadge({ n }: { n: number }) {
  return (
    <span className="grid place-items-center size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
      {n}
    </span>
  );
}

function CardDetailPage() {
  const { id } = useParams({ from: "/card/$id" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const place = useServerFn(placeCardOrder);

  const [card, setCard] = useState<Card | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSel(null);
    setValues({});
    (async () => {
      setLoading(true);
      const [{ data: c }, { data: f }, { data: p }] = await Promise.all([
        supabase.from("prepaid_cards").select("id, name, image_url").eq("id", id).maybeSingle(),
        supabase.from("card_input_fields").select("*").eq("card_id", id).order("sort_order"),
        supabase.from("card_packages").select("*").eq("card_id", id).eq("is_active", true).order("sort_order"),
      ]);
      setCard((c ?? null) as Card | null);
      setFields((f ?? []) as Field[]);
      setPkgs((p ?? []) as Pkg[]);
      setLoading(false);
    })();
  }, [id]);

  const selected = pkgs.find((p) => p.id === sel) ?? null;

  async function confirm() {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!selected) { toast.error("ກະລຸນາເລືອກແພັກເກັດ"); return; }
    for (const f of fields) {
      if (!values[f.id]?.trim()) { toast.error(`ກະລຸນາໃສ່ ${f.label}`); return; }
    }
    setBusy(true);
    try {
      const inputs: Record<string, string> = {};
      for (const f of fields) inputs[f.label] = values[f.id];
      const res = await place({ data: { card_id: id, card_package_id: selected.id, inputs } });
      if (res.ok) {
        toast.success("ສັ່ງຊື້ສຳເລັດ — ກຳລັງລໍຖ້າແອດມິນອະນຸມັດ");
        navigate({ to: "/history" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <AppShell><div className="grid place-items-center py-16"><Loader2 className="size-6 animate-spin text-primary" /></div></AppShell>;
  }
  if (!card) {
    return <AppShell><div className="px-4 py-10 text-center text-sm text-muted-foreground">ບໍ່ພົບບັດນີ້</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="px-4 space-y-4 pb-6">
        <div className="card-tile p-5 flex flex-col items-center gap-3">
          <div className="size-28 rounded-2xl overflow-hidden bg-surface">
            {card.image_url && <img src={card.image_url} alt={card.name} className="size-full object-cover" />}
          </div>
          <h1 className="text-xl font-bold text-primary underline underline-offset-4">{card.name}</h1>
        </div>

        <div className="card-tile p-4 space-y-3">
          <div className="flex items-center gap-2">
            <StepBadge n={1} />
            <h2 className="font-bold">ຂໍ້ມູນຜູ້ຊື້</h2>
          </div>
          {fields.length === 0 ? (
            <p className="text-xs text-muted-foreground">ບໍ່ຕ້ອງໃສ່ຂໍ້ມູນເພີ່ມສຳລັບບັດນີ້</p>
          ) : (
            fields.map((f) => (
              <div key={f.id}>
                <div className="text-xs text-muted-foreground mb-1">{f.label}</div>
                <Input
                  value={values[f.id] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                  placeholder={f.placeholder ?? f.label}
                  className="bg-surface"
                />
              </div>
            ))
          )}
        </div>

        <div className="card-tile p-4 space-y-3">
          <div className="flex items-center gap-2">
            <StepBadge n={2} />
            <h2 className="font-bold">ເລືອກແພັກເກັດ</h2>
          </div>
          {pkgs.length === 0 ? (
            <p className="text-xs text-muted-foreground">ຍັງບໍ່ມີແພັກເກັດ</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {pkgs.map((p) => {
                const off = p.original_price && p.original_price > p.price
                  ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
                  : 0;
                const active = sel === p.id;
                const out = Number(p.stock ?? 0) <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={out}
                    onClick={() => setSel(p.id)}
                    className={cn(
                      "relative rounded-2xl border p-3 pt-6 text-center transition-all cursor-pointer flex flex-col items-center gap-1.5",
                      out && "opacity-50 cursor-not-allowed",
                      active ? "border-primary bg-primary/10 neon-glow" : "border-border/60 bg-surface hover:border-primary/50",
                    )}
                  >
                    {p.is_best_seller && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent text-accent-foreground text-[9px] font-bold px-2 py-0.5 flex items-center gap-1">
                        <Star className="size-2.5" /> ຂາຍດີທີ່ສຸດ
                      </span>
                    )}
                    {off > 0 && (
                      <span className="absolute top-1.5 left-1.5 rounded-md bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5">
                        ລົດ {off}%
                      </span>
                    )}
                    {p.image_url && <img src={p.image_url} alt={p.name} className="size-12 object-contain" />}
                    <div className="text-sm font-bold text-primary">{p.name}</div>
                    {p.description && (
                      <div className="text-[10px] leading-tight text-muted-foreground whitespace-pre-line">{p.description}</div>
                    )}
                    <div className="text-[10px] text-muted-foreground">
                      {out ? "ສິນຄ້າໝົດ" : `ຍັງເຫຼືອ ${p.stock} ອັນ`}
                    </div>
                    <div className="mt-1 w-full rounded-full bg-warning px-2 py-1 text-xs font-bold text-warning-foreground">
                      {formatKip(p.price)} ກີບ
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="card-tile p-4 space-y-3">
          <div className="flex items-center gap-2">
            <StepBadge n={3} />
            <h2 className="font-bold">ຢືນຢັນການຊຳລະເງິນ</h2>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground flex gap-2">
            <AlertTriangle className="size-4 text-warning shrink-0" />
            ກະລຸນາກວດສອບຂໍ້ມູນ ແລະ ແພັກເກັດໃຫ້ຖືກຕ້ອງກ່ອນຢືນຢັນ.
          </p>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-muted-foreground">ຈຳນວນທີ່ຕ້ອງຈ່າຍ</div>
              <div className="text-xl font-bold">{formatKip(selected?.price ?? 0)} ກີບ</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">ຈຳນວນ</div>
              <div className="text-xl font-bold">{selected ? 1 : 0}</div>
            </div>
          </div>
          <Button onClick={confirm} disabled={busy || !selected} className="w-full btn-neon">
            {busy ? "ກຳລັງດຳເນີນການ..." : "ຢືນຢັນ"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
