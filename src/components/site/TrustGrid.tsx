import { ShieldCheck, ListChecks, Receipt } from "lucide-react";

const items = [
  {
    icon: ShieldCheck,
    title: "Lifetime parts warranty",
    body: "Every screen, battery, and component we install is covered for as long as you own the device. No fine print.",
  },
  {
    icon: ListChecks,
    title: "60-second diagnostic",
    body: "Free multi-point health check before a single tool comes out. You see the full report, you decide.",
  },
  {
    icon: Receipt,
    title: "Zero hidden fees",
    body: "Parts + labor + travel is the entire bill. No 'inspection fees', no 'service charges', no surprises.",
  },
];

export function TrustGrid() {
  return (
    <section id="trust" className="mx-auto max-w-7xl px-5 py-24">
      <div className="max-w-2xl mb-12">
        <p className="text-cyan text-sm font-medium tracking-wide uppercase">Why FixHub</p>
        <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
          Built to fix the repair industry, not just your phone.
        </h2>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {items.map(({ icon: Icon, title, body }) => (
          <div key={title} className="surface-card rounded-2xl p-7 transition-all hover:-translate-y-1">
            <div className="h-12 w-12 rounded-xl bg-[var(--cyan)]/10 grid place-items-center text-cyan border border-[var(--cyan)]/20">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-6 text-xl font-semibold tracking-tight">{title}</h3>
            <p className="mt-3 text-muted-foreground leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
