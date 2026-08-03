import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "./admin.server";

/** Customer top-up history for admins, with signed slip image URLs. */
export const adminListTopups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        q: z.string().max(100).optional(),
        page: z.number().int().min(1).default(1),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const perPage = 15;
    const from = (data.page - 1) * perPage;

    const { data: rows, count, error } = await db
      .from("topup_requests")
      .select("*", { count: "exact" })
      .not("slip_url", "is", null)
      .order("created_at", { ascending: false })
      .range(from, from + perPage - 1);
    if (error) throw new Error(error.message);

    const userIds = [...new Set((rows ?? []).map((r: any) => r.user_id))];
    const { data: profiles } = userIds.length
      ? await db.from("profiles").select("id, username, email").in("id", userIds)
      : { data: [] as any[] };
    const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const items = await Promise.all(
      (rows ?? []).map(async (r: any) => {
        let slip: string | null = null;
        if (r.slip_url) {
          const { data: signed } = await supabaseAdmin.storage
            .from("slips")
            .createSignedUrl(r.slip_url, 60 * 60);
          slip = signed?.signedUrl ?? null;
        }
        const user = map.get(r.user_id) ?? null;
        return { ...r, user, slip_signed_url: slip };
      }),
    );

    const q = data.q?.trim().toLowerCase();
    const filtered = q
      ? items.filter(
          (i: any) =>
            (i.user?.username ?? "").toLowerCase().includes(q) ||
            (i.user?.email ?? "").toLowerCase().includes(q),
        )
      : items;

    return { topups: filtered, total: count ?? 0, perPage, page: data.page };
  });
