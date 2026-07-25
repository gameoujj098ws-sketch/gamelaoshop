import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/topup")({
  head: () => ({
    meta: [
      { title: "ເຕີມເຄຣດິດ — Gamelao" },
      { name: "description", content: "ເຕີມເງິນເຂົ້າກະເປົາ Gamelao ຜ່ານ QR Code ຫຼື ໂຄດ" },
      { property: "og:title", content: "ເຕີມເຄຣດິດ — Gamelao" },
      { property: "og:description", content: "ເຕີມເງິນເຂົ້າກະເປົາ Gamelao ຜ່ານ QR Code ຫຼື ໂຄດ" },
    ],
  }),
  component: TopupPage,
});

function TopupPage() {
  return (
    <div className="px-4">
      <div className="card-tile p-6 text-center">
        <Wallet className="size-8 text-primary mx-auto mb-3" />
        <h2 className="font-bold">ເຕີມເຄຣດິດ</h2>
        <p className="text-sm text-muted-foreground mt-1">
          QR Code + ໂຄດ + ຕົວກວດສອບສະລິບອັດຕະໂນມັດ ຈະຖືກເປີດໃນເຟດຕໍ່ໄປ
        </p>
      </div>
    </div>
  );
}
