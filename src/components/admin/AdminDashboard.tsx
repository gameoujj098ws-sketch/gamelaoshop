import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminStats } from "@/lib/admin.functions";
import { formatKip } from "@/lib/format";
import { Loader2, Users, TrendingUp, Clock, Coins } from "lucide-react";
import { toast } from "sonner";

export function AdminDashboard() {
  const get = useServerFn(adminStats);
  const [s, setS] = useState<{ users: number; pendingOrders: number; monthSales: number; totalSales: number; monthLabel: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setS((await get({ data: undefined as never })) as never);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ");
      }
    })();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  if (!s) return <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin text-primary" /></div>;

  const items = [
    { icon: Users, label: "ສະມາຊິກທັງໝົດ", value: s.users.toLocaleString() },
    { icon: TrendingUp, label: `ຍອດຂາຍເດືອນ ${s.monthLabel}`, value: `${formatKip(s.monthSales)} ₭` },
    { icon: Coins, label: "ຍອດຂາຍລວມ", value: `${formatKip(s.totalSales)} ₭` },
    { icon: Clock, label: "ອໍເດີລໍຖ້າ", value: s.pendingOrders.toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((i) => (
        <div key={i.label} className="card-tile p-4">
          <i.icon className="size-5 text-primary mb-2" />
          <div className="text-xs text-muted-foreground">{i.label}</div>
          <div className="font-bold text-base mt-1">{i.value}</div>
        </div>
      ))}
    </div>
  );
}
