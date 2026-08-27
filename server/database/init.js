const pool = require('../config/database');
const crypto = require('crypto');

async function initializeDatabase() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        email_opt_out BOOLEAN DEFAULT FALSE,
        password VARCHAR(255) NOT NULL,
        phone1 VARCHAR(20),
        phone1_country VARCHAR(5) DEFAULT 'US',
        phone2 VARCHAR(20),
        phone2_country VARCHAR(5) DEFAULT 'US',
        location VARCHAR(100),
        avatar LONGTEXT,
        role_id INT,
        department VARCHAR(100),
        department_id INT,
        job_title VARCHAR(100),
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username),
        INDEX idx_status (status),
        INDEX idx_role_id (role_id),
        INDEX idx_department_id (department_id)
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS service_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        parent_category VARCHAR(100),
        suggested_department_id INT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        FOREIGN KEY (suggested_department_id) REFERENCES departments(id) ON DELETE SET NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS automation_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        entity_type ENUM('Lead', 'Deal', 'Invoice', 'Project', 'Task') NOT NULL,
        trigger_condition TEXT NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        action_payload JSON,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_entity_type (entity_type),
        INDEX idx_is_active (is_active)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS kpi_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department_id INT,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(15, 2),
        period_start DATE,
        period_end DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
        INDEX idx_department_id (department_id),
        INDEX idx_metric_name (metric_name)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS approvals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        approval_type VARCHAR(100) NOT NULL,
        entity_id INT,
        entity_name VARCHAR(255),
        description LONGTEXT,
        requested_by INT,
        approver INT,
        priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
        status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
        discount_percentage DECIMAL(5, 2),
        discount_amount DECIMAL(15, 2),
        change_scope LONGTEXT,
        impact_assessment LONGTEXT,
        approval_comments LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (approver) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_status (status),
        INDEX idx_approval_type (approval_type),
        INDEX idx_approver (approver),
        INDEX idx_created_at (created_at)
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name)
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_id INT NOT NULL,
        module_name VARCHAR(100) NOT NULL,
        can_create BOOLEAN DEFAULT FALSE,
        can_read BOOLEAN DEFAULT FALSE,
        can_update BOOLEAN DEFAULT FALSE,
        can_delete BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        UNIQUE KEY unique_module_per_role (role_id, module_name),
        INDEX idx_role_id (role_id)
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS delete_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        reason TEXT NOT NULL,
        status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_by INT,
        reviewed_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS general_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description LONGTEXT,
        status ENUM('To Do', 'In Progress', 'Review', 'Completed', 'On Hold', 'Cancelled', 'Open') DEFAULT 'To Do',
        priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
        assigned_to JSON,
        due_date DATE,
        due_time TIME,
        tags JSON,
        linked_type ENUM('General', 'Deal', 'Project', 'Lead') DEFAULT 'General',
        linked_id INT,
        workflow_type VARCHAR(100),
        department_id INT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_priority (priority),
        INDEX idx_due_date (due_date),
        INDEX idx_linked_type (linked_type),
        INDEX idx_linked_id (linked_id),
        INDEX idx_department_id (department_id),
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      )
    `);

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM users LIKE "job_title"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE users ADD COLUMN job_title VARCHAR(100) DEFAULT NULL');
        console.log('✓ Added job_title to users');
      }
    } catch (err) {
      console.warn('Could not add job_title to users:', err.message);
    }

    try {
      await connection.query(`
        ALTER TABLE general_tasks MODIFY COLUMN linked_type ENUM('General', 'Deal', 'Project', 'Lead') DEFAULT 'General'
      `);
    } catch (err) {
      console.warn('Could not update linked_type in general_tasks:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM general_tasks LIKE "created_by"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE general_tasks ADD COLUMN created_by INT');
        console.log('✓ Added created_by to general_tasks');
      }
    } catch (err) {
      console.warn('Could not update created_by in general_tasks:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM general_tasks LIKE "due_time"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE general_tasks ADD COLUMN due_time TIME');
        console.log('✓ Added due_time to general_tasks');
      }
    } catch (err) {
      console.warn('Could not update due_time in general_tasks:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM general_tasks LIKE "internal_notes"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE general_tasks ADD COLUMN internal_notes LONGTEXT');
        console.log('✓ Added internal_notes to general_tasks');
      }
    } catch (err) {
      console.warn('Could not add internal_notes to general_tasks:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM general_tasks LIKE "reminder_date"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE general_tasks ADD COLUMN reminder_date DATETIME');
        console.log('✓ Added reminder_date to general_tasks');
      }
    } catch (err) {
      console.warn('Could not add reminder_date to general_tasks:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM general_tasks LIKE "category"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE general_tasks ADD COLUMN category VARCHAR(100)');
        console.log('✓ Added category to general_tasks');
      }
    } catch (err) {
      console.warn('Could not add category to general_tasks:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM general_tasks LIKE "sub_type"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE general_tasks ADD COLUMN sub_type VARCHAR(100)');
        console.log('✓ Added sub_type to general_tasks');
      }
    } catch (err) {
      console.warn('Could not add sub_type to general_tasks:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM general_tasks LIKE "project_id"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE general_tasks ADD COLUMN project_id INT');
        await connection.query('ALTER TABLE general_tasks ADD CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL');
        console.log('✓ Added project_id to general_tasks');
      }
    } catch (err) {
      console.warn('Could not add project_id to general_tasks:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM general_tasks LIKE "task_type"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE general_tasks ADD COLUMN task_type VARCHAR(100) DEFAULT "General"');
        console.log('✓ Added task_type to general_tasks');
      }
    } catch (err) {
      console.warn('Could not add task_type to general_tasks:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM general_tasks LIKE "next_followup_date"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE general_tasks ADD COLUMN next_followup_date DATETIME');
        console.log('✓ Added next_followup_date to general_tasks');
      }
    } catch (err) {
      console.warn('Could not add next_followup_date to general_tasks:', err.message);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS proposals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        proposal_number VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description LONGTEXT,
        client_id INT NOT NULL,
        contact_id INT,
        deal_id INT,
        created_by INT,
        status ENUM('Draft', 'Submitted', 'Approved', 'Rejected', 'Sent', 'Accepted', 'Declined') DEFAULT 'Draft',
        proposal_date DATE,
        validity_date DATE,
        total_amount DECIMAL(15, 2),
        discount_amount DECIMAL(15, 2) DEFAULT 0,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'INR',
        terms_conditions LONGTEXT,
        notes LONGTEXT,
        version INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_proposal_number (proposal_number),
        INDEX idx_client_id (client_id),
        INDEX idx_deal_id (deal_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS proposal_line_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        proposal_id INT NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        description LONGTEXT,
        quantity DECIMAL(10, 2) NOT NULL,
        rate DECIMAL(15, 2) NOT NULL,
        discount_percent DECIMAL(5, 2) DEFAULT 0,
        discount_amount DECIMAL(15, 2) DEFAULT 0,
        tax_percent DECIMAL(5, 2) DEFAULT 0,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        subtotal DECIMAL(15, 2),
        total DECIMAL(15, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_proposal_id (proposal_id),
        FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS proposal_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        proposal_id INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        action_by INT,
        old_status VARCHAR(50),
        new_status VARCHAR(50),
        comments LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_proposal_id (proposal_id),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS proposal_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        proposal_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100),
        file_size INT,
        file_data LONGBLOB,
        uploaded_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_proposal_id (proposal_id),
        FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        email VARCHAR(150),
        phone VARCHAR(20),
        website VARCHAR(255),
        industry VARCHAR(100),
        revenue DECIMAL(15, 2),
        employees INT,
        description LONGTEXT,
        logo LONGTEXT,
        address VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        zipcode VARCHAR(20),
        status ENUM('Active', 'Inactive', 'Prospect') DEFAULT 'Active',
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_company_name (company_name),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `);

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM companies LIKE "created_by"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE companies ADD COLUMN created_by INT');
        await connection.query('ALTER TABLE companies ADD CONSTRAINT fk_companies_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL');
        console.log('✓ Added created_by to companies');
      }
    } catch (err) {
      console.warn('Could not update created_by in companies:', err.message);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100),
        description LONGTEXT,
        price DECIMAL(15, 2) NOT NULL,
        subscribers_count INT DEFAULT 0,
        status ENUM('Active', 'Inactive', 'Archived') DEFAULT 'Active',
        features JSON,
        billing_cycle VARCHAR(50),
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_status (status),
        INDEX idx_type (type),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subject VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        client_id INT NOT NULL,
        contract_type VARCHAR(100) NOT NULL,
        contract_value DECIMAL(15, 2) NOT NULL,
        description LONGTEXT,
        status ENUM('Draft', 'Active', 'Completed', 'Terminated') DEFAULT 'Draft',
        created_by INT,
        proposal_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_client_id (client_id),
        INDEX idx_start_date (start_date),
        INDEX idx_end_date (end_date),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_proposal_id (proposal_id),
        FOREIGN KEY (client_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE SET NULL
      )
    `);

    try {
      await connection.query(`
        ALTER TABLE contracts ADD COLUMN proposal_id INT, 
        ADD INDEX idx_proposal_id (proposal_id),
        ADD FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE SET NULL
      `);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        console.warn('Could not add proposal_id column to contracts:', err.message);
      }
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        email VARCHAR(150),
        phone VARCHAR(20),
        company_id INT,
        company_name VARCHAR(255),
        position VARCHAR(100),
        department VARCHAR(100),
        source VARCHAR(100),
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        avatar LONGTEXT,
        notes LONGTEXT,
        address VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        tag VARCHAR(100),
        owner_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_first_name (first_name),
        INDEX idx_email (email),
        INDEX idx_company_id (company_id),
        INDEX idx_status (status),
        INDEX idx_owner_id (owner_id),
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_name VARCHAR(255) NOT NULL,
        email VARCHAR(150),
        phone VARCHAR(20),
        company VARCHAR(255),
        company_id INT,
        lead_source VARCHAR(100),
        lead_status ENUM('New', 'Qualified', 'Contacted', 'Unqualified', 'Not Contacted', 'Closed', 'Lost', 'Converted to Deal', 'Quotation', 'Revised Quotation') DEFAULT 'New',
        business_type VARCHAR(100),
        marketing_services JSON,
        it_services VARCHAR(255),
        it_services_other VARCHAR(255),
        service_category_id INT,
        rating INT DEFAULT 5,
        notes LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_lead_name (lead_name),
        INDEX idx_email (email),
        INDEX idx_lead_status (lead_status),
        INDEX idx_created_at (created_at),
        INDEX idx_service_category_id (service_category_id),
        FOREIGN KEY (service_category_id) REFERENCES service_categories(id) ON DELETE SET NULL
      )
    `);

    try {
      await connection.query(`
        ALTER TABLE leads MODIFY COLUMN lead_status ENUM('New', 'Qualified', 'Contacted', 'Unqualified', 'Not Contacted', 'Closed', 'Lost', 'Converted to Deal', 'Quotation', 'Revised Quotation') DEFAULT 'New'
      `);
      console.log('✓ Updated lead_status ENUM in leads');
    } catch (err) {
      console.warn('Could not update lead_status ENUM in leads:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM leads LIKE "company_id"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE leads ADD COLUMN company_id INT AFTER company');
        await connection.query('ALTER TABLE leads ADD CONSTRAINT fk_leads_company_id FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL');
        console.log('✓ Added company_id to leads');
      }
    } catch (err) {
      console.warn('Could not update company_id in leads:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM leads');
      const columnNames = columns.map(c => c.Field);
      
      if (!columnNames.includes('business_type')) {
        await connection.query('ALTER TABLE leads ADD COLUMN business_type VARCHAR(100)');
        console.log('✓ Added business_type to leads');
      }
      if (!columnNames.includes('marketing_services')) {
        await connection.query('ALTER TABLE leads ADD COLUMN marketing_services JSON');
        console.log('✓ Added marketing_services to leads');
      }
      if (!columnNames.includes('it_services')) {
        await connection.query('ALTER TABLE leads ADD COLUMN it_services VARCHAR(255)');
        console.log('✓ Added it_services to leads');
      }
      if (!columnNames.includes('it_services_other')) {
        await connection.query('ALTER TABLE leads ADD COLUMN it_services_other VARCHAR(255)');
        console.log('✓ Added it_services_other to leads');
      }
    } catch (err) {
      console.warn('Could not update business columns in leads:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM leads LIKE "department_id"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE leads ADD COLUMN department_id INT AFTER service_category_id');
        await connection.query('ALTER TABLE leads ADD CONSTRAINT fk_leads_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL');
        console.log('✓ Added department_id to leads');
      }
    } catch (err) {
      console.warn('Could not update department_id in leads:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM leads LIKE "converted_company_id"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE leads ADD COLUMN converted_company_id INT, ADD COLUMN converted_contact_id INT, ADD COLUMN converted_deal_id INT');
        await connection.query('ALTER TABLE leads ADD CONSTRAINT fk_leads_converted_company FOREIGN KEY (converted_company_id) REFERENCES companies(id) ON DELETE SET NULL');
        await connection.query('ALTER TABLE leads ADD CONSTRAINT fk_leads_converted_contact FOREIGN KEY (converted_contact_id) REFERENCES contacts(id) ON DELETE SET NULL');
        await connection.query('ALTER TABLE leads ADD CONSTRAINT fk_leads_converted_deal FOREIGN KEY (converted_deal_id) REFERENCES deals(id) ON DELETE SET NULL');
        console.log('✓ Added conversion tracking columns to leads');
      }
    } catch (err) {
      console.warn('Could not update conversion columns in leads:', err.message);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS deals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        deal_name VARCHAR(255) NOT NULL,
        company_id INT,
        contact_id INT,
        assignee_id INT,
        service_category_id INT,
        deal_value DECIMAL(15, 2),
        currency VARCHAR(10) DEFAULT 'INR',
        deal_stage VARCHAR(100),
        pipeline VARCHAR(100),
        status VARCHAR(100),
        probability INT,
        department_id INT,
        expected_close_date DATE,
        due_date DATE,
        follow_up_date DATE,
        source VARCHAR(100),
        priority VARCHAR(50) DEFAULT 'Medium',
        period VARCHAR(100),
        period_value INT,
        tags VARCHAR(500),
        description LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_company_id (company_id),
        INDEX idx_deal_stage (deal_stage),
        INDEX idx_status (status),
        INDEX idx_expected_close_date (expected_close_date),
        INDEX idx_service_category_id (service_category_id),
        INDEX idx_department_id (department_id),
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (service_category_id) REFERENCES service_categories(id) ON DELETE SET NULL,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      )
    `);

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM deals LIKE "department_id"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE deals ADD COLUMN department_id INT AFTER probability');
        await connection.query('ALTER TABLE deals ADD CONSTRAINT fk_deals_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL');
        console.log('✓ Added department_id to deals');
      }
    } catch (err) {
      console.warn('Could not update department_id in deals:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM deals LIKE "assignee_id"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE deals ADD COLUMN assignee_id INT');
        await connection.query('ALTER TABLE deals ADD CONSTRAINT fk_deals_assignee FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL');
        console.log('✓ Added assignee_id to deals');
      }
    } catch (err) {
      console.warn('Could not update assignee_id in deals:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM deals LIKE "deal_stage"');
      if (columns.length === 0) {
        const [stageColumn] = await connection.query('SHOW COLUMNS FROM deals LIKE "stage"');
        if (stageColumn.length > 0) {
          await connection.query('ALTER TABLE deals CHANGE COLUMN stage deal_stage VARCHAR(100)');
          console.log('✓ Changed stage to deal_stage in deals');
        } else {
          await connection.query('ALTER TABLE deals ADD COLUMN deal_stage VARCHAR(100)');
          console.log('✓ Added deal_stage to deals');
        }
      }
    } catch (err) {
      console.warn('Could not update deal_stage in deals:', err.message);
    }
    try {
      // Make company_id nullable in deals
      await connection.query('ALTER TABLE deals MODIFY COLUMN company_id INT NULL');
      
      // Update foreign key to SET NULL instead of CASCADE for company_id
      try {
        // Find existing constraint name
        const [constraints] = await connection.query(`
          SELECT CONSTRAINT_NAME 
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_NAME = 'deals' 
          AND COLUMN_NAME = 'company_id' 
          AND REFERENCED_TABLE_NAME = 'companies'
        `);
        
        if (constraints.length > 0) {
          const constraintName = constraints[0].CONSTRAINT_NAME;
          await connection.query(`ALTER TABLE deals DROP FOREIGN KEY ${constraintName}`);
          await connection.query('ALTER TABLE deals ADD CONSTRAINT fk_deals_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL');
          console.log('✓ Updated company_id foreign key in deals');
        }
      } catch (fkErr) {
        console.warn('Could not update foreign key in deals:', fkErr.message);
      }
      
      console.log('✓ Made company_id nullable in deals');
    } catch (err) {
      console.warn('Could not update company_id in deals:', err.message);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        description LONGTEXT,
        deal_id INT,
        company_id INT,
        contact_id INT,
        budget DECIMAL(15, 2),
        currency VARCHAR(10) DEFAULT 'INR',
        status ENUM('Planning', 'Execution', 'Review', 'Completed', 'On Hold', 'Cancelled', 'Active') DEFAULT 'Planning',
        start_date DATE,
        end_date DATE,
        due_date DATE,
        parent_project_id INT,
        department_id INT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_status (status),
        INDEX idx_deal_id (deal_id),
        INDEX idx_company_id (company_id),
        INDEX idx_parent_project_id (parent_project_id),
        INDEX idx_department_id (department_id),
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
        FOREIGN KEY (parent_project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        client_id INT NOT NULL,
        bill_to VARCHAR(255),
        ship_to VARCHAR(255),
        project_id INT,
        deal_id INT,
        amount DECIMAL(15, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        invoice_date DATE,
        open_till DATE,
        payment_method VARCHAR(100),
        status ENUM('Draft', 'Sent', 'Paid', 'Unpaid', 'Overdue', 'Partially Paid') DEFAULT 'Draft',
        description LONGTEXT,
        subtotal DECIMAL(15, 2) DEFAULT 0,
        discount_percentage DECIMAL(5, 2) DEFAULT 0,
        discount_amount DECIMAL(15, 2) DEFAULT 0,
        extra_discount_percentage DECIMAL(5, 2) DEFAULT 0,
        extra_discount_amount DECIMAL(15, 2) DEFAULT 0,
        tax_percentage DECIMAL(5, 2) DEFAULT 0,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        total DECIMAL(15, 2),
        notes LONGTEXT,
        terms_conditions LONGTEXT,
        amount_paid DECIMAL(15, 2) DEFAULT 0,
        payment_date DATE,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_client_id (client_id),
        INDEX idx_invoice_number (invoice_number),
        INDEX idx_status (status),
        INDEX idx_invoice_date (invoice_date),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (client_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM invoices LIKE "created_by"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE invoices ADD COLUMN created_by INT');
        await connection.query('ALTER TABLE invoices ADD CONSTRAINT fk_invoices_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL');
        console.log('✓ Added created_by to invoices');
      }
    } catch (err) {
      console.warn('Could not update created_by in invoices:', err.message);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INT NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        description LONGTEXT,
        quantity DECIMAL(10, 2) NOT NULL,
        price DECIMAL(15, 2) NOT NULL,
        discount_percentage DECIMAL(5, 2) DEFAULT 0,
        discount_amount DECIMAL(15, 2) DEFAULT 0,
        tax_percentage DECIMAL(5, 2) DEFAULT 0,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        amount DECIMAL(15, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_invoice_id (invoice_id),
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS it_services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS estimations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        estimation_number VARCHAR(50) UNIQUE NOT NULL,
        client_id INT,
        lead_id INT,
        contact_id INT,
        project_id INT,
        parent_id INT,
        version INT DEFAULT 1,
        bill_to VARCHAR(255),
        ship_to VARCHAR(255),
        amount DECIMAL(15, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        estimate_date DATE,
        expiry_date DATE,
        status ENUM('Draft', 'Sent', 'Accepted', 'Declined', 'Revised', 'Finalized') DEFAULT 'Draft',
        description LONGTEXT,
        tags JSON,
        estimate_by INT,
        discount_percentage DECIMAL(5, 2) DEFAULT 0,
        discount_amount DECIMAL(15, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_client_id (client_id),
        INDEX idx_lead_id (lead_id),
        INDEX idx_parent_id (parent_id),
        INDEX idx_estimation_number (estimation_number),
        INDEX idx_status (status),
        INDEX idx_estimate_date (estimate_date),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (client_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (estimate_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (parent_id) REFERENCES estimations(id) ON DELETE SET NULL
      )
    `);

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM estimations');
      const columnNames = columns.map(c => c.Field);
      
      if (!columnNames.includes('lead_id')) {
        await connection.query('ALTER TABLE estimations ADD COLUMN lead_id INT AFTER client_id');
        await connection.query('ALTER TABLE estimations ADD CONSTRAINT fk_estimations_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL');
        console.log('✓ Added lead_id to estimations');
      }
      
      if (!columnNames.includes('parent_id')) {
        await connection.query('ALTER TABLE estimations ADD COLUMN parent_id INT AFTER project_id');
        await connection.query('ALTER TABLE estimations ADD COLUMN version INT DEFAULT 1 AFTER parent_id');
        await connection.query('ALTER TABLE estimations ADD CONSTRAINT fk_estimations_parent FOREIGN KEY (parent_id) REFERENCES estimations(id) ON DELETE SET NULL');
        console.log('✓ Added parent_id and version to estimations');
      }

      if (!columnNames.includes('discount_percentage')) {
        await connection.query('ALTER TABLE estimations ADD COLUMN discount_percentage DECIMAL(5, 2) DEFAULT 0');
        console.log('✓ Added discount_percentage to estimations table');
      }
      
      if (!columnNames.includes('discount_amount')) {
        await connection.query('ALTER TABLE estimations ADD COLUMN discount_amount DECIMAL(15, 2) DEFAULT 0');
        console.log('✓ Added discount_amount to estimations table');
      }

      if (!columnNames.includes('tax_percentage')) {
        await connection.query('ALTER TABLE estimations ADD COLUMN tax_percentage DECIMAL(5, 2) DEFAULT 0');
        console.log('✓ Added tax_percentage to estimations table');
      }

      if (!columnNames.includes('tax_amount')) {
        await connection.query('ALTER TABLE estimations ADD COLUMN tax_amount DECIMAL(15, 2) DEFAULT 0');
        console.log('✓ Added tax_amount to estimations table');
      }

      if (!columnNames.includes('subtotal')) {
        await connection.query('ALTER TABLE estimations ADD COLUMN subtotal DECIMAL(15, 2) DEFAULT 0');
        console.log('✓ Added subtotal to estimations table');
      }

      if (!columnNames.includes('total')) {
        await connection.query('ALTER TABLE estimations ADD COLUMN total DECIMAL(15, 2) DEFAULT 0');
        console.log('✓ Added total to estimations table');
      }

      if (!columnNames.includes('deal_id')) {
        await connection.query('ALTER TABLE estimations ADD COLUMN deal_id INT AFTER lead_id');
        console.log('✓ Added deal_id to estimations table');
      }

      // Update status ENUM if necessary
      await connection.query("ALTER TABLE estimations MODIFY COLUMN status ENUM('Draft', 'Sent', 'Accepted', 'Declined', 'Revised', 'Finalized') DEFAULT 'Draft'");
      
      // Make client_id nullable if lead_id is present
      await connection.query("ALTER TABLE estimations MODIFY COLUMN client_id INT NULL");
      
    } catch (err) {
      console.warn('⚠️ Could not update estimations columns:', err.message);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS pipeline (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description LONGTEXT,
        position INT,
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_position (position)
      )
    `);

    try {
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'pipeline_stages' AND COLUMN_NAME IN ('probability', 'status')
      `);
      
      if (columns.length < 2) {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('DROP TABLE IF EXISTS pipeline_stages');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✓ Dropped old pipeline_stages table');
      }
    } catch (err) {
      console.warn('⚠️ Could not check pipeline_stages columns:', err.message);
      try {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('DROP TABLE IF EXISTS pipeline_stages');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✓ Force dropped old pipeline_stages table');
      } catch (dropErr) {
        console.warn('⚠️ Could not force drop pipeline_stages:', dropErr.message);
      }
    }
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pipeline_stages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        probability INT NOT NULL,
        description LONGTEXT,
        position INT,
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_probability (probability),
        INDEX idx_position (position)
      )
    `);
    console.log('✓ Pipeline stages table created/verified');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description LONGTEXT,
        status ENUM('Draft', 'Active', 'Paused', 'Completed', 'Cancelled') DEFAULT 'Draft',
        start_date DATE,
        end_date DATE,
        budget DECIMAL(15, 2),
        currency VARCHAR(10) DEFAULT 'INR',
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_status (status)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        message_text LONGTEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sender_id (sender_id),
        INDEX idx_receiver_id (receiver_id),
        INDEX idx_created_at (created_at),
        INDEX idx_is_read (is_read),
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS call_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        caller_name VARCHAR(255) NOT NULL,
        caller_email VARCHAR(150),
        caller_avatar LONGTEXT,
        phone_number VARCHAR(20),
        call_type ENUM('Audio Call', 'Video Call') DEFAULT 'Audio Call',
        call_direction ENUM('Incoming', 'Outgoing', 'Missed Call') DEFAULT 'Outgoing',
        duration INT DEFAULT 0,
        started_at TIMESTAMP NULL,
        ended_at TIMESTAMP NULL,
        meeting_link VARCHAR(255),
        notes LONGTEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_caller (caller_name),
        INDEX idx_call_type (call_type),
        INDEX idx_direction (call_direction),
        INDEX idx_created_at (created_at)
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description LONGTEXT,
        priority ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
        category VARCHAR(100),
        tag VARCHAR(100),
        is_important BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_priority (priority),
        INDEX idx_tag (tag),
        INDEX idx_created_at (created_at)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS file_folders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        parent_id INT,
        storage_type ENUM('Internal', 'Dropbox', 'Google Drive', 'Cloud Storage') DEFAULT 'Internal',
        path VARCHAR(500),
        size_bytes BIGINT DEFAULT 0,
        file_count INT DEFAULT 0,
        is_shared BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES file_folders(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_parent_id (parent_id),
        INDEX idx_storage_type (storage_type),
        INDEX idx_created_at (created_at)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        folder_id INT,
        name VARCHAR(255) NOT NULL,
        file_type VARCHAR(50),
        size_bytes BIGINT NOT NULL,
        storage_type ENUM('Internal', 'Dropbox', 'Google Drive', 'Cloud Storage') DEFAULT 'Internal',
        file_path VARCHAR(500),
        mime_type VARCHAR(100),
        is_favorite BOOLEAN DEFAULT FALSE,
        is_shared BOOLEAN DEFAULT FALSE,
        access_count INT DEFAULT 0,
        lead_id INT,
        contact_id INT,
        company_id INT,
        deal_id INT,
        project_id INT,
        task_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES file_folders(id) ON DELETE CASCADE,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (task_id) REFERENCES general_tasks(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_folder_id (folder_id),
        INDEX idx_file_type (file_type),
        INDEX idx_storage_type (storage_type),
        INDEX idx_is_favorite (is_favorite),
        INDEX idx_lead_id (lead_id),
        INDEX idx_contact_id (contact_id),
        INDEX idx_company_id (company_id),
        INDEX idx_deal_id (deal_id),
        INDEX idx_project_id (project_id),
        INDEX idx_task_id (task_id),
        INDEX idx_created_at (created_at)
      )
    `);

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM files');
      const columnNames = columns.map(c => c.Field);

      if (!columnNames.includes('lead_id')) {
        await connection.query('ALTER TABLE files ADD COLUMN lead_id INT AFTER access_count');
        await connection.query('ALTER TABLE files ADD CONSTRAINT fk_files_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL');
        await connection.query('ALTER TABLE files ADD INDEX idx_lead_id (lead_id)');
        console.log('✓ Added lead_id to files');
      }
      if (!columnNames.includes('contact_id')) {
        await connection.query('ALTER TABLE files ADD COLUMN contact_id INT AFTER lead_id');
        await connection.query('ALTER TABLE files ADD CONSTRAINT fk_files_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL');
        await connection.query('ALTER TABLE files ADD INDEX idx_contact_id (contact_id)');
        console.log('✓ Added contact_id to files');
      }
      if (!columnNames.includes('company_id')) {
        await connection.query('ALTER TABLE files ADD COLUMN company_id INT AFTER contact_id');
        await connection.query('ALTER TABLE files ADD CONSTRAINT fk_files_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL');
        await connection.query('ALTER TABLE files ADD INDEX idx_company_id (company_id)');
        console.log('✓ Added company_id to files');
      }
      if (!columnNames.includes('deal_id')) {
        await connection.query('ALTER TABLE files ADD COLUMN deal_id INT AFTER company_id');
        await connection.query('ALTER TABLE files ADD CONSTRAINT fk_files_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL');
        await connection.query('ALTER TABLE files ADD INDEX idx_deal_id (deal_id)');
        console.log('✓ Added deal_id to files');
      }
      if (!columnNames.includes('project_id')) {
        await connection.query('ALTER TABLE files ADD COLUMN project_id INT AFTER deal_id');
        await connection.query('ALTER TABLE files ADD CONSTRAINT fk_files_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL');
        await connection.query('ALTER TABLE files ADD INDEX idx_project_id (project_id)');
        console.log('✓ Added project_id to files');
      }
      if (!columnNames.includes('task_id')) {
        await connection.query('ALTER TABLE files ADD COLUMN task_id INT AFTER project_id');
        await connection.query('ALTER TABLE files ADD CONSTRAINT fk_files_task FOREIGN KEY (task_id) REFERENCES general_tasks(id) ON DELETE SET NULL');
        await connection.query('ALTER TABLE files ADD INDEX idx_task_id (task_id)');
        console.log('✓ Added task_id to files');
      }
    } catch (err) {
      console.warn('Could not update files table columns:', err.message);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS file_shares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_id INT,
        folder_id INT,
        shared_by_id INT NOT NULL,
        shared_with_id INT NOT NULL,
        permission ENUM('View', 'Edit', 'Download') DEFAULT 'View',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES file_folders(id) ON DELETE CASCADE,
        FOREIGN KEY (shared_by_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (shared_with_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_shared_by_id (shared_by_id),
        INDEX idx_shared_with_id (shared_with_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        participant1_id INT NOT NULL,
        participant2_id INT NOT NULL,
        last_message_text LONGTEXT,
        last_message_timestamp TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (participant1_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (participant2_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_participant1_id (participant1_id),
        INDEX idx_participant2_id (participant2_id),
        INDEX idx_updated_at (updated_at),
        UNIQUE KEY unique_conversation (participant1_id, participant2_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        message_text LONGTEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_conversation_id (conversation_id),
        INDEX idx_sender_id (sender_id),
        INDEX idx_receiver_id (receiver_id),
        INDEX idx_created_at (created_at)
      )
    `);

    try {
      await connection.query('ALTER TABLE messages ADD COLUMN conversation_id INT NOT NULL AFTER id');
      await connection.query('ALTER TABLE messages ADD INDEX idx_conversation_id (conversation_id)');
      await connection.query('ALTER TABLE messages ADD CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_FK_DUP_NAME') {
        console.warn('Could not add conversation_id column to messages:', err.message);
      }
    }

    await connection.query('CREATE TABLE IF NOT EXISTS chat_groups (' +
      'id INT AUTO_INCREMENT PRIMARY KEY,' +
      'name VARCHAR(255) NOT NULL,' +
      'description TEXT,' +
      'department_id INT,' +
      'created_by INT,' +
      'avatar LONGTEXT,' +
      'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,' +
      'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,' +
      'FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,' +
      'FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL' +
      ')');

    await connection.query('CREATE TABLE IF NOT EXISTS chat_group_members (' +
      'id INT AUTO_INCREMENT PRIMARY KEY,' +
      'group_id INT NOT NULL,' +
      'user_id INT NOT NULL,' +
      'role ENUM("Member", "Admin") DEFAULT "Member",' +
      'joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,' +
      'FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,' +
      'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,' +
      'UNIQUE KEY unique_member (group_id, user_id)' +
      ')');

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM messages LIKE "group_id"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE messages ADD COLUMN group_id INT AFTER conversation_id');
        await connection.query('ALTER TABLE messages MODIFY COLUMN conversation_id INT');
        await connection.query('ALTER TABLE messages MODIFY COLUMN receiver_id INT');
        await connection.query('ALTER TABLE messages ADD CONSTRAINT fk_messages_group FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE');
        console.log('✓ Added group_id to messages');
      }
    } catch (err) {
      console.warn('Could not update messages table for groups:', err.message);
    }

    try {
      const [fileCols] = await connection.query('SHOW COLUMNS FROM messages LIKE "file_name"');
      if (fileCols.length === 0) {
        await connection.query('ALTER TABLE messages ADD COLUMN file_name VARCHAR(100) NULL AFTER message_text');
        await connection.query('ALTER TABLE messages ADD COLUMN file_size INT NULL AFTER file_name');
        await connection.query('ALTER TABLE messages ADD COLUMN file_type VARCHAR(50) NULL AFTER file_size');
        await connection.query('ALTER TABLE messages ADD COLUMN file_path VARCHAR(255) NULL AFTER file_type');
        console.log('✓ Added file attachment columns to messages table');
      }
    } catch (err) {
      console.warn('Could not add file columns to messages table:', err.message);
    }

    await connection.query('CREATE TABLE IF NOT EXISTS activities (' +
      'id INT AUTO_INCREMENT PRIMARY KEY,' +
      'activity_type VARCHAR(100) NOT NULL DEFAULT "Note",' +
      'title VARCHAR(255) NOT NULL,' +
      'description LONGTEXT,' +
      'status ENUM("Pending", "Completed", "Cancelled") DEFAULT "Pending",' +
      'priority ENUM("Low", "Medium", "High", "Critical") DEFAULT "Medium",' +
      'contact_id INT,' +
      'deal_id INT,' +
      'project_id INT,' +
      'company_id INT,' +
      'lead_id INT,' +
      'task_id INT,' +
      'assigned_to INT,' +
      'created_by INT,' +
      'scheduled_date DATETIME,' +
      'completed_date DATETIME,' +
      'duration_minutes INT,' +
      'meeting_link VARCHAR(500),' +
      'notes LONGTEXT,' +
      'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,' +
      'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,' +
      'FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,' +
      'FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,' +
      'FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,' +
      'FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,' +
      'FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,' +
      'FOREIGN KEY (task_id) REFERENCES general_tasks(id) ON DELETE SET NULL,' +
      'FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,' +
      'FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,' +
      'INDEX idx_activity_type (activity_type),' +
      'INDEX idx_status (status),' +
      'INDEX idx_contact_id (contact_id),' +
      'INDEX idx_deal_id (deal_id),' +
      'INDEX idx_project_id (project_id),' +
      'INDEX idx_company_id (company_id),' +
      'INDEX idx_lead_id (lead_id),' +
      'INDEX idx_task_id (task_id),' +
      'INDEX idx_assigned_to (assigned_to),' +
      'INDEX idx_created_by (created_by),' +
      'INDEX idx_scheduled_date (scheduled_date),' +
      'INDEX idx_created_at (created_at)' +
      ')');

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM activities LIKE "created_by"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE activities ADD COLUMN created_by INT');
        await connection.query('ALTER TABLE activities ADD CONSTRAINT fk_activities_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL');
        console.log('✓ Added created_by to activities');
      }
    } catch (err) {
      console.warn('Could not update created_by in activities:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM activities LIKE "completed_date"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE activities ADD COLUMN completed_date DATETIME');
        console.log('✓ Added completed_date to activities');
      }
    } catch (err) {
      console.warn('Could not update completed_date in activities:', err.message);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS followups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        related_type ENUM('Lead', 'Deal', 'Customer', 'Invoice') NOT NULL,
        related_id INT NOT NULL,
        type VARCHAR(100) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT,
        scheduled_date DATE NOT NULL,
        scheduled_time TIME NOT NULL,
        priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
        reminder_before VARCHAR(50),
        is_recurring BOOLEAN DEFAULT FALSE,
        recurrence_frequency VARCHAR(50),
        recurrence_end_date DATE,
        meeting_link VARCHAR(500),
        meeting_location VARCHAR(255),
        meeting_duration VARCHAR(50),
        assigned_to INT,
        assigned_to_name VARCHAR(255),
        status ENUM('Scheduled', 'Completed', 'Pending', 'Overdue', 'Cancelled') DEFAULT 'Scheduled',
        outcome VARCHAR(100),
        call_duration VARCHAR(50),
        remarks TEXT,
        next_followup_date DATE,
        next_followup_time TIME,
        next_followup_type VARCHAR(100),
        recording_url VARCHAR(500),
        transcript LONGTEXT,
        ai_summary TEXT,
        ai_sentiment VARCHAR(50),
        ai_key_points JSON,
        ai_suggested_actions JSON,
        ai_outcome_classification VARCHAR(50),
        lead_id INT,
        deal_id INT,
        contact_id INT,
        invoice_id INT,
        task_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
        FOREIGN KEY (task_id) REFERENCES general_tasks(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_related (related_type, related_id),
        INDEX idx_scheduled (scheduled_date, scheduled_time),
        INDEX idx_status (status),
        INDEX idx_lead_id (lead_id),
        INDEX idx_deal_id (deal_id),
        INDEX idx_contact_id (contact_id),
        INDEX idx_invoice_id (invoice_id),
        INDEX idx_assigned_to (assigned_to)
      )
    `);

    // Add AI and recording columns to followups if they don't exist
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM followups LIKE "project_id"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE followups ADD COLUMN project_id INT AFTER task_id');
        await connection.query('ALTER TABLE followups ADD CONSTRAINT fk_followups_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL');
        await connection.query('ALTER TABLE followups ADD INDEX idx_project_id (project_id)');
        console.log('✓ Added project_id to followups');
      }
    } catch (err) {
      console.warn('Could not update followups project_id:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM followups');
      const columnNames = columns.map(c => c.Field);
      
      const newCols = [
        { name: 'recording_url', type: 'VARCHAR(500)' },
        { name: 'transcript', type: 'LONGTEXT' },
        { name: 'ai_summary', type: 'TEXT' },
        { name: 'ai_sentiment', type: 'VARCHAR(50)' },
        { name: 'ai_key_points', type: 'JSON' },
        { name: 'ai_suggested_actions', type: 'JSON' },
        { name: 'ai_outcome_classification', type: 'VARCHAR(50)' },
        { name: 'client_email', type: 'VARCHAR(150)' },
        { name: 'client_phone', type: 'VARCHAR(20)' },
        { name: 'calendar_event_id', type: 'VARCHAR(255)' },
        { name: 'formal_message', type: 'TEXT' },
        { name: 'assigned_to_email', type: 'VARCHAR(150)' }
      ];
      
      for (const col of newCols) {
        if (!columnNames.includes(col.name)) {
          await connection.query(`ALTER TABLE followups ADD COLUMN ${col.name} ${col.type}`);
          console.log(`✓ Added ${col.name} to followups`);
        }
      }
    } catch (err) {
      console.warn('Could not update followups AI columns:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM contacts LIKE "owner_id"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE contacts ADD COLUMN owner_id INT AFTER tag');
        await connection.query('ALTER TABLE contacts ADD CONSTRAINT fk_contacts_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL');
        await connection.query('ALTER TABLE contacts ADD INDEX idx_owner_id (owner_id)');
        console.log('✓ Added owner_id to contacts');
      }
    } catch (err) {
      console.warn('Could not update contacts owner_id:', err.message);
    }

    try {
      await connection.query('ALTER TABLE activities ADD COLUMN lead_id INT AFTER company_id');
      await connection.query('ALTER TABLE activities ADD CONSTRAINT fk_activities_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL');
      await connection.query('ALTER TABLE activities ADD INDEX idx_lead_id (lead_id)');
    } catch (err) {}

    try {
      await connection.query('ALTER TABLE activities ADD COLUMN task_id INT AFTER lead_id');
      await connection.query('ALTER TABLE activities ADD CONSTRAINT fk_activities_task FOREIGN KEY (task_id) REFERENCES general_tasks(id) ON DELETE SET NULL');
      await connection.query('ALTER TABLE activities ADD INDEX idx_task_id (task_id)');
    } catch (err) {}

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM activities LIKE "scheduled_time"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE activities ADD COLUMN scheduled_time TIME AFTER scheduled_date');
        console.log('✓ Added scheduled_time to activities');
      }
    } catch (err) {
      console.warn('Could not update activities scheduled_time:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM followups LIKE "task_id"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE followups ADD COLUMN task_id INT AFTER invoice_id');
        await connection.query('ALTER TABLE followups ADD CONSTRAINT fk_followups_task FOREIGN KEY (task_id) REFERENCES general_tasks(id) ON DELETE SET NULL');
        await connection.query('ALTER TABLE followups ADD INDEX idx_task_id (task_id)');
        console.log('✓ Added task_id to followups');
      }
    } catch (err) {
      console.warn('Could not update followups task_id:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM followups LIKE "assigned_to"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE followups ADD COLUMN assigned_to INT AFTER meeting_duration');
        await connection.query('ALTER TABLE followups ADD COLUMN assigned_to_name VARCHAR(255) AFTER assigned_to');
        await connection.query('ALTER TABLE followups ADD CONSTRAINT fk_followups_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL');
        await connection.query('ALTER TABLE followups ADD INDEX idx_assigned_to (assigned_to)');
        console.log('✓ Added assigned_to and assigned_to_name to followups');
      }
    } catch (err) {
      console.warn('Could not update followups assigned_to:', err.message);
    }

    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM followups LIKE "next_followup_time"');
      if (columns.length === 0) {
        await connection.query('ALTER TABLE followups ADD COLUMN next_followup_time TIME AFTER next_followup_date');
        await connection.query('ALTER TABLE followups ADD COLUMN next_followup_type VARCHAR(100) AFTER next_followup_time');
        console.log('✓ Added next_followup_time and next_followup_type to followups');
      }
    } catch (err) {
      console.warn('Could not update followups next_followup columns:', err.message);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS entity_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description LONGTEXT NOT NULL,
        contact_id INT,
        company_id INT,
        deal_id INT,
        project_id INT,
        lead_id INT,
        task_id INT,
        priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
        is_important BOOLEAN DEFAULT FALSE,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
        FOREIGN KEY (task_id) REFERENCES general_tasks(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_contact_id (contact_id),
        INDEX idx_company_id (company_id),
        INDEX idx_deal_id (deal_id),
        INDEX idx_project_id (project_id),
        INDEX idx_lead_id (lead_id),
        INDEX idx_task_id (task_id),
        INDEX idx_is_important (is_important),
        INDEX idx_created_at (created_at)
      )
    `);

    try {
      await connection.query('ALTER TABLE entity_notes ADD COLUMN lead_id INT AFTER project_id');
      await connection.query('ALTER TABLE entity_notes ADD CONSTRAINT fk_notes_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL');
      await connection.query('ALTER TABLE entity_notes ADD INDEX idx_lead_id (lead_id)');
    } catch (err) {}

    try {
      await connection.query('ALTER TABLE entity_notes ADD COLUMN task_id INT AFTER lead_id');
      await connection.query('ALTER TABLE entity_notes ADD CONSTRAINT fk_notes_task FOREIGN KEY (task_id) REFERENCES general_tasks(id) ON DELETE SET NULL');
      await connection.query('ALTER TABLE entity_notes ADD INDEX idx_task_id (task_id)');
    } catch (err) {}

    await connection.query(`
      CREATE TABLE IF NOT EXISTS company_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_name VARCHAR(255) NOT NULL,
        plan_type VARCHAR(100),
        plan_position INT,
        plan_currency VARCHAR(10),
        plan_currency_free VARCHAR(10),
        discount_type VARCHAR(50),
        discount DECIMAL(10, 2),
        limitations_invoices INT,
        max_customers INT,
        product VARCHAR(255),
        supplier VARCHAR(255),
        modules LONGTEXT,
        access_trial BOOLEAN DEFAULT FALSE,
        trial_days INT,
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_plan_name (plan_name),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_name VARCHAR(255) NOT NULL,
        plan_type VARCHAR(100) NOT NULL,
        price DECIMAL(15, 2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'INR',
        total_subscribers INT DEFAULT 0,
        description LONGTEXT,
        features JSON,
        status ENUM('Active', 'Inactive', 'Archived') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_plan_name (plan_name),
        INDEX idx_plan_type (plan_type),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS marketing_projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        campaign_id INT,
        marketing_type ENUM('SEO', 'Social Media', 'Graphics', 'Video', 'WordPress', 'Other') NOT NULL,
        content_plan LONGTEXT,
        target_audience TEXT,
        platforms JSON,
        budget DECIMAL(15, 2),
        status ENUM('Planning', 'Content Creation', 'Approval', 'Scheduled', 'Published', 'Archived') DEFAULT 'Planning',
        published_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
        INDEX idx_project_id (project_id),
        INDEX idx_marketing_type (marketing_type),
        INDEX idx_status (status)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS it_projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        tech_stack JSON,
        repository_url VARCHAR(500),
        staging_url VARCHAR(500),
        production_url VARCHAR(500),
        it_project_type ENUM('Web Development', 'App Development', 'Software Development', 'DevOps', 'Other') NOT NULL,
        status ENUM('Backlog', 'Development', 'Testing', 'Deployment', 'Maintenance', 'Completed') DEFAULT 'Backlog',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_project_id (project_id),
        INDEX idx_status (status)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sprints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        goal TEXT,
        start_date DATE,
        end_date DATE,
        status ENUM('Planned', 'Active', 'Completed', 'Cancelled') DEFAULT 'Planned',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_project_id (project_id),
        INDEX idx_status (status)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS bugs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        sprint_id INT,
        title VARCHAR(255) NOT NULL,
        description LONGTEXT,
        severity ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
        priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
        status ENUM('New', 'Confirmed', 'In Progress', 'Resolved', 'Verified', 'Closed', 'Reopened') DEFAULT 'New',
        reported_by INT,
        assigned_to INT,
        reproduction_steps LONGTEXT,
        fix_version VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL,
        FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_project_id (project_id),
        INDEX idx_status (status),
        INDEX idx_severity (severity)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS code_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        pull_request_url VARCHAR(500),
        status ENUM('Pending', 'In Review', 'Approved', 'Rejected', 'Merged') DEFAULT 'Pending',
        reviewer_id INT,
        author_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_project_id (project_id),
        INDEX idx_status (status)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS deployments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        environment ENUM('Staging', 'Production', 'Development') NOT NULL,
        version VARCHAR(100),
        status ENUM('Pending', 'In Progress', 'Success', 'Failed', 'Rolled Back') DEFAULT 'Pending',
        deployed_by INT,
        approved_by INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (deployed_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_project_id (project_id),
        INDEX idx_environment (environment)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS seo_management (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        keyword VARCHAR(255) NOT NULL,
        target_url VARCHAR(500),
        current_ranking INT,
        target_ranking INT,
        search_volume INT,
        competition VARCHAR(50),
        last_updated DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_project_id (project_id),
        INDEX idx_keyword (keyword)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS gmb_management (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        location_name VARCHAR(255) NOT NULL,
        map_url VARCHAR(500),
        average_rating DECIMAL(3, 2) DEFAULT 0.0,
        total_reviews INT DEFAULT 0,
        status ENUM('Active', 'Needs Optimization', 'Pending Verification', 'Suspended') DEFAULT 'Active',
        last_post_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_project_id (project_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS creative_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description LONGTEXT,
        request_type ENUM('Graphic', 'Video', 'Content', 'Logo', 'Other') NOT NULL,
        status ENUM('Requested', 'In Design', 'Review', 'Approved', 'Rejected') DEFAULT 'Requested',
        priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
        requested_by INT,
        assigned_to INT,
        due_date DATE,
        attachment_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_project_id (project_id),
        INDEX idx_status (status)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS content_calendar (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content_type ENUM('Blog', 'Social Post', 'Video', 'Newsletter', 'Other') NOT NULL,
        scheduled_date DATETIME NOT NULL,
        status ENUM('Draft', 'Review', 'Approved', 'Scheduled', 'Published') DEFAULT 'Draft',
        assigned_to INT,
        platform VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_project_id (project_id),
        INDEX idx_scheduled_date (scheduled_date),
        INDEX idx_status (status)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS commissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        deal_id INT,
        invoice_id INT,
        amount DECIMAL(15, 2) NOT NULL,
        percentage DECIMAL(5, 2),
        status ENUM('Pending', 'Approved', 'Paid', 'Cancelled') DEFAULT 'Pending',
        approved_by INT,
        approved_at DATETIME,
        paid_at DATETIME,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS campaign_performance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaign_id INT NOT NULL,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(15, 2) NOT NULL,
        recorded_at DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        INDEX idx_campaign_id (campaign_id),
        INDEX idx_recorded_at (recorded_at)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INT NOT NULL,
        entity_name VARCHAR(255),
        reminder_type ENUM('email', 'sms', 'call', 'notification') DEFAULT 'email',
        reminder_datetime DATETIME NOT NULL,
        message LONGTEXT,
        frequency ENUM('once', 'daily', 'weekly', 'monthly') DEFAULT 'once',
        status ENUM('Pending', 'Sent', 'Completed', 'Skipped') DEFAULT 'Pending',
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_entity_type (entity_type),
        INDEX idx_entity_id (entity_id),
        INDEX idx_reminder_datetime (reminder_datetime),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `);
    
    try {
      await connection.query('ALTER TABLE users ADD COLUMN department VARCHAR(100)');
      console.log('✓ Added department column to users table');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        console.warn('Could not add department column to users:', err.message);
      }
    }

    // Add additional columns to existing tables for multi-department workflows
    const alterTables = [
      { table: 'users', column: 'department_role', definition: "ENUM('Executive', 'Manager') DEFAULT 'Executive'" },
      { table: 'leads', column: 'follow_up_count', definition: "INT DEFAULT 0" },
      { table: 'leads', column: 'last_follow_up', definition: "DATETIME" },
      { table: 'deals', column: 'discount_amount', definition: "DECIMAL(15, 2) DEFAULT 0" },
      { table: 'deals', column: 'discount_reason', definition: "TEXT" },
      { table: 'deals', column: 'discount_approved_by', definition: "INT" },
      { table: 'deals', column: 'discount_status', definition: "ENUM('None', 'Pending', 'Approved', 'Rejected') DEFAULT 'None'" },
      // A single client deal can cover several services at once (SEO + PPC + Social Media...)
      { table: 'deals', column: 'services', definition: "JSON" },
      { table: 'projects', column: 'workflow_type', definition: "ENUM('Standard', 'Marketing', 'IT') DEFAULT 'Standard'" },
      { table: 'projects', column: 'priority', definition: "VARCHAR(50) DEFAULT 'Medium'" },
      { table: 'general_tasks', column: 'sprint_id', definition: "INT" },
      { table: 'general_tasks', column: 'department_id', definition: "INT" },
      { table: 'general_tasks', column: 'task_type', definition: "VARCHAR(100)" },
      { table: 'invoices', column: 'approval_status', definition: "ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending'" },
      { table: 'invoices', column: 'approved_by', definition: "INT" }
    ];

    for (const alter of alterTables) {
      try {
        await connection.query(`ALTER TABLE ${alter.table} ADD COLUMN ${alter.column} ${alter.definition}`);
        console.log(`✓ Added ${alter.column} column to ${alter.table} table`);
      } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') {
          console.warn(`Could not add ${alter.column} column to ${alter.table}:`, err.message);
        }
      }
    }

    console.log('✓ All tables initialized successfully');
    
    const [existingRoles] = await connection.query('SELECT COUNT(*) as count FROM roles');
    if (existingRoles[0].count === 0) {
      const defaultRoles = [
        { name: 'Super Admin', description: 'Full system access - can manage everything' },
        { name: 'Admin', description: 'Company-wide management - cannot change system settings' },
        { name: 'Leads Manager', description: 'Manages leads, distribution, and conversion' },
        { name: 'Deals Manager', description: 'Manages deal pipeline, approvals, and forecasts' },
        { name: 'Sales Manager', description: 'Manages sales team, targets, and commissions' },
        { name: 'Marketing Manager', description: 'Manages marketing projects, campaigns, and creative requests' },
        { name: 'IT Manager', description: 'Manages IT projects, sprints, bugs, and deployments' },
        { name: 'Accounting Manager', description: 'Manages invoices, payments, and financial reports' },
        { name: 'Sales Executive', description: 'Sales person focusing on individual leads and deals' },
        { name: 'Marketing Executive', description: 'Creative, SEO, or content contributor' },
        { name: 'IT Specialist', description: 'Developer, Tester, or DevOps engineer' },
        { name: 'Accountant', description: 'Handles day-to-day accounting tasks' },
        { name: 'Employee', description: 'General staff with limited access' }
      ];
      for (const role of defaultRoles) {
        await connection.query('INSERT INTO roles (name, description) VALUES (?, ?)', [role.name, role.description]);
        console.log(`✓ Role created: ${role.name}`);
      }
      console.log('✓ All default roles created');
    } else {
      const [roles] = await connection.query('SELECT id, name FROM roles ORDER BY id');
      console.log('✓ Existing roles found:', roles.map(r => `${r.id}: ${r.name}`).join(', '));
    }
    
    const [existingDepts] = await connection.query('SELECT COUNT(*) as count FROM departments');
    if (existingDepts[0].count === 0) {
      const defaultDepts = [
        'Admin', 'Leads Management', 'Deals Management', 'Sales Department', 
        'Marketing Department', 'IT Department', 'Accounting Department'
      ];
      for (const name of defaultDepts) {
        await connection.query('INSERT INTO departments (name) VALUES (?)', [name]);
      }
      console.log('✓ Default departments created');

      const categories = [
        { name: 'SEO', parent: 'Marketing Services', dept: 'Marketing Department' },
        { name: 'Social Media', parent: 'Marketing Services', dept: 'Marketing Department' },
        { name: 'Graphics', parent: 'Marketing Services', dept: 'Marketing Department' },
        { name: 'Video', parent: 'Marketing Services', dept: 'Marketing Department' },
        { name: 'WordPress', parent: 'Marketing Services', dept: 'Marketing Department' },
        { name: 'Web Development', parent: 'IT Services', dept: 'IT Department' },
        { name: 'App Development', parent: 'IT Services', dept: 'IT Department' },
        { name: 'Software Development', parent: 'IT Services', dept: 'IT Department' }
      ];

      for (const cat of categories) {
        const [dept] = await connection.query('SELECT id FROM departments WHERE name = ?', [cat.dept]);
        const deptId = dept.length > 0 ? dept[0].id : null;
        await connection.query('INSERT INTO service_categories (name, parent_category, suggested_department_id) VALUES (?, ?, ?)', [cat.name, cat.parent, deptId]);
      }
      console.log('✓ Service categories seeded');
    }

    const [existingModules] = await connection.query('SELECT COUNT(*) as count FROM modules');
    if (existingModules[0].count === 0) {
      const defaultModules = ['Dashboard', 'Contacts', 'Companies', 'Leads', 'Deals', 'Pipelines', 'Campaign', 'Projects', 'Tasks', 'Activity'];
      for (const module of defaultModules) {
        await connection.query('INSERT INTO modules (name) VALUES (?)', [module]);
      }
      console.log('✓ Default modules created');
    }

    const [existingUsers] = await connection.query('SELECT COUNT(*) as count FROM users');
    if (existingUsers[0].count === 0) {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
      const generatedPassword = crypto.randomBytes(12).toString('hex');
      const adminPassword = process.env.ADMIN_PASSWORD || generatedPassword;
      const adminUser = { first_name: 'Super', last_name: 'Admin', email: adminEmail, password: adminPassword, role_id: 1, department: 'Admin' };
      const username = adminUser.email.split('@')[0];
      const hashedPassword = crypto.pbkdf2Sync(adminUser.password, 'salt', 1000, 64, 'sha512').toString('hex');
      await connection.query(
        'INSERT INTO users (first_name, last_name, username, email, password, role_id, status, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [adminUser.first_name, adminUser.last_name, username, adminUser.email, hashedPassword, adminUser.role_id, 'Active', adminUser.department]
      );
      if (process.env.ADMIN_PASSWORD) {
        console.log(`✓ Default admin user created: ${adminEmail}`);
      } else {
        console.log(`✓ Default admin user created: ${adminEmail} / ${adminPassword}`);
        console.log('  ⚠ This password was auto-generated because ADMIN_PASSWORD was not set. Log in and change it immediately, or set ADMIN_EMAIL/ADMIN_PASSWORD before first run.');
      }
    }

    if (process.env.SEED_DEMO_DATA === 'true') {
      console.log('🌱 Seeding demo data...');
      console.log('  ⚠ SEED_DEMO_DATA is enabled — this creates demo accounts with a shared known password. Never enable this in a production or internet-reachable environment.');
      if (existingUsers[0].count <= 1) { // If only admin or no users
        const demoPassword = process.env.DEMO_USER_PASSWORD || 'pass123';
        const demoUsers = [
          { first_name: 'Leads', last_name: 'Manager', email: 'leads@example.com', password: demoPassword, role_id: 3, department: 'Leads Management' },
          { first_name: 'Deals', last_name: 'Manager', email: 'deals@example.com', password: demoPassword, role_id: 4, department: 'Deals Management' },
          { first_name: 'Sales', last_name: 'Manager', email: 'sales@example.com', password: demoPassword, role_id: 5, department: 'Sales Department' },
          { first_name: 'Marketing', last_name: 'Manager', email: 'marketing@example.com', password: demoPassword, role_id: 6, department: 'Marketing Department' },
          { first_name: 'IT', last_name: 'Manager', email: 'it@example.com', password: demoPassword, role_id: 7, department: 'IT Department' },
          { first_name: 'Accounting', last_name: 'Manager', email: 'accounting@example.com', password: demoPassword, role_id: 8, department: 'Accounting Department' }
        ];
        for (const user of demoUsers) {
          const username = user.email.split('@')[0];
          const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [user.email]);
          if (existing.length === 0) {
            const hashedPassword = crypto.pbkdf2Sync(user.password, 'salt', 1000, 64, 'sha512').toString('hex');
            await connection.query(
              'INSERT INTO users (first_name, last_name, username, email, password, role_id, status, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [user.first_name, user.last_name, username, user.email, hashedPassword, user.role_id, 'Active', user.department]
            );
          }
        }
        console.log('✓ Demo users for each department created');
      }

      // Fetch user IDs for subsequent seeding
      const [users] = await connection.query('SELECT id FROM users LIMIT 10');
      const userIds = users.map(u => u.id);
      const adminId = userIds[0] || null;

      const [existingCompanies] = await connection.query('SELECT COUNT(*) as count FROM companies');
      if (existingCompanies[0].count === 0) {
        const demoCompanies = [
          { company_name: 'Acme Corporation', email: 'contact@acme.com', phone: '555-0101', website: 'https://acme.com', industry: 'Technology', status: 'Active', created_by: adminId },
          { company_name: 'Global Solutions Inc', email: 'info@globalsol.com', phone: '555-0102', website: 'https://globalsol.com', industry: 'Consulting', status: 'Active', created_by: adminId },
          { company_name: 'Tech Innovations Ltd', email: 'hello@techinnovations.com', phone: '555-0103', website: 'https://techinnovations.com', industry: 'Software', status: 'Active', created_by: adminId }
        ];
        for (const company of demoCompanies) {
          await connection.query(
            'INSERT INTO companies (company_name, email, phone, website, industry, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [company.company_name, company.email, company.phone, company.website, company.industry, company.status, company.created_by]
          );
        }
        console.log('✓ Demo companies created');
      }

    // Fetch company IDs for subsequent seeding
    const [companies] = await connection.query('SELECT id FROM companies LIMIT 10');
    const companyIds = companies.map(c => c.id);
    const mainCompanyId = companyIds[0] || null;

    const [existingProjects] = await connection.query('SELECT COUNT(*) as count FROM projects');
    if (existingProjects[0].count === 0) {
      const demoProjects = [
        { name: 'Website SEO & GMB Optimization', company_id: mainCompanyId, budget: 15000, status: 'Execution', start_date: new Date() },
        { name: 'Digital Marketing Campaign Q3', company_id: companyIds[1] || mainCompanyId, budget: 25000, status: 'Planning', start_date: new Date() },
        { name: 'App Development - Phase 1', company_id: companyIds[2] || mainCompanyId, budget: 45000, status: 'Execution', start_date: new Date() }
      ];
      for (const project of demoProjects) {
        await connection.query(
          'INSERT INTO projects (name, company_id, budget, status, start_date, created_by) VALUES (?, ?, ?, ?, ?, ?)',
          [project.name, project.company_id, project.budget, project.status, project.start_date, adminId]
        );
      }
      console.log('✓ Demo projects created');
    }

    const [projects] = await connection.query('SELECT id FROM projects LIMIT 10');
    const projectIds = projects.map(p => p.id);

    const [existingActivities] = await connection.query('SELECT COUNT(*) as count FROM activities');
    if (existingActivities[0].count === 0) {
      const demoActivities = [
        { activity_type: 'Meeting', title: 'We scheduled a meeting for next week', status: 'Pending', priority: 'High', assigned_to: adminId, created_by: adminId, scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        { activity_type: 'Calls', title: 'Had conversation with Fred regarding task', status: 'Completed', priority: 'Medium', assigned_to: adminId, created_by: adminId, scheduled_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
        { activity_type: 'Email', title: 'Analysing latest time estimation for new project', status: 'Pending', priority: 'Medium', assigned_to: adminId, created_by: adminId, scheduled_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) },
        { activity_type: 'Task', title: 'Store and manage contact data', status: 'Pending', priority: 'High', assigned_to: adminId, created_by: adminId, scheduled_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) },
        { activity_type: 'Meeting', title: 'Will have a meeting before project start', status: 'Pending', priority: 'Medium', assigned_to: adminId, created_by: adminId, scheduled_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000) },
        { activity_type: 'Calls', title: 'Call John and discuss about project', status: 'Pending', priority: 'Low', assigned_to: adminId, created_by: adminId, scheduled_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000) },
        { activity_type: 'Task', title: 'Built landing pages', status: 'Completed', priority: 'High', assigned_to: adminId, created_by: adminId, scheduled_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
        { activity_type: 'Email', title: 'Regarding latest updates in project', status: 'Pending', priority: 'Medium', assigned_to: adminId, created_by: adminId, scheduled_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
        { activity_type: 'Calls', title: 'Discussed budget proposal with Edwin', status: 'Completed', priority: 'High', assigned_to: adminId, created_by: adminId, scheduled_date: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000) },
        { activity_type: 'Email', title: 'Attach final proposal for upcoming project', status: 'Pending', priority: 'High', assigned_to: adminId, created_by: adminId, scheduled_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) }
      ];
      for (const activity of demoActivities) {
        await connection.query(
          'INSERT INTO activities (activity_type, title, status, priority, assigned_to, created_by, scheduled_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
          [activity.activity_type, activity.title, activity.status, activity.priority, activity.assigned_to, activity.created_by, activity.scheduled_date]
        );
      }
      console.log('✓ Demo activities created');
    }

    const [existingPipelines] = await connection.query('SELECT COUNT(*) as count FROM pipeline');
    if (existingPipelines[0].count === 0) {
      const demoPipelines = [
        { name: 'Sales Pipeline', description: 'Main sales pipeline for B2B deals', position: 1, status: 'Active' },
        { name: 'Project Pipeline', description: 'Pipeline for project-based sales', position: 2, status: 'Active' },
        { name: 'Support Pipeline', description: 'Support and maintenance contracts', position: 3, status: 'Active' }
      ];
      for (const pipeline of demoPipelines) {
        await connection.query(
          'INSERT INTO pipeline (name, description, position, status) VALUES (?, ?, ?, ?)',
          [pipeline.name, pipeline.description, pipeline.position, pipeline.status]
        );
      }
      console.log('✓ Demo pipelines created');
    }

    const stages = [
      { name: 'New', probability: 10, position: 1, description: 'New opportunity entered' },
      { name: 'Discovery', probability: 20, position: 2, description: 'Initial discovery phase' },
      { name: 'Follow Up', probability: 30, position: 3, description: 'Follow-up conversations' },
      { name: 'Inpipeline', probability: 40, position: 4, description: 'In the pipeline' },
      { name: 'Conversation', probability: 50, position: 5, description: 'Active conversations' },
      { name: 'Proposal Sent', probability: 60, position: 6, description: 'Proposal sent to client' },
      { name: 'Negotiation', probability: 75, position: 7, description: 'In negotiation phase' },
      { name: 'Qualified To Buy', probability: 90, position: 8, description: 'Qualified to buy' },
      { name: 'Won', probability: 100, position: 9, description: 'Deal won' },
      { name: 'Lost', probability: 0, position: 10, description: 'Deal lost' }
    ];
    
    for (const stage of stages) {
      const [existing] = await connection.query(
        'SELECT id FROM pipeline_stages WHERE name = ?',
        [stage.name]
      );
      
      if (existing.length > 0) {
        await connection.query(
          'UPDATE pipeline_stages SET probability = ?, position = ?, description = ?, status = ? WHERE name = ?',
          [stage.probability, stage.position, stage.description, 'Active', stage.name]
        );
      } else {
        await connection.query(
          'INSERT INTO pipeline_stages (name, probability, position, description, status) VALUES (?, ?, ?, ?, ?)',
          [stage.name, stage.probability, stage.position, stage.description, 'Active']
        );
      }
    }
    console.log('✓ Pipeline stages synced with probabilities');

    const [existingContracts] = await connection.query('SELECT COUNT(*) as count FROM contracts');
    if (existingContracts[0].count === 0 && mainCompanyId && adminId) {
      const demoContracts = [
        { subject: 'Service Agreement - 2024', start_date: new Date(), end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), client_id: mainCompanyId, contract_type: 'Service Agreement', contract_value: 50000, status: 'Active', created_by: adminId },
        { subject: 'Software License Agreement', start_date: new Date(), end_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), client_id: companyIds[1] || mainCompanyId, contract_type: 'License Agreement', contract_value: 25000, status: 'Draft', created_by: adminId },
        { subject: 'Maintenance Contract - Annual', start_date: new Date(), end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), client_id: companyIds[2] || mainCompanyId, contract_type: 'Maintenance', contract_value: 15000, status: 'Active', created_by: userIds[1] || adminId }
      ];
      for (const contract of demoContracts) {
        await connection.query(
          'INSERT INTO contracts (subject, start_date, end_date, client_id, contract_type, contract_value, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [contract.subject, contract.start_date, contract.end_date, contract.client_id, contract.contract_type, contract.contract_value, contract.status, contract.created_by]
        );
      }
      console.log('✓ Demo contracts created');
    }

    const [existingEstimations] = await connection.query('SELECT COUNT(*) as count FROM estimations');
    if (existingEstimations[0].count === 0 && mainCompanyId) {
      const demoEstimations = [
        { estimation_number: 'EST-001', client_id: mainCompanyId, amount: 35000, currency: 'INR', status: 'Draft', estimate_date: new Date(), expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        { estimation_number: 'EST-002', client_id: companyIds[1] || mainCompanyId, amount: 18000, currency: 'INR', status: 'Sent', estimate_date: new Date(), expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        { estimation_number: 'EST-003', client_id: companyIds[2] || mainCompanyId, amount: 12000, currency: 'INR', status: 'Accepted', estimate_date: new Date(), expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
      ];
      for (const estimation of demoEstimations) {
        await connection.query(
          'INSERT INTO estimations (estimation_number, client_id, amount, currency, status, estimate_date, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [estimation.estimation_number, estimation.client_id, estimation.amount, estimation.currency, estimation.status, estimation.estimate_date, estimation.expiry_date]
        );
      }
      console.log('✓ Demo estimations created');
    }

    const [existingTasks] = await connection.query('SELECT COUNT(*) as count FROM general_tasks');
    if (existingTasks[0].count === 0) {
      const demoTasks = [
        { title: 'Review client feedback', description: 'Go through the latest feedback from client meetings', status: 'Open', priority: 'High', due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
        { title: 'Update project documentation', description: 'Make sure all project docs are current', status: 'In Progress', priority: 'Medium', due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
        { title: 'Prepare presentation for stakeholders', description: 'Create slides for Q1 review meeting', status: 'Open', priority: 'High', due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        { title: 'Budget review meeting', description: 'Schedule and conduct budget review with finance team', status: 'Completed', priority: 'Medium', due_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        { title: 'Team training session', description: 'Conduct training on new tools and procedures', status: 'Open', priority: 'Low', due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) }
      ];
      for (const task of demoTasks) {
        await connection.query(
          'INSERT INTO general_tasks (title, description, status, priority, due_date, linked_type) VALUES (?, ?, ?, ?, ?, ?)',
          [task.title, task.description, task.status, task.priority, task.due_date, 'General']
        );
      }
      console.log('✓ Demo general tasks created');
    }

    const [existingProposals] = await connection.query('SELECT COUNT(*) as count FROM proposals');
    if (existingProposals[0].count === 0 && mainCompanyId) {
      const demoProposals = [
        { proposal_number: 'PROP-001', title: 'Web Development Project Proposal', client_id: mainCompanyId, total_amount: 45000, currency: 'INR', status: 'Submitted', proposal_date: new Date(), validity_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        { proposal_number: 'PROP-002', title: 'Mobile App Development Proposal', client_id: companyIds[1] || mainCompanyId, total_amount: 65000, currency: 'INR', status: 'Draft', proposal_date: new Date(), validity_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        { proposal_number: 'PROP-003', title: 'Cloud Infrastructure Proposal', client_id: companyIds[2] || mainCompanyId, total_amount: 28000, currency: 'INR', status: 'Approved', proposal_date: new Date(), validity_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
      ];
      for (const proposal of demoProposals) {
        await connection.query(
          'INSERT INTO proposals (proposal_number, title, client_id, total_amount, currency, status, proposal_date, validity_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [proposal.proposal_number, proposal.title, proposal.client_id, proposal.total_amount, proposal.currency, proposal.status, proposal.proposal_date, proposal.validity_date]
        );
      }
      console.log('✓ Demo proposals created');
    }

    const [existingSeo] = await connection.query('SELECT COUNT(*) as count FROM seo_management');
    if (existingSeo[0].count === 0 && projectIds.length > 0) {
      const demoSeo = [
        { project_id: projectIds[0], keyword: 'crm software for small business', target_url: 'https://novawave.com/crm', current_ranking: 5, target_ranking: 1, search_volume: 1200, competition: 'Medium' },
        { project_id: projectIds[0], keyword: 'best deals dashboard 2024', target_url: 'https://novawave.com/dashboard', current_ranking: 12, target_ranking: 3, search_volume: 850, competition: 'High' },
        { project_id: projectIds[1] || projectIds[0], keyword: 'enterprise software solutions', target_url: 'https://silverhawk.com/solutions', current_ranking: 2, target_ranking: 1, search_volume: 3200, competition: 'High' }
      ];
      for (const seo of demoSeo) {
        await connection.query(
          'INSERT INTO seo_management (project_id, keyword, target_url, current_ranking, target_ranking, search_volume, competition, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
          [seo.project_id, seo.keyword, seo.target_url, seo.current_ranking, seo.target_ranking, seo.search_volume, seo.competition]
        );
      }
      console.log('✓ Demo SEO records created');
    }

    const [existingGmb] = await connection.query('SELECT COUNT(*) as count FROM gmb_management');
    if (existingGmb[0].count === 0 && projectIds.length > 0) {
      const demoGmb = [
        { project_id: projectIds[0], location_name: 'NovaWave HQ - Silicon Valley', map_url: 'https://maps.google.com/?cid=123', average_rating: 4.8, total_reviews: 156, status: 'Active' },
        { project_id: projectIds[1] || projectIds[0], location_name: 'Silver Hawk Software - Austin', map_url: 'https://maps.google.com/?cid=456', average_rating: 4.2, total_reviews: 89, status: 'Needs Optimization' }
      ];
      for (const gmb of demoGmb) {
        await connection.query(
          'INSERT INTO gmb_management (project_id, location_name, map_url, average_rating, total_reviews, status, last_post_date) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [gmb.project_id, gmb.location_name, gmb.map_url, gmb.average_rating, gmb.total_reviews, gmb.status]
        );
      }
      console.log('✓ Demo GMB records created');
    }

    const [existingConversations] = await connection.query('SELECT COUNT(*) as count FROM conversations');
    if (existingConversations[0].count === 0 && userIds.length >= 2) {
      const demoConversations = [
        { participant1_id: userIds[0], participant2_id: userIds[1], last_message_text: 'Hey, how are you doing?', last_message_timestamp: new Date() },
        { participant1_id: userIds[0], participant2_id: userIds[2] || userIds[1], last_message_text: 'Let\'s sync up next week', last_message_timestamp: new Date() },
        { participant1_id: userIds[1], participant2_id: userIds[2] || userIds[0], last_message_text: 'Sounds good to me', last_message_timestamp: new Date() }
      ];
      for (const conversation of demoConversations) {
        if (conversation.participant1_id !== conversation.participant2_id) {
          await connection.query(
            'INSERT IGNORE INTO conversations (participant1_id, participant2_id, last_message_text, last_message_timestamp) VALUES (?, ?, ?, ?)',
            [conversation.participant1_id, conversation.participant2_id, conversation.last_message_text, conversation.last_message_timestamp]
          );
        }
      }
      console.log('✓ Demo conversations created');
    }

    const [existingMessages] = await connection.query('SELECT COUNT(*) as count FROM messages');
    if (existingMessages[0].count === 0) {
      const [conversations] = await connection.query('SELECT * FROM conversations LIMIT 3');
      
      if (conversations.length > 0) {
        const demoMessages = [
          { conversation_id: conversations[0].id, sender_id: conversations[0].participant1_id, receiver_id: conversations[0].participant2_id, message_text: 'Hi there!' },
          { conversation_id: conversations[0].id, sender_id: conversations[0].participant2_id, receiver_id: conversations[0].participant1_id, message_text: 'Hey! How are you?' },
          { conversation_id: conversations[0].id, sender_id: conversations[0].participant1_id, receiver_id: conversations[0].participant2_id, message_text: 'Great! How about you?' },
          { conversation_id: conversations.length > 1 ? conversations[1].id : conversations[0].id, sender_id: conversations.length > 1 ? conversations[1].participant1_id : conversations[0].participant1_id, receiver_id: conversations.length > 1 ? conversations[1].participant2_id : conversations[0].participant2_id, message_text: 'Let\'s schedule a call' },
          { conversation_id: conversations.length > 1 ? conversations[1].id : conversations[0].id, sender_id: conversations.length > 1 ? conversations[1].participant2_id : conversations[0].participant2_id, receiver_id: conversations.length > 1 ? conversations[1].participant1_id : conversations[0].participant1_id, message_text: 'Sure, how about Tuesday?' }
        ];
        for (const message of demoMessages) {
          await connection.query(
            'INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text) VALUES (?, ?, ?, ?)',
            [message.conversation_id, message.sender_id, message.receiver_id, message.message_text]
          );
        }
        console.log('✓ Demo messages created');
      }
    }

    const [existingFiles] = await connection.query('SELECT COUNT(*) as count FROM files');
    if (existingFiles[0].count === 0 && adminId) {
      const demoFiles = [
        { user_id: adminId, name: 'Project Proposal.pdf', file_type: 'pdf', size_bytes: 2048000, mime_type: 'application/pdf', storage_type: 'Internal' },
        { user_id: adminId, name: 'Budget Spreadsheet.xlsx', file_type: 'xlsx', size_bytes: 512000, mime_type: 'application/vnd.ms-excel', storage_type: 'Internal' },
        { user_id: userIds[1] || adminId, name: 'Meeting Notes.docx', file_type: 'docx', size_bytes: 256000, mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', storage_type: 'Google Drive' },
        { user_id: userIds[1] || adminId, name: 'Client Presentation.pptx', file_type: 'pptx', size_bytes: 4096000, mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', storage_type: 'Internal' },
        { user_id: userIds[2] || adminId, name: 'Design Assets.zip', file_type: 'zip', size_bytes: 10485760, mime_type: 'application/zip', storage_type: 'Dropbox' }
      ];
      for (const file of demoFiles) {
        await connection.query(
          'INSERT INTO files (user_id, name, file_type, size_bytes, mime_type, storage_type) VALUES (?, ?, ?, ?, ?, ?)',
          [file.user_id, file.name, file.file_type, file.size_bytes, file.mime_type, file.storage_type]
        );
      }
      console.log('✓ Demo files created');
    }

    const [existingItServices] = await connection.query('SELECT COUNT(*) as count FROM it_services');
    if (existingItServices[0].count === 0) {
      const demoItServices = [
        'AI Solutions',
        'Industrial IoT',
        'ERP software',
        'CRM software',
        'Machine Learning',
        'Custom Software Engineering',
        'Predictive Analytics',
        'Web Development',
        'Web CSM',
        'Cloud Applications',
        'Other'
      ];
      for (const service of demoItServices) {
        await connection.query(
          'INSERT IGNORE INTO it_services (name) VALUES (?)',
          [service]
        );
      }
      console.log('✓ Demo IT services created');
    }
}


    connection.release();
  } catch (error) {
    console.error('Database initialization error:', error.message);
    if (connection) connection.release();
  }
}

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    console.log('✓ Database connection successful');
    await initializeDatabase();
  } catch (err) {
    console.error('✗ Database connection failed:', err.code || err.message);
  }
}

module.exports = { initializeDatabase, testConnection };

if (require.main === module) {
  testConnection().then(() => {
    console.log('Database initialization complete');
    process.exit(0);
  }).catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });
}
