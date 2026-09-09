-- AlterTable
ALTER TABLE `it_kanban_issues` ADD COLUMN `contribution_method` VARCHAR(30) NULL DEFAULT 'WORK_BREAKDOWN',
    ADD COLUMN `contribution_review_status` VARCHAR(20) NULL DEFAULT 'Pending',
    ADD COLUMN `effort_points` INTEGER NULL DEFAULT 0,
    MODIFY `title` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `project_tasks` ADD COLUMN `actual_hours` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `is_timer_running` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `timer_start_time` DATETIME(0) NULL;
