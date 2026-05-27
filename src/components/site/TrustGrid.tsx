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
    <section id="trust" aria-labelledby="trust-heading" className="mx-auto max-w-7xl px-4 sm:px-5 py-16 sm:py-24">
      <div className="max-w-2xl mb-10 sm:mb-12">
        <p className="text-cyan text-sm font-medium tracking-wide uppercase">Why Fiixerr</p>
        <h2 id="trust-heading" className="mt-3 text-2xl sm:text-3xl md:text-5xl font-semibold tracking-tight">
          Built to fix the repair industry, not just your phone.
        </h2>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 list-none p-0">
        {items.map(({ icon: Icon, title, body }) => (
          <li key={title} className="surface-card rounded-2xl p-6 sm:p-7 transition-all hover:-translate-y-1">
            <div className="h-12 w-12 rounded-xl bg-[var(--cyan)]/10 grid place-items-center text-cyan border border-[var(--cyan)]/20" aria-hidden="true">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-5 sm:mt-6 text-lg sm:text-xl font-semibold tracking-tight">{title}</h3>
            <p className="mt-2 sm:mt-3 text-muted-foreground leading-relaxed">{body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
