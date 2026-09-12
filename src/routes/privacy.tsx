import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/bumpnotes/PublicShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — BumpNotes" }] }),
  component: Privacy,
});

function Privacy() {
  return (
    <PublicShell>
      <article className="prose-bump px-5 sm:px-8 pt-10 pb-14 max-w-[680px] mx-auto">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">Privacy</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold mt-2 mb-4">
          Your record stays yours
        </h1>

        <p className="text-ink-soft leading-relaxed">
          BumpNotes is a private pregnancy notebook. Your record is saved to your BumpNotes account
          so you can sign in from any device and pick up where you left off. Only you can read it.
        </p>
        <p className="text-ink-soft leading-relaxed mt-3">
          We don't sell your data, we don't share your pregnancy record with advertisers, and we
          don't use it to train AI. You can view, download or permanently delete everything at any
          time from Settings → Privacy &amp; Data.
        </p>
        <p className="text-ink-soft leading-relaxed mt-3">
          If you allow analytics cookies, we use Google Analytics 4 and Microsoft Clarity to
          understand basic app usage such as page views and button clicks. We do not send names,
          email addresses, pregnancy symptoms, health information, notes, free text or account
          identifiers to analytics. Analytics is optional and is not used for advertising.
        </p>
        <p className="text-ink-soft leading-relaxed mt-3">
          BumpNotes is not a medical device and does not provide medical advice, diagnosis or
          triage. If you have a concern, please contact your care team.
        </p>

        <div className="mt-8 rounded-2xl bg-blush-soft/60 border border-border p-5 space-y-2">
          <p className="text-sm font-semibold">More information</p>
          <ul className="text-sm text-ink-soft space-y-1.5">
            <li>
              <Link to="/terms" className="text-primary font-medium hover:underline">
                Terms of use
              </Link>
            </li>
            <li>
              <Link to="/contact" className="text-primary font-medium hover:underline">
                Get in contact
              </Link>
            </li>
          </ul>
        </div>
      </article>
    </PublicShell>
  );
}
