-- Migration: Synchronize Task Performance Tables and Roles
-- Ensures task_id is VARCHAR(50) to support string issue keys (e.g., 'WR-101', 'MKT-102')
-- Ensures users.department_role supports 'Admin' in addition to 'Executive' and 'Manager'
-- Ensures 'Admin' role exists in roles table

-- 1. Ensure Admin role exists
INSERT INTO roles (id, name, description)
VALUES (2, 'Admin', 'Company-wide management - cannot change system settings')
ON DUPLICATE KEY UPDATE name = 'Admin';

-- 2. Expand users.department_role enum to safely allow 'Admin'
ALTER TABLE users 
MODIFY COLUMN department_role ENUM('Executive', 'Manager', 'Admin') DEFAULT 'Executive';

-- 3. Modify task_contributions for string task keys and user IDs
ALTER TABLE task_contributions
MODIFY COLUMN task_id VARCHAR(50) NOT NULL,
MODIFY COLUMN subtask_id VARCHAR(50) DEFAULT NULL,
MODIFY COLUMN user_id VARCHAR(50) NOT NULL,
MODIFY COLUMN role VARCHAR(50) DEFAULT NULL,
MODIFY COLUMN effort_points DECIMAL(10,2) DEFAULT 0.00,
MODIFY COLUMN approval_status VARCHAR(20) DEFAULT 'Pending',
MODIFY COLUMN approved_by VARCHAR(50) DEFAULT NULL,
MODIFY COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP;

-- 4. Modify task_history for string task keys
ALTER TABLE task_history
MODIFY COLUMN task_id VARCHAR(50) NOT NULL,
MODIFY COLUMN changed_by_user_id VARCHAR(50) DEFAULT NULL,
MODIFY COLUMN action_type VARCHAR(100) DEFAULT NULL,
MODIFY COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP;

-- 5. Modify task_subtasks for string task keys
ALTER TABLE task_subtasks
MODIFY COLUMN task_id VARCHAR(50) NOT NULL,
MODIFY COLUMN description TEXT DEFAULT NULL,
MODIFY COLUMN point_value DECIMAL(10,2) DEFAULT 0.00,
MODIFY COLUMN status VARCHAR(50) DEFAULT 'To Do',
MODIFY COLUMN assigned_to_user_id VARCHAR(50) DEFAULT NULL,
MODIFY COLUMN created_by_user_id VARCHAR(50) DEFAULT NULL,
MODIFY COLUMN completed_by_user_id VARCHAR(50) DEFAULT NULL,
MODIFY COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP;

-- 6. Modify task_time_logs for string task keys
ALTER TABLE task_time_logs
MODIFY COLUMN task_id VARCHAR(50) NOT NULL,
MODIFY COLUMN user_id VARCHAR(50) NOT NULL,
MODIFY COLUMN description TEXT DEFAULT NULL,
MODIFY COLUMN status VARCHAR(20) DEFAULT 'Approved',
MODIFY COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP;
