import { createFileRoute } from "@tanstack/react-router";
import { Toaster, toast } from "sonner";
import { useState, useEffect } from "react";
import { store, useAppState } from "@/lib/bumpnotes/store";
import { AppShell, PageHeader } from "@/components/bumpnotes/AppShell";
import { useT } from "@/lib/bumpnotes/i18n";
import type { Profile } from "@/lib/bumpnotes/types";

export const Route = createFileRoute("/details")({
  head: () => ({ meta: [{ title: "Pregnancy Details · BumpNotes" }] }),
  component: DetailsPage,
});

const FIELDS: { key: keyof Profile; tKey: string; type?: string; placeholder?: string }[] = [
  { key: "userName", tKey: "det.userName" },
  { key: "babyNickname", tKey: "det.babyNickname" },
  { key: "dueDateISO", tKey: "det.dueDate", type: "date" },
  { key: "hospital", tKey: "det.hospital" },
  { key: "midwife", tKey: "det.midwife" },
  { key: "consultant", tKey: "det.consultant" },
  { key: "gp", tKey: "det.gp" },
  { key: "birthPartner", tKey: "det.birthPartner" },
  { key: "triagePhone", tKey: "det.triagePhone", type: "tel" },
  { key: "labourWardPhone", tKey: "det.labourWardPhone", type: "tel" },
];

function DetailsPage() {
  const { profile } = useAppState();
  const [form, setForm] = useState<Profile | null>(profile);
  const t = useT();

  useEffect(() => { setForm(profile); }, [profile]);

  if (!form) {
    return (
      <AppShell>
        <PageHeader title={t("det.title")} />
        <p className="px-5 text-sm text-ink-soft">Finish onboarding to set up your details.</p>
      </AppShell>
    );
  }

  function save() {
    if (!form) return;
    store.setProfile(form);
    toast.success(t("det.saved"));
  }

  return (
    <>
      <Toaster position="top-center" />
      <AppShell>
        <PageHeader title={t("det.title")} subtitle={t("det.subtitle")} />
        <div className="px-4 pb-8 space-y-3">
          {FIELDS.map(({ key, tKey, type, placeholder }) => (
            <label key={key} className="block bg-card rounded-2xl px-5 py-4 ring-1 ring-black/5">
              <span className="text-[10px] uppercase tracking-widest text-ink-soft font-semibold">{t(tKey)}</span>
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
            {t("det.save")}
          </button>
        </div>
      </AppShell>
    </>
  );
}
