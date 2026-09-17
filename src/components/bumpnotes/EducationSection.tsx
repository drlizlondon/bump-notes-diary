// Education / Safety surface (ARCH §2.1 clarified; spec EDUCATION-RED-FLAGS-SPEC).
// Renders GENERIC red-flag guidance shown identically to everyone. A list of
// conditions you can open to read a little more, each with its own source
// (RCOG / NICE / NHS). Imports ONLY the content data + UI — nothing from the
// entries/journal/repository layer (AC-1). It never reads the woman's record.

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { getRedFlagGuidance, type RedFlagItem } from "@/lib/bumpnotes/education-content";

export function EducationSection() {
  // No argument = the NICE/NHS/RCOG default. (A tenant override would pass a
  // tenant id; still no per-USER variation — the safety case depends on that.)
  const guidance = getRedFlagGuidance();
  const [openTitle, setOpenTitle] = useState<string | null>(null);

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

      <p className="text-sm text-ink-soft px-1">Tap a topic to read a little more.</p>

      <ul className="space-y-2.5">
        {guidance.items.map((item) => (
          <RedFlagRow
            key={item.title}
            item={item}
            open={openTitle === item.title}
            onToggle={() => setOpenTitle((t) => (t === item.title ? null : item.title))}
          />
        ))}
      </ul>

      <p className="text-[11px] text-ink-soft leading-relaxed border-t border-border pt-4">
        General information based on NICE, NHS and RCOG guidance. It is general, and not a
        substitute for advice from your own maternity team.
      </p>
    </div>
  );
}

function RedFlagRow({
  item,
  open,
  onToggle,
}: {
  item: RedFlagItem;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = `rf-${item.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  return (
    <li className="surface-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full text-left p-4 flex items-start justify-between gap-3"
      >
        <span className="min-w-0">
          <span className="block font-semibold text-ink break-words">{item.title}</span>
          <span className="block text-sm text-ink-soft mt-1 break-words">{item.signOf}</span>
        </span>
        <ChevronDown
          className={`size-5 text-ink-soft shrink-0 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div id={panelId} className="px-4 pb-4 space-y-3">
          {item.detail && (
            <p className="text-sm text-ink leading-relaxed break-words">{item.detail}</p>
          )}
          {item.stat && (
            <p className="text-sm text-ink-soft leading-relaxed break-words border-l-2 border-coral/40 pl-3">
              {item.stat}
            </p>
          )}
          <div className="rounded-xl bg-blush-soft/60 p-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">
              What to do
            </p>
            <p className="text-sm text-ink mt-1 break-words">{item.action}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            {item.source && (
              <p className="text-[11px] font-mono uppercase tracking-wider text-ink-soft">
                Source: {item.source}
              </p>
            )}
            {item.readMoreUrl && (
              <a
                href={item.readMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary underline underline-offset-2"
              >
                {item.readMoreLabel ?? "Read more"} <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
