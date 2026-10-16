
## Initial local browser QA

- Latest tool URL: `http://127.0.0.1:4174/academy/tools/retirement-cashflow.html?qa=round1-updated`.
- Initial DOM exposed all required fields, mode selector, sequence selector, run/reset/download controls, and no result section before execution.
- Default execution rendered the result panel, five metrics, canvas, 40-row annual ledger, three-sequence comparison, and source links. Default visible output was 4.0% initial withdrawal, 2.94% real return, 5,973,900 displayed final balance, and 36.0 months of reserve runway.
- Changing the withdrawal mode caused the runtime to mark the state as “待重新計算” and prevented stale results from remaining visible. A browser selection action returned an invalid UTF-8 transport error even though the sequence selection was visibly applied; this is recorded as a browser harness observation, not a page console error.

- Invalid-input regression: setting retirement assets to `0` and running produced a fail-closed state. The result panel stayed hidden, the prior metrics were removed, and the alert stated that calculation did not complete.
- Usability issue found during this test: the lower-bound message exposed JavaScript `Number.EPSILON` as `2.220446049250313e-16`. The validation rule is correct, but the displayed bound should be normalized to a human-readable `0 以上`.
- Early sequence stress regression: selecting the early two-year -15% path and running rendered a visible canvas path and reported depletion in year 24 under the documented default inputs.

- After the validation-message fix, the same zero-asset test displayed `退休時資產 必須介於 0 與 不限上限 之間` and kept the result area cleared. The internal `Number.EPSILON` value is no longer exposed.

## Mobile visual QA

The 390×844 article screenshot shows a readable title, explanatory paragraph, badges, horizontally scrollable chapter navigation, callout, and the beginning of the first content card without horizontal clipping. The compact horizontal navigation is intentional so the six chapter links remain usable on a narrow viewport.

The 390×844 tool screenshot shows the dark Academy header, article return link, explanatory copy, three tool anchors, and full-width input fields with readable labels. No input overlap or horizontal clipping was visible in the first viewport. The result state still requires a narrow-viewport check after execution.

- Flexible-withdrawal regression: selecting `彈性支出：下跌時減少` revealed the cut and trigger fields, updated the explanatory text, and rendered a completed result with the selected rule shown as `固定基準＋下跌時減少 20.0%`. Under the same default path, the comparison table reflected the rule-specific early/late stress outcomes rather than reusing fixed-with-inflation output.

- Percentage-withdrawal regression: selecting `資產百分比提領` updated the explanatory copy and rendered `資產百分比提領 4.0%`. The ledger showed first-year withdrawal 400,000 and second-year withdrawal 404,000 from 4% of the prior year-start balance, while the result summary and comparison table updated without stale fixed-dollar labels.

- Final local article navigation regression: the `收入分層` chapter link changed the URL fragment to `#income-layers` and positioned the corresponding section in view. The page exposes six meaningful chapter links, the new income-layer content, the pressure-test CTA, references, and the tool sidebar.

## Production deployment QA

GitHub Pages run `32984738991` completed with `success` for commit `d9ae158e855d0bb69c5b69a55d5546393c0af7a9`. The cache-busted production article at `https://gugopro.com/academy/lessons/15-retirement-cashflow.html?qa=d9ae158` exposes the six chapter links, the added income-layer section, references, and the retirement-tool CTAs. The production deployment path is the repo's actual `/academy/` route; no claim is made that the legacy `academy.gugopro.com` root is the same deployment.

The cache-busted production tool at `https://gugopro.com/academy/tools/retirement-cashflow.html?qa=d9ae158` executed the default model successfully. It displayed the completed state, 4.0% initial withdrawal, 2.94% real return, 5,973,900 displayed nominal ending balance, 36.0-month reserve runway, the canvas chart, annual ledger, three sequence paths, and the source/limitation links. The production page had no visible runtime failure.
