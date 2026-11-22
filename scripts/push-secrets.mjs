// Pushes the Worker secrets that live in .dev.vars to Cloudflare in one call, without printing them.
// Empty values are skipped: `node scripts/push-secrets.mjs`.
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const NAMES = ["DATABASE_URL", "NEON_AUTH_BASE_URL", "NEON_AUTH_COOKIE_SECRET", "NOTEBOOK_KEK", "MODAL_ENDPOINT_URL", "MODAL_TOKEN", "CRON_SECRET", "ADMIN_EMAILS", "ACS_ACCESS_KEY", "TURNSTILE_SECRET_KEY"];

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

const vars = read(".dev.vars");

const secrets = Object.fromEntries(NAMES.filter((n) => vars[n]).map((n) => [n, vars[n]]));
const missing = NAMES.filter((n) => !vars[n]);
console.log(`Pushing ${Object.keys(secrets).join(", ")}${missing.length ? ` (skipping empty: ${missing.join(", ")})` : ""}`);
const r = spawnSync("npx", ["wrangler", "secret", "bulk"], { input: JSON.stringify(secrets), stdio: ["pipe", "inherit", "inherit"], shell: true });
process.exit(r.status ?? 1);
