import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Hero } from "@/components/site/Hero";
import { TrustGrid } from "@/components/site/TrustGrid";
import { BookingEngine } from "@/components/booking/BookingEngine";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Fiixerr — Honest Mobile Phone Repair at Home or Work" },
      {
        name: "description",
        content:
          "Fiixerr offers upfront repair pricing for iPhone, Samsung, and Pixel. We come to your driveway in under 30 minutes. Lifetime parts warranty. Zero hidden fees.",
      },
      { property: "og:title", content: "Fiixerr — Anti-Extortion Mobile Phone Repair" },
      {
        property: "og:description",
        content:
          "See exact prices before we touch your phone. Mobile repair at your home or work in under 30 minutes.",
      },
    ],
  }),
});

function Index() {
  return (
    <>
      <a href="#book" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-[var(--cyan)] focus:text-[var(--primary-foreground)] focus:px-4 focus:py-2 focus:rounded-md">
        Skip to booking
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <BookingEngine />
        <TrustGrid />
      </main>
      <SiteFooter />
      <Toaster theme="light" />
    </>
  );
}
