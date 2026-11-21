// Deploys the phoneme service in modal/ by hand: `node scripts/deploy-modal.mjs [production|staging]`.
// Merges to main that touch modal/ deploy production on their own (.github/workflows/deploy-modal.yml).
// A script rather than `NOTEBOOK_ENV=staging modal deploy` so it also works in PowerShell and cmd.
import { spawnSync } from "node:child_process";

const env = process.argv[2] ?? "production";
if (!["production", "staging"].includes(env)) {
  console.error(`Unknown environment "${env}". Use production or staging.`);
  process.exit(1);
}

const result = spawnSync("modal", ["deploy", "modal/notebook_phonemes.py"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, NOTEBOOK_ENV: env },
});
if (result.error) console.error(`Could not run modal (pip install modal, then modal token new): ${result.error.message}`);
process.exit(result.status ?? 1);
