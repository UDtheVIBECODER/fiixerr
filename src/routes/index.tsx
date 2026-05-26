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
      { title: "FixHub — Honest Mobile Phone Repair at Home or Work" },
      {
        name: "description",
        content:
          "Upfront repair pricing for iPhone, Samsung, and Pixel. We come to your driveway in under 30 minutes. Lifetime parts warranty. Zero hidden fees.",
      },
      { property: "og:title", content: "FixHub — Anti-Extortion Mobile Phone Repair" },
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
    <main>
      <SiteHeader />
      <Hero />
      <BookingEngine />
      <TrustGrid />
      <SiteFooter />
      <Toaster theme="dark" />
    </main>
  );
}
