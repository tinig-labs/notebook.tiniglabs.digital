# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright 2026 tinig labs. See modal/LICENSE.
"""
IPA phone recognition for tinig labs notebook (patient recordings), served on Modal.

Forked from collect.tiniglabs.digital's modal/phonemes.py, with privacy changes:
  * audio arrives in the request body (TLS) instead of by public URL;
  * nothing is written to disk, logged or kept after the response;
  * clips up to ~2 minutes are split on pauses into <= 20 s windows, the fixed length the
    model was trained on, and IPA is returned per window with timestamps.

Model: espnet/powsm_ctc (POWSM-CTC: OWSM-CTC encoder trained on IPAPack++, phone recognition
task <pr>, language-agnostic prompt <unk>). The weights are third-party and licensed CC BY 4.0
(commercial use allowed with attribution; see ACKNOWLEDGEMENTS.md for the citation).

Contract (must match src/lib/modal.ts and src/app/api/ipa-callback):
    POST https://<workspace>--tinig-notebook-phonemes-api.modal.run/jobs
    Authorization: Bearer <PHONEMES_TOKEN>, X-Job-Id: <recording id>
    Content-Type: audio/wav            (raw WAV bytes; any sample rate, mono or stereo)
 -> { "accepted": true }               (returns at once; the GPU may still be starting)
 Later, Modal POSTs to CALLBACK_URL with the same bearer token:
    { "job_id", "model": "espnet/powsm_ctc@<commit>", "ipa": "<windows joined with ' | '>",
      "segments": [{ "start": 0.0, "end": 3.2, "ipa": "..." }] }   or   { "job_id", "error" }
 Why: a Worker's background work is cut off after 30 s, and a cold GPU start takes longer.

Setup:    modal secret create tinig-notebook-phonemes PHONEMES_TOKEN=<long random string>
Deploy:   modal deploy modal/notebook_phonemes.py
Try one:  modal run modal/notebook_phonemes.py --wav path/to/clip.wav
"""


import re

import modal

MODEL_ID = "espnet/powsm_ctc"
# Pinned: the checkpoint is a pickled .pth, so never load an upload we haven't looked at.
MODEL_REVISION = "f9d7f5c0e21f4e821b743eeab07344cb2d517d35"
MODEL_DIR = "exp/s2t_train_conv2d_size768_e9_d9_mel80_raw_bpe40000"
SAMPLE_RATE = 16_000
MAX_AUDIO_BYTES = 20_000_000  # 2 min at 48 kHz stereo 16-bit is ~23 MB; the app sends mono
MAX_SECONDS = 150
MIN_SAMPLES = SAMPLE_RATE // 10  # 100 ms
CALLBACK_URL = "https://notebook.tiniglabs.digital/api/ipa-callback"
WINDOW_S = 20.0  # longest window sent to the model (its training length)
MIN_WINDOW_S = 4.0  # don't cut shorter than this unless the clip ends
FRAME_S = 0.03

MODEL_FILES = ["meta.yaml", "data/token_list/**", "exp/**/*.npz", f"{MODEL_DIR}/config.yaml", f"{MODEL_DIR}/*.pth"]
PHONE = re.compile(r"^/(.+)/$")  # POWSM writes each phone as its own token, e.g. /pʰ/


def download_model() -> str:
    from huggingface_hub import snapshot_download

    return snapshot_download(MODEL_ID, revision=MODEL_REVISION, allow_patterns=MODEL_FILES)


def to_ipa(tokens: list[str]) -> str:
    """Phone tokens (/p/ /ʰ/ ...) to a plain IPA string; language, task and BPE tokens are dropped."""
    return "".join(m.group(1) for t in tokens if (m := PHONE.match(t)))


image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("libsndfile1")
    .pip_install(
        "torch==2.11.0",
        "torchaudio==2.11.0",
        "espnet==202611",
        "huggingface_hub>=0.25",
        "sentencepiece",
        "soundfile",
        "numpy>=2,<2.4",
        "fastapi[standard]",
        "httpx",
    )
    .env({"HF_HOME": "/models/hf"})
    .run_function(download_model)
    .env({"HF_HUB_OFFLINE": "1"})
)

app = modal.App("tinig-notebook-phonemes", image=image)


def split_on_pauses(mono, sr: int) -> list[tuple[int, int]]:
    """Window boundaries (sample indices), cutting at the quietest frame before each 15 s limit."""
    import numpy as np

    n = len(mono)
    win, min_win = int(WINDOW_S * sr), int(MIN_WINDOW_S * sr)
    if n <= win:
        return [(0, n)]
    hop = int(FRAME_S * sr)
    frames = n // hop
    energy = np.sqrt(np.mean(mono[: frames * hop].reshape(frames, hop) ** 2, axis=1) + 1e-12)
    out, start = [], 0
    while n - start > win:
        lo, hi = (start + min_win) // hop, (start + win) // hop
        cut = (lo + int(np.argmin(energy[lo:hi]))) * hop if hi > lo else start + win
        out.append((start, cut))
        start = cut
    out.append((start, n))
    return [(a, b) for a, b in out if b - a >= MIN_SAMPLES]


@app.cls(
    gpu="T4",
    secrets=[modal.Secret.from_name("tinig-notebook-phonemes")],  # provides PHONEMES_TOKEN
    scaledown_window=120,  # SLPs transcribe on demand; keep warm briefly between taps
    max_containers=1,
    timeout=600,
)
class Phonemes:
    @modal.enter()
    def load(self) -> None:
        import os
        from pathlib import Path

        import torch
        from espnet2.bin.s2t_inference import Speech2Text

        self.torch = torch
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        snap = Path(download_model())  # already in the image; HF_HUB_OFFLINE keeps this local
        os.chdir(snap)  # config.yaml names the BPE model and feature stats relative to the repo root
        model_file = next((snap / MODEL_DIR).glob("*.pth"))
        self.s2t = Speech2Text(
            s2t_train_config=str(snap / MODEL_DIR / "config.yaml"),
            s2t_model_file=str(model_file),
            device=self.device,
            lang_sym="<unk>",  # no Tagalog token; phone recognition works without a language
            task_sym="<pr>",
        )
        self.window = SAMPLE_RATE * int(WINDOW_S)
        self.version = f"{MODEL_ID}@{MODEL_REVISION[:12]}"

    def _transcribe(self, data: bytes) -> dict:
        import io

        import numpy as np
        import soundfile as sf
        import torchaudio

        wav, sr = sf.read(io.BytesIO(data), dtype="float32", always_2d=True)
        if len(wav) / sr > MAX_SECONDS:
            raise ValueError(f"audio longer than {MAX_SECONDS} s")
        mono = self.torch.from_numpy(np.ascontiguousarray(wav.mean(axis=1)))
        if sr != SAMPLE_RATE:
            mono = torchaudio.functional.resample(mono, sr, SAMPLE_RATE)
        if mono.numel() < MIN_SAMPLES:
            raise ValueError("audio shorter than 100 ms")

        segments = []
        for a, b in split_on_pauses(mono.numpy(), SAMPLE_RATE):
            # Trained on fixed 20 s inputs: pad the window with silence, as the model card asks.
            chunk = self.torch.nn.functional.pad(mono[a:b], (0, max(0, self.window - (b - a))))
            with self.torch.inference_mode():
                _, tokens, *_ = self.s2t.best_path(chunk)[0]  # CTC-only: argmax path, no search
            ipa = to_ipa(tokens)
            if ipa:
                segments.append({"start": round(a / SAMPLE_RATE, 2), "end": round(b / SAMPLE_RATE, 2), "ipa": ipa})
        return {"model": self.version, "ipa": " | ".join(s["ipa"] for s in segments), "segments": segments}

    @modal.method()
    def transcribe_bytes(self, data: bytes) -> dict:
        return self._transcribe(data)

    @modal.method()
    def run_job(self, data: bytes, job_id: str) -> None:
        """Background job: transcribe, then send the result to the notebook. Nothing is kept."""
        import os
        import time

        import httpx

        try:
            body = {"job_id": job_id, **self._transcribe(data)}
        except ValueError as e:
            body = {"job_id": job_id, "error": str(e)[:200]}
        except Exception:
            body = {"job_id": job_id, "error": "transcription failed"}
        finally:
            del data
        headers = {"authorization": f"Bearer {os.environ['PHONEMES_TOKEN']}"}
        for wait in (0, 2, 5, 15):
            time.sleep(wait)
            try:
                r = httpx.post(CALLBACK_URL, json=body, headers=headers, timeout=20)
                if r.status_code < 500:
                    return
            except httpx.HTTPError:
                pass


# Small CPU-only front door: starts in about a second, so the Worker never waits for the GPU to boot.
web_image = modal.Image.debian_slim(python_version="3.11").pip_install("fastapi[standard]")


@app.function(image=web_image, secrets=[modal.Secret.from_name("tinig-notebook-phonemes")], scaledown_window=300)
@modal.asgi_app()
def api():
    import hmac
    import os
    import re

    from fastapi import FastAPI, Header, HTTPException, Request

    web = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    token = os.environ.get("PHONEMES_TOKEN", "")

    def check(authorization: str | None):
        if not token or not hmac.compare_digest(authorization or "", f"Bearer {token}"):
            raise HTTPException(status_code=401, detail="unauthorized")

    async def read(request: Request) -> bytes:
        data = await request.body()
        if not data or len(data) > MAX_AUDIO_BYTES:
            raise HTTPException(status_code=413, detail="audio missing or too large")
        return data

    @web.post("/jobs")
    async def jobs(request: Request, authorization: str | None = Header(default=None), x_job_id: str | None = Header(default=None)):
        """Accepts a job and returns at once; the result arrives later at CALLBACK_URL."""
        check(authorization)
        if not x_job_id or not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", x_job_id):
            raise HTTPException(status_code=400, detail="bad job id")
        data = await read(request)
        await Phonemes().run_job.spawn.aio(data, x_job_id)
        return {"accepted": True}

    @web.post("/transcribe")
    async def transcribe(request: Request, authorization: str | None = Header(default=None)):
        """Synchronous variant, for testing."""
        check(authorization)
        data = await read(request)
        try:
            return await Phonemes().transcribe_bytes.remote.aio(data)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e)[:200])
        except Exception:
            raise HTTPException(status_code=500, detail="transcription failed")

    @web.get("/health")
    async def health():
        return {"ok": True}

    return web


@app.local_entrypoint()
def main(wav: str):
    """modal run modal/notebook_phonemes.py --wav clip.wav"""
    from pathlib import Path

    print(Phonemes().transcribe_bytes.remote(Path(wav).read_bytes()))
