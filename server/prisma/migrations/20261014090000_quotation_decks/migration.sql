-- A presentation quotation (deck) that the client accepts gets a hidden, already accepted billing
-- quotation behind it; this column points back at the deck. (routes/sales-flow-routes.js; also applied
-- at runtime if missing.) Safe to run more than once.

SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `estimations` ADD COLUMN `proposal_id` int DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'estimations' AND COLUMN_NAME = 'proposal_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
