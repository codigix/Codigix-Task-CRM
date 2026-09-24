-- Migration: Add subtask_id column to it_kanban_attachments
-- Purpose: Isolate attachments so each subtask has its own private files/screenshots

ALTER TABLE it_kanban_attachments 
ADD COLUMN IF NOT EXISTS subtask_id VARCHAR(100) NULL DEFAULT NULL AFTER issue_key;

CREATE INDEX IF NOT EXISTS idx_it_kanban_attachments_subtask 
ON it_kanban_attachments(issue_key, subtask_id);
