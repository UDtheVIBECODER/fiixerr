// @ts-nocheck
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RotateCcw, History, Loader2 } from "lucide-react";
import { editBooking, getOrderEdits, overturnEdit } from "@/lib/order-edits.functions";

/* ─── Helpers ──────────────────────────────────────────────────── */

function toDatetimeLocal(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const FIELD_LABELS: Record<string, string> = {
  appointment_at: "Appointment",
  notes: "Notes",
  street_address: "Street address",
  zip: "ZIP",
  customer_name: "Customer name",
  customer_phone: "Customer phone",
  customer_email: "Customer email",
};

function formatFieldValue(field: string, value: any) {
  if (value === null || value === undefined || value === "") return "(empty)";
  if (field === "appointment_at") {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return String(value);
}

/* ─── OrderEditHistory ─────────────────────────────────────────── */

interface OrderEditHistoryProps {
  bookingId: string;
  isUltimateAdmin?: boolean;
  /** Pass invalidation keys to refresh after overturn */
  queryKeys?: string[][];
}

export function OrderEditHistory({
  bookingId,
  isUltimateAdmin = false,
  queryKeys = [],
}: OrderEditHistoryProps) {
  const [open, setOpen] = useState(false);
  const editsFn = useServerFn(getOrderEdits);
  const overturnFn = useServerFn(overturnEdit);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["order-edits", bookingId],
    queryFn: () => editsFn({ data: { bookingId } }),
    enabled: open,
  });

  const overturnMut = useMutation({
    mutationFn: (editId: string) => overturnFn({ data: { editId } }),
    onSuccess: () => {
      toast.success("Edit overturned — booking restored");
      refetch();
      for (const key of queryKeys) qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const edits = data?.edits ?? [];

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <History className="h-3.5 w-3.5" />
        {open ? "Hide" : "Show"} edit history
        {edits.length > 0 && !isLoading && (
          <span className="ml-1 bg-secondary rounded-full px-1.5 py-0.5 text-[10px] font-medium">
            {edits.length}
          </span>
        )}
      </button>

      {open && (
        <div className="space-y-2">
          {isLoading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading history…
            </p>
          )}
          {!isLoading && edits.length === 0 && (
            <p className="text-xs text-muted-foreground">No edits recorded.</p>
          )}
          {edits.map((edit) => (
            <div
              key={edit.id}
              className={cn(
                "rounded-lg border bg-card p-3 space-y-2 text-xs",
                edit.overturned_at
                  ? "border-dashed border-border opacity-60"
                  : "border-border",
              )}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {edit.editor_username}
                  </span>
                  edited ·{" "}
                  {new Date(edit.edited_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>

                {isUltimateAdmin && !edit.overturned_at && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[11px] px-2 gap-1"
                    disabled={overturnMut.isPending}
                    onClick={() => {
                      if (
                        confirm(
                          "Overturn this edit? The booking will be restored to its previous values.",
                        )
                      ) {
                        overturnMut.mutate(edit.id);
                      }
                    }}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Overturn
                  </Button>
                )}

                {edit.overturned_at && (
                  <span className="text-[11px] text-muted-foreground italic">
                    Overturned by {edit.overturner_username} ·{" "}
                    {new Date(edit.overturned_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {Object.entries(
                  edit.changes as Record<
                    string,
                    { old: any; new: any }
                  >,
                ).map(([field, change]) => (
                  <div key={field} className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="font-medium text-foreground/70">
                      {FIELD_LABELS[field] ?? field}
                    </span>
                    <span>
                      <span className="line-through text-muted-foreground">
                        {formatFieldValue(field, change.old)}
                      </span>
                      {" → "}
                      <span className="text-foreground font-medium">
                        {formatFieldValue(field, change.new)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── EditBookingModal ─────────────────────────────────────────── */

interface BookingForEdit {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  street_address?: string | null;
  zip: string;
  appointment_at: string;
  notes?: string | null;
  brand_name_snapshot?: string;
  model_name_snapshot?: string;
}

interface EditBookingModalProps {
  booking: BookingForEdit;
  open: boolean;
  onClose: () => void;
  /** Query keys to invalidate after a successful save */
  queryKeys?: string[][];
}

export function EditBookingModal({
  booking,
  open,
  onClose,
  queryKeys = [],
}: EditBookingModalProps) {
  const editFn = useServerFn(editBooking);
  const qc = useQueryClient();

  const [form, setForm] = useState({
    customer_name: booking.customer_name ?? "",
    customer_phone: booking.customer_phone ?? "",
    customer_email: booking.customer_email ?? "",
    street_address: booking.street_address ?? "",
    zip: booking.zip ?? "",
    appointment_at: toDatetimeLocal(booking.appointment_at),
    notes: booking.notes ?? "",
  });

  // Reset form if booking changes
  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const mut = useMutation({
    mutationFn: () =>
      editFn({
        data: {
          bookingId: booking.id,
          customer_name: form.customer_name || undefined,
          customer_phone: form.customer_phone || undefined,
          customer_email: form.customer_email || null,
          street_address: form.street_address || undefined,
          zip: form.zip || undefined,
          appointment_at: form.appointment_at
            ? new Date(form.appointment_at).toISOString()
            : undefined,
          notes: form.notes || null,
        },
      }),
    onSuccess: (res) => {
      if (res.changed) {
        toast.success("Order updated");
        qc.invalidateQueries({ queryKey: ["order-edits", booking.id] });
        for (const key of queryKeys) qc.invalidateQueries({ queryKey: key });
      } else {
        toast.info("No changes detected");
      }
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Order</DialogTitle>
          {(booking.brand_name_snapshot || booking.model_name_snapshot) && (
            <p className="text-sm text-muted-foreground">
              {booking.brand_name_snapshot} {booking.model_name_snapshot}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Appointment
            </label>
            <Input
              type="datetime-local"
              value={form.appointment_at}
              onChange={set("appointment_at")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Customer name
              </label>
              <Input value={form.customer_name} onChange={set("customer_name")} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Phone
              </label>
              <Input value={form.customer_phone} onChange={set("customer_phone")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Email
            </label>
            <Input
              type="email"
              value={form.customer_email}
              onChange={set("customer_email")}
            />
          </div>

          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Street address
              </label>
              <Input value={form.street_address} onChange={set("street_address")} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                ZIP
              </label>
              <Input value={form.zip} onChange={set("zip")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Notes
            </label>
            <Textarea
              value={form.notes}
              onChange={set("notes")}
              rows={3}
              placeholder="Internal notes…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
