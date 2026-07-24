import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "ໜ້າແອດມິນ — DANO1" },
      { name: "description", content: "ຈັດການລະບົບ" },
      { property: "og:title", content: "ໜ້າແອດມິນ — DANO1" },
      { property: "og:description", content: "ຈັດການລະບົບ" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;
  return (
    <div className="px-4">
      <div className="card-tile p-6 text-center">
        <Shield className="size-8 text-primary mx-auto mb-3" />
        <h2 className="font-bold">ໜ້າແອດມິນ</h2>
        <p className="text-sm text-muted-foreground mt-1">
          ໜ້າຈັດການ (Dashboard, ຜູ້ໃຊ້, ໝວດໝູ່ເກມ, ອໍເດີ, ຕັ້ງຄ່າ) ຈະຖືກເປີດໃນເຟດ 3
        </p>
      </div>
    </div>
  );
}
