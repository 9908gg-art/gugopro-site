# Phase 2 production QA notes

Production URL: `https://gugopro.com/academy/research/quant-lab.html?qa=a185637`.

GitHub Actions Pages run `32975986090` completed with `success` for commit `a185637ab828d4c046cc69c98b716a22adb95584`. The production page loaded title, controls, local CSV input, canvas, and research links. Running the default fixture completed with status `研究完成`, snapshot `sha256:60a9cfa243bcf1a4ded04b59a43aac6cc0b9e74a4cd1c0e65473e78d1e532369`, as-of `2025-08-26 → 2026-08-25`, source rows 261, complete rows 251, missing rows excluded without imputation 10, trainable labels 231, four held-out windows, and average excess return `-1.01%`. The page showed the negative baseline and limitation copy; it did not show a live/current quote or buy/sell status.

Browser extraction captured no console error during production load or the completed run. The page was tested at the existing desktop viewport; a separate 390×844 headless screenshot confirmed the narrow initial layout stacks provenance cards and controls without horizontal clipping.

The production console view returned `(No console output)`. The production research index displayed the existing four source cards, three unavailable dataset cards, and exactly one Phase 2 section with the `./quant-lab.html` link. Its copy continued to say the sources are not enabled and the Phase 2 page is not a live trading signal surface.

The production Academy home at `https://gugopro.com/academy/index.html?qa=a185637` displayed 22 curriculum cards, 14 interactive tools, the existing `#quant-lab` section, and exactly one visible `research/quant-lab.html` entry. No Phase 2 code changed the existing course/tool counts or turned the home into a live market page.
