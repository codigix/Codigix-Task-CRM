-- CreateTable
CREATE TABLE `activities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `activity_type` ENUM('Call', 'Email', 'Meeting', 'Note', 'Follow-up', 'Task') NULL DEFAULT 'Note',
    `title` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NULL,
    `status` ENUM('Pending', 'Completed', 'Cancelled') NULL DEFAULT 'Pending',
    `priority` ENUM('Low', 'Medium', 'High', 'Critical') NULL DEFAULT 'Medium',
    `contact_id` INTEGER NULL,
    `deal_id` INTEGER NULL,
    `project_id` INTEGER NULL,
    `company_id` INTEGER NULL,
    `lead_id` INTEGER NULL,
    `task_id` INTEGER NULL,
    `assigned_to` INTEGER NULL,
    `created_by` INTEGER NULL,
    `scheduled_date` DATETIME(0) NULL,
    `scheduled_time` TIME(0) NULL,
    `completed_date` DATETIME(0) NULL,
    `duration_minutes` INTEGER NULL,
    `meeting_link` VARCHAR(500) NULL,
    `notes` LONGTEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `assigned_to`(`assigned_to`),
    INDEX `created_by`(`created_by`),
    INDEX `idx_activity_type`(`activity_type`),
    INDEX `idx_company_id`(`company_id`),
    INDEX `idx_contact_id`(`contact_id`),
    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_deal_id`(`deal_id`),
    INDEX `idx_lead_id`(`lead_id`),
    INDEX `idx_project_id`(`project_id`),
    INDEX `idx_status`(`status`),
    INDEX `idx_task_id`(`task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `approvals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `approval_type` VARCHAR(100) NOT NULL,
    `entity_id` INTEGER NULL,
    `entity_name` VARCHAR(255) NULL,
    `description` LONGTEXT NULL,
    `requested_by` INTEGER NULL,
    `approver` INTEGER NULL,
    `priority` ENUM('Low', 'Medium', 'High') NULL DEFAULT 'Medium',
    `status` ENUM('Pending', 'Approved', 'Rejected') NULL DEFAULT 'Pending',
    `discount_percentage` DECIMAL(5, 2) NULL,
    `discount_amount` DECIMAL(15, 2) NULL,
    `change_scope` LONGTEXT NULL,
    `impact_assessment` LONGTEXT NULL,
    `approval_comments` LONGTEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_approval_type`(`approval_type`),
    INDEX `idx_approver`(`approver`),
    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_status`(`status`),
    INDEX `requested_by`(`requested_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `automation_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `entity_type` ENUM('Lead', 'Deal', 'Invoice', 'Project', 'Task') NOT NULL,
    `trigger_condition` TEXT NOT NULL,
    `action_type` VARCHAR(100) NOT NULL,
    `action_payload` JSON NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `automation_scripts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `test_case_id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `status` ENUM('Passed', 'Failed', 'Broken') NULL DEFAULT 'Passed',
    `last_run` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `test_case_id`(`test_case_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bugs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `module` VARCHAR(100) NULL,
    `bug_type` VARCHAR(100) NULL DEFAULT 'Functional',
    `status` ENUM('Open', 'In Progress', 'Resolved', 'Closed') NULL DEFAULT 'Open',
    `priority` ENUM('Low', 'Medium', 'High') NULL DEFAULT 'Medium',
    `severity` ENUM('Minor', 'Major', 'Critical') NULL DEFAULT 'Minor',
    `assignee` VARCHAR(100) NULL,
    `reporter` VARCHAR(100) NULL,
    `environment` VARCHAR(100) NULL DEFAULT 'QA',
    `description` TEXT NULL,
    `expected_results` TEXT NULL,
    `actual_results` TEXT NULL,
    `steps` JSON NULL,
    `attachments` JSON NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `call_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `caller_name` VARCHAR(255) NOT NULL,
    `caller_email` VARCHAR(150) NULL,
    `caller_avatar` LONGTEXT NULL,
    `phone_number` VARCHAR(20) NULL,
    `call_type` ENUM('Audio Call', 'Video Call') NULL DEFAULT 'Audio Call',
    `call_direction` ENUM('Incoming', 'Outgoing', 'Missed Call') NULL DEFAULT 'Outgoing',
    `duration` INTEGER NULL DEFAULT 0,
    `started_at` TIMESTAMP(0) NULL,
    `ended_at` TIMESTAMP(0) NULL,
    `meeting_link` VARCHAR(255) NULL,
    `notes` LONGTEXT NULL,
    `created_by` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_call_type`(`call_type`),
    INDEX `idx_caller`(`caller_name`),
    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_direction`(`call_direction`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_performance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaign_id` INTEGER NOT NULL,
    `metric_name` VARCHAR(100) NOT NULL,
    `metric_value` DECIMAL(15, 2) NOT NULL,
    `recorded_at` DATE NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_campaign_id`(`campaign_id`),
    INDEX `idx_recorded_at`(`recorded_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaigns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NULL,
    `status` ENUM('Draft', 'Active', 'Paused', 'Completed', 'Cancelled') NULL DEFAULT 'Draft',
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `budget` DECIMAL(15, 2) NULL,
    `currency` VARCHAR(10) NULL DEFAULT 'USD',
    `created_by` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_name`(`name`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_group_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `group_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `role` ENUM('Member', 'Admin') NULL DEFAULT 'Member',
    `joined_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `user_id`(`user_id`),
    UNIQUE INDEX `unique_member`(`group_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `department_id` INTEGER NULL,
    `created_by` INTEGER NULL,
    `avatar` LONGTEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `created_by`(`created_by`),
    INDEX `department_id`(`department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `code_reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `pull_request_url` VARCHAR(500) NULL,
    `status` ENUM('Pending', 'In Review', 'Approved', 'Rejected', 'Merged') NULL DEFAULT 'Pending',
    `reviewer_id` INTEGER NULL,
    `author_id` INTEGER NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `author_id`(`author_id`),
    INDEX `idx_project_id`(`project_id`),
    INDEX `idx_status`(`status`),
    INDEX `reviewer_id`(`reviewer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `deal_id` INTEGER NULL,
    `invoice_id` INTEGER NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `percentage` DECIMAL(5, 2) NULL,
    `status` ENUM('Pending', 'Approved', 'Paid', 'Cancelled') NULL DEFAULT 'Pending',
    `approved_by` INTEGER NULL,
    `approved_at` DATETIME(0) NULL,
    `paid_at` DATETIME(0) NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `approved_by`(`approved_by`),
    INDEX `deal_id`(`deal_id`),
    INDEX `idx_status`(`status`),
    INDEX `idx_user_id`(`user_id`),
    INDEX `invoice_id`(`invoice_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `companies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(150) NULL,
    `phone` VARCHAR(20) NULL,
    `website` VARCHAR(255) NULL,
    `industry` VARCHAR(100) NULL,
    `revenue` DECIMAL(15, 2) NULL,
    `employees` INTEGER NULL,
    `description` TEXT NULL,
    `logo` LONGTEXT NULL,
    `address` VARCHAR(255) NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `country` VARCHAR(100) NULL,
    `zipcode` VARCHAR(20) NULL,
    `status` ENUM('Active', 'Inactive', 'Prospect') NULL DEFAULT 'Active',
    `created_by` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `facebook` VARCHAR(255) NULL,
    `linkedin` VARCHAR(255) NULL,
    `twitter` VARCHAR(255) NULL,
    `whatsapp` VARCHAR(255) NULL,
    `instagram` VARCHAR(255) NULL,
    `skype` VARCHAR(255) NULL,
    `email_opt_out` BOOLEAN NULL DEFAULT false,
    `phone2` VARCHAR(20) NULL,
    `fax` VARCHAR(20) NULL,
    `reviews` VARCHAR(100) NULL,
    `tags` VARCHAR(500) NULL,
    `source` VARCHAR(100) NULL,
    `currency` VARCHAR(10) NULL DEFAULT 'USD',
    `language` VARCHAR(50) NULL DEFAULT 'English',
    `owner` VARCHAR(255) NULL,
    `visibility` ENUM('Public', 'Private', 'People') NULL DEFAULT 'Private',
    `people_assigned` LONGTEXT NULL,
    `deals_text` TEXT NULL,

    INDEX `idx_company_name`(`company_name`),
    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_name` VARCHAR(255) NOT NULL,
    `plan_type` VARCHAR(100) NULL,
    `plan_position` INTEGER NULL,
    `plan_currency` VARCHAR(10) NULL,
    `plan_currency_free` VARCHAR(10) NULL,
    `discount_type` VARCHAR(50) NULL,
    `discount` DECIMAL(10, 2) NULL,
    `limitations_invoices` INTEGER NULL,
    `max_customers` INTEGER NULL,
    `product` VARCHAR(255) NULL,
    `supplier` VARCHAR(255) NULL,
    `modules` LONGTEXT NULL,
    `access_trial` BOOLEAN NULL DEFAULT false,
    `trial_days` INTEGER NULL,
    `status` VARCHAR(50) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_plan_name`(`plan_name`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contact_tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NULL,
    `contact_id` INTEGER NOT NULL,
    `status` ENUM('Open', 'In Progress', 'Completed', 'On Hold') NULL DEFAULT 'Open',
    `priority` ENUM('Low', 'Medium', 'High', 'Critical') NULL DEFAULT 'Medium',
    `assigned_to` INTEGER NULL,
    `created_by` INTEGER NULL,
    `due_date` DATE NULL,
    `completed_date` DATETIME(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `assigned_to`(`assigned_to`),
    INDEX `created_by`(`created_by`),
    INDEX `idx_contact_id`(`contact_id`),
    INDEX `idx_due_date`(`due_date`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contacts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NULL,
    `email` VARCHAR(150) NULL,
    `phone` VARCHAR(20) NULL,
    `company_id` INTEGER NULL,
    `company_name` VARCHAR(255) NULL,
    `position` VARCHAR(100) NULL,
    `department` VARCHAR(100) NULL,
    `source` VARCHAR(100) NULL,
    `status` ENUM('Active', 'Inactive') NULL DEFAULT 'Active',
    `avatar` LONGTEXT NULL,
    `notes` LONGTEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `address` VARCHAR(255) NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `country` VARCHAR(100) NULL,
    `tag` VARCHAR(100) NULL,
    `owner_id` INTEGER NULL,

    INDEX `idx_company_id`(`company_id`),
    INDEX `idx_email`(`email`),
    INDEX `idx_first_name`(`first_name`),
    INDEX `idx_owner_id`(`owner_id`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `content_calendar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content_type` ENUM('Blog', 'Social Post', 'Video', 'Newsletter', 'Other') NOT NULL,
    `scheduled_date` DATETIME(0) NOT NULL,
    `status` ENUM('Draft', 'Review', 'Approved', 'Scheduled', 'Published') NULL DEFAULT 'Draft',
    `assigned_to` INTEGER NULL,
    `platform` VARCHAR(100) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `assigned_to`(`assigned_to`),
    INDEX `idx_project_id`(`project_id`),
    INDEX `idx_scheduled_date`(`scheduled_date`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contracts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject` VARCHAR(255) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `client_id` INTEGER NOT NULL,
    `contract_type` VARCHAR(100) NOT NULL,
    `contract_value` DECIMAL(15, 2) NOT NULL,
    `description` LONGTEXT NULL,
    `status` ENUM('Draft', 'Active', 'Completed', 'Terminated') NULL DEFAULT 'Draft',
    `created_by` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `proposal_id` INTEGER NULL,
    `deal_id` INTEGER NULL,
    `files` LONGTEXT NULL,

    INDEX `created_by`(`created_by`),
    INDEX `idx_client_id`(`client_id`),
    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_end_date`(`end_date`),
    INDEX `idx_proposal_id`(`proposal_id`),
    INDEX `idx_start_date`(`start_date`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `participant1_id` INTEGER NOT NULL,
    `participant2_id` INTEGER NOT NULL,
    `last_message_text` LONGTEXT NULL,
    `last_message_timestamp` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_participant1_id`(`participant1_id`),
    INDEX `idx_participant2_id`(`participant2_id`),
    INDEX `idx_updated_at`(`updated_at`),
    UNIQUE INDEX `unique_conversation`(`participant1_id`, `participant2_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `creative_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NULL,
    `request_type` ENUM('Graphic', 'Video', 'Content', 'Logo', 'Other') NOT NULL,
    `status` ENUM('Requested', 'In Design', 'Review', 'Approved', 'Rejected') NULL DEFAULT 'Requested',
    `priority` ENUM('Low', 'Medium', 'High', 'Critical') NULL DEFAULT 'Medium',
    `requested_by` INTEGER NULL,
    `assigned_to` INTEGER NULL,
    `due_date` DATE NULL,
    `attachment_url` VARCHAR(500) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `assigned_to`(`assigned_to`),
    INDEX `idx_project_id`(`project_id`),
    INDEX `idx_status`(`status`),
    INDEX `requested_by`(`requested_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deal_name` VARCHAR(255) NOT NULL,
    `company_id` INTEGER NULL,
    `contact_id` INTEGER NULL,
    `assignee_id` INTEGER NULL,
    `deal_value` DECIMAL(15, 2) NULL,
    `currency` VARCHAR(10) NULL DEFAULT 'USD',
    `deal_stage` VARCHAR(100) NULL,
    `pipeline` VARCHAR(100) NULL,
    `status` VARCHAR(100) NULL,
    `probability` INTEGER NULL,
    `department_id` INTEGER NULL,
    `expected_close_date` DATE NULL,
    `due_date` DATE NULL,
    `follow_up_date` DATE NULL,
    `source` VARCHAR(100) NULL,
    `priority` VARCHAR(50) NULL DEFAULT 'Medium',
    `period` VARCHAR(100) NULL,
    `period_value` INTEGER NULL,
    `tags` VARCHAR(500) NULL,
    `description` LONGTEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `pipeline_stage_id` INTEGER NULL,
    `service_category_id` INTEGER NULL,
    `discount_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `discount_reason` TEXT NULL,
    `discount_approved_by` INTEGER NULL,
    `discount_status` ENUM('None', 'Pending', 'Approved', 'Rejected') NULL DEFAULT 'None',
    `services` JSON NULL,

    INDEX `FK_deal_pipeline_stage`(`pipeline_stage_id`),
    INDEX `fk_deals_department`(`department_id`),
    INDEX `idx_company_id`(`company_id`),
    INDEX `idx_deal_stage`(`deal_stage`),
    INDEX `idx_expected_close_date`(`expected_close_date`),
    INDEX `idx_status`(`status`),
    INDEX `service_category_id`(`service_category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `delete_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('Pending', 'Approved', 'Rejected') NULL DEFAULT 'Pending',
    `requested_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `reviewed_by` INTEGER NULL,
    `reviewed_at` TIMESTAMP(0) NULL,

    INDEX `idx_status`(`status`),
    INDEX `idx_user_id`(`user_id`),
    INDEX `reviewed_by`(`reviewed_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deployments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `environment` ENUM('Staging', 'Production', 'Development') NOT NULL,
    `version` VARCHAR(100) NULL,
    `status` ENUM('Pending', 'In Progress', 'Success', 'Failed', 'Rolled Back') NULL DEFAULT 'Pending',
    `deployed_by` INTEGER NULL,
    `approved_by` INTEGER NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `approved_by`(`approved_by`),
    INDEX `deployed_by`(`deployed_by`),
    INDEX `idx_environment`(`environment`),
    INDEX `idx_project_id`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `entity_files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `file_id` INTEGER NOT NULL,
    `company_id` INTEGER NULL,
    `deal_id` INTEGER NULL,
    `contact_id` INTEGER NULL,
    `project_id` INTEGER NULL,
    `uploaded_by` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_company_id`(`company_id`),
    INDEX `idx_contact_id`(`contact_id`),
    INDEX `idx_deal_id`(`deal_id`),
    INDEX `idx_file_id`(`file_id`),
    INDEX `idx_project_id`(`project_id`),
    INDEX `uploaded_by`(`uploaded_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `entity_notes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NOT NULL,
    `contact_id` INTEGER NULL,
    `company_id` INTEGER NULL,
    `deal_id` INTEGER NULL,
    `project_id` INTEGER NULL,
    `lead_id` INTEGER NULL,
    `task_id` INTEGER NULL,
    `priority` ENUM('Low', 'Medium', 'High') NULL DEFAULT 'Medium',
    `is_important` BOOLEAN NULL DEFAULT false,
    `created_by` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `created_by`(`created_by`),
    INDEX `idx_company_id`(`company_id`),
    INDEX `idx_contact_id`(`contact_id`),
    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_deal_id`(`deal_id`),
    INDEX `idx_lead_id`(`lead_id`),
    INDEX `idx_priority`(`priority`),
    INDEX `idx_project_id`(`project_id`),
    INDEX `idx_task_id`(`task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estimation_line_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estimation_id` INTEGER NOT NULL,
    `item_name` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `rate` DECIMAL(15, 2) NOT NULL,
    `discount_percent` DECIMAL(5, 2) NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `tax_percent` DECIMAL(5, 2) NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `subtotal` DECIMAL(15, 2) NULL,
    `total` DECIMAL(15, 2) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_estimation_id`(`estimation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estimations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estimation_number` VARCHAR(50) NOT NULL,
    `client_id` INTEGER NULL,
    `lead_id` INTEGER NULL,
    `contact_id` INTEGER NULL,
    `project_id` INTEGER NULL,
    `parent_id` INTEGER NULL,
    `version` INTEGER NULL DEFAULT 1,
    `bill_to` VARCHAR(255) NULL,
    `ship_to` VARCHAR(255) NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(10) NULL DEFAULT 'USD',
    `estimate_date` DATE NULL,
    `expiry_date` DATE NULL,
    `status` ENUM('Draft', 'Sent', 'Accepted', 'Declined', 'Revised', 'Finalized') NULL DEFAULT 'Draft',
    `description` LONGTEXT NULL,
    `tags` LONGTEXT NULL,
    `estimate_by` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deal_id` INTEGER NULL,
    `subtotal` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `discount_percentage` DECIMAL(5, 2) NULL DEFAULT 0.00,
    `tax_percentage` DECIMAL(5, 2) NULL DEFAULT 0.00,
    `total` DECIMAL(15, 2) NULL,
    `discount_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,

    UNIQUE INDEX `estimation_number`(`estimation_number`),
    INDEX `FK_estimation_deal`(`deal_id`),
    INDEX `estimate_by`(`estimate_by`),
    INDEX `fk_estimations_lead`(`lead_id`),
    INDEX `fk_estimations_parent`(`parent_id`),
    INDEX `idx_client_id`(`client_id`),
    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_estimate_date`(`estimate_date`),
    INDEX `idx_estimation_number`(`estimation_number`),
    INDEX `idx_status`(`status`),
    INDEX `project_id`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `file_folders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `parent_id` INTEGER NULL,
    `storage_type` ENUM('Internal', 'Dropbox', 'Google Drive', 'Cloud Storage') NULL DEFAULT 'Internal',
    `path` VARCHAR(500) NULL,
    `size_bytes` BIGINT NULL DEFAULT 0,
    `file_count` INTEGER NULL DEFAULT 0,
    `is_shared` BOOLEAN NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_parent_id`(`parent_id`),
    INDEX `idx_storage_type`(`storage_type`),
    INDEX `idx_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `file_shares` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `file_id` INTEGER NULL,
    `folder_id` INTEGER NULL,
    `shared_by_id` INTEGER NOT NULL,
    `shared_with_id` INTEGER NOT NULL,
    `permission` ENUM('View', 'Edit', 'Download') NULL DEFAULT 'View',
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `file_id`(`file_id`),
    INDEX `folder_id`(`folder_id`),
    INDEX `idx_shared_by_id`(`shared_by_id`),
    INDEX `idx_shared_with_id`(`shared_with_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `folder_id` INTEGER NULL,
    `name` VARCHAR(255) NOT NULL,
    `file_type` VARCHAR(50) NULL,
    `size_bytes` BIGINT NOT NULL,
    `storage_type` ENUM('Internal', 'Dropbox', 'Google Drive', 'Cloud Storage') NULL DEFAULT 'Internal',
    `file_path` VARCHAR(500) NULL,
    `mime_type` VARCHAR(100) NULL,
    `is_favorite` BOOLEAN NULL DEFAULT false,
    `is_shared` BOOLEAN NULL DEFAULT false,
    `access_count` INTEGER NULL DEFAULT 0,
    `lead_id` INTEGER NULL,
    `contact_id` INTEGER NULL,
    `company_id` INTEGER NULL,
    `deal_id` INTEGER NULL,
    `project_id` INTEGER NULL,
    `task_id` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_company_id`(`company_id`),
    INDEX `idx_contact_id`(`contact_id`),
    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_deal_id`(`deal_id`),
    INDEX `idx_file_type`(`file_type`),
    INDEX `idx_folder_id`(`folder_id`),
    INDEX `idx_is_favorite`(`is_favorite`),
    INDEX `idx_lead_id`(`lead_id`),
    INDEX `idx_project_id`(`project_id`),
    INDEX `idx_storage_type`(`storage_type`),
    INDEX `idx_task_id`(`task_id`),
    INDEX `idx_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `followups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `related_type` ENUM('Lead', 'Deal', 'Customer', 'Invoice') NOT NULL,
    `related_id` INTEGER NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `scheduled_date` DATE NOT NULL,
    `scheduled_time` TIME(0) NOT NULL,
    `priority` ENUM('Low', 'Medium', 'High') NULL DEFAULT 'Medium',
    `reminder_before` VARCHAR(50) NULL,
    `is_recurring` BOOLEAN NULL DEFAULT false,
    `recurrence_frequency` VARCHAR(50) NULL,
    `recurrence_end_date` DATE NULL,
    `meeting_link` VARCHAR(500) NULL,
    `meeting_location` VARCHAR(255) NULL,
    `meeting_duration` VARCHAR(50) NULL,
    `assigned_to` INTEGER NULL,
    `assigned_to_name` VARCHAR(255) NULL,
    `status` ENUM('Scheduled', 'Completed', 'Pending', 'Overdue', 'Cancelled', 'Client Joined') NULL DEFAULT 'Scheduled',
    `outcome` VARCHAR(100) NULL,
    `call_duration` VARCHAR(50) NULL,
    `remarks` TEXT NULL,
    `next_followup_date` DATE NULL,
    `next_followup_time` TIME(0) NULL,
    `next_followup_type` VARCHAR(100) NULL,
    `previous_followup_id` INTEGER NULL,
    `lead_id` INTEGER NULL,
    `deal_id` INTEGER NULL,
    `contact_id` INTEGER NULL,
    `invoice_id` INTEGER NULL,
    `task_id` INTEGER NULL,
    `project_id` INTEGER NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `recording_url` VARCHAR(500) NULL,
    `transcript` LONGTEXT NULL,
    `ai_summary` TEXT NULL,
    `ai_sentiment` VARCHAR(50) NULL,
    `ai_key_points` JSON NULL,
    `ai_suggested_actions` JSON NULL,
    `ai_outcome_classification` VARCHAR(50) NULL,
    `client_email` VARCHAR(150) NULL,
    `client_phone` VARCHAR(20) NULL,
    `calendar_event_id` VARCHAR(255) NULL,
    `formal_message` TEXT NULL,
    `assigned_to_email` VARCHAR(150) NULL,

    INDEX `idx_contact_id`(`contact_id`),
    INDEX `idx_deal_id`(`deal_id`),
    INDEX `idx_invoice_id`(`invoice_id`),
    INDEX `idx_lead_id`(`lead_id`),
    INDEX `idx_previous_followup`(`previous_followup_id`),
    INDEX `idx_project_id`(`project_id`),
    INDEX `idx_related`(`related_type`, `related_id`),
    INDEX `idx_scheduled`(`scheduled_date`, `scheduled_time`),
    INDEX `idx_status`(`status`),
    INDEX `idx_task_id`(`task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `general_tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NULL,
    `status` ENUM('To Do', 'In Progress', 'Review', 'Completed', 'On Hold', 'Cancelled', 'Open') NULL DEFAULT 'To Do',
    `priority` ENUM('Low', 'Medium', 'High', 'Critical') NULL DEFAULT 'Medium',
    `assigned_to` LONGTEXT NULL,
    `due_date` DATE NULL,
    `tags` LONGTEXT NULL,
    `linked_type` ENUM('General', 'Deal', 'Project', 'Lead') NULL DEFAULT 'General',
    `linked_id` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `workflow_type` VARCHAR(100) NULL,
    `department_id` INTEGER NULL,
    `sprint_id` INTEGER NULL,
    `task_type` VARCHAR(100) NULL,
    `created_by` INTEGER NULL,
    `due_time` TIME(0) NULL,
    `next_followup_date` DATE NULL,
    `internal_notes` LONGTEXT NULL,
    `reminder_date` DATETIME(0) NULL,
    `category` VARCHAR(100) NULL,
    `sub_type` VARCHAR(100) NULL,
    `project_id` INTEGER NULL,

    INDEX `fk_tasks_project`(`project_id`),
    INDEX `idx_due_date`(`due_date`),
    INDEX `idx_linked_id`(`linked_id`),
    INDEX `idx_linked_type`(`linked_type`),
    INDEX `idx_priority`(`priority`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `github_commits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `task_key` VARCHAR(50) NOT NULL,
    `commit_hash` VARCHAR(100) NOT NULL,
    `message` TEXT NULL,
    `author` VARCHAR(100) NULL,
    `url` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `commit_hash`(`commit_hash`),
    INDEX `idx_task_key`(`task_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `github_connections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NULL,
    `github_account_id` VARCHAR(255) NULL,
    `github_account_name` VARCHAR(255) NULL,
    `installation_id` VARCHAR(255) NULL,
    `app_id` VARCHAR(255) NULL,
    `status` VARCHAR(50) NULL DEFAULT 'connected',
    `connected_by` INTEGER NULL,
    `connected_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `last_sync_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `github_prs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `task_key` VARCHAR(50) NOT NULL,
    `pr_number` INTEGER NOT NULL,
    `title` VARCHAR(255) NULL,
    `state` VARCHAR(50) NULL,
    `url` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_task_key`(`task_key`),
    UNIQUE INDEX `unique_pr`(`task_key`, `pr_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `github_repositories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `connection_id` INTEGER NULL,
    `github_repo_id` VARCHAR(255) NULL,
    `repository_name` VARCHAR(255) NULL,
    `full_name` VARCHAR(255) NULL,
    `owner` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `html_url` VARCHAR(255) NULL,
    `clone_url` VARCHAR(255) NULL,
    `ssh_url` VARCHAR(255) NULL,
    `visibility` VARCHAR(50) NULL,
    `default_branch` VARCHAR(100) NULL,
    `language` VARCHAR(100) NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `github_created_at` TIMESTAMP(0) NULL,
    `github_updated_at` TIMESTAMP(0) NULL,
    `last_sync_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `contributors` JSON NULL,
    `last_commit_msg` TEXT NULL,
    `last_commit_hash` VARCHAR(100) NULL,

    UNIQUE INDEX `unique_github_repo_id`(`github_repo_id`),
    UNIQUE INDEX `unique_repo_connection`(`connection_id`, `github_repo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gmb_management` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `location_name` VARCHAR(255) NOT NULL,
    `map_url` VARCHAR(500) NULL,
    `average_rating` DECIMAL(3, 2) NULL DEFAULT 0.00,
    `total_reviews` INTEGER NULL DEFAULT 0,
    `status` ENUM('Active', 'Needs Optimization', 'Pending Verification', 'Suspended') NULL DEFAULT 'Active',
    `last_post_date` DATE NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_project_id`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_id` INTEGER NOT NULL,
    `item_name` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `price` DECIMAL(15, 2) NOT NULL,
    `discount_percentage` DECIMAL(5, 2) NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `tax_percentage` DECIMAL(5, 2) NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `amount` DECIMAL(15, 2) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_invoice_id`(`invoice_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_number` VARCHAR(50) NOT NULL,
    `client_id` INTEGER NOT NULL,
    `bill_to` VARCHAR(255) NULL,
    `ship_to` VARCHAR(255) NULL,
    `project_id` INTEGER NULL,
    `deal_id` INTEGER NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(10) NULL DEFAULT 'USD',
    `invoice_date` DATE NULL,
    `open_till` DATE NULL,
    `payment_method` VARCHAR(100) NULL,
    `status` ENUM('Draft', 'Sent', 'Paid', 'Unpaid', 'Overdue', 'Partially Paid') NULL DEFAULT 'Draft',
    `description` LONGTEXT NULL,
    `subtotal` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `discount_percentage` DECIMAL(5, 2) NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `extra_discount_percentage` DECIMAL(5, 2) NULL DEFAULT 0.00,
    `extra_discount_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `tax_percentage` DECIMAL(5, 2) NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `total` DECIMAL(15, 2) NULL,
    `notes` LONGTEXT NULL,
    `terms_conditions` LONGTEXT NULL,
    `amount_paid` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `payment_date` DATE NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `estimate_id` INTEGER NULL,
    `approval_status` ENUM('Pending', 'Approved', 'Rejected') NULL DEFAULT 'Pending',
    `approved_by` INTEGER NULL,
    `created_by` INTEGER NULL,

    UNIQUE INDEX `invoice_number`(`invoice_number`),
    INDEX `FK_invoice_estimate`(`estimate_id`),
    INDEX `fk_invoices_creator`(`created_by`),
    INDEX `idx_client_id`(`client_id`),
    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_invoice_date`(`invoice_date`),
    INDEX `idx_invoice_number`(`invoice_number`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `it_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NULL,
    `project` VARCHAR(255) NULL,
    `category` VARCHAR(255) NULL,
    `folder` VARCHAR(255) NULL,
    `file_type` VARCHAR(100) NULL,
    `version` VARCHAR(50) NULL,
    `description` TEXT NULL,
    `tags` JSON NULL,
    `file_url` VARCHAR(255) NULL,
    `upload_source` VARCHAR(100) NULL,
    `linked_email` VARCHAR(255) NULL,
    `notify_members` JSON NULL,
    `access_permission` VARCHAR(100) NULL,
    `allow_download` BOOLEAN NULL DEFAULT false,
    `allow_print` BOOLEAN NULL DEFAULT false,
    `add_to_starred` BOOLEAN NULL DEFAULT false,
    `version_control` BOOLEAN NULL DEFAULT false,
    `set_expiry_date` BOOLEAN NULL DEFAULT false,
    `created_by` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `it_kanban_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `issue_id` INTEGER NULL,
    `issue_key` VARCHAR(50) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_size` VARCHAR(50) NULL DEFAULT '0 KB',
    `file_type` VARCHAR(100) NULL DEFAULT 'document',
    `uploaded_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_issue_key`(`issue_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `it_kanban_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `issue_key` VARCHAR(50) NOT NULL,
    `field` VARCHAR(64) NOT NULL,
    `old_value` TEXT NULL,
    `new_value` TEXT NULL,
    `changed_by` VARCHAR(120) NULL DEFAULT 'System',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_issue_key`(`issue_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `it_kanban_issues` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `issue_key` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NULL,
    `type` VARCHAR(50) NULL DEFAULT 'Task',
    `priority` VARCHAR(50) NULL DEFAULT 'Medium',
    `status` VARCHAR(50) NULL DEFAULT 'TO DO',
    `assignee` VARCHAR(100) NULL,
    `reporter` VARCHAR(100) NULL DEFAULT 'Unassigned',
    `sprint` VARCHAR(50) NULL DEFAULT 'Sprint 1',
    `due_date` DATE NULL,
    `start_date` DATE NULL,
    `subtasks` JSON NULL,
    `linked_issues` JSON NULL,
    `comments` JSON NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `progress` INTEGER NULL DEFAULT 0,
    `original_estimate` VARCHAR(50) NULL,
    `remaining_estimate` VARCHAR(50) NULL,
    `time_spent` VARCHAR(50) NULL,
    `components` VARCHAR(255) NULL,
    `environment` VARCHAR(255) NULL,
    `vulnerability` VARCHAR(100) NULL,
    `team` VARCHAR(100) NULL DEFAULT 'None',
    `team_id` INTEGER NULL,
    `project_id` INTEGER NULL,
    `department` VARCHAR(50) NULL DEFAULT 'IT',
    `labels` JSON NULL,
    `story_points` VARCHAR(20) NULL,
    `flagged` BOOLEAN NULL DEFAULT false,
    `parent_id` INTEGER NULL,
    `sprint_id` INTEGER NULL,
    `rank_order` INTEGER NULL,

    UNIQUE INDEX `issue_key`(`issue_key`),
    INDEX `idx_rank_order`(`rank_order`),
    INDEX `idx_sprint_id`(`sprint_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `it_kanban_worklogs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `issue_key` VARCHAR(50) NOT NULL,
    `author` VARCHAR(120) NULL DEFAULT 'Unassigned',
    `seconds` INTEGER NOT NULL DEFAULT 0,
    `description` TEXT NULL,
    `started_at` DATETIME(0) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_issue_key`(`issue_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `it_projects` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `team_id` INTEGER NULL,
    `tech_stack` JSON NULL,
    `repository_url` VARCHAR(500) NULL,
    `staging_url` VARCHAR(500) NULL,
    `production_url` VARCHAR(500) NULL,
    `it_project_type` ENUM('Web Development', 'App Development', 'Software Development', 'DevOps', 'Other') NOT NULL,
    `status` ENUM('Backlog', 'Development', 'Testing', 'Deployment', 'Maintenance', 'Completed') NULL DEFAULT 'Backlog',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_project_id`(`project_id`),
    INDEX `idx_status`(`status`),
    INDEX `idx_team_id`(`team_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `it_services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kpi_metrics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `department_id` INTEGER NULL,
    `metric_name` VARCHAR(100) NOT NULL,
    `metric_value` DECIMAL(15, 2) NULL,
    `period_start` DATE NULL,
    `period_end` DATE NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `department_id`(`department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_name` VARCHAR(255) NOT NULL,
    `project_name` VARCHAR(255) NULL,
    `referral_name` VARCHAR(255) NULL,
    `referral_contact` VARCHAR(255) NULL,
    `email` VARCHAR(150) NULL,
    `phone` VARCHAR(20) NULL,
    `company` VARCHAR(255) NULL,
    `company_id` INTEGER NULL,
    `lead_source` VARCHAR(100) NULL,
    `lead_status` ENUM('New', 'Qualified', 'Contacted', 'Unqualified', 'Not Contacted', 'Closed', 'Lost', 'Converted to Deal', 'Quotation', 'Revised Quotation') NULL DEFAULT 'New',
    `rating` INTEGER NULL DEFAULT 5,
    `notes` LONGTEXT NULL,
    `owner_id` INTEGER NULL,
    `value` DECIMAL(15, 2) NULL,
    `currency` VARCHAR(10) NULL DEFAULT 'USD',
    `lead_type` VARCHAR(50) NULL,
    `industry` VARCHAR(100) NULL,
    `business_type` VARCHAR(100) NULL,
    `marketing_services` JSON NULL,
    `it_services` VARCHAR(255) NULL,
    `visibility` VARCHAR(50) NULL DEFAULT 'Public',
    `tags` LONGTEXT NULL,
    `people_assigned` LONGTEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `service_category_id` INTEGER NULL,
    `department_id` INTEGER NULL,
    `follow_up_count` INTEGER NULL DEFAULT 0,
    `last_follow_up` DATETIME(0) NULL,
    `converted_company_id` INTEGER NULL,
    `converted_contact_id` INTEGER NULL,
    `converted_deal_id` INTEGER NULL,
    `it_services_other` VARCHAR(255) NULL,

    INDEX `fk_leads_company_id`(`company_id`),
    INDEX `fk_leads_converted_company`(`converted_company_id`),
    INDEX `fk_leads_converted_contact`(`converted_contact_id`),
    INDEX `fk_leads_converted_deal`(`converted_deal_id`),
    INDEX `fk_leads_department`(`department_id`),
    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_email`(`email`),
    INDEX `idx_industry`(`industry`),
    INDEX `idx_lead_name`(`lead_name`),
    INDEX `idx_lead_status`(`lead_status`),
    INDEX `idx_owner_id`(`owner_id`),
    INDEX `service_category_id`(`service_category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marketing_projects` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `campaign_id` INTEGER NULL,
    `marketing_type` ENUM('SEO', 'Social Media', 'Graphics', 'Video', 'WordPress', 'Other') NOT NULL,
    `content_plan` LONGTEXT NULL,
    `target_audience` TEXT NULL,
    `platforms` JSON NULL,
    `budget` DECIMAL(15, 2) NULL,
    `status` ENUM('Planning', 'Content Creation', 'Approval', 'Scheduled', 'Published', 'Archived') NULL DEFAULT 'Planning',
    `published_at` DATETIME(0) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `campaign_id`(`campaign_id`),
    INDEX `idx_marketing_type`(`marketing_type`),
    INDEX `idx_project_id`(`project_id`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversation_id` INTEGER NULL,
    `group_id` INTEGER NULL,
    `sender_id` INTEGER NOT NULL,
    `receiver_id` INTEGER NULL,
    `message_text` LONGTEXT NOT NULL,
    `file_name` VARCHAR(100) NULL,
    `file_size` INTEGER NULL,
    `file_type` VARCHAR(50) NULL,
    `file_path` VARCHAR(255) NULL,
    `is_read` BOOLEAN NULL DEFAULT false,
    `read_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `reply_to_id` INTEGER NULL,
    `reply_to_text` TEXT NULL,
    `reply_to_sender` VARCHAR(255) NULL,
    `reactions` JSON NULL,
    `is_edited` BOOLEAN NULL DEFAULT false,
    `is_deleted` BOOLEAN NULL DEFAULT false,

    INDEX `fk_messages_group`(`group_id`),
    INDEX `idx_conversation_id`(`conversation_id`),
    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_is_read`(`is_read`),
    INDEX `idx_receiver_id`(`receiver_id`),
    INDEX `idx_sender_id`(`sender_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `modules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` VARCHAR(50) NOT NULL DEFAULT 'general',
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NULL,
    `link` VARCHAR(500) NULL,
    `actor_name` VARCHAR(120) NULL,
    `entity_type` VARCHAR(50) NULL,
    `entity_key` VARCHAR(100) NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `read_at` DATETIME(0) NULL,

    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_user_unread`(`user_id`, `is_read`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_id` INTEGER NOT NULL,
    `module_name` VARCHAR(100) NOT NULL,
    `can_create` BOOLEAN NULL DEFAULT false,
    `can_read` BOOLEAN NULL DEFAULT false,
    `can_update` BOOLEAN NULL DEFAULT false,
    `can_delete` BOOLEAN NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_role_id`(`role_id`),
    UNIQUE INDEX `unique_module_per_role`(`role_id`, `module_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pipeline` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NULL,
    `position` INTEGER NULL,
    `status` ENUM('Active', 'Inactive') NULL DEFAULT 'Active',
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_name`(`name`),
    INDEX `idx_position`(`position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pipeline_stages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `probability` INTEGER NOT NULL,
    `description` LONGTEXT NULL,
    `position` INTEGER NULL,
    `status` ENUM('Active', 'Inactive') NULL DEFAULT 'Active',
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `name`(`name`),
    INDEX `idx_name`(`name`),
    INDEX `idx_position`(`position`),
    INDEX `idx_probability`(`probability`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_name` VARCHAR(255) NOT NULL,
    `plan_type` VARCHAR(100) NOT NULL,
    `price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `currency` VARCHAR(10) NULL DEFAULT 'USD',
    `total_subscribers` INTEGER NULL DEFAULT 0,
    `description` LONGTEXT NULL,
    `features` LONGTEXT NULL,
    `status` ENUM('Active', 'Inactive', 'Archived') NULL DEFAULT 'Active',
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_plan_name`(`plan_name`),
    INDEX `idx_plan_type`(`plan_type`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_activities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `action` VARCHAR(255) NOT NULL,
    `details` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `project_id`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_discussions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `message` TEXT NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `project_id`(`project_id`),
    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_milestones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `owner_id` INTEGER NULL,
    `start_date` DATE NULL,
    `due_date` DATE NULL,
    `status` ENUM('Not Started', 'In Progress', 'Completed', 'On Hold') NULL DEFAULT 'Not Started',
    `progress` INTEGER NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `project_id`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `task_key` VARCHAR(50) NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NULL,
    `project_id` INTEGER NOT NULL,
    `status` ENUM('Open', 'In Progress', 'Completed', 'On Hold') NULL DEFAULT 'Open',
    `priority` ENUM('Low', 'Medium', 'High', 'Critical') NULL DEFAULT 'Medium',
    `assigned_to` INTEGER NULL,
    `created_by` INTEGER NULL,
    `start_date` DATE NULL,
    `due_date` DATE NULL,
    `completed_date` DATETIME(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `task_key`(`task_key`),
    INDEX `created_by`(`created_by`),
    INDEX `idx_assigned_to`(`assigned_to`),
    INDEX `idx_due_date`(`due_date`),
    INDEX `idx_project_id`(`project_id`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_team` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `role` VARCHAR(100) NULL,
    `allocation_percentage` INTEGER NULL DEFAULT 100,
    `joined_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_project_id`(`project_id`),
    INDEX `idx_user_id`(`user_id`),
    UNIQUE INDEX `unique_project_user`(`project_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_timesheets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `work_date` DATE NOT NULL,
    `hours_worked` DECIMAL(5, 2) NOT NULL,
    `description` LONGTEXT NULL,
    `created_by` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `created_by`(`created_by`),
    INDEX `idx_project_id`(`project_id`),
    INDEX `idx_user_id`(`user_id`),
    INDEX `idx_work_date`(`work_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id_code` VARCHAR(50) NULL,
    `name` VARCHAR(255) NOT NULL,
    `title` VARCHAR(255) NULL,
    `description` LONGTEXT NULL,
    `deal_id` INTEGER NULL,
    `company_id` INTEGER NULL,
    `team_id` INTEGER NULL,
    `contact_id` INTEGER NULL,
    `budget` DECIMAL(15, 2) NULL,
    `currency` VARCHAR(10) NULL DEFAULT 'USD',
    `status` ENUM('Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled', 'Active') NULL DEFAULT 'Planning',
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `due_date` DATE NULL,
    `created_by` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `parent_project_id` INTEGER NULL,
    `department_id` INTEGER NULL,
    `workflow_type` ENUM('Standard', 'Marketing', 'IT') NULL DEFAULT 'Standard',
    `progress` INTEGER NULL DEFAULT 0,
    `spent` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `manager_id` INTEGER NULL,
    `priority` VARCHAR(50) NULL DEFAULT 'Medium',

    INDEX `department_id`(`department_id`),
    INDEX `idx_company_id`(`company_id`),
    INDEX `idx_deal_id`(`deal_id`),
    INDEX `idx_name`(`name`),
    INDEX `idx_status`(`status`),
    INDEX `idx_team_id`(`team_id`),
    INDEX `parent_project_id`(`parent_project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proposal_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `proposal_id` INTEGER NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_type` VARCHAR(100) NULL,
    `file_size` INTEGER NULL,
    `file_data` LONGBLOB NULL,
    `uploaded_by` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_proposal_id`(`proposal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proposal_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `proposal_id` INTEGER NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `action_by` INTEGER NULL,
    `old_status` VARCHAR(50) NULL,
    `new_status` VARCHAR(50) NULL,
    `comments` LONGTEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_proposal_id`(`proposal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proposal_line_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `proposal_id` INTEGER NOT NULL,
    `item_name` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `rate` DECIMAL(15, 2) NOT NULL,
    `discount_percent` DECIMAL(5, 2) NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `tax_percent` DECIMAL(5, 2) NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `subtotal` DECIMAL(15, 2) NULL,
    `total` DECIMAL(15, 2) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_proposal_id`(`proposal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proposals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `proposal_number` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NULL,
    `client_id` INTEGER NOT NULL,
    `contact_id` INTEGER NULL,
    `deal_id` INTEGER NULL,
    `created_by` INTEGER NULL,
    `status` VARCHAR(50) NULL DEFAULT 'Draft',
    `proposal_date` DATE NULL,
    `validity_date` DATE NULL,
    `total_amount` DECIMAL(15, 2) NULL,
    `discount_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `currency` VARCHAR(10) NULL DEFAULT 'USD',
    `terms_conditions` LONGTEXT NULL,
    `notes` LONGTEXT NULL,
    `version` INTEGER NULL DEFAULT 1,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `lead_id` INTEGER NULL,
    `assigned_to` INTEGER NULL,
    `business_type` VARCHAR(100) NULL,
    `service_needed` VARCHAR(255) NULL,
    `project_scope` VARCHAR(255) NULL,
    `client_requirements` LONGTEXT NULL,
    `executive_summary` LONGTEXT NULL,
    `proposed_solution` LONGTEXT NULL,
    `scope_of_work` JSON NULL,
    `deliverables` JSON NULL,
    `estimated_duration` VARCHAR(50) NULL,
    `duration_unit` VARCHAR(20) NULL,
    `project_phases` JSON NULL,
    `implementation_approach` LONGTEXT NULL,
    `assumptions` LONGTEXT NULL,
    `exclusions` LONGTEXT NULL,
    `internal_notes` LONGTEXT NULL,
    `attachments` JSON NULL,

    UNIQUE INDEX `proposal_number`(`proposal_number`),
    INDEX `idx_client_id`(`client_id`),
    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_deal_id`(`deal_id`),
    INDEX `idx_proposal_number`(`proposal_number`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` INTEGER NOT NULL,
    `entity_name` VARCHAR(255) NULL,
    `reminder_type` ENUM('email', 'sms', 'call', 'notification') NULL DEFAULT 'email',
    `reminder_datetime` DATETIME(0) NOT NULL,
    `message` LONGTEXT NULL,
    `frequency` ENUM('once', 'daily', 'weekly', 'monthly') NULL DEFAULT 'once',
    `status` ENUM('Pending', 'Sent', 'Completed', 'Skipped') NULL DEFAULT 'Pending',
    `created_by` INTEGER NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `created_by`(`created_by`),
    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_entity_id`(`entity_id`),
    INDEX `idx_entity_type`(`entity_type`),
    INDEX `idx_reminder_datetime`(`reminder_datetime`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seo_management` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `keyword` VARCHAR(255) NOT NULL,
    `target_url` VARCHAR(500) NULL,
    `current_ranking` INTEGER NULL,
    `target_ranking` INTEGER NULL,
    `search_volume` INTEGER NULL,
    `competition` VARCHAR(50) NULL,
    `last_updated` DATE NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_keyword`(`keyword`),
    INDEX `idx_project_id`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `parent_category` VARCHAR(100) NULL,
    `suggested_department_id` INTEGER NULL,
    `description` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sprints` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NULL,
    `name` VARCHAR(255) NOT NULL,
    `goal` TEXT NULL,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `status` ENUM('Planned', 'Active', 'Completed', 'Cancelled') NULL DEFAULT 'Planned',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `department` VARCHAR(50) NULL DEFAULT 'IT',
    `completed_at` DATETIME(0) NULL,
    `sort_order` INTEGER NULL DEFAULT 0,

    INDEX `idx_project_id`(`project_id`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `team_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `role` VARCHAR(100) NULL DEFAULT 'Member',
    `joined_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_team_id`(`team_id`),
    INDEX `idx_user_id`(`user_id`),
    UNIQUE INDEX `unique_team_member`(`team_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teams` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `department_id` INTEGER NULL,
    `manager_id` INTEGER NULL,
    `manager_role` VARCHAR(100) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_department_id`(`department_id`),
    INDEX `idx_name`(`name`),
    INDEX `manager_id`(`manager_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test_cases` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `module` VARCHAR(100) NULL,
    `priority` ENUM('Low', 'Medium', 'High') NULL DEFAULT 'Medium',
    `type` ENUM('Functional', 'Integration', 'Performance', 'Security') NULL DEFAULT 'Functional',
    `is_automated` BOOLEAN NULL DEFAULT false,
    `status` ENUM('Active', 'Obsolete', 'Draft', 'Approved', 'In Review', 'Ready for Test', 'Rejected') NULL DEFAULT 'Draft',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `steps` JSON NULL,
    `data_sets` JSON NULL,
    `category` VARCHAR(100) NULL,
    `suite` VARCHAR(255) NULL,
    `tags` JSON NULL,
    `assignedTo` VARCHAR(255) NULL,
    `reviewer` VARCHAR(255) NULL,
    `milestone` VARCHAR(100) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test_runs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `test_case_id` INTEGER NOT NULL,
    `environment` ENUM('QA', 'Staging', 'UAT', 'Production') NULL DEFAULT 'QA',
    `status` ENUM('Passed', 'Failed', 'Blocked', 'Pending') NULL DEFAULT 'Pending',
    `executed_by` INTEGER NULL,
    `executed_on` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `test_case_id`(`test_case_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_notes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NULL,
    `priority` ENUM('High', 'Medium', 'Low') NULL DEFAULT 'Medium',
    `category` VARCHAR(100) NULL,
    `tag` VARCHAR(100) NULL,
    `is_important` BOOLEAN NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_priority`(`priority`),
    INDEX `idx_tag`(`tag`),
    INDEX `idx_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NULL,
    `username` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `email_opt_out` BOOLEAN NULL DEFAULT false,
    `password` VARCHAR(255) NOT NULL,
    `phone1` VARCHAR(20) NULL,
    `phone1_country` VARCHAR(5) NULL DEFAULT 'US',
    `phone2` VARCHAR(20) NULL,
    `phone2_country` VARCHAR(5) NULL DEFAULT 'US',
    `location` VARCHAR(100) NULL,
    `avatar` LONGTEXT NULL,
    `role_id` INTEGER NULL,
    `status` ENUM('Active', 'Inactive') NULL DEFAULT 'Active',
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `department` VARCHAR(100) NULL,
    `department_id` INTEGER NULL,
    `department_role` ENUM('Executive', 'Manager') NULL DEFAULT 'Executive',
    `job_title` VARCHAR(100) NULL,
    `last_seen` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `username`(`username`),
    UNIQUE INDEX `email`(`email`),
    INDEX `department_id`(`department_id`),
    INDEX `idx_email`(`email`),
    INDEX `idx_role_id`(`role_id`),
    INDEX `idx_status`(`status`),
    INDEX `idx_username`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `activities` ADD CONSTRAINT `activities_ibfk_1` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `activities` ADD CONSTRAINT `activities_ibfk_2` FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `activities` ADD CONSTRAINT `activities_ibfk_3` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `activities` ADD CONSTRAINT `activities_ibfk_4` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `activities` ADD CONSTRAINT `activities_ibfk_5` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `activities` ADD CONSTRAINT `activities_ibfk_6` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `activities` ADD CONSTRAINT `fk_activities_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `activities` ADD CONSTRAINT `fk_activities_task` FOREIGN KEY (`task_id`) REFERENCES `general_tasks`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `approvals` ADD CONSTRAINT `approvals_ibfk_1` FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `approvals` ADD CONSTRAINT `approvals_ibfk_2` FOREIGN KEY (`approver`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `automation_scripts` ADD CONSTRAINT `automation_scripts_ibfk_1` FOREIGN KEY (`test_case_id`) REFERENCES `test_cases`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `campaign_performance` ADD CONSTRAINT `campaign_performance_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `chat_group_members` ADD CONSTRAINT `chat_group_members_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `chat_groups`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `chat_group_members` ADD CONSTRAINT `chat_group_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `chat_groups` ADD CONSTRAINT `chat_groups_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `chat_groups` ADD CONSTRAINT `chat_groups_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `code_reviews` ADD CONSTRAINT `code_reviews_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `code_reviews` ADD CONSTRAINT `code_reviews_ibfk_2` FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `code_reviews` ADD CONSTRAINT `code_reviews_ibfk_3` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_ibfk_2` FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_ibfk_3` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_ibfk_4` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contact_tasks` ADD CONSTRAINT `contact_tasks_ibfk_1` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contact_tasks` ADD CONSTRAINT `contact_tasks_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contact_tasks` ADD CONSTRAINT `contact_tasks_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contacts` ADD CONSTRAINT `fk_contacts_owner` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `content_calendar` ADD CONSTRAINT `content_calendar_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `content_calendar` ADD CONSTRAINT `content_calendar_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_ibfk_3` FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_ibfk_1` FOREIGN KEY (`participant1_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_ibfk_2` FOREIGN KEY (`participant2_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `creative_requests` ADD CONSTRAINT `creative_requests_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `creative_requests` ADD CONSTRAINT `creative_requests_ibfk_2` FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `creative_requests` ADD CONSTRAINT `creative_requests_ibfk_3` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deals` ADD CONSTRAINT `FK_deal_pipeline_stage` FOREIGN KEY (`pipeline_stage_id`) REFERENCES `pipeline_stages`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deals` ADD CONSTRAINT `deals_ibfk_2` FOREIGN KEY (`service_category_id`) REFERENCES `service_categories`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deals` ADD CONSTRAINT `fk_deals_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deals` ADD CONSTRAINT `fk_deals_department` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `delete_requests` ADD CONSTRAINT `delete_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `delete_requests` ADD CONSTRAINT `delete_requests_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deployments` ADD CONSTRAINT `deployments_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deployments` ADD CONSTRAINT `deployments_ibfk_2` FOREIGN KEY (`deployed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deployments` ADD CONSTRAINT `deployments_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `entity_files` ADD CONSTRAINT `entity_files_ibfk_1` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `entity_files` ADD CONSTRAINT `entity_files_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `entity_files` ADD CONSTRAINT `entity_files_ibfk_3` FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `entity_files` ADD CONSTRAINT `entity_files_ibfk_4` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `entity_files` ADD CONSTRAINT `entity_files_ibfk_5` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `entity_files` ADD CONSTRAINT `entity_files_ibfk_6` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `entity_notes` ADD CONSTRAINT `entity_notes_ibfk_1` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `entity_notes` ADD CONSTRAINT `entity_notes_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `entity_notes` ADD CONSTRAINT `entity_notes_ibfk_3` FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `entity_notes` ADD CONSTRAINT `entity_notes_ibfk_4` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `entity_notes` ADD CONSTRAINT `entity_notes_ibfk_5` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `entity_notes` ADD CONSTRAINT `fk_notes_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `entity_notes` ADD CONSTRAINT `fk_notes_task` FOREIGN KEY (`task_id`) REFERENCES `general_tasks`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `estimation_line_items` ADD CONSTRAINT `estimation_line_items_ibfk_1` FOREIGN KEY (`estimation_id`) REFERENCES `estimations`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `estimations` ADD CONSTRAINT `FK_estimation_deal` FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `estimations` ADD CONSTRAINT `estimations_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `estimations` ADD CONSTRAINT `estimations_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `estimations` ADD CONSTRAINT `estimations_ibfk_3` FOREIGN KEY (`estimate_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `estimations` ADD CONSTRAINT `fk_estimations_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `estimations` ADD CONSTRAINT `fk_estimations_parent` FOREIGN KEY (`parent_id`) REFERENCES `estimations`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `file_folders` ADD CONSTRAINT `file_folders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `file_folders` ADD CONSTRAINT `file_folders_ibfk_2` FOREIGN KEY (`parent_id`) REFERENCES `file_folders`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `file_shares` ADD CONSTRAINT `file_shares_ibfk_1` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `file_shares` ADD CONSTRAINT `file_shares_ibfk_2` FOREIGN KEY (`folder_id`) REFERENCES `file_folders`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `file_shares` ADD CONSTRAINT `file_shares_ibfk_3` FOREIGN KEY (`shared_by_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `file_shares` ADD CONSTRAINT `file_shares_ibfk_4` FOREIGN KEY (`shared_with_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `files_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `files_ibfk_2` FOREIGN KEY (`folder_id`) REFERENCES `file_folders`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `fk_files_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `fk_files_contact` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `fk_files_deal` FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `fk_files_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `fk_files_project` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `fk_files_task` FOREIGN KEY (`task_id`) REFERENCES `general_tasks`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `followups` ADD CONSTRAINT `fk_followups_previous` FOREIGN KEY (`previous_followup_id`) REFERENCES `followups`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `followups` ADD CONSTRAINT `fk_followups_project` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `followups` ADD CONSTRAINT `fk_followups_task` FOREIGN KEY (`task_id`) REFERENCES `general_tasks`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `followups` ADD CONSTRAINT `followups_ibfk_1` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `followups` ADD CONSTRAINT `followups_ibfk_2` FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `followups` ADD CONSTRAINT `followups_ibfk_3` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `followups` ADD CONSTRAINT `followups_ibfk_4` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `general_tasks` ADD CONSTRAINT `fk_tasks_project` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `github_repositories` ADD CONSTRAINT `github_repositories_ibfk_1` FOREIGN KEY (`connection_id`) REFERENCES `github_connections`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `gmb_management` ADD CONSTRAINT `gmb_management_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `FK_invoice_estimate` FOREIGN KEY (`estimate_id`) REFERENCES `estimations`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `fk_invoices_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `it_projects` ADD CONSTRAINT `fk_it_projects_team` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `it_projects` ADD CONSTRAINT `it_projects_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `kpi_metrics` ADD CONSTRAINT `kpi_metrics_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `fk_leads_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `fk_leads_converted_company` FOREIGN KEY (`converted_company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `fk_leads_converted_contact` FOREIGN KEY (`converted_contact_id`) REFERENCES `contacts`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `fk_leads_converted_deal` FOREIGN KEY (`converted_deal_id`) REFERENCES `deals`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `fk_leads_department` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_ibfk_1` FOREIGN KEY (`service_category_id`) REFERENCES `service_categories`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `marketing_projects` ADD CONSTRAINT `marketing_projects_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `marketing_projects` ADD CONSTRAINT `marketing_projects_ibfk_2` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `fk_messages_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `fk_messages_group` FOREIGN KEY (`group_id`) REFERENCES `chat_groups`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `permissions` ADD CONSTRAINT `permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `project_activities` ADD CONSTRAINT `project_activities_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `project_discussions` ADD CONSTRAINT `project_discussions_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `project_discussions` ADD CONSTRAINT `project_discussions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `project_milestones` ADD CONSTRAINT `project_milestones_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `project_team` ADD CONSTRAINT `project_team_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `project_team` ADD CONSTRAINT `project_team_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `project_timesheets` ADD CONSTRAINT `project_timesheets_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `project_timesheets` ADD CONSTRAINT `project_timesheets_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `project_timesheets` ADD CONSTRAINT `project_timesheets_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `fk_projects_team` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_ibfk_2` FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_ibfk_3` FOREIGN KEY (`parent_project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_ibfk_4` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `proposal_attachments` ADD CONSTRAINT `proposal_attachments_ibfk_1` FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `proposal_history` ADD CONSTRAINT `proposal_history_ibfk_1` FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `proposal_line_items` ADD CONSTRAINT `proposal_line_items_ibfk_1` FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `reminders` ADD CONSTRAINT `reminders_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `seo_management` ADD CONSTRAINT `seo_management_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `teams` ADD CONSTRAINT `teams_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `teams` ADD CONSTRAINT `teams_ibfk_2` FOREIGN KEY (`manager_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `test_runs` ADD CONSTRAINT `test_runs_ibfk_1` FOREIGN KEY (`test_case_id`) REFERENCES `test_cases`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_notes` ADD CONSTRAINT `user_notes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

