import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { CreditCard, Search } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";

interface Card { id: string; name: string; image_url: string | null }

export const Route = createFileRoute("/cards")({
  head: () => ({
    meta: [
      { title: "ບັດເກມທັງໝົດ — Gamelao" },
      { name: "description", content: "ບັດເຕີມເງິນ ແລະ ບັດເກມທຸກປະເພດ ໃນເວັບດຽວ" },
      { property: "og:title", content: "ບັດເກມທັງໝົດ — Gamelao" },
      { property: "og:description", content: "ບັດເຕີມເງິນ ແລະ ບັດເກມທຸກປະເພດ ໃນເວັບດຽວ" },
    ],
  }),
  component: CardsPage,
});

function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("prepaid_cards").select("*").eq("is_active", true).order("sort_order").then(({ data }) => {
      setCards((data ?? []) as Card[]);
    });
  }, []);

  const filtered = cards.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell>
      <div className="px-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="grid place-items-center size-8 rounded-lg bg-primary/15"><CreditCard className="size-4 text-primary" /></div>
          <h1 className="text-lg font-bold">ບັດເກມທັງໝົດ</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ຄົ້ນຫາ" className="pl-9 bg-surface-2" />
        </div>

        {filtered.length === 0 ? (
          <div className="card-tile p-6 text-center text-sm text-muted-foreground">ຍັງບໍ່ມີບັດ</div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filtered.map((c) => (
              <div key={c.id} className="card-tile p-2">
                <div className="aspect-square rounded-lg overflow-hidden bg-surface">
                  {c.image_url && <img src={c.image_url} alt={c.name} className="size-full object-cover" />}
                </div>
                <div className="text-[11px] text-center font-medium mt-2 truncate">{c.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
