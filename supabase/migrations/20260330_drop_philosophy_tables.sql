-- Phase 17 CLEAN-02: Remove philosophy editor tables
-- The coaching context is now embedded directly in the claude-coach Edge Function via SKILL.md reference files.
-- These tables are no longer read or written by any code path.

-- Drop policies first (Supabase requires this before dropping tables with RLS)

-- coach_philosophy_documents policies
drop policy if exists "coach_philosophy_documents_select_auth" on coach_philosophy_documents;
drop policy if exists "coach_philosophy_documents_no_client_writes" on coach_philosophy_documents;

-- coach_philosophy_versions policies
drop policy if exists "coach_philosophy_versions_select_auth" on coach_philosophy_versions;
drop policy if exists "coach_philosophy_versions_no_client_writes" on coach_philosophy_versions;

-- coach_admin_audit policies
drop policy if exists "coach_admin_audit_service_only" on coach_admin_audit;

-- coach_admins policies
drop policy if exists "coach_admins_select_self" on coach_admins;

-- coach_playbook_entries policies
drop policy if exists "coach_playbook_entries_service_only" on coach_playbook_entries;

-- Drop tables (in dependency order — children before parents)
drop table if exists coach_admin_audit;
drop table if exists coach_philosophy_versions;
drop table if exists coach_playbook_entries;
drop table if exists coach_philosophy_documents;
drop table if exists coach_admins;
