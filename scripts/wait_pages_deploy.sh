#!/usr/bin/env bash
set -euo pipefail
cd /home/ubuntu/gugopro-site
for i in $(seq 1 36); do
  status=$(gh api repos/9908gg-art/gugopro-site/pages/builds --jq '.[0].status' 2>/dev/null || true)
  commit=$(gh api repos/9908gg-art/gugopro-site/pages/builds --jq '.[0].commit' 2>/dev/null || true)
  printf 'check=%s status=%s commit=%s\n' "$i" "$status" "$commit"
  if [[ "$commit" == d4f143c344f7ef270d84c8b8252ea618b5563574 && "$status" == built ]]; then
    html=$(curl -fsS 'https://gugopro.com/tools/ai/english-speaking-tutor.html?deploycheck=d4f143c')
    catalog=$(curl -fsS 'https://gugopro.com/i18n/tutor-ui-catalog.json?deploycheck=d4f143c')
    grep -q 'tutor-ui-runtime.js?v=20260913-ui25' <<<"$html"
    grep -q '"en-US"' <<<"$catalog"
    echo 'production verification OK'
    exit 0
  fi
  sleep 10
done
echo 'deployment did not finish within bounded wait' >&2
exit 2
