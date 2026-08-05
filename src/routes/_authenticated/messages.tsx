import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { MessageCircle } from "lucide-react";
import { useMarkAllRead } from "@/hooks/use-unread";

interface Msg { id: string; title: string | null; body: string; created_at: string; read_at: string | null }

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({
    meta: [
      { title: "ຂໍ້ຄວາມ — Gamelao" },
      { name: "description", content: "ຂໍ້ຄວາມແຈ້ງເຕືອນຈາກແອດມິນ" },
      { property: "og:title", content: "ຂໍ້ຄວາມ — Gamelao" },
      { property: "og:description", content: "ຂໍ້ຄວາມແຈ້ງເຕືອນຈາກແອດມິນ" },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { user } = useAuth();
  const markAllRead = useMarkAllRead();
  const [items, setItems] = useState<Msg[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      setItems((data ?? []) as Msg[]);
      // Opening this page clears the red dot; new messages bring it back.
      void markAllRead();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  return (
    <div className="px-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="grid place-items-center size-8 rounded-lg bg-primary/15"><MessageCircle className="size-4 text-primary" /></div>
        <h1 className="text-lg font-bold">ຂໍ້ຄວາມ</h1>
      </div>
      {items.length === 0 ? (
        <div className="card-tile p-6 text-center text-sm text-muted-foreground">ຍັງບໍ່ມີຂໍ້ຄວາມ</div>
      ) : items.map((m) => (
        <div key={m.id} className="card-tile p-4">
          {m.title && <div className="font-semibold text-sm">{m.title}</div>}
          <div className="text-sm text-muted-foreground mt-1">{m.body}</div>
          <div className="text-[10px] text-muted-foreground/70 mt-2">{new Date(m.created_at).toLocaleString("lo-LA")}</div>
        </div>
      ))}
    </div>
  );
}
