-- Employee leave requests (also created at runtime by routes/leave-routes.js). Safe to run more than once.
CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `leave_type` varchar(20) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `days` decimal(4,1) NOT NULL,
  `half_day` tinyint(1) NOT NULL DEFAULT 0,
  `reason` varchar(500) DEFAULT NULL,
  `status` varchar(12) NOT NULL DEFAULT 'Pending',
  `decided_by` int DEFAULT NULL,
  `decided_by_name` varchar(120) DEFAULT NULL,
  `decision_note` varchar(500) DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_leave_user` (`user_id`),
  KEY `idx_leave_dates` (`start_date`, `end_date`),
  KEY `idx_leave_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
