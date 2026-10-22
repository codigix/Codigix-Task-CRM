-- What each user granted on Google's consent screen (space-separated scopes), so email is only sent
-- from their Gmail when they ticked the Gmail permission.
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `google_oauth` ADD COLUMN `scopes` text DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'google_oauth' AND COLUMN_NAME = 'scopes');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Which OAuth client issued the refresh token. NULL = connected before this column existed (the legacy client).
SET @sql := (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `google_oauth` ADD COLUMN `client_id` varchar(150) DEFAULT NULL', 'SELECT 1')
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'google_oauth' AND COLUMN_NAME = 'client_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
