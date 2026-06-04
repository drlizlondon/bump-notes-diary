import { createFileRoute } from "@tanstack/react-router";
import { Toaster, toast } from "sonner";
import { useState, useEffect } from "react";
import { store, useAppState } from "@/lib/bumpnotes/store";
import { AppShell, PageHeader } from "@/components/bumpnotes/AppShell";
import type { Profile } from "@/lib/bumpnotes/types";

export const Route = createFileRoute("/details")({
  head: () => ({ meta: [{ title: "Pregnancy Details · BumpNotes" }] }),
  component: DetailsPage,
});

const FIELDS: { key: keyof Profile; label: string; type?: string; placeholder?: string }[] = [
  { key: "userName", label: "Your name" },
  { key: "babyNickname", label: "Baby nickname" },
  { key: "dueDateISO", label: "Estimated due date", type: "date" },
  { key: "hospital", label: "Hospital / care location" },
  { key: "midwife", label: "Midwife" },
  { key: "consultant", label: "Consultant" },
  { key: "gp", label: "GP" },
  { key: "birthPartner", label: "Birth partner" },
  { key: "triagePhone", label: "Maternity triage number", type: "tel" },
  { key: "labourWardPhone", label: "Labour ward number", type: "tel" },
];

function DetailsPage() {
  const { profile } = useAppState();
  const [form, setForm] = useState<Profile | null>(profile);

  useEffect(() => { setForm(profile); }, [profile]);

  if (!form) {
    return (
      <AppShell>
        <PageHeader title="Pregnancy details" />
        <p className="px-5 text-sm text-ink-soft">Finish onboarding to set up your details.</p>
      </AppShell>
    );
  }

  function save() {
    if (!form) return;
    store.setProfile(form);
    toast.success("Details saved");
  }

  return (
    <>
      <Toaster position="top-center" />
      <AppShell>
        <PageHeader title="Pregnancy details" subtitle="All optional except the first three." />
        <div className="px-4 pb-8 space-y-3">
          {FIELDS.map(({ key, label, type, placeholder }) => (
            <label key={key} className="block bg-card rounded-2xl px-5 py-4 ring-1 ring-black/5">
              <span className="text-[10px] uppercase tracking-widest text-ink-soft font-semibold">{label}</span>
              <input
                type={type ?? "text"}
                value={(form[key] as string | undefined) ?? ""}
                placeholder={placeholder}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="mt-1 w-full bg-transparent text-base focus:outline-none"
              />
            </label>
          ))}
          <button onClick={save} className="w-full py-4 rounded-full bg-primary text-primary-foreground font-semibold">
            Save details
          </button>
        </div>
      </AppShell>
    </>
  );
}
