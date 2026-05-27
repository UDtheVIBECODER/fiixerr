export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface mt-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-base text-foreground/75 text-center md:text-left">
        <div>© {new Date().getFullYear()} Fiixerr Mobile Repair. All prices honored at booking time.</div>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-8 gap-y-2">
          <a href="#book" className="hover:text-[var(--cyan)] transition-colors min-h-[48px] inline-flex items-center font-medium">Book a repair</a>
          <a href="#trust" className="hover:text-[var(--cyan)] transition-colors min-h-[48px] inline-flex items-center font-medium">Warranty</a>
        </nav>
      </div>
    </footer>
  );
}
