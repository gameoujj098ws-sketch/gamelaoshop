import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListCodes,
  adminCreateCode,
  adminToggleCode,
  adminDeleteCode,
} from "@/lib/admin-codes.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatKip, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Loader2, Trash2 } from "lucide-react";

interface Code {
  id: string;
  code: string;
  amount: number;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `GL-${part(4)}-${part(4)}`;
}

export function AdminCodes() {
  const list = useServerFn(adminListCodes);
  const create = useServerFn(adminCreateCode);
  const toggle = useServerFn(adminToggleCode);
  const remove = useServerFn(adminDeleteCode);

  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [maxUses, setMaxUses] = useState("1");

  async function load() {
    setLoading(true);
    try {
      const res = await list({ data: undefined as never });
      setCodes((res.codes ?? []) as unknown as Code[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  async function submit() {
    const value = parseInt(amount || "0", 10);
    const uses = parseInt(maxUses || "1", 10);
    if (code.trim().length < 3) return toast.error("ໂຄດຕ້ອງມີຢ່າງໜ້ອຍ 3 ຕົວ");
    if (!value || value < 1) return toast.error("ໃສ່ຈຳນວນເງິນ");
    if (!uses || uses < 1) return toast.error("ໃສ່ຈຳນວນຄົນທີ່ໃຊ້ໄດ້");
    setBusy(true);
    try {
      await create({ data: { code: code.trim(), amount: value, max_uses: uses } });
      toast.success("ສ້າງໂຄດແລ້ວ");
      setCode("");
      setAmount("");
      setMaxUses("1");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ຜິດພາດ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="card-tile p-4 space-y-3">
        <div className="text-sm font-bold">ສ້າງໂຄດເຕີມເງິນ</div>
        <div>
          <Label className="text-xs">ລະຫັດໂຄດ</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="GL-XXXX-XXXX"
              className="uppercase tracking-wider"
            />
            <Button type="button" variant="outline" className="shrink-0" onClick={() => setCode(randomCode())}>
              ສຸ່ມ
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">ຈຳນວນເງິນ (ກີບ)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">ໃຊ້ໄດ້ກີ່ຄົນ</Label>
            <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className="mt-1" />
          </div>
        </div>
        <Button className="w-full btn-neon" disabled={busy} onClick={submit}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "ສ້າງໂຄດ"}
        </Button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : codes.length === 0 ? (
        <div className="card-tile p-6 text-center text-sm text-muted-foreground">ຍັງບໍ່ມີໂຄດ</div>
      ) : (
        codes.map((c) => (
          <div key={c.id} className="card-tile p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono font-bold text-sm">{c.code}</div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-bold",
                  c.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                )}
              >
                {c.is_active ? "ເປີດໃຊ້" : "ປິດ"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatKip(c.amount)} ₭ · ໃຊ້ແລ້ວ {c.used_count}/{c.max_uses} ຄົນ · {formatDateTime(c.created_at)}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-8 text-xs"
                onClick={async () => {
                  await toggle({ data: { id: c.id, is_active: !c.is_active } });
                  await load();
                }}
              >
                {c.is_active ? "ປິດໂຄດ" : "ເປີດໂຄດ"}
              </Button>
              <Button
                variant="outline"
                className="h-8 text-xs border-destructive/60 text-destructive"
                onClick={async () => {
                  await remove({ data: { id: c.id } });
                  toast.success("ລຶບແລ້ວ");
                  await load();
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
