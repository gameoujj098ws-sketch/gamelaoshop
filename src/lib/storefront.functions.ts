import { createServerFn } from "@tanstack/react-start";

/**
 * Public storefront feed: every purchase (general store + game top-ups) from
 * the last 24 hours, plus the top customer top-up ranking (admins excluded).
 */
export const getStorefrontFeed = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: storeOrders }, { data: gameOrders }, { data: topups }, { data: admins }] =
    await Promise.all([
      supabaseAdmin
        .from("store_orders")
        .select("id, user_id, product_name, price, qty, created_at, product_id")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(30),
      supabaseAdmin
        .from("orders")
        .select("id, user_id, category_name, package_name, price, created_at, package_id, card_package_id")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(30),
      supabaseAdmin
        .from("topup_requests")
        .select("user_id, amount, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: true }),
      supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin"),
    ]);

  const adminIds = new Set((admins ?? []).map((a: any) => a.user_id as string));

  // Top donate: sum approved top-ups per customer. Ties resolve to whoever
  // topped up first.
  const totals = new Map<string, { total: number; count: number; first: number }>();
  for (const t of topups ?? []) {
    const uid = (t as any).user_id as string;
    if (adminIds.has(uid)) continue;
    const at = Date.parse((t as any).created_at ?? "") || Number.MAX_SAFE_INTEGER;
    const cur = totals.get(uid) ?? { total: 0, count: 0, first: at };
    cur.total += Number((t as any).amount ?? 0);
    cur.count += 1;
    cur.first = Math.min(cur.first, at);
    totals.set(uid, cur);
  }

  const topIds = [...totals.entries()]
    .sort((a, b) => b[1].total - a[1].total || a[1].first - b[1].first)
    .slice(0, 3)
    .map(([id]) => id);

  const userIds = [
    ...new Set([
      ...(storeOrders ?? []).map((o: any) => o.user_id as string),
      ...(gameOrders ?? []).map((o: any) => o.user_id as string),
      ...topIds,
    ]),
  ];
  const { data: profiles } = userIds.length
    ? await supabaseAdmin.from("profiles").select("id, username, avatar_url").in("id", userIds)
    : { data: [] as any[] };
  const nameOf = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  // Product / package images for the feed thumbnails.
  const productIds = [...new Set((storeOrders ?? []).map((o: any) => o.product_id).filter(Boolean))];
  const pkgIds = [...new Set((gameOrders ?? []).map((o: any) => o.package_id).filter(Boolean))];
  const cardPkgIds = [...new Set((gameOrders ?? []).map((o: any) => o.card_package_id).filter(Boolean))];

  const [{ data: prods }, { data: pkgs }, { data: cardPkgs }] = await Promise.all([
    productIds.length
      ? supabaseAdmin.from("store_products").select("id, image_url").in("id", productIds)
      : Promise.resolve({ data: [] as any[] }),
    pkgIds.length
      ? supabaseAdmin.from("packages").select("id, image_url, category_id").in("id", pkgIds)
      : Promise.resolve({ data: [] as any[] }),
    cardPkgIds.length
      ? supabaseAdmin.from("card_packages").select("id, image_url").in("id", cardPkgIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const imgOf = new Map<string, string | null>([
    ...(prods ?? []).map((p: any) => [p.id, p.image_url] as [string, string | null]),
    ...(pkgs ?? []).map((p: any) => [p.id, p.image_url] as [string, string | null]),
    ...(cardPkgs ?? []).map((p: any) => [p.id, p.image_url] as [string, string | null]),
  ]);

  const recent = [
    ...(storeOrders ?? []).map((o: any) => ({
      id: `s-${o.id}`,
      kind: "store" as const,
      product_name: o.product_name as string,
      price: Number(o.price ?? 0),
      qty: Number(o.qty ?? 1),
      created_at: o.created_at as string,
      username: (nameOf.get(o.user_id)?.username as string) ?? "ລູກຄ້າ",
      image_url: (o.product_id ? imgOf.get(o.product_id) : null) ?? null,
    })),
    ...(gameOrders ?? []).map((o: any) => ({
      id: `g-${o.id}`,
      kind: "game" as const,
      product_name: [o.category_name, o.package_name].filter(Boolean).join(" — ") || "ເຕີມເກມ",
      price: Number(o.price ?? 0),
      qty: 1,
      created_at: o.created_at as string,
      username: (nameOf.get(o.user_id)?.username as string) ?? "ລູກຄ້າ",
      image_url:
        (o.package_id ? imgOf.get(o.package_id) : null) ??
        (o.card_package_id ? imgOf.get(o.card_package_id) : null) ??
        null,
    })),
  ]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 30);

  return {
    recent,
    top: topIds.map((id, i) => ({
      rank: i + 1,
      user_id: id,
      username: (nameOf.get(id)?.username as string) ?? "ລູກຄ້າ",
      total: totals.get(id)!.total,
      count: totals.get(id)!.count,
    })),
  };
});
