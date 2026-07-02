# Analytics setup

BumpNotes supports optional privacy-safe analytics through GA4 and Microsoft Clarity.

Add these environment variables in the deployment provider for the production site:

```text
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_CLARITY_PROJECT_ID=your-clarity-project-id
```

For Vercel, add them in Project Settings > Environment Variables, scoped to Production. Redeploy after saving.

For Netlify, add them in Site configuration > Environment variables, scoped to Production. Redeploy after saving.

For Cloudflare Pages, add them in Settings > Environment variables, under Production. Redeploy after saving.

Both variables are public `VITE_` values and are bundled into the browser build. Do not put secrets in them.

The app only loads analytics after the user allows analytics cookies. It sends only these event names:

- `page_view`
- `cta_clicked`
- `onboarding_started`
- `onboarding_completed`
- `account_created`
- `sign_in`
- `timeline_opened`
- `note_created`

Do not add names, email addresses, pregnancy symptoms, health information, notes, free text, user IDs, account IDs or other identifying values as analytics event parameters.

Private app screens are explicitly masked for Microsoft Clarity with `data-clarity-mask="True"` so rendered notes, timeline content, symptoms, profile details and other pregnancy-record content are not uploaded in recordings. Keep that masking in place for authenticated app surfaces.

Google Search Console is not configured in code. Verify Search Console manually with DNS.
