import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { formatKip, formatDateTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Wallet, Gamepad2, LogIn, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "ປະຫວັດ — Gamelao" },
      { name: "description", content: "ປະຫວັດການເຕີມເງິນ, ຄຳສັ່ງຊື້ ແລະ ການເຂົ້າໃຊ້ງານ" },
      { property: "og:title", content: "ປະຫວັດ — Gamelao" },
      { property: "og:description", content: "ປະຫວັດການເຕີມເງິນ, ຄຳສັ່ງຊື້ ແລະ ການເຂົ້າໃຊ້ງານ" },
    ],
  }),
  validateSearch: z.object({ tab: z.enum(["wallet", "orders", "login"]).optional() }).parse,
  component: HistoryPage,
});

const TABS = [
  { key: "orders", label: "ປະຫວັດເຕີມເກມ", icon: Gamepad2 },
  { key: "wallet", label: "ປະຫວັດເຕີມເງິນ", icon: Wallet },
  { key: "login", label: "ການເຂົ້າໃຊ້", icon: LogIn },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface OrderRow {
  id: string; category_name: string | null; package_name: string | null; price: number;
  inputs: Record<string, string> | null; status: string; admin_message: string | null;
  created_at: string; updated_at: string;
}
interface TopupRow {
  id: string; amount: number; status: string;
  verify_reason: string | null; verified_amount: number | null; verified_name: string | null;
  verified_ref: string | null; verified_at: string | null; created_at: string; expires_at: string;
}
interface LoginRow { id: string; ip: string | null; user_agent: string | null; created_at: string }

function statusMeta(status: string) {
  switch (status) {
    case "approved":
      return { label: "ສຳເລັດ", cls: "bg-success/15 text-success" };
    case "rejected":
      return { label: "ບໍ່ສຳເລັດ", cls: "bg-destructive/15 text-destructive" };
    case "pending":
      return { label: "ລໍຖ້າກວດສອບ", cls: "bg-primary/15 text-primary" };
    case "expired":
      return { label: "ໝົດເວລາ", cls: "bg-muted text-muted-foreground" };
    case "canceled":
      return { label: "ຍົກເລີກ", cls: "bg-muted text-muted-foreground" };
    default:
      return { label: status, cls: "bg-muted text-muted-foreground" };
  }
}

function Badge({ status }: { status: string }) {
  const s = statusMeta(status);
  return <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold shrink-0", s.cls)}>{s.label}</span>;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground text-xs">{k}</span>
      <span className="text-right text-sm break-all">{v}</span>
    </div>
  );
}

function HistoryPage() {
  const { session, loading: authLoading } = useAuth();
  const search = Route.useSearch();
  const [tab, setTab] = useState<TabKey>(search.tab ?? "orders");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [topups, setTopups] = useState<TopupRow[]>([]);
  const [logins, setLogins] = useState<LoginRow[]>([]);
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [detailTopup, setDetailTopup] = useState<TopupRow | null>(null);

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    (async () => {
      const [o, t, l] = await Promise.all([
        supabase.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
        supabase.from("topup_requests").select("*").eq("user_id", userId).in("status", ["approved", "rejected"]).not("slip_url", "is", null).order("created_at", { ascending: false }).limit(100),
        supabase.from("login_history").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      ]);
      if (!alive) return;
      setOrders((o.data ?? []) as unknown as OrderRow[]);
      setTopups((t.data ?? []) as unknown as TopupRow[]);
      setLogins((l.data ?? []) as unknown as LoginRow[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [userId]);

  if (authLoading) return <AppShell><div className="grid place-items-center py-16"><Loader2 className="size-5 animate-spin text-primary" /></div></AppShell>;

  if (!session) {
    return (
      <AppShell>
        <div className="px-4">
          <div className="card-tile p-6 text-center space-y-3">
            <h2 className="font-bold">ປະຫວັດ</h2>
            <p className="text-sm text-muted-foreground">ກະລຸນາເຂົ້າສູ່ລະບົບເພື່ອເບິ່ງປະຫວັດຂອງທ່ານ</p>
            <Link to="/auth"><Button className="btn-neon">ເຂົ້າສູ່ລະບົບ</Button></Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-4 space-y-3">
        <h1 className="text-lg font-bold">ປະຫວັດ</h1>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("rounded-full px-4 py-1.5 text-xs whitespace-nowrap border cursor-pointer",
                tab === t.key ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-surface text-muted-foreground")}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid place-items-center py-12"><Loader2 className="size-5 animate-spin text-primary" /></div>
        ) : tab === "orders" ? (
          orders.length === 0 ? <Empty text="ຍັງບໍ່ມີປະຫວັດການເຕີມເກມ" /> : (
            <div className="space-y-2">
              {orders.map((o) => (
                <button key={o.id} onClick={() => setDetailOrder(o)} className="card-tile p-4 w-full text-left space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{o.category_name} — {o.package_name}</div>
                      <div className="text-[11px] text-muted-foreground">{formatDateTime(o.created_at)} · {timeAgo(o.created_at)}</div>
                    </div>
                    <Badge status={o.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-success">-{formatKip(o.price)} ₭</span>
                    <span className="text-xs text-primary">ເບິ່ງລາຍລະອຽດ</span>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : tab === "wallet" ? (
          topups.length === 0 ? <Empty text="ຍັງບໍ່ມີປະຫວັດການເຕີມເງິນ" /> : (
            <div className="space-y-2">
              {topups.map((t) => (
                <button key={t.id} onClick={() => setDetailTopup(t)} className="card-tile p-4 w-full text-left space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">ເຕີມເງິນຜ່ານ QR Code</div>
                      <div className="text-[11px] text-muted-foreground">{formatDateTime(t.created_at)} · {timeAgo(t.created_at)}</div>
                    </div>
                    <Badge status={t.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm font-semibold", t.status === "approved" ? "text-success" : "text-muted-foreground")}>
                      +{formatKip(t.amount)} ₭
                    </span>
                    <span className="text-xs text-primary">ເບິ່ງລາຍລະອຽດ</span>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : (
          logins.length === 0 ? <Empty text="ຍັງບໍ່ມີປະຫວັດການເຂົ້າໃຊ້" /> : (
            <div className="space-y-2">
              {logins.map((l) => (
                <div key={l.id} className="card-tile p-4 space-y-1">
                  <div className="text-sm font-semibold">ເຂົ້າສູ່ລະບົບ</div>
                  <div className="text-[11px] text-muted-foreground">{formatDateTime(l.created_at)} · {timeAgo(l.created_at)}</div>
                  {l.user_agent && <div className="text-[11px] text-muted-foreground break-all">{l.user_agent}</div>}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <Dialog open={!!detailOrder} onOpenChange={(v) => !v && setDetailOrder(null)}>
        <DialogContent className="bg-surface-2 border-border max-w-sm">
          <DialogHeader><DialogTitle>ລາຍລະອຽດການເຕີມເກມ</DialogTitle></DialogHeader>
          {detailOrder && (
            <div className="space-y-2">
              <div className="flex justify-end"><Badge status={detailOrder.status} /></div>
              <Row k="ເກມ" v={detailOrder.category_name ?? "-"} />
              <Row k="ແພັກເກັດ" v={detailOrder.package_name ?? "-"} />
              <Row k="ລາຄາ" v={`${formatKip(detailOrder.price)} ₭`} />
              {detailOrder.inputs && Object.entries(detailOrder.inputs).map(([k, v]) => <Row key={k} k={k} v={String(v)} />)}
              <Row k="ວັນທີສັ່ງຊື້" v={`${formatDateTime(detailOrder.created_at)} (${timeAgo(detailOrder.created_at)})`} />
              {detailOrder.status !== "pending" && <Row k="ວັນທີດຳເນີນການ" v={formatDateTime(detailOrder.updated_at)} />}
              {detailOrder.admin_message && <Row k="ໝາຍເຫດຈາກແອດມິນ" v={detailOrder.admin_message} />}
              {detailOrder.status === "rejected" && (
                <p className="text-xs text-destructive pt-1">ເງິນຈຳນວນ {formatKip(detailOrder.price)} ₭ ຖືກຄືນເຂົ້າກະເປົາຂອງທ່ານແລ້ວ</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailTopup} onOpenChange={(v) => !v && setDetailTopup(null)}>
        <DialogContent className="bg-surface-2 border-border max-w-sm">
          <DialogHeader><DialogTitle>ລາຍລະອຽດການເຕີມເງິນ</DialogTitle></DialogHeader>
          {detailTopup && (
            <div className="space-y-2">
              <div className="flex justify-end"><Badge status={detailTopup.status} /></div>
              <Row k="ຊ່ອງທາງ" v="QR Code (ໂອນຜ່ານທະນາຄານ)" />
              <Row k="ຈຳນວນທີ່ສ້າງ" v={`${formatKip(detailTopup.amount)} ₭`} />
              <Row k="ວັນທີສ້າງ" v={`${formatDateTime(detailTopup.created_at)} (${timeAgo(detailTopup.created_at)})`} />
              {detailTopup.status === "approved" && (
                <>
                  <Row k="ຢືນຢັນເມື່ອ" v={formatDateTime(detailTopup.verified_at)} />
                  {detailTopup.verified_amount != null && <Row k="ຈຳນວນໃນສະລິບ" v={`${formatKip(detailTopup.verified_amount)} ₭`} />}
                  {detailTopup.verified_name && <Row k="ຊື່ຜູ້ຮັບ" v={detailTopup.verified_name} />}
                  
                  <p className="text-xs text-success pt-1">ລະບົບກວດສອບສຳເລັດ ເງິນເຂົ້າກະເປົາແລ້ວ</p>
                </>
              )}
              {detailTopup.status === "rejected" && (
                <p className="text-xs text-destructive pt-1">ລະບົບກວດສອບບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່ ຫຼື ຕິດຕໍ່ແອດມິນ</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground text-center py-10">{text}</p>;
}
