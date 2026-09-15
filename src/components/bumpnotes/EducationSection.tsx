// Education / Safety surface (ARCH §2.1 clarified; spec EDUCATION-RED-FLAGS-SPEC).
// Renders GENERIC red-flag guidance shown identically to everyone. Imports ONLY
// the content data + UI — nothing from the entries/journal/repository layer
// (AC-1). It never reads or reacts to the woman's own record.

import { getRedFlagGuidance, type RedFlagItem } from "@/lib/bumpnotes/education-content";

export function EducationSection() {
  // No argument = the NICE/NHS default. (Tenant override would pass a tenant id;
  // still no per-USER variation — the safety case depends on that.)
  const guidance = getRedFlagGuidance();

  return (
    <div className="px-4 lg:px-0 pb-12 space-y-5">
      {/* Framing: this is general information, not personal advice. */}
      <div className="surface-card blush-bg p-5">
        <p className="text-sm text-ink leading-relaxed">{guidance.framingHeader}</p>
        <p className="mt-3 text-sm font-semibold text-ink">{guidance.emergencyNote}</p>
      </div>

      {guidance.reviewedAt === null && (
        <div className="rounded-xl border border-dashed border-border bg-white p-3">
          <p className="text-xs text-ink-soft leading-relaxed">
            Draft content — awaiting clinical review before it is published. Shown here for review
            only.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {guidance.items.map((item) => (
          <RedFlagCard key={item.title} item={item} />
        ))}
      </ul>

      <p className="text-[11px] text-ink-soft leading-relaxed border-t border-border pt-4">
        {`Source: ${guidance.source}`}
        {guidance.reviewedAt
          ? ` — reviewed ${new Date(guidance.reviewedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}.`
          : " — review date pending."}{" "}
        This information is general and is not a substitute for advice from your maternity team.
      </p>
    </div>
  );
}

function RedFlagCard({ item }: { item: RedFlagItem }) {
  return (
    <li className="surface-card p-4">
      <p className="font-semibold text-ink break-words">{item.title}</p>
      <p className="text-sm text-ink-soft mt-1 break-words">{item.signOf}</p>
      <p className="mt-2 text-sm text-ink break-words">
        <span className="text-[10px] font-mono uppercase tracking-widest text-primary">
          What to do
        </span>
        <br />
        {item.action}
      </p>
    </li>
  );
}
