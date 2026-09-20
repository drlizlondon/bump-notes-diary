import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { PublicShell } from "@/components/bumpnotes/PublicShell";

// Contact by email (hello@bumpnotes.co.uk — a real UK Microsoft 365 inbox).
// Deliberately no server-side form: this used to write to Supabase, which is
// being retired (Supabase = an extra US-based sub-processor, weaker for the
// "UK, on Azure" NHS story). A direct email to the UK inbox is more reliable
// and cleaner to assure.
export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Get in contact — BumpNotes" }] }),
  component: Contact,
});

function Contact() {
  return (
    <PublicShell>
      <section className="px-5 sm:px-8 pt-10 pb-12 max-w-[560px] mx-auto">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">
          Get in contact
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold mt-2">
          We&rsquo;d love to hear from you
        </h1>
        <p className="text-ink-soft mt-3 leading-relaxed">
          Whether you have a question, a suggestion, or want to share your story — email us
          directly. We read everything personally and reply.
        </p>

        <div className="surface-card blush-bg p-6 mt-6 text-center">
          <p className="text-sm text-ink-soft">Email us at</p>
          <a
            href="mailto:hello@bumpnotes.co.uk"
            className="mt-1 inline-block font-serif text-xl sm:text-2xl font-semibold text-primary underline underline-offset-4 break-words"
          >
            hello@bumpnotes.co.uk
          </a>
          <div className="mt-5">
            <a
              href="mailto:hello@bumpnotes.co.uk"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
            >
              <Mail className="size-4" /> Send us an email
            </a>
          </div>
        </div>

        <p className="text-ink-soft mt-6 leading-relaxed text-sm">
          Already using BumpNotes? There&rsquo;s also a small feedback button in the corner of the
          app for private feedback.
        </p>
        <p className="text-ink-soft mt-4 leading-relaxed text-sm">
          Clinicians &amp; NHS teams — see our{" "}
          <Link to="/trust" className="font-semibold text-primary underline underline-offset-2">
            trust &amp; NHS-readiness page
          </Link>
          , or ask for our evidence pack at the address above.
        </p>
      </section>
    </PublicShell>
  );
}
