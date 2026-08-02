import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListCards, adminSaveCard, adminDeleteCard,
  adminSaveCardPackage, adminDeleteCardPackage, adminAdjustCardStock,
  adminSaveCardField, adminDeleteCardField,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatKip } from "@/lib/format";
import { Plus, Trash2, Pencil, Package, ListPlus, Loader2, Boxes } from "lucide-react";

interface Card { id: string; name: string; image_url: string | null; sort_order: number; is_active: boolean }
interface CardPkg {
  id: string; card_id: string; name: string; price: number; original_price: number | null;
  image_url: string | null; description: string | null; stock: number;
  is_best_seller: boolean; sort_order: number; is_active: boolean;
}
interface CardFld { id: string; card_id: string; label: string; placeholder: string | null; sort_order: number }

export function AdminCards() {
  const list = useServerFn(adminListCards);
  const saveCard = useServerFn(adminSaveCard);
  const delCard = useServerFn(adminDeleteCard);
  const savePkg = useServerFn(adminSaveCardPackage);
  const delPkg = useServerFn(adminDeleteCardPackage);
  const adjust = useServerFn(adminAdjustCardStock);
  const saveFld = useServerFn(adminSaveCardField);
  const delFld = useServerFn(adminDeleteCardField);

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [pkgs, setPkgs] = useState<CardPkg[]>([]);
  const [flds, setFlds] = useState<CardFld[]>([]);
  const [openCard, setOpenCard] = useState<Card | null | undefined>(undefined);
  const [pkgFor, setPkgFor] = useState<{ card: Card; pkg: CardPkg | null } | null>(null);
  const [fldFor, setFldFor] = useState<{ card: Card; fld: CardFld | null } | null>(null);
  const [stockFor, setStockFor] = useState<CardPkg | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const res = await list({ data: undefined as never });
      setCards(res.cards as Card[]);
      setPkgs(res.packages as CardPkg[]);
      setFlds(res.fields as CardFld[]);
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
      <Button className="w-full btn-neon" onClick={() => setOpenCard(null)}>
        <Plus className="size-4 mr-1" /> ເພີ່ມບັດເຕີມເງິນ
      </Button>

      {cards.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">ຍັງບໍ່ມີບັດ</p>}

      {cards.map((c) => (
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
                ບັດເຕີມເງິນ · {c.is_active ? "ເປີດ" : "ປິດ"}
              </div>
            </div>
            <button className="p-2 text-muted-foreground hover:text-primary" onClick={() => setOpenCard(c)}>
              <Pencil className="size-4" />
            </button>
            <button
              className="p-2 text-muted-foreground hover:text-destructive"
              onClick={async () => {
                if (!confirm(`ລົບ ${c.name}?`)) return;
                await delCard({ data: { id: c.id } });
                toast.success("ລົບແລ້ວ");
                reload();
              }}
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPkgFor({ card: c, pkg: null })}>
              <Package className="size-4 mr-1" /> ເພີ່ມແພັກເກັດ
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setFldFor({ card: c, fld: null })}>
              <ListPlus className="size-4 mr-1" /> ເພີ່ມຊ່ອງກອກ
            </Button>
          </div>

          <div className="space-y-1">
            {pkgs.filter((p) => p.card_id === c.id).map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
                {p.image_url && <img src={p.image_url} alt={p.name} className="size-7 rounded object-contain" />}
                <span className="flex-1 truncate">
                  {p.name}
                  {p.is_best_seller && <span className="ml-1 text-[9px] text-accent">★ ຂາຍດີ</span>}
                </span>
                <span className={p.stock > 0 ? "text-xs text-primary" : "text-xs text-destructive"}>
                  ສະຕັອກ {p.stock}
                </span>
                <span className="text-success text-xs">{formatKip(p.price)} ₭</span>
                <button className="text-muted-foreground hover:text-primary" onClick={() => setStockFor(p)}>
                  <Boxes className="size-3.5" />
                </button>
                <button className="text-muted-foreground hover:text-primary" onClick={() => setPkgFor({ card: c, pkg: p })}>
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
            {flds.filter((f) => f.card_id === c.id).map((f) => (
              <div key={f.id} className="flex items-center gap-2 rounded-lg bg-surface/60 px-3 py-2 text-xs">
                <span className="flex-1 truncate">ຊ່ອງກອກ: {f.label}</span>
                <button className="text-muted-foreground hover:text-primary" onClick={() => setFldFor({ card: c, fld: f })}>
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

      {openCard !== undefined && (
        <CardDialog
          card={openCard}
          onClose={() => setOpenCard(undefined)}
          onSave={async (v) => { await saveCard({ data: v }); toast.success("ບັນທຶກແລ້ວ"); setOpenCard(undefined); reload(); }}
        />
      )}

      {pkgFor && (
        <CardPackageDialog
          pkg={pkgFor.pkg}
          cardId={pkgFor.card.id}
          onClose={() => setPkgFor(null)}
          onSave={async (v) => { await savePkg({ data: v }); toast.success("ບັນທຶກແລ້ວ"); setPkgFor(null); reload(); }}
        />
      )}

      {fldFor && (
        <CardFieldDialog
          fld={fldFor.fld}
          cardId={fldFor.card.id}
          onClose={() => setFldFor(null)}
          onSave={async (v) => { await saveFld({ data: v }); toast.success("ບັນທຶກແລ້ວ"); setFldFor(null); reload(); }}
        />
      )}

      {stockFor && (
        <StockDialog
          pkg={stockFor}
          onClose={() => setStockFor(null)}
          onAdjust={async (delta) => {
            const res = await adjust({ data: { id: stockFor.id, delta } });
            toast.success(`ສະຕັອກໃໝ່: ${res.stock}`);
            setStockFor(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function CardDialog({ card, onClose, onSave }: {
  card: Card | null;
  onClose: () => void;
  onSave: (v: { id?: string; name: string; image_url: string | null; sort_order: number; is_active: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState(card?.name ?? "");
  const [img, setImg] = useState(card?.image_url ?? "");
  const [sort, setSort] = useState(String(card?.sort_order ?? 0));
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface-2 border-border max-w-sm">
        <DialogHeader><DialogTitle>{card ? "ແກ້ໄຂບັດ" : "ເພີ່ມບັດ"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">ຊື່ບັດ</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">ລິ້ງຮູບພາບ</Label><Input value={img} onChange={(e) => setImg(e.target.value)} placeholder="https://..." className="mt-1" /></div>
          <div><Label className="text-xs">ລຳດັບ</Label><Input type="number" value={sort} onChange={(e) => setSort(e.target.value)} className="mt-1" /></div>
        </div>
        <DialogFooter>
          <Button className="w-full btn-neon" disabled={busy || !name.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave({ id: card?.id, name: name.trim(), image_url: img.trim() || null, sort_order: parseInt(sort || "0", 10), is_active: true });
              } catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); } finally { setBusy(false); }
            }}>
            ບັນທຶກ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CardPackageDialog({ pkg, cardId, onClose, onSave }: {
  pkg: CardPkg | null;
  cardId: string;
  onClose: () => void;
  onSave: (v: {
    id?: string; card_id: string; name: string; price: number;
    original_price: number | null; image_url: string | null; description: string | null;
    stock: number; is_best_seller: boolean; sort_order: number; is_active: boolean;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(pkg?.name ?? "");
  const [price, setPrice] = useState(String(pkg?.price ?? ""));
  const [orig, setOrig] = useState(pkg?.original_price ? String(pkg.original_price) : "");
  const [img, setImg] = useState(pkg?.image_url ?? "");
  const [desc, setDesc] = useState(pkg?.description ?? "");
  const [stock, setStock] = useState(String(pkg?.stock ?? 0));
  const [best, setBest] = useState(pkg?.is_best_seller ?? false);
  const [sort, setSort] = useState(String(pkg?.sort_order ?? 0));
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface-2 border-border max-w-sm">
        <DialogHeader><DialogTitle>{pkg ? "ແກ້ໄຂແພັກເກັດບັດ" : "ເພີ່ມແພັກເກັດບັດ"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">ຊື່ແພັກເກັດ (ເຊັ່ນ ບັດ 10,000 ກີບ)</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">ລິ້ງຮູບພາບ</Label><Input value={img} onChange={(e) => setImg(e.target.value)} placeholder="https://..." className="mt-1" /></div>
          <div><Label className="text-xs">ລາຍລະອຽດ</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">ລາຄາເຕັມ</Label><Input type="number" value={orig} onChange={(e) => setOrig(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs">ລາຄາຂາຍ (ກີບ)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1" /></div>
          </div>
          <div>
            <Label className="text-xs">ຈຳນວນສິນຄ້າ / ສະຕັອກ (1 ລະຫັດ = 1 ອັນ)</Label>
            <Input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} className="mt-1" />
          </div>
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
                  id: pkg?.id, card_id: cardId, name: name.trim(), price: parseInt(price, 10),
                  original_price: orig ? parseInt(orig, 10) : null,
                  image_url: img.trim() || null, description: desc.trim() || null,
                  stock: parseInt(stock || "0", 10),
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

function StockDialog({ pkg, onClose, onAdjust }: {
  pkg: CardPkg;
  onClose: () => void;
  onAdjust: (delta: number) => Promise<void>;
}) {
  const [qty, setQty] = useState("1");
  const [busy, setBusy] = useState(false);
  const n = Math.abs(parseInt(qty || "0", 10)) || 0;

  async function run(delta: number) {
    setBusy(true);
    try { await onAdjust(delta); }
    catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface-2 border-border max-w-sm">
        <DialogHeader><DialogTitle>ເຕີມສະຕັອກ — {pkg.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">ສະຕັອກປັດຈຸບັນ: <span className="font-bold text-foreground">{pkg.stock}</span></p>
          <div><Label className="text-xs">ຈຳນວນ</Label><Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1" /></div>
        </div>
        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={busy || n === 0} onClick={() => run(-n)}>ຫຼຸດ −{n}</Button>
          <Button className="btn-neon" disabled={busy || n === 0} onClick={() => run(n)}>ເພີ່ມ +{n}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CardFieldDialog({ fld, cardId, onClose, onSave }: {
  fld: CardFld | null;
  cardId: string;
  onClose: () => void;
  onSave: (v: { id?: string; card_id: string; label: string; placeholder: string | null; sort_order: number }) => Promise<void>;
}) {
  const [label, setLabel] = useState(fld?.label ?? "");
  const [ph, setPh] = useState(fld?.placeholder ?? "");
  const [sort, setSort] = useState(String(fld?.sort_order ?? 0));
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface-2 border-border max-w-sm">
        <DialogHeader><DialogTitle>{fld ? "ແກ້ໄຂຊ່ອງກອກ" : "ເພີ່ມຊ່ອງກອກ"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">ຫົວຂໍ້ (ເຊັ່ນ ເບີໂທ)</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">ຄຳແນະນຳ</Label><Input value={ph} onChange={(e) => setPh(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">ລຳດັບ</Label><Input type="number" value={sort} onChange={(e) => setSort(e.target.value)} className="mt-1" /></div>
        </div>
        <DialogFooter>
          <Button className="w-full btn-neon" disabled={busy || !label.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave({ id: fld?.id, card_id: cardId, label: label.trim(), placeholder: ph.trim() || null, sort_order: parseInt(sort || "0", 10) });
              } catch (e) { toast.error(e instanceof Error ? e.message : "ຜິດພາດ"); } finally { setBusy(false); }
            }}>
            ບັນທຶກ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
