import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useMyProfile";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { LogOut, Wrench, ClipboardList, Settings, KeyRound, Users, CreditCard } from "lucide-react";

export const Route = createFileRoute("/_dashboard")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/access" });
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  const { data, isLoading } = useMyProfile();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/access" });
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const profile = data?.profile;
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold">No profile found</h1>
          <p className="text-muted-foreground text-sm">
            Your account is signed in but isn't linked to a Fiixerr profile. Ask the owner to invite you, or sign out and use a registration code.
          </p>
          <Button onClick={signOut} variant="outline" size="touch">Sign out</Button>
        </div>
      </div>
    );
  }

  const role = profile.role;
  const isAdminOrUp = role === "ADMIN" || role === "ULTIMATE_ADMIN";
  const isUltimate = role === "ULTIMATE_ADMIN";

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <aside className="md:w-64 border-b md:border-b-0 md:border-r border-border bg-card p-4 md:p-6 md:min-h-screen">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <Wrench className="h-5 w-5 text-foreground" />
          <span className="font-semibold text-foreground">Fiixerr</span>
        </Link>
        <nav className="space-y-1">
          <NavItem to="/dashboard/orders" icon={<ClipboardList className="h-4 w-4" />}>Orders</NavItem>
          {isAdminOrUp && <NavItem to="/dashboard/catalog" icon={<Settings className="h-4 w-4" />}>Catalog & Pricing</NavItem>}
          {isUltimate && <NavItem to="/dashboard/settings" icon={<CreditCard className="h-4 w-4" />}>Payment Settings</NavItem>}
          {isUltimate && <NavItem to="/dashboard/codes" icon={<KeyRound className="h-4 w-4" />}>Registration Codes</NavItem>}
          {isUltimate && <NavItem to="/dashboard/team" icon={<Users className="h-4 w-4" />}>Team</NavItem>}
        </nav>
        <div className="mt-8 pt-4 border-t border-border space-y-2">
          <div className="text-sm">
            <div className="font-medium text-foreground">{profile.username}</div>
            <div className="text-xs text-muted-foreground">{role.replace("_", " ")}</div>
          </div>
          <Button onClick={signOut} variant="outline" size="sm" className="w-full">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-x-auto">
        <Outlet />
      </main>
      <Toaster theme="light" />
    </div>
  );
}

function NavItem({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary transition-colors min-h-[44px]"
      activeProps={{ className: "flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-secondary text-foreground font-medium min-h-[44px]" }}
    >
      {icon}
      {children}
    </Link>
  );
}
