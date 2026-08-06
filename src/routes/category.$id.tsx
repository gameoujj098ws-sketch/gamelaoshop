import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { formatKip } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, Package, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/category/$id")({
  head: () => ({
    meta: [
      { title: "ໝວດໝູ່ສິນຄ້າ — Gamelao" },
      { name: "description", content: "ສິນຄ້າທັງໝົດໃນໝວດໝູ່ນີ້ຂອງຮ້ານ Gamelao" },
      { property: "og:title", content: "ໝວດໝູ່ສິນຄ້າ — Gamelao" },
      { property: "og:description", content: "ສິນຄ້າທັງໝົດໃນໝວດໝູ່ນີ້" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CategoryPage,
});

interface Prod {
  id: string; name: string; image_url: string | null;
  price: number; original_price: number | null; stock: number;
}

function CategoryPage() {
  const { id } = Route.useParams();
  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [prods, setProds] = useState<Prod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from("store_categories").select("name, image_url").eq("id", id).maybeSingle(),
        supabase
          .from("store_products")
          .select("id, name, image_url, price, original_price, stock")
          .eq("category_id", id)
          .eq("is_active", true)
          .order("sort_order"),
      ]);
      if (!alive) return;
      setName((c.data?.name as string) ?? "ໝວດໝູ່");
      setImage((c.data?.image_url as string) ?? null);
      setProds((p.data ?? []) as unknown as Prod[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  const discount = (p: Prod) =>
    p.original_price && p.original_price > p.price
      ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
      : 0;

  return (
    <AppShell>
      <div className="px-4 space-y-4">
        <Link to="/home" className="inline-flex items-center gap-1 text-xs text-primary">
          <ChevronLeft className="size-4" /> ກັບໜ້າສິນຄ້າທົ່ວໄປ
        </Link>

        {image && (
          <div className="rounded-2xl overflow-hidden border border-border/60">
            <img src={image} alt={name} className="w-full aspect-[16/7] object-cover" />
          </div>
        )}

        <div className="border-l-4 border-primary pl-3">
          <h1 className="text-lg font-extrabold">{name}</h1>
          <p className="text-xs text-muted-foreground">ສິນຄ້າໃນໝວດໝູ່ນີ້ ({prods.length})</p>
        </div>

        {loading ? (
          <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin text-primary" /></div>
        ) : prods.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">ຍັງບໍ່ມີສິນຄ້າໃນໝວດໝູ່ນີ້</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {prods.map((p) => {
              const out = p.stock <= 0;
              return (
                <div key={p.id} className="card-tile overflow-hidden flex flex-col">
                  <div className="relative">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} loading="lazy"
                        className={`w-full aspect-square object-cover ${out ? "grayscale" : ""}`} />
                    ) : (
                      <div className="w-full aspect-square bg-surface" />
                    )}
                    {discount(p) > 0 && !out && (
                      <span className="absolute top-2 right-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                        -{discount(p)}%
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 space-y-1.5 flex-1 flex flex-col">
                    <div className="text-[13px] font-bold line-clamp-1">{p.name}</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-extrabold text-primary">{formatKip(p.price)}</span>
                      {p.original_price && p.original_price > p.price && (
                        <span className="text-[10px] text-muted-foreground line-through">{formatKip(p.original_price)}</span>
                      )}
                    </div>
                    <Link to="/product/$id" params={{ id: p.id }} className="mt-auto block">
                      <Button size="sm" className="btn-neon w-full h-9 text-xs rounded-full" disabled={out}>
                        <ShoppingCart className="size-3.5 mr-1" /> {out ? "ສິນຄ້າໝົດ" : "ຊື້ສິນຄ້າ"}
                      </Button>
                    </Link>
                    <div className="flex items-center justify-between text-[10px] font-semibold pt-0.5">
                      <span className={`inline-flex items-center gap-1 ${out ? "text-muted-foreground" : "text-success"}`}>
                        <span className={`size-2 rounded-full ${out ? "bg-muted-foreground" : "bg-success"}`} />
                        {out ? "ສິນຄ້າໝົດ" : "ພ້ອມຂາຍ"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Package className="size-3" /> ເຫຼືອ {p.stock} ອັນ
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
