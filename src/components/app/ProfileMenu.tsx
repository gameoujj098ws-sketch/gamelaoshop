import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  User, Wallet, MessageCircle, History, LogIn, Settings, LogOut, Shield, Plus,
} from "lucide-react";
import { toast } from "sonner";

export function ProfileMenu({ username }: { username: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();

  async function handleLogout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("ອອກຈາກລະບົບແລ້ວ");
    navigate({ to: "/auth", replace: true });
  }

  const initial = (username || "U").charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="ໂປຣຟາຍ"
          className="relative size-9 rounded-full bg-gradient-to-br from-accent to-primary grid place-items-center text-white font-bold text-sm neon-glow cursor-pointer"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-surface-2 border-border">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{username || "ຜູ້ໃຊ້"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/topup" })}>
          <Plus className="text-primary" /> ເຕີມເງິນ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/messages" })}>
          <MessageCircle /> ຂໍ້ຄວາມ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
          <User /> ໂປຣຟາຍ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/history", search: { tab: "wallet" } })}>
          <Wallet /> ປະຫວັດເຕີມເງິນ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/history", search: { tab: "orders" } })}>
          <History /> ປະຫວັດເຕີມເກມ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/history", search: { tab: "login" } })}>
          <LogIn /> ປະຫວັດການເຂົ້າອື່ນໆ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
          <Settings /> ຕັ້ງຄ່າທົ່ວໄປ
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
              <Shield className="text-primary" /> ໜ້າແອດມິນ
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut /> ອອກຈາກລະບົບ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
