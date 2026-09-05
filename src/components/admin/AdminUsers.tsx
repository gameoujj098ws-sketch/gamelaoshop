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
import { Loader2, Search, MessageSquare, Eye, KeyRound, Wallet, Ban } from "lucide-react";

interface U { id: string; username: string | null; email: string | null; wallet_balance: number; created_at: string }

interface Detail {
  id: string; username: string | null; email: string | null; wallet_balance: number;
  created_at: string; email_confirmed: boolean; last_sign_in_at: string | null;
  provider: string; order_count: number; topup_total: number;
  last_login: { created_at: string; ip: string | null } | null;
  is_banned: boolean; ban_reason: string | null;
}



function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right break-all">{value}</span>
    </div>
  );
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
  }, [q, reloadKey]);

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
          <div key={u.id} className="card-tile p-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-gradient-to-br from-accent to-primary grid place-items-center text-white font-bold">
                {(u.username || u.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{u.username ?? "-"}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
              </div>
              <div className="text-xs text-success font-semibold">{formatKip(u.wallet_balance)} ₭</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" className="btn-neon h-8 text-xs" onClick={() => void openDetail(u)}>
                <Eye className="size-3.5 mr-1" /> ເບິ່ງຂໍ້ມູນ
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs"
                onClick={() => { setMsgFor(u); setMsg(""); }}>
                <MessageSquare className="size-3.5 mr-1" /> ຂໍ້ຄວາມ
              </Button>
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

      {/* User detail / edit */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-surface-2 border-border max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ຂໍ້ມູນຜູ້ໃຊ້</DialogTitle></DialogHeader>
          {detailLoading || !detail ? (
            <div className="grid place-items-center py-8"><Loader2 className="size-5 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/60 p-3 space-y-1 text-xs">
                <Row label="ຊື່ຜູ້ໃຊ້" value={detail.username ?? "-"} />
                <Row label="ອີເມວ" value={detail.email ?? "-"} />
                <Row label="ຢືນຢັນອີເມວ" value={detail.email_confirmed ? "ຢືນຢັນແລ້ວ" : "ຍັງບໍ່ຢືນຢັນ"} />
                <Row label="ວິທີເຂົ້າສູ່ລະບົບ" value={detail.provider} />
                <Row label="ຍອດເງິນ" value={`${formatKip(detail.wallet_balance)} ₭`} />
                <Row label="ຈຳນວນອໍເດີ" value={String(detail.order_count)} />
                <Row label="ເຕີມເງິນລວມ" value={`${formatKip(detail.topup_total)} ₭`} />
                <Row label="ສະໝັກເມື່ອ" value={new Date(detail.created_at).toLocaleString("lo-LA")} />
                <Row label="ເຂົ້າລະບົບຄັ້ງລ່າສຸດ"
                  value={detail.last_sign_in_at ? new Date(detail.last_sign_in_at).toLocaleString("lo-LA") : "-"} />
                <Row label="IP ຄັ້ງລ່າສຸດ" value={detail.last_login?.ip ?? "-"} />
                <Row label="ລະຫັດຜ່ານ" value="••••••••  (ບໍ່ສາມາດເບິ່ງໄດ້ — ປ່ຽນໄດ້ດ້ານລຸ່ມ)" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">ແກ້ໄຂຊື່ຜູ້ໃຊ້</Label>
                <div className="flex gap-2">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <Button className="btn-neon" disabled={busy || editName.trim().length < 2}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await setName({ data: { id: detail.id, username: editName.trim() } });
                        toast.success("ບັນທຶກຊື່ແລ້ວ");
                        setDetail({ ...detail, username: editName.trim() });
                        setReloadKey((k) => k + 1);
                      } catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); } finally { setBusy(false); }
                    }}>ບັນທຶກ</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1"><KeyRound className="size-3.5" /> ປ່ຽນລະຫັດຜ່ານໃໝ່ (8 ຕົວຂຶ້ນໄປ)</Label>
                <div className="flex gap-2">
                  <Input type="text" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="ລະຫັດຜ່ານໃໝ່" />
                  <Button className="btn-neon" disabled={busy || newPass.length < 8}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await setPassword({ data: { id: detail.id, password: newPass } });
                        toast.success("ປ່ຽນລະຫັດຜ່ານແລ້ວ");
                        setNewPass("");
                      } catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); } finally { setBusy(false); }
                    }}>ປ່ຽນ</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1"><Wallet className="size-3.5" /> ແກ້ໄຂຍອດເງິນ</Label>
                <div className="flex gap-2">
                  <button className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${walletMode === "set" ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"}`}
                    onClick={() => { setWalletMode("set"); setWalletValue(detail.wallet_balance); }}>ກຳນົດຍອດ</button>
                  <button className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${walletMode === "add" ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"}`}
                    onClick={() => { setWalletMode("add"); setWalletValue(0); }}>ບວກ/ລົບ</button>
                </div>
                <Input type="number" value={walletValue}
                  onChange={(e) => setWalletValue(parseInt(e.target.value || "0", 10))} />
                <p className="text-[10px] text-muted-foreground">
                  {walletMode === "set"
                    ? "ຍອດເງິນຈະຖືກກຳນົດເປັນຈຳນວນນີ້"
                    : "ໃສ່ຄ່າບວກເພື່ອເພີ່ມ, ໃສ່ຄ່າລົບ (ຕົວຢ່າງ -50000) ເພື່ອຫັກອອກ"}
                </p>
                <Input value={walletNote} onChange={(e) => setWalletNote(e.target.value)} placeholder="ເຫດຜົນ (ບໍ່ບັງຄັບ)" />
                <Button className="w-full btn-neon" disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const res = await setWallet({
                        data: { id: detail.id, mode: walletMode, amount: walletValue, note: walletNote.trim() || undefined },
                      });
                      toast.success(`ບັນທຶກຍອດເງິນແລ້ວ — ${formatKip(res.balance)} ₭`);
                      setDetail({ ...detail, wallet_balance: res.balance });
                      setWalletMode("set");
                      setWalletValue(res.balance);
                      setWalletNote("");
                      setReloadKey((k) => k + 1);
                    } catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); } finally { setBusy(false); }
                  }}>
                  ບັນທຶກຍອດເງິນ
                </Button>
              </div>

              <div className="space-y-2 rounded-lg border border-destructive/40 p-3">
                <Label className="text-xs flex items-center gap-1 text-destructive">
                  <Ban className="size-3.5" /> ແບນຜູ້ໃຊ້
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  ສະຖານະ: {detail.is_banned ? `ຖືກແບນ — ${detail.ban_reason ?? "-"}` : "ໃຊ້ງານປົກກະຕິ"}
                </p>
                {detail.is_banned ? (
                  <Button variant="outline" className="w-full" disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await setBan({ data: { id: detail.id, banned: false } });
                        toast.success("ປົດແບນແລ້ວ");
                        setDetail({ ...detail, is_banned: false, ban_reason: null });
                        setReloadKey((k) => k + 1);
                      } catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); } finally { setBusy(false); }
                    }}>ຍົກເລີກການແບນ</Button>
                ) : (
                  <>
                    <Textarea value={banReason} onChange={(e) => setBanReason(e.target.value)}
                      placeholder="ລາຍລະອຽດ / ເຫດຜົນການແບນ" rows={3} />
                    <Button variant="destructive" className="w-full" disabled={busy || banReason.trim().length < 3}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await setBan({ data: { id: detail.id, banned: true, reason: banReason.trim() } });
                          toast.success("ແບນຜູ້ໃຊ້ແລ້ວ");
                          setDetail({ ...detail, is_banned: true, ban_reason: banReason.trim() });
                          setBanReason("");
                          setReloadKey((k) => k + 1);
                        } catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); } finally { setBusy(false); }
                      }}>ຢືນຢັນການແບນ</Button>
                  </>
                )}
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
