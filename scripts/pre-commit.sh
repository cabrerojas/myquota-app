#!/usr/bin/env bash
set -euo pipefail

STAGED_FILES=$(git diff --cached --name-only)

# No staged files = nothing to check
if [[ -z "$STAGED_FILES" ]]; then
  exit 0
fi

# Run gga if available (non-blocking)
if command -v gga &>/dev/null; then
  gga run 2>/dev/null || true
fi

FAILED=0

declare -A PATTERNS=(
  ["EXPO_PUBLIC_EAS_PROJECT_ID"]='"[0-9a-f]{8}-[0-9a-f]{4}'
  ["EXPO_PUBLIC_WEB_CLIENT_ID"]='".*\.apps\.googleusercontent\.com'
  ["EXPO_PUBLIC_IOS_CLIENT_ID"]='".*\.apps\.googleusercontent\.com'
  ["EXPO_PUBLIC_EXPO_UPDATES_URL"]='"https://u.expo.dev/[0-9a-f]{8}'
)

check_file() {
  local file="$1"

  # Skip env test files (they should be blocked by .gitignore anyway)
  if [[ "$file" == */env.test.ts ]] || [[ "$file" == */env.test.tsx ]] || [[ "$file" == env.test.ts ]] || [[ "$file" == env.test.tsx ]]; then
    return
  fi

  while IFS= read -r line; do
    for var in "${!PATTERNS[@]}"; do
      local regex="^[[:space:]]*${var}[[:space:]]*:[[:space:]]*${PATTERNS[$var]}"
      if [[ "$line" =~ $regex ]]; then
        # Exclude placeholder patterns
        if echo "$line" | grep -qE '00000000-0000-0000-0000-000000000000|test-.*-client-id|your-updates-url-here'; then
          continue
        fi
        echo "WARNING: Possible real value in $file:"
        echo "  $line"
        FAILED=1
      fi
    done
  done < <(git show ":$file" 2>/dev/null || true)
}

while IFS= read -r file; do
  check_file "$file"
done <<< "$STAGED_FILES"

if [[ "$FAILED" -eq 1 ]]; then
  echo ""
  echo "Commit blocked: sensitive values detected in staged files."
  echo "Replace real values with placeholders before committing."
  exit 1
fi

exit 0
