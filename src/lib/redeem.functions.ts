import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Redeems a top-up code and credits the wallet immediately. */
export const redeemCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ code: z.string().trim().min(3).max(64) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.trim();

    const { data: row, error } = await supabaseAdmin
      .from("redeem_codes")
      .select("id, amount, is_active, max_uses, used_count")
      .ilike("code", code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("ໂຄດບໍ່ຖືກຕ້ອງ");

    const maxUses = Number((row as any).max_uses ?? 1);
    const usedCount = Number((row as any).used_count ?? 0);
    if (!row.is_active || usedCount >= maxUses) throw new Error("ໂຄດນີ້ຖືກໃຊ້ຄົບແລ້ວ");

    // One account may only use a given code once.
    const { error: claimErr } = await supabaseAdmin
      .from("redeem_code_uses")
      .insert({ code_id: row.id, user_id: userId, amount: Number(row.amount) });
    if (claimErr) {
      if (claimErr.code === "23505") throw new Error("ທ່ານໃຊ້ໂຄດນີ້ແລ້ວ");
      throw new Error(claimErr.message);
    }

    const { count } = await supabaseAdmin
      .from("redeem_code_uses")
      .select("id", { count: "exact", head: true })
      .eq("code_id", row.id);
    const nextCount = count ?? usedCount + 1;

    if (nextCount > maxUses) {
      // Lost the race — undo the claim and refuse.
      await supabaseAdmin
        .from("redeem_code_uses")
        .delete()
        .eq("code_id", row.id)
        .eq("user_id", userId);
      throw new Error("ໂຄດນີ້ຖືກໃຊ້ຄົບແລ້ວ");
    }

    await supabaseAdmin
      .from("redeem_codes")
      .update({
        used_count: nextCount,
        is_active: nextCount < maxUses,
        redeemed_by: userId,
        redeemed_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("wallet_balance")
      .eq("id", userId)
      .maybeSingle();
    const balance = Number(prof?.wallet_balance ?? 0) + Number(row.amount);

    await supabaseAdmin
      .from("profiles")
      .update({ wallet_balance: balance, updated_at: new Date().toISOString() })
      .eq("id", userId);

    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: userId,
      amount: Number(row.amount),
      balance_after: balance,
      kind: "redeem_code",
      reference_id: row.id,
      note: "ເຕີມດ້ວຍໂຄດ",
    });

    return { ok: true, amount: Number(row.amount), balance };
  });
