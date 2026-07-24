import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
