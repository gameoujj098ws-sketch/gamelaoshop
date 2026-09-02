import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListCardTopups, adminReviewCardTopup } from "@/lib/admin-cardtopups.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatKip, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Loader2, User as UserIcon } from "lucide-react";

type Status = "pending" | "approved" | "rejected" | "all";

interface Row {
  id: string;
  card_number: string;
  card_value: number;
  fee_percent: number;
  credit_amount: number;
  status: string;
  admin_note: string | null;
  created_at: string;
  user: { id: string; username: string | null; email: string | null; avatar_url: string | null } | null;
}

const FILTERS: { key: Status; label: string }[] = [
  { key: "pending", label: "ລໍຖ້າກວດສອບ" },
  { key: "approved", label: "ອະນຸມັດແລ້ວ" },
  { key: "rejected", label: "ປະຕິເສດ" },
  { key: "all", label: "ທັງໝົດ" },
];

export function AdminCardTopups() {
  const list = useServerFn(adminListCardTopups);
  const review = useServerFn(adminReviewCardTopup);
  const [status, setStatus] = useState<Status>("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function load(next: Status = status) {
    setLoading(true);
    try {
      const res = await list({ data: { status: next } });
      setRows((res.items ?? []) as unknown as Row[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(status);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [status]);

  async function act(row: Row, approve: boolean) {
    setBusy(row.id);
    try {
      await review({ data: { id: row.id, approve, note: notes[row.id]?.trim() || undefined } });
      toast.success(approve ? "ອະນຸມັດແລ້ວ ເງິນເຂົ້າກະເປົາລູກຄ້າ" : "ປະຕິເສດແລ້ວ");
      await load(status);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ຜິດພາດ");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={cn(
              "rounded-full px-3 py-1 text-xs border whitespace-nowrap",
              status === f.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 bg-surface text-muted-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="card-tile p-6 text-center text-sm text-muted-foreground">ຍັງບໍ່ມີລາຍການ</div>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="card-tile p-4 space-y-3">
            <div className="flex items-center gap-3">
              {r.user?.avatar_url ? (
                <img src={r.user.avatar_url} alt="" className="size-10 rounded-full object-cover" />
              ) : (
                <div className="size-10 rounded-full bg-primary/10 grid place-items-center">
                  <UserIcon className="size-5 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate">{r.user?.username ?? "ບໍ່ມີຊື່"}</div>
                <div className="text-[11px] text-muted-foreground truncate">{r.user?.email ?? "-"}</div>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-bold shrink-0",
                  r.status === "approved"
                    ? "bg-success/10 text-success"
                    : r.status === "rejected"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-primary/10 text-primary",
                )}
              >
                {r.status === "approved" ? "ສຳເລັດ" : r.status === "rejected" ? "ບໍ່ສຳເລັດ" : "ລໍຖ້າ"}
              </span>
            </div>

            <div className="rounded-xl bg-surface p-3 space-y-1 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">ເລກບັດ</span>
                <span className="font-mono font-bold">{r.card_number}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">ມູນຄ່າ / ຄ່າທຳນຽມ</span>
                <span>{formatKip(r.card_value)} ₭ · {r.fee_percent}%</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">ຈະໄດ້ຮັບ</span>
                <span className="font-bold text-success">{formatKip(r.credit_amount)} ₭</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">ວັນທີ/ເວລາ</span>
                <span>{formatDateTime(r.created_at)}</span>
              </div>
              {r.admin_note && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">ຂໍ້ຄວາມ</span>
                  <span className="text-right">{r.admin_note}</span>
                </div>
              )}
            </div>

            {r.status === "pending" && (
              <>
                <Input
                  value={notes[r.id] ?? ""}
                  placeholder="ຂໍ້ຄວາມໃຫ້ລູກຄ້າ (ບໍ່ຈຳເປັນ)"
                  onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                  className="h-9 text-xs"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={busy === r.id}
                    className="flex-1 border-destructive/60 text-destructive"
                    onClick={() => act(r, false)}
                  >
                    ປະຕິເສດ
                  </Button>
                  <Button disabled={busy === r.id} className="flex-1 btn-neon" onClick={() => act(r, true)}>
                    {busy === r.id ? <Loader2 className="size-4 animate-spin" /> : "ອະນຸມັດ"}
                  </Button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}
