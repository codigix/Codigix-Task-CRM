-- AlterTable general_tasks
ALTER TABLE `general_tasks`
  ADD COLUMN `actual_hours` DECIMAL(10, 2) NULL DEFAULT 0.00,
  ADD COLUMN `contribution_method` VARCHAR(50) NULL DEFAULT 'WORK_BREAKDOWN',
  ADD COLUMN `contribution_review_status` VARCHAR(50) NULL DEFAULT 'Pending',
  ADD COLUMN `current_assignee_id` INT NULL,
  ADD COLUMN `effort_points` INT NULL DEFAULT 0,
  ADD COLUMN `estimated_hours` DECIMAL(10, 2) NULL DEFAULT 0.00,
  ADD COLUMN `original_assignee_id` INT NULL,
  ADD COLUMN `ticket_type` VARCHAR(50) NULL DEFAULT 'Task',
  ADD COLUMN `timer_start_time` DATETIME(0) NULL,
  ADD COLUMN `is_timer_running` BOOLEAN NULL DEFAULT false;

-- AlterTable task_contributions
ALTER TABLE `task_contributions`
  ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable task_history
ALTER TABLE `task_history`
  ADD COLUMN `metadata` JSON NULL;

-- AlterTable task_subtasks
ALTER TABLE `task_subtasks`
  ADD COLUMN `started_at` TIMESTAMP NULL,
  ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable task_time_logs
ALTER TABLE `task_time_logs`
  ADD COLUMN `approved_at` TIMESTAMP NULL,
  ADD COLUMN `approved_by` INT NULL,
  ADD COLUMN `ended_at` TIMESTAMP NULL,
  ADD COLUMN `started_at` TIMESTAMP NULL,
  ADD COLUMN `subtask_id` INT NULL,
  ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN `work_type` VARCHAR(100) NULL;
