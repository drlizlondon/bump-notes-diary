import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/bumpnotes/PublicShell";

export const Route = createFileRoute("/our-story")({
  head: () => ({
    meta: [
      { title: "Why BumpNotes exists — BumpNotes" },
      { name: "description", content: "BumpNotes is your own record of your pregnancy, helping you communicate clearly and confidently with your maternity team." },
      { property: "og:title", content: "Why BumpNotes exists — BumpNotes" },
      { property: "og:description", content: "Your own record of your pregnancy, helping you communicate clearly and confidently." },
    ],
  }),
  component: OurStory,
});

function OurStory() {
  return (
    <PublicShell>
      <article className="px-5 sm:px-8 pt-10 pb-14 max-w-[680px] mx-auto">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">Our Story</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold mt-2 mb-6">Why BumpNotes exists</h1>

        <div className="space-y-5 text-ink-soft leading-relaxed text-[15px]">
          <p>Pregnancy can be exciting, overwhelming and sometimes frightening.</p>
          <p>
            When you're worried, admitted to hospital or seeing different members of your maternity team, it isn't always easy to remember every conversation, every change or every question you wanted to ask.
          </p>
          <p>
            Your maternity team records your care. BumpNotes helps you record your pregnancy in your own words, on your own terms.
          </p>
          <p>
            When you need to, create a clear summary using only the information you choose to share, helping you communicate clearly and confidently with the people caring for you.
          </p>
          <p>
            We believe every woman deserves to feel prepared, informed and confident throughout her pregnancy.
          </p>
        </div>
      </article>
    </PublicShell>
  );
}
