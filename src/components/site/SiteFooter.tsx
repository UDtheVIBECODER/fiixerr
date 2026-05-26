export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-12">
      <div className="mx-auto max-w-7xl px-5 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div>© {new Date().getFullYear()} FixHub Mobile Repair. All prices honored at booking time.</div>
        <div className="flex gap-6">
          <a href="#book" className="hover:text-foreground transition-colors">Book a repair</a>
          <a href="#trust" className="hover:text-foreground transition-colors">Warranty</a>
        </div>
      </div>
    </footer>
  );
}
