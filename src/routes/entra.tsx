// Entra sign-in diagnostic (AZURE Phase I.1) — a hidden verification surface,
// NOT part of the product. Proves the pure-UK path: sign in with Entra (popup)
// -> useProfile() round-trips Entra-token -> Azure API -> Postgres. Only usable
// when VITE_ENTRA_AUTH is on; otherwise it says so. Additive route; touches no
// existing screen.

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ENTRA_ENABLED } from "@/lib/azure/entra-config";
import { getEntraAccount, signInEntraPopup, signOutEntra } from "@/lib/azure/entra-auth";
import { useProfile, useUpsertProfile } from "@/lib/data/hooks";

export const Route = createFileRoute("/entra")({
  head: () => ({ meta: [{ title: "Entra sign-in (diagnostic)" }] }),
  component: EntraDiagnostic,
});

function EntraDiagnostic() {
  const [account, setAccount] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");

  const profile = useProfile();
  const upsert = useUpsertProfile();

  useEffect(() => {
    let active = true;
    void getEntraAccount().then((a) => {
      if (active) {
        setAccount(a?.username ?? null);
        setChecked(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSignIn() {
    setErr(null);
    setBusy(true);
    try {
      const ok = await signInEntraPopup();
      const a = await getEntraAccount();
      setAccount(a?.username ?? null);
      if (ok) await profile.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    setErr(null);
    try {
      await upsert.mutateAsync({ displayName: displayName || null });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  const box: React.CSSProperties = {
    maxWidth: 560,
    margin: "48px auto",
    padding: 24,
    fontFamily: "system-ui, sans-serif",
    lineHeight: 1.5,
  };

  if (!ENTRA_ENABLED) {
    return (
      <div style={box}>
        <h1>Entra diagnostic</h1>
        <p>Entra sign-in is not enabled in this build (`VITE_ENTRA_AUTH` is off).</p>
      </div>
    );
  }

  return (
    <div style={box}>
      <h1>Entra sign-in — pure-UK round-trip diagnostic</h1>
      {!checked && <p>Checking sign-in…</p>}
      {checked && !account && (
        <button onClick={handleSignIn} disabled={busy} style={{ padding: "10px 16px" }}>
          {busy ? "Opening…" : "Sign in with Entra"}
        </button>
      )}
      {account && (
        <>
          <p>
            ✅ Signed in with Entra as <strong>{account}</strong>{" "}
            <button onClick={() => void signOutEntra()} style={{ marginLeft: 8 }}>
              sign out
            </button>
          </p>
          <hr />
          <h2>Profile (via Azure API → Postgres)</h2>
          {profile.isLoading && <p>Loading profile…</p>}
          {profile.isError && (
            <p style={{ color: "crimson" }}>Load failed: {(profile.error as Error)?.message}</p>
          )}
          {profile.data !== undefined && (
            <pre style={{ background: "#f5f5f5", padding: 12, overflowX: "auto" }}>
              {JSON.stringify(profile.data, null, 2)}
            </pre>
          )}
          <div style={{ marginTop: 12 }}>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="display name"
              style={{ padding: 8, marginRight: 8 }}
            />
            <button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? "Saving…" : "Save to Azure"}
            </button>
          </div>
        </>
      )}
      {err && <p style={{ color: "crimson" }}>Error: {err}</p>}
    </div>
  );
}
