import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const placeOrderInput = z.object({
  category_id: z.string().uuid(),
  package_id: z.string().uuid(),
  inputs: z.record(z.string(), z.string().max(200)),
});

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => placeOrderInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: pkg, error: pkgErr } = await supabase
      .from("packages")
      .select("id, name, price, category_id, categories:category_id(id, name)")
      .eq("id", data.package_id)
      .eq("is_active", true)
      .maybeSingle();
    if (pkgErr) throw new Error(pkgErr.message);
    if (!pkg || pkg.category_id !== data.category_id) {
      throw new Error("ບໍ່ພົບແພັກເກັດ");
    }

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    const balance = profile?.wallet_balance ?? 0;
    if (balance < pkg.price) {
      throw new Error("ຍອດເງິນໃນກະເປົາບໍ່ພຽງພໍ ກະລຸນາເຕີມເງິນກ່ອນ");
    }

    const newBalance = balance - pkg.price;

    // Update balance
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (updErr) throw new Error(updErr.message);

    // Insert order
    const cat = pkg.categories as { name?: string } | null;
    const { data: order, error: ordErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        category_id: data.category_id,
        package_id: data.package_id,
        category_name: cat?.name ?? "",
        package_name: pkg.name,
        price: pkg.price,
        inputs: data.inputs,
        status: "pending",
      })
      .select("id")
      .single();
    if (ordErr) throw new Error(ordErr.message);

    // Log wallet debit — service_role allowed; use admin client
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: userId,
      amount: -pkg.price,
      balance_after: newBalance,
      kind: "order_debit",
      reference_id: order.id,
      note: `ສັ່ງຊື້ ${pkg.name}`,
    });

    const { notifyDiscord } = await import("./discord.server");
    await notifyDiscord("🎮 ອໍເດີໃໝ່ (New order)", [
      `**ເກມ:** ${cat?.name ?? "-"}`,
      `**ແພັກເກັດ:** ${pkg.name}`,
      `**ລາຄາ:** ${pkg.price.toLocaleString()} ₭`,
      ...Object.entries(data.inputs).map(([k, v]) => `**${k}:** ${v}`),
      `**Order ID:** ${order.id}`,
    ]);

    return { ok: true, order_id: order.id, balance: newBalance };
  });

