-- Migration: Change title column in it_kanban_issues to TEXT to support long titles and summaries
ALTER TABLE `it_kanban_issues` MODIFY COLUMN `title` TEXT NOT NULL;
