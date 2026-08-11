// @ts-nocheck
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users, DollarSign, ClipboardList, UserCheck,
  MapPin, Coffee, Briefcase, ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import {
  getOverviewStats,
  getStaffWithStats,
  getAllBookingsForAdmin,
  getAllCustomers,
  updateBookingAdmin,
  setStaffBreak,
  removeStaffMember,
} from "@/lib/ultimate-admin.functions";

export const Route = createFileRoute("/_dashboard/dashboard/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/access" });
  },
  component: AdminOverviewPage,
  head: () => ({ meta: [{ title: "Admin Overview — Fiixerr" }] }),
});

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "staff", label: "Staff" },
  { id: "orders", label: "Orders" },
  { id: "customers", label: "Customers" },
];

const STATUSES = ["pending", "dispatched", "in_progress", "completed", "cancelled"] as const;

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });

const statusColor = (s: string) => {
  if (s === "completed") return "bg-green-100 text-green-800";
  if (s === "cancelled") return "bg-red-100 text-red-800";
  if (s === "in_progress") return "bg-blue-100 text-blue-800";
  if (s === "dispatched") return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
};

function AdminOverviewPage() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Admin Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Full control panel for the owner.</p>
      </header>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "staff" && <StaffTab />}
      {tab === "orders" && <OrdersTab />}
      {tab === "customers" && <CustomersTab />}
    </div>
  );
}

/* ─── Overview ─────────────────────────────────────────────────── */

function OverviewTab() {
  const fn = useServerFn(getOverviewStats);
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: () => fn() });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data) return <p className="text-destructive">Failed to load stats.</p>;

  const cards = [
    { icon: <DollarSign className="h-5 w-5" />, label: "Total Revenue", value: fmt(data.totalRevenue) },
    { icon: <ClipboardList className="h-5 w-5" />, label: "Total Bookings", value: data.totalBookings },
    { icon: <Users className="h-5 w-5" />, label: "Staff Members", value: data.totalStaff },
    { icon: <UserCheck className="h-5 w-5" />, label: "Unique Customers", value: data.uniqueCustomers },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="border border-border rounded-xl bg-card p-5 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">{c.icon}<span className="text-xs font-medium uppercase tracking-wide">{c.label}</span></div>
            <div className="text-2xl font-bold text-foreground">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Booking breakdown */}
      <div className="border border-border rounded-xl bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Bookings by Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {STATUSES.map((s) => (
            <div key={s} className={cn("rounded-lg px-3 py-3 text-center", statusColor(s))}>
              <div className="text-xl font-bold">{data.byStatus[s] ?? 0}</div>
              <div className="text-xs font-medium mt-0.5">{s.replace("_", " ")}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Staff ─────────────────────────────────────────────────────── */

function StaffTab() {
  const fn = useServerFn(getStaffWithStats);
  const breakFn = useServerFn(setStaffBreak);
  const removeFn = useServerFn(removeStaffMember);
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["admin-staff"], queryFn: () => fn() });

  const breakMut = useMutation({
    mutationFn: (vars) => breakFn({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-staff"] }); toast.success("Updated"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const removeMut = useMutation({
    mutationFn: (vars) => removeFn({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-staff"] }); toast.success("Staff member removed"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data?.staff?.length) return <p className="text-muted-foreground">No staff members yet. Use Registration Codes to invite admins and employees.</p>;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Jobs Done</TableHead>
            <TableHead>Next Job</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.staff.map((s) => (
            <>
              <TableRow key={s.id} className="cursor-pointer" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                <TableCell>
                  <div className="font-medium">{s.username}</div>
                  <div className="text-xs text-muted-foreground capitalize">{s.role.toLowerCase().replace("_", " ")}</div>
                </TableCell>
                <TableCell>
                  {s.zip || s.address ? (
                    <div className="flex items-start gap-1 text-sm">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                      <span>{[s.address, s.zip].filter(Boolean).join(", ")}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not set</span>
                  )}
                </TableCell>
                <TableCell>
                  {s.is_on_break ? (
                    <Badge className="bg-orange-100 text-orange-800 border-0 gap-1">
                      <Coffee className="h-3 w-3" /> On break
                    </Badge>
                  ) : s.activeJobCount > 0 ? (
                    <Badge className="bg-blue-100 text-blue-800 border-0 gap-1">
                      <Briefcase className="h-3 w-3" /> Working ({s.activeJobCount})
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800 border-0">Free</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{s.completedCount}</div>
                  <div className="text-xs text-muted-foreground">{fmt(s.totalEarned)} earned</div>
                </TableCell>
                <TableCell>
                  {s.nextJob ? (
                    <div className="text-sm">
                      <div className="font-medium">{s.nextJob.customer_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(s.nextJob.appointment_at).toLocaleDateString()} — {s.nextJob.brand_name_snapshot} {s.nextJob.model_name_snapshot}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      disabled={breakMut.isPending}
                      onClick={() => breakMut.mutate({ staffId: s.id, isOnBreak: !s.is_on_break })}
                    >
                      {s.is_on_break ? "End break" : "Set break"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 w-7 p-0"
                      disabled={removeMut.isPending}
                      onClick={() => {
                        if (confirm(`Remove ${s.username}? This cannot be undone.`)) {
                          removeMut.mutate({ userId: s.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {expanded === s.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </TableCell>
              </TableRow>

              {/* Expanded: past jobs */}
              {expanded === s.id && (
                <TableRow key={`${s.id}-expanded`}>
                  <TableCell colSpan={6} className="bg-secondary/40 p-0">
                    <div className="p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Past completed jobs</p>
                      {s.completedCount === 0 ? (
                        <p className="text-sm text-muted-foreground">No completed jobs yet.</p>
                      ) : (
                        <div className="space-y-1">
                          {/* We don't have past job details in this query — show count */}
                          <p className="text-sm">{s.completedCount} completed jobs · {fmt(s.totalEarned)} total revenue</p>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ─── Orders ────────────────────────────────────────────────────── */

function OrdersTab() {
  const fn = useServerFn(getAllBookingsForAdmin);
  const updateFn = useServerFn(updateBookingAdmin);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({ queryKey: ["admin-bookings"], queryFn: () => fn() });

  const mut = useMutation({
    mutationFn: (vars) => updateFn({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-bookings"] }); toast.success("Updated"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;

  const bookings = data?.bookings ?? [];
  const staff = data?.staff ?? [];
  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div className="space-y-4">
      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {["all", ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              filter === s ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground",
            )}
          >
            {s === "all" ? `All (${bookings.length})` : `${s.replace("_", " ")} (${bookings.filter((b) => b.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Appointment</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Assign To</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No orders.</TableCell></TableRow>
            )}
            {filtered.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="font-medium">{b.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{b.customer_email}</div>
                  <div className="text-xs text-muted-foreground">{b.customer_phone}</div>
                </TableCell>
                <TableCell>
                  <div>{b.brand_name_snapshot} {b.model_name_snapshot}</div>
                  <div className="text-xs text-muted-foreground capitalize">{b.service_mode}</div>
                </TableCell>
                <TableCell className="text-sm">{new Date(b.appointment_at).toLocaleString()}</TableCell>
                <TableCell className="font-medium">${Number(b.grand_total).toFixed(2)}</TableCell>
                <TableCell>
                  <Select
                    value={b.assigned_to ?? "unassigned"}
                    onValueChange={(v) => mut.mutate({ id: b.id, assignedTo: v === "unassigned" ? null : v })}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.username}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={b.status}
                    onValueChange={(v) => mut.mutate({ id: b.id, status: v })}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ─── Customers ─────────────────────────────────────────────────── */

function CustomersTab() {
  const fn = useServerFn(getAllCustomers);
  const { data, isLoading } = useQuery({ queryKey: ["admin-customers"], queryFn: () => fn() });
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;

  const customers = data?.customers ?? [];

  if (customers.length === 0) {
    return <p className="text-muted-foreground">No customers yet.</p>;
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Total Bookings</TableHead>
            <TableHead>Total Spend</TableHead>
            <TableHead>Last Booking</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((c) => (
            <>
              <TableRow
                key={c.email}
                className="cursor-pointer"
                onClick={() => setExpanded(expanded === c.email ? null : c.email)}
              >
                <TableCell>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.email}</div>
                </TableCell>
                <TableCell className="text-sm">{c.phone}</TableCell>
                <TableCell>{c.bookings.length}</TableCell>
                <TableCell className="font-medium">{fmt(c.totalSpend)}</TableCell>
                <TableCell className="text-sm">
                  {new Date(c.bookings[0]?.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {expanded === c.email ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </TableCell>
              </TableRow>

              {expanded === c.email && (
                <TableRow key={`${c.email}-expanded`}>
                  <TableCell colSpan={6} className="bg-secondary/40 p-0">
                    <div className="p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Booking History</p>
                      <div className="space-y-2">
                        {c.bookings.map((b) => (
                          <div key={b.id} className="flex items-center justify-between text-sm rounded-lg border border-border bg-card px-3 py-2">
                            <div>
                              <span className="font-medium">{b.brand_name_snapshot} {b.model_name_snapshot}</span>
                              <span className="text-muted-foreground ml-2 text-xs">{new Date(b.appointment_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium">${Number(b.grand_total).toFixed(2)}</span>
                              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor(b.status))}>
                                {b.status.replace("_", " ")}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
