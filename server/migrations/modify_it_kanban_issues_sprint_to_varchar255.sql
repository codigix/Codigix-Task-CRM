-- Migration: Expand sprint and other columns in it_kanban_issues to prevent 'Data too long' errors
ALTER TABLE `it_kanban_issues` MODIFY COLUMN `sprint` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `it_kanban_issues` MODIFY COLUMN `assignee` VARCHAR(255) DEFAULT 'Unassigned';
ALTER TABLE `it_kanban_issues` MODIFY COLUMN `reporter` VARCHAR(255) DEFAULT 'Unassigned';
ALTER TABLE `it_kanban_issues` MODIFY COLUMN `type` VARCHAR(100) DEFAULT 'Task';
ALTER TABLE `it_kanban_issues` MODIFY COLUMN `priority` VARCHAR(100) DEFAULT 'Medium';
ALTER TABLE `it_kanban_issues` MODIFY COLUMN `status` VARCHAR(100) DEFAULT 'TO DO';
