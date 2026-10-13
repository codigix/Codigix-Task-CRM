-- Proposal decks (slide-style PDFs with options, budget and timeline) for deals.
-- (routes/sales-proposal-routes.js; also created at runtime if missing.) Safe to run more than once.

CREATE TABLE IF NOT EXISTS `sales_proposals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proposal_number` varchar(40) NOT NULL,
  `kind` varchar(20) NOT NULL DEFAULT 'it',
  `title` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'Draft',
  `deal_id` int DEFAULT NULL,
  `company_id` int DEFAULT NULL,
  `lead_id` int DEFAULT NULL,
  `content` json DEFAULT NULL,
  `chosen_option` varchar(10) DEFAULT NULL,
  `quotation_id` int DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `sent_to` varchar(500) DEFAULT NULL,
  `responded_at` datetime DEFAULT NULL,
  `decline_reason` varchar(500) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_by_name` varchar(120) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sprop_number` (`proposal_number`),
  KEY `idx_sprop_deal` (`deal_id`),
  KEY `idx_sprop_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
