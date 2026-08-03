import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetSettings, adminSaveSettings } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface S {
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_name: string | null;
  bank_qr_image_url: string | null;
  contact_info: string | null;
  primary_color: string | null;
  logo_url: string | null;
  slide_images: string[];
  slide_interval: number;
  ad_images: string[];
}

const EMPTY: S = {
  bank_account_name: "", bank_account_number: "", bank_name: "",
  bank_qr_image_url: "", contact_info: "", primary_color: "",
  logo_url: "", slide_images: [], slide_interval: 4, ad_images: [],
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
        if (res.settings) {
          const raw = res.settings as Partial<S>;
          setS({
            ...EMPTY,
            ...raw,
            slide_images: Array.isArray(raw.slide_images) ? raw.slide_images : [],
            ad_images: Array.isArray(raw.ad_images) ? raw.ad_images : [],
            slide_interval: Number(raw.slide_interval ?? 4),
          });
        }
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
      <Input value={(s[key] as string) ?? ""} onChange={(e) => setS({ ...s, [key]: e.target.value })} className="mt-1" />
    </div>
  );

  const imageList = (key: "slide_images" | "ad_images", title: string, hint: string) => {
    const list = s[key];
    const setList = (next: string[]) => setS({ ...s, [key]: next });
    return (
      <div className="rounded-xl border border-border/60 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold">{title}</div>
            <div className="text-[11px] text-muted-foreground">{hint}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Label className="text-[11px]">ຈຳນວນຮູບ</Label>
            <Input
              type="number"
              min={0}
              max={30}
              value={list.length}
              onChange={(e) => {
                const n = Math.max(0, Math.min(30, parseInt(e.target.value || "0", 10)));
                const next = [...list];
                while (next.length < n) next.push("");
                setList(next.slice(0, n));
              }}
              className="w-16 h-8 text-xs"
            />
          </div>
        </div>

        {list.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
            ຍັງບໍ່ມີຮູບ
          </div>
        ) : (
          list.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground w-14 shrink-0">ຮູບ {i + 1}</span>
              <Input
                value={url}
                placeholder="ລິ້ງຮູບ (https://...)"
                onChange={(e) => {
                  const next = [...list];
                  next[i] = e.target.value;
                  setList(next);
                }}
                className="h-9"
              />
              <button
                type="button"
                onClick={() => setList(list.filter((_, j) => j !== i))}
                className="text-destructive shrink-0"
                aria-label="ລຶບ"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}

        <Button type="button" variant="outline" className="w-full h-8 text-xs"
          onClick={() => setList([...list, ""])}>
          <Plus className="size-3.5 mr-1" /> ເພີ່ມຮູບ
        </Button>
      </div>
    );
  };

  return (
    <div className="card-tile p-4 space-y-4">
      {field("logo_url", "ລິ້ງຮູບໂລໂກ້ (ແທນໄອຄອນເດີມ)")}
      {field("bank_account_name", "ຊື່ບັນຊີຜູ້ຮັບ")}
      {field("bank_account_number", "ເລກບັນຊີ")}
      {field("bank_name", "ຊື່ທະນາຄານ")}
      {field("bank_qr_image_url", "ລິ້ງຮູບ QR")}
      {field("primary_color", "ສີຫຼັກ (HSL ເຊັ່ນ 330 90% 60%)")}
      <div>
        <Label className="text-xs">ຂໍ້ມູນຕິດຕໍ່</Label>
        <Textarea rows={3} value={s.contact_info ?? ""} onChange={(e) => setS({ ...s, contact_info: e.target.value })} className="mt-1" />
      </div>

      {imageList("slide_images", "ຮູບສະໄລ້ (ໜ້າແລກ)", "ຢູ່ດ້ານເທິງ 'ເກມທີ່ໄດ້ຮັບຄວາມນິຍົມ'")}
      <div>
        <Label className="text-xs">ເວລາປ່ຽນສະໄລ້ (ວິນາທີ)</Label>
        <Input
          type="number" min={1} max={60}
          value={s.slide_interval}
          onChange={(e) => setS({ ...s, slide_interval: Math.max(1, Math.min(60, parseInt(e.target.value || "4", 10))) })}
          className="mt-1"
        />
      </div>

      {imageList("ad_images", "ຮູບໂຄສະນາ (Popup)", "ເດ້ງຂຶ້ນເມື່ອເຂົ້າໜ້າແລກ")}

      <Button className="w-full btn-neon" disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await save({
              data: {
                ...s,
                slide_images: s.slide_images.map((u) => u.trim()).filter(Boolean),
                ad_images: s.ad_images.map((u) => u.trim()).filter(Boolean),
              },
            });
            toast.success("ບັນທຶກແລ້ວ");
          } catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); } finally { setBusy(false); }
        }}>
        ບັນທຶກການຕັ້ງຄ່າ
      </Button>
    </div>
  );
}
