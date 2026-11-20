# Contributing

Thanks for helping build a better notebook for speech-language pathologists. This repository is the notebook at [notebook.tiniglabs.digital](https://notebook.tiniglabs.digital). The lab's website, the speech corpus and its other tools live in their own repositories under [github.com/tinig-labs](https://github.com/tinig-labs).

tinig labs is run by one developer, so replies can take a few days.

## Ways to help

- **Use it in your practice.** The notebook is in closed beta for SLPs. Request access on [the home page](https://notebook.tiniglabs.digital/#request), and tell us what gets in the way of your sessions.
- **Improve the code**, as described below.

## What's welcome

- Bug fixes, broken links and typos
- Accessibility fixes: keyboard use, screen readers, contrast and reduced motion
- Corrections to the IPA engine: segmentation, the SODA classification and the process suggestions
- Corrections to the Tagalog spelling-to-IPA rules
- Better recording and offline behaviour on more browsers and devices
- Performance, cost and security improvements

For a new page, a new feature or a change to the visual design, open an issue first so we can agree on it before you spend time on it.

A change to how errors are classified or scored (PCC, PER, FER) should cite a clinical source or come with a review from an SLP. SLPs compare these numbers over months, so a change also affects how earlier sessions read.

## Reporting a bug

Open an issue with:

- the page URL
- what you expected and what happened
- your browser and device, and for recording problems, your microphone
- a screenshot, if it's visual

**Never include patient information** in an issue, screenshot or log: no names, recordings, IPA or notes. Use made-up examples, such as the word "saging".

## Reporting a security problem

Don't open a public issue. Report it privately through the repository's **Security** tab (**Report a vulnerability**), or email privacy@tiniglabs.digital. Include the steps to reproduce it and what an attacker could do.

The notebook holds health information, so we treat any report that could expose patient data as urgent. The response steps are in [DEVELOPMENT.md](DEVELOPMENT.md#security-procedures-data-privacy-act-npc-circulars-16-01-and-16-03).

For your own data, or a patient's, write to privacy@tiniglabs.digital. The [Privacy notice](https://notebook.tiniglabs.digital/privacy) explains what can be exported and deleted.

## Making a change

1. Fork the repository and create a branch from `main`.
2. Set up the project with the steps in [DEVELOPMENT.md](DEVELOPMENT.md). Use your own Neon database and your own `NOTEBOOK_KEK`, never production's.
3. Make your change. Keep each pull request to one change.
4. Run the checks:

   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

5. Open a pull request that says what changed and why. For visual changes, add screenshots at phone and desktop widths, using test data only.

Merges to `main` deploy to production straight away, so `main` must always be releasable.

### Checklist

- [ ] Lint, typecheck, tests and build pass
- [ ] Interactive elements work with a keyboard and show a focus state
- [ ] Layout works at 375px wide without horizontal scrolling
- [ ] Copy follows the style below
- [ ] Patient content is encrypted before it leaves the device, and is never logged, audited or emailed
- [ ] App pages stay static client shells, so they keep working offline
- [ ] A schema change comes with its SQL migration in `drizzle/` (`npm run db:generate`)
- [ ] New secrets are added to `.env.example`, `.dev.vars.example` and `wrangler.jsonc` with placeholder values, never real ones
- [ ] If the change affects what the notebook collects or where data goes, `src/app/(public)/privacy/page.tsx` and `src/app/(public)/terms/page.tsx` are updated too

## Writing style

- Sentence case for headings and buttons
- "tinig labs" is always lowercase and rendered with the `Brand` component
- Short, plain sentences. Buttons say what they do, and errors say how to fix the problem.
- Prefer an icon next to a label over an extra sentence
- Don't promise release dates or features that aren't built

## Licensing of contributions

By contributing, you agree that your contribution is licensed under the same terms as the part of the project it changes:

- the web app (everything outside `modal/`): [FSL-1.1-ALv2](LICENSE.md)
- `modal/` and other model or data-processing code: [AGPL-3.0-or-later](modal/LICENSE)

Sign off your commits to certify the [Developer Certificate of Origin](https://developercertificate.org/), which says you wrote the change or have the right to submit it:

```bash
git commit -s -m "Describe the change"
```
