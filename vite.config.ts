// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // AZURE §2 DECISION: the API lives in this app, deployed to App Service via
  // nitro's node-server preset (AZURE plan task 2.5). Per the config comment
  // above, this override is forced back to cloudflare inside a Lovable build —
  // it only takes effect in a real deploy build (e.g. Azure CI), which is the
  // point: Lovable's own sandbox/preview is untouched.
  nitro: {
    preset: "node-server",
  },
});
