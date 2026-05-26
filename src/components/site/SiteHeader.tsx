import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const scrollToBooking = () => {
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border">
      <div className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-[var(--cyan)] grid place-items-center text-[var(--primary-foreground)]">
            <Wrench className="h-5 w-5" />
          </div>
          <span className="font-semibold tracking-tight text-lg">FixHub</span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          <a href="#trust" className="hover:text-foreground transition-colors">Warranty</a>
          <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
        </nav>
        <Button variant="cyan" size="touch" onClick={scrollToBooking}>
          Get a quote
        </Button>
      </div>
    </header>
  );
}
