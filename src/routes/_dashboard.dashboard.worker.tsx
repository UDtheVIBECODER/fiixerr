// @ts-nocheck
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useMyProfile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Coffee, CheckCircle2, Clock, Briefcase, MapPin, PhoneCall,
  Wrench, CalendarDays, TrendingUp, DollarSign, ChevronDown,
  ChevronUp, Lock, LogIn, LogOut, ListChecks, CalendarClock, Pencil,
  Timer, Car, Loader2, X, Navigation, Map,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  getWorkerDashboard,
  getMyTimesheet,
  updateMyJobStatus,
  toggleMyBreak,
  clockInOut,
  saveAvailability,
  saveWorkerAddress,
} from "@/lib/worker.functions";
import { geocodeAddress, DFW_VIEWBOX, haversineKm, calcRideFee } from "@/lib/geo";
import { EditBookingModal, OrderEditHistory } from "@/components/orders/EditBookingModal";

export const Route = createFileRoute("/_dashboard/dashboard/worker")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/access" });
  },
  component: WorkerDashboardPage,
  head: () => ({ meta: [{ title: "My Dashboard — Fiixerr" }] }),
});

const ALL_STATUSES = ["pending", "dispatched", "in_progress", "completed", "cancelled"] as const;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });

const statusColor = (s: string) => {
  if (s === "completed") return "bg-green-100 text-green-800";
  if (s === "cancelled") return "bg-red-100 text-red-800";
  if (s === "in_progress") return "bg-blue-100 text-blue-800";
  if (s === "dispatched") return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
};

const nextStatus = (s: string) =>
  ({ pending: "dispatched", dispatched: "in_progress", in_progress: "completed" }[s] ?? null);

const nextStatusLabel = (s: string) =>
  ({ dispatched: "Mark Dispatched", in_progress: "Mark In Progress", completed: "Mark Complete" }[s] ?? null);

const TABS = [
  { id: "today",        label: "Today",          icon: <CalendarDays className="h-4 w-4" /> },
  { id: "map",          label: "Map",            icon: <Map className="h-4 w-4" /> },
  { id: "pending",      label: "Pending Orders",  icon: <ListChecks className="h-4 w-4" /> },
  { id: "jobs",         label: "My Jobs",         icon: <Briefcase className="h-4 w-4" /> },
  { id: "stats",        label: "My Stats",        icon: <TrendingUp className="h-4 w-4" /> },
  { id: "timesheet",    label: "Timesheet",       icon: <Timer className="h-4 w-4" /> },
  { id: "availability", label: "Availability",    icon: <CalendarClock className="h-4 w-4" /> },
];

/* ─── Route component ───────────────────────────────────────────── */

function WorkerDashboardPage() {
  const { data: profileData, isLoading: profileLoading } = useMyProfile();
  const [tab, setTab] = useState("today");

  if (profileLoading) return <div className="text-muted-foreground">Loading…</div>;

  const role = profileData?.profile?.role;

  // Still loading or profile not yet available — don't flash the lock screen
  if (!role) return <div className="text-muted-foreground">Loading…</div>;

  if (role === "ULTIMATE_ADMIN") {
    return (
      <div className="max-w-md mx-auto mt-16 text-center space-y-4">
        <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-semibold">You're the owner</h1>
        <p className="text-muted-foreground text-sm">This page is for workers. Your panel is Admin Overview.</p>
        <Link to="/dashboard/admin" className="inline-block underline text-sm">Go to Admin Overview</Link>
      </div>
    );
  }
  // Both ADMIN and EMPLOYEE (code-registered workers) can use this page
  if (!["ADMIN", "EMPLOYEE"].includes(role)) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center space-y-4">
        <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-semibold">Access restricted</h1>
        <p className="text-muted-foreground text-sm">This page is for registered workers only.</p>
        <Link to="/dashboard/orders" className="inline-block underline text-sm">Go to Orders</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, <span className="font-medium text-foreground">{profileData.profile.username}</span>.
        </p>
      </header>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
              tab === t.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === "today"        && <TodayTab />}
      {tab === "map"          && <WorkerMapTab />}
      {tab === "pending"      && <PendingOrdersTab />}
      {tab === "jobs"         && <MyJobsTab />}
      {tab === "stats"        && <StatsTab />}
      {tab === "timesheet"    && <MyTimesheetTab />}
      {tab === "availability" && <AvailabilityTab />}
    </div>
  );
}

/* ─── Shared data hook ──────────────────────────────────────────── */

function useWorkerData() {
  const fn = useServerFn(getWorkerDashboard);
  return useQuery({ queryKey: ["worker-dashboard"], queryFn: () => fn() });
}

/** Ride fee from worker home to a job's pickup location. Returns null if coordinates missing. */
function workerRideFee(
  workerLat: number | null | undefined,
  workerLng: number | null | undefined,
  pickupLat: number | null | undefined,
  pickupLng: number | null | undefined,
): { distanceKm: number; fee: number } | null {
  if (!workerLat || !workerLng || !pickupLat || !pickupLng) return null;
  const distanceKm = haversineKm(workerLat, workerLng, pickupLat, pickupLng);
  return { distanceKm, fee: calcRideFee(distanceKm) };
}

/* ─── Today Tab ─────────────────────────────────────────────────── */

function TodayTab() {
  const { data, isLoading } = useWorkerData();
  const updateFn  = useServerFn(updateMyJobStatus);
  const breakFn   = useServerFn(toggleMyBreak);
  const clockFn   = useServerFn(clockInOut);
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["worker-dashboard"] });

  // Live clock showing time since clock-in
  useEffect(() => {
    if (!data?.profile?.is_clocked_in || !data?.profile?.clocked_in_at) {
      setElapsed("");
      return;
    }
    const tick = () => {
      const diff = Date.now() - new Date(data.profile.clocked_in_at).getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setElapsed(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [data?.profile?.is_clocked_in, data?.profile?.clocked_in_at]);

  const updateMut = useMutation({
    mutationFn: (vars) => updateFn({ data: vars }),
    onSuccess: () => { invalidate(); toast.success("Job updated"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const breakMut = useMutation({
    mutationFn: (vars) => breakFn({ data: vars }),
    onSuccess: () => { invalidate(); toast.success("Break status updated"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const clockMut = useMutation({
    mutationFn: (vars) => clockFn({ data: vars }),
    onSuccess: () => { invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data) return <p className="text-destructive">Failed to load dashboard.</p>;

  const { profile, todaysJobs } = data;
  const hasWorkerLocation = !!(profile?.worker_lat && profile?.worker_lng);
  const isClockedIn = profile?.is_clocked_in ?? false;
  const isOnBreak   = profile?.is_on_break   ?? false;
  const now         = new Date();

  return (
    <div className="space-y-5">
      {/* ── Clock in/out card ── */}
      <div className={cn(
        "rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
        isClockedIn ? "bg-green-50 border-green-200" : "bg-card border-border"
      )}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center shrink-0",
            isClockedIn ? "bg-green-200" : "bg-secondary"
          )}>
            {isClockedIn
              ? <LogIn className="h-6 w-6 text-green-700" />
              : <LogOut className="h-6 w-6 text-muted-foreground" />}
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {isClockedIn ? "Clocked In" : "Clocked Out"}
            </p>
            {isClockedIn && elapsed && (
              <p className="text-sm font-mono text-green-700">{elapsed}</p>
            )}
            {isClockedIn && profile?.clocked_in_at && (
              <p className="text-xs text-muted-foreground">
                Since {new Date(profile.clocked_in_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
            )}
            {!isClockedIn && (
              <p className="text-xs text-muted-foreground">Clock in to start your shift</p>
            )}
          </div>
        </div>
        <Button
          variant={isClockedIn ? "destructive" : "default"}
          disabled={clockMut.isPending}
          onClick={() => {
            if (isClockedIn && !confirm("Clock out and end your shift?")) return;
            clockMut.mutate({ clockIn: !isClockedIn });
            if (isClockedIn) toast.success("Clocked out — good work!");
            else toast.success("Clocked in — let's go!");
          }}
        >
          {isClockedIn ? <><LogOut className="h-4 w-4" /> Clock Out</> : <><LogIn className="h-4 w-4" /> Clock In</>}
        </Button>
      </div>

      {/* ── Break toggle ── */}
      {isClockedIn && (
        <div className={cn(
          "rounded-xl border p-4 flex items-center justify-between",
          isOnBreak ? "bg-orange-50 border-orange-200" : "bg-card border-border"
        )}>
          <div className="flex items-center gap-3">
            <Coffee className={cn("h-5 w-5", isOnBreak ? "text-orange-600" : "text-muted-foreground")} />
            <div>
              <p className="font-medium text-sm text-foreground">
                {isOnBreak ? "On break" : "Available for jobs"}
              </p>
              <p className="text-xs text-muted-foreground">Toggle so the owner can see your availability.</p>
            </div>
          </div>
          <Button
            variant={isOnBreak ? "default" : "outline"}
            size="sm"
            disabled={breakMut.isPending}
            onClick={() => breakMut.mutate({ isOnBreak: !isOnBreak })}
          >
            {isOnBreak ? "End break" : "Take a break"}
          </Button>
        </div>
      )}

      {/* ── Today's date heading ── */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4" />
        <span>
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </span>
      </div>

      {/* ── Today's jobs ── */}
      {todaysJobs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center space-y-2">
          <CheckCircle2 className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="font-medium text-foreground">No jobs scheduled for today</p>
          <p className="text-sm text-muted-foreground">Check the Pending Orders tab to see what's incoming.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {todaysJobs.length} job{todaysJobs.length !== 1 ? "s" : ""} today
          </p>
          {todaysJobs.map((job) => {
            const appt = new Date(job.appointment_at);
            const isPast = appt < now;
            const next = nextStatus(job.status);
            return (
              <div
                key={job.id}
                className={cn(
                  "rounded-xl border bg-card p-4 space-y-4",
                  isPast && !["completed", "cancelled"].includes(job.status)
                    ? "border-red-200"
                    : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{job.customer_name}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor(job.status))}>
                        {job.status.replace("_", " ")}
                      </span>
                      {isPast && !["completed", "cancelled"].includes(job.status) && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Overdue</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {appt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                  {next && (
                    <Button
                      size="sm"
                      disabled={updateMut.isPending}
                      onClick={() => updateMut.mutate({ id: job.id, status: next })}
                    >
                      {nextStatusLabel(next)}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Wrench className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <div className="font-medium">{job.brand_name_snapshot} {job.model_name_snapshot}</div>
                      <div className="text-xs text-muted-foreground capitalize">{job.service_mode?.replace("_", " ")}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <div>{job.street_address}</div>
                      <div className="text-xs text-muted-foreground">{job.zip}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <PhoneCall className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <div>{job.customer_phone}</div>
                      <div className="text-xs text-muted-foreground">{job.customer_email}</div>
                    </div>
                  </div>
                </div>
                {job.notes && (
                  <div className="rounded-lg bg-secondary/50 px-3 py-2 text-sm text-foreground/80">
                    <span className="font-medium">Notes: </span>{job.notes}
                  </div>
                )}
                {(() => {
                  const rf = workerRideFee(profile?.worker_lat, profile?.worker_lng, job.pickup_lat, job.pickup_lng);
                  if (!rf) return null;
                  const mi = (rf.distanceKm * 0.621371).toFixed(1);
                  return (
                    <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm">
                      <Car className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="font-semibold text-blue-800">${rf.fee.toFixed(2)} ride fee</span>
                      <span className="text-blue-600">· {mi} mi from your address</span>
                    </div>
                  );
                })()}
                {hasWorkerLocation === false && job.pickup_lat && (
                  <p className="text-xs text-muted-foreground">Set your home address in Availability to see ride fee.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Pending Orders Tab ────────────────────────────────────────── */

function PendingOrdersTab() {
  const { data, isLoading } = useWorkerData();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data) return <p className="text-destructive">Failed to load orders.</p>;

  const pending = data.allPending ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">All Pending Orders</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every booking currently in pending status — assigned or unassigned.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">{pending.length}</Badge>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center space-y-2">
          <CheckCircle2 className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="font-medium text-foreground">No pending orders</p>
          <p className="text-sm text-muted-foreground">All caught up!</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Appointment</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((b) => (
                <>
                  <TableRow
                    key={b.id}
                    className="cursor-pointer"
                    onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                  >
                    <TableCell>
                      <div className="font-medium">{b.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{b.customer_phone}</div>
                    </TableCell>
                    <TableCell>
                      <div>{b.brand_name_snapshot} {b.model_name_snapshot}</div>
                      <div className="text-xs text-muted-foreground capitalize">{b.service_mode?.replace("_", " ")}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(b.appointment_at).toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{b.street_address}</div>
                      <div className="text-xs text-muted-foreground">{b.zip}</div>
                    </TableCell>
                    <TableCell>
                      {b.assigned_to
                        ? <Badge variant="secondary" className="text-xs">Assigned</Badge>
                        : <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">Unassigned</Badge>}
                    </TableCell>
                    <TableCell>
                      {expanded === b.id
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                  </TableRow>

                  {expanded === b.id && (
                    <TableRow key={`${b.id}-exp`}>
                      <TableCell colSpan={6} className="bg-secondary/40 p-0">
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Full address</p>
                            <p>{b.street_address}, {b.zip}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Contact</p>
                            <p>{b.customer_phone}</p>
                          </div>
                          {b.notes && (
                            <div className="sm:col-span-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
                              <p className="text-foreground/80">{b.notes}</p>
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
      )}
    </div>
  );
}

/* ─── My Jobs Tab ───────────────────────────────────────────────── */

/** Compact per-order map: auto-fetches OSRM route from worker home to job. */
function JobRouteMap({
  fromLat, fromLng, toLat, toLng, toAddress,
}: {
  fromLat: number | null; fromLng: number | null;
  toLat: number | null;   toLng: number | null;
  toAddress: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceMi: number; durationMin: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !toLat || !toLng) { setLoading(false); return; }
    let cancelled = false;

    import("leaflet").then(async (Lmod) => {
      const L = (Lmod as any).default ?? Lmod;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, { zoomControl: true }).setView([toLat, toLng], fromLat ? 11 : 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;

      const destIcon = L.divIcon({
        html: '<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:2px solid white;box-shadow:0 1px 5px rgba(0,0,0,.3)"></div>',
        iconSize: [14, 14], iconAnchor: [7, 7], className: "",
      });
      L.marker([toLat, toLng], { icon: destIcon }).bindPopup(toAddress).addTo(map);

      if (fromLat && fromLng) {
        const homeIcon = L.divIcon({
          html: '<div style="width:14px;height:14px;border-radius:50%;background:#16a34a;border:2px solid white;box-shadow:0 1px 5px rgba(0,0,0,.3)"></div>',
          iconSize: [14, 14], iconAnchor: [7, 7], className: "",
        });
        L.marker([fromLat, fromLng], { icon: homeIcon }).bindPopup("<b>My Home</b>").addTo(map);

        const route = await fetchOsrmRoute(fromLat, fromLng, toLat, toLng);
        if (route && !cancelled && mapRef.current) {
          const line = L.geoJSON(route.geometry, {
            style: { color: "#2563eb", weight: 4, opacity: 0.85 },
          }).addTo(map);
          map.fitBounds(line.getBounds(), { padding: [32, 32] });
          setRouteInfo({ distanceMi: route.distanceMi, durationMin: route.durationMin });
        }
      }
      setLoading(false);
    });

    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  if (!toLat || !toLng) return null;

  return (
    <div className="space-y-2">
      {loading ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading map…
        </div>
      ) : routeInfo ? (
        <div className="flex items-center gap-2 text-sm">
          <Navigation className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="font-semibold text-foreground">{routeInfo.distanceMi.toFixed(1)} mi</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{routeInfo.durationMin} min drive from home</span>
        </div>
      ) : null}
      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden border border-border"
        style={{ height: 240 }}
      />
    </div>
  );
}

function MyJobsTab() {
  const { data, isLoading } = useWorkerData();
  const updateFn = useServerFn(updateMyJobStatus);
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter]     = useState("all");
  const [expanded, setExpanded]         = useState<string | null>(null);
  const [editTarget, setEditTarget]     = useState<any>(null);

  const mut = useMutation({
    mutationFn: (vars) => updateFn({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["worker-dashboard"] }); toast.success("Status updated"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data) return <p className="text-destructive">Failed to load jobs.</p>;

  const { profile } = data;
  const bookings = data.allBookings ?? [];

  const now          = new Date();
  const todayStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomStart     = new Date(todayStart.getTime() + 86_400_000);
  const laterStart   = new Date(tomStart.getTime()   + 86_400_000);

  const inPeriod = (b: any) => {
    const appt = new Date(b.appointment_at);
    if (timeFilter === "today")    return appt >= todayStart && appt < tomStart;
    if (timeFilter === "tomorrow") return appt >= tomStart   && appt < laterStart;
    if (timeFilter === "later")    return appt >= laterStart;
    return true;
  };

  const afterStatus = (bs: any[]) => statusFilter === "all" ? bs : bs.filter((b) => b.status === statusFilter);
  const filtered = afterStatus(bookings).filter(inPeriod);

  const TIME_PERIODS = [
    { id: "all",      label: "All time"   },
    { id: "today",    label: "Today"      },
    { id: "tomorrow", label: "Tomorrow"   },
    { id: "later",    label: "Later" },
  ];

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
        <div className="flex flex-wrap gap-2">
          {["all", ...ALL_STATUSES].map((s) => {
            const count = s === "all" ? bookings.length : bookings.filter((b) => b.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  statusFilter === s
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:border-foreground"
                )}
              >
                {s === "all" ? `All (${count})` : `${s.replace("_", " ")} (${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time period filter */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Period</p>
        <div className="flex flex-wrap gap-2">
          {TIME_PERIODS.map(({ id, label }) => {
            const count = afterStatus(bookings).filter((b) => {
              const appt = new Date(b.appointment_at);
              if (id === "today")    return appt >= todayStart && appt < tomStart;
              if (id === "tomorrow") return appt >= tomStart   && appt < laterStart;
              if (id === "later")    return appt >= laterStart;
              return true;
            }).length;
            return (
              <button
                key={id}
                onClick={() => setTimeFilter(id)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  timeFilter === id
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:border-foreground"
                )}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">No jobs match this filter.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Appointment</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => (
                <>
                  <TableRow
                    key={b.id}
                    className="cursor-pointer"
                    onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                  >
                    <TableCell>
                      <div className="font-medium">{b.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{b.customer_phone}</div>
                    </TableCell>
                    <TableCell>
                      <div>{b.brand_name_snapshot} {b.model_name_snapshot}</div>
                      <div className="text-xs text-muted-foreground capitalize">{b.service_mode?.replace("_", " ")}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(b.appointment_at).toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{b.street_address}</div>
                      <div className="text-xs text-muted-foreground">{b.zip}</div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={b.status}
                        onValueChange={(v) => mut.mutate({ id: b.id, status: v })}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {expanded === b.id
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                  </TableRow>

                  {expanded === b.id && (
                    <TableRow key={`${b.id}-exp`}>
                      <TableCell colSpan={6} className="bg-secondary/40 p-0">
                        <div className="p-4 space-y-4 text-sm">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Customer contact</p>
                              <p>{b.customer_email}</p>
                              <p>{b.customer_phone}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Full address</p>
                              <p>{b.street_address}, {b.zip}</p>
                            </div>
                            {b.notes && (
                              <div className="sm:col-span-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
                                <p className="text-foreground/80">{b.notes}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Booked on</p>
                              <p>{new Date(b.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                            </div>
                            {(() => {
                              const rf = workerRideFee(profile?.worker_lat, profile?.worker_lng, b.pickup_lat, b.pickup_lng);
                              if (!rf) return null;
                              const mi = (rf.distanceKm * 0.621371).toFixed(1);
                              return (
                                <div className="sm:col-span-2 flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm">
                                  <Car className="h-4 w-4 text-blue-600 shrink-0" />
                                  <span className="font-semibold text-blue-800">${rf.fee.toFixed(2)} ride fee</span>
                                  <span className="text-blue-600">· {mi} mi from your address</span>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Per-order route map */}
                          {b.pickup_lat && b.pickup_lng && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Route to job</p>
                              <JobRouteMap
                                fromLat={profile?.worker_lat ?? null}
                                fromLng={profile?.worker_lng ?? null}
                                toLat={b.pickup_lat}
                                toLng={b.pickup_lng}
                                toAddress={b.pickup_address || b.street_address || ""}
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-3 pt-1 border-t border-border/50">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1.5"
                              onClick={(e) => { e.stopPropagation(); setEditTarget(b); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit order
                            </Button>
                          </div>

                          <OrderEditHistory
                            bookingId={b.id}
                            isUltimateAdmin={false}
                            queryKeys={[["worker-dashboard"]]}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editTarget && (
        <EditBookingModal
          booking={editTarget}
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          queryKeys={[["worker-dashboard"]]}
        />
      )}
    </div>
  );
}

/* ─── Stats Tab ─────────────────────────────────────────────────── */

function StatsTab() {
  const { data, isLoading } = useWorkerData();

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data) return <p className="text-destructive">Failed to load stats.</p>;

  const { stats, allBookings, profile } = data;
  const completedJobs = (allBookings ?? []).filter((b) => b.status === "completed");
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  const cards = [
    { icon: <CheckCircle2 className="h-5 w-5" />, label: "Jobs Completed",    value: stats.completedCount },
    { icon: <Briefcase   className="h-5 w-5" />, label: "Active Jobs",        value: stats.activeCount },
    { icon: <DollarSign  className="h-5 w-5" />, label: "Revenue Generated",  value: fmt(stats.totalEarned) },
    { icon: <TrendingUp  className="h-5 w-5" />, label: "Total Assigned",     value: stats.totalAssigned },
  ];

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">Member since {memberSince}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="border border-border rounded-xl bg-card p-5 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              {c.icon}
              <span className="text-xs font-medium uppercase tracking-wide">{c.label}</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{c.value}</div>
          </div>
        ))}
      </div>

      {stats.totalAssigned > 0 && (
        <div className="border border-border rounded-xl bg-card p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Completion rate</span>
            <span className="font-bold text-foreground">
              {Math.round((stats.completedCount / stats.totalAssigned) * 100)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all"
              style={{ width: `${Math.round((stats.completedCount / stats.totalAssigned) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.completedCount} of {stats.totalAssigned} assigned jobs completed
          </p>
        </div>
      )}

      {completedJobs.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recent completed jobs</p>
          <div className="space-y-2">
            {completedJobs.slice(0, 10).map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm">
                <div>
                  <span className="font-medium">{b.brand_name_snapshot} {b.model_name_snapshot}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {new Date(b.appointment_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{b.customer_name}</span>
                  <span className="font-semibold">${Number(b.grand_total).toFixed(2)}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-800">completed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-10 text-center space-y-2">
          <Briefcase className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="font-medium text-foreground">No completed jobs yet</p>
          <p className="text-sm text-muted-foreground">Your completed jobs and earnings will appear here.</p>
        </div>
      )}
    </div>
  );
}

/* ─── Availability Tab ──────────────────────────────────────────── */

/* ─── My Timesheet Tab ──────────────────────────────────────────── */

function MyTimesheetTab() {
  const fn = useServerFn(getMyTimesheet);
  const { data, isLoading } = useQuery({ queryKey: ["my-timesheet"], queryFn: () => fn() });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;

  const entries = data?.entries ?? [];

  // Compute totals
  const completedEntries = entries.filter((e) => e.clocked_out_at);
  const totalMs = completedEntries.reduce((sum, e) => {
    return sum + (new Date(e.clocked_out_at).getTime() - new Date(e.clocked_in_at).getTime());
  }, 0);

  const fmtDuration = (ms: number) => {
    if (ms <= 0) return "—";
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">My Timesheet</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Your clock in/out history. Last 90 entries.</p>
        </div>
        {completedEntries.length > 0 && (
          <div className="rounded-xl border border-border bg-card px-4 py-2 text-sm">
            <span className="text-muted-foreground">Total hours logged: </span>
            <span className="font-bold text-foreground">{fmtDuration(totalMs)}</span>
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center space-y-2">
          <Timer className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="font-medium text-foreground">No timesheet entries yet</p>
          <p className="text-sm text-muted-foreground">Clock in on the Today tab to start tracking your hours.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => {
                const durationMs = e.clocked_out_at
                  ? new Date(e.clocked_out_at).getTime() - new Date(e.clocked_in_at).getTime()
                  : null;
                const isOpen = !e.clocked_out_at;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{fmtDate(e.clocked_in_at)}</TableCell>
                    <TableCell>{fmtTime(e.clocked_in_at)}</TableCell>
                    <TableCell>{e.clocked_out_at ? fmtTime(e.clocked_out_at) : "—"}</TableCell>
                    <TableCell>{durationMs !== null ? fmtDuration(durationMs) : "—"}</TableCell>
                    <TableCell>
                      {isOpen ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          Completed
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/* ─── Worker Map Tab ─────────────────────────────────────────────── */

async function fetchOsrmRoute(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const route = json.routes?.[0];
  if (!route) return null;
  return {
    geometry: route.geometry,
    distanceMi: route.distance / 1609.34,
    durationMin: Math.round(route.duration / 60),
  };
}

function WorkerMapTab() {
  const { data, isLoading } = useWorkerData();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const jobMarkersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceMi: number; durationMin: number } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const profile = data?.profile;
  const todaysJobs = data?.todaysJobs ?? [];
  const allJobs = data?.allBookings ?? [];
  const mappableJobs = allJobs.filter((b) => b.pickup_lat && b.pickup_lng);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    import("leaflet").then((Lmod) => {
      const L = (Lmod as any).default ?? Lmod;
      if (cancelled || !containerRef.current) return;
      LRef.current = L;
      const startLat = profile?.worker_lat ?? 32.7767;
      const startLng = profile?.worker_lng ?? -96.797;
      const map = L.map(containerRef.current).setView([startLat, startLng], 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      setMapReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Home location marker
  useEffect(() => {
    if (!mapReady || !profile?.worker_lat || !profile?.worker_lng) return;
    const L = LRef.current;
    const map = mapRef.current;
    const homeIcon = L.divIcon({
      html: '<div style="width:18px;height:18px;border-radius:50%;background:#16a34a;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>',
      iconSize: [18, 18], iconAnchor: [9, 9], className: "",
    });
    L.marker([profile.worker_lat, profile.worker_lng], { icon: homeIcon })
      .bindPopup("<b>My Home</b><br><small>Route starts here</small>")
      .addTo(map);
  }, [mapReady, profile?.worker_lat, profile?.worker_lng]);

  // Job markers
  useEffect(() => {
    if (!mapReady) return;
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    jobMarkersRef.current.forEach((m) => m.remove());
    jobMarkersRef.current = [];

    mappableJobs.forEach((b) => {
      if (!b.pickup_lat || !b.pickup_lng) return;
      const isToday = todaysJobs.some((j) => j.id === b.id);
      const color = isToday ? "#2563eb" : "#9ca3af";
      const icon = L.divIcon({
        html: `<div style="width:13px;height:13px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 5px rgba(0,0,0,.3)"></div>`,
        iconSize: [13, 13], iconAnchor: [6, 6], className: "",
      });
      const appt = new Date(b.appointment_at).toLocaleString("en-US", {
        weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      });
      const marker = L.marker([b.pickup_lat, b.pickup_lng], { icon })
        .bindPopup(`
          <div style="min-width:190px;font-size:13px;line-height:1.6">
            <strong>${b.customer_name}</strong><br>
            ${b.brand_name_snapshot} ${b.model_name_snapshot}<br>
            <small style="color:#6b7280">${b.pickup_address || b.street_address || ""}</small><br>
            <small style="color:#9ca3af">${appt}</small><br>
            <small style="color:#2563eb;font-style:italic">Click to get directions ↓</small>
          </div>
        `)
        .addTo(map);
      marker.on("click", () => handleJobClick(b));
      jobMarkersRef.current.push(marker);
    });
  }, [mapReady, mappableJobs, todaysJobs]);

  async function handleJobClick(job: any) {
    setSelectedJob(job);
    setRouteInfo(null);
    const fromLat = profile?.worker_lat;
    const fromLng = profile?.worker_lng;
    if (!fromLat || !fromLng) return;

    const L = LRef.current;
    const map = mapRef.current;
    if (routeLineRef.current) { routeLineRef.current.remove(); routeLineRef.current = null; }

    setRouteLoading(true);
    try {
      const route = await fetchOsrmRoute(fromLat, fromLng, job.pickup_lat, job.pickup_lng);
      if (!route || !L || !map) return;
      routeLineRef.current = L.geoJSON(route.geometry, {
        style: { color: "#2563eb", weight: 5, opacity: 0.85 },
      }).addTo(map);
      map.fitBounds(routeLineRef.current.getBounds(), { padding: [48, 48] });
      setRouteInfo({ distanceMi: route.distanceMi, durationMin: route.durationMin });
    } finally {
      setRouteLoading(false);
    }
  }

  function clearRoute() {
    if (routeLineRef.current) { routeLineRef.current.remove(); routeLineRef.current = null; }
    setSelectedJob(null);
    setRouteInfo(null);
  }

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-3">
      {!profile?.worker_lat && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
          Set your home address in the <strong>Availability</strong> tab to enable routing from your location.
        </div>
      )}

      {/* Route info panel */}
      {selectedJob && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="font-semibold text-foreground">{selectedJob.customer_name}</span>
              </div>
              <p className="text-sm text-muted-foreground truncate pl-6">
                {selectedJob.pickup_address || selectedJob.street_address || "No address on file"}
              </p>
              <p className="text-xs text-muted-foreground pl-6">
                {new Date(selectedJob.appointment_at).toLocaleString("en-US", {
                  weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                })}
              </p>
            </div>
            {routeLoading && (
              <div className="shrink-0 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Routing…
              </div>
            )}
            {routeInfo && !routeLoading && (
              <div className="text-right shrink-0">
                <p className="text-xl font-bold text-foreground">{routeInfo.distanceMi.toFixed(1)} mi</p>
                <p className="text-sm text-muted-foreground">{routeInfo.durationMin} min drive</p>
              </div>
            )}
          </div>
          <button onClick={clearRoute} className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pl-0">
            <X className="h-3 w-3" /> Clear route
          </button>
        </div>
      )}

      {/* Map */}
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden border border-border"
        style={{ height: 480 }}
        aria-label="Worker job map"
      />

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-600 border border-white/50" />
          <span className="text-muted-foreground">Home</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-600 border border-white/50" />
          <span className="text-muted-foreground">Today's jobs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-400 border border-white/50" />
          <span className="text-muted-foreground">Other jobs</span>
        </div>
        <span className="text-muted-foreground text-xs">· Click a pin for driving directions</span>
      </div>
    </div>
  );
}

/* ─── Availability Tab ──────────────────────────────────────────── */

function AvailabilityTab() {
  const { data, isLoading } = useWorkerData();
  const saveFn = useServerFn(saveAvailability);
  const saveAddrFn = useServerFn(saveWorkerAddress);
  const qc = useQueryClient();

  // Per-day schedule: { Mon: { from, until } } — only enabled days are present
  type DayEntry = { from: string; until: string };
  const [schedule, setSchedule] = useState<Record<string, DayEntry>>({});
  const [note, setNote]         = useState("");
  const [seeded, setSeeded]     = useState(false);

  // Address section state
  const [addrInput, setAddrInput]       = useState("");
  const [addrSuggestions, setAddrSuggestions] = useState<any[]>([]);
  const [showAddrSuggestions, setShowAddrSuggestions] = useState(false);
  const [addrSearching, setAddrSearching] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const addrDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const addrInputRef = useRef<HTMLInputElement>(null);
  const addrDropdownRef = useRef<HTMLUListElement>(null);

  // Seed form from profile once loaded
  useEffect(() => {
    if (seeded || !data?.profile) return;
    const raw = data.profile.availability_schedule ?? {};
    if (Object.keys(raw).length > 0) {
      setSchedule(raw as Record<string, DayEntry>);
    } else {
      // Migrate from legacy flat fields
      const legacyDays: string[] = data.profile.availability_days ?? [];
      const legacyFrom  = data.profile.availability_from?.slice(0, 5)  ?? "09:00";
      const legacyUntil = data.profile.availability_until?.slice(0, 5) ?? "17:00";
      if (legacyDays.length > 0) {
        setSchedule(Object.fromEntries(legacyDays.map((d) => [d, { from: legacyFrom, until: legacyUntil }])));
      }
    }
    setNote(data.profile.availability_note ?? "");
    if (data.profile.address) setAddrInput(data.profile.address);
    setSeeded(true);
  }, [data, seeded]);

  const mut = useMutation({
    mutationFn: (vars) => saveFn({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["worker-dashboard"] }); toast.success("Availability saved"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const addrMut = useMutation({
    mutationFn: (vars) => saveAddrFn({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["worker-dashboard"] }); toast.success("Home address saved"); setPendingCoords(null); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggleDay = (d: string) =>
    setSchedule((prev) => {
      if (d in prev) {
        const next = { ...prev };
        delete next[d];
        return next;
      }
      return { ...prev, [d]: { from: "09:00", until: "17:00" } };
    });

  const setDayTime = (d: string, field: "from" | "until", val: string) =>
    setSchedule((prev) => ({ ...prev, [d]: { ...prev[d], [field]: val } }));

  function handleAddrInput(val: string) {
    setAddrInput(val);
    setPendingCoords(null);
    clearTimeout(addrDebounceRef.current);
    if (val.length < 3) { setAddrSuggestions([]); setShowAddrSuggestions(false); return; }
    setShowAddrSuggestions(true);
    addrDebounceRef.current = setTimeout(async () => {
      setAddrSearching(true);
      try {
        const results = await geocodeAddress(val, { viewbox: DFW_VIEWBOX, bounded: false });
        setAddrSuggestions(results.slice(0, 6));
        setShowAddrSuggestions(true);
      } finally {
        setAddrSearching(false);
      }
    }, 400);
  }

  function pickAddrSuggestion(s: { lat: number; lng: number; shortName: string }) {
    setAddrInput(s.shortName);
    setAddrSuggestions([]);
    setShowAddrSuggestions(false);
    setPendingCoords({ lat: s.lat, lng: s.lng });
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        addrDropdownRef.current && !addrDropdownRef.current.contains(e.target as Node) &&
        addrInputRef.current && !addrInputRef.current.contains(e.target as Node)
      ) {
        setShowAddrSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;

  const savedAddress = data?.profile?.address;
  const hasSavedLocation = !!(data?.profile?.worker_lat && data?.profile?.worker_lng);

  return (
    <div className="space-y-8 max-w-lg">

      {/* ── Home Address Section ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">My Home Address</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Used to calculate your ride fee to each job's location.
          </p>
        </div>

        {hasSavedLocation && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm">
            <Car className="h-4 w-4 text-green-700 shrink-0" />
            <div>
              <span className="font-medium text-green-800">Address saved</span>
              {savedAddress && <span className="text-green-700 ml-1">— {savedAddress}</span>}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Search your address</label>
          <div className="relative">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={addrInputRef}
                value={addrInput}
                onChange={(e) => handleAddrInput(e.target.value)}
                onFocus={() => addrSuggestions.length > 0 && setShowAddrSuggestions(true)}
                placeholder="Type your home address…"
                className="pl-10 pr-8"
                autoComplete="off"
              />
              {addrSearching ? (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              ) : addrInput ? (
                <button
                  type="button"
                  onClick={() => { setAddrInput(""); setAddrSuggestions([]); setPendingCoords(null); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {showAddrSuggestions && (addrSearching || addrSuggestions.length > 0) && (
              <ul
                ref={addrDropdownRef}
                className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] bg-card border border-border rounded-lg shadow-xl overflow-hidden"
              >
                {addrSearching && addrSuggestions.length === 0 && (
                  <li className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Searching…
                  </li>
                )}
                {addrSuggestions.map((s, i) => (
                  <li key={i} className="border-b border-border last:border-0">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickAddrSuggestion(s)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-secondary transition-colors flex items-start gap-2.5"
                    >
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{s.shortName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {pendingCoords && (
            <p className="text-xs text-green-700 font-medium">
              ✓ Location found — click Save Address to confirm.
            </p>
          )}
          {!pendingCoords && addrInput && !addrSearching && (
            <p className="text-xs text-muted-foreground">Select an address from the suggestions above.</p>
          )}
        </div>

        <Button
          disabled={addrMut.isPending || !pendingCoords}
          onClick={() => {
            if (!pendingCoords) return;
            addrMut.mutate({ address: addrInput, lat: pendingCoords.lat, lng: pendingCoords.lng });
          }}
        >
          {addrMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : "Save address"}
        </Button>
      </div>

      <div className="border-t border-border" />

      {/* ── Availability Section ── */}
      <div className="space-y-5">

        {/* Header + quick-select */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">My Availability</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Toggle each day and set custom hours — changes are saved together.
            </p>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Quick select:</span>
            {(
              [
                { label: "Weekdays", val: ["Mon","Tue","Wed","Thu","Fri"] },
                { label: "Weekends", val: ["Sat","Sun"] },
                { label: "All week", val: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] },
                { label: "Clear",    val: [] },
              ] as const
            ).map(({ label, val }) => (
              <button
                key={label}
                onClick={() =>
                  setSchedule((prev) => {
                    const next: Record<string, { from: string; until: string }> = {};
                    val.forEach((d) => {
                      next[d] = prev[d] ?? { from: "09:00", until: "17:00" };
                    });
                    return next;
                  })
                }
                className="text-xs px-3 py-1 rounded-full border border-border hover:border-foreground transition-colors text-muted-foreground hover:text-foreground"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Weekly schedule grid — per-day time pickers */}
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_160px_1fr] gap-x-4 px-4 py-2.5 bg-secondary/50 border-b border-border items-center">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-6" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Day</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hours</span>
          </div>

          {DAYS.map((d, i) => {
            const entry = schedule[d];
            const available = !!entry;
            const DAY_FULL: Record<string, string> = {
              Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday",
              Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
            };
            return (
              <div
                key={d}
                className={cn(
                  "grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_160px_1fr] gap-x-4 px-4 items-center transition-colors",
                  "py-3.5",
                  i < DAYS.length - 1 && "border-b border-border",
                  available ? "bg-card" : "bg-secondary/10"
                )}
              >
                {/* Toggle */}
                <button
                  role="switch"
                  aria-checked={available}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
                    "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    available ? "bg-green-500" : "bg-input"
                  )}
                >
                  <span className={cn(
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md",
                    "transform ring-0 transition-transform duration-200",
                    available ? "translate-x-4" : "translate-x-0"
                  )} />
                </button>

                {/* Day name */}
                <span className={cn(
                  "text-sm font-medium",
                  available ? "text-foreground" : "text-muted-foreground"
                )}>
                  {DAY_FULL[d]}
                </span>

                {/* Per-day time pickers or unavailable badge */}
                {available ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={entry.from}
                      onChange={(e) => setDayTime(d, "from", e.target.value)}
                      className="h-8 w-[104px] rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <span className="text-muted-foreground text-xs shrink-0">to</span>
                    <input
                      type="time"
                      value={entry.until}
                      onChange={(e) => setDayTime(d, "until", e.target.value)}
                      className="h-8 w-[104px] rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground font-medium w-fit">
                    Unavailable
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary strip */}
        {Object.keys(schedule).length > 0 ? (
          <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 px-4 py-3 space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-sm font-medium text-foreground">Schedule set for {Object.keys(schedule).length} day{Object.keys(schedule).length !== 1 ? "s" : ""}</span>
            </div>
            <div className="pl-6 space-y-0.5">
              {DAYS.filter((d) => schedule[d]).map((d) => {
                const e = schedule[d];
                const f = (t: string) => { const [h,m]=t.split(":").map(Number); return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`; };
                return (
                  <p key={d} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground w-20 inline-block">{d}</span>
                    {f(e.from)} – {f(e.until)}
                  </p>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 px-4 py-3 flex items-center gap-3">
            <CalendarClock className="h-4 w-4 text-yellow-600 shrink-0" />
            <p className="text-sm text-muted-foreground">No days selected — you'll appear as unavailable to your team.</p>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Additional notes</label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Not available after 3pm on Fridays, prefer north DFW area…"
            maxLength={300}
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">{note.length}/300</p>
        </div>

        <Button
          disabled={mut.isPending}
          onClick={() => mut.mutate({ schedule, note: note || null })}
        >
          {mut.isPending ? "Saving…" : "Save availability"}
        </Button>
      </div>
    </div>
  );
}
