import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminCategories } from "@/components/admin/AdminCategories";
import { AdminCards } from "@/components/admin/AdminCards";
import { AdminOrders } from "@/components/admin/AdminOrders";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { AdminTopups } from "@/components/admin/AdminTopups";
import { AdminStore } from "@/components/admin/AdminStore";
import { AdminCardTopups } from "@/components/admin/AdminCardTopups";
import { AdminCodes } from "@/components/admin/AdminCodes";


export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "ໜ້າແອດມິນ — Gamelao" },
      { name: "description", content: "ຈັດການລະບົບ Gamelao: ສະຖິຕິ, ຜູ້ໃຊ້, ໝວດໝູ່ເກມ, ບັດເຕີມເງິນ, ອໍເດີ ແລະ ຕັ້ງຄ່າ" },
      { property: "og:title", content: "ໜ້າແອດມິນ — Gamelao" },
      { property: "og:description", content: "ຈັດການລະບົບ Gamelao" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const TABS = [
  { key: "dashboard", label: "ສະຖິຕິ" },
  { key: "users", label: "ຜູ້ໃຊ້" },
  { key: "categories", label: "ໝວດໝູ່" },
  { key: "cards", label: "ບັດເຕີມເງິນ" },
  { key: "store", label: "ສິນຄ້າທົ່ວໄປ" },
  { key: "orders", label: "ອໍເດີ" },

  { key: "cardtopups", label: "ອະນຸມັດບັດເຕີມເງິນ" },
  { key: "codes", label: "ສ້າງໂຄດ" },
  { key: "topups", label: "ປະຫວັດເຕີມເງິນ" },
  { key: "settings", label: "ຕັ້ງຄ່າ" },
] as const;


function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("dashboard");

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="px-4 space-y-4">
      <h1 className="text-lg font-bold">ໜ້າແອດມິນ</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs whitespace-nowrap border cursor-pointer",
              tab === t.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 bg-surface text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <AdminDashboard />}
      {tab === "users" && <AdminUsers />}
      {tab === "categories" && <AdminCategories />}
      {tab === "cards" && <AdminCards />}
      {tab === "store" && <AdminStore />}
      {tab === "orders" && <AdminOrders />}

      {tab === "cardtopups" && <AdminCardTopups />}
      {tab === "codes" && <AdminCodes />}
      {tab === "topups" && <AdminTopups />}
      {tab === "settings" && <AdminSettings />}
    </div>
  );
}
