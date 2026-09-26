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
  // nitro's node-server preset (AZURE plan task 2.5).
  //
  // FIX 2026-09-26 (Cloudflare Pages build failures, 25 consecutive prod/preview
  // deploys since commit 8fccfff on 2026-07-18): the original comment here claimed
  // this override "is forced back to cloudflare inside a Lovable build" and so
  // "only takes effect in a real deploy build (e.g. Azure CI)". That was wrong —
  // the @lovable.dev/vite-tanstack-config plugin only defaults to the
  // `cloudflare-module` preset (output dir `dist`, which Cloudflare Pages'
  // project settings require) when NO `nitro.preset` is supplied at all. Setting
  // `preset: "node-server"` unconditionally means EVERY real CI build — Cloudflare
  // Pages included, not just Azure — got the node-server layout
  // (`.output/server` + `.output/public`), so Pages always failed with
  // "Output directory 'dist' not found." Confirmed via the actual Cloudflare
  // build log (`built in 19.31s` / `Generated .output/nitro.json` immediately
  // followed by `Error: Output directory "dist" not found.`).
  //
  // Gate the override behind an env var the Azure workflow sets explicitly
  // (.github/workflows/azure-deploy.yml), so Cloudflare Pages' own `npm run
  // build` — which sets no such var — falls through to the plugin's default
  // `cloudflare-module` preset and produces `dist` again.
  nitro: process.env.AZURE_BUILD === "true" ? { preset: "node-server" } : undefined,
});
