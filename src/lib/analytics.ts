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

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    clarity?: Clarity;
  }
}

const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;
const CLARITY_ID = import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined;
const CONSENT_KEY = "bumpnotes.analyticsConsent.v1";
const CONSENT_EVENT = "bumpnotes:analytics-consent";

let initialized = false;

function browserReady() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function hasProjectId(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function safePath(pathname?: string) {
  if (!browserReady()) return "/";
  return pathname && pathname.startsWith("/") ? pathname : window.location.pathname || "/";
}

function safeLocation(pathname?: string) {
  if (!browserReady()) return "";
  return `${window.location.origin}${safePath(pathname)}`;
}

function injectScript(id: string, src: string) {
  if (!browserReady() || document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function initGa4() {
  const measurementId = GA4_ID?.trim();
  if (!hasProjectId(measurementId)) return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    function gtag(...args) {
      window.dataLayer?.push(args);
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
}

function initClarity() {
  const projectId = CLARITY_ID?.trim();
  if (!hasProjectId(projectId) || window.clarity) return;
  const clarity = ((...args: Parameters<Clarity>) => {
    clarity.q.push(args);
  }) as QueuedClarity;
  clarity.q = [];
  window.clarity = clarity;
  window.clarity("consent", true);
  const script = document.createElement("script");
  script.id = "bumpnotes-clarity";
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
  document.head.appendChild(script);
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
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { analytics } }));
  if (analytics) initAnalytics();
  window.clarity?.("consent", analytics);
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
  if (!browserReady() || initialized || !hasAnalyticsConsent()) return;
  initialized = true;
  initGa4();
  initClarity();
}

export function trackEvent(eventName: AnalyticsEvent) {
  if (!browserReady() || !hasAnalyticsConsent()) return;
  initAnalytics();
  window.gtag?.("event", eventName, {
    transport_type: "beacon",
  });
  if (eventName !== "page_view") window.clarity?.("event", eventName);
}

export function trackPageView(pathname?: string) {
  if (!browserReady() || !hasAnalyticsConsent()) return;
  initAnalytics();
  window.gtag?.("event", "page_view", {
    page_location: safeLocation(pathname),
    page_path: safePath(pathname),
    transport_type: "beacon",
  });
  window.clarity?.("event", "page_view");
}
