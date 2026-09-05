import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app/AppShell";
import { ImageSlider } from "@/components/app/Slider";
import { supabase } from "@/integrations/supabase/client";
import { getStorefrontFeed } from "@/lib/storefront.functions";
import { formatKip } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Loader2, Megaphone, ShoppingCart, ShoppingBag, Crown, Trophy, Clock, Package, Gamepad2 } from "lucide-react";

export const Route = createFileRoute("/")({
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
interface Feed {
  recent: { id: string; kind: "store" | "game"; product_name: string; price: number; qty: number; created_at: string; username: string; image_url: string | null }[];
  top: { rank: number; username: string; total: number; count: number }[];
}

function StoreHomePage() {
  const feedFn = useServerFn(getStorefrontFeed);
  const [slides, setSlides] = useState<string[]>([]);
  const [slideInterval, setSlideInterval] = useState(4);
  const [notices, setNotices] = useState<string[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [prods, setProds] = useState<Prod[]>([]);
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<Feed>({ recent: [], top: [] });


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
      // Same slider as the game home page.
      setSlides(Array.isArray(st["slide_images"]) ? (st["slide_images"] as string[]).filter(Boolean) : []);
      setSlideInterval(Number(st["slide_interval"] ?? 4));
      setNotices([String(st["store_notice_1"] ?? ""), String(st["store_notice_2"] ?? "")].filter((n) => n.trim()));
      setCats((c.data ?? []) as unknown as Cat[]);
      setProds((p.data ?? []) as unknown as Prod[]);
      setLoading(false);
      try {
        const f = await feedFn({ data: undefined as never });
        if (alive) setFeed(f as Feed);
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = prods.filter((p) => !p.is_hidden);
  const discount = (p: Prod) =>
    p.original_price && p.original_price > p.price
      ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
      : 0;

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="px-4"><ImageSlider images={slides} intervalSec={slideInterval} /></div>

        {/* Scrolling announcement bar with a pretty announcer badge */}
        {notices.length > 0 && (
          <div className="px-4">
            <div className="flex items-center gap-2 rounded-2xl bg-primary/10 border border-primary/20 p-2 overflow-hidden">
              <span className="grid place-items-center size-9 shrink-0 rounded-xl bg-primary text-primary-foreground shadow">
                <Megaphone className="size-4" />
              </span>
              <div className="relative flex-1 overflow-hidden">
                <div className="marquee whitespace-nowrap text-[13px] font-semibold">
                  {notices.join("  •  ")}　　　{notices.join("  •  ")}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="px-4 space-y-3">
          <div className="border-l-4 border-primary pl-3">
            <h2 className="text-lg font-extrabold">ໝວດໝູ່ແນະນຳສຳລັບລູກຄ້າ</h2>
            <p className="text-xs text-muted-foreground">ເລືອກໝວດໝູ່ທີ່ແນະນຳ</p>
          </div>
          {loading ? (
            <div className="grid place-items-center py-6"><Loader2 className="size-5 animate-spin text-primary" /></div>
          ) : cats.length === 0 ? (
            <p className="text-xs text-muted-foreground">ຍັງບໍ່ມີໝວດໝູ່ — ແອດມິນຍັງບໍ່ໄດ້ເພີ່ມ</p>
          ) : (
            <div className="space-y-3">
              {cats.map((c) => (
                <Link
                  key={c.id}
                  to="/category/$id"
                  params={{ id: c.id }}
                  className="block w-full card-tile overflow-hidden text-left"
                >
                  {c.image_url && (
                    <div className="relative m-2 rounded-2xl overflow-hidden">
                      <img src={c.image_url} alt={c.name} loading="lazy" className="w-full aspect-[16/7] object-cover" />
                      <span className="absolute left-2 bottom-2 rounded-full bg-foreground/70 px-3 py-1 text-[11px] font-semibold text-background">
                        {c.name}
                      </span>
                    </div>
                  )}
                  <div className="px-4 pb-3 pt-1 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-extrabold truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground truncate">ກົດເພື່ອເບິ່ງສິນຄ້າໃນໝວດໝູ່ນີ້</div>
                    </div>
                    <span className="grid place-items-center size-10 rounded-xl bg-primary/10 shrink-0">
                      <ShoppingBag className="size-4 text-primary" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>

          )}
        </div>

        {/* Products */}
        <div className="px-4 space-y-3">
          <div className="border-l-4 border-primary pl-3">
            <h2 className="text-lg font-extrabold">ສິນຄ້າແນະນຳສຳລັບລູກຄ້າ</h2>
            <p className="text-xs text-muted-foreground">ເລືອກຊື້ສິນຄ້າຍອດນິຍົມ</p>
          </div>
          {loading ? null : visible.length === 0 ? (
            <p className="text-xs text-muted-foreground">ຍັງບໍ່ມີສິນຄ້າ — ແອດມິນຍັງບໍ່ໄດ້ເພີ່ມ</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {visible.map((p) => {
                const out = p.stock <= 0;
                return (
                  <div key={p.id} className="card-tile overflow-hidden flex flex-col">
                    <div className="relative">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          loading="lazy"
                          className={`w-full aspect-square object-cover ${out ? "grayscale" : ""}`}
                        />
                      ) : (
                        <div className="w-full aspect-square bg-surface" />
                      )}
                      {discount(p) > 0 && !out && (
                        <span className="absolute top-2 right-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white">
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

        {/* Recent orders (24h) */}
        <div className="px-4">
          <div className="card-tile overflow-hidden">
            <div className="flex items-center gap-3 bg-primary/10 p-3">
              <span className="grid place-items-center size-10 rounded-xl bg-primary text-primary-foreground shrink-0">
                <ShoppingBag className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold">ລາຍການສັ່ງຊື້ລ່າສຸດ</div>
                <div className="text-[11px] text-muted-foreground">ທຸກລາຍການ (24 ຊົ່ວໂມງ)</div>
              </div>
              <span className="rounded-full bg-success px-2.5 py-1 text-[10px] font-bold text-success-foreground">LIVE</span>
            </div>
            {feed.recent.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">ຍັງບໍ່ມີການສັ່ງຊື້ໃນ 24 ຊົ່ວໂມງຜ່ານມາ</p>
            ) : (
              <div className="overflow-hidden p-3">
                <div className="marquee-row gap-2">
                  {[...feed.recent, ...feed.recent].map((r, i) => (
                    <div key={`${r.id}-${i}`} className="w-56 shrink-0 rounded-2xl border border-border/60 bg-surface p-2.5 flex gap-2">
                      {r.image_url ? (
                        <img src={r.image_url} alt={r.product_name} className="size-11 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="size-11 rounded-xl bg-primary/10 shrink-0 grid place-items-center">
                          {r.kind === "game" ? <Gamepad2 className="size-4 text-primary" /> : <ShoppingBag className="size-4 text-primary" />}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-bold truncate">{r.product_name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">ທ່ານ: {r.username}</div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="size-3" /> {timeAgo(r.created_at)}
                          </span>
                          <span className="text-[11px] font-bold text-primary">{formatKip(r.price)} ₭</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Install app */}
        <InstallAppButton />

      </div>
    </AppShell>
  );
}

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 1) return "ຕອນນີ້";
  if (mins < 60) return `${mins} ນາທີກ່ອນ`;
  return `${Math.floor(mins / 60)} ຊົ່ວໂມງກ່ອນ`;
}
