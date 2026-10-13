-- Meetings (schedule -> task -> MOM), the Google connection used to create Meet links, the meeting link on
-- general_tasks, and the two kb_items columns the knowledge base added at runtime. These objects are also
-- created at runtime if missing (routes/meetings-routes.js, routes/knowledge-routes.js). Safe to run more than once,
-- on a database where they do not exist yet or where the runtime already created them.

CREATE TABLE IF NOT EXISTS `meetings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `kind` varchar(20) NOT NULL DEFAULT 'offline',
  `scheduled_at` datetime NOT NULL,
  `duration_min` int NOT NULL DEFAULT 60,
  `location` varchar(500) DEFAULT NULL,
  `meet_link` varchar(500) DEFAULT NULL,
  `google_event_id` varchar(200) DEFAULT NULL,
  `google_owner` varchar(40) DEFAULT NULL,
  `meet_provider` varchar(20) DEFAULT NULL,
  `agenda` text,
  `status` varchar(20) NOT NULL DEFAULT 'Scheduled',
  `department` varchar(80) DEFAULT NULL,
  `project_id` int DEFAULT NULL,
  `sprint_id` int DEFAULT NULL,
  `host_id` int NOT NULL,
  `host_name` varchar(120) DEFAULT NULL,
  `task_id` int DEFAULT NULL,
  `sprint_task_id` int DEFAULT NULL,
  `cal_event_id` int DEFAULT NULL,
  `issue_key` varchar(50) DEFAULT NULL,
  `guest_emails` json DEFAULT NULL,
  `action_keys` json DEFAULT NULL,
  `reschedule_count` int NOT NULL DEFAULT 0,
  `cancel_reason` varchar(500) DEFAULT NULL,
  `mom` text,
  `mom_decisions` text,
  `mom_submitted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_m_project` (`project_id`),
  KEY `idx_m_sprint` (`sprint_id`),
  KEY `idx_m_host` (`host_id`),
  KEY `idx_m_issue` (`issue_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A meetings table created by an earlier release lacks the columns/indexes added since.
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `meetings` ADD COLUMN `project_id` int DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meetings' AND COLUMN_NAME = 'project_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `meetings` ADD COLUMN `sprint_id` int DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meetings' AND COLUMN_NAME = 'sprint_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `meetings` ADD COLUMN `google_event_id` varchar(200) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meetings' AND COLUMN_NAME = 'google_event_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `meetings` ADD COLUMN `google_owner` varchar(40) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meetings' AND COLUMN_NAME = 'google_owner');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `meetings` ADD COLUMN `meet_provider` varchar(20) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meetings' AND COLUMN_NAME = 'meet_provider');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `meetings` ADD COLUMN `sprint_task_id` int DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meetings' AND COLUMN_NAME = 'sprint_task_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `meetings` ADD COLUMN `cal_event_id` int DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meetings' AND COLUMN_NAME = 'cal_event_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `meetings` ADD COLUMN `issue_key` varchar(50) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meetings' AND COLUMN_NAME = 'issue_key');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `meetings` ADD COLUMN `guest_emails` json DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meetings' AND COLUMN_NAME = 'guest_emails');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `meetings` ADD COLUMN `action_keys` json DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meetings' AND COLUMN_NAME = 'action_keys');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `meetings` ADD COLUMN `reschedule_count` int NOT NULL DEFAULT 0', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meetings' AND COLUMN_NAME = 'reschedule_count');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `meetings` ADD COLUMN `cancel_reason` varchar(500) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meetings' AND COLUMN_NAME = 'cancel_reason');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `meetings` ADD INDEX `idx_m_project` (`project_id`)', 'SELECT 1')
  FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meetings' AND INDEX_NAME = 'idx_m_project');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `meetings` ADD INDEX `idx_m_sprint` (`sprint_id`)', 'SELECT 1')
  FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meetings' AND INDEX_NAME = 'idx_m_sprint');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `meetings` ADD INDEX `idx_m_host` (`host_id`)', 'SELECT 1')
  FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meetings' AND INDEX_NAME = 'idx_m_host');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `meetings` ADD INDEX `idx_m_issue` (`issue_key`)', 'SELECT 1')
  FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meetings' AND INDEX_NAME = 'idx_m_issue');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `meeting_attendees` (
  `meeting_id` int NOT NULL,
  `user_id` int NOT NULL,
  `name` varchar(120) DEFAULT NULL,
  `email` varchar(180) DEFAULT NULL,
  `responded` varchar(20) NOT NULL DEFAULT 'pending',
  `attended` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`meeting_id`, `user_id`),
  KEY `idx_ma_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `meeting_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `meeting_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `user_name` varchar(120) DEFAULT NULL,
  `action` varchar(40) NOT NULL,
  `detail` varchar(600) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ml_meeting` (`meeting_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per connected Google account; refresh_token is stored encrypted (AES-256-GCM) by the application.
CREATE TABLE IF NOT EXISTS `google_oauth` (
  `user_id` int NOT NULL,
  `email` varchar(190) DEFAULT NULL,
  `refresh_token` text NOT NULL,
  `is_org` tinyint(1) NOT NULL DEFAULT 0,
  `connected_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A meeting's task in the To-do list points back at the meeting.
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `general_tasks` ADD COLUMN `meeting_id` int DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'general_tasks' AND COLUMN_NAME = 'meeting_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Knowledge base: department/specific sharing (only when kb_items exists; the runtime creates it otherwise).
SET @sql := (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kb_items') = 0
    OR (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kb_items' AND COLUMN_NAME = 'department') > 0,
    'SELECT 1', 'ALTER TABLE `kb_items` ADD COLUMN `department` varchar(80) DEFAULT NULL AFTER `project_id`'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kb_items') = 0
    OR (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kb_items' AND COLUMN_NAME = 'shared_with') > 0,
    'SELECT 1', 'ALTER TABLE `kb_items` ADD COLUMN `shared_with` json DEFAULT NULL AFTER `visibility`'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*) = 0, 'SELECT 1', 'ALTER TABLE `kb_items` MODIFY COLUMN `visibility` varchar(20) NOT NULL DEFAULT ''team''')
  FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kb_items');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
