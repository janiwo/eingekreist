#!/usr/bin/env bash
# PostToolUse hook: after Claude edits a TS/TSX file, run typecheck + lint.
# Exit 2 sends the errors back to Claude; exit 0 stays silent.
set -uo pipefail

file=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')
case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0

tsc_out=$(npx --no-install tsc -b 2>&1); tsc_status=$?
lint_out=$(npx --no-install oxlint --deny-warnings "$file" 2>&1); lint_status=$?

if [ $tsc_status -ne 0 ] || [ $lint_status -ne 0 ]; then
  echo "Typecheck/lint failed after editing $file:" >&2
  [ $tsc_status -ne 0 ] && echo "$tsc_out" >&2
  [ $lint_status -ne 0 ] && echo "$lint_out" >&2
  exit 2
fi
exit 0
