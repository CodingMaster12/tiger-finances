#!/usr/bin/env bash
# Runs the SEC data sync on YOUR computer.
# First run: asks for your Supabase URL, your Supabase secret key and a contact email, and remembers them (see below).
#
#   bash scripts/mac-sync.sh                 normal run
#   bash scripts/mac-sync.sh --ticker=MSFT   also fetch a specific company
#   bash scripts/mac-sync.sh --dry-run       fetch from the SEC but save nothing
#
# Your details are saved in ~/.tiger-finances-sync.env, readable only by you.
# To forget them, delete that file. Never share it and never paste its contents anywhere.
#
# Works with the macOS built-in bash (version 3.2), so keep it simple.
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf '\n%s\n' "$*"; }
stop() { say "$*"; exit 1; }

command -v node >/dev/null 2>&1 || stop "Node.js is not installed yet.
1. Go to https://nodejs.org and click the green Get Node.js button.
2. Open the downloaded file and click Continue until it says it is installed.
3. Close this Terminal window, open a new one, and run the same command again."
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ] || stop "Your Node.js is too old (need version 20 or newer). Install the current LTS from https://nodejs.org and try again."

if [ ! -d node_modules ]; then
  say "First run: installing the tools. This takes about a minute."
  npm ci --ignore-scripts
fi

CONF="${TIGER_SYNC_CONFIG:-$HOME/.tiger-finances-sync.env}"
URL=""; KEY=""; UAGENT=""
if [ -f "$CONF" ]; then
  # shellcheck disable=SC1090
  . "$CONF"
  URL="${NEXT_PUBLIC_SUPABASE_URL:-}"; KEY="${SUPABASE_SECRET_KEY:-}"; UAGENT="${SEC_USER_AGENT:-}"
fi
CHANGED=0

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  say "First-time setup. Your answers are stored only on this computer."
  read -r -p "Supabase project URL (looks like https://abcdefgh.supabase.co): " URL
  URL="${URL%/}"
  [[ "$URL" =~ ^https://[a-z0-9-]+\.supabase\.co$ ]] || stop "That does not look like a Supabase project URL. It should start with https:// and end with .supabase.co"
  read -r -s -p "Supabase SECRET key (what you type is hidden; paste it and press Return): " KEY
  echo
  [[ -n "$KEY" && "$KEY" != *" "* && "$KEY" != *"'"* && ${#KEY} -ge 20 ]] || stop "That does not look like a secret key. Copy the whole key from Supabase (Project Settings, API) and try again."
  CHANGED=1
fi

# The SEC wants "name + email" and refuses lines that contain a web link.
if [[ "$UAGENT" != *@*.* || "$UAGENT" == *[Hh][Tt][Tt][Pp]* ]]; then
  say "The SEC asks every program that reads its data to give an email address, so it can contact you if there is a problem.
It is sent only to the SEC. A new free address made just for this is a good choice."
  read -r -p "Contact email: " EMAIL
  [[ "$EMAIL" =~ ^[^[:space:]@\'\"]+@[^[:space:]@\'\"]+\.[^[:space:]@\'\"]+$ ]] || stop "That does not look like an email address (for example name@example.com). Run the same command again to retry."
  UAGENT="Tiger Finances $EMAIL"
  CHANGED=1
fi

if [ "$CHANGED" -eq 1 ]; then
  umask 077
  # Values are single-quoted so spaces and symbols are kept exactly as typed.
  printf "NEXT_PUBLIC_SUPABASE_URL='%s'\nSUPABASE_SECRET_KEY='%s'\nSEC_USER_AGENT='%s'\n" "$URL" "$KEY" "$UAGENT" > "$CONF"
  say "Saved. You will not be asked again."
fi

export NEXT_PUBLIC_SUPABASE_URL="$URL" SUPABASE_SECRET_KEY="$KEY" SEC_USER_AGENT="$UAGENT"

# The SEC's company-list page often refuses programs but lets a person's browser save it. If you saved it into
# Downloads (open https://www.sec.gov/files/company_tickers_exchange.json in Chrome, then press Cmd+S), use it.
EXTRA=()
case " $* " in
  *" --list-file"*) ;;
  *)
    LISTFILE="$(ls -t "$HOME"/Downloads/company_tickers_exchange* 2>/dev/null | head -n 1 || true)"
    if [ -n "$LISTFILE" ]; then
      say "Using the company list you saved: $LISTFILE"
      EXTRA=(--list-file="$LISTFILE")
    fi
    ;;
esac

say "Starting the sync. Leave this window open until it says it has finished."
set +e
npm run sec:sync -- ${EXTRA[@]+"${EXTRA[@]}"} "$@"
CODE=$?
set -e
if [ "$CODE" -eq 0 ]; then
  say "Finished. Your website now has the saved company data."
else
  say "The sync stopped with a problem (see the lines above). Copy the last 10 lines to Claude."
fi
exit "$CODE"
