import { Button } from "@/components/ui/button";
import { ArrowDown, MapPin, ShieldCheck, Timer } from "lucide-react";

export function Hero() {
  const scrollToBooking = () => {
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-5 pt-20 pb-24 md:pt-32 md:pb-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full hairline px-3 py-1.5 text-xs text-muted-foreground mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--cyan)] animate-pulse" />
            Anti-extortion repair, no sketchy quotes
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-semibold leading-[1.05] tracking-tight">
            Your device fixed at home or work.
            <span className="block text-cyan">Clear, honest prices.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
            No hidden fees, no sketchy quotes. We bring the repair lab to your driveway in under 30 minutes.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button variant="hero" size="xl" onClick={scrollToBooking}>
              See upfront pricing
              <ArrowDown className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="xl" onClick={() => document.getElementById("trust")?.scrollIntoView({ behavior: "smooth" })}>
              Why FixHub
            </Button>
          </div>

          <dl className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
            <Stat icon={<Timer className="h-4 w-4" />} k="< 30 min" v="On-site arrival" />
            <Stat icon={<ShieldCheck className="h-4 w-4" />} k="Lifetime" v="Parts warranty" />
            <Stat icon={<MapPin className="h-4 w-4" />} k="$0 hidden" v="Travel quoted upfront" />
          </dl>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, k, v }: { icon: React.ReactNode; k: string; v: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg surface-card grid place-items-center text-cyan">{icon}</div>
      <div>
        <div className="text-xl font-semibold tracking-tight">{k}</div>
        <div className="text-sm text-muted-foreground">{v}</div>
      </div>
    </div>
  );
}
