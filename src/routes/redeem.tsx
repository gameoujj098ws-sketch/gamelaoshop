import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { redeemCode } from "@/lib/redeem.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatKip } from "@/lib/format";
import { ArrowLeft, Ticket, Loader2 } from "lucide-react";

export const Route = createFileRoute("/redeem")({
  head: () => ({
    meta: [
      { title: "ເຕີມດ້ວຍໂຄດ — Gamelao" },
      { name: "description", content: "ໃສ່ໂຄດເຕີມເງິນ ເງິນເຂົ້າກະເປົາທັນທີ" },
      { property: "og:title", content: "ເຕີມດ້ວຍໂຄດ — Gamelao" },
      { property: "og:description", content: "ໃສ່ໂຄດເຕີມເງິນ ເງິນເຂົ້າກະເປົາທັນທີ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RedeemPage,
});

function RedeemPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const redeem = useServerFn(redeemCode);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!code.trim()) { toast.error("ກະລຸນາໃສ່ໂຄດ"); return; }
    setBusy(true);
    try {
      const res = await redeem({ data: { code: code.trim() } });
      toast.success(`ສຳເລັດ! ໄດ້ຮັບ ${formatKip(res.amount)} ₭ ເຂົ້າກະເປົາແລ້ວ`);
      setCode("");
      navigate({ to: "/history" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ໂຄດບໍ່ຖືກຕ້ອງ");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <AppShell><div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="px-4 space-y-4">
        <Link to="/topup" className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" /> ກັບຄືນ
        </Link>

        <div className="rounded-2xl bg-gradient-to-br from-primary to-accent p-5 text-primary-foreground">
          <div className="flex items-center gap-2">
            <Ticket className="size-6" />
            <h1 className="text-base font-bold">ເຕີມດ້ວຍໂຄດ</h1>
          </div>
          <p className="text-xs opacity-90 mt-1">ໃສ່ໂຄດເຕີມເງິນ ແລ້ວກົດຢືນຢັນ ເງິນຈະເຂົ້າກະເປົາທັນທີ</p>
        </div>

        {!session ? (
          <div className="card-tile p-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນໃຊ້ໂຄດ</p>
            <Link to="/auth" className="btn-neon inline-block rounded-full px-6 py-2 text-sm">ເຂົ້າສູ່ລະບົບ</Link>
          </div>
        ) : (
          <div className="card-tile p-5 space-y-3">
            <Label className="text-xs">ໂຄດເຕີມເງິນ</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ຕົວຢ່າງ: GL-XXXX-XXXX"
              className="uppercase tracking-wider"
            />
            <Button onClick={submit} disabled={busy} className="w-full btn-neon">
              {busy ? <><Loader2 className="size-4 animate-spin mr-2" /> ກຳລັງກວດໂຄດ...</> : "ຢືນຢັນໂຄດ"}
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
