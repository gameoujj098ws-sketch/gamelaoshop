import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const cardInput = z.object({
  card_number: z.string().trim().regex(/^\d{14}$/, "ເລກບັດຕ້ອງເປັນຕົວເລກ 14 ຕົວ"),
});

/** Submits a 14-digit top-up card for manual admin approval. */
export const submitCardTopup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => cardInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };

    const { data: settings } = await supabase
      .from("site_settings")
      .select("enable_card_topup, card_topup_value, card_topup_fee_percent")
      .eq("id", 1)
      .maybeSingle();

    if (settings && settings.enable_card_topup === false) {
      throw new Error("ຊ່ອງທາງເຕີມດ້ວຍບັດຖືກປິດຢູ່ໃນເວລານີ້");
    }

    const value = Number(settings?.card_topup_value ?? 10000);
    const fee = Math.min(100, Math.max(0, Number(settings?.card_topup_fee_percent ?? 0)));
    const credit = Math.floor((value * (100 - fee)) / 100);

    // Reject a card number that was already sent and is waiting or approved.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: dup } = await supabaseAdmin
      .from("card_topups")
      .select("id")
      .eq("card_number", data.card_number)
      .in("status", ["pending", "approved"])
      .maybeSingle();
    if (dup) throw new Error("ເລກບັດນີ້ຖືກໃຊ້ ຫຼື ກຳລັງກວດສອບຢູ່ແລ້ວ");

    const { data: created, error } = await supabase
      .from("card_topups")
      .insert({
        user_id: userId,
        card_number: data.card_number,
        card_value: value,
        fee_percent: fee,
        credit_amount: credit,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const { notifyDiscord } = await import("./discord.server");
    await notifyDiscord("🎟️ ມີການເຕີມເງິນດ້ວຍບັດ (ລໍຖ້າອະນຸມັດ)", [
      `**ເລກບັດ:** ${data.card_number}`,
      `**ມູນຄ່າ:** ${value.toLocaleString()} ₭`,
      `**ຄ່າທຳນຽມ:** ${fee}%`,
      `**ຈະໄດ້ຮັບ:** ${credit.toLocaleString()} ₭`,
    ]);

    return { ok: true, request: created };
  });

/** The signed-in customer's own card top-up submissions. */
export const myCardTopups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data } = await supabase
      .from("card_topups")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    return { items: data ?? [] };
  });
