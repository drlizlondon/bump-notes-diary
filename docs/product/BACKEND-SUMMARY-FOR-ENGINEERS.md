# BumpNotes backend — summary (for engineers), 9 Sep 2026

## Simple version

BumpNotes is a private pregnancy health-record app. We're rebuilding its backend
to run entirely on **Microsoft Azure in the UK**, to meet NHS data-handling
standards (UK data residency, no shared passwords/keys, access-controlled,
audit-ready).

Built and proven working live:
- **Sign-in on our own branded screen**, with Microsoft's identity system doing
  the authentication underneath — users never leave BumpNotes, and we don't store
  passwords ourselves.
- **A UK database and file storage on Azure** — a signed-in user's data is saved
  and read back (proven end to end with a real record).
- **The full data layer** for every part of the record (pregnancy, journal
  entries, people/care team, health facts, preferences, photos), plus a **demo**
  and **tester** mode that run on-device with no account.
- **Photos have hidden location (EXIF/GPS) data stripped on the device** before
  upload.

Status: identity + backend/data layer done; remaining work is switching the
existing screens onto the new backend, then flipping production over.

## Technical version

**Cloud / infra (Azure UK):**
- **App Service** (Linux, Node) running a **TanStack Start** SSR app (nitro
  node-server preset).
- **PostgreSQL Flexible Server** (UK), **Blob Storage**, **Key Vault**, **App
  Insights**.
- **System-assigned managed identity** everywhere — **no account keys/connection
  strings to clients**. Storage via `DefaultAzureCredential`; downloads via
  short-lived **user-delegation SAS**. DB credential in Key Vault, referenced by
  the app identity.
- **Deploy:** GitHub Actions with **OIDC federated credentials (no stored
  secrets)**, manual/approval-gated, least-privilege.

**Identity (Microsoft Entra External ID / CIAM):**
- **Own branded sign-in UI** on Entra **native authentication**
  (`@azure/msal-browser/custom-auth`) — credentials stay on our page, Entra is the
  engine. Sign-up, sign-in, email-OTP, and password reset implemented.
- Native auth has no CORS, so a **same-origin proxy route in our own server**
  forwards to CIAM (no separate service — the app is server-rendered). We also
  **synthesize the `client_info`** field CIAM omits so MSAL caches the session.

**API + data model:**
- **No ORM, no DB row-level security by design — authorization is enforced at the
  API layer.** Every operation is a TanStack Start **server function** behind
  middleware that validates the token (JWT signature/issuer/audience via `jose`)
  and resolves an **internal user id**; queries are **owner-scoped** to it, never
  a client-supplied id.
- **Postgres** via pooled `pg`; **zod-validated** inputs; explicit
  snake_case↔camelCase mapping. Tables: users, profiles, pregnancies, people,
  health_items, preferences, entries, attachments, summaries; append-only audit;
  soft-delete journal; DB triggers enforce summary immutability + audit
  append-only.
- **Repository pattern:** one `Repository` interface, three implementations via a
  **mode factory** — `ApiRepository` (authed, over the Azure API) and
  `LocalRepository` for **demo** (sessionStorage, seeded) / **tester**
  (localStorage). Consumed via **TanStack Query** hooks, cache-namespaced per mode.
- **Attachments:** client-side canvas **re-encode strips all EXIF/GPS**; server
  streams to Blob via managed identity; metadata row in Postgres; reads via
  short-lived SAS.

**Posture:** UK residency, managed-identity-only (no keys), Key Vault secrets,
API-level authz, append-only audit, secretless CI.

**Known temporary exception:** the DB connection string is currently plaintext in
App Service config while we resolve a Key Vault-reference caching quirk (App
Service wasn't serving the resolved secret even after restart + settings change,
with reference/RBAC/networking all correct). Moving back to the Key Vault
reference before launch.

**What's not yet built / next:** the screen cutover (moving the existing UI off
the old local-store + Supabase onto these APIs), the production hosting flip,
retiring Supabase, and a schema decision on the app's labour-tracking subsystem
(contractions/bag/episodes) which the current V2 schema doesn't yet model.
