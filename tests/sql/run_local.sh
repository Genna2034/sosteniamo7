#!/usr/bin/env bash
# Collaudo completo dello schema su un Postgres locale (vanilla) con shim dello schema auth.
# Uso: PGHOST=localhost PGPORT=5433 PGUSER=postgres tests/sql/run_local.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
export PGOPTIONS='--client-min-messages=warning'
DB="${S7_TEST_DB:-s7test}"
psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f tests/sql/00_local_harness.sql \
  -f supabase/migrations/0001_schema.sql -f supabase/migrations/0002_seed_base.sql -f supabase/migrations/0003_hardening.sql
echo "migrations: OK"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f tests/sql/01_security_and_domain.sql
echo "sql tests: OK"
