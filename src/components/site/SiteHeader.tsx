// @ts-nocheck
import { Button } from "@/components/ui/button";
import logoUrl from "@/assets/fiixerr-logo.png";

export function SiteHeader() {
  const scrollToBooking = () => {
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-20 flex items-center justify-between gap-3">
        <a href="#top" className="flex items-center min-h-[48px]" aria-label="Fiixerr — go to top">
          <img
            src={logoUrl}
            alt="Fiixerr"
            width={160}
            height={48}
            className="h-10 sm:h-12 w-auto"
          />
        </a>
        <nav aria-label="Primary" className="hidden md:flex items-center gap-8 text-base font-medium text-foreground">
          <a href="#pricing" className="hover:text-[var(--cyan)] transition-colors min-h-[48px] flex items-center">Pricing</a>
          <a href="#trust" className="hover:text-[var(--cyan)] transition-colors min-h-[48px] flex items-center">Warranty</a>
          <a href="#book" className="hover:text-[var(--cyan)] transition-colors min-h-[48px] flex items-center">How it works</a>
        </nav>
        <Button variant="cyan" size="touch" onClick={scrollToBooking} aria-label="Get a repair quote">
          Get a quote
        </Button>
      </div>
    </header>
  );
}
