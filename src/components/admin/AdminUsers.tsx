import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListUsers, adminSendMessage } from "@/lib/admin.functions";
import {
  adminGetUser,
  adminSetUserPassword,
  adminSetUsername,
  adminSetWallet,
} from "@/lib/admin-users.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatKip } from "@/lib/format";
import { Loader2, Search, MessageSquare, Eye, KeyRound, Wallet } from "lucide-react";

interface U { id: string; username: string | null; email: string | null; wallet_balance: number; created_at: string }

interface Detail {
  id: string; username: string | null; email: string | null; wallet_balance: number;
  created_at: string; email_confirmed: boolean; last_sign_in_at: string | null;
  provider: string; order_count: number; topup_total: number;
  last_login: { created_at: string; ip: string | null } | null;
}


export function AdminUsers() {
  const list = useServerFn(adminListUsers);
  const send = useServerFn(adminSendMessage);
  const getUser = useServerFn(adminGetUser);
  const setPassword = useServerFn(adminSetUserPassword);
  const setName = useServerFn(adminSetUsername);
  const setWallet = useServerFn(adminSetWallet);
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<U[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgFor, setMsgFor] = useState<U | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editName, setEditName] = useState("");
  const [newPass, setNewPass] = useState("");
  const [walletMode, setWalletMode] = useState<"set" | "add">("set");
  const [walletValue, setWalletValue] = useState(0);
  const [walletNote, setWalletNote] = useState("");

  async function openDetail(u: U) {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    setNewPass("");
    setWalletNote("");
    setWalletMode("set");
    try {
      const res = await getUser({ data: { id: u.id } });
      const d = res.user as Detail;
      setDetail(d);
      setEditName(d.username ?? "");
      setWalletValue(d.wallet_balance);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ");
      setDetailOpen(false);
    } finally { setDetailLoading(false); }
  }


  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await list({ data: { q: q.trim() || undefined } });
        setUsers(res.users as U[]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ");
      } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [q]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ຄົ້ນຫາຊື່ຜູ້ໃຊ້ ຫຼື ອີເມວ" className="pl-9" />
      </div>

      {loading ? (
        <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin text-primary" /></div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">ບໍ່ພົບຜູ້ໃຊ້</p>
      ) : (
        users.map((u) => (
          <div key={u.id} className="card-tile p-3 flex items-center gap-3">
            <div className="size-10 rounded-full bg-gradient-to-br from-accent to-primary grid place-items-center text-white font-bold">
              {(u.username || u.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{u.username ?? "-"}</div>
              <div className="text-xs text-muted-foreground truncate">{u.email}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-success font-semibold">{formatKip(u.wallet_balance)} ₭</div>
              <button className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 mt-1"
                onClick={() => { setMsgFor(u); setMsg(""); }}>
                <MessageSquare className="size-3" /> ຂໍ້ຄວາມ
              </button>
            </div>
          </div>
        ))
      )}

      <Dialog open={!!msgFor} onOpenChange={(v) => !v && setMsgFor(null)}>
        <DialogContent className="bg-surface-2 border-border max-w-sm">
          <DialogHeader><DialogTitle>ສົ່ງຂໍ້ຄວາມ</DialogTitle></DialogHeader>
          <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} placeholder="ຂໍ້ຄວາມ..." />
          <Button className="w-full btn-neon" disabled={busy || !msg.trim()}
            onClick={async () => {
              if (!msgFor) return;
              setBusy(true);
              try {
                await send({ data: { user_id: msgFor.id, title: "ຂໍ້ຄວາມຈາກແອດມິນ", body: msg.trim() } });
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
