import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Toaster, toast } from "sonner";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/bumpnotes/AppShell";
import { useT } from "@/lib/bumpnotes/i18n";
import { useTester, isTester } from "@/lib/bumpnotes/tester";
import { AppRepository } from "@/lib/data/capture";
import { useAppSession } from "@/lib/data/session";
import {
  useActivePregnancy,
  usePeople,
  useProfile,
  useUpdatePregnancy,
  useUpsertPerson,
  useUpsertProfile,
} from "@/lib/data/hooks";
import type { PersonRole } from "@/lib/domain/types";

export const Route = createFileRoute("/details")({
  head: () => ({ meta: [{ title: "Pregnancy Details · BumpNotes" }] }),
  component: DetailsRoute,
});

// D2: the profile's care contacts map to People rows, one per role.
const CONTACT_ROLES: { role: PersonRole; tKey: string }[] = [
  { role: "hospital", tKey: "det.hospital" },
  { role: "midwife", tKey: "det.midwife" },
  { role: "consultant", tKey: "det.consultant" },
  { role: "gp", tKey: "det.gp" },
  { role: "birth_partner", tKey: "det.birthPartner" },
];

function DetailsRoute() {
  const { userId } = useAppSession();
  const tester = useTester();
  const navigate = useNavigate();
  const authorized = !!userId || tester;

  useEffect(() => {
    const authed = !!userId || isTester();
    if (!authed) navigate({ to: "/welcome", replace: true });
  }, [userId, navigate]);

  if (!authorized) return null;
  return (
    <AppRepository>
      <DetailsInner />
    </AppRepository>
  );
}

function DetailsInner() {
  const t = useT();
  const { data: profile, isLoading: loadingProfile } = useProfile();
  const { data: pregnancy, isLoading: loadingPreg } = useActivePregnancy();
  const { data: people } = usePeople();
  const upsertProfile = useUpsertProfile();
  const updatePregnancy = useUpdatePregnancy();
  const upsertPerson = useUpsertPerson();

  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [edd, setEdd] = useState("");
  // contactId keeps the People row id so a save updates rather than duplicates.
  const [contacts, setContacts] = useState<Record<string, { id?: string; name: string }>>({});

  useEffect(() => {
    if (profile) setDisplayName(profile.displayName ?? "");
  }, [profile]);
  useEffect(() => {
    if (pregnancy) {
      setNickname(pregnancy.nickname ?? "");
      setEdd(pregnancy.edd ?? "");
    }
  }, [pregnancy]);
  useEffect(() => {
    if (!people) return;
    const next: Record<string, { id?: string; name: string }> = {};
    for (const { role } of CONTACT_ROLES) {
      const match = people.find((p) => p.role === role && !p.archivedAt);
      next[role] = { id: match?.id, name: match?.name ?? "" };
    }
    setContacts(next);
  }, [people]);

  if (loadingProfile || loadingPreg) {
    return (
      <AppShell>
        <PageHeader title={t("det.title")} />
        <p className="px-5 text-sm text-ink-soft">Loading…</p>
      </AppShell>
    );
  }

  if (!pregnancy) {
    return (
      <AppShell>
        <PageHeader title={t("det.title")} />
        <p className="px-5 text-sm text-ink-soft">Finish onboarding to set up your details.</p>
      </AppShell>
    );
  }

  async function save() {
    if (!pregnancy) return;
    try {
      await upsertProfile.mutateAsync({ displayName: displayName || null });
      await updatePregnancy.mutateAsync({
        id: pregnancy.id,
        edd: edd || pregnancy.edd,
        nickname: nickname ? nickname : null,
      });
      for (const { role } of CONTACT_ROLES) {
        const c = contacts[role];
        if (!c) continue;
        const trimmed = c.name.trim();
        if (!trimmed && !c.id) continue; // nothing entered, nothing to update
        if (!trimmed) continue; // leave existing rows untouched when cleared
        await upsertPerson.mutateAsync({ id: c.id, name: trimmed, role });
      }
      toast.success(t("det.saved"));
    } catch {
      toast.error("Could not save. Please try again.");
    }
  }

  return (
    <>
      <Toaster position="top-center" />
      <AppShell>
        <PageHeader title={t("det.title")} />
        <div className="px-4 pb-8 space-y-3">
          <Field label={t("det.userName")}>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full bg-transparent text-base focus:outline-none"
            />
          </Field>
          <Field label={t("det.babyNickname")}>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="mt-1 w-full bg-transparent text-base focus:outline-none"
            />
          </Field>
          <Field label={t("det.dueDate")}>
            <input
              type="date"
              value={edd.slice(0, 10)}
              onChange={(e) => setEdd(e.target.value)}
              className="mt-1 w-full bg-transparent text-base focus:outline-none"
            />
          </Field>
          {CONTACT_ROLES.map(({ role, tKey }) => (
            <Field key={role} label={t(tKey)}>
              <input
                value={contacts[role]?.name ?? ""}
                onChange={(e) =>
                  setContacts((prev) => ({
                    ...prev,
                    [role]: { id: prev[role]?.id, name: e.target.value },
                  }))
                }
                className="mt-1 w-full bg-transparent text-base focus:outline-none"
              />
            </Field>
          ))}
          <button
            onClick={() => void save()}
            className="w-full py-4 rounded-full bg-primary text-primary-foreground font-semibold"
          >
            {t("det.save")}
          </button>
        </div>
      </AppShell>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block bg-card rounded-2xl px-5 py-4 ring-1 ring-black/5">
      <span className="text-[10px] uppercase tracking-widest text-ink-soft font-semibold">
        {label}
      </span>
      {children}
    </label>
  );
}
