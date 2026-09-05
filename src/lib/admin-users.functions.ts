import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "./admin.server";

/** Full detail of one customer for the admin user manager. */
export const adminGetUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);

    const { data: profile, error } = await db
      .from("profiles")
      .select("id, username, email, wallet_balance, created_at, updated_at, is_banned, ban_reason, banned_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) throw new Error("ບໍ່ພົບຜູ້ໃຊ້");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(data.id);

    const [{ count: orderCount }, { data: topups }, { data: logins }] = await Promise.all([
      db.from("orders").select("id", { count: "exact", head: true }).eq("user_id", data.id),
      db
        .from("topup_requests")
        .select("amount, status, created_at")
        .eq("user_id", data.id)
        .eq("status", "approved"),
      db
        .from("login_history")
        .select("created_at, ip")
        .eq("user_id", data.id)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    const topupTotal = (topups ?? []).reduce((a: number, r: any) => a + Number(r.amount ?? 0), 0);

    return {
      user: {
        id: profile.id,
        username: profile.username,
        email: profile.email ?? authUser?.user?.email ?? null,
        wallet_balance: Number(profile.wallet_balance ?? 0),
        created_at: profile.created_at,
        email_confirmed: !!authUser?.user?.email_confirmed_at,
        last_sign_in_at: authUser?.user?.last_sign_in_at ?? null,
        provider: authUser?.user?.app_metadata?.provider ?? "email",
        order_count: orderCount ?? 0,
        topup_total: topupTotal,
        last_login: (logins ?? [])[0] ?? null,
        is_banned: profile.is_banned,
        ban_reason: profile.ban_reason,
        banned_at: profile.banned_at,
      },
    };
  });

/** Sets a new password for a customer account. */
export const adminSetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), password: z.string().min(8).max(72) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("notifications").insert({
      user_id: data.id,
      title: "ລະຫັດຜ່ານຖືກປ່ຽນ",
      body: "ແອດມິນໄດ້ປ່ຽນລະຫັດຜ່ານບັນຊີຂອງທ່ານ ກະລຸນາຕິດຕໍ່ແອດມິນຫາກທ່ານບໍ່ໄດ້ຮ້ອງຂໍ",
    });
    return { ok: true };
  });

/** Updates the customer's username. */
export const adminSetUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), username: z.string().min(2).max(40) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);

    const { error } = await db
      .from("profiles")
      .update({ username: data.username, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Sets the customer's wallet balance to an exact amount (or applies a delta)
 * and records the correction in wallet_transactions.
 */
export const adminSetWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        mode: z.enum(["set", "add"]).default("set"),
        amount: z.number().int().min(-100000000).max(1000000000),
        note: z.string().max(200).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const { data: prof, error: readErr } = await db
      .from("profiles")
      .select("wallet_balance")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!prof) throw new Error("ບໍ່ພົບຜູ້ໃຊ້");

    const before = Number(prof.wallet_balance ?? 0);
    const next = Math.max(0, data.mode === "set" ? data.amount : before + data.amount);
    const delta = next - before;

    const { error: updErr } = await db
      .from("profiles")
      .update({ wallet_balance: next, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    if (delta !== 0) {
      await db.from("wallet_transactions").insert({
        user_id: data.id,
        amount: delta,
        balance_after: next,
        kind: delta > 0 ? "admin_credit" : "admin_debit",
        note: data.note || "ແອດມິນແກ້ໄຂຍອດເງິນ",
      });
      await db.from("notifications").insert({
        user_id: data.id,
        title: "ຍອດເງິນຖືກແກ້ໄຂ",
        body: `ແອດມິນໄດ້ແກ້ໄຂຍອດເງິນ ${delta > 0 ? "+" : ""}${delta.toLocaleString()} ₭ — ຍອດປັດຈຸບັນ ${next.toLocaleString()} ₭`,
      });
    }

    return { ok: true, balance: next, delta };
  });

/** Bans or unbans a customer account. */
export const adminSetBan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        banned: z.boolean(),
        reason: z.string().max(500).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const { error } = await db
      .from("profiles")
      .update({
        is_banned: data.banned,
        ban_reason: data.banned ? (data.reason?.trim() || "ລະເມີດເງື່ອນໄຂການໃຊ້ງານ") : null,
        banned_at: data.banned ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await db.from("notifications").insert({
      user_id: data.id,
      title: data.banned ? "ບັນຊີຖືກແບນ" : "ບັນຊີຖືກປົດແບນ",
      body: data.banned
        ? `ບັນຊີຂອງທ່ານຖືກແບນ — ເຫດຜົນ: ${data.reason?.trim() || "ລະເມີດເງື່ອນໄຂການໃຊ້ງານ"}`
        : "ບັນຊີຂອງທ່ານໃຊ້ງານໄດ້ປົກກະຕິແລ້ວ",
    });

    return { ok: true, banned: data.banned };
  });
