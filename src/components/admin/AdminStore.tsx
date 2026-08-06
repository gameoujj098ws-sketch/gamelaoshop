import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListStore,
  adminSaveStoreCategory,
  adminDeleteStoreCategory,
  adminSaveStoreProduct,
  adminDeleteStoreProduct,
  adminListProductCodes,
  adminAddStock,
  adminDeleteProductCode,
} from "@/lib/admin-store.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatKip } from "@/lib/format";
import { Loader2, Plus, Pencil, Trash2, PackagePlus, Layers } from "lucide-react";

interface Cat { id: string; name: string; image_url: string | null; sort_order: number; is_active: boolean }
interface Prod {
  id: string; category_id: string | null; name: string; description: string | null;
  image_url: string | null; price: number; original_price: number | null;
  stock: number; is_hidden: boolean; sort_order: number; is_active: boolean;
}
interface CodeRow { id: string; code: string; is_sold: boolean; sold_at: string | null }

const EMPTY_CAT = { name: "", image_url: "", sort_order: 0, is_active: true };
const EMPTY_PROD = {
  category_id: "", name: "", description: "", image_url: "",
  price: 0, original_price: 0, is_hidden: false, sort_order: 0, is_active: true,
};

export function AdminStore() {
  const load = useServerFn(adminListStore);
  const saveCat = useServerFn(adminSaveStoreCategory);
  const delCat = useServerFn(adminDeleteStoreCategory);
  const saveProd = useServerFn(adminSaveStoreProduct);
  const delProd = useServerFn(adminDeleteStoreProduct);
  const listCodes = useServerFn(adminListProductCodes);
  const addStock = useServerFn(adminAddStock);
  const delCode = useServerFn(adminDeleteProductCode);

  const [cats, setCats] = useState<Cat[]>([]);
  const [prods, setProds] = useState<Prod[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [catForm, setCatForm] = useState<typeof EMPTY_CAT & { id?: string }>(EMPTY_CAT);
  const [catOpen, setCatOpen] = useState(false);
  const [prodForm, setProdForm] = useState<typeof EMPTY_PROD & { id?: string }>(EMPTY_PROD);
  const [prodOpen, setProdOpen] = useState(false);

  const [stockFor, setStockFor] = useState<Prod | null>(null);
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [codeText, setCodeText] = useState("");
  const [plainQty, setPlainQty] = useState(1);

  async function refresh() {
    setLoading(true);
    try {
      const res = await load({ data: undefined as never });
      setCats(res.categories as Cat[]);
      setProds(res.products as Prod[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ");
    } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function openStock(p: Prod) {
    setStockFor(p);
    setCodeText("");
    setPlainQty(1);
    try {
      const res = await listCodes({ data: { product_id: p.id } });
      setCodes(res.codes as CodeRow[]);
    } catch { setCodes([]); }
  }

  if (loading) return <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin text-primary" /></div>;

  const discount = (p: Prod) =>
    p.original_price && p.original_price > p.price
      ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Categories */}
      <div className="card-tile p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm"><Layers className="size-4 text-primary" /> ໝວດໝູ່ສິນຄ້າທົ່ວໄປ</div>
          <Button size="sm" className="btn-neon h-8 text-xs"
            onClick={() => { setCatForm(EMPTY_CAT); setCatOpen(true); }}>
            <Plus className="size-3.5 mr-1" /> ເພີ່ມໝວດໝູ່
          </Button>
        </div>
        {cats.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">ຍັງບໍ່ມີໝວດໝູ່</p>
        ) : cats.map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border/60 p-2">
            {c.image_url ? <img src={c.image_url} alt={c.name} className="size-10 rounded-lg object-cover" /> : <div className="size-10 rounded-lg bg-surface" />}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{c.name}</div>
              <div className="text-[11px] text-muted-foreground">ອັນດັບ {c.sort_order} · {c.is_active ? "ເປີດ" : "ປິດ"}</div>
            </div>
            <button className="text-primary p-1" aria-label="ແກ້ໄຂ"
              onClick={() => { setCatForm({ id: c.id, name: c.name, image_url: c.image_url ?? "", sort_order: c.sort_order, is_active: c.is_active }); setCatOpen(true); }}>
              <Pencil className="size-4" />
            </button>
            <button className="text-destructive p-1" aria-label="ລຶບ"
              onClick={async () => {
                if (!confirm(`ລຶບໝວດໝູ່ ${c.name}?`)) return;
                try { await delCat({ data: { id: c.id } }); toast.success("ລຶບແລ້ວ"); void refresh(); }
                catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); }
              }}>
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Products */}
      <div className="card-tile p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-sm">ສິນຄ້າທົ່ວໄປ</div>
          <Button size="sm" className="btn-neon h-8 text-xs"
            onClick={() => { setProdForm(EMPTY_PROD); setProdOpen(true); }}>
            <Plus className="size-3.5 mr-1" /> ເພີ່ມສິນຄ້າ
          </Button>
        </div>
        {prods.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">ຍັງບໍ່ມີສິນຄ້າ</p>
        ) : prods.map((p) => (
          <div key={p.id} className="rounded-lg border border-border/60 p-2 space-y-2">
            <div className="flex items-center gap-2">
              {p.image_url ? <img src={p.image_url} alt={p.name} className="size-12 rounded-lg object-cover" /> : <div className="size-12 rounded-lg bg-surface" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{p.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {formatKip(p.price)} ₭
                  {discount(p) > 0 && <span className="text-destructive"> · -{discount(p)}%</span>}
                  {" · ສະຕ໊ອກ "}<span className="text-primary font-semibold">{p.stock}</span>
                  {p.is_hidden && " · ຊ່ອນຈາກໜ້າແລກ"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs"
                onClick={() => {
                  setProdForm({
                    id: p.id, category_id: p.category_id ?? "", name: p.name, description: p.description ?? "",
                    image_url: p.image_url ?? "", price: p.price, original_price: p.original_price ?? 0,
                    is_hidden: p.is_hidden, sort_order: p.sort_order, is_active: p.is_active,
                  });
                  setProdOpen(true);
                }}>
                <Pencil className="size-3.5 mr-1" /> ແກ້ໄຂ
              </Button>
              <Button size="sm" className="btn-neon h-8 text-xs" onClick={() => void openStock(p)}>
                <PackagePlus className="size-3.5 mr-1" /> ເພີ່ມສະຕ໊ອກ
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs text-destructive"
                onClick={async () => {
                  if (!confirm(`ລຶບສິນຄ້າ ${p.name}?`)) return;
                  try { await delProd({ data: { id: p.id } }); toast.success("ລຶບແລ້ວ"); void refresh(); }
                  catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); }
                }}>
                <Trash2 className="size-3.5 mr-1" /> ລຶບ
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Category dialog */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="bg-surface-2 border-border max-w-sm">
          <DialogHeader><DialogTitle>{catForm.id ? "ແກ້ໄຂໝວດໝູ່" : "ເພີ່ມໝວດໝູ່"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">ຊື່ໝວດໝູ່</Label>
              <Input className="mt-1" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} /></div>
            <div><Label className="text-xs">ລິ້ງຮູບ</Label>
              <Input className="mt-1" value={catForm.image_url} onChange={(e) => setCatForm({ ...catForm, image_url: e.target.value })} /></div>
            <div><Label className="text-xs">ອັນດັບ</Label>
              <Input className="mt-1" type="number" value={catForm.sort_order}
                onChange={(e) => setCatForm({ ...catForm, sort_order: parseInt(e.target.value || "0", 10) })} /></div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">ເປີດໃຊ້ງານ</Label>
              <Switch checked={catForm.is_active} onCheckedChange={(v) => setCatForm({ ...catForm, is_active: v })} />
            </div>
            <Button className="w-full btn-neon" disabled={busy || !catForm.name.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  await saveCat({ data: { ...catForm, name: catForm.name.trim(), image_url: catForm.image_url.trim() || null } });
                  toast.success("ບັນທຶກແລ້ວ"); setCatOpen(false); void refresh();
                } catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); } finally { setBusy(false); }
              }}>
              ບັນທຶກ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product dialog */}
      <Dialog open={prodOpen} onOpenChange={setProdOpen}>
        <DialogContent className="bg-surface-2 border-border max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{prodForm.id ? "ແກ້ໄຂສິນຄ້າ" : "ເພີ່ມສິນຄ້າທົ່ວໄປ"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">ຊື່ສິນຄ້າ</Label>
              <Input className="mt-1" value={prodForm.name} onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })} /></div>
            <div><Label className="text-xs">ລິ້ງຮູບ</Label>
              <Input className="mt-1" value={prodForm.image_url} onChange={(e) => setProdForm({ ...prodForm, image_url: e.target.value })} /></div>
            <div><Label className="text-xs">ລາຍລະອຽດ</Label>
              <Textarea className="mt-1" rows={3} value={prodForm.description} onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">ລາຄາຂາຍ</Label>
                <Input className="mt-1" type="number" value={prodForm.price}
                  onChange={(e) => setProdForm({ ...prodForm, price: parseInt(e.target.value || "0", 10) })} /></div>
              <div><Label className="text-xs">ລາຄາເຕັມ (ຖ້າມີ)</Label>
                <Input className="mt-1" type="number" value={prodForm.original_price}
                  onChange={(e) => setProdForm({ ...prodForm, original_price: parseInt(e.target.value || "0", 10) })} /></div>
            </div>
            {prodForm.original_price > prodForm.price && (
              <p className="text-[11px] text-destructive">ສ່ວນຫຼຸດ -{Math.round(((prodForm.original_price - prodForm.price) / prodForm.original_price) * 100)}%</p>
            )}
            <div>
              <Label className="text-xs">ໝວດໝູ່</Label>
              <select className="mt-1 w-full h-9 rounded-md border border-border bg-surface px-2 text-sm"
                value={prodForm.category_id} onChange={(e) => setProdForm({ ...prodForm, category_id: e.target.value })}>
                <option value="">— ບໍ່ມີໝວດໝູ່ —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><Label className="text-xs">ອັນດັບ</Label>
              <Input className="mt-1" type="number" value={prodForm.sort_order}
                onChange={(e) => setProdForm({ ...prodForm, sort_order: parseInt(e.target.value || "0", 10) })} /></div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">ຊ່ອນຈາກໜ້າສິນຄ້າທົ່ວໄປ</Label>
                <p className="text-[10px] text-muted-foreground">ຕິກແລ້ວຈະເຫັນສະເພາະໃນໝວດໝູ່</p>
              </div>
              <Switch checked={prodForm.is_hidden} onCheckedChange={(v) => setProdForm({ ...prodForm, is_hidden: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">ເປີດໃຊ້ງານ</Label>
              <Switch checked={prodForm.is_active} onCheckedChange={(v) => setProdForm({ ...prodForm, is_active: v })} />
            </div>
            <Button className="w-full btn-neon" disabled={busy || !prodForm.name.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  await saveProd({
                    data: {
                      ...prodForm,
                      name: prodForm.name.trim(),
                      category_id: prodForm.category_id || null,
                      description: prodForm.description.trim() || null,
                      image_url: prodForm.image_url.trim() || null,
                      original_price: prodForm.original_price > 0 ? prodForm.original_price : null,
                    },
                  });
                  toast.success("ບັນທຶກແລ້ວ"); setProdOpen(false); void refresh();
                } catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); } finally { setBusy(false); }
              }}>
              ບັນທຶກ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock dialog */}
      <Dialog open={!!stockFor} onOpenChange={(v) => !v && setStockFor(null)}>
        <DialogContent className="bg-surface-2 border-border max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ເພີ່ມສະຕ໊ອກ — {stockFor?.name}</DialogTitle></DialogHeader>
          {stockFor && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">ສະຕ໊ອກປັດຈຸບັນ: <span className="text-primary font-semibold">{stockFor.stock}</span></p>

              <div>
                <Label className="text-xs">ລະຫັດສິນຄ້າ / UID (1 ແຖວ = 1 ຊິ້ນ)</Label>
                <Textarea className="mt-1" rows={5} value={codeText} placeholder={"CODE-001\nCODE-002\nCODE-003"}
                  onChange={(e) => setCodeText(e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-1">ໃສ່ 4 ແຖວ = ສະຕ໊ອກ 4 ຊິ້ນ ລູກຄ້າຊື້ແລ້ວໄດ້ຮັບລະຫັດທັນທີ</p>
              </div>

              {/* Repeat stock — same text added N times (loot-box style) */}
              <div className="rounded-2xl border border-border/60 bg-surface p-3 space-y-2">
                <Label className="text-xs">ເພີ່ມສະຕ໊ອກແບບຊ້ຳ (ສຳລັບກ່ອງສຸ່ມ)</Label>
                <Input value={repeatText} placeholder="ຕົວຢ່າງ: ເກືອ ຫຼື TrueID"
                  onChange={(e) => setRepeatText(e.target.value)} />
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-[11px] text-muted-foreground">ຈຳນວນ</Label>
                    <Input className="mt-1" type="number" min={1} max={500} value={repeatQty}
                      onChange={(e) => setRepeatQty(Math.max(1, Math.min(500, parseInt(e.target.value || "1", 10))))} />
                  </div>
                  <Button variant="outline" className="h-9" disabled={busy || !repeatText.trim()}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const lines = Array.from({ length: repeatQty }, () => repeatText.trim());
                        const res = await addStock({ data: { product_id: stockFor.id, codes: lines, qty: 0 } });
                        toast.success(`ເພີ່ມແລ້ວ +${res.added} (ລວມ ${res.stock})`);
                        setRepeatText("");
                        setRepeatQty(1);
                        await refresh();
                        const c = await listCodes({ data: { product_id: stockFor.id } });
                        setCodes(c.codes as CodeRow[]);
                        setStockFor({ ...stockFor, stock: res.stock });
                      } catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); } finally { setBusy(false); }
                    }}>
                    <Plus className="size-4 mr-1" /> ເພີ່ມຊ້ຳ
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">ໃສ່ຄຳວ່າ “ເກືອ” + ຈຳນວນ 10 = ໄດ້ 10 ຊິ້ນຄືກັນ</p>
              </div>


              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs">ຫຼື ເພີ່ມຈຳນວນລ້າໆ (ບໍ່ມີລະຫັດ)</Label>
                  <Input className="mt-1" type="number" min={1} value={plainQty}
                    onChange={(e) => setPlainQty(Math.max(1, parseInt(e.target.value || "1", 10)))} />
                </div>
                <Button className="btn-neon h-9" disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const lines = codeText.split("\n").map((l) => l.trim()).filter(Boolean);
                      const res = await addStock({ data: { product_id: stockFor.id, codes: lines, qty: lines.length ? 0 : plainQty } });
                      toast.success(`ເພີ່ມແລ້ວ +${res.added} (ລວມ ${res.stock})`);
                      setCodeText("");
                      await refresh();
                      const c = await listCodes({ data: { product_id: stockFor.id } });
                      setCodes(c.codes as CodeRow[]);
                      setStockFor({ ...stockFor, stock: res.stock });
                    } catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); } finally { setBusy(false); }
                  }}>
                  <Plus className="size-4 mr-1" /> ເພີ່ມ
                </Button>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold">ລະຫັດທັງໝົດ ({codes.length})</div>
                {codes.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">ຍັງບໍ່ມີລະຫັດ</p>
                ) : codes.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-xs rounded-md border border-border/60 px-2 py-1">
                    <span className={c.is_sold ? "line-through text-muted-foreground flex-1 break-all" : "flex-1 break-all"}>{c.code}</span>
                    {c.is_sold ? <span className="text-[10px] text-muted-foreground">ຂາຍແລ້ວ</span> : (
                      <button className="text-destructive" aria-label="ລຶບ"
                        onClick={async () => {
                          try {
                            await delCode({ data: { id: c.id } });
                            setCodes(codes.filter((x) => x.id !== c.id));
                            setStockFor({ ...stockFor, stock: Math.max(0, stockFor.stock - 1) });
                            void refresh();
                          } catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); }
                        }}>
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
