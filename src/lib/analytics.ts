export type AnalyticsEvent =
  | "page_view"
  | "cta_clicked"
  | "onboarding_started"
  | "onboarding_completed"
  | "account_created"
  | "sign_in"
  | "timeline_opened"
  | "note_created";

type GtagCommand = "js" | "config" | "event" | "consent";
type Gtag = (command: GtagCommand, target: string | Date, params?: Record<string, unknown>) => void;
type Clarity = (command: "event" | "consent", value?: string | boolean) => void;
type QueuedClarity = Clarity & { q: unknown[][] };
type PublicEnv = {
  VITE_GA4_MEASUREMENT_ID?: string;
  VITE_CLARITY_PROJECT_ID?: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    clarity?: Clarity;
  }
}

const CONSENT_KEY = "bumpnotes.analyticsConsent.v1";
const CONSENT_EVENT = "bumpnotes:analytics-consent";
const DEFAULT_GA4_MEASUREMENT_ID = "G-JX1L89C791";

let initialized = false;

function browserReady() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function publicEnv(): PublicEnv {
  return ((import.meta as ImportMeta & { env?: PublicEnv }).env ?? {}) as PublicEnv;
}

function safeTrim(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function ga4MeasurementId() {
  const measurementId = safeTrim(publicEnv().VITE_GA4_MEASUREMENT_ID) || DEFAULT_GA4_MEASUREMENT_ID;
  return /^G-[A-Z0-9-]+$/i.test(measurementId) ? measurementId : "";
}

function clarityProjectId() {
  const projectId = safeTrim(publicEnv().VITE_CLARITY_PROJECT_ID);
  return /^[a-z0-9]+$/i.test(projectId) ? projectId : "";
}

// Microsoft Clarity (session replay) may load ONLY on these public, pre-personal-
// data routes — never on any authenticated/health/credential surface (founder
// ruling, DECISIONS-LOG 2026-09-12: "Clarity on public/pre-data surfaces ONLY,
// never women's private use"). This allow-list is the boundary; the
// `data-clarity-mask` attribute is defence-in-depth only, NOT the control.
// "When in doubt, exclude." NOTE (post-Azure-cutover): `/` (index) is the AUTHED
// home, and `/onboarding` collects the EDD, so both are excluded; the public
// landing is `/welcome`. GA4 (no replay, consent-gated) is unaffected and stays
// app-wide.
const CLARITY_ALLOWED_ROUTES: readonly string[] = [
  "/welcome",
  "/features",
  "/our-story",
  "/privacy",
  "/terms",
  "/contact",
];

/**
 * True only on the public, pre-personal-data routes where Clarity is permitted.
 * Pure + SSR/test-safe: reads the given pathname (falls back to the current URL
 * in a browser). This predicate is the guardrail — a route not listed here can
 * never load Clarity.
 */
export function isClarityAllowedRoute(pathname?: string): boolean {
  let path = pathname;
  if (!path && browserReady()) path = window.location.pathname;
  path = (path || "/").replace(/\/+$/, "") || "/";
  return CLARITY_ALLOWED_ROUTES.includes(path);
}

function safePath(pathname?: string) {
  if (!browserReady()) return "/";
  return pathname && pathname.startsWith("/") ? pathname : window.location.pathname || "/";
}

function injectScript(id: string, src: string) {
  try {
    if (!browserReady() || document.getElementById(id) || !document.head) return;
    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  } catch {
    /* Analytics must never stop the app from loading. */
  }
}

function initGa4() {
  try {
    const measurementId = ga4MeasurementId();
    if (!measurementId) return;
    window.dataLayer = window.dataLayer ?? [];
    window.gtag =
      window.gtag ??
      function gtag() {
        // Google's loader expects the standard gtag arguments object, not a rest array.
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer?.push(arguments);
      };
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      anonymize_ip: true,
      send_page_view: false,
    });
    injectScript(
      "bumpnotes-ga4",
      `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`,
    );
  } catch {
    /* Analytics must never stop the app from loading. */
  }
}

function initClarity() {
  try {
    // Structural boundary: never initialise off the public allow-list, even with
    // consent (DECISIONS-LOG 2026-09-12). Route-gated + self-guarded, so it is
    // safe to call on every page view — it starts Clarity only once the user is
    // on a permitted route.
    if (!isClarityAllowedRoute()) return;
    const projectId = clarityProjectId();
    if (!projectId || window.clarity) return;
    const clarity = ((...args: Parameters<Clarity>) => {
      clarity.q.push(args);
    }) as QueuedClarity;
    clarity.q = [];
    window.clarity = clarity;
    window.clarity("consent", true);
    injectScript(
      "bumpnotes-clarity",
      `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`,
    );
  } catch {
    /* Analytics must never stop the app from loading. */
  }
}

export function hasAnalyticsConsent() {
  if (!browserReady()) return false;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    return (JSON.parse(raw) as { analytics?: boolean }).analytics === true;
  } catch {
    return false;
  }
}

export function setAnalyticsConsent(analytics: boolean) {
  if (!browserReady()) return;
  try {
    window.localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ analytics, at: new Date().toISOString() }),
    );
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { analytics } }));
    if (analytics) initAnalytics();
    window.clarity?.("consent", analytics);
  } catch {
    /* Analytics must never stop the app from loading. */
  }
}

export function onAnalyticsConsentChange(callback: (analytics: boolean) => void) {
  if (!browserReady()) return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ analytics?: boolean }>).detail;
    callback(detail?.analytics === true);
  };
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}

export function initAnalytics() {
  if (!browserReady() || !hasAnalyticsConsent()) return;
  try {
    // GA4 is app-wide (no session replay), so it initialises once.
    if (!initialized) {
      initialized = true;
      initGa4();
    }
    // Clarity is route-gated: attempt on every call (e.g. per page view) so it
    // starts only when — and if — the user is on an allow-listed public route,
    // never blocked by GA4's one-shot flag. initClarity self-guards.
    initClarity();
  } catch {
    /* Analytics must never stop the app from loading. */
  }
}

export function trackEvent(eventName: AnalyticsEvent) {
  if (!browserReady() || !hasAnalyticsConsent()) return;
  try {
    initAnalytics();
    window.gtag?.("event", eventName, {
      send_to: ga4MeasurementId(),
      transport_type: "beacon",
    });
    if (eventName !== "page_view" && isClarityAllowedRoute()) window.clarity?.("event", eventName);
  } catch {
    /* Analytics must never stop the app from loading. */
  }
}

export function trackPageView(pathname?: string) {
  if (!browserReady() || !hasAnalyticsConsent()) return;
  try {
    initAnalytics();
    const path = safePath(pathname);
    window.gtag?.("event", "page_view", {
      send_to: ga4MeasurementId(),
      page_location: window.location.href,
      page_path: path,
    });
    if (isClarityAllowedRoute(path)) window.clarity?.("event", "page_view");
  } catch {
    /* Analytics must never stop the app from loading. */
  }
}
