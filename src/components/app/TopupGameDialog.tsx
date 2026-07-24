import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { placeOrder } from "@/lib/orders.functions";
import { formatKip } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

interface CategoryLite {
  id: string;
  name: string;
  image_url: string | null;
}

interface Field { id: string; label: string; placeholder: string | null; sort_order: number }
interface Pkg { id: string; name: string; price: number; sort_order: number }

export function TopupGameDialog({
  category,
  open,
  onOpenChange,
}: {
  category: CategoryLite | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [fields, setFields] = useState<Field[]>([]);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const place = useServerFn(placeOrder);

  useEffect(() => {
    if (!category) return;
    setValues({});
    setSelectedPkg(null);
    (async () => {
      const [{ data: f }, { data: p }] = await Promise.all([
        supabase.from("category_input_fields").select("*").eq("category_id", category.id).order("sort_order"),
        supabase.from("packages").select("*").eq("category_id", category.id).eq("is_active", true).order("sort_order"),
      ]);
      setFields((f ?? []) as Field[]);
      setPackages((p ?? []) as Pkg[]);
    })();
  }, [category]);

  async function submit() {
    if (!category || !selectedPkg) return;
    for (const f of fields) {
      if (!values[f.id]?.trim()) {
        toast.error(`ກະລຸນາໃສ່ ${f.label}`);
        return;
      }
    }
    setBusy(true);
    try {
      const inputs: Record<string, string> = {};
      for (const f of fields) inputs[f.label] = values[f.id];
      const res = await place({ data: { category_id: category.id, package_id: selectedPkg, inputs } });
      if (res.ok) {
        toast.success("ສັ່ງຊື້ສຳເລັດ — ກຳລັງລໍຖ້າແອດມິນອະນຸມັດ");
        onOpenChange(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ເກີດຂໍ້ຜິດພາດ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-2 border-border max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {category?.image_url ? (
              <img src={category.image_url} alt={category.name} className="size-14 rounded-xl object-cover" />
            ) : (
              <div className="size-14 rounded-xl bg-primary/20 grid place-items-center">
                <Flame className="size-6 text-primary" />
              </div>
            )}
            <div>
              <DialogTitle className="text-left">{category?.name}</DialogTitle>
              <p className="text-xs text-muted-foreground text-left">ຂໍ້ມູນຜູ້ຫຼິ້ນ ແລະ ແພັກເກັດ</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          {fields.length === 0 && (
            <p className="text-xs text-muted-foreground">ບໍ່ຕ້ອງໃສ່ຂໍ້ມູນເພີ່ມສຳລັບເກມນີ້</p>
          )}
          {fields.map((f) => (
            <div key={f.id}>
              <Label className="text-xs">{f.label}</Label>
              <Input
                value={values[f.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                placeholder={f.placeholder ?? ""}
                className="mt-1"
              />
            </div>
          ))}

          <div>
            <Label className="text-xs">ເລືອກແພັກເກັດ</Label>
            {packages.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-2">ຍັງບໍ່ມີແພັກເກັດ</p>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {packages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPkg(p.id)}
                    className={cn(
                      "rounded-xl border p-2 text-left transition-all cursor-pointer",
                      selectedPkg === p.id
                        ? "border-primary bg-primary/10 neon-glow"
                        : "border-border/60 bg-surface hover:border-primary/50",
                    )}
                  >
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="text-xs text-success">{formatKip(p.price)} ₭</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={submit}
            disabled={busy || !selectedPkg || packages.length === 0}
            className="w-full btn-neon"
          >
            {busy ? "ກຳລັງດຳເນີນການ..." : "ຢືນຢັນຊຳລະເງິນ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
