// @ts-nocheck
import { createFileRoute, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMyProfile } from "@/hooks/useMyProfile";

export const Route = createFileRoute("/_dashboard/dashboard")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const { data, isLoading } = useMyProfile();
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    // Only redirect when on the bare /dashboard path — not on /dashboard/orders etc.
    const path = router.state.location.pathname;
    if (path !== "/dashboard") return;
    if (isLoading || !data?.profile) return;
    const role = data.profile.role;
    const dest =
      role === "ULTIMATE_ADMIN" ? "/dashboard/admin"
      : role === "ADMIN" || role === "EMPLOYEE" ? "/dashboard/worker"
      : "/dashboard/orders";
    navigate({ to: dest, replace: true });
  }, [isLoading, data, router.state.location.pathname]);

  return <Outlet />;
}
