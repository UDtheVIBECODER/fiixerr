// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Timer, MapPin, CheckCircle, Wrench, Star, Zap, Award, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoUrl from "@/assets/fiixerr-logo.png";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Fiixerr — Honest Mobile Phone Repair at Home or Work" },
      {
        name: "description",
        content:
          "Fiixerr offers upfront repair pricing for iPhone, Samsung, and Pixel. We come to you in under 30 minutes. Lifetime parts warranty. Zero hidden fees.",
      },
    ],
  }),
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <Hero />
<HowItWorks />
<WhyFiixerr />
      <BottomCTA />
      <LandingFooter />
    </div>
  );
}

/* ── Nav ── */
function LandingNav() {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 h-[68px] flex items-center justify-between gap-4">
        <a href="/" className="flex items-center gap-2.5 shrink-0">
          <img src={logoUrl} alt="Fiixerr" className="h-8 w-auto" />
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-foreground/60">
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#why-fiixerr" className="hover:text-foreground transition-colors">Why us</a>
        </nav>

        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/customer-login" })}
            className="hidden sm:inline-flex text-foreground/70 hover:text-foreground"
          >
            Sign in
          </Button>
          <Button
            size="sm"
            onClick={() => navigate({ to: "/customer-login" })}
            className="font-semibold rounded-lg"
          >
            Book a Repair
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ── Hero ── */
function Hero() {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
      {/* grid bg */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(oklch(0.32 0.07 250 / 0.04) 1px, transparent 1px),
                            linear-gradient(to right, oklch(0.32 0.07 250 / 0.04) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.32_0.07_250/0.07),transparent)] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* left */}
          <div>
            {/* badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium text-foreground/70 mb-8 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-green-500 shrink-0" />
              Techs available in your area
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold text-foreground leading-[1.07] tracking-tight">
              Your phone fixed,
              <br />
              <span
                style={{
                  backgroundImage: "linear-gradient(135deg, oklch(0.32 0.07 250), oklch(0.45 0.1 250))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                at your door.
              </span>
            </h1>

            <p className="mt-5 text-lg text-foreground/65 max-w-lg leading-relaxed">
              A certified technician arrives in under 30 minutes with genuine parts. See the exact price before we touch your phone — no surprises.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="h-13 px-7 text-base font-semibold rounded-xl shadow-lg shadow-foreground/10"
                onClick={() => navigate({ to: "/customer-login" })}
              >
                Book a Repair
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-13 px-7 text-base rounded-xl"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              >
                See how it works
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2.5 text-sm text-foreground/55">
              {["Upfront pricing", "Lifetime warranty", "No hidden fees"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-foreground/40" />
                  {t}
                </span>
              ))}
            </div>

            <p className="mt-8 pt-6 border-t border-border/60 text-sm text-foreground/40">
              Technician or admin?{" "}
              <Link to="/access" className="text-foreground/60 hover:text-foreground underline underline-offset-2 transition-colors">
                Sign in to the dashboard →
              </Link>
            </p>
          </div>

          {/* right — UI mockup */}
          <div className="relative hidden lg:flex justify-center items-center">
            {/* main quote card */}
            <div className="relative w-full max-w-sm">
              <div className="surface-card rounded-2xl p-6 shadow-2xl shadow-foreground/10">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs font-semibold uppercase tracking-widest text-foreground/40">Your Quote</span>
                  <ShieldCheck className="h-4 w-4 text-foreground/40" />
                </div>

                <div className="mb-4">
                  <p className="text-xs text-foreground/50 mb-1">Device</p>
                  <p className="font-semibold text-foreground">iPhone 16 Pro</p>
                </div>

                <div className="space-y-2.5 pb-4 border-b border-border">
                  {[
                    { label: "Screen replacement", amount: "$189" },
                    { label: "Labor", amount: "$45" },
                    { label: "Travel (10001)", amount: "$15" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between text-sm">
                      <span className="text-foreground/65">{row.label}</span>
                      <span className="font-medium text-foreground">{row.amount}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl bg-foreground p-4 text-background">
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-1">Total</p>
                  <p className="text-3xl font-bold tracking-tight">$249</p>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-foreground/50">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  Lifetime warranty on all parts
                </div>
              </div>

              {/* floating — tech en route */}
              <div className="absolute -bottom-5 -left-8 bg-card border border-border rounded-xl shadow-xl px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-green-50 border border-green-200 flex items-center justify-center shrink-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 block" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground leading-none mb-0.5">Tech en route</p>
                  <p className="text-xs text-foreground/50">Arrives in 18 min</p>
                </div>
              </div>

              {/* floating — rating */}
              <div className="absolute -top-5 -right-6 bg-card border border-border rounded-xl shadow-xl px-4 py-3">
                <div className="flex items-center gap-1 mb-0.5">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-xs font-semibold text-foreground">4.9 · 1,200+ repairs</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Stats bar ── */
function StatsBar() {
  const stats = [
    { value: "1,200+", label: "Repairs completed" },
    { value: "4.9★", label: "Average rating" },
    { value: "<30 min", label: "Arrival time" },
    { value: "Lifetime", label: "Parts warranty" },
  ];
  return (
    <div className="border-y border-border bg-foreground">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-background">{s.value}</p>
              <p className="text-sm text-background/50 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── How it works ── */
function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: Phone,
      title: "Pick your device & repair",
      body: "Select your phone and model, choose repairs, and see the exact part + labor price — all before booking.",
    },
    {
      number: "02",
      icon: Timer,
      title: "Pick a time slot",
      body: "Choose any slot in the next 7 days, including today. Reschedule free up to 2 hours before.",
    },
    {
      number: "03",
      icon: MapPin,
      title: "We come to you",
      body: "Your tech arrives at your home, office, or driveway. Most repairs wrap up in under 45 minutes.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* header */}
        <div className="max-w-2xl mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-foreground/40 mb-3">How it works</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">Fixed in 3 steps.</h2>
          <p className="mt-4 text-lg text-foreground/60 leading-relaxed">
            From booking to repaired device — usually under an hour.
          </p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-6">
          {/* connecting line — desktop only */}
          <div className="hidden md:block absolute top-10 left-[calc(33.33%+1.5rem)] right-[calc(33.33%+1.5rem)] h-px bg-border" />

          {steps.map((s, idx) => (
            <div key={s.number} className="relative surface-card rounded-2xl p-8 hover:shadow-md transition-shadow">
              {/* step number */}
              <div className="absolute top-6 right-6 text-5xl font-black text-foreground/[0.05] select-none leading-none">
                {s.number}
              </div>

              {/* icon */}
              <div className="h-12 w-12 rounded-2xl bg-foreground grid place-items-center text-background mb-6">
                <s.icon className="h-5 w-5" />
              </div>

              <h3 className="text-lg font-bold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Testimonials ── */
function Testimonials() {
  const reviews = [
    {
      name: "Jordan M.",
      location: "New York, NY",
      rating: 5,
      text: "Cracked my screen at 8am, had it fixed by 9:30. The tech was professional, the price was exactly what was quoted. This is how all repairs should work.",
      device: "iPhone 15 Pro",
    },
    {
      name: "Priya S.",
      location: "San Francisco, CA",
      rating: 5,
      text: "I was skeptical about a mobile repair service but Fiixerr blew me away. No waiting room, no haggling — just a fixed phone and a receipt.",
      device: "Samsung Galaxy S24",
    },
    {
      name: "Carlos R.",
      location: "Chicago, IL",
      rating: 5,
      text: "Battery was dying fast. Booked at lunch, tech came to my office. Done before my next meeting. The lifetime warranty gave me real peace of mind.",
      device: "Pixel 9",
    },
  ];

  return (
    <section id="reviews" className="py-20 sm:py-28 bg-secondary/30 border-y border-border">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-xl mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-foreground/40 mb-3">Reviews</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">Customers love it.</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {reviews.map((r) => (
            <div key={r.name} className="surface-card rounded-2xl p-7 flex flex-col gap-4 hover:shadow-md transition-shadow">
              {/* stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              <p className="text-foreground/80 leading-relaxed text-sm flex-1">"{r.text}"</p>

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.name}</p>
                  <p className="text-xs text-foreground/50">{r.location}</p>
                </div>
                <div className="text-xs text-foreground/40 bg-secondary rounded-md px-2.5 py-1">{r.device}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Why Fiixerr ── */
function WhyFiixerr() {
  const features = [
    {
      icon: ShieldCheck,
      title: "Lifetime parts warranty",
      body: "Every screen, battery, and component is covered for life. If it fails from a defect, we replace it — free.",
    },
    {
      icon: Zap,
      title: "Zero hidden fees",
      body: "Parts + labor + travel is the entire bill. No diagnostic fees, no on-site surcharges, ever.",
    },
    {
      icon: Award,
      title: "Certified technicians",
      body: "Every Fiixerr tech is background-checked and certified. We carry OEM-grade parts for every job.",
    },
  ];

  return (
    <section id="why-fiixerr" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-16 items-center">
          {/* left text */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-foreground/40 mb-3">Why Fiixerr</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight leading-tight">
              Repair the way it
              <br />
              should always be.
            </h2>
            <p className="mt-5 text-lg text-foreground/60 leading-relaxed">
              We built Fiixerr because phone repair was broken — overpriced, opaque, and inconvenient. We fixed all three.
            </p>
            <Button
              size="lg"
              className="mt-8 h-13 px-7 text-base font-semibold rounded-xl"
              onClick={() => document.getElementById("pricing-cta")?.scrollIntoView({ behavior: "smooth" })}
            >
              See pricing
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* right feature cards */}
          <div className="space-y-4">
            {features.map((f) => (
              <div key={f.title} className="surface-card rounded-2xl p-6 flex items-start gap-5 hover:shadow-md transition-shadow">
                <div className="h-11 w-11 rounded-xl bg-foreground grid place-items-center text-background shrink-0">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{f.title}</h3>
                  <p className="text-sm text-foreground/60 leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Bottom CTA ── */
function BottomCTA() {
  const navigate = useNavigate();
  return (
    <section id="pricing-cta" className="py-6 sm:py-8 px-5 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-3xl bg-foreground px-8 sm:px-14 py-16 sm:py-20 text-center">
          {/* background accent */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_120%,oklch(0.45_0.1_250/0.3),transparent)] pointer-events-none" />
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                                linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-background/20 bg-background/10 px-4 py-1.5 text-sm font-medium text-background/70 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-green-400" />
              Available today
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold text-background tracking-tight">
              Ready to get fixed?
            </h2>
            <p className="mt-4 text-lg text-background/55 max-w-lg mx-auto leading-relaxed">
              See your exact repair price in under 2 minutes. No commitment until you confirm.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="h-13 px-8 text-base font-semibold rounded-xl bg-background text-foreground hover:bg-background/90 shadow-lg"
                onClick={() => navigate({ to: "/customer-login" })}
              >
                Book a Repair
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-13 px-8 text-base rounded-xl border-background/20 text-background hover:bg-background/10"
                onClick={() => navigate({ to: "/customer-login" })}
              >
                Sign in
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ── */
function LandingFooter() {
  return (
    <footer className="border-t border-border py-10 mt-4">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-5 text-sm text-foreground/45">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          <span className="font-medium">Fiixerr</span>
          <span className="text-foreground/30">·</span>
          <span>© {new Date().getFullYear()} All rights reserved</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#why-fiixerr" className="hover:text-foreground transition-colors">Warranty</a>
          <Link to="/access" className="hover:text-foreground transition-colors">Admin</Link>
        </div>
      </div>
    </footer>
  );
}
