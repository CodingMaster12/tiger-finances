#!/usr/bin/env bash
# Applies every migration to a throwaway local Postgres and runs the RLS tests.
# Requires PostgreSQL server binaries (no Docker, no Supabase account needed).
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"

PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -x "$PGBIN/initdb" ] || { echo "PostgreSQL server binaries not found. Set PGBIN."; exit 1; }

DATA="$(mktemp -d)"; PORT=54329
RUN=""; [ "$(id -u)" = 0 ] && { chown postgres "$DATA"; RUN="su postgres -c"; }
run() { if [ -n "$RUN" ]; then $RUN "$*"; else bash -c "$*"; fi; }
cleanup() { run "$PGBIN/pg_ctl -D $DATA stop -m immediate >/dev/null 2>&1" || true; rm -rf "$DATA"; }
trap cleanup EXIT

run "$PGBIN/initdb -D $DATA -A trust -U postgres >/dev/null"
run "$PGBIN/pg_ctl -D $DATA -o '-p $PORT -k /tmp' -l $DATA/log -w start >/dev/null"
PSQL="psql -h /tmp -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"

$PSQL -c "create database app" postgres
$PSQL -d app -f supabase/tests/00_auth_stub.sql
for f in supabase/migrations/*.sql; do echo "applying $f"; $PSQL -d app -f "$f"; done
$PSQL -d app -f supabase/tests/rls.test.sql 2>&1 | grep -E "ok  |FAIL|PASSED|ERROR" 
