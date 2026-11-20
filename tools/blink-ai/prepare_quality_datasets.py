#!/usr/bin/env python3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Builds the fixed evaluation subsets used by the blink-ai quality stories.

Writes JSONL files, media, and per-dataset LICENSE files into
`public/blink-ai/dataset/`:

  mmlu/test.jsonl + LICENSE                  MMLU (cais/mmlu, "all", "test")
  vizwiz/val.jsonl + images/*.jpg + LICENSE  VizWiz-VQA (val split)
  librispeech_test_clean/test_clean.jsonl
    + audio/*.flac + LICENSE                 LibriSpeech test-clean

Examples are sampled with a fixed seed so the subsets are reproducible. Only
the Python standard library and the `ffmpeg`/`ffprobe` binaries are required.

Usage:
  python3 tools/blink-ai/prepare_quality_datasets.py [--num-examples=100]
  python3 tools/blink-ai/prepare_quality_datasets.py --datasets=license
"""

from __future__ import annotations

import argparse
import io
import json
import pathlib
import random
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
import zipfile

ROWS_API = "https://datasets-server.huggingface.co/rows"
ROWS_API_DELAY_SEC = 1.0

MMLU_REPO = "cais/mmlu"
MMLU_TOTAL_ROWS = 14042

VIZWIZ_ANNOTATIONS_URL = (
    "https://vizwiz.cs.colorado.edu/VizWiz_final/vqa_data/Annotations.zip")
# 3.5GB; only the selected images are read, using HTTP range requests.
VIZWIZ_VAL_IMAGES_URL = (
    "https://vizwiz.cs.colorado.edu/VizWiz_final/images/val.zip")

LIBRISPEECH_REPO = "openslr/librispeech_asr"
LIBRISPEECH_TOTAL_ROWS = 2620
AUDIO_SAMPLE_RATE = 16000
# Keep clips short enough for the on-device audio encoder.
AUDIO_MAX_SECONDS = 20

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
DEFAULT_OUT_DIR = REPO_ROOT / "public" / "blink-ai" / "dataset"


def http_get(url: str, retries: int = 10,
             headers: dict[str, str] | None = None) -> bytes:
  request = urllib.request.Request(url, headers=headers or {})
  for attempt in range(retries):
    try:
      with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()
    except Exception as e:  # noqa: BLE001
      if attempt == retries - 1:
        raise
      wait = min(60, 2**attempt)
      print(f"  retrying in {wait}s after error: {e}", file=sys.stderr)
      time.sleep(wait)
  raise AssertionError("unreachable")


def fetch_row(dataset: str, config: str, split: str, index: int) -> dict:
  # The datasets-server rows API is rate limited; pace requests.
  time.sleep(ROWS_API_DELAY_SEC)
  query = urllib.parse.urlencode({
      "dataset": dataset,
      "config": config,
      "split": split,
      "offset": index,
      "length": 1,
  })
  payload = json.loads(http_get(f"{ROWS_API}?{query}"))
  rows = payload["rows"]
  assert len(rows) == 1 and rows[0]["row_idx"] == index, payload
  return rows[0]["row"]


def read_jsonl(path: pathlib.Path) -> list[dict]:
  return [
      json.loads(line)
      for line in path.read_text(encoding="utf-8").splitlines()
      if line.strip()
  ]


def write_jsonl(path: pathlib.Path, records: list[dict]) -> None:
  with path.open("w", encoding="utf-8") as f:
    for record in records:
      f.write(json.dumps(record, ensure_ascii=False) + "\n")
  print(f"Wrote {len(records)} examples to {path}")


def run_ffmpeg(*args: str) -> None:
  subprocess.run(
      ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args],
      check=True)


def audio_duration_sec(path: pathlib.Path) -> float:
  output = subprocess.run(
      ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
       "default=noprint_wrappers=1:nokey=1", str(path)],
      check=True, capture_output=True, text=True).stdout
  return float(output.strip())


class HttpRangeFile(io.RawIOBase):
  """A read-only, seekable file backed by HTTP range requests."""

  def __init__(self, url: str) -> None:
    self._url = url
    self._pos = 0
    with urllib.request.urlopen(
        urllib.request.Request(url, method="HEAD"), timeout=120) as response:
      self._size = int(response.headers["Content-Length"])

  def readable(self) -> bool:
    return True

  def seekable(self) -> bool:
    return True

  def tell(self) -> int:
    return self._pos

  def seek(self, offset: int, whence: int = io.SEEK_SET) -> int:
    base = {io.SEEK_SET: 0, io.SEEK_CUR: self._pos, io.SEEK_END: self._size}
    self._pos = base[whence] + offset
    return self._pos

  def readinto(self, buffer) -> int:
    if self._pos >= self._size or not len(buffer):
      return 0
    end = min(self._pos + len(buffer), self._size) - 1
    data = http_get(self._url, headers={"Range": f"bytes={self._pos}-{end}"})
    buffer[:len(data)] = data
    self._pos += len(data)
    return len(data)


def prepare_mmlu(out_dir: pathlib.Path, num: int, seed: int) -> None:
  print("Preparing MMLU...")
  mmlu_dir = out_dir / "mmlu"
  mmlu_dir.mkdir(parents=True, exist_ok=True)
  indices = sorted(random.Random(seed).sample(range(MMLU_TOTAL_ROWS), num))
  records = []
  for index in indices:
    row = fetch_row(MMLU_REPO, "all", "test", index)
    assert len(row["choices"]) == 4, row
    records.append({
        "id": f"mmlu_test_{index}",
        "subject": row["subject"],
        "question": row["question"],
        "choices": row["choices"],
        "answer": "ABCD"[row["answer"]],
    })
  write_jsonl(mmlu_dir / "test.jsonl", records)


def prepare_vizwiz(out_dir: pathlib.Path, num: int, seed: int) -> None:
  print("Preparing VizWiz-VQA...")
  image_dir = out_dir / "vizwiz" / "images"
  image_dir.mkdir(parents=True, exist_ok=True)

  with zipfile.ZipFile(io.BytesIO(http_get(VIZWIZ_ANNOTATIONS_URL))) as z:
    annotations = json.loads(z.read("val.json"))
  # Only score questions that annotators judged answerable from the image.
  candidates = [
      a for a in annotations
      if a["answerable"] == 1 and a["answer_type"] != "unanswerable"
  ]
  candidates.sort(key=lambda a: a["image"])
  selected = sorted(random.Random(seed).sample(candidates, num),
                    key=lambda a: a["image"])

  missing = [a for a in selected if not (image_dir / a["image"]).exists()]
  if missing:
    print(f"  reading {len(missing)} images from {VIZWIZ_VAL_IMAGES_URL}...")
    with zipfile.ZipFile(io.BufferedReader(
        HttpRangeFile(VIZWIZ_VAL_IMAGES_URL), buffer_size=1 << 20)) as z:
      names = {pathlib.PurePath(n).name: n for n in z.namelist()}
      for a in missing:
        raw_path = (image_dir / a["image"]).with_suffix(".raw")
        raw_path.write_bytes(z.read(names[a["image"]]))
        # Re-encode to a baseline JPEG capped at 1024px on the longest side.
        run_ffmpeg("-i", str(raw_path), "-vf",
                   "scale='min(1024,iw)':'min(1024,ih)':"
                   "force_original_aspect_ratio=decrease",
                   "-q:v", "3", str(image_dir / a["image"]))
        raw_path.unlink()

  records = []
  for a in selected:
    assert len(a["answers"]) == 10, a
    records.append({
        "id": pathlib.PurePath(a["image"]).stem.lower(),
        "image": f"vizwiz/images/{a['image']}",
        "question": a["question"],
        "answers": [answer["answer"] for answer in a["answers"]],
    })
  write_jsonl(out_dir / "vizwiz" / "val.jsonl", records)


def prepare_librispeech(out_dir: pathlib.Path, num: int, seed: int,
                        cache_dir: pathlib.Path) -> None:
  print("Preparing LibriSpeech test-clean...")
  audio_dir = out_dir / "librispeech_test_clean" / "audio"
  audio_dir.mkdir(parents=True, exist_ok=True)
  download_dir = cache_dir / "librispeech_test_clean"
  download_dir.mkdir(parents=True, exist_ok=True)

  # Walk a seeded permutation of the split and keep the first `num` clips
  # that fit the length limit, so the selection is deterministic.
  order = random.Random(seed).sample(range(LIBRISPEECH_TOTAL_ROWS),
                                     LIBRISPEECH_TOTAL_ROWS)
  records = []
  for index in order:
    if len(records) == num:
      break
    row = fetch_row(LIBRISPEECH_REPO, "clean", "test", index)
    raw_path = download_dir / f"{row['id']}.flac"
    if not raw_path.exists():
      raw_path.write_bytes(http_get(row["audio"][0]["src"]))
    duration = audio_duration_sec(raw_path)
    if duration > AUDIO_MAX_SECONDS:
      continue
    flac_name = f"{row['id']}.flac"
    run_ffmpeg("-i", str(raw_path), "-ac", "1", "-ar", str(AUDIO_SAMPLE_RATE),
               str(audio_dir / flac_name))
    records.append({
        "id": f"librispeech_test_clean_{row['id']}",
        "audio": f"librispeech_test_clean/audio/{flac_name}",
        "transcription": row["text"],
        "duration_sec": round(duration, 2),
    })
  records.sort(key=lambda r: r["id"])
  write_jsonl(out_dir / "librispeech_test_clean" / "test_clean.jsonl", records)


CC_BY_4_0 = "https://creativecommons.org/licenses/by/4.0/"

MMLU_LICENSE = """\
"Measuring Massive Multitask Language Understanding" by Dan Hendrycks,
Collin Burns, Steven Basart, Andy Zou, Mantas Mazeika, Dawn Song, and Jacob
Steinhardt.
  https://huggingface.co/datasets/cais/mmlu
  https://github.com/hendrycks/test

Modifications: a 100-example seeded subset of the "all" test split,
reformatted as JSONL.

MIT License

Copyright (c) 2020 Dan Hendrycks

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""

VIZWIZ_LICENSE = f"""\
Creative Commons Attribution 4.0 International (CC BY 4.0)
{CC_BY_4_0}

"VizWiz Grand Challenge: Answering Visual Questions from Blind People" by
Danna Gurari, Qing Li, Abigale J. Stangl, Anhong Guo, Chi Lin, Kristen
Grauman, Jiebo Luo, and Jeffrey P. Bigham.
  https://vizwiz.org/tasks-and-datasets/vqa/

Modifications: a 100-example seeded subset of the answerable questions in the
validation split, reformatted as JSONL, with images re-encoded as JPEG with
the longest side capped at 1024px.
"""

LIBRISPEECH_LICENSE = f"""\
Creative Commons Attribution 4.0 International (CC BY 4.0)
{CC_BY_4_0}

"Librispeech: An ASR Corpus Based on Public Domain Audio Books" by Vassil
Panayotov, Guoguo Chen, Daniel Povey, and Sanjeev Khudanpur.
  https://www.openslr.org/12/
  https://huggingface.co/datasets/openslr/librispeech_asr

Modifications: a 100-clip seeded subset of the test-clean split (each clip at
most 20 seconds long), with audio converted to 16kHz mono FLAC and metadata
reformatted as JSONL.
"""


def write_licenses(out_dir: pathlib.Path) -> None:
  for subdir, text in (("mmlu", MMLU_LICENSE), ("vizwiz", VIZWIZ_LICENSE),
                       ("librispeech_test_clean", LIBRISPEECH_LICENSE)):
    target_dir = out_dir / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    license_path = target_dir / "LICENSE"
    license_path.write_text(text, encoding="utf-8")
    print(f"Wrote {license_path}")


def main() -> None:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument("--out-dir", type=pathlib.Path, default=DEFAULT_OUT_DIR)
  parser.add_argument("--cache-dir", type=pathlib.Path,
                      default=pathlib.Path.home() / ".cache" /
                      "blink_ai_quality")
  parser.add_argument("--num-examples", type=int, default=100)
  parser.add_argument("--seed", type=int, default=0)
  parser.add_argument("--datasets", default="mmlu,vizwiz,librispeech,license",
                      help="Comma-separated subset of mmlu,vizwiz,librispeech,"
                      "license.")
  args = parser.parse_args()
  datasets = set(args.datasets.split(","))
  if datasets & {"vizwiz", "librispeech"} and not (
      shutil.which("ffmpeg") and shutil.which("ffprobe")):
    parser.error("ffmpeg and ffprobe are required")

  args.out_dir.mkdir(parents=True, exist_ok=True)
  if "mmlu" in datasets:
    prepare_mmlu(args.out_dir, args.num_examples, args.seed)
  if "vizwiz" in datasets:
    prepare_vizwiz(args.out_dir, args.num_examples, args.seed)
  if "librispeech" in datasets:
    prepare_librispeech(args.out_dir, args.num_examples, args.seed,
                        args.cache_dir)
  if "license" in datasets:
    write_licenses(args.out_dir)


if __name__ == "__main__":
  main()
