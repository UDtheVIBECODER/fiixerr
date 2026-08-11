// @ts-nocheck
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/dashboard")({
  component: () => <Outlet />,
});
