#!/usr/bin/env bash
# Submit all Crystolia URLs to IndexNow (Bing, Yandex, Seznam, Naver).
# Run after every deploy that changes content.
#
# The key file must be live at https://crystolia.com/<KEY>.txt
# Usage: ./scripts/submit-indexnow.sh

set -euo pipefail

KEY="60870fd20b1bc2b770a9c72606038f7d"
HOST="crystolia.com"

URLS=$(cat <<'EOF'
"https://crystolia.com/en",
"https://crystolia.com/he",
"https://crystolia.com/ru",
"https://crystolia.com/en/about",
"https://crystolia.com/he/about",
"https://crystolia.com/ru/about",
"https://crystolia.com/en/faq",
"https://crystolia.com/he/faq",
"https://crystolia.com/ru/faq"
EOF
)

curl -sS -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "{
    \"host\": \"${HOST}\",
    \"key\": \"${KEY}\",
    \"keyLocation\": \"https://${HOST}/${KEY}.txt\",
    \"urlList\": [${URLS}]
  }" -w "\nHTTP %{http_code}\n"

echo "IndexNow submission sent."
