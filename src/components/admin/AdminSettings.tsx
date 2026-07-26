import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetSettings, adminSaveSettings } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface S {
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_name: string | null;
  bank_qr_image_url: string | null;
  contact_info: string | null;
  primary_color: string | null;
}

const EMPTY: S = {
  bank_account_name: "", bank_account_number: "", bank_name: "",
  bank_qr_image_url: "", contact_info: "", primary_color: "",
};

export function AdminSettings() {
  const get = useServerFn(adminGetSettings);
  const save = useServerFn(adminSaveSettings);
  const [s, setS] = useState<S>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await get({ data: undefined as never });
        if (res.settings) setS({ ...EMPTY, ...(res.settings as Partial<S>) });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ");
      } finally { setLoading(false); }
    })();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  if (loading) return <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin text-primary" /></div>;

  const field = (key: keyof S, label: string) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={s[key] ?? ""} onChange={(e) => setS({ ...s, [key]: e.target.value })} className="mt-1" />
    </div>
  );

  return (
    <div className="card-tile p-4 space-y-3">
      {field("bank_account_name", "ຊື່ບັນຊີຜູ້ຮັບ")}
      {field("bank_account_number", "ເລກບັນຊີ")}
      {field("bank_name", "ຊື່ທະນາຄານ")}
      {field("bank_qr_image_url", "ລິ້ງຮູບ QR")}
      {field("primary_color", "ສີຫຼັກ (HSL ເຊັ່ນ 330 90% 60%)")}
      <div>
        <Label className="text-xs">ຂໍ້ມູນຕິດຕໍ່</Label>
        <Textarea rows={3} value={s.contact_info ?? ""} onChange={(e) => setS({ ...s, contact_info: e.target.value })} className="mt-1" />
      </div>
      <Button className="w-full btn-neon" disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await save({ data: s });
            toast.success("ບັນທຶກແລ້ວ");
          } catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); } finally { setBusy(false); }
        }}>
        ບັນທຶກການຕັ້ງຄ່າ
      </Button>
    </div>
  );
}
