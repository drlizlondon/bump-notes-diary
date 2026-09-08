# BumpNotes → Azure App Service — one-time deploy setup (AZURE 2.5)

Turns the deploy into a checklist. The workflow (`.github/workflows/azure-deploy.yml`) is manual-only and cannot interfere with Cloudflare production (`main`). These steps are **founder-gated** (they touch live Azure + GitHub settings + a secret) — do them with the coordinator guiding; nothing here is auto-run.

Prereqs already in place (from 2.1): App Service `bumpnotes-api` (UK West, B1, Node 24) with system-assigned managed identity granted **Key Vault Secrets User** on `bumpnotes-kv` and **Storage Blob Data Contributor** on `bumpnotesproduks`.

## Step 1 — Deploy identity + GitHub OIDC trust (no secrets)
1. In **Default Directory** (workforce tenant `9bbda104-…`) → **App registrations → New registration**: name `bumpnotes-deploy`, single tenant, no redirect URI. Note its **client id**.
2. On `bumpnotes-deploy` → **Certificates & secrets → Federated credentials → Add** → scenario *"GitHub Actions deploying Azure resources"*:
   - Organization `drlizlondon`, Repository `bump-notes-diary`
   - Entity type **Environment**, environment name **`azure-app-service`** (matches the workflow's `environment:`)
   - (Add a second federated credential for **Branch = `staging`** if you want to dispatch without the environment gate.)
3. Give it deploy rights, least-privilege: App Service `bumpnotes-api` → **Access control (IAM) → Add role assignment → Website Contributor →** assign to `bumpnotes-deploy`. (Website Contributor, not Contributor — it can deploy to this one app, nothing else.)

## Step 2 — GitHub repo variables (non-secret)
Repo → **Settings → Secrets and variables → Actions → Variables → New repository variable** (Variables, not Secrets — these are public identifiers):
- `AZURE_DEPLOY_CLIENT_ID` = client id from Step 1
- `AZURE_TENANT_ID` = `9bbda104-86c1-4e6d-b72b-4739fa5a81fe`
- `AZURE_SUBSCRIPTION_ID` = `5358e296-e900-4806-8180-2e6676f19178`
Optionally add an **Environment** `azure-app-service` (Settings → Environments) with a required-reviewer protection rule → gives you a manual approval gate before every deploy.

## Step 3 — App Service runtime config (`bumpnotes-api` → Settings → Environment variables)
**Application settings** (the app reads these via `process.env`):
- `AZURE_ENTRA_ISSUER` = `https://23f549b5-2003-4406-9b16-fb823bcee3a8.ciamlogin.com/23f549b5-2003-4406-9b16-fb823bcee3a8/v2.0`
- `AZURE_ENTRA_JWKS_URI` = `https://bumpnotes.ciamlogin.com/23f549b5-2003-4406-9b16-fb823bcee3a8/discovery/v2.0/keys`
- `AZURE_ENTRA_AUDIENCE` = `4b749876-187e-4305-b6bb-001461d6ddca`
- `AZURE_STORAGE_ACCOUNT` = `bumpnotesproduks`
- `APPLICATIONINSIGHTS_CONNECTION_STRING` = (copy from `bumpnotes-insight` → Overview → Connection String)
- `SCM_DO_BUILD_DURING_DEPLOYMENT` = `false` (we deploy the pre-built `.output`; do not let Oryx rebuild)
- `WEBSITE_RUN_FROM_PACKAGE` = `0` (webapps-deploy pushes files; keep run-from-package off unless we switch to it later)
- **`AZURE_PG_URL`** — do **NOT** paste the connection string here. Store it in Key Vault (Step 4) and set this value to a **Key Vault reference** so the password never sits in App Service config.

**General settings → Startup Command:** `node server/index.mjs`

## Step 4 — PG connection string via Key Vault (compliant interim, AZURE §6)
1. `bumpnotes-kv` → **Objects → Secrets → Generate/Import** → name e.g. `AzurePgUrl`, value = the full connection string **you** paste (`postgres://drlizlondon:<password>@bumpnotes.postgres.database.azure.com:5432/bumpnotes?sslmode=require`). The password stays yours; it never enters chat or the repo.
2. Copy the secret's **URI**.
3. Back in App Service application settings, set `AZURE_PG_URL` = `@Microsoft.KeyVault(SecretUri=<that-uri>)`. The App Service managed identity (already **Key Vault Secrets User**) resolves it at runtime — no key, no plaintext in config.

## Step 5 — Let App Service (UK West) reach PG (UK South)
On the PostgreSQL server `bumpnotes` → **Networking**: either add the App Service outbound IPs to the firewall (App Service → Networking → outbound addresses), **or** toggle **"Allow public access from any Azure service within Azure to this server"** as an interim (tighten to Private Endpoint pre-launch, AZURE §1.5). Note: this widens PG exposure — prefer the specific outbound-IP allow-list; either way it's your gated call.

## Step 6 — First deploy
GitHub → **Actions → "Deploy to Azure App Service (manual)" → Run workflow** → pick the branch (`staging`) → type `deploy` to confirm. The workflow builds, deploys `.output`, and smoke-tests `/api/health` over the internet. Green = the app is live on App Service.

## After the first green deploy (rest of 2.5, then 2.7)
- Wire the **App Insights SDK** in code (PII-safe: no entry content in telemetry — AZURE 3.13) using `APPLICATIONINSIGHTS_CONNECTION_STRING`.
- **2.7:** swap the blob helper's account-key SAS for `@azure/identity` `DefaultAzureCredential` + user-delegation SAS (now verifiable against the live managed identity).
- Confirm the Entra access-token `aud` form against a real token (I.1) and adjust `AZURE_ENTRA_AUDIENCE` if it comes through as `api://…`.
