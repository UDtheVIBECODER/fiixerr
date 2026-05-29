import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listSettings, upsertSetting } from "@/lib/pos.functions";
import type { SystemSetting } from "@/lib/pos.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Save,
  Plus,
  CreditCard,
  Landmark,
  DollarSign,
  Smartphone,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_dashboard/dashboard/ultimate-admin")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/access" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", u.user.id)
      .maybeSingle();

    if (profile?.role !== "ULTIMATE_ADMIN") {
      console.error("[Auth] Attempted access to ultimate-admin panel with role:", profile?.role);
      throw redirect({ to: "/dashboard/orders" });
    }
  },
  component: UltimateAdminPage,
  head: () => ({ meta: [{ title: "Admin Panel — Fiixerr" }] }),
});

// ---------------------------------------------------------------------------
// Known gateway setting keys with human labels
// ---------------------------------------------------------------------------
type KnownKey =
  | "stripe_publishable_key"
  | "stripe_secret_key"
  | "paypal_client_id"
  | "cashapp_merchant_id"
  | "enabled_gateways";

const KNOWN_KEYS: Record<KnownKey, { label: string; placeholder: string; sensitive: boolean; icon: React.ReactNode }> = {
  stripe_publishable_key: {
    label: "Stripe Publishable Key",
    placeholder: "pk_live_...",
    sensitive: false,
    icon: <CreditCard className="h-4 w-4" />,
  },
  stripe_secret_key: {
    label: "Stripe Secret Key",
    placeholder: "sk_live_...",
    sensitive: true,
    icon: <Lock className="h-4 w-4" />,
  },
  paypal_client_id: {
    label: "PayPal Client ID",
    placeholder: "AaBbCc...",
    sensitive: false,
    icon: <Landmark className="h-4 w-4" />,
  },
  cashapp_merchant_id: {
    label: "Cash App Merchant ID",
    placeholder: "merchant_...",
    sensitive: false,
    icon: <DollarSign className="h-4 w-4" />,
  },
  enabled_gateways: {
    label: "Enabled Gateways",
    placeholder: "stripe,paypal,cashapp,applepay,googlepay",
    sensitive: false,
    icon: <Smartphone className="h-4 w-4" />,
  },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function UltimateAdminPage() {
  const list = useServerFn(listSettings);
  const upsert = useServerFn(upsertSetting);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: () => list(),
  });

  const save = useMutation({
    mutationFn: (vars: { key: string; value: string; description?: string | null }) =>
      upsert({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system-settings"] });
      toast.success("Setting saved");
    },
    onError: (e) => {
      console.error("[POS Config] Save failed:", e);
      toast.error(e instanceof Error ? e.message : "Failed to save");
    },
  });

  const settingsByKey = new Map<string, SystemSetting>(
    (data?.settings ?? []).map((s) => [s.key, s]),
  );

  return (
    <div className="space-y-10 max-w-4xl">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[var(--cyan)] grid place-items-center text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ultimate Admin Panel</h1>
          <p className="text-sm text-muted-foreground">
            Exclusive owner controls. Visible only to ULTIMATE_ADMIN.
          </p>
        </div>
      </header>

      <Separator />

      {/* Payment Gateway & POS Configuration */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Payment Gateway &amp; POS Configuration
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your merchant processor credentials. These are stored securely in the database and
            are never exposed to browsers. The checkout page reads only the list of enabled gateways.
          </p>
        </div>

        {/* Known settings cards */}
        <div className="grid grid-cols-1 gap-4">
          {(Object.entries(KNOWN_KEYS) as [KnownKey, (typeof KNOWN_KEYS)[KnownKey]][]).map(
            ([key, meta]) => {
              const existing = settingsByKey.get(key);
              return (
                <SettingCard
                  key={key}
                  settingKey={key}
                  label={meta.label}
                  placeholder={meta.placeholder}
                  sensitive={meta.sensitive}
                  icon={meta.icon}
                  currentValue={existing?.value ?? ""}
                  updatedAt={existing?.updated_at}
                  onSave={(value) => save.mutate({ key, value, description: KNOWN_KEYS[key]?.label })}
                  isSaving={save.isPending}
                />
              );
            },
          )}
        </div>

        {/* Custom setting entry */}
        <CustomSettingForm
          onSave={(key, value, description) => save.mutate({ key, value, description })}
          isSaving={save.isPending}
        />

        {/* Raw settings table */}
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">All stored settings</h3>
          <div className="border border-border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Last updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {(data?.settings ?? []).map((s) => (
                  <TableRow key={s.key}>
                    <TableCell className="font-mono text-sm">{s.key}</TableCell>
                    <TableCell>
                      <RedactedValue value={s.value} sensitive={s.key.includes("secret") || s.key.includes("key")} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(s.updated_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && (data?.settings ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      No settings stored yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SettingCard — editable card for a known setting
// ---------------------------------------------------------------------------
function SettingCard({
  settingKey,
  label,
  placeholder,
  sensitive,
  icon,
  currentValue,
  updatedAt,
  onSave,
  isSaving,
}: {
  settingKey: string;
  label: string;
  placeholder: string;
  sensitive: boolean;
  icon: React.ReactNode;
  currentValue: string;
  updatedAt?: string;
  onSave: (value: string) => void;
  isSaving: boolean;
}) {
  const [value, setValue] = useState(currentValue);
  const [revealed, setRevealed] = useState(false);
  const dirty = value !== currentValue;

  return (
    <div className="surface-card rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[var(--cyan)]">{icon}</span>
        <span className="font-semibold text-foreground">{label}</span>
        {currentValue && (
          <Badge variant="outline" className="ml-auto text-xs">
            Configured
          </Badge>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={sensitive && !revealed ? "password" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="h-12 bg-[var(--surface)] pr-10 font-mono text-sm"
            aria-label={`Enter ${label}`}
          />
          {sensitive && (
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={revealed ? "Hide value" : "Reveal value"}
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        <Button
          size="touch"
          onClick={() => onSave(value)}
          disabled={!dirty || isSaving}
          className={cn(!dirty && "opacity-40")}
          aria-label={`Save ${label}`}
        >
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>

      {updatedAt && (
        <p className="text-xs text-muted-foreground">
          Last saved: {new Date(updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom setting entry form
// ---------------------------------------------------------------------------
function CustomSettingForm({
  onSave,
  isSaving,
}: {
  onSave: (key: string, value: string, description: string) => void;
  isSaving: boolean;
}) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) {
      toast.error("Setting key is required.");
      return;
    }
    onSave(key.trim(), value, description);
    setKey("");
    setValue("");
    setDescription("");
    setOpen(false);
  }

  if (!open) {
    return (
      <Button variant="outline" size="touch" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add custom setting
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="surface-card rounded-xl p-5 space-y-4 border-2 border-dashed border-[var(--cyan)]/40"
    >
      <h3 className="font-semibold text-foreground">New custom setting</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="customKey">Key</Label>
          <Input
            id="customKey"
            required
            value={key}
            onChange={(e) => setKey(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
            placeholder="my_processor_key"
            className="h-12 bg-[var(--surface)] font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="customValue">Value</Label>
          <Input
            id="customValue"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="value..."
            className="h-12 bg-[var(--surface)]"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="customDesc">Description (optional)</Label>
          <Input
            id="customDesc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this key for?"
            className="h-12 bg-[var(--surface)]"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="touch" disabled={isSaving}>
          <Save className="h-4 w-4" />
          Save setting
        </Button>
        <Button type="button" variant="outline" size="touch" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// RedactedValue
// ---------------------------------------------------------------------------
function RedactedValue({ value, sensitive }: { value: string; sensitive: boolean }) {
  const [show, setShow] = useState(false);
  if (!value) return <span className="text-muted-foreground text-xs italic">— empty —</span>;
  if (!sensitive) return <span className="font-mono text-sm">{value}</span>;

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm">{show ? value : "••••••••••••"}</span>
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="text-muted-foreground hover:text-foreground"
        aria-label={show ? "Hide" : "Reveal"}
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
