import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Construction } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "ປະຫວັດ — Gamelao" },
      { name: "description", content: "ປະຫວັດການເຕີມເງິນ, ຄຳສັ່ງຊື້ ແລະ ການເຂົ້າໃຊ້ງານ" },
      { property: "og:title", content: "ປະຫວັດ — Gamelao" },
      { property: "og:description", content: "ປະຫວັດການເຕີມເງິນ, ຄຳສັ່ງຊື້ ແລະ ການເຂົ້າໃຊ້ງານ" },
    ],
  }),
  validateSearch: z.object({ tab: z.enum(["wallet", "orders", "login"]).optional() }).parse,
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <AppShell>
      <div className="px-4">
        <div className="card-tile p-6 text-center">
          <Construction className="size-8 text-primary mx-auto mb-3" />
          <h2 className="font-bold">ປະຫວັດ</h2>
          <p className="text-sm text-muted-foreground mt-1">
            ຈະສະແດງປະຫວັດການເຕີມເງິນ, ຄຳສັ່ງຊື້ ແລະ ການເຂົ້າໃຊ້ງານ ໃນເຟດຕໍ່ໄປ
          </p>
        </div>
      </div>
    </AppShell>
  );
}
