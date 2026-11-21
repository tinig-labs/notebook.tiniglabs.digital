# Development

## Local

```bash
npm install
cp .dev.vars.example .dev.vars   # and .env for drizzle-kit
npm run dev                       # http://localhost:3000
npm run preview                   # full Workers build + service worker, via wrangler
```

`NOTEBOOK_KEK`: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
Use a different KEK for dev and production. **Losing the production KEK makes all data unreadable**:
store a copy in the password manager / offline, never in the repo.

## First-time infrastructure

1. **Neon**: project in `aws-ap-southeast-1` (Singapore). Enable Neon Auth with **email OTP**, turn off
   email + password sign-up, set the `send.otp` webhook to `https://notebook.tiniglabs.digital/api/neon-auth-webhook`,
   and add `notebook.tiniglabs.digital` as a trusted domain. Then `npm run db:migrate`.
   **Also set the email provider to Custom SMTP** (Azure: `smtp.azurecomm.net:587`, user `collect-smtp`,
   sender `no-reply@tiniglabs.digital`). Neon calls the `send.otp` webhook only for addresses with no
   account yet; returning users get Neon's own email, which without SMTP comes from a shared sender that
   doesn't reliably arrive. Configure the webhook only after the domain resolves (Neon pins its IPs).
2. **R2**: buckets `tinig-notebook-audio` (private, no public domain, location hint APAC) and
   `tinig-notebook-cache`. Audio goes through the Worker binding, so no S3 keys or CORS are needed.
3. **Modal**: `modal secret create tinig-notebook-phonemes PHONEMES_TOKEN=<random>` then
   `npm run deploy:modal`. Put the URL and token in `MODAL_ENDPOINT_URL` / `MODAL_TOKEN`.
   After that, a merge to `main` that touches `modal/` redeploys it (`.github/workflows/deploy-modal.yml`),
   using the `MODAL_TOKEN_ID` / `MODAL_TOKEN_SECRET` repo secrets from `modal token new`.
4. **Secrets**: fill `.dev.vars` with production values, `node scripts/push-secrets.mjs`.
5. **Deploy**: push to `main` (GitHub Actions) or `npm run deploy`. The custom domain is created from `wrangler.jsonc`.
6. **Admins**: `ADMIN_EMAILS` can always sign in and see `/admin`, where beta requests are approved.

Migrations are not run by CI: run `npm run db:migrate` before the deploy that needs them.

## Staging

`https://staging.notebook.tiniglabs.digital`: Worker `tinig-notebook-staging` (`env.staging` in
`wrangler.jsonc`), R2 buckets `tinig-notebook-staging-audio` / `-cache`, and a **schema-only**
Neon branch `staging`, so it never holds production patients or users. It has its own Neon Auth,
KEK and cookie secret, and its own Modal app `tinig-notebook-phonemes-staging`, whose results go back
to staging only. Deploy a branch's `modal/` there before merging: run the **Deploy Modal** workflow on
that branch with environment `staging`, or `npm run deploy:modal:staging`. One-time setup:
`modal secret create tinig-notebook-phonemes-staging PHONEMES_TOKEN=<random>`, then put the staging
app's URL and that token in `.dev.vars.staging` as `MODAL_ENDPOINT_URL` / `MODAL_TOKEN`.

```bash
# .dev.vars.staging: the staging branch's URLs and staging-only secrets (gitignored)
DATABASE_URL_UNPOOLED=<staging direct url> npm run db:migrate   # before a deploy that needs it
node scripts/push-secrets.mjs --env staging                    # ACS / Turnstile fall back to .dev.vars
npm run deploy:staging
```

Test a migration on staging before running it on production.

## Conventions

- Colours, radii and fonts only from the tokens in `src/app/globals.css` (see [BRAND.md](BRAND.md)); components from `src/components/ui`.
- Logos only from `public/brand/` via `src/components/brand.tsx`: the Arch n for the notebook, the Echo t for tinig labs.
- Figtree for text, Montserrat only for "tinig labs" (lowercase), Noto Sans for IPA (`.ipa`).
- Short, sentence-case copy. Prefer an icon (lucide) next to a label over a sentence.
- Layouts must work at 375 px; main navigation is the bottom tab bar on phones.
- App pages are static client shells (`/app/patient?id=…`), never server-rendered with data, so the
  service worker can serve them offline.
- Never log, audit or email patient content. The server stores ciphertext and ids only.

## Security procedures (Data Privacy Act, NPC Circulars 16-01 and 16-03)

- **Access**: only the maintainer holds Cloudflare, Neon and Modal access, with 2FA. The KEK is a Worker secret.
- **Key rotation**: add `NOTEBOOK_KEK_V2`, bump `KEK_VERSION` in `src/lib/crypto/server.ts`, rewrap `user_keys`.
- **Lost device**: the user signs it out in Settings → Devices; its local copy is wiped on next connect.
  Revoking beta access (`/admin`) blocks every request at once.
- **Breach**: contain (rotate secrets, revoke sessions), assess within 24 h, notify the NPC and affected
  SLPs **within 72 hours** of discovery, record it, review. Contact: privacy@tiniglabs.digital.
- **Audit log** (`audit_log`): sign-ins per device, exports, transcriptions, deletions, access changes.
  Keep 3 years; prune older rows yearly.
- **NPC registration**: required once we process sensitive personal information of 1,000+ individuals
  (NPC Circular 2022-04). Track the patient count before leaving beta.

Have a DPO or counsel review `/privacy` and `/terms` before inviting the first users.
