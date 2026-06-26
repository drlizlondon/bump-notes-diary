import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/bumpnotes/PublicShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — BumpNotes" }] }),
  component: Privacy,
});

function Privacy() {
  return (
    <PublicShell>
      <article className="prose-bump px-5 sm:px-8 pt-10 pb-14 max-w-[680px] mx-auto">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">Privacy Policy</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold mt-2 mb-4">Your record stays yours</h1>
        <p className="text-ink-soft leading-relaxed">Last updated: November 2025. This summary covers how BumpNotes handles your information during our public beta. We will continue to harden these protections as we grow.</p>

        <Section title="What you give us">
          <p>BumpNotes only stores what you choose to write — the entries, photos, questions and details you record. You can use BumpNotes without an account; in that case nothing leaves your device.</p>
        </Section>
        <Section title="Accounts and cloud sync">
          <p>If you create an account, your pregnancy record is stored privately in our database under your user ID. Only you can read it. Database access is locked down with row-level security so other users cannot see your record.</p>
        </Section>
        <Section title="What we never do">
          <p>We don't sell your data. We don't share your pregnancy record with advertisers or third parties. We don't use it to train AI models.</p>
        </Section>
        <Section title="What we collect for the service to work">
          <p>Standard server logs (IP, timestamps) and authentication metadata via Supabase, our hosting partner. If you send feedback inside the app we also store the page you were on, your browser, app version and your user/tester ID so we can investigate problems.</p>
        </Section>
        <Section title="Your rights">
          <p>You can view, download or permanently delete your data at any time from Settings → Privacy &amp; Data. Deletion removes your pregnancy record from our database. We may keep limited safety/audit logs for a short period as required by our hosting partner.</p>
        </Section>
        <Section title="Children">
          <p>BumpNotes is intended for adults. It is not designed for use by children.</p>
        </Section>
        <Section title="Not a medical device">
          <p>BumpNotes is a personal notebook. It does not provide medical advice, diagnose conditions, or triage symptoms. If you have a concern, please contact your care team.</p>
        </Section>
        <Section title="Get in touch">
          <p>For privacy questions, email us via the <a href="/contact" className="text-primary font-medium">contact page</a>.</p>
        </Section>
      </article>
    </PublicShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="font-serif text-lg font-semibold">{title}</h2>
      <div className="mt-1.5 text-sm text-ink-soft leading-relaxed">{children}</div>
    </div>
  );
}
