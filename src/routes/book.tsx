// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookingEngine } from "@/components/booking/BookingEngine";
import { Toaster } from "@/components/ui/sonner";
import { Wrench, ArrowLeft, User } from "lucide-react";

export const Route = createFileRoute("/book")({
  component: BookPage,
  head: () => ({
    meta: [
      { title: "Book a Repair — Fiixerr" },
      { name: "description", content: "Book your mobile phone repair. Upfront pricing, lifetime warranty." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function BookPage() {
  const navigate = useNavigate();

  // TODO: check Supabase customer session here when auth is wired up
  // If not authenticated, redirect to /customer-login

  return (
    <div className="min-h-screen bg-background">
      <BookingPageHeader />
      <BookingEngine />
      <Toaster theme="light" />
    </div>
  );
}

function BookingPageHeader() {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        <button
          onClick={() => navigate({ to: "/" })}
          className="flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to home</span>
        </button>

        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Wrench className="h-5 w-5" />
          Fiixerr
        </div>

        {/* TODO: show customer name / logout when auth is live */}
        <button
          onClick={() => navigate({ to: "/customer-login" })}
          className="flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors min-h-[44px]"
        >
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Account</span>
        </button>
      </div>
    </header>
  );
}
