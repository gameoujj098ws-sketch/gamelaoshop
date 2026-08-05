import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Facebook, MessageCircle, Phone, Loader2, Headphones } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "ຕິດຕໍ່ພວກເຮົາ — Gamelao" },
      { name: "description", content: "ຕິດຕໍ່ທີມງານ Gamelao ຜ່ານ Facebook, Discord ຫຼື WhatsApp" },
      { property: "og:title", content: "ຕິດຕໍ່ພວກເຮົາ — Gamelao" },
      { property: "og:description", content: "ຕິດຕໍ່ທີມງານ Gamelao ຜ່ານ Facebook, Discord ຫຼື WhatsApp" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [links, setLinks] = useState<{ fb: string; dc: string; wa: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      const s = (data ?? {}) as Record<string, unknown>;
      setLinks({
        fb: String(s["contact_facebook"] ?? ""),
        dc: String(s["contact_discord"] ?? ""),
        wa: String(s["contact_whatsapp"] ?? ""),
      });
    })();
  }, []);

  const items = [
    { key: "fb", label: "ຕິດຕໍ່ຜ່ານ Facebook", sub: "ສົ່ງຂໍ້ຄວາມຫາເພຈຂອງພວກເຮົາ", icon: Facebook, url: links?.fb },
    { key: "dc", label: "ຕິດຕໍ່ຜ່ານ Discord", sub: "ເຂົ້າຮ່ວມເຊີເວີຂອງພວກເຮົາ", icon: MessageCircle, url: links?.dc },
    { key: "wa", label: "ຕິດຕໍ່ຜ່ານ WhatsApp", sub: "ຕິດຕໍ່ແອດມິນໂດຍກົງ", icon: Phone, url: links?.wa },
  ].filter((i) => (i.url ?? "").trim());

  return (
    <AppShell>
      <div className="px-4 py-4 space-y-4">
        <div className="text-center space-y-1">
          <span className="inline-grid place-items-center size-14 rounded-2xl bg-primary text-primary-foreground">
            <Headphones className="size-6" />
          </span>
          <h1 className="text-xl font-extrabold">ເລືອກຊ່ອງທາງຕິດຕໍ່ທີ່ສະດວກ</h1>
          <p className="text-xs text-muted-foreground">ທີມງານພ້ອມຊ່ວຍເຫຼືອທ່ານທຸກເວລາ</p>
        </div>

        {!links ? (
          <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground">ຍັງບໍ່ມີຊ່ອງທາງຕິດຕໍ່ — ແອດມິນຍັງບໍ່ໄດ້ເພີ່ມລິ້ງ</p>
        ) : (
          <div className="space-y-3">
            {items.map((i) => (
              <a key={i.key} href={i.url!} target="_blank" rel="noreferrer"
                className="card-tile flex items-center gap-3 p-4 active:scale-[0.99] transition">
                <span className="grid place-items-center size-12 rounded-2xl bg-primary/10 text-primary shrink-0">
                  <i.icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold">{i.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{i.sub}</span>
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
