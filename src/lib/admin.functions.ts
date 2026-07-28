import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "./admin.server";


// ---------------- stats ----------------
export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context as any);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [{ count: users }, { count: pending }, { data: sales }, { data: allSales }] = await Promise.all([
      db.from("profiles").select("id", { count: "exact", head: true }),
      db.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      db.from("orders").select("price").eq("status", "approved").gte("created_at", monthStart.toISOString()),
      db.from("orders").select("price").eq("status", "approved"),
    ]);

    const sum = (rows: { price: number }[] | null) =>
      (rows ?? []).reduce((a, r) => a + Number(r.price ?? 0), 0);

    return {
      users: users ?? 0,
      pendingOrders: pending ?? 0,
      monthSales: sum(sales as any),
      totalSales: sum(allSales as any),
      monthLabel: monthStart.toISOString().slice(0, 7),
    };
  });

// ---------------- users ----------------
export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ q: z.string().max(100).optional() }).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    let query = db
      .from("profiles")
      .select("id, username, email, wallet_balance, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.q) query = query.or(`username.ilike.%${data.q}%,email.ilike.%${data.q}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { users: rows ?? [] };
  });

// ---------------- categories ----------------
export const adminListCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context as any);
    const [{ data: cats }, { data: pkgs }, { data: fields }] = await Promise.all([
      db.from("categories").select("*").order("sort_order"),
      db.from("packages").select("*").order("sort_order"),
      db.from("category_input_fields").select("*").order("sort_order"),
    ]);
    return { categories: cats ?? [], packages: pkgs ?? [], fields: fields ?? [] };
  });

export const adminSaveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(80),
        image_url: z.string().max(500).nullable().optional(),
        section: z.enum(["popular", "other"]).default("other"),
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
      section: data.section,
      sort_order: data.sort_order,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await db.from("categories").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await db.from("categories").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    await db.from("category_input_fields").delete().eq("category_id", data.id);
    await db.from("packages").delete().eq("category_id", data.id);
    const { error } = await db.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- packages ----------------
export const adminSavePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        category_id: z.string().uuid(),
        name: z.string().min(1).max(80),
        price: z.number().int().min(0),
        original_price: z.number().int().min(0).nullable().optional(),
        image_url: z.string().max(500).nullable().optional(),
        description: z.string().max(500).nullable().optional(),
        is_best_seller: z.boolean().default(false),
        sort_order: z.number().int().default(0),
        is_active: z.boolean().default(true),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const payload = {
      category_id: data.category_id,
      name: data.name,
      price: data.price,
      original_price: data.original_price ?? null,
      image_url: data.image_url || null,
      description: data.description || null,
      is_best_seller: data.is_best_seller,
      sort_order: data.sort_order,
      is_active: data.is_active,
    };
    const { error } = data.id
      ? await db.from("packages").update(payload).eq("id", data.id)
      : await db.from("packages").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeletePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const { error } = await db.from("packages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- input fields ----------------
export const adminSaveField = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        category_id: z.string().uuid(),
        label: z.string().min(1).max(80),
        placeholder: z.string().max(120).nullable().optional(),
        sort_order: z.number().int().default(0),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const payload = {
      category_id: data.category_id,
      label: data.label,
      placeholder: data.placeholder || null,
      sort_order: data.sort_order,
    };
    const { error } = data.id
      ? await db.from("category_input_fields").update(payload).eq("id", data.id)
      : await db.from("category_input_fields").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteField = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const { error } = await db.from("category_input_fields").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- orders ----------------
export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        status: z.enum(["all", "pending", "approved", "rejected"]).default("pending"),
        page: z.number().int().min(1).default(1),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const perPage = 10;
    const from = (data.page - 1) * perPage;
    let query = db
      .from("orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + perPage - 1);
    if (data.status !== "all") query = query.eq("status", data.status);
    const { data: rows, count, error } = await query;
    if (error) throw new Error(error.message);

    const userIds = [...new Set((rows ?? []).map((r: any) => r.user_id))];
    const { data: profiles } = userIds.length
      ? await db.from("profiles").select("id, username, email").in("id", userIds)
      : { data: [] as any[] };
    const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    return {
      orders: (rows ?? []).map((r: any) => ({ ...r, user: map.get(r.user_id) ?? null })),
      total: count ?? 0,
      perPage,
      page: data.page,
    };
  });

export const adminDecideOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
        message: z.string().max(500).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const { data: order, error } = await db.from("orders").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("ບໍ່ພົບອໍເດີ");
    if (order.status !== "pending") throw new Error("ອໍເດີນີ້ຖືກດຳເນີນການແລ້ວ");

    if (data.action === "reject") {
      const { data: prof } = await db
        .from("profiles")
        .select("wallet_balance")
        .eq("id", order.user_id)
        .maybeSingle();
      const newBalance = Number(prof?.wallet_balance ?? 0) + Number(order.price);
      await db
        .from("profiles")
        .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
        .eq("id", order.user_id);
      await db.from("wallet_transactions").insert({
        user_id: order.user_id,
        amount: Number(order.price),
        balance_after: newBalance,
        kind: "order_refund",
        reference_id: order.id,
        note: `ຄືນເງິນ ${order.package_name}`,
      });
    }

    await db
      .from("orders")
      .update({
        status: data.action === "approve" ? "approved" : "rejected",
        admin_message: data.message || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    await db.from("notifications").insert({
      user_id: order.user_id,
      title: data.action === "approve" ? "ອໍເດີສຳເລັດ" : "ອໍເດີບໍ່ສຳເລັດ",
      body:
        data.message ||
        (data.action === "approve"
          ? `${order.category_name} — ${order.package_name} ສຳເລັດແລ້ວ`
          : `${order.category_name} — ${order.package_name} ຖືກປະຕິເສດ, ເງິນຄືນເຂົ້າກະເປົາແລ້ວ`),
    });

    const { notifyDiscord } = await import("./discord.server");
    await notifyDiscord(
      data.action === "approve" ? "✅ ອໍເດີສຳເລັດ" : "❌ ອໍເດີຖືກປະຕິເສດ (ຄືນເງິນແລ້ວ)",
      [
        `**ເກມ:** ${order.category_name}`,
        `**ແພັກເກັດ:** ${order.package_name}`,
        `**ລາຄາ:** ${Number(order.price).toLocaleString()} ₭`,
        data.message ? `**ຂໍ້ຄວາມ:** ${data.message}` : "",
        `**Order ID:** ${order.id}`,
      ],
      data.action === "approve" ? 0x22c55e : 0xef4444,
    );

    return { ok: true };
  });


export const adminSendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ user_id: z.string().uuid(), title: z.string().max(120).default("ຂໍ້ຄວາມຈາກແອດມິນ"), body: z.string().min(1).max(1000) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const { error } = await db.from("notifications").insert({
      user_id: data.user_id,
      title: data.title,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- settings ----------------
export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context as any);
    const { data } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
    return { settings: data ?? null };
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        bank_account_name: z.string().max(120).nullable().optional(),
        bank_account_number: z.string().max(60).nullable().optional(),
        bank_name: z.string().max(120).nullable().optional(),
        bank_qr_image_url: z.string().max(500).nullable().optional(),
        contact_info: z.string().max(1000).nullable().optional(),
        primary_color: z.string().max(40).nullable().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const { error } = await db
      .from("site_settings")
      .upsert({ id: 1, ...data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
