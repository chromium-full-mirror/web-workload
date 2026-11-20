# Blink-AI quality datasets

Fixed, seeded subsets used by the `quality_*` stories in
`../main/apis/language_model_quality.js`. Regenerate them with:

```
python3 tools/blink-ai/prepare_quality_datasets.py --num-examples=100 --seed=0
```

The script needs only the Python standard library, `ffmpeg` and `ffprobe`.

| Story                 | Directory                  | Source                  | Split                  | Metric           |
| :-------------------- | :------------------------- | :---------------------- | :--------------------- | :--------------- |
| `quality_mmlu`        | `mmlu/`                    | [cais/mmlu] (`all`)     | test                   | Accuracy, 0-shot |
| `quality_vizwiz`      | `vizwiz/`                  | [VizWiz-VQA]            | val, answerable only   | VQA accuracy     |
| `quality_librispeech` | `librispeech_test_clean/`  | [LibriSpeech] (OpenSLR) | test-clean             | Corpus WER       |

Notes:

-   VizWiz images are re-encoded as JPEG with the longest side capped at
    1024px. Only questions that annotators marked answerable are used.
-   LibriSpeech clips are at most 20 seconds long, converted to 16kHz mono
    FLAC. WER compares against the `transcription` field after lowercasing
    and removing punctuation. This is lighter than Whisper's text normalizer,
    so use the WER to track regressions between runs, not to compare with
    published LibriSpeech results.

## Licenses

Each dataset directory carries its own `LICENSE` file overriding the
repository's BSD license for that directory:

-   [`mmlu/LICENSE`](mmlu/LICENSE): MIT License.
-   [`vizwiz/LICENSE`](vizwiz/LICENSE): [CC BY 4.0].
-   [`librispeech_test_clean/LICENSE`](librispeech_test_clean/LICENSE):
    [CC BY 4.0].

[cais/mmlu]: https://huggingface.co/datasets/cais/mmlu
[VizWiz-VQA]: https://vizwiz.org/tasks-and-datasets/vqa/
[LibriSpeech]: https://www.openslr.org/12/
[CC BY 4.0]: https://creativecommons.org/licenses/by/4.0/
