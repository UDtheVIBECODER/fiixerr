export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 py-8 sm:py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground text-center md:text-left">
        <div>© {new Date().getFullYear()} Fiixerr Mobile Repair. All prices honored at booking time.</div>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <a href="#book" className="hover:text-foreground transition-colors min-h-[44px] inline-flex items-center">Book a repair</a>
          <a href="#trust" className="hover:text-foreground transition-colors min-h-[44px] inline-flex items-center">Warranty</a>
        </nav>
      </div>
    </footer>
  );
}
