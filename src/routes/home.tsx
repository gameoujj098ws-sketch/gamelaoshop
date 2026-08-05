import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app/AppShell";
import { ImageSlider } from "@/components/app/Slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { buyStoreProduct } from "@/lib/store.functions";
import { formatKip } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Megaphone, ShoppingCart, Layers } from "lucide-react";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "ສິນຄ້າທົ່ວໄປ — Gamelao" },
      { name: "description", content: "ຮ້ານຂາຍສິນຄ້າທົ່ວໄປ Gamelao — ຊື້ແລ້ວໄດ້ຮັບລະຫັດສິນຄ້າທັນທີ" },
      { property: "og:title", content: "ສິນຄ້າທົ່ວໄປ — Gamelao" },
      { property: "og:description", content: "ຮ້ານຂາຍສິນຄ້າທົ່ວໄປ Gamelao — ຊື້ແລ້ວໄດ້ຮັບທັນທີ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoreHomePage,
});

interface Cat { id: string; name: string; image_url: string | null }
interface Prod {
  id: string; category_id: string | null; name: string; description: string | null;
  image_url: string | null; price: number; original_price: number | null;
  stock: number; is_hidden: boolean;
}

function StoreHomePage() {
  const { session } = useAuth();
  const buy = useServerFn(buyStoreProduct);
  const [slides, setSlides] = useState<string[]>([]);
  const [notices, setNotices] = useState<[string, string]>(["", ""]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [prods, setProds] = useState<Prod[]>([]);
  const [cat, setCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyFor, setBuyFor] = useState<Prod | null>(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [s, c, p] = await Promise.all([
        supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("store_categories").select("id, name, image_url").eq("is_active", true).order("sort_order"),
        supabase.from("store_products").select("*").eq("is_active", true).order("sort_order"),
      ]);
      if (!alive) return;
      const st = (s.data ?? {}) as Record<string, unknown>;
      setSlides(Array.isArray(st["store_slide_images"]) ? (st["store_slide_images"] as string[]) : []);
      setNotices([String(st["store_notice_1"] ?? ""), String(st["store_notice_2"] ?? "")]);
      setCats((c.data ?? []) as unknown as Cat[]);
      setProds((p.data ?? []) as unknown as Prod[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const visible = prods.filter((p) => (cat ? p.category_id === cat : !p.is_hidden));
  const discount = (p: Prod) =>
    p.original_price && p.original_price > p.price
      ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
      : 0;

  return (
    <AppShell>
      <div className="space-y-4">
        {slides.length > 0 && <div className="px-4"><ImageSlider images={slides} intervalSec={4} /></div>}

        <div className="px-4 grid grid-cols-2 gap-2">
          {[notices[0], notices[1]].map((n, i) => (
            <div key={i} className="card-tile p-3 flex items-start gap-2">
              <Megaphone className="size-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] leading-snug">{n || "ຍັງບໍ່ມີປະກາດ"}</p>
            </div>
          ))}
        </div>

        <div className="px-4 space-y-3">
          <div className="border-l-4 border-primary pl-3">
            <h2 className="text-lg font-extrabold flex items-center gap-2">
              <Layers className="size-4 text-primary" /> ໝວດໝູ່ແນະນຳສຳລັບລູກຄ້າ
            </h2>
            <p className="text-xs text-muted-foreground">ເລືອກໝວດໝູ່ທີ່ແນະນຳ</p>
          </div>
          {loading ? (
            <div className="grid place-items-center py-6"><Loader2 className="size-5 animate-spin text-primary" /></div>
          ) : cats.length === 0 ? (
            <p className="text-xs text-muted-foreground">ຍັງບໍ່ມີໝວດໝູ່ — ແອດມິນຍັງບໍ່ໄດ້ເພີ່ມ</p>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => setCat(null)}
                className={`w-full rounded-2xl border px-4 py-2.5 text-sm font-semibold ${cat === null ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-surface text-muted-foreground"}`}
              >
                ທັງໝົດ
              </button>
              {cats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className={`w-full card-tile overflow-hidden text-left transition ${cat === c.id ? "ring-2 ring-primary" : ""}`}
                >
                  {c.image_url ? (
                    <div className="relative m-2 rounded-2xl overflow-hidden">
                      <img src={c.image_url} alt={c.name} loading="lazy" className="w-full aspect-[16/7] object-cover" />
                      <span className="absolute left-2 bottom-2 rounded-full bg-foreground/70 px-3 py-1 text-[11px] font-semibold text-background">
                        {c.name}
                      </span>
                    </div>
                  ) : null}
                  <div className="px-4 pb-3 pt-1 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-extrabold truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground">ເລືອກເບິ່ງສິນຄ້າໃນໝວດນີ້</div>
                    </div>
                    <span className="grid place-items-center size-10 rounded-xl bg-primary/10 shrink-0">
                      <ShoppingCart className="size-4 text-primary" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>


        <div className="px-4 space-y-2">
          <h2 className="text-sm font-bold">ສິນຄ້າທົ່ວໄປ</h2>
          {loading ? null : visible.length === 0 ? (
            <p className="text-xs text-muted-foreground">ຍັງບໍ່ມີສິນຄ້າ — ແອດມິນຍັງບໍ່ໄດ້ເພີ່ມ</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {visible.map((p) => (
                <div key={p.id} className="card-tile overflow-hidden">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} loading="lazy" className="w-full aspect-square object-cover" />
                  ) : <div className="w-full aspect-square bg-surface" />}
                  <div className="p-2 space-y-1">
                    <div className="text-xs font-semibold line-clamp-2">{p.name}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-primary">{formatKip(p.price)} ₭</span>
                      {discount(p) > 0 && (
                        <>
                          <span className="text-[10px] text-muted-foreground line-through">{formatKip(p.original_price ?? 0)}</span>
                          <span className="text-[10px] text-destructive font-semibold">-{discount(p)}%</span>
                        </>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">ຄົງເຫຼືອ {p.stock} ຊິ້ນ</div>
                    <Button size="sm" className="btn-neon w-full h-8 text-xs" disabled={p.stock <= 0}
                      onClick={() => { setBuyFor(p); setQty(1); }}>
                      <ShoppingCart className="size-3.5 mr-1" /> {p.stock <= 0 ? "ສິນຄ້າໝົດ" : "ຊື້ເລີຍ"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!buyFor} onOpenChange={(v) => !v && setBuyFor(null)}>
        <DialogContent className="bg-surface-2 border-border max-w-sm">
          <DialogHeader><DialogTitle>ຢືນຢັນການຊື້</DialogTitle></DialogHeader>
          {buyFor && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {buyFor.image_url && <img src={buyFor.image_url} alt={buyFor.name} className="size-14 rounded-lg object-cover" />}
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{buyFor.name}</div>
                  <div className="text-xs text-primary">{formatKip(buyFor.price)} ₭ / ຊິ້ນ</div>
                </div>
              </div>
              {buyFor.description && <p className="text-xs text-muted-foreground">{buyFor.description}</p>}
              <div>
                <label className="text-xs text-muted-foreground">ຈຳນວນ (ຄົງເຫຼືອ {buyFor.stock})</label>
                <Input className="mt-1" type="number" min={1} max={buyFor.stock} value={qty}
                  onChange={(e) => setQty(Math.min(buyFor.stock, Math.max(1, parseInt(e.target.value || "1", 10))))} />
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span>ລວມ</span><span className="text-primary">{formatKip(buyFor.price * qty)} ₭</span>
              </div>
              {!session ? (
                <Link to="/auth"><Button className="w-full btn-neon">ເຂົ້າສູ່ລະບົບເພື່ອຊື້</Button></Link>
              ) : (
                <Button className="w-full btn-neon" disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const res = await buy({ data: { product_id: buyFor.id, qty } });
                      toast.success(
                        res.codes.length > 0
                          ? `ຊື້ສຳເລັດ! ລະຫັດ: ${res.codes.join(", ")}`
                          : "ຊື້ສຳເລັດ! ເບິ່ງລາຍລະອຽດໃນປະຫວັດສິນຄ້າທົ່ວໄປ",
                        { duration: 12000 },
                      );
                      setBuyFor(null);
                      setProds((prev) => prev.map((x) => (x.id === buyFor.id ? { ...x, stock: x.stock - qty } : x)));
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "ຊື້ບໍ່ສຳເລັດ", { duration: 10000 });
                    } finally { setBusy(false); }
                  }}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : "ຢືນຢັນຊື້ (ຫັກຈາກກະເປົາ)"}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
