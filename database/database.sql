CREATE DATABASE IF NOT EXISTS deals_db;
USE deals_db;

CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE,
  phone VARCHAR(20),
  company_id INT,
  position VARCHAR(100),
  status ENUM('Active', 'Inactive', 'Lead') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  email VARCHAR(150),
  email_opt_out BOOLEAN DEFAULT FALSE,
  phone VARCHAR(20),
  phone2 VARCHAR(20),
  fax VARCHAR(20),
  website VARCHAR(255),
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  employee_count INT,
  annual_revenue DECIMAL(15, 2),
  status ENUM('Active', 'Inactive', 'Prospect') DEFAULT 'Active',
  account_url VARCHAR(255),
  logo LONGTEXT,
  password VARCHAR(255),
  reviews VARCHAR(100),
  owner VARCHAR(255),
  tags VARCHAR(500),
  source VARCHAR(100),
  currency VARCHAR(10) DEFAULT 'USD',
  language VARCHAR(50) DEFAULT 'English',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_source (source)
);

CREATE TABLE IF NOT EXISTS company_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_name VARCHAR(100) NOT NULL UNIQUE,
  plan_type VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  description TEXT,
  features TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_plan_name (plan_name)
);

CREATE TABLE IF NOT EXISTS company_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  plan_type VARCHAR(50) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  language VARCHAR(50) DEFAULT 'English',
  price DECIMAL(10, 2),
  registered_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiring_on DATE,
  status ENUM('Active', 'Expired', 'Cancelled') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_company_id (company_id),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS deals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  deal_name VARCHAR(255) NOT NULL,
  company_id INT,
  contact_id INT,
  stage VARCHAR(100) NOT NULL,
  deal_value DECIMAL(12, 2) NOT NULL,
  status ENUM('Won', 'Lost', 'Pending') NOT NULL DEFAULT 'Pending',
  expected_close_date DATE,
  probability INT DEFAULT 50,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_stage (stage),
  INDEX idx_status (status),
  INDEX idx_company_id (company_id),
  INDEX idx_contact_id (contact_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_name VARCHAR(255) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(20),
  company VARCHAR(255),
  lead_source VARCHAR(100),
  lead_status ENUM('New', 'Qualified', 'Unqualified', 'Contacted') DEFAULT 'New',
  rating INT,
  notes TEXT,
  owner_id INT,
  value DECIMAL(15, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  lead_type VARCHAR(50),
  industry VARCHAR(100),
  visibility VARCHAR(50) DEFAULT 'Public',
  tags JSON,
  people_assigned JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_lead_status (lead_status),
  INDEX idx_created_at (created_at),
  INDEX idx_owner_id (owner_id),
  INDEX idx_industry (industry)
);

CREATE TABLE IF NOT EXISTS pipeline (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  total_deals INT DEFAULT 0,
  total_value DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at)
);

INSERT INTO company_plans (plan_name, plan_type, price, currency, description, features) VALUES
('Basic', 'Monthly', 29.99, 'USD', 'Basic plan for small teams', 'Basic features, up to 10 users'),
('Basic', 'Yearly', 299.99, 'USD', 'Basic plan for small teams - Annual', 'Basic features, up to 10 users'),
('Professional', 'Monthly', 99.99, 'USD', 'Professional plan for growing teams', 'Professional features, up to 50 users'),
('Professional', 'Yearly', 999.99, 'USD', 'Professional plan - Annual', 'Professional features, up to 50 users'),
('Advanced', 'Monthly', 199.99, 'USD', 'Advanced plan for enterprises', 'Advanced features, unlimited users'),
('Advanced', 'Yearly', 1999.99, 'USD', 'Advanced plan - Annual', 'Advanced features, unlimited users'),
('Enterprise', 'Monthly', 499.99, 'USD', 'Enterprise plan with dedicated support', 'All features, dedicated support, custom integrations'),
('Enterprise', 'Yearly', 4999.99, 'USD', 'Enterprise plan - Annual', 'All features, dedicated support, custom integrations');

INSERT INTO companies (company_name, industry, email, phone, website, account_url, employee_count, status) VALUES
('NovaWave LLC', 'Technology', 'nova@llc.com', '+1-234-567-8900', 'www.novawave.com', 'nw.nova.com', 250, 'Active'),
('BlueSky Industries', 'Finance', 'bluesky@ind.com', '+1-234-567-8901', 'www.bluesky.com', 'bl.blue.com', 500, 'Inactive'),
('Silver Hawk', 'Software', 'silver@hawk.com', '+1-234-567-8902', 'www.silverhawk.com', 'sh.silver.com', 150, 'Active'),
('Summit Peak', 'Manufacturing', 'sumpk@peak.com', '+1-234-567-8903', 'www.summitpeak.com', 'sp.summer.com', 1000, 'Active'),
('RiverStone Venture', 'Startup', 'stone@river.com', '+1-234-567-8904', 'www.riverstone.com', 'ro.stone.com', 50, 'Active');

INSERT INTO company_subscriptions (company_id, plan_name, plan_type, currency, language, price, registered_date, expiring_on) VALUES
(1, 'Advanced', 'Monthly', 'USD', 'English', 199.99, '2024-09-12', '2024-10-11'),
(2, 'Enterprise', 'Monthly', 'USD', 'English', 499.99, '2024-09-12', '2024-10-11'),
(3, 'Advanced', 'Monthly', 'USD', 'English', 199.99, '2024-09-14', '2024-10-14'),
(4, 'Advanced', 'Monthly', 'USD', 'English', 199.99, '2024-09-12', '2024-10-12'),
(5, 'Basic', 'Monthly', 'USD', 'English', 29.99, '2024-09-28', '2024-10-28');

INSERT INTO contacts (first_name, last_name, email, phone, company_id, position, status) VALUES
('John', 'Anderson', 'john.anderson@skyhigh.com', '+1-234-567-8900', 1, 'CEO', 'Active'),
('Sarah', 'Williams', 'sarah.williams@enterprise.com', '+1-234-567-8901', 2, 'Sales Manager', 'Active'),
('Michael', 'Johnson', 'michael.johnson@techinnovations.com', '+1-234-567-8902', 3, 'Product Manager', 'Active'),
('Emily', 'Brown', 'emily.brown@globalindustries.com', '+1-234-567-8903', 4, 'Director', 'Active'),
('David', 'Miller', 'david.miller@startupventures.com', '+1-234-567-8904', 5, 'Founder', 'Lead');

INSERT INTO deals (deal_name, company_id, contact_id, stage, deal_value, status, probability) VALUES
('SkyHigh Annual Booking', 1, 1, 'Appointment', 5451000, 'Won', 100),
('CRM Onboarding Package', 2, 2, 'Contact Made', 7214078, 'Lost', 0),
('Enterprise Plan Upgrade', 3, 3, 'Presentation', 414800, 'Won', 100),
('CRM Migration Project', 4, 4, 'Proposal Made', 1611400, 'Won', 100),
('Sales Pipeline Optimization', 5, 5, 'Qualify To Buy', 905947, 'Won', 100),
('Tech Solutions Integration', 1, 1, 'Inpipeline', 2150000, 'Pending', 75),
('Cloud Services Migration', 2, 2, 'Follow Up', 1850000, 'Lost', 0),
('Digital Transformation Package', 3, 3, 'Conversation', 3200000, 'Won', 100),
('API Integration Suite', 4, 4, 'Inpipeline', 1250000, 'Won', 100),
('Marketing Automation System', 5, 5, 'Conversation', 1800000, 'Pending', 50),
('Enterprise Solution Deal', 1, 1, 'Follow Up', 2500000, 'Won', 100),
('Startup Growth Package', 2, 2, 'Inpipeline', 1200000, 'Lost', 0),
('Advanced Analytics Suite', 3, 3, 'Conversation', 1800000, 'Won', 100),
('Business Intelligence Tool', 4, 4, 'Follow Up', 950000, 'Lost', 0),
('Cloud Infrastructure Setup', 5, 5, 'Presentation', 3500000, 'Won', 100);

INSERT INTO leads (lead_name, email, phone, company, lead_source, lead_status, rating) VALUES
('Robert Taylor', 'robert.taylor@example.com', '+1-234-567-9000', 'Tech Solutions Inc', 'Website', 'New', 8),
('Jennifer Lee', 'jennifer.lee@example.com', '+1-234-567-9001', 'Digital Agency', 'Referral', 'Qualified', 9),
('Thomas Davis', 'thomas.davis@example.com', '+1-234-567-9002', 'Marketing Group', 'Cold Call', 'Contacted', 6),
('Patricia Wilson', 'patricia.wilson@example.com', '+1-234-567-9003', 'Business Solutions', 'Email', 'Unqualified', 4),
('James Martinez', 'james.martinez@example.com', '+1-234-567-9004', 'Innovation Labs', 'Event', 'New', 7);

INSERT INTO pipeline (name, description, total_deals, total_value) VALUES
('Sales Pipeline', 'Main sales pipeline for B2B customers', 5, 15000000),
('Marketing Pipeline', 'Marketing-generated leads and campaigns', 3, 8000000),
('Email Pipeline', 'Email marketing pipeline', 2, 3000000),
('Partnership Pipeline', 'Partnership and strategic alliances', 2, 5000000);
