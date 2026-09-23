-- Migration: Add UUID column to users and registration_requests tables
-- Purpose: Support secure non-sequential identifiers (Dual-ID Pattern)

-- 1. Add uuid to users table if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS uuid VARCHAR(36) NULL AFTER id;

-- 2. Add uuid to registration_requests table if not exists
ALTER TABLE registration_requests 
ADD COLUMN IF NOT EXISTS uuid VARCHAR(36) NULL AFTER id;

-- 3. Populate existing users with UUIDs if empty (MySQL 8.0+ has UUID(), fallback handled by JS runner)
UPDATE users 
SET uuid = UUID() 
WHERE uuid IS NULL OR uuid = '';

-- 4. Populate existing registration requests with UUIDs if empty
UPDATE registration_requests 
SET uuid = UUID() 
WHERE uuid IS NULL OR uuid = '';

-- 5. Add unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_requests_uuid ON registration_requests(uuid);
