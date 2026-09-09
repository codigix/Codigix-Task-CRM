-- AlterTable
ALTER TABLE `it_kanban_issues` ADD COLUMN `is_timer_running` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `timer_start_time` DATETIME(0) NULL;
