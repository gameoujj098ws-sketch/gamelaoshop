import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListCategories, adminSaveCategory, adminDeleteCategory,
  adminSavePackage, adminDeletePackage, adminSaveField, adminDeleteField,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatKip } from "@/lib/format";
import { Plus, Trash2, Pencil, Package, ListPlus, Loader2 } from "lucide-react";

interface Cat { id: string; name: string; image_url: string | null; section: string; sort_order: number; is_active: boolean }
interface Pkg {
  id: string; category_id: string; name: string; price: number; sort_order: number; is_active: boolean;
  image_url: string | null; description: string | null; original_price: number | null; is_best_seller: boolean;
}
interface Fld { id: string; category_id: string; label: string; placeholder: string | null; sort_order: number }

export function AdminCategories() {
  const list = useServerFn(adminListCategories);
  const saveCat = useServerFn(adminSaveCategory);
  const delCat = useServerFn(adminDeleteCategory);
  const savePkg = useServerFn(adminSavePackage);
  const delPkg = useServerFn(adminDeletePackage);
  const saveFld = useServerFn(adminSaveField);
  const delFld = useServerFn(adminDeleteField);

  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<Cat[]>([]);
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [flds, setFlds] = useState<Fld[]>([]);
  const [openCat, setOpenCat] = useState<Cat | null | undefined>(undefined);
  const [pkgFor, setPkgFor] = useState<{ cat: Cat; pkg: Pkg | null } | null>(null);
  const [fldFor, setFldFor] = useState<{ cat: Cat; fld: Fld | null } | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const res = await list({ data: undefined as never });
      setCats(res.categories as Cat[]);
      setPkgs(res.packages as Pkg[]);
      setFlds(res.fields as Fld[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  if (loading) return <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <Button className="w-full btn-neon" onClick={() => setOpenCat(null)}>
        <Plus className="size-4 mr-1" /> ເພີ່ມໝວດໝູ່
      </Button>

      {cats.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">ຍັງບໍ່ມີໝວດໝູ່</p>}

      {cats.map((c) => (
        <div key={c.id} className="card-tile p-4 space-y-3">
          <div className="flex items-center gap-3">
            {c.image_url ? (
              <img src={c.image_url} alt={c.name} className="size-12 rounded-xl object-cover" />
            ) : (
              <div className="size-12 rounded-xl bg-surface" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{c.name}</div>
              <div className="text-xs text-muted-foreground">
                {c.section === "popular" ? "ເກມນິຍົມ" : "ເກມອື່ນໆ"} · {c.is_active ? "ເປີດ" : "ປິດ"}
              </div>
            </div>
            <button className="p-2 text-muted-foreground hover:text-primary" onClick={() => setOpenCat(c)}>
              <Pencil className="size-4" />
            </button>
            <button
              className="p-2 text-muted-foreground hover:text-destructive"
              onClick={async () => {
                if (!confirm(`ລົບ ${c.name}?`)) return;
                await delCat({ data: { id: c.id } });
                toast.success("ລົບແລ້ວ");
                reload();
              }}
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPkgFor({ cat: c, pkg: null })}>
              <Package className="size-4 mr-1" /> ເພີ່ມແພັກເກັດ
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setFldFor({ cat: c, fld: null })}>
              <ListPlus className="size-4 mr-1" /> ເພີ່ມຊ່ອງກรອກ
            </Button>
          </div>

          <div className="space-y-1">
            {pkgs.filter((p) => p.category_id === c.id).map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
                {p.image_url && <img src={p.image_url} alt={p.name} className="size-7 rounded object-contain" />}
                <span className="flex-1 truncate">
                  {p.name}
                  {p.is_best_seller && <span className="ml-1 text-[9px] text-accent">★ ຂາຍດີ</span>}
                </span>
                <span className="text-success text-xs">{formatKip(p.price)} ₭</span>
                <button className="text-muted-foreground hover:text-primary" onClick={() => setPkgFor({ cat: c, pkg: p })}>
                  <Pencil className="size-3.5" />
                </button>
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={async () => { await delPkg({ data: { id: p.id } }); reload(); }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            {flds.filter((f) => f.category_id === c.id).map((f) => (
              <div key={f.id} className="flex items-center gap-2 rounded-lg bg-surface/60 px-3 py-2 text-xs">
                <span className="flex-1 truncate">ຊ່ອງກรອກ: {f.label}</span>
                <button className="text-muted-foreground hover:text-primary" onClick={() => setFldFor({ cat: c, fld: f })}>
                  <Pencil className="size-3.5" />
                </button>
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={async () => { await delFld({ data: { id: f.id } }); reload(); }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {openCat !== undefined && (
        <CategoryDialog
          cat={openCat}
          onClose={() => setOpenCat(undefined)}
          onSave={async (v) => { await saveCat({ data: v }); toast.success("ບັນທຶກແລ້ວ"); setOpenCat(undefined); reload(); }}
        />
      )}

      {pkgFor && (
        <PackageDialog
          pkg={pkgFor.pkg}
          categoryId={pkgFor.cat.id}
          onClose={() => setPkgFor(null)}
          onSave={async (v) => { await savePkg({ data: v }); toast.success("ບັນທຶກແລ້ວ"); setPkgFor(null); reload(); }}
        />
      )}

      {fldFor && (
        <FieldDialog
          fld={fldFor.fld}
          categoryId={fldFor.cat.id}
          onClose={() => setFldFor(null)}
          onSave={async (v) => { await saveFld({ data: v }); toast.success("ບັນທຶກແລ້ວ"); setFldFor(null); reload(); }}
        />
      )}
    </div>
  );
}

function CategoryDialog({ cat, onClose, onSave }: {
  cat: Cat | null;
  onClose: () => void;
  onSave: (v: { id?: string; name: string; image_url: string | null; section: "popular" | "other"; sort_order: number; is_active: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState(cat?.name ?? "");
  const [img, setImg] = useState(cat?.image_url ?? "");
  const [section, setSection] = useState<"popular" | "other">((cat?.section as "popular" | "other") ?? "other");
  const [sort, setSort] = useState(String(cat?.sort_order ?? 0));
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface-2 border-border max-w-sm">
        <DialogHeader><DialogTitle>{cat ? "ແກ້ໄຂໝວດໝູ່" : "ເພີ່ມໝວດໝູ່"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">ຊື່ເກມ</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">ລິ້ງຮູບພາບ</Label><Input value={img} onChange={(e) => setImg(e.target.value)} placeholder="https://..." className="mt-1" /></div>
          <div>
            <Label className="text-xs">ໝວດ</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(["popular", "other"] as const).map((s) => (
                <button key={s} type="button" onClick={() => setSection(s)}
                  className={`rounded-xl border p-2 text-sm ${section === s ? "border-primary bg-primary/10" : "border-border/60 bg-surface"}`}>
                  {s === "popular" ? "ເກມນິຍົມ" : "ເກມອື່ນໆ"}
                </button>
              ))}
            </div>
          </div>
          <div><Label className="text-xs">ລຳດັບ</Label><Input type="number" value={sort} onChange={(e) => setSort(e.target.value)} className="mt-1" /></div>
        </div>
        <DialogFooter>
          <Button className="w-full btn-neon" disabled={busy || !name.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave({ id: cat?.id, name: name.trim(), image_url: img.trim() || null, section, sort_order: parseInt(sort || "0", 10), is_active: true });
              } catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); } finally { setBusy(false); }
            }}>
            ບັນທຶກ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PackageDialog({ pkg, categoryId, onClose, onSave }: {
  pkg: Pkg | null;
  categoryId: string;
  onClose: () => void;
  onSave: (v: {
    id?: string; category_id: string; name: string; price: number;
    original_price: number | null; image_url: string | null; description: string | null;
    is_best_seller: boolean; sort_order: number; is_active: boolean;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(pkg?.name ?? "");
  const [price, setPrice] = useState(String(pkg?.price ?? ""));
  const [orig, setOrig] = useState(pkg?.original_price ? String(pkg.original_price) : "");
  const [img, setImg] = useState(pkg?.image_url ?? "");
  const [desc, setDesc] = useState(pkg?.description ?? "");
  const [best, setBest] = useState(pkg?.is_best_seller ?? false);
  const [sort, setSort] = useState(String(pkg?.sort_order ?? 0));
  const [busy, setBusy] = useState(false);
  const off = orig && parseInt(orig, 10) > parseInt(price || "0", 10)
    ? Math.round(((parseInt(orig, 10) - parseInt(price || "0", 10)) / parseInt(orig, 10)) * 100)
    : 0;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface-2 border-border max-w-sm">
        <DialogHeader><DialogTitle>{pkg ? "ແກ້ໄຂແພັກເກັດ" : "ເພີ່ມແພັກເກັດ"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">ຊື່ແພັກເກັດ (ເຊັ່ນ 100 ເພັດ)</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">ລິ້ງຮູບພາບ (ຮູບນ້ອຍ)</Label><Input value={img} onChange={(e) => setImg(e.target.value)} placeholder="https://..." className="mt-1" /></div>
          <div><Label className="text-xs">ລາຍລະອຽດ</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">ລາຄາເຕັມ</Label><Input type="number" value={orig} onChange={(e) => setOrig(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">ລາຄາຂາຍ (ກີບ)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1" /></div>
          </div>
          {off > 0 && <p className="text-xs text-destructive">ຈະສະແດງປ້າຍ: ລົດ {off}%</p>}
          <button type="button" onClick={() => setBest(!best)}
            className={`w-full rounded-xl border p-2 text-sm ${best ? "border-accent bg-accent/15" : "border-border/60 bg-surface"}`}>
            ★ ຂາຍດີທີ່ສຸດ {best ? "(ເປີດ)" : "(ປິດ)"}
          </button>
          <div><Label className="text-xs">ລຳດັບ (ນ້ອຍ = ຢູ່ດ້ານໜ້າ)</Label><Input type="number" value={sort} onChange={(e) => setSort(e.target.value)} className="mt-1" /></div>
        </div>
        <DialogFooter>
          <Button className="w-full btn-neon" disabled={busy || !name.trim() || !price}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave({
                  id: pkg?.id, category_id: categoryId, name: name.trim(), price: parseInt(price, 10),
                  original_price: orig ? parseInt(orig, 10) : null,
                  image_url: img.trim() || null, description: desc.trim() || null,
                  is_best_seller: best, sort_order: parseInt(sort || "0", 10), is_active: true,
                });
              } catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); } finally { setBusy(false); }
            }}>
            ບັນທຶກ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldDialog({ fld, categoryId, onClose, onSave }: {
  fld: Fld | null;
  categoryId: string;
  onClose: () => void;
  onSave: (v: { id?: string; category_id: string; label: string; placeholder: string | null; sort_order: number }) => Promise<void>;
}) {
  const [label, setLabel] = useState(fld?.label ?? "");
  const [ph, setPh] = useState(fld?.placeholder ?? "");
  const [sort, setSort] = useState(String(fld?.sort_order ?? 0));
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface-2 border-border max-w-sm">
        <DialogHeader><DialogTitle>{fld ? "ແກ້ໄຂຊ່ອງກรອກ" : "ເພີ່ມຊ່ອງກรອກ"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">ຫົວຂໍ້ (ເຊັ່ນ UID)</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">ຄຳແນະນຳ</Label><Input value={ph} onChange={(e) => setPh(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">ລຳດັບ</Label><Input type="number" value={sort} onChange={(e) => setSort(e.target.value)} className="mt-1" /></div>
        </div>
        <DialogFooter>
          <Button className="w-full btn-neon" disabled={busy || !label.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave({ id: fld?.id, category_id: categoryId, label: label.trim(), placeholder: ph.trim() || null, sort_order: parseInt(sort || "0", 10) });
              } catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); } finally { setBusy(false); }
            }}>
            ບັນທຶກ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
