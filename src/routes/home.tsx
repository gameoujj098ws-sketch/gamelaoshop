import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Home, Hammer } from "lucide-react";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "ໜ້າຫຼັກ — Gamelao" },
      { name: "description", content: "ໜ້າຫຼັກຮ້ານ Gamelao — ສິນຄ້າທົ່ວໄປກຳລັງພັດທະນາ" },
      { property: "og:title", content: "ໜ້າຫຼັກ — Gamelao" },
      { property: "og:description", content: "ໜ້າຫຼັກຮ້ານ Gamelao — ກຳລັງພັດທະນາ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomeMainPage,
});

function HomeMainPage() {
  return (
    <AppShell>
      <div className="px-4">
        <div className="card-tile p-8 text-center space-y-3">
          <div className="mx-auto grid place-items-center size-16 rounded-2xl bg-primary/15">
            <Home className="size-8 text-primary" />
          </div>
          <h1 className="text-lg font-bold">ໜ້າຫຼັກ</h1>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Hammer className="size-4" /> ແອດມິນຍັງບໍ່ໄດ້ເຮັດໜ້ານີ້ — ກຳລັງພັດທະນາ
          </p>
          <Link to="/" className="btn-neon inline-block rounded-full px-6 py-2 text-sm">ໄປໜ້າເຕີມເກມ</Link>
        </div>
      </div>
    </AppShell>
  );
}
