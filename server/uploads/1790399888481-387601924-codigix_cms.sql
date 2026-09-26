-- ============================================================================
-- Codigix Infotech - MySQL Database Dump (Schema & Seed Data)
-- Generated for: MySQL 5.7 / 8.0 / 8.4 & MariaDB 10.x+
-- Character Set: utf8mb4
-- Collation: utf8mb4_unicode_ci
-- Database: codigix_cms
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- ----------------------------------------------------------------------------
-- 1. Create Database & Switch
-- ----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `codigix_cms` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `codigix_cms`;

-- ----------------------------------------------------------------------------
-- 2. Table: users
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(190) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','editor') NOT NULL DEFAULT 'editor',
  `avatar` VARCHAR(500) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Table: settings
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `key` VARCHAR(64) PRIMARY KEY,
  `value` JSON NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Table: blog_categories
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `blog_categories`;
CREATE TABLE `blog_categories` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `slug` VARCHAR(160) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `meta_title` VARCHAR(255) NULL,
  `meta_description` VARCHAR(500) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Table: blogs
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `blogs`;
CREATE TABLE `blogs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `excerpt` TEXT NULL,
  `content` LONGTEXT NULL,
  `cover_image` VARCHAR(500) NULL,
  `cover_image_alt` VARCHAR(255) NULL,
  `category_id` INT UNSIGNED NULL,
  `tags` JSON NULL,
  `author_name` VARCHAR(120) NULL,
  `author_role` VARCHAR(120) NULL,
  `author_bio` TEXT NULL,
  `author_avatar` VARCHAR(500) NULL,
  `status` ENUM('draft','published','scheduled') NOT NULL DEFAULT 'draft',
  `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
  `published_at` DATETIME NULL,
  `reading_time` INT UNSIGNED NOT NULL DEFAULT 1,
  `word_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `views` INT UNSIGNED NOT NULL DEFAULT 0,
  `meta_title` VARCHAR(255) NULL,
  `meta_description` VARCHAR(500) NULL,
  `focus_keyword` VARCHAR(160) NULL,
  `secondary_keywords` VARCHAR(500) NULL,
  `canonical_url` VARCHAR(500) NULL,
  `og_title` VARCHAR(255) NULL,
  `og_description` VARCHAR(500) NULL,
  `og_image` VARCHAR(500) NULL,
  `robots_index` TINYINT(1) NOT NULL DEFAULT 1,
  `robots_follow` TINYINT(1) NOT NULL DEFAULT 1,
  `schema_type` ENUM('BlogPosting','Article','NewsArticle','MedicalWebPage') NOT NULL DEFAULT 'BlogPosting',
  `faqs` JSON NULL,
  `created_by` INT UNSIGNED NULL,
  `updated_by` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_blogs_status_published` (`status`, `published_at`),
  KEY `idx_blogs_category` (`category_id`),
  FULLTEXT KEY `ft_blogs` (`title`, `excerpt`),
  CONSTRAINT `fk_blogs_category` FOREIGN KEY (`category_id`) REFERENCES `blog_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. Table: clients
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `clients`;
CREATE TABLE `clients` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(160) NOT NULL,
  `location` VARCHAR(160) NULL,
  `logo` VARCHAR(500) NULL,
  `website` VARCHAR(500) NULL,
  `industry` VARCHAR(120) NULL,
  `is_healthcare` TINYINT(1) NOT NULL DEFAULT 0,
  `show_on_map` TINYINT(1) NOT NULL DEFAULT 1,
  `map_x` DECIMAL(5,2) NULL,
  `map_y` DECIMAL(5,2) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. Table: videos
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `videos`;
CREATE TABLE `videos` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `youtube_id` VARCHAR(32) NOT NULL,
  `category` VARCHAR(120) NULL,
  `title` VARCHAR(255) NOT NULL,
  `subtitle` VARCHAR(255) NULL,
  `description` TEXT NULL,
  `duration` VARCHAR(16) NULL,
  `thumbnail` VARCHAR(500) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. Table: testimonials
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `testimonials`;
CREATE TABLE `testimonials` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(160) NOT NULL,
  `role` VARCHAR(160) NULL,
  `company` VARCHAR(160) NULL,
  `content` TEXT NOT NULL,
  `avatar` VARCHAR(500) NULL,
  `rating` TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. Table: faqs
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `faqs`;
CREATE TABLE `faqs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `question` VARCHAR(500) NOT NULL,
  `answer` TEXT NOT NULL,
  `page` VARCHAR(80) NOT NULL DEFAULT 'home',
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_faqs_page` (`page`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. Table: jobs
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `jobs`;
CREATE TABLE `jobs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `slug` VARCHAR(220) NOT NULL UNIQUE,
  `department` VARCHAR(120) NULL,
  `location` VARCHAR(160) NULL,
  `employment_type` VARCHAR(60) NULL,
  `work_mode` VARCHAR(60) NULL,
  `experience` VARCHAR(80) NULL,
  `salary_range` VARCHAR(120) NULL,
  `openings` INT UNSIGNED NOT NULL DEFAULT 1,
  `summary` TEXT NULL,
  `description` LONGTEXT NULL,
  `responsibilities` JSON NULL,
  `requirements` JSON NULL,
  `benefits` JSON NULL,
  `status` ENUM('open','closed','draft') NOT NULL DEFAULT 'open',
  `deadline` DATE NULL,
  `meta_title` VARCHAR(255) NULL,
  `meta_description` VARCHAR(500) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. Table: job_applications
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `job_applications`;
CREATE TABLE `job_applications` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `job_id` INT UNSIGNED NULL,
  `job_title` VARCHAR(200) NULL,
  `name` VARCHAR(160) NOT NULL,
  `email` VARCHAR(190) NOT NULL,
  `phone` VARCHAR(40) NULL,
  `experience` VARCHAR(80) NULL,
  `current_company` VARCHAR(160) NULL,
  `portfolio_url` VARCHAR(500) NULL,
  `linkedin_url` VARCHAR(500) NULL,
  `cover_letter` TEXT NULL,
  `resume_path` VARCHAR(500) NULL,
  `resume_original_name` VARCHAR(255) NULL,
  `status` ENUM('new','reviewing','shortlisted','rejected','hired') NOT NULL DEFAULT 'new',
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_applications_status` (`status`),
  CONSTRAINT `fk_applications_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 12. Table: contact_messages
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `contact_messages`;
CREATE TABLE `contact_messages` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `first_name` VARCHAR(120) NOT NULL,
  `last_name` VARCHAR(120) NULL,
  `email` VARCHAR(190) NOT NULL,
  `phone` VARCHAR(40) NULL,
  `company` VARCHAR(160) NULL,
  `service` VARCHAR(160) NULL,
  `message` TEXT NOT NULL,
  `source_page` VARCHAR(255) NULL,
  `status` ENUM('new','read','replied','archived') NOT NULL DEFAULT 'new',
  `notes` TEXT NULL,
  `ip` VARCHAR(64) NULL,
  `user_agent` VARCHAR(500) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_messages_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 13. Table: subscribers
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `subscribers`;
CREATE TABLE `subscribers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(190) NOT NULL UNIQUE,
  `status` ENUM('subscribed','unsubscribed') NOT NULL DEFAULT 'subscribed',
  `source` VARCHAR(120) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 14. Table: media
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `media`;
CREATE TABLE `media` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `filename` VARCHAR(255) NOT NULL,
  `original_name` VARCHAR(255) NULL,
  `url` VARCHAR(500) NOT NULL,
  `mime` VARCHAR(100) NULL,
  `size` INT UNSIGNED NULL,
  `width` INT UNSIGNED NULL,
  `height` INT UNSIGNED NULL,
  `alt` VARCHAR(255) NULL,
  `folder` VARCHAR(60) NOT NULL DEFAULT 'general',
  `uploaded_by` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INSERT SEED DATA
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Users (Admin User: admin@codigix.com / Admin@12345)
-- ----------------------------------------------------------------------------
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `is_active`) VALUES
(1, 'Codigix Admin', 'admin@codigix.com', '$2a$12$K89sZkOqvq1g9gHhOq4YfeS2C6yR2Vl0y5Wb/8Yh5j6B7v8k9L0m.', 'admin', 1);

-- ----------------------------------------------------------------------------
-- Settings (Site, SEO, Contact, Social, Hero Live Dashboard)
-- ----------------------------------------------------------------------------
INSERT INTO `settings` (`key`, `value`) VALUES
('site', '{
  "name": "Codigix Infotech",
  "tagline": "Healthcare Digital Marketing Agency",
  "description": "Pune\'s dedicated healthcare digital growth agency — driving organic SEO, Google Maps visibility, high-DA backlinks, and viral social reach for hospitals and clinics.",
  "logo": "/logo.png",
  "newsletter_title": "Join our Newsletter",
  "newsletter_text": "Get the latest healthcare SEO insights, Google Maps strategies, and patient acquisition trends delivered straight to your inbox."
}'),
('seo', '{
  "default_title": "Healthcare Digital Marketing Agency | Codigix Infotech",
  "title_template": "%s | Codigix Infotech",
  "default_description": "Grow your clinic or hospital with Pune’s top healthcare digital marketing agency. Proven Healthcare SEO, GMB Google Maps 3-Pack, High-DA Backlinks & Social Media Growth to get more patient appointments.",
  "default_og_image": "",
  "twitter_handle": "",
  "google_site_verification": "",
  "blog_title": "Insights & Blog",
  "blog_description": "Read the latest insights, news, and trends in healthcare digital marketing, SEO, Google Maps and patient acquisition from the Codigix team."
}'),
('contact', '{
  "address_line1": "Office No. 309, Bramha Sky Uzuri",
  "address_line2": "Old BP Road, Masulkar Colony, Pimpri-Chinchwad",
  "city": "Pune",
  "state": "Maharashtra",
  "postal_code": "411018",
  "country": "India",
  "phone": "+91 98765 43210",
  "phone_secondary": "+91 84462 76449",
  "whatsapp": "+919876543210",
  "email": "info@codigix.co",
  "careers_email": "careers@codigix.com",
  "working_hours": "Mon – Sat, 10:00 AM – 7:00 PM",
  "map_embed_url": "https://maps.google.com/maps?q=Bramha+Sky+Uzuri,+Masulkar+Colony,+Pimpri-Chinchwad,+Pune,+Maharashtra+411018&t=&z=16&ie=UTF8&iwloc=&output=embed",
  "services": [
    "SEO Search Engine Optimization",
    "Paid Advertisements (PPC)",
    "Social Media Marketing",
    "E-Commerce Marketing",
    "Medical Content Marketing",
    "Web Design & Development",
    "Other"
  ]
}'),
('social', '{
  "linkedin": "",
  "instagram": "",
  "facebook": "",
  "youtube": "",
  "twitter": ""
}'),
('hero_dashboard', '{
  "metrics": [
    { "title": "Website Visitors", "value": 24532, "decimals": 0, "suffix": "", "isCurrency": false, "trend": 28, "icon": "users", "color": "blue" },
    { "title": "Total Leads", "value": 1248, "decimals": 0, "suffix": "", "isCurrency": false, "trend": 36, "icon": "filter", "color": "purple" },
    { "title": "Conversions", "value": 214, "decimals": 0, "suffix": "", "isCurrency": false, "trend": 18, "icon": "target", "color": "emerald" },
    { "title": "Revenue (Attributed)", "value": 28.4, "decimals": 1, "suffix": "L", "isCurrency": true, "trend": 41, "icon": "coins", "color": "orange" },
    { "title": "Marketing ROI", "value": 3.8, "decimals": 1, "suffix": "x", "isCurrency": false, "trend": 26, "icon": "chart", "color": "indigo" }
  ],
  "channels": [
    { "name": "Google Ads", "value": "12,452", "sub": "Clicks", "trend": 22, "stat1": "1.8M Impressions", "stat2": "₹ 320 CPC", "progress": 68, "icon": "search", "color": "blue" },
    { "name": "Meta Ads", "value": "18,324", "sub": "Clicks", "trend": 34, "stat1": "2.4M Impressions", "stat2": "₹ 280 CPC", "progress": 72, "icon": "users", "color": "blue" },
    { "name": "SEO (Organic)", "value": "12.4K", "sub": "Organic Visits", "trend": 42, "stat1": "320 Keywords", "stat2": "#1 Ranking", "progress": 80, "icon": "search", "color": "emerald" },
    { "name": "Google Business Profile", "value": "4,832", "sub": "Profile Views", "trend": 38, "stat1": "1,248 Calls", "stat2": "986 Actions", "progress": 76, "icon": "map-pin", "color": "blue" },
    { "name": "AEO (Answer Engine)", "value": "2.8K", "sub": "Answer Clicks", "trend": 45, "stat1": "650 Brand Mentions", "stat2": "", "progress": 62, "icon": "target", "color": "indigo" },
    { "name": "Social Media", "value": "210K", "sub": "Total Reach", "trend": 28, "stat1": "24K Engagements", "stat2": "", "progress": 70, "icon": "instagram", "color": "pink" }
  ],
  "traffic_total": "24,532",
  "traffic_axis": ["1 Sep", "10 Sep", "20 Sep", "30 Sep"],
  "traffic_sources": [
    { "label": "Organic Search", "pct": 42 },
    { "label": "Paid Ads", "pct": 24 },
    { "label": "Direct", "pct": 12 },
    { "label": "Social Media", "pct": 10 },
    { "label": "Referral", "pct": 8 }
  ],
  "keywords": [
    { "keyword": "hair transplant pune", "position": 1, "change": 2, "volume": "6.4K" },
    { "keyword": "best dermatologist pcmc", "position": 1, "change": 1, "volume": "4.8K" },
    { "keyword": "ivf center near me", "position": 2, "change": 3, "volume": "5.2K" },
    { "keyword": "knee replacement cost", "position": 1, "change": 2, "volume": "2.9K" },
    { "keyword": "piles laser treatment", "position": 1, "change": 1, "volume": "3.8K" }
  ],
  "content": [
    { "title": "FUE vs FUT Hair Transplant (Video)", "views": "18.4K", "engagement": "9.2%" },
    { "title": "Doctor Q&A: Knee Surgery Facts", "views": "14.2K", "engagement": "8.6%" },
    { "title": "Patient Smile Makeover Story", "views": "11.5K", "engagement": "7.9%" },
    { "title": "IVF Success Journey & Diet Tips", "views": "9.8K", "engagement": "7.1%" },
    { "title": "Skin Glow Laser Treatment Demo", "views": "8.4K", "engagement": "6.4%" }
  ],
  "ads": [
    { "label": "Spend", "value": 48320, "isCurrency": true, "trend": 12, "down": false },
    { "label": "Clicks", "value": 12452, "isCurrency": false, "trend": 22, "down": false },
    { "label": "Conversions", "value": 326, "isCurrency": false, "trend": 18, "down": false },
    { "label": "CPA", "value": 148, "isCurrency": true, "trend": 14, "down": true }
  ],
  "funnel": [
    { "label": "Website Visitors", "value": "24,532", "pct": "100%", "width": 100 },
    { "label": "Leads Captured", "value": "1,248", "pct": "5.1%", "width": 25 },
    { "label": "Qualified Leads", "value": "892", "pct": "3.6%", "width": 18 },
    { "label": "Proposals Sent", "value": "426", "pct": "1.7%", "width": 8 },
    { "label": "Closed Customers", "value": "214", "pct": "0.9%", "width": 4 }
  ]
}');

-- ----------------------------------------------------------------------------
-- Blog Categories
-- ----------------------------------------------------------------------------
INSERT INTO `blog_categories` (`id`, `name`, `slug`, `description`, `sort_order`) VALUES
(1, 'SEO Strategy', 'seo-strategy', 'Search engine optimisation playbooks for clinics, hospitals and growing brands.', 0),
(2, 'Local SEO & GMB', 'local-seo-gmb', 'Google Business Profile, Maps 3-Pack and hyper-local visibility.', 1),
(3, 'Social Media', 'social-media', 'Reels, YouTube and Meta strategies that build patient trust.', 2),
(4, 'E-commerce', 'e-commerce', 'Conversion and growth tactics for online stores.', 3),
(5, 'Healthcare Marketing', 'healthcare-marketing', 'Compliant, patient-first digital marketing for healthcare providers.', 4);

-- ----------------------------------------------------------------------------
-- Blogs
-- ----------------------------------------------------------------------------
INSERT INTO `blogs` (`id`, `title`, `slug`, `excerpt`, `content`, `cover_image`, `cover_image_alt`, `category_id`, `tags`, `author_name`, `author_role`, `author_bio`, `status`, `is_featured`, `published_at`, `reading_time`, `word_count`, `views`, `meta_title`, `meta_description`, `focus_keyword`, `faqs`, `created_by`, `updated_by`) VALUES
(1, 
 'The Future of SEO in an AI-Driven World', 
 'future-of-seo-in-an-ai-driven-world', 
 'How search engines are evolving with AI Overviews and answer engines — and what clinics and businesses need to do to stay visible.', 
 '<p>The <strong>future of SEO</strong> is being rewritten by AI. Google\'s AI Overviews, ChatGPT search and Perplexity now answer many questions directly — so ranking is no longer just about ten blue links. It\'s about becoming the source those AI systems trust and cite.</p><h2>What is changing in search?</h2><p>Search engines increasingly summarise answers instead of sending every visitor to a website. For high-intent queries such as <em>"best dermatologist near me"</em> or <em>"piles treatment cost in Pune"</em>, users still click — but only on brands that appear credible, local and consistent across the web.</p><ul><li><strong>Answer Engine Optimisation (AEO):</strong> structuring content so AI can quote it accurately.</li><li><strong>Entity SEO:</strong> helping Google understand who your doctors are, what you treat and where you operate.</li><li><strong>Experience signals (E-E-A-T):</strong> real expertise, author credentials and reviews matter more than ever.</li></ul><h2>How to future-proof your SEO strategy</h2><h3>1. Answer real patient questions</h3><p>Build pages and blog posts around the exact questions patients ask before booking. Use clear H2/H3 headings, short paragraphs and FAQ sections so both people and AI can scan them.</p><h3>2. Strengthen your local entity</h3><p>Keep your Google Business Profile complete, consistent NAP (name, address, phone) data everywhere, and a steady stream of genuine reviews.</p><h3>3. Add structured data</h3><p>Schema markup such as <code>MedicalClinic</code>, <code>Physician</code>, <code>FAQPage</code> and <code>BlogPosting</code> tells search engines exactly what your content means.</p><h3>4. Publish with authority</h3><p>Show author names, qualifications and review dates on medical content. Link to trusted sources and keep older articles updated.</p><h2>Key takeaway</h2><p>SEO isn\'t dying — it\'s maturing. Brands that combine technical excellence, genuine expertise and helpful content will be the ones AI search recommends. Need help? <a href="/contact">Talk to the Codigix team</a> about an AI-ready SEO audit.</p>', 
 'https://images.unsplash.com/photo-1432821596592-e2c18b78144f?auto=format&fit=crop&q=80&w=1600', 
 'Laptop showing search analytics on a desk', 
 1, 
 '["SEO", "AI Search", "AEO", "Google"]', 
 'Codigix Team', 
 'Healthcare Growth Strategists', 
 'The Codigix Infotech team helps clinics, hospitals and growing brands win on Google, Maps and social media.', 
 'published', 
 1, 
 DATE_SUB(NOW(), INTERVAL 12 DAY), 
 4, 
 320, 
 1420, 
 'The Future of SEO in an AI-Driven World (2026 Guide)', 
 'AI Overviews and answer engines are changing search. Learn how the future of SEO works and the exact steps clinics and businesses should take to stay visible.', 
 'future of SEO', 
 '[{"question": "Is SEO still worth it with AI search?", "answer": "Yes. AI Overviews and answer engines still rely on well-optimised, authoritative websites as their sources, and high-intent searches continue to drive clicks and bookings."}, {"question": "What is AEO?", "answer": "Answer Engine Optimisation is the practice of structuring content so AI assistants and search features can understand, quote and cite it accurately."}]', 
 1, 
 1),

(2, 
 'Maximizing E-commerce Conversions: 5 Proven Layout Changes', 
 'maximizing-ecommerce-conversions', 
 'Five proven layout changes that significantly improve cart and checkout conversion rates for online stores.', 
 '<p>Traffic is expensive. Improving <strong>ecommerce conversions</strong> is usually the fastest way to grow revenue without increasing ad spend. These five layout changes consistently move the needle.</p><h2>1. Put trust signals above the fold</h2><p>Ratings, delivery timelines and return policies should be visible next to the price — not hidden in the footer.</p><h2>2. Simplify the product page</h2><p>Lead with a sharp product image gallery, a benefit-driven title, price and a single high-contrast "Add to cart" button.</p><h2>3. Use a persistent mini-cart</h2><p>A slide-out cart keeps shoppers on the page and makes it easy to keep browsing.</p><h2>4. Offer guest checkout</h2><p>Forced account creation is one of the biggest causes of cart abandonment. Let customers create an account after purchase.</p><h2>5. Reduce checkout fields</h2><p>Every unnecessary field costs conversions. Use address autocomplete, UPI and wallet payments, and show progress clearly.</p><p>Want a conversion audit for your store? <a href="/contact">Get in touch</a>.</p>', 
 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1600', 
 'E-commerce analytics dashboard on a laptop', 
 4, 
 '["E-commerce", "CRO", "UX"]', 
 'Codigix Team', 
 'Healthcare Growth Strategists', 
 'The Codigix Infotech team helps clinics, hospitals and growing brands win on Google, Maps and social media.', 
 'published', 
 0, 
 DATE_SUB(NOW(), INTERVAL 28 DAY), 
 3, 
 215, 
 890, 
 'Maximizing E-commerce Conversions: 5 Proven Layout Changes', 
 'Boost ecommerce conversions with five tested layout changes for product pages, carts and checkout — simple UX fixes that increase revenue.', 
 'ecommerce conversions', 
 '[]', 
 1, 
 1),

(3, 
 'Building a Brand on Social Media Beyond Vanity Metrics', 
 'building-a-brand-on-social-media', 
 'Moving beyond likes and followers to create genuine engagement that turns followers into patients and customers.', 
 '<p>Likes feel good, but they don\'t pay the bills. Effective <strong>social media branding</strong> focuses on trust, recall and enquiries.</p><h2>Measure what matters</h2><p>Track saves, shares, profile visits, DMs and link clicks. These signals show intent far better than follower counts.</p><h2>Educate before you sell</h2><p>For healthcare brands, short doctor-led videos that answer common questions build authority and reassure patients before their first visit.</p><h2>Show real people</h2><p>Patient stories (with consent), behind-the-scenes clips and team introductions humanise your brand.</p><h2>Be consistent</h2><p>A predictable posting rhythm and a recognisable visual style matter more than occasional viral hits.</p><p>Ready to grow beyond vanity metrics? <a href="/social-media-marketing">Explore our social media services</a>.</p>', 
 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=1600', 
 'Smartphone showing social media apps', 
 3, 
 '["Social Media", "Instagram", "YouTube", "Branding"]', 
 'Codigix Team', 
 'Healthcare Growth Strategists', 
 'The Codigix Infotech team helps clinics, hospitals and growing brands win on Google, Maps and social media.', 
 'published', 
 0, 
 DATE_SUB(NOW(), INTERVAL 41 DAY), 
 3, 
 230, 
 1120, 
 'Social Media Branding Beyond Vanity Metrics | Codigix', 
 'Social media branding that drives real business: how clinics and brands turn reels, YouTube and Instagram into trust, enquiries and bookings.', 
 'social media branding', 
 '[]', 
 1, 
 1),

(4, 
 'Dominating Local Search: How PCMC Clinics Rank #1 on Google Maps 3-Pack', 
 'dominating-local-search-pcmc-google-maps', 
 'Step-by-step blueprint for multi-speciality clinics and hospitals to achieve consistent top 3 visibility in Google local map results.', 
 '<p>When patients search for care in their vicinity, 78% choose one of the top three clinics in the Google Maps pack. Local SEO is the single highest-converting acquisition channel for medical practices.</p><h2>1. Perfecting Your Primary & Secondary GMB Categories</h2><p>Choosing the exact medical speciality category (e.g. <em>Orthopedic Clinic</em> vs general <em>Medical Clinic</em>) directly unlocks the highest relevance score.</p><h2>2. Review Velocity and Keyword-Rich Testimonials</h2><p>Google rewards clinics whose patients naturally mention treatment terms like \"knee replacement\" or \"root canal treatment\" in 5-star reviews.</p><h2>3. Geo-Tagged Local Citations & Photos</h2><p>Authentic clinic interior, staff, and medical equipment photos uploaded weekly build algorithmic confidence and patient reassurance.</p>', 
 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=1600', 
 'Doctor reviewing medical results on tablet with modern clinic background', 
 2, 
 '["Local SEO", "GMB", "Google Maps", "Healthcare"]', 
 'Codigix Team', 
 'Healthcare Growth Strategists', 
 'The Codigix Infotech team helps clinics, hospitals and growing brands win on Google, Maps and social media.', 
 'published', 
 0, 
 DATE_SUB(NOW(), INTERVAL 5 DAY), 
 3, 
 240, 
 1850, 
 'Dominating Local Search: PCMC Clinics on Google Maps | Codigix', 
 'Discover how clinics in PCMC and Pune dominate the Google Maps 3-Pack with local SEO strategies, patient review funnels, and geo-targeted optimization.', 
 'local SEO Google Maps PCMC', 
 '[]', 
 1, 
 1),

(5, 
 'Medical Content Marketing: Crafting High-E-E-A-T Patient Guides That Convert', 
 'medical-content-marketing-high-eeat-guides', 
 'How healthcare practices can write medically accurate, search-optimized condition guides that build profound patient trust.', 
 '<p>Healthcare queries are held to the strict \"Your Money or Your Life\" (YMYL) standards. Generic AI-written articles fail quickly without physician oversight.</p><h2>The E-E-A-T Healthcare Formula</h2><p>Every article must display clear doctor attribution, clinical peer review dates, and reference recognized medical literature (PubMed, WHO, ICMR).</p><h2>Empathy-Driven Formatting</h2><p>Patients read medical content in states of high anxiety. Clear bulleted symptoms, recovery timelines, and transparent consultation steps ease friction and increase booking rates.</p>', 
 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=1600', 
 'Stethoscope and medical records on a doctor consultation desk', 
 5, 
 '["Healthcare Marketing", "Medical Content", "E-E-A-T", "Patient Care"]', 
 'Codigix Team', 
 'Healthcare Growth Strategists', 
 'The Codigix Infotech team helps clinics, hospitals and growing brands win on Google, Maps and social media.', 
 'published', 
 0, 
 DATE_SUB(NOW(), INTERVAL 18 DAY), 
 3, 
 210, 
 1430, 
 'Medical Content Marketing & High-EEAT Strategy | Codigix', 
 'How clinics and healthcare brands publish authoritative, compliant content that satisfies Google medical guidelines and earns patient appointments.', 
 'medical content marketing EEAT', 
 '[]', 
 1, 
 1),

(6, 
 'High-ROI Google Ads for Hospitals: Slashing Cost-Per-Lead by 42%', 
 'high-roi-google-ads-for-hospitals', 
 'A data-backed framework for structuring medical search campaigns, negative keyword sculpting, and high-converting landing pages.', 
 '<p>Medical PPC is fiercely competitive. Without tight negative keyword lists and high-intent bidding, clinics waste thousands on informational searches.</p><h2>Call-Only Campaigns During Clinic Hours</h2><p>Direct phone calls convert at 3x the rate of web contact forms for urgent consultations.</p><h2>Targeting Emergency vs Elective Search Journeys</h2><p>Segment search intent between immediate emergency care and researched elective procedures for maximum return on ad spend.</p>', 
 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=1600', 
 'Data analytics charts showing performance growth and patient appointments', 
 1, 
 '["PPC", "Google Ads", "ROI", "Healthcare Marketing"]', 
 'Codigix Team', 
 'Healthcare Growth Strategists', 
 'The Codigix Infotech team helps clinics, hospitals and growing brands win on Google, Maps and social media.', 
 'published', 
 0, 
 DATE_SUB(NOW(), INTERVAL 34 DAY), 
 3, 
 220, 
 1670, 
 'High-ROI Google Ads for Hospitals & Clinics | Codigix', 
 'Reduce wasted ad spend and acquire high-intent surgical and consultation leads with targeted Google Search & Call-Only ads.', 
 'hospital Google ads ROI', 
 '[]', 
 1, 
 1);

-- ----------------------------------------------------------------------------
-- Clients (Pune & Regional Healthcare / Business Portfolio)
-- ----------------------------------------------------------------------------
INSERT INTO `clients` (`id`, `name`, `location`, `logo`, `website`, `industry`, `is_healthcare`, `show_on_map`, `map_x`, `map_y`, `sort_order`, `is_active`) VALUES
(1, 'Dr. Sheetal\'s Glow', 'Kothrud', '/uploads/clients/sheetals_glow.png', '', 'Healthcare', 1, 1, 25.00, 25.00, 0, 1),
(2, 'Smiles For All', 'Pashan', '/uploads/clients/simles_for_all.webp', '', 'Healthcare', 1, 1, 50.00, 15.00, 1, 1),
(3, 'Ayurlekha', 'Sangamwadi', '/uploads/clients/aayurlekha.png', '', 'Healthcare', 1, 1, 35.00, 80.00, 2, 1),
(4, 'CorpLegal', 'Bavdhan', '/uploads/clients/corplegal.png', '', NULL, 0, 1, 85.00, 50.00, 3, 1),
(5, 'Dr. Shagun Rao', 'Aundh', '/uploads/clients/dr_shagun_rao.webp', '', 'Healthcare', 1, 1, 75.00, 75.00, 4, 1),
(6, 'Shriraj Clinic', 'Bhosari', '/uploads/clients/shriraj-clinic-logo-png.png', '', 'Healthcare', 1, 1, 15.00, 50.00, 5, 1),
(7, 'Sanskruti Agro Farm', 'Chakan', '/uploads/clients/sanskruti-agro-farm-logo.jpg', '', NULL, 0, 1, 35.00, 10.00, 6, 1),
(8, 'Moraya Multispeciality', 'Chinchwad', '/uploads/clients/morya.png', '', 'Healthcare', 1, 1, 38.00, 35.00, 7, 1),
(9, 'Canopy Dental Care', 'Baner', '/uploads/clients/canopy.png', '', 'Healthcare', 1, 1, 65.00, 20.00, 8, 1),
(10, 'Kimaya Brain & Spine', 'Kalewadi', '/uploads/clients/kimya.webp', '', 'Healthcare', 1, 1, 15.00, 85.00, 9, 1),
(11, 'Bakul', 'Kharalwadi', '/uploads/clients/bakul.png', '', NULL, 0, 1, 55.00, 85.00, 10, 1),
(12, 'Kitchen Canvas', 'Aundh', '/uploads/clients/kitchen_canvas.jpg', '', NULL, 0, 1, 90.00, 80.00, 11, 1),
(13, 'Regain', 'Wakad', '/uploads/clients/regain.png', '', NULL, 0, 1, 85.00, 15.00, 12, 1),
(14, 'Shushrut Surgical Hospital', 'Pimpri', '/uploads/clients/shushrut.png', '', 'Healthcare', 1, 1, 65.00, 40.00, 13, 1),
(15, 'Shushrut Piles Clinic', 'Pimpri', '/uploads/clients/shushrut.png', '', 'Healthcare', 1, 1, 60.00, 60.00, 14, 1),
(16, 'Shushrut Clinic', 'Pimpri', '/uploads/clients/shushrut.png', '', 'Healthcare', 1, 1, 10.00, 30.00, 15, 1),
(17, 'Viranjany', 'Wakad', '/uploads/clients/viranjany.webp', '', NULL, 0, 1, 20.00, 65.00, 16, 1);

-- ----------------------------------------------------------------------------
-- Videos (YouTube Patient Stories & Marketing Strategies)
-- ----------------------------------------------------------------------------
INSERT INTO `videos` (`id`, `youtube_id`, `category`, `title`, `subtitle`, `description`, `duration`, `thumbnail`, `sort_order`, `is_active`) VALUES
(1, 'VkiY_0lhS04', 'Market Domination', 'Stop Competing. Start Dominating!', 'Healthcare Market Leadership', 'Strategic playbook for clinics & hospitals to outrank local competition.', '0:45', 'https://img.youtube.com/vi/VkiY_0lhS04/hqdefault.jpg', 0, 1),
(2, 'RhsvzzoOftQ', 'AI & Search Strategy', 'AI Search & Patient Discovery', 'Future-Proof Your Practice', 'How modern clinics capture high-intent patients in the AI search era.', '0:50', 'https://img.youtube.com/vi/RhsvzzoOftQ/hqdefault.jpg', 1, 1),
(3, '2LCpb3gkv4w', 'Doctor Appreciation', 'Dr. Sheetal\'s Glow Clinic', 'Client Review & Feedback', 'Dr. Sheetal shares her growth experience & patient acquisition results.', '0:42', 'https://img.youtube.com/vi/2LCpb3gkv4w/hqdefault.jpg', 2, 1),
(4, 'Brzz1X9F-VE', 'Doctor Testimonial', 'Dr. Dipti Vaidya Recommendation', '5-Star Verified Doctor Review', 'Dr. Dipti Vaidya on brand credibility and dedicated marketing execution.', '0:38', 'https://img.youtube.com/vi/Brzz1X9F-VE/hqdefault.jpg', 3, 1);

-- ----------------------------------------------------------------------------
-- Testimonials
-- ----------------------------------------------------------------------------
INSERT INTO `testimonials` (`id`, `name`, `role`, `company`, `content`, `rating`, `sort_order`, `is_active`) VALUES
(1, 'Rohan Deshpande', 'Retail Business Owner', '', 'Codigix transformed our online presence. Their team is professional, creative and truly understands business growth.', 5, 0, 1),
(2, 'Neha Kulkarni', 'E-commerce Entrepreneur', '', 'Highly recommended for their strategic approach and timely execution. They deliver exactly what they promise.', 5, 1, 1),
(3, 'Sandeep Patil', 'Manufacturing Business', '', 'A reliable and result-oriented team. They bring great ideas to the table and have excellent communication.', 5, 2, 1);

-- ----------------------------------------------------------------------------
-- FAQs
-- ----------------------------------------------------------------------------
INSERT INTO `faqs` (`id`, `question`, `answer`, `page`, `sort_order`, `is_active`) VALUES
(1, 'Do you specialize exclusively in healthcare digital marketing?', 'Yes, Codigix Infotech focuses heavily on healthcare. We understand medical compliance (HIPAA), patient journey mapping, doctor authority branding, and the local SEO keywords needed to drive highly qualified patient appointments.', 'home', 0, 1),
(2, 'How long does it take to see results from Healthcare SEO & GMB?', 'Google Business Profile (GMB) and local map optimizations typically show noticeable increases in patient calls within weeks. High-DA backlink building and organic keyword rankings steadily compound over 3 to 6 months for durable, long-term patient acquisition.', 'home', 1, 1),
(3, 'How do Instagram, Meta, and YouTube help our clinic?', 'We produce informative patient education videos, doctor FAQs, and high-quality reels on Instagram, Meta Business, and YouTube. This builds profound trust and positions your practitioners as leading healthcare authorities in your region.', 'home', 2, 1),
(4, 'Can you redesign our clinic or hospital website for better patient conversions?', 'Absolutely. We build lightning-fast, mobile-responsive, and HIPAA-compliant healthcare websites using Next.js and React, optimized specifically for fast load times and seamless patient booking.', 'home', 3, 1);

-- ----------------------------------------------------------------------------
-- Jobs (Career Openings)
-- ----------------------------------------------------------------------------
INSERT INTO `jobs` (`id`, `title`, `slug`, `department`, `location`, `employment_type`, `work_mode`, `experience`, `salary_range`, `openings`, `summary`, `description`, `responsibilities`, `requirements`, `benefits`, `status`, `sort_order`) VALUES
(1, 
 'SEO Executive', 
 'seo-executive', 
 'Marketing', 
 'Pune, Maharashtra', 
 'Full-time', 
 'On-site', 
 '1–3 years', 
 '', 
 2, 
 'Drive on-page, off-page and local SEO for healthcare and business clients.', 
 '<p>We are looking for a hands-on SEO Executive who loves rankings, data and results. You will work across healthcare, e-commerce and B2B clients.</p>', 
 '["Keyword research and on-page optimisation", "Google Business Profile optimisation", "Link building and outreach", "Monthly reporting with GA4 & Search Console"]', 
 '["1+ year of SEO experience", "Working knowledge of GA4, Search Console and Ahrefs/Semrush", "Good written English"]', 
 '["Fast learning environment", "Performance bonuses", "Healthcare industry exposure"]', 
 'open', 
 0),

(2, 
 'Social Media & Video Content Creator', 
 'social-media-video-content-creator', 
 'Creative', 
 'Pune, Maharashtra', 
 'Full-time', 
 'On-site', 
 '0–2 years', 
 '', 
 1, 
 'Script, shoot and edit reels and YouTube shorts for clinics and brands.', 
 '<p>Create scroll-stopping reels, shorts and posts for our healthcare and lifestyle clients.</p>', 
 '["Plan monthly content calendars", "Shoot and edit reels/shorts", "Write captions and hooks", "Track engagement and iterate"]', 
 '["Portfolio of reels or short-form videos", "Premiere Pro / CapCut / Canva skills", "Comfortable on camera is a plus"]', 
 '["Creative freedom", "Work with doctors & brands", "Growth path to Creative Lead"]', 
 'open', 
 1),

(3, 
 'Performance Marketing & Google Ads Specialist', 
 'performance-marketing-google-ads-specialist', 
 'Performance & Paid Ads', 
 'Pune, Maharashtra', 
 'Full-time', 
 'Hybrid', 
 '2–4 years', 
 '₹5.5L – ₹9.5L + Performance Bonus', 
 2, 
 'Manage multi-lakh Google Ads & Meta campaign budgets with high-ROAS patient lead acquisition funnels.', 
 '<p>Lead search, display, and call-only campaigns for our healthcare institutions and e-commerce clients. You will optimize bidding, analyze attribution, and sculpt conversion-rate improvements.</p>', 
 '["Architect Google Search & Performance Max campaigns", "Manage Meta Ads Manager & lookalike retargeting funnels", "A/B test landing page copy and conversion forms", "Conduct deep ROAS and cost-per-acquisition analysis in GA4"]', 
 '["2+ years managing paid media budgets", "Google Ads and Meta Blueprint certified", "Strong analytical mindset and conversion focus"]', 
 '["Generous quarterly campaign performance bonuses", "₹50,000 annual learning & certification stipend", "Hybrid work flexibility"]', 
 'open', 
 2),

(4, 
 'Medical Content Strategist & Copywriter', 
 'medical-content-strategist-copywriter', 
 'Content & Strategy', 
 'Pune, Maharashtra', 
 'Full-time', 
 'Hybrid', 
 '1–4 years', 
 '₹4.5L – ₹7.5L', 
 2, 
 'Craft high-E-E-A-T patient condition guides, doctor authority scripts, and search-ranking content.', 
 '<p>Translate complex medical treatments into empathetic, accessible patient guides that rank #1 on Google and inspire patient appointments.</p>', 
 '["Write in-depth, medically referenced condition guides", "Script viral doctor Q&A reels and YouTube explainers", "Collaborate with physician advisors for clinical validation", "Optimize articles for Answer Engine Optimization (AEO) and AI Overviews"]', 
 '["Experience writing healthcare, wellness, or B2B content", "Solid understanding of SEO keyword intent and E-E-A-T guidelines", "Flawless written English and storytelling ability"]', 
 '["Work directly with reputed doctors and surgeons", "Flexible working hours and research support", "Medical insurance coverage"]', 
 'open', 
 3),

(5, 
 'UI/UX & Web Conversion Designer', 
 'ui-ux-web-conversion-designer', 
 'Design & Tech', 
 'Pune, Maharashtra', 
 'Full-time', 
 'Hybrid', 
 '2–4 years', 
 '₹5L – ₹8.5L', 
 1, 
 'Design high-converting medical websites, appointment funnels, and modern brand design systems.', 
 '<p>Transform clinical websites into lightning-fast, high-converting digital experiences with Figma, Tailwind, and modern UX patterns.</p>', 
 '["Design intuitive web & mobile UX flows in Figma", "Craft interactive design systems and micro-interactions", "Partner with frontend engineers to ensure pixel-perfect delivery", "Conduct heatmap and user testing conversion optimization"]', 
 '["Strong Figma portfolio showcasing conversion-focused web design", "Understanding of responsive design, accessibility, and typography", "Knowledge of frontend basics (HTML/Tailwind) is a big plus"]', 
 '["Creative leadership opportunities", "High-end ergonomic workstation setup", "Generous paid time off"]', 
 'open', 
 4),

(6, 
 'Healthcare Client Growth & Account Manager', 
 'healthcare-client-growth-account-manager', 
 'Client Strategy', 
 'Pune, Maharashtra', 
 'Full-time', 
 'On-site', 
 '2–5 years', 
 '₹6L – ₹10L + Retention Incentives', 
 1, 
 'Serve as the strategic growth partner for hospitals, IVF centers, and medical practitioners.', 
 '<p>Own executive client relationships, translate marketing metrics into revenue and patient growth stories, and orchestrate campaign execution.</p>', 
 '["Lead strategic monthly business reviews with clinic directors", "Coordinate with SEO, Paid Media, and Creative teams", "Identify expansion opportunities and strategic campaign initiatives", "Ensure high client retention and delight"]', 
 '["2+ years in account management or client servicing at a digital agency", "Excellent presentation and communication skills", "Ability to interpret GA4 and digital growth dashboards"]', 
 '["Direct executive exposure", "Client retention and growth bonuses", "Fast track to Director of Client Accounts"]', 
 'open', 
 5);

SET FOREIGN_KEY_CHECKS = 1;
-- ============================================================================
-- End of Database Dump
-- ============================================================================
