import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const scrollToBooking = () => {
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 h-16 flex items-center justify-between gap-3">
        <a href="#top" className="flex items-center gap-2 min-h-[44px]" aria-label="Fiixerr — go to top">
          <span className="h-9 w-9 rounded-lg bg-[var(--cyan)] grid place-items-center text-[var(--primary-foreground)]" aria-hidden="true">
            <Wrench className="h-5 w-5" />
          </span>
          <span className="font-semibold tracking-tight text-lg">Fiixerr</span>
        </a>
        <nav aria-label="Primary" className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#pricing" className="hover:text-foreground transition-colors min-h-[44px] flex items-center">Pricing</a>
          <a href="#trust" className="hover:text-foreground transition-colors min-h-[44px] flex items-center">Warranty</a>
          <a href="#book" className="hover:text-foreground transition-colors min-h-[44px] flex items-center">How it works</a>
        </nav>
        <Button variant="cyan" size="touch" onClick={scrollToBooking} aria-label="Get a repair quote">
          Get a quote
        </Button>
      </div>
    </header>
  );
}
