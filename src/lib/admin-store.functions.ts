import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "./admin.server";

/** Everything the admin general-store tab needs. */
export const adminListStore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context as any);
    const [{ data: cats }, { data: prods }] = await Promise.all([
      db.from("store_categories").select("*").order("sort_order"),
      db.from("store_products").select("*").order("sort_order"),
    ]);
    return { categories: cats ?? [], products: prods ?? [] };
  });

export const adminSaveStoreCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(80),
        image_url: z.string().max(500).nullable().optional(),
        sort_order: z.number().int().default(0),
        is_active: z.boolean().default(true),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const payload = {
      name: data.name,
      image_url: data.image_url || null,
      sort_order: data.sort_order,
      is_active: data.is_active,
    };
    const { error } = data.id
      ? await db.from("store_categories").update(payload).eq("id", data.id)
      : await db.from("store_categories").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteStoreCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const { error } = await db.from("store_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSaveStoreProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        category_id: z.string().uuid().nullable().optional(),
        name: z.string().min(1).max(120),
        description: z.string().max(1000).nullable().optional(),
        image_url: z.string().max(500).nullable().optional(),
        price: z.number().int().min(0),
        original_price: z.number().int().min(0).nullable().optional(),
        is_hidden: z.boolean().default(false),
        sort_order: z.number().int().default(0),
        is_active: z.boolean().default(true),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const payload = {
      category_id: data.category_id || null,
      name: data.name,
      description: data.description || null,
      image_url: data.image_url || null,
      price: data.price,
      original_price: data.original_price ?? null,
      is_hidden: data.is_hidden,
      sort_order: data.sort_order,
      is_active: data.is_active,
    };
    const { error } = data.id
      ? await db.from("store_products").update(payload).eq("id", data.id)
      : await db.from("store_products").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteStoreProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    await db.from("store_product_codes").delete().eq("product_id", data.id);
    const { error } = await db.from("store_products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Lists the codes (stock lines) loaded for one product. */
export const adminListProductCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ product_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const { data: rows, error } = await db
      .from("store_product_codes")
      .select("id, code, is_sold, sold_at")
      .eq("product_id", data.product_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { codes: rows ?? [] };
  });

/**
 * Adds stock. Either a list of codes (one row per code, stock = unsold codes)
 * or a plain quantity when the product needs no codes.
 */
export const adminAddStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        product_id: z.string().uuid(),
        codes: z.array(z.string().min(1).max(300)).max(500).default([]),
        qty: z.number().int().min(0).max(10000).default(0),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const { data: prod, error: pErr } = await db
      .from("store_products")
      .select("id, stock")
      .eq("id", data.product_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!prod) throw new Error("ບໍ່ພົບສິນຄ້າ");

    let added = data.qty;
    if (data.codes.length > 0) {
      const { error } = await db
        .from("store_product_codes")
        .insert(data.codes.map((code) => ({ product_id: data.product_id, code })));
      if (error) throw new Error(error.message);
      added = data.codes.length;
    }
    if (added <= 0) throw new Error("ກະລຸນາໃສ່ຈຳນວນ ຫຼື ລະຫັດສິນຄ້າ");

    const next = Number(prod.stock ?? 0) + added;
    const { error: updErr } = await db.from("store_products").update({ stock: next }).eq("id", data.product_id);
    if (updErr) throw new Error(updErr.message);
    return { ok: true, stock: next, added };
  });

/** Removes one unsold code line and decrements stock. */
export const adminDeleteProductCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const { data: row, error: rErr } = await db
      .from("store_product_codes")
      .select("id, product_id, is_sold")
      .eq("id", data.id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!row) throw new Error("ບໍ່ພົບລະຫັດ");
    if (row.is_sold) throw new Error("ລະຫັດນີ້ຖືກຂາຍແລ້ວ");

    await db.from("store_product_codes").delete().eq("id", data.id);
    const { data: prod } = await db
      .from("store_products")
      .select("stock")
      .eq("id", row.product_id)
      .maybeSingle();
    await db
      .from("store_products")
      .update({ stock: Math.max(0, Number(prod?.stock ?? 0) - 1) })
      .eq("id", row.product_id);
    return { ok: true };
  });
