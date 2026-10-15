-- Subtask time on the main task's plan, and the sales enquiry intake fields.
-- (Also applied at runtime by routes/it-kanban-routes.js and routes/sales-flow-routes.js.)
-- Safe to run more than once: tables are created if missing, columns and indexes added only when absent.

-- ── Subtasks: no planned time of their own; their clocks and sessions ────────────────
-- A subtask's running clock. Its finished sessions go to it_kanban_worklogs (tagged with
-- subtask_id) on the main task, so they count against the main task's planned time.
CREATE TABLE IF NOT EXISTS `it_kanban_subtask_timers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `issue_key` varchar(50) NOT NULL,
  `subtask_id` varchar(64) NOT NULL,
  `subtask_title` varchar(500) DEFAULT NULL,
  `owner` varchar(120) NOT NULL,
  `started_at` datetime NOT NULL,
  `source` varchar(10) NOT NULL DEFAULT 'auto',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_subtask` (`issue_key`, `subtask_id`),
  KEY `idx_owner` (`owner`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `it_kanban_worklogs` ADD COLUMN `subtask_id` varchar(64) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'it_kanban_worklogs' AND COLUMN_NAME = 'subtask_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0, 'CREATE INDEX `idx_wl_subtask` ON `it_kanban_worklogs` (`issue_key`, `subtask_id`)', 'SELECT 1')
  FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'it_kanban_worklogs' AND INDEX_NAME = 'idx_wl_subtask');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Sales enquiry intake ──────────────────────────────────────────────────────────
-- Where the enquiry came from (beyond the source), the contact's role, the billing details a
-- quotation is filled from, the services asked for ([{ id, qty }] from the catalog) and when.
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `leads` ADD COLUMN `source_detail` varchar(255) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'source_detail');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `leads` ADD COLUMN `contact_designation` varchar(120) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'contact_designation');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `leads` ADD COLUMN `address` varchar(255) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'address');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `leads` ADD COLUMN `city` varchar(100) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'city');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `leads` ADD COLUMN `state` varchar(100) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'state');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `leads` ADD COLUMN `gstin` varchar(20) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'gstin');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `leads` ADD COLUMN `requirement_services` json DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'requirement_services');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `leads` ADD COLUMN `timeline` varchar(120) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'timeline');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
