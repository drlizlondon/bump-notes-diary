import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { PublicShell } from "@/components/bumpnotes/PublicShell";

// Public "for clinicians & care teams" trust page. Clinician / ICB / investor
// audience: leads with reassurance and provenance, keeps compliance honest
// (only true claims), and headlines the tailorable RCOG/NICE education.
// Copy signed off with the founder 2026-09-16 (artifact v6). Honesty note:
// "GDPR compliant" leans on the DPIA (in progress) — confirm with the DPO
// before any further claims are added; "preparing for DTAC" is accurate today.
export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "BumpNotes for clinicians & care teams" },
      {
        name: "description",
        content:
          "BumpNotes is a private pregnancy notebook, built by people from the NHS to NHS standards. Safe, credible, with education based on RCOG and NICE guidance.",
      },
    ],
  }),
  component: Trust,
});

const RECOMMEND: string[] = [
  "It records and organises your patient's own words — clearly, in one place.",
  "Private by default — nothing is shared unless your patient chooses to.",
  "Your patient stays in control of her own data.",
  "Trusted safety information, based on RCOG and NICE guidance.",
  "Built by people from the NHS, to NHS standards.",
];

export default function Trust() {
  return (
    <PublicShell>
      <div className="max-w-[820px] mx-auto">
        {/* Hero */}
        <section className="px-5 sm:px-8 pt-10 sm:pt-14 pb-8">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">
            For clinicians &amp; care teams
          </p>
          <h1 className="mt-3 font-serif text-[32px] sm:text-4xl lg:text-[46px] font-semibold leading-[1.1] tracking-tight text-ink text-balance">
            Safe, credible, and built to NHS standards.
          </h1>
          <p className="mt-4 text-[17px] sm:text-lg text-ink-soft leading-relaxed max-w-[60ch]">
            BumpNotes is a private pregnancy notebook your patients keep in their own words — clear,
            calm and theirs. It&rsquo;s built by people who have worked in the NHS, to NHS
            standards. Safety and privacy matter to us, and it shows.
          </p>
        </section>

        {/* Confidently recommend */}
        <section className="px-5 sm:px-8 pb-8">
          <div className="surface-card p-6 sm:p-8">
            <h2 className="font-serif text-2xl font-semibold text-ink">
              Confidently recommend it to your patients
            </h2>
            <ul className="mt-5 space-y-4">
              {RECOMMEND.map((line) => (
                <li key={line} className="flex gap-3 items-start">
                  <span className="mt-0.5 shrink-0 size-6 rounded-full bg-mint-soft grid place-items-center">
                    <Check className="size-3.5 text-ink" />
                  </span>
                  <span className="text-[15.5px] text-ink leading-relaxed">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Safety & data protection */}
        <section className="px-5 sm:px-8 pb-8">
          <h2 className="font-serif text-xl font-semibold text-ink">
            Safety and data protection, built in
          </h2>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <PositiveCard title="GDPR compliant" detail="Data export & deletion built in" />
            <PositiveCard
              title="Private by default"
              detail="Nothing shared without your patient's choice"
            />
          </div>
          <p className="mt-4 text-sm text-ink-soft leading-relaxed">
            We&rsquo;re{" "}
            <strong className="text-ink font-semibold">preparing for DTAC verification</strong> —
            the NHS&rsquo;s assessment for digital health tools — and build to NHS standards
            throughout. We&rsquo;re glad to share our progress with your team.
          </p>
        </section>

        {/* Education value */}
        <section className="px-5 sm:px-8 pb-8">
          <div className="rounded-2xl bg-blush-soft p-6 sm:p-8 ring-1 ring-coral/15">
            <p className="text-xs uppercase tracking-widest text-primary font-semibold">
              Optional extras for your service
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-ink">
              Education, tailored to your patients
            </h2>
            <p className="mt-3 text-[15.5px] text-ink leading-relaxed">
              BumpNotes includes a clear, plain-language library of pregnancy conditions and warning
              signs — what they are, and when to get further help. Every item is{" "}
              <strong className="font-semibold">
                based on RCOG and NICE guidance and fully referenced
              </strong>
              , so your patients can read a little more and know what to do.
            </p>
            <p className="mt-3 text-[15.5px] text-ink leading-relaxed">
              As an optional extra, we can{" "}
              <strong className="font-semibold">tailor it to your service</strong> — your local
              pathways and triage routes, your own wording, and the conditions your patients most
              often present with — so what they read matches the care you provide.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "Based on RCOG & NICE",
                "Fully referenced",
                "Tailored to your patients",
                "Optional add-on",
              ].map((c) => (
                <span
                  key={c}
                  className="text-[12px] font-mono text-ink bg-white border border-border rounded-full px-3 py-1.5"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* IG signpost */}
        <section className="px-5 sm:px-8 pb-8">
          <div className="border-l-2 border-border pl-4">
            <h3 className="font-semibold text-ink">
              For your information-governance &amp; technical colleagues
            </h3>
            <p className="text-sm text-ink-soft mt-1 leading-relaxed">
              The detail they&rsquo;ll want — data residency, identity, encryption, sub-processors,
              audit trail and our DPIA — is documented. Ask us for the evidence pack.{" "}
              <a
                href="mailto:hello@bumpnotes.co.uk"
                className="text-primary font-semibold underline underline-offset-2"
              >
                Request it &rarr;
              </a>
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="px-5 sm:px-8 pb-16 text-center">
          <p className="text-[15.5px] text-ink max-w-[52ch] mx-auto">
            Considering BumpNotes for your service? Talk to us at{" "}
            <a
              href="mailto:hello@bumpnotes.co.uk"
              className="text-primary font-semibold underline underline-offset-2"
            >
              hello@bumpnotes.co.uk
            </a>
            .
          </p>
        </section>
      </div>
    </PublicShell>
  );
}

function PositiveCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-ink text-[15px]">{title}</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-ink bg-mint-soft rounded-full px-2.5 py-1">
          <Check className="size-3" /> Live
        </span>
      </div>
      <p className="text-xs text-ink-soft mt-1">{detail}</p>
    </div>
  );
}
