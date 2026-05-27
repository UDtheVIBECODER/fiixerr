import { Button } from "@/components/ui/button";
import { ArrowDown, MapPin, ShieldCheck, Timer } from "lucide-react";

export function Hero() {
  const scrollToBooking = () => {
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <section id="top" aria-labelledby="hero-heading" className="relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-md hairline bg-surface px-3 py-2 text-sm font-medium text-foreground mb-6">
            <ShieldCheck className="h-4 w-4 text-[var(--cyan)]" aria-hidden="true" />
            Honest, upfront pricing. No surprise fees.
          </div>
          <h1 id="hero-heading" className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">
            Trusted phone repair, brought to your home or office.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-foreground/80 max-w-2xl">
            Fiixerr is a professional mobile repair service. We arrive at your address in under
            30 minutes, show you the exact price first, and back every repair with a lifetime warranty.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
            <Button variant="hero" size="xl" onClick={scrollToBooking} className="w-full sm:w-auto" aria-label="See upfront pricing and book a repair">
              See upfront pricing
              <ArrowDown className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button variant="outline" size="xl" onClick={() => document.getElementById("trust")?.scrollIntoView({ behavior: "smooth" })} className="w-full sm:w-auto">
              Why choose Fiixerr
            </Button>
          </div>

          <dl className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
            <Stat icon={<Timer className="h-5 w-5" aria-hidden="true" />} k="Under 30 min" v="On-site arrival" />
            <Stat icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />} k="Lifetime" v="Parts warranty" />
            <Stat icon={<MapPin className="h-5 w-5" aria-hidden="true" />} k="$0 hidden" v="Travel quoted upfront" />
          </dl>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, k, v }: { icon: React.ReactNode; k: string; v: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-11 w-11 rounded-md bg-[var(--cyan)] grid place-items-center text-[var(--primary-foreground)] shrink-0">{icon}</div>
      <div>
        <div className="text-xl font-bold text-foreground">{k}</div>
        <div className="text-base text-foreground/70">{v}</div>
      </div>
    </div>
  );
}
