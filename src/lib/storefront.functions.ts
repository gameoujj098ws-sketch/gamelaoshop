import { createServerFn } from "@tanstack/react-start";

/**
 * Public storefront feed: purchases from the last 24 hours and the top
 * customer top-up ranking (admins excluded).
 */
export const getStorefrontFeed = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: orders }, { data: topups }, { data: admins }] = await Promise.all([
    supabaseAdmin
      .from("store_orders")
      .select("id, user_id, product_name, price, qty, created_at, product_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("topup_requests")
      .select("user_id, amount")
      .eq("status", "approved"),
    supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin"),
  ]);

  const adminIds = new Set((admins ?? []).map((a: any) => a.user_id as string));

  const totals = new Map<string, { total: number; count: number }>();
  for (const t of topups ?? []) {
    const uid = (t as any).user_id as string;
    if (adminIds.has(uid)) continue;
    const cur = totals.get(uid) ?? { total: 0, count: 0 };
    cur.total += Number((t as any).amount ?? 0);
    cur.count += 1;
    totals.set(uid, cur);
  }

  const orderUserIds = (orders ?? []).map((o: any) => o.user_id as string);
  const topIds = [...totals.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 3)
    .map(([id]) => id);

  const ids = [...new Set([...orderUserIds, ...topIds])];
  const { data: profiles } = ids.length
    ? await supabaseAdmin.from("profiles").select("id, username, avatar_url").in("id", ids)
    : { data: [] as any[] };
  const nameOf = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  const productIds = [...new Set((orders ?? []).map((o: any) => o.product_id).filter(Boolean))];
  const { data: prods } = productIds.length
    ? await supabaseAdmin.from("store_products").select("id, image_url").in("id", productIds)
    : { data: [] as any[] };
  const imgOf = new Map((prods ?? []).map((p: any) => [p.id, p.image_url as string | null]));

  return {
    recent: (orders ?? []).map((o: any) => ({
      id: o.id as string,
      product_name: o.product_name as string,
      price: Number(o.price ?? 0),
      qty: Number(o.qty ?? 1),
      created_at: o.created_at as string,
      username: (nameOf.get(o.user_id)?.username as string) ?? "ລູກຄ້າ",
      image_url: (o.product_id ? imgOf.get(o.product_id) : null) ?? null,
    })),
    top: topIds.map((id, i) => ({
      rank: i + 1,
      user_id: id,
      username: (nameOf.get(id)?.username as string) ?? "ລູກຄ້າ",
      total: totals.get(id)!.total,
      count: totals.get(id)!.count,
    })),
  };
});
