# Non-AI UI layout audit

## Scope

The audit covered all **293 HTML pages** in the repository, excluding AI-owned pages from the shared language-control conclusions. The shared Non-AI runtime is referenced by **265 pages**. Static source checks covered every page for stale runtime versions, duplicate visible language controls, and legacy selector classes. Representative visual checks were performed at desktop (`1280px`) and mobile (`390px`) viewports for compact PDF tools, the converter hub, compound-interest, and the Gacha calculator.

## Defect found

The shared runtime previously selected the bare `<header>` as a fallback host when the page header’s action group was not resolved at mount time. On compact converter pages this produced a second-row selector at the left edge of the header instead of placing it with the right-side actions. The defect was made more visible by cached copies of the old runtime because all pages used the same cache-busting version.

## Corrections

The runtime now resolves an existing `header .nav-actions`, `header .header-actions`, or `header .nav-right` first. If no action group exists, it inserts the selector into the header’s primary flex container before the action group. Existing controls are re-parented if the header becomes available after initial execution. Responsive selector widths are constrained to `100px` below `760px` and `92px` below `420px`, preserving a single-row compact header without horizontal overflow. All 265 HTML references now use the cache-busted runtime version `tri-locale-layout-20260913`.

The Gacha calculator had a separate page-level mobile issue: its long return-home button overlapped the brand. At mobile widths it now uses an icon-only return button, a reduced brand size, and stable header spacing while retaining the shared language selector.

## Results

| Check | Result |
|---|---:|
| HTML pages scanned | 293 |
| Shared Non-AI runtime references | 265 |
| Pages with more than one interface language control | 0 |
| Stale runtime version references | 0 |
| Active legacy visible language-control classes in Non-AI pages | 0 |
| Inline JavaScript syntax failures | 0 |
| Desktop/mobile representative visual regressions remaining | 0 |

The visual checks confirmed that the PDF compact-tool selector is in the right-side action group on desktop, remains aligned on mobile, and no longer appears as a standalone control below the header. Converter hub, compound-interest, and Gacha mobile headers were also checked after the page-specific Gacha correction.
