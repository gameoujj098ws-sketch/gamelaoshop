import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

/** Number of unread notifications for the signed-in customer. */
export function useUnreadCount() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    enabled: !!user,
    refetchInterval: 20_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .is("read_at", null);
      return count ?? 0;
    },
  });
  return data ?? 0;
}

/** Marks every notification of the current user as read. */
export function useMarkAllRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    await qc.invalidateQueries({ queryKey: ["unread-notifications", user.id] });
  };
}
