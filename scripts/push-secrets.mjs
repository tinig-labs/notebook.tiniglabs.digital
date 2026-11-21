// Pushes the Worker secrets that live in .dev.vars to Cloudflare in one call, without printing them.
// Empty values are skipped.
//   node scripts/push-secrets.mjs                 production, from .dev.vars
//   node scripts/push-secrets.mjs --env staging   staging, from .dev.vars.staging; the shared
//                                                 email and Turnstile keys fall back to .dev.vars
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const NAMES = ["DATABASE_URL", "NEON_AUTH_BASE_URL", "NEON_AUTH_COOKIE_SECRET", "NOTEBOOK_KEK", "MODAL_ENDPOINT_URL", "MODAL_TOKEN", "CRON_SECRET", "ADMIN_EMAILS", "ACS_ACCESS_KEY", "TURNSTILE_SECRET_KEY"];
const SHARED = ["ACS_ACCESS_KEY", "TURNSTILE_SECRET_KEY"];

const i = process.argv.indexOf("--env");
const env = i > 0 ? process.argv[i + 1] : null;
if (i > 0 && !env) throw new Error("--env needs a name");

function read(file) {
  const url = new URL(`../${file}`, import.meta.url);
  if (!existsSync(url)) return {};
  return Object.fromEntries(
    readFileSync(url, "utf8")
      .split(/\r?\n/)
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map(([, k, v]) => [k, v.replace(/^(["'])(.*)\1$/, "$2")]),
  );
}

let vars;
if (env) {
  const own = read(`.dev.vars.${env}`);
  if (!Object.keys(own).length) throw new Error(`.dev.vars.${env} is missing or empty`);
  const base = read(".dev.vars");
  vars = { ...own };
  for (const n of SHARED) if (!vars[n] && base[n]) vars[n] = base[n];
} else {
  vars = read(".dev.vars");
}

const secrets = Object.fromEntries(NAMES.filter((n) => vars[n]).map((n) => [n, vars[n]]));
const missing = NAMES.filter((n) => !vars[n]);
console.log(`Pushing ${Object.keys(secrets).join(", ")}${env ? ` to ${env}` : ""}${missing.length ? ` (skipping empty: ${missing.join(", ")})` : ""}`);
const args = ["wrangler", "secret", "bulk", ...(env ? ["--env", env] : [])];
const r = spawnSync("npx", args, { input: JSON.stringify(secrets), stdio: ["pipe", "inherit", "inherit"], shell: true });
process.exit(r.status ?? 1);
