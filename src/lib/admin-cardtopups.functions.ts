import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "./admin.server";

/** Card top-up submissions with the customer's profile attached. */
export const adminListCardTopups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    let query = db
      .from("card_topups")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const ids = [...new Set((rows ?? []).map((r: any) => r.user_id))];
    const { data: profiles } = ids.length
      ? await db.from("profiles").select("id, username, email, avatar_url").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    return { items: (rows ?? []).map((r: any) => ({ ...r, user: map.get(r.user_id) ?? null })) };
  });

/** Approves (credits the wallet) or rejects a card top-up. */
export const adminReviewCardTopup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        approve: z.boolean(),
        note: z.string().max(500).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);

    const { data: row, error } = await db
      .from("card_topups")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("ບໍ່ພົບລາຍການ");
    if (row.status !== "pending") throw new Error("ລາຍການນີ້ຖືກດຳເນີນການແລ້ວ");

    if (!data.approve) {
      await db
        .from("card_topups")
        .update({
          status: "rejected",
          admin_note: data.note ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      await db.from("notifications").insert({
        user_id: row.user_id,
        title: "ເຕີມເງິນດ້ວຍບັດບໍ່ສຳເລັດ",
        body: data.note?.trim() || "ບັດຂອງທ່ານບໍ່ຖືກຕ້ອງ ຫຼື ຖືກໃຊ້ແລ້ວ",
      });
      return { ok: true, approved: false };
    }

    const { data: prof } = await db
      .from("profiles")
      .select("wallet_balance")
      .eq("id", row.user_id)
      .maybeSingle();
    const balance = Number(prof?.wallet_balance ?? 0) + Number(row.credit_amount);

    await db
      .from("profiles")
      .update({ wallet_balance: balance, updated_at: new Date().toISOString() })
      .eq("id", row.user_id);

    await db
      .from("card_topups")
      .update({
        status: "approved",
        admin_note: data.note ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    await db.from("wallet_transactions").insert({
      user_id: row.user_id,
      amount: Number(row.credit_amount),
      balance_after: balance,
      kind: "card_topup",
      reference_id: row.id,
      note: `ເຕີມດ້ວຍບັດ (ຄ່າທຳນຽມ ${row.fee_percent}%)`,
    });

    await db.from("notifications").insert({
      user_id: row.user_id,
      title: "ເຕີມເງິນດ້ວຍບັດສຳເລັດ",
      body: `ໄດ້ຮັບ ${Number(row.credit_amount).toLocaleString()} ₭ ເຂົ້າກະເປົາແລ້ວ`,
    });

    return { ok: true, approved: true, balance };
  });
