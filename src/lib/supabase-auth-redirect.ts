export function buildAuthCallbackUrl(next = "/") {
  if (typeof window === "undefined") return undefined;
  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", next.startsWith("/") ? next : "/");
  return url.toString();
}
