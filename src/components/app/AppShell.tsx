import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col mx-auto max-w-md relative">
      <TopBar />
      <main className="flex-1 pb-24 pt-2">{children}</main>
      <BottomNav />
    </div>
  );
}
