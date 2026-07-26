import type { SupabaseClient } from "@supabase/supabase-js";

/** Verifies the caller is an admin and returns the privileged client. */
export async function assertAdmin(context: { supabase: SupabaseClient; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("ບໍ່ມີສິດເຂົ້າເຖິງ");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}
