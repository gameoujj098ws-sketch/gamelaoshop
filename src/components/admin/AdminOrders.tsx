import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListOrders, adminDecideOrder, adminSendMessage } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatKip } from "@/lib/format";
import { Loader2, Check, X, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface Order {
  id: string; user_id: string; category_name: string; package_name: string;
  price: number; inputs: Record<string, string> | null; status: string;
  admin_message: string | null; created_at: string;
  user: { username: string | null; email: string | null } | null;
}

const TABS = [
  { key: "pending", label: "ລໍຖ້າ" },
  { key: "approved", label: "ສຳເລັດ" },
  { key: "rejected", label: "ປະຕິເສດ" },
  { key: "all", label: "ທັງໝົດ" },
] as const;

export function AdminOrders() {
  const list = useServerFn(adminListOrders);
  const decide = useServerFn(adminDecideOrder);
  const send = useServerFn(adminSendMessage);

  const [status, setStatus] = useState<(typeof TABS)[number]["key"]>("pending");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ orders: Order[]; total: number; perPage: number }>({ orders: [], total: 0, perPage: 10 });
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Order | null>(null);
  const [msgFor, setMsgFor] = useState<Order | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const res = await list({ data: { status, page } });
      setData(res as never);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status, page]);

  const pages = Math.max(1, Math.ceil(data.total / data.perPage));

  async function act(o: Order, action: "approve" | "reject") {
    setBusy(true);
    try {
      await decide({ data: { id: o.id, action } });
      toast.success(action === "approve" ? "ອະນຸມັດແລ້ວ" : "ປະຕິເສດ + ຄືນເງິນແລ້ວ");
      setDetail(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ຜິດພາດ");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setStatus(t.key); setPage(1); }}
            className={cn("rounded-full px-4 py-1.5 text-xs whitespace-nowrap border",
              status === t.key ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-surface text-muted-foreground")}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin text-primary" /></div>
      ) : data.orders.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">ຍັງບໍ່ມີອໍເດີ</p>
      ) : (
        data.orders.map((o) => (
          <div key={o.id} className="card-tile p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{o.category_name} — {o.package_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {o.user?.username ?? o.user?.email ?? o.user_id.slice(0, 8)}
                </div>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-success font-semibold">{formatKip(o.price)} ₭</div>
              <Button size="sm" variant="secondary" onClick={() => setDetail(o)}>ເບິ່ງລາຍລະອຽດ</Button>
            </div>
          </div>
        ))
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>ກ່ອນໜ້າ</Button>
          <span className="text-xs text-muted-foreground">{page} / {pages}</span>
          <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>ຕໍ່ໄປ</Button>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="bg-surface-2 border-border max-w-sm">
          <DialogHeader><DialogTitle>ລາຍລະອຽດອໍເດີ</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <Row k="ຜູ້ໃຊ້" v={detail.user?.username ?? "-"} />
              <Row k="ອີເມວ" v={detail.user?.email ?? "-"} />
              <Row k="ເກມ" v={detail.category_name} />
              <Row k="ແພັກເກັດ" v={detail.package_name} />
              <Row k="ລາຄາ" v={`${formatKip(detail.price)} ₭`} />
              {detail.inputs && Object.entries(detail.inputs).map(([k, v]) => <Row key={k} k={k} v={String(v)} />)}
              <Row k="ສະຖານະ" v={detail.status} />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button className="bg-success text-white hover:bg-success/90" disabled={busy || detail.status !== "pending"}
                  onClick={() => act(detail, "approve")}>
                  <Check className="size-4 mr-1" /> ຢືນຢັນ
                </Button>
                <Button variant="destructive" disabled={busy || detail.status !== "pending"}
                  onClick={() => act(detail, "reject")}>
                  <X className="size-4 mr-1" /> ປະຕິເສດ
                </Button>
              </div>
              <Button variant="secondary" className="w-full" onClick={() => { setMsgFor(detail); setMsg(""); }}>
                <MessageSquare className="size-4 mr-1" /> ສົ່ງຂໍ້ຄວາມ
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!msgFor} onOpenChange={(v) => !v && setMsgFor(null)}>
        <DialogContent className="bg-surface-2 border-border max-w-sm">
          <DialogHeader><DialogTitle>ສົ່ງຂໍ້ຄວາມຫາລູກຄ້າ</DialogTitle></DialogHeader>
          <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} placeholder="ຂໍ້ຄວາມ..." />
          <Button className="w-full btn-neon" disabled={busy || !msg.trim()}
            onClick={async () => {
              if (!msgFor) return;
              setBusy(true);
              try {
                await send({ data: { user_id: msgFor.user_id, title: "ຂໍ້ຄວາມຈາກແອດມິນ", body: msg.trim() } });
                toast.success("ສົ່ງແລ້ວ");
                setMsgFor(null);
              } catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); } finally { setBusy(false); }
            }}>
            ສົ່ງ
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground text-xs">{k}</span>
      <span className="text-right break-all">{v}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "ລໍຖ້າ", cls: "bg-primary/15 text-primary" },
    approved: { label: "ສຳເລັດ", cls: "bg-success/15 text-success" },
    rejected: { label: "ບໍ່ສຳເລັດ", cls: "bg-destructive/15 text-destructive" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", s.cls)}>{s.label}</span>;
}
