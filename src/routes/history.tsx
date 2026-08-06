import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { formatKip, formatDateTime, formatDateTimeFull, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Wallet, Gamepad2, LogIn, ShoppingBag, Copy, Check } from "lucide-react";


export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "ປະຫວັດ — Gamelao" },
      { name: "description", content: "ປະຫວັດການເຕີມເງິນ, ຄຳສັ່ງຊື້ ແລະ ການເຂົ້າໃຊ້ງານ" },
      { property: "og:title", content: "ປະຫວັດ — Gamelao" },
      { property: "og:description", content: "ປະຫວັດການເຕີມເງິນ, ຄຳສັ່ງຊື້ ແລະ ການເຂົ້າໃຊ້ງານ" },
    ],
  }),
  validateSearch: z.object({ tab: z.enum(["wallet", "orders", "login", "store"]).optional() }).parse,
  component: HistoryPage,
});

const TABS = [
  { key: "orders", label: "ປະຫວັດເຕີມເກມ", icon: Gamepad2 },
  { key: "store", label: "ປະຫວັດສິນຄ້າທົ່ວໄປ", icon: ShoppingBag },
  { key: "wallet", label: "ປະຫວັດເຕີມເງິນ", icon: Wallet },
  { key: "login", label: "ການເຂົ້າໃຊ້", icon: LogIn },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface OrderRow {
  id: string; category_name: string | null; package_name: string | null; price: number;
  inputs: Record<string, string> | null; status: string; admin_message: string | null;
  created_at: string; updated_at: string;
  package_id: string | null; card_package_id: string | null;
}
interface TopupRow {
  id: string; amount: number; status: string;
  verify_reason: string | null; verified_amount: number | null; verified_name: string | null;
  verified_ref: string | null; verified_at: string | null; created_at: string; expires_at: string;
}
interface StoreRow {
  id: string; product_id: string | null; product_name: string | null; price: number; qty: number;
  codes: string[] | null; status: string; created_at: string;
}
interface LoginRow { id: string; ip: string | null; user_agent: string | null; created_at: string }

/** Small inline copy-to-clipboard button used in the receipt dialogs. */
function CopyButton({ value, label }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success("ຄັດລອກແລ້ວ");
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("ຄັດລອກບໍ່ໄດ້");
        }
      }}
      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary shrink-0"
    >
      {done ? <Check className="size-3" /> : <Copy className="size-3" />}
      {label ?? "ຄັດລອກ"}
    </button>
  );
}

/** Receipt line with an optional copy action for the value. */
function ReceiptRow({ k, v, copy }: { k: string; v: string; copy?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/40 py-2 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{k}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-right text-sm font-semibold break-all">{v}</span>
        {copy && v !== "-" && <CopyButton value={v} label="" />}
      </div>
    </div>
  );
}




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
  const [storeOrders, setStoreOrders] = useState<StoreRow[]>([]);
  const [logins, setLogins] = useState<LoginRow[]>([]);
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [detailTopup, setDetailTopup] = useState<TopupRow | null>(null);
  const [detailStore, setDetailStore] = useState<StoreRow | null>(null);
  const [walletFilter, setWalletFilter] = useState<"approved" | "rejected">("approved");
  const [imgMap, setImgMap] = useState<Record<string, string>>({});

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    (async () => {
      const [o, t, l, s] = await Promise.all([
        supabase.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
        supabase.from("topup_requests").select("*").eq("user_id", userId).in("status", ["approved", "rejected"]).not("slip_url", "is", null).order("created_at", { ascending: false }).limit(100),
        supabase.from("login_history").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        supabase.from("store_orders").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      ]);
      if (!alive) return;
      const orderRows = (o.data ?? []) as unknown as OrderRow[];
      const storeRows = (s.data ?? []) as unknown as StoreRow[];
      setOrders(orderRows);
      setTopups((t.data ?? []) as unknown as TopupRow[]);
      setLogins((l.data ?? []) as unknown as LoginRow[]);
      setStoreOrders(storeRows);
      setLoading(false);

      // Thumbnails for the receipt dialogs: game packages, card packages and
      // general-store products.
      const pkgIds = [...new Set(orderRows.map((r) => r.package_id).filter(Boolean))] as string[];
      const cardIds = [...new Set(orderRows.map((r) => r.card_package_id).filter(Boolean))] as string[];
      const prodIds = [...new Set(storeRows.map((r) => r.product_id).filter(Boolean))] as string[];
      const [pk, ck, pr] = await Promise.all([
        pkgIds.length ? supabase.from("packages").select("id, image_url").in("id", pkgIds) : Promise.resolve({ data: [] as any[] }),
        cardIds.length ? supabase.from("card_packages").select("id, image_url").in("id", cardIds) : Promise.resolve({ data: [] as any[] }),
        prodIds.length ? supabase.from("store_products").select("id, image_url").in("id", prodIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      if (!alive) return;
      const next: Record<string, string> = {};
      for (const row of [...(pk.data ?? []), ...(ck.data ?? []), ...(pr.data ?? [])] as any[]) {
        if (row?.image_url) next[row.id as string] = row.image_url as string;
      }
      setImgMap(next);
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
        ) : tab === "store" ? (
          storeOrders.length === 0 ? <Empty text="ຍັງບໍ່ມີປະຫວັດການຊື້ສິນຄ້າທົ່ວໄປ" /> : (
            <div className="space-y-2">
              {storeOrders.map((s) => (
                <button key={s.id} onClick={() => setDetailStore(s)} className="card-tile p-4 w-full text-left space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{s.product_name} × {s.qty}</div>
                      <div className="text-[11px] text-muted-foreground">{formatDateTime(s.created_at)} · {timeAgo(s.created_at)}</div>
                    </div>
                    <Badge status={s.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-success">-{formatKip(s.price)} ₭</span>
                    <span className="text-xs text-primary">ເບິ່ງລາຍລະອຽດ</span>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : tab === "wallet" ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              {([["approved", "ສຳເລັດ"], ["rejected", "ບໍ່ສຳເລັດ"]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setWalletFilter(k)}
                  className={cn("flex-1 rounded-full px-4 py-1.5 text-xs border",
                    walletFilter === k
                      ? k === "approved" ? "border-success bg-success/10 text-success" : "border-destructive bg-destructive/10 text-destructive"
                      : "border-border/60 bg-surface text-muted-foreground")}>
                  {label} ({topups.filter((t) => t.status === k).length})
                </button>
              ))}
            </div>
            {topups.filter((t) => t.status === walletFilter).length === 0 ? (
              <Empty text={walletFilter === "approved" ? "ຍັງບໍ່ມີການເຕີມເງິນທີ່ສຳເລັດ" : "ຍັງບໍ່ມີການເຕີມເງິນທີ່ບໍ່ສຳເລັດ"} />
            ) : (
              <div className="space-y-2">
                {topups.filter((t) => t.status === walletFilter).map((t) => (
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
            )}
          </div>
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
        <DialogContent className="bg-surface-2 border-border max-w-sm p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0"><DialogTitle>ໃບບິນການເຕີມເກມ</DialogTitle></DialogHeader>
          {detailOrder && (
            <div className="p-4 pt-2">
              <div className="rounded-3xl border border-border/60 bg-surface p-4 space-y-3">
                {/* Product image + name */}
                <div className="flex flex-col items-center gap-2 pb-2 border-b border-dashed border-border/60">
                  {(() => {
                    const img =
                      (detailOrder.package_id && imgMap[detailOrder.package_id]) ||
                      (detailOrder.card_package_id && imgMap[detailOrder.card_package_id]) ||
                      null;
                    return img ? (
                      <img src={img} alt={detailOrder.category_name ?? "ສິນຄ້າ"} className="size-20 rounded-2xl object-cover" />
                    ) : (
                      <div className="grid place-items-center size-20 rounded-2xl bg-primary/10">
                        <Gamepad2 className="size-8 text-primary" />
                      </div>
                    );
                  })()}
                  <div className="text-base font-extrabold text-center">{detailOrder.category_name ?? "-"}</div>
                  <Badge status={detailOrder.status} />
                </div>

                <ReceiptRow k="ເລກອ້າງອີງ" v={detailOrder.id.slice(0, 8).toUpperCase()} copy />
                <ReceiptRow k="ແພັກເກັດ" v={detailOrder.package_name ?? "-"} />
                {detailOrder.inputs &&
                  Object.entries(detailOrder.inputs).map(([k, v]) => (
                    <ReceiptRow key={k} k={k} v={String(v)} copy />
                  ))}
                <ReceiptRow k="ລາຄາ" v={`${formatKip(detailOrder.price)} ₭`} />
                <ReceiptRow k="ວັນທີ / ເວລາ" v={formatDateTimeFull(detailOrder.created_at)} />
                {detailOrder.status !== "pending" && (
                  <ReceiptRow k="ດຳເນີນການເມື່ອ" v={formatDateTimeFull(detailOrder.updated_at)} />
                )}
                {detailOrder.admin_message && <ReceiptRow k="ໝາຍເຫດຈາກແອດມິນ" v={detailOrder.admin_message} />}
                {detailOrder.status === "rejected" && (
                  <p className="text-xs text-destructive pt-1">
                    ເງິນຈຳນວນ {formatKip(detailOrder.price)} ₭ ຖືກຄືນເຂົ້າກະເປົາຂອງທ່ານແລ້ວ
                  </p>
                )}
              </div>
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

      <Dialog open={!!detailStore} onOpenChange={(v) => !v && setDetailStore(null)}>
        <DialogContent className="bg-surface-2 border-border max-w-sm">
          <DialogHeader><DialogTitle>ລາຍລະອຽດສິນຄ້າທົ່ວໄປ</DialogTitle></DialogHeader>
          {detailStore && (
            <div className="space-y-2">
              <div className="flex justify-end"><Badge status={detailStore.status} /></div>
              <Row k="ສິນຄ້າ" v={detailStore.product_name ?? "-"} />
              <Row k="ຈຳນວນ" v={String(detailStore.qty)} />
              <Row k="ລາຄາລວມ" v={`${formatKip(detailStore.price)} ₭`} />
              <Row k="ວັນທີຊື້" v={`${formatDateTime(detailStore.created_at)} (${timeAgo(detailStore.created_at)})`} />
              {(detailStore.codes ?? []).length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-xs text-muted-foreground">ລະຫັດສິນຄ້າທີ່ໄດ້ຮັບ</div>
                  {(detailStore.codes ?? []).map((c, i) => (
                    <div key={i} className="rounded-md border border-border/60 px-2 py-1 text-sm break-all">{c}</div>
                  ))}
                </div>
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
