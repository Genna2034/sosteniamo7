-- =============================================================================
-- Migration 0003: hardening finale (eseguire in staging, poi in produzione)
-- =============================================================================
-- L3: la lettura passa esclusivamente dalle RPC auditate.
revoke select, update, delete, truncate on table public.fascicolo_clinico_riservato from authenticated, anon;
-- Audit append-only anche a livello di privilegi.
revoke insert, update, delete, truncate on table public.audit_logs from public, authenticated, anon;
-- Nessun accesso anonimo.
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;
revoke usage on schema public from anon;
