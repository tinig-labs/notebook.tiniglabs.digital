export const SITE_URL = "https://notebook.tiniglabs.digital";
export const MAIN_SITE_URL = "https://tiniglabs.digital";
export const CONTACT_EMAIL = "hello@tiniglabs.digital";
export const DPO_EMAIL = "privacy@tiniglabs.digital";

/** Clips are short drills: 2 minutes is plenty and keeps phone storage and sync light. */
export const MAX_RECORDING_MS = 120_000;
export const MIN_RECORDING_MS = 300;
/** 48 kHz 16-bit mono for 2 min is ~11.5 MB; leave headroom for imports at 44.1/48 kHz. */
export const MAX_AUDIO_BYTES = 16 * 1024 * 1024;
export const IPA_MAX_ATTEMPTS = 3;
export const SYNC_BATCH = 200;

// Sign-in, app and admin pages are useless in search results.
export const NOINDEX = { index: false, follow: false } as const;

// Cloudflare Turnstile site key (public). Same widget as collect.tiniglabs.digital.
export const TURNSTILE_SITE_KEY = "0x4AAAAAAGFTbJhzvdkMlt9m";

// The notebook's own pages in the shared footer, which adds Brand, GitHub, Terms and Privacy.
export const FOOTER_LINKS = [{ label: "Contact", href: `mailto:${CONTACT_EMAIL}` }];
