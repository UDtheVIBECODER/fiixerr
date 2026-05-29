import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { Wrench } from "lucide-react";

export const Route = createFileRoute("/access")({
  component: AccessPage,
  head: () => ({ meta: [{ title: "Sign in — Fiixerr" }] }),
});

function AccessPage() {
  async function signInGoogle() {
    await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-foreground mb-2">
            <Wrench className="h-6 w-6" />
            <span className="text-xl font-semibold">Fiixerr</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
          <p className="text-muted-foreground mt-2">Choose how you'd like to access the dashboard.</p>
        </div>

        <div className="space-y-4 border border-border rounded-lg p-6 bg-card">
          <h2 className="font-semibold">Owner</h2>
          <p className="text-sm text-muted-foreground">Sign in with your Google account.</p>
          <Button size="touch" className="w-full" onClick={signInGoogle}>
            Continue with Google
          </Button>
        </div>

        <div className="space-y-4 border border-border rounded-lg p-6 bg-card">
          <h2 className="font-semibold">Staff (Admin / Employee)</h2>
          <p className="text-sm text-muted-foreground">Use the username and password your owner gave you.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild size="touch" variant="outline" className="flex-1">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="touch" variant="outline" className="flex-1">
              <Link to="/register">Register with code</Link>
            </Button>
          </div>
        </div>

        <div className="text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}
