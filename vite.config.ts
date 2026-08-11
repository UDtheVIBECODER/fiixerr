// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Use Nitro's Vercel preset so the build outputs to .vercel/output (Vercel Build Output API).
  // Output dirs are explicit because the lovable config defaults to dist/ otherwise.
  nitro: {
    preset: "vercel",
    output: {
      dir: ".vercel/output",
      serverDir: ".vercel/output/server",
      publicDir: ".vercel/output/static",
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
