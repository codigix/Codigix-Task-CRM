-- Migration: Create and enhance sprints and it_kanban_issues schema
-- Applies to: deals_db / task_crm_db_prod

-- 1. Create sprints table if not exists
CREATE TABLE IF NOT EXISTS sprints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NULL,
  name VARCHAR(255) NOT NULL,
  goal TEXT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  status ENUM('Planned', 'Active', 'Completed', 'Cancelled') DEFAULT 'Planned',
  department VARCHAR(50) DEFAULT 'IT',
  completed_at DATETIME DEFAULT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_project_id (project_id),
  INDEX idx_department (department),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Modify it_kanban_issues table column sizes and types
ALTER TABLE it_kanban_issues MODIFY COLUMN title TEXT NOT NULL;
ALTER TABLE it_kanban_issues MODIFY COLUMN sprint VARCHAR(255) DEFAULT NULL;
ALTER TABLE it_kanban_issues MODIFY COLUMN assignee VARCHAR(255) DEFAULT 'Unassigned';
ALTER TABLE it_kanban_issues MODIFY COLUMN reporter VARCHAR(255) DEFAULT 'Unassigned';
ALTER TABLE it_kanban_issues MODIFY COLUMN type VARCHAR(100) DEFAULT 'Task';
ALTER TABLE it_kanban_issues MODIFY COLUMN priority VARCHAR(100) DEFAULT 'Medium';
ALTER TABLE it_kanban_issues MODIFY COLUMN status VARCHAR(100) DEFAULT 'TO DO';

-- 3. Ensure it_kanban_attachments table exists
CREATE TABLE IF NOT EXISTS it_kanban_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issue_key VARCHAR(50) NOT NULL,
  issue_id INT NULL,
  subtask_id VARCHAR(100) NULL DEFAULT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size VARCHAR(50) DEFAULT '0 KB',
  file_type VARCHAR(100) DEFAULT 'document',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_issue_key (issue_key),
  INDEX idx_issue_id (issue_id),
  INDEX idx_subtask_id (subtask_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
