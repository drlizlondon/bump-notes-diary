import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Toaster, toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PublicShell } from "@/components/bumpnotes/PublicShell";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Get in contact — BumpNotes" }] }),
  component: Contact,
});

function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("contact_messages").insert({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      if (error) throw error;
      setSent(true);
      toast.success("Thanks — we'll be in touch.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicShell>
      <Toaster position="top-center" />
      <section className="px-5 sm:px-8 pt-10 pb-12 max-w-[560px] mx-auto">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">
          Get in contact
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold mt-2">
          We'd love to hear from you
        </h1>
        <p className="text-ink-soft mt-3 leading-relaxed">
          Whether you have a question, a suggestion or want to share your story — drop us a note.
          For private feedback inside the app there is also a small button in the corner once you're
          using BumpNotes.
        </p>

        {sent ? (
          <div className="surface-card p-5 mt-6 blush-bg">
            <p className="font-serif text-lg font-semibold">Thank you 💛</p>
            <p className="text-sm text-ink-soft mt-1">
              Your message has been received. We read everything personally.
            </p>
          </div>
        ) : (
          <form onSubmit={send} className="surface-card p-5 mt-6 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              placeholder="Your email"
              className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              placeholder="Your message"
              className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm resize-none focus:outline-none focus:border-primary/60"
            />
            <button
              disabled={busy}
              className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "Sending..." : "Send message"}
            </button>
          </form>
        )}
      </section>
    </PublicShell>
  );
}
