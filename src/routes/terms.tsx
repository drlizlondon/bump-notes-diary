import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/bumpnotes/PublicShell";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Use — BumpNotes" }] }),
  component: Terms,
});

function Terms() {
  return (
    <PublicShell>
      <article className="px-5 sm:px-8 pt-10 pb-14 max-w-[680px] mx-auto">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">Terms of Use</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold mt-2 mb-4">Using BumpNotes</h1>
        <p className="text-ink-soft leading-relaxed">By using BumpNotes you agree to these short terms. They exist to keep BumpNotes safe and useful for everyone. We will give plenty of notice if anything material changes.</p>

        <Section title="What BumpNotes is">
          <p>BumpNotes is a private notebook to help you record your pregnancy. It is not a medical device, diagnostic tool, triage tool, or AI symptom checker. It does not replace care from your midwife, GP, obstetrician or any other clinician.</p>
        </Section>
        <Section title="When to seek medical help">
          <p>If you are worried about your pregnancy, your baby's movements, or your own health, please contact your maternity care provider or local emergency services. BumpNotes is not monitored.</p>
        </Section>
        <Section title="Your account">
          <p>You're responsible for the security of your account and the information you enter. Please keep your sign-in details safe. Don't use BumpNotes to record information about other people without their consent.</p>
        </Section>
        <Section title="Acceptable use">
          <p>Please don't use BumpNotes to harm others, abuse the service, attempt to break our security, or upload illegal content.</p>
        </Section>
        <Section title="Beta software">
          <p>BumpNotes is in public beta. Things may change, occasional issues may occur, and we may add or remove features as we improve. We do our best to protect your data but, like any service in beta, no warranty is offered.</p>
        </Section>
        <Section title="Cancellation">
          <p>You can delete your record and account at any time from Settings → Privacy &amp; Data.</p>
        </Section>
        <Section title="Contact">
          <p>For anything else, email us via the <a href="/contact" className="text-primary font-medium">contact page</a>.</p>
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
