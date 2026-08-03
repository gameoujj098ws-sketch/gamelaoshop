import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const placeCardOrderInput = z.object({
  card_id: z.string().uuid(),
  card_package_id: z.string().uuid(),
  inputs: z.record(z.string(), z.string().max(200)),
});

/** Buys one prepaid-card package: charges the wallet and reduces stock. */
export const placeCardOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => placeCardOrderInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };

    const { data: pkg, error: pkgErr } = await supabase
      .from("card_packages")
      .select("id, name, price, stock, card_id, prepaid_cards:card_id(id, name)")
      .eq("id", data.card_package_id)
      .eq("is_active", true)
      .maybeSingle();
    if (pkgErr) throw new Error(pkgErr.message);
    if (!pkg || pkg.card_id !== data.card_id) throw new Error("ບໍ່ພົບແພັກເກັດ");
    if (Number(pkg.stock ?? 0) <= 0) throw new Error("ສິນຄ້າໝົດແລ້ວ");

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    const balance = Number(profile?.wallet_balance ?? 0);
    if (balance < Number(pkg.price)) {
      throw new Error("ຍອດເງິນໃນກະເປົາບໍ່ພຽງພໍ ກະລຸນາເຕີມເງິນກ່ອນ");
    }
    const newBalance = balance - Number(pkg.price);

    const { error: updErr } = await supabase
      .from("profiles")
      .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (updErr) throw new Error(updErr.message);

    const cardName = (pkg.prepaid_cards as { name?: string } | null)?.name ?? "";
    const { data: order, error: ordErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        card_id: data.card_id,
        card_package_id: data.card_package_id,
        category_name: cardName,
        package_name: pkg.name,
        price: pkg.price,
        inputs: data.inputs,
        status: "pending",
      })
      .select("id")
      .single();
    if (ordErr) throw new Error(ordErr.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("card_packages")
      .update({ stock: Math.max(0, Number(pkg.stock ?? 0) - 1) })
      .eq("id", pkg.id);
    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: userId,
      amount: -Number(pkg.price),
      balance_after: newBalance,
      kind: "order_debit",
      reference_id: order.id,
      note: `ສັ່ງຊື້ບັດ ${pkg.name}`,
    });

    const { notifyDiscord } = await import("./discord.server");
    await notifyDiscord("💳 ອໍເດີບັດໃໝ່ (New card order)", [
      `**ບັດ:** ${cardName}`,
      `**ແພັກເກັດ:** ${pkg.name}`,
      `**ລາຄາ:** ${Number(pkg.price).toLocaleString()} ₭`,
      ...Object.entries(data.inputs).map(([k, v]) => `**${k}:** ${v}`),
      `**Order ID:** ${order.id}`,
    ]);

    return { ok: true, order_id: order.id, balance: newBalance };
  });
