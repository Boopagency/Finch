#!/usr/bin/env bash
# Sobe um Postgres efêmero, aplica stub + migrations e roda os testes SQL.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1)}"
DIR="$(mktemp -d)"; PORT="${PGPORT_TEST:-54329}"
trap '${AS[@]:-} "$PGBIN/pg_ctl" -D "$DIR" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
AS=()
if [ "$(id -u)" = 0 ]; then chown postgres "$DIR"; AS=(runuser -u postgres --); fi  # initdb recusa root
"${AS[@]}" "$PGBIN/initdb" -D "$DIR" -U postgres --auth=trust >/dev/null
"${AS[@]}" "$PGBIN/pg_ctl" -D "$DIR" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" start -w >/dev/null
PSQL=(psql -h "$DIR" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/supabase/tests/_stub_supabase.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
for f in "$ROOT"/supabase/tests/*.test.sql; do "${PSQL[@]}" -f "$f"; done
