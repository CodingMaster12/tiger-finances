#!/usr/bin/env bash
# Runs the SEC data sync on YOUR computer (the SEC refuses GitHub's and Vercel's servers).
# First run: asks for your Supabase URL and secret key once, and remembers them (see below).
#
#   bash scripts/mac-sync.sh                 normal run
#   bash scripts/mac-sync.sh --ticker=MSFT   also fetch a specific company
#   bash scripts/mac-sync.sh --dry-run       fetch from the SEC but save nothing
#
# Your details are saved in ~/.tiger-finances-sync.env, readable only by you.
# To forget them, delete that file. Never share it and never paste its contents anywhere.
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf '\n%s\n' "$*"; }
stop() { say "$*"; exit 1; }

command -v node >/dev/null 2>&1 || stop "Node.js is not installed yet.
1. Go to https://nodejs.org and click the big green button labelled LTS.
2. Open the downloaded file and click Continue until it says it is installed.
3. Close this Terminal window, open a new one, and run the same command again."
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ] || stop "Your Node.js is too old (need version 20 or newer). Install the current LTS from https://nodejs.org and try again."

if [ ! -d node_modules ]; then
  say "First run: installing the tools. This takes about a minute."
  npm ci --ignore-scripts
fi

CONF="${TIGER_SYNC_CONFIG:-$HOME/.tiger-finances-sync.env}"
if [ ! -f "$CONF" ]; then
  say "First-time setup. Your answers are stored only on this computer."
  read -r -p "Supabase project URL (looks like https://abcdefgh.supabase.co): " URL
  URL="${URL%/}"
  [[ "$URL" =~ ^https://[a-z0-9-]+\.supabase\.co$ ]] || stop "That does not look like a Supabase project URL. It should start with https:// and end with .supabase.co"
  read -r -s -p "Supabase SECRET key (what you type is hidden; paste it and press Return): " KEY
  echo
  [[ -n "$KEY" && "$KEY" != *" "* && "$KEY" != *"'"* && ${#KEY} -ge 20 ]] || stop "That does not look like a secret key. Copy the whole key from Supabase (Project Settings, API) and try again."
  umask 077
  # Values are single-quoted so spaces and symbols are kept exactly as typed.
  printf "NEXT_PUBLIC_SUPABASE_URL='%s'\nSUPABASE_SECRET_KEY='%s'\nSEC_USER_AGENT='%s'\n" "$URL" "$KEY" "Tiger Finances https://github.com/CodingMaster12/tiger-finances" > "$CONF"
  say "Saved. You will not be asked again."
fi

set -a
# shellcheck disable=SC1090
source "$CONF"
set +a

say "Starting the sync. Leave this window open until it says it has finished."
set +e
npm run sec:sync -- "$@"
CODE=$?
set -e
if [ "$CODE" -eq 0 ]; then
  say "Finished. Your website now has the saved company data."
else
  say "The sync stopped with a problem (see the lines above). Copy the last 10 lines to Claude."
fi
exit "$CODE"
