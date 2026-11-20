# tinig labs notebook

A recording notebook for speech-language pathologists: record patient speech, label it, get IPA
transcriptions and track progress. Installable PWA for Android, iOS and desktop. Works offline and
syncs across devices. Everything is encrypted on the device. Live at
[notebook.tiniglabs.digital](https://notebook.tiniglabs.digital) (closed beta).

Sister of [collect.tiniglabs.digital](https://collect.tiniglabs.digital) and shares its design,
stack and IPA model.

## How it works

| Piece | Where |
| --- | --- |
| App: Next.js 16 on Cloudflare Workers (OpenNext) | `src/app` |
| Encrypted local store (IndexedDB, Dexie) + in-memory decrypted view | `src/lib/local/store.ts` |
| Sync: push dirty rows, upload audio, run IPA jobs, pull by rev | `src/lib/local/sync.ts`, `src/app/api/sync` |
| Envelope encryption: per-user AES-256 key wrapped by `NOTEBOOK_KEK` | `src/lib/crypto` |
| Audio: AudioWorklet WAV at the device rate, ≤ 2 min, stored as ciphertext in private R2 | `src/components/recorder`, `src/app/api/audio` |
| IPA: a phoneme model on Modal, audio in the request body, nothing kept | `modal/notebook_phonemes.py`, `src/lib/transcribe.ts` |
| Closed beta: allowlist checked before an OTP is sent and on every request | `src/app/api/auth/[...path]`, `src/lib/session.ts` |
| Offline shell: service worker built at deploy | `src/sw/sw.ts`, `scripts/build-sw.mjs` |

See [DEVELOPMENT.md](DEVELOPMENT.md) for setup, deploy and the security procedures.

## License

Same as collect: the app is [FSL-1.1-ALv2](LICENSE.md); `modal/` is [AGPL-3.0-or-later](modal/LICENSE).
Phoneme model weights are CC BY-NC-SA 4.0 (non-commercial). The tinig labs name and logo are not licensed.
