import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Full wallet top-up history for the signed-in customer: QR/slip requests with
 * a viewable (signed) slip image, plus card top-ups awaiting or after review.
 */
export const myTopupHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };

    const [{ data: slipRows }, { data: cardRows }] = await Promise.all([
      supabase
        .from("topup_requests")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["approved", "rejected", "pending", "expired"])
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("card_topups")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const qr = await Promise.all(
      (slipRows ?? []).map(async (r: any) => {
        let slip: string | null = null;
        if (r.slip_url) {
          const { data: signed } = await supabaseAdmin.storage
            .from("slips")
            .createSignedUrl(r.slip_url, 60 * 60);
          slip = signed?.signedUrl ?? null;
        }
        return {
          id: r.id,
          kind: "qr" as const,
          amount: Number(r.amount),
          status: r.status as string,
          created_at: r.created_at as string,
          verified_at: r.verified_at as string | null,
          verified_amount: r.verified_amount as number | null,
          verified_name: r.verified_name as string | null,
          slip_signed_url: slip,
          card_number: null as string | null,
          fee_percent: null as number | null,
          admin_note: null as string | null,
        };
      }),
    );

    const cards = (cardRows ?? []).map((r: any) => ({
      id: r.id,
      kind: "card" as const,
      amount: Number(r.credit_amount),
      status: r.status as string,
      created_at: r.created_at as string,
      verified_at: r.reviewed_at as string | null,
      verified_amount: r.status === "approved" ? Number(r.credit_amount) : null,
      verified_name: null as string | null,
      slip_signed_url: null as string | null,
      card_number: r.card_number as string,
      fee_percent: Number(r.fee_percent),
      admin_note: (r.admin_note ?? null) as string | null,
    }));

    const items = [...qr, ...cards].sort(
      (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
    );
    return { items };
  });
