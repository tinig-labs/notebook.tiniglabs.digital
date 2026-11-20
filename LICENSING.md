# Licensing

This repository holds more than one kind of work, so more than one license applies.

| What | License |
| --- | --- |
| The web app: everything in this repository outside `modal/` (front end, API routes, scripts, migrations) | [FSL-1.1-ALv2](LICENSE.md). Each release becomes Apache-2.0 two years after it is published. |
| Model and data-processing code: `modal/` | [AGPL-3.0-or-later](modal/LICENSE) |
| Phonological feature table in `src/lib/ipa/features.json`, exported from [panphon](https://github.com/dmort27/panphon) | MIT, by David R. Mortensen et al. |
| Tagalog spelling-to-IPA rules in `src/lib/ipa/g2p-tl.ts`, ported from [epitran](https://github.com/dmort27/epitran) | MIT, by David R. Mortensen et al. |
| PhoneticXeus model weights ([changelinglab/PhoneticXeus](https://huggingface.co/changelinglab/PhoneticXeus)) | CC BY-NC-SA 4.0, by their authors. They are downloaded at deploy time, not included here, and not covered by the AGPL. The model IPA they produce carries the same non-commercial terms. |
| Patient recordings, IPA, notes and target lists | Not part of this repository. They belong to the SLPs and their patients, and tinig labs processes them only to run the notebook, as set out in the [Terms](https://notebook.tiniglabs.digital/terms). |
| The tinig labs name and logo | Not licensed. You may not use them to suggest endorsement. |

FSL is source-available: you may use, copy, modify and redistribute the app for any purpose except a
competing commercial use, until a release converts to Apache-2.0.

Questions about licensing: hello@tiniglabs.digital
