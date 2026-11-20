# Licensing

This repository holds more than one kind of work, so more than one license applies.

| What | License |
| --- | --- |
| The web app: everything in this repository outside `modal/` (front end, API routes, scripts, migrations) | [FSL-1.1-ALv2](LICENSE.md). Each release becomes Apache-2.0 two years after it is published. |
| Model, training and data-processing code: `modal/`, plus any future training code and model weights published by tinig labs | [AGPL-3.0-or-later](modal/LICENSE) |
| Phoneme model weights | CC BY-NC-SA 4.0, by their authors. They are downloaded at deploy time, not included here, and not covered by the AGPL. The model IPA they produce carries the same non-commercial terms. |
| The tinig labs name and logo | Not licensed. You may not use them to suggest endorsement. |

FSL is source-available: you may use, copy, modify and redistribute the app for any purpose except a
competing commercial use, until a release converts to Apache-2.0.

Questions about licensing: hello@tiniglabs.digital
