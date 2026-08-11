// @ts-nocheck
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
    body: "A free multi-point health check before any work begins. You see the full report and you decide what to do.",
  },
  {
    icon: Receipt,
    title: "Zero hidden fees",
    body: "Parts plus labor plus travel is the entire bill. No inspection fees, no service charges, no surprises.",
  },
];

export function TrustGrid() {
  return (
    <section id="trust" aria-labelledby="trust-heading" className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
      <div className="max-w-2xl mb-10">
        <p className="text-[var(--cyan)] text-sm font-semibold tracking-wide uppercase">Why Fiixerr</p>
        <h2 id="trust-heading" className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
          A repair service you can trust.
        </h2>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-5 list-none p-0">
        {items.map(({ icon: Icon, title, body }) => (
          <li key={title} className="surface-card rounded-lg p-7">
            <div className="h-12 w-12 rounded-md bg-[var(--cyan)] grid place-items-center text-[var(--primary-foreground)]" aria-hidden="true">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-bold text-foreground">{title}</h3>
            <p className="mt-3 text-foreground/75 leading-relaxed">{body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
