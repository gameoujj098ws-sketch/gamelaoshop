import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "ຕັ້ງຄ່າ — Gamelao" },
      { name: "description", content: "ຕັ້ງຄ່າທົ່ວໄປຂອງບັນຊີ" },
      { property: "og:title", content: "ຕັ້ງຄ່າ — Gamelao" },
      { property: "og:description", content: "ຕັ້ງຄ່າທົ່ວໄປຂອງບັນຊີ" },
    ],
  }),
  component: () => (
    <div className="px-4">
      <div className="card-tile p-6 text-center">
        <Settings className="size-8 text-primary mx-auto mb-3" />
        <h2 className="font-bold">ຕັ້ງຄ່າທົ່ວໄປ</h2>
        <p className="text-sm text-muted-foreground mt-1">ຈະເປີດໃນເຟດຕໍ່ໄປ</p>
      </div>
    </div>
  ),
});
