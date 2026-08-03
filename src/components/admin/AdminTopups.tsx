import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListTopups } from "@/lib/admin-topups.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatKip, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  amount: number;
  verified_amount: number | null;
  status: string;
  created_at: string;
  slip_signed_url: string | null;
  user: { username: string | null; email: string | null } | null;
}

const STATUS_LABEL: Record<string, string> = {
  approved: "ສຳເລັດ",
  rejected: "ບໍ່ສຳເລັດ",
  pending: "ລໍຖ້າ",
  expired: "ໝົດອາຍຸ",
};

export function AdminTopups() {
  const list = useServerFn(adminListTopups);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(15);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const res = await list({ data: { q, page } });
        if (!alive) return;
        setRows(res.topups as unknown as Row[]);
        setTotal(res.total);
        setPerPage(res.perPage);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [q, page]);

  const pages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="ຄົ້ນຫາຊື່ຜູ້ໃຊ້ / ອີເມວ"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <div className="card-tile p-6 text-center text-sm text-muted-foreground">ຍັງບໍ່ມີປະຫວັດເຕີມເງິນ</div>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="card-tile p-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => r.slip_signed_url && setPreview(r.slip_signed_url)}
              className="size-16 shrink-0 rounded-lg overflow-hidden bg-surface grid place-items-center"
            >
              {r.slip_signed_url ? (
                <img src={r.slip_signed_url} alt="ສະລິບ" className="size-full object-cover" />
              ) : (
                <span className="text-[10px] text-muted-foreground">ບໍ່ມີສະລິບ</span>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate">{r.user?.username || r.user?.email || "-"}</div>
              <div className="text-[11px] text-muted-foreground truncate">{r.user?.email}</div>
              <div className="text-[11px] text-muted-foreground">{formatDateTime(r.created_at)}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-bold text-success">{formatKip(r.verified_amount ?? r.amount)} ₭</div>
              <div className={cn(
                "text-[10px] font-bold",
                r.status === "approved" ? "text-success" : r.status === "rejected" ? "text-destructive" : "text-muted-foreground",
              )}>
                {STATUS_LABEL[r.status] ?? r.status}
              </div>
            </div>
          </div>
        ))
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>ກ່ອນ</Button>
          <div className="text-xs text-muted-foreground">{page} / {pages}</div>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>ຕໍ່ໄປ</Button>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 backdrop-blur-sm p-4" onClick={() => setPreview(null)}>
          <div className="relative max-h-full">
            <button onClick={() => setPreview(null)} className="absolute -top-3 -right-3 grid place-items-center size-8 rounded-full bg-background border border-border shadow">
              <X className="size-4" />
            </button>
            <img src={preview} alt="ສະລິບ" className="max-h-[80vh] rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
