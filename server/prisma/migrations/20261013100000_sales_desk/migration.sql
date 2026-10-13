-- Sales desk: customers, invoices with payments and receipts, monthly targets.
-- (routes/sales-desk-routes.js; also applied at runtime if missing.)
-- Safe to run more than once: tables are created if missing, columns added only when absent.

CREATE TABLE IF NOT EXISTS `sales_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receipt_number` varchar(40) DEFAULT NULL,
  `invoice_id` int NOT NULL,
  `company_id` int DEFAULT NULL,
  `deal_id` int DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `paid_on` date NOT NULL,
  `mode` varchar(30) DEFAULT NULL,
  `reference` varchar(120) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `by_id` int DEFAULT NULL,
  `by_name` varchar(120) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sp_invoice` (`invoice_id`),
  KEY `idx_sp_company` (`company_id`),
  KEY `idx_sp_paid_on` (`paid_on`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales_targets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `month` char(7) NOT NULL,
  `won_value` decimal(15,2) NOT NULL DEFAULT '0.00',
  `collection` decimal(15,2) NOT NULL DEFAULT '0.00',
  `deals_won` int NOT NULL DEFAULT '0',
  `enquiries` int NOT NULL DEFAULT '0',
  `activities` int NOT NULL DEFAULT '0',
  `updated_by` varchar(120) DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_st_user_month` (`user_id`,`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- New columns, each added only if missing.
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `invoices` ADD COLUMN `sent_at` datetime DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'sent_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `invoices` ADD COLUMN `sent_to` varchar(500) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'sent_to');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `invoices` ADD COLUMN `subject` varchar(255) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'subject');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `companies` ADD COLUMN `gstin` varchar(20) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'gstin');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `sales_events` ADD COLUMN `invoice_id` int DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_events' AND COLUMN_NAME = 'invoice_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `sales_events` ADD COLUMN `company_id` int DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_events' AND COLUMN_NAME = 'company_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
