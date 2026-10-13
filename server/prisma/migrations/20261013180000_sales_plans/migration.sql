-- Sales plans: monthly retainers and projects (scope, milestones), month / milestone invoices,
-- and advance payments that belong to a customer before any invoice exists.
-- (routes/sales-flow-routes.js, routes/sales-desk-routes.js; also applied at runtime if missing.)
-- Safe to run more than once.

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `estimations` ADD COLUMN `quote_type` varchar(20) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'estimations' AND COLUMN_NAME = 'quote_type');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `estimations` ADD COLUMN `plan` json DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'estimations' AND COLUMN_NAME = 'plan');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `invoices` ADD COLUMN `service_month` char(7) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'service_month');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `invoices` ADD COLUMN `milestone_no` int DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'milestone_no');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `invoices` ADD COLUMN `milestone_name` varchar(120) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'milestone_name');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- An advance is a payment with no invoice yet.
ALTER TABLE `sales_payments` MODIFY COLUMN `invoice_id` int DEFAULT NULL;
