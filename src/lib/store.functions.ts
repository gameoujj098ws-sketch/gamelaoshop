import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Buys a general-store product instantly: charges the wallet, allocates
 * available product codes and records the order (delivered immediately).
 */
export const buyStoreProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        product_id: z.string().uuid(),
        qty: z.number().int().min(1).max(20).default(1),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };

    const { data: product, error: pErr } = await supabase
      .from("store_products")
      .select("id, name, price, stock")
      .eq("id", data.product_id)
      .eq("is_active", true)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!product) throw new Error("ບໍ່ພົບສິນຄ້າ");
    if (Number(product.stock ?? 0) < data.qty) throw new Error("ສິນຄ້າບໍ່ພຽງພໍ");

    const total = Number(product.price) * data.qty;

    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    const balance = Number(prof?.wallet_balance ?? 0);
    if (balance < total) throw new Error("ຍອດເງິນໃນກະເປົາບໍ່ພຽງພໍ ກະລຸນາເຕີມເງິນກ່ອນ");
    const newBalance = balance - total;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Allocate unsold codes (if the admin loaded any for this product).
    const { data: codeRows } = await supabaseAdmin
      .from("store_product_codes")
      .select("id, code")
      .eq("product_id", product.id)
      .eq("is_sold", false)
      .order("created_at", { ascending: true })
      .limit(data.qty);
    const codes = (codeRows ?? []).map((r: any) => r.code as string);
    if ((codeRows ?? []).length > 0 && codes.length < data.qty) {
      throw new Error("ສິນຄ້າບໍ່ພຽງພໍ");
    }

    const { error: updErr } = await supabaseAdmin
      .from("profiles")
      .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (updErr) throw new Error(updErr.message);

    if ((codeRows ?? []).length > 0) {
      await supabaseAdmin
        .from("store_product_codes")
        .update({ is_sold: true, sold_to: userId, sold_at: new Date().toISOString() })
        .in(
          "id",
          (codeRows ?? []).map((r: any) => r.id),
        );
    }

    await supabaseAdmin
      .from("store_products")
      .update({ stock: Math.max(0, Number(product.stock ?? 0) - data.qty) })
      .eq("id", product.id);

    const { data: order, error: oErr } = await supabaseAdmin
      .from("store_orders")
      .insert({
        user_id: userId,
        product_id: product.id,
        product_name: product.name,
        price: total,
        qty: data.qty,
        codes,
        status: "approved",
      })
      .select("id")
      .single();
    if (oErr) throw new Error(oErr.message);

    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: userId,
      amount: -total,
      balance_after: newBalance,
      kind: "store_debit",
      reference_id: order.id,
      note: `ຊື້ສິນຄ້າ ${product.name} x${data.qty}`,
    });

    const { notifyAll } = await import("./whatsapp.server");
    await notifyAll("🛒 ອໍເດີສິນຄ້າທົ່ວໄປໃໝ່", [
      `**ສິນຄ້າ:** ${product.name}`,
      `**ຈຳນວນ:** ${data.qty}`,
      `**ລາຄາ:** ${total.toLocaleString()} ₭`,
      `**Order ID:** ${order.id}`,
    ]);

    return { ok: true, order_id: order.id, codes, balance: newBalance };
  });
