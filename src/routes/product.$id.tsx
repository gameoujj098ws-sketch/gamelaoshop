import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { buyStoreProduct } from "@/lib/store.functions";
import { useAuth } from "@/lib/auth-context";
import { formatKip } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Minus, Plus, ShoppingCart, Copy, Facebook, Twitter, MessageCircle, ArrowLeft, Package } from "lucide-react";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "ລາຍລະອຽດສິນຄ້າ — Gamelao" },
      { name: "description", content: "ລາຍລະອຽດສິນຄ້າ ແລະ ສັ່ງຊື້ທັນທີຈາກຮ້ານ Gamelao" },
      { property: "og:title", content: "ລາຍລະອຽດສິນຄ້າ — Gamelao" },
      { property: "og:description", content: "ລາຍລະອຽດສິນຄ້າ ແລະ ສັ່ງຊື້ທັນທີ" },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

interface Prod {
  id: string; name: string; description: string | null; image_url: string | null;
  price: number; original_price: number | null; stock: number;
}

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const buy = useServerFn(buyStoreProduct);
  const [p, setP] = useState<Prod | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("store_products")
        .select("id, name, description, image_url, price, original_price, stock")
        .eq("id", id)
        .maybeSingle();
      setP((data ?? null) as unknown as Prod | null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return <AppShell><div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div></AppShell>;
  }
  if (!p) {
    return <AppShell><div className="p-6 text-center text-sm text-muted-foreground">ບໍ່ພົບສິນຄ້າ</div></AppShell>;
  }

  const out = p.stock <= 0;
  const total = p.price * qty;
  const discount = p.original_price && p.original_price > p.price
    ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  async function handleBuy() {
    if (!user) { navigate({ to: "/auth" }); return; }
    setBusy(true);
    try {
      const res = await buy({ data: { product_id: p!.id, qty } }) as { codes?: string[] };
      toast.success(res.codes?.length ? `ຊື້ສຳເລັດ! ໄດ້ຮັບ ${res.codes.length} ລະຫັດ` : "ຊື້ສຳເລັດ!");
      navigate({ to: "/history", search: { tab: "store" } as never });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ຊື້ບໍ່ສຳເລັດ");
    } finally { setBusy(false); }
  }

  return (
    <AppShell>
      <div className="space-y-4 pb-4">
        <div className="px-4 pt-1">
          <button onClick={() => navigate({ to: "/home" })} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <ArrowLeft className="size-4" /> ກັບຄືນ
          </button>
        </div>

        <div className="px-4">
          <div className="card-tile overflow-hidden">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className={`w-full aspect-square object-cover ${out ? "grayscale" : ""}`} />
            ) : (
              <div className="w-full aspect-square bg-surface" />
            )}
          </div>
        </div>

        <div className="px-4 space-y-2">
          <h1 className="text-xl font-extrabold leading-snug">{p.name}</h1>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-primary">{formatKip(p.price)} ₭</span>
            {discount > 0 && (
              <>
                <span className="text-xs text-muted-foreground line-through">{formatKip(p.original_price!)} ₭</span>
                <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white">-{discount}%</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] font-semibold">
            <span className={`inline-flex items-center gap-1 ${out ? "text-muted-foreground" : "text-success"}`}>
              <span className={`size-2 rounded-full ${out ? "bg-muted-foreground" : "bg-success"}`} />
              {out ? "ສິນຄ້າໝົດ" : "ພ້ອມຂາຍ"}
            </span>
            <span className="inline-flex items-center gap-1 text-primary"><Package className="size-3" /> ເຫຼືອ {p.stock} ອັນ</span>
          </div>
        </div>

        {p.description && (
          <div className="px-4">
            <div className="card-tile p-4">
              <div className="text-sm font-bold mb-1">ລາຍລະອຽດສິນຄ້າ</div>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{p.description}</p>
            </div>
          </div>
        )}

        {/* Share */}
        <div className="px-4">
          <div className="card-tile p-3 space-y-2">
            <div className="text-xs font-bold">ແບ່ງປັນສິນຄ້ານີ້</div>
            <div className="grid grid-cols-4 gap-2">
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer"
                className="grid place-items-center gap-1 rounded-xl bg-surface py-2 text-[10px] font-semibold">
                <Facebook className="size-4 text-primary" /> FB
              </a>
              <a href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer"
                className="grid place-items-center gap-1 rounded-xl bg-surface py-2 text-[10px] font-semibold">
                <MessageCircle className="size-4 text-success" /> Line
              </a>
              <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer"
                className="grid place-items-center gap-1 rounded-xl bg-surface py-2 text-[10px] font-semibold">
                <Twitter className="size-4 text-primary" /> Twitter
              </a>
              <button onClick={() => { navigator.clipboard?.writeText(shareUrl); toast.success("ຄັດລອກລິ້ງແລ້ວ"); }}
                className="grid place-items-center gap-1 rounded-xl bg-surface py-2 text-[10px] font-semibold">
                <Copy className="size-4" /> ຄັດລອກ
              </button>
            </div>
          </div>
        </div>

        {/* Quantity + total */}
        <div className="px-4">
          <div className="card-tile p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">ຈຳນວນ</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid place-items-center size-9 rounded-full bg-surface">
                  <Minus className="size-4" />
                </button>
                <span className="w-8 text-center text-lg font-extrabold">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(Math.max(1, p!.stock), q + 1))} className="grid place-items-center size-9 rounded-full bg-primary text-primary-foreground">
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-3">
              <span className="text-sm font-bold">ລວມທັງໝົດ</span>
              <span className="text-xl font-extrabold text-primary">{formatKip(total)} ₭</span>
            </div>
            <Button className="btn-neon w-full h-12 rounded-full font-bold" disabled={out || busy} onClick={handleBuy}>
              {busy ? <Loader2 className="size-4 animate-spin mr-1" /> : <ShoppingCart className="size-4 mr-1" />}
              {out ? "ສິນຄ້າໝົດ" : "ຢືນຢັນຊື້ສິນຄ້າ"}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
