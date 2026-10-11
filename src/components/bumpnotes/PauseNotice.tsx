import { Link } from "@tanstack/react-router";
import { PAUSE_MESSAGE } from "@/lib/service-pause";

/** The one honest line shown wherever the paused backend would otherwise fail. */
export function PauseNotice({ showDemoLink = true }: { showDemoLink?: boolean }) {
  return (
    <div
      role="status"
      className="mx-auto my-8 max-w-md rounded-2xl border border-border bg-white p-6 text-center shadow-sm"
    >
      <p className="text-[15px] leading-relaxed text-foreground">{PAUSE_MESSAGE}</p>
      {showDemoLink && (
        <Link
          to="/demo"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-medium"
        >
          Try the demo
        </Link>
      )}
    </div>
  );
}
