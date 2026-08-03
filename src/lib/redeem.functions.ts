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
      .select("id, amount, is_active, redeemed_by")
      .ilike("code", code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("ໂຄດບໍ່ຖືກຕ້ອງ");
    if (!row.is_active || row.redeemed_by) throw new Error("ໂຄດນີ້ຖືກໃຊ້ແລ້ວ");

    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from("redeem_codes")
      .update({ redeemed_by: userId, redeemed_at: new Date().toISOString(), is_active: false })
      .eq("id", row.id)
      .is("redeemed_by", null)
      .select("id")
      .maybeSingle();
    if (claimErr) throw new Error(claimErr.message);
    if (!claimed) throw new Error("ໂຄດນີ້ຖືກໃຊ້ແລ້ວ");

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
