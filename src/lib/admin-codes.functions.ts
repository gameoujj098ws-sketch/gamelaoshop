import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "./admin.server";

/** All top-up codes with how many people already used each one. */
export const adminListCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context as any);
    const { data: rows, error } = await db
      .from("redeem_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { codes: rows ?? [] };
  });

/** Creates a code usable by a limited number of customers. */
export const adminCreateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        code: z.string().trim().min(3).max(64),
        amount: z.number().int().min(1).max(50_000_000),
        max_uses: z.number().int().min(1).max(10_000),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const { error } = await db.from("redeem_codes").insert({
      code: data.code.toUpperCase(),
      amount: data.amount,
      max_uses: data.max_uses,
      used_count: 0,
      is_active: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminToggleCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const { error } = await db
      .from("redeem_codes")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context as any);
    const { error } = await db.from("redeem_codes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
