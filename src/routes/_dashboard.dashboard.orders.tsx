// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listBookings, updateBookingStatus } from "@/lib/bookings.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useMyProfile } from "@/hooks/useMyProfile";
import { BookingsMap } from "@/components/dashboard/BookingsMap";

export const Route = createFileRoute("/_dashboard/dashboard/orders")({
  component: OrdersPage,
});

const STATUSES = ["pending", "dispatched", "in_progress", "completed", "cancelled"];

function OrdersPage() {
  const list = useServerFn(listBookings);
  const update = useServerFn(updateBookingStatus);
  const qc = useQueryClient();
  const { data: profileData } = useMyProfile();
  const isStaffOnly = profileData?.profile?.role === "EMPLOYEE";
  const [view, setView] = useState<"table" | "map">("table");

  const { data, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => list(),
  });

  const mut = useMutation({
    mutationFn: (vars) => update({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Status updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Orders</h1>
        <p className="text-muted-foreground text-sm">
          {isStaffOnly ? "View bookings and update job status." : "All incoming repair bookings."}
        </p>
      </header>

      <div className="flex gap-2 border-b border-border">
        {(["table", "map"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              view === v
                ? "border-[var(--cyan)] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {v === "map" ? "Live Map" : "Table"}
          </button>
        ))}
      </div>

      {view === "map" && <BookingsMap />}

      {view === "table" && (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Appointment</TableHead>
                <TableHead>Address</TableHead>
                {!isStaffOnly && <TableHead>Total</TableHead>}
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6}>Loading…</TableCell></TableRow>
              )}
              {data?.bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="font-medium">{b.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{b.customer_phone}</div>
                    <div className="text-xs text-muted-foreground">{b.customer_email}</div>
                  </TableCell>
                  <TableCell>
                    <div>{b.brand_name_snapshot} {b.model_name_snapshot}</div>
                    <div className="text-xs text-muted-foreground">{b.service_mode}</div>
                  </TableCell>
                  <TableCell>{new Date(b.appointment_at).toLocaleString()}</TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="text-xs">{b.pickup_address ?? b.street_address}</div>
                    <div className="text-xs text-muted-foreground">{b.zip}</div>
                    {b.ride_fee > 0 && (
                      <div className="text-xs text-[var(--cyan)]">Ride: ${Number(b.ride_fee).toFixed(2)}</div>
                    )}
                  </TableCell>
                  {!isStaffOnly && (
                    <TableCell className="font-medium">${Number(b.grand_total).toFixed(2)}</TableCell>
                  )}
                  <TableCell>
                    <Select
                      value={b.status}
                      onValueChange={(v) => mut.mutate({ id: b.id, status: v })}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            <Badge variant="secondary">{s.replace("_", " ")}</Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {data && data.bookings.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No bookings yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
