#!/usr/bin/env python3
"""Word error rate between ground truth and benchmark hypothesis JSON."""

import argparse
import json
import re
import sys


def normalize(text: str) -> list[str]:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s']", "", text)
    return [w for w in text.split() if w]


def wer(ref: list[str], hyp: list[str]) -> float:
    if not ref:
        return 0.0 if not hyp else 1.0
    d = [[0] * (len(hyp) + 1) for _ in range(len(ref) + 1)]
    for i in range(len(ref) + 1):
        d[i][0] = i
    for j in range(len(hyp) + 1):
        d[0][j] = j
    for i in range(1, len(ref) + 1):
        for j in range(1, len(hyp) + 1):
            cost = 0 if ref[i - 1] == hyp[j - 1] else 1
            d[i][j] = min(
                d[i - 1][j] + 1,
                d[i][j - 1] + 1,
                d[i - 1][j - 1] + cost,
            )
    return d[len(ref)][len(hyp)] / len(ref)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--truth", required=True)
    parser.add_argument("--hyp", required=True)
    args = parser.parse_args()

    truth = json.load(open(args.truth, encoding="utf-8"))
    hyp_data = json.load(open(args.hyp, encoding="utf-8"))
    hypotheses = hyp_data.get("results", hyp_data)

    total_wer = 0.0
    count = 0
    for clip in truth.get("clips", []):
        clip_id = clip["clipId"]
        ref = normalize(clip["text"])
        entry = hypotheses.get(clip_id) if isinstance(hypotheses, dict) else None
        if not entry:
            print(f"Missing hypothesis for {clip_id}", file=sys.stderr)
            continue
        hyp_text = entry if isinstance(entry, str) else entry.get("text", "")
        w = wer(ref, normalize(hyp_text))
        print(f"{clip_id}: WER={w:.2%}")
        total_wer += w
        count += 1

    if count:
        print(f"Mean WER: {total_wer / count:.2%}")


if __name__ == "__main__":
    main()
