import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flame, CreditCard, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app/AppShell";
import { ImageSlider, AdPopup } from "@/components/app/Slider";

interface Category {
  id: string;
  name: string;
  image_url: string | null;
  section: string;
}
interface Card {
  id: string;
  name: string;
  image_url: string | null;
}

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "Game Lao Shop" },
      { name: "description", content: "ເຕີນເກມ" },
      { property: "og:title", content: "Game Lao Shop" },
      { property: "og:description", content: "ເຕີນເກມ" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [popular, setPopular] = useState<Category[]>([]);
  const [others, setOthers] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [slides, setSlides] = useState<string[]>([]);
  const [slideInterval, setSlideInterval] = useState(4);
  const [ads, setAds] = useState<string[]>([]);
  const [showAd, setShowAd] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const [{ data: cats }, { data: cs }, { data: st }] = await Promise.all([
        supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("prepaid_cards").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("site_settings").select("slide_images, slide_interval, ad_images").eq("id", 1).maybeSingle(),
      ]);
      const list = (cats ?? []) as Category[];
      setPopular(list.filter((c) => c.section === "popular"));
      setOthers(list.filter((c) => c.section !== "popular"));
      setCards((cs ?? []) as Card[]);

      const s = st as { slide_images?: string[]; slide_interval?: number; ad_images?: string[] } | null;
      const slideList = Array.isArray(s?.slide_images) ? s!.slide_images.filter(Boolean) : [];
      const adList = Array.isArray(s?.ad_images) ? s!.ad_images.filter(Boolean) : [];
      setSlides(slideList);
      setSlideInterval(Number(s?.slide_interval ?? 4));
      setAds(adList);

      // Show the ad popup once per browser session.
      if (adList.length > 0 && typeof window !== "undefined") {
        if (!window.sessionStorage.getItem("ad-shown")) {
          window.sessionStorage.setItem("ad-shown", "1");
          setShowAd(true);
        }
      }
    })();
  }, []);

  function openTopup(c: Category) {
    navigate({ to: "/game/$id", params: { id: c.id } });
  }

  return (
    <AppShell>
      <div className="px-4 space-y-6">
        <ImageSlider images={slides} intervalSec={slideInterval} />

        <SectionTitle icon={<Flame className="size-4 text-primary" />} title="ເກມທີ່ໄດ້ຮັບຄວາມນິຍົມ" />

        {popular.length === 0 ? (
          <EmptyState text="ຍັງບໍ່ມີສິນຄ້າ — ລໍຖ້າແອດມິນເພີ່ມ" />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {popular.map((c) => (
              <GameTile key={c.id} category={c} onClick={() => openTopup(c)} hot />
            ))}
          </div>
        )}

        <SectionTitle icon={<CreditCard className="size-4 text-accent" />} title="ບັດເຕີມເງິນ" />
        {cards.length === 0 ? (
          <EmptyState text="ຍັງບໍ່ມີບັດເຕີມເງິນ" />
        ) : (
          <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
            <div className="flex gap-3 min-w-max pb-1">
              {cards.map((c) => (
                <Link
                  key={c.id}
                  to="/card/$id"
                  params={{ id: c.id }}
                  className="w-40 card-tile overflow-hidden shrink-0 block cursor-pointer transition hover:border-primary/60 active:scale-[0.98]"
                >
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square bg-surface" />
                  )}
                  <div className="p-2 text-center text-xs font-medium truncate">{c.name}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <SectionTitle icon={<Gamepad2 className="size-4 text-primary" />} title="ເກມອື່ນໆ" />
        {others.length === 0 ? (
          <EmptyState text="ຍັງບໍ່ໄດ້ເພີ່ມ" />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {others.map((c) => (
              <GameTile key={c.id} category={c} onClick={() => openTopup(c)} />
            ))}
          </div>
        )}
      </div>

      {showAd && <AdPopup images={ads} onClose={() => setShowAd(false)} />}
    </AppShell>
  );
}


function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid place-items-center size-6 rounded-lg bg-primary/15">{icon}</span>
      <h2 className="text-base font-bold">{title}</h2>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="card-tile p-6 text-center text-sm text-muted-foreground">{text}</div>
  );
}

function GameTile({
  category, onClick, hot,
}: { category: Category; onClick: () => void; hot?: boolean }) {
  return (
    <div className="card-tile p-2 flex flex-col gap-2">
      <div className="relative aspect-square rounded-lg overflow-hidden bg-surface">
        {category.image_url && (
          <img src={category.image_url} alt={category.name} className="size-full object-cover" />
        )}
        {hot && (
          <span className="absolute top-1 right-1 rounded-md bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5">
            HOT
          </span>
        )}
      </div>
      <div className="text-[11px] text-center font-medium truncate">{category.name}</div>
      <Button size="sm" onClick={onClick} className="btn-neon h-7 text-xs">
        ເຕີມເກມ
      </Button>
    </div>
  );
}
