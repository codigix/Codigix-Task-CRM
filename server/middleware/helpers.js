const crypto = require('crypto');
const pool = require('../config/database');

function hashPassword(password) {
  return crypto.pbkdf2Sync(password, 'salt', 1000, 64, 'sha512').toString('hex');
}

async function checkPermission(userId, module, action) {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const [users] = await connection.query(
      'SELECT role_id FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      connection.release();
      return false;
    }
    
    const roleId = users[0].role_id;
    const [roles] = await connection.query(
      'SELECT name FROM roles WHERE id = ?',
      [roleId]
    );
    
    connection.release();
    
    if (roles.length === 0) {
      return false;
    }
    
    const role = roles[0].name;
    const ROLE_PERMISSIONS = {
      'Super Admin': { canAll: true },
      'Admin': { canAll: true, except: ['settings'] },
      'Leads Manager': {
        Leads: ['view', 'create', 'edit', 'delete', 'distribute', 'monitor'],
        Activities: ['view', 'create', 'edit'],
      },
      'Deals Manager': {
        Deals: ['view', 'create', 'edit', 'delete', 'approve_discount', 'allocate'],
        Pipeline: ['view', 'create', 'edit'],
        Documents: ['view', 'create', 'edit'],
      },
      'Sales Manager': {
        Leads: ['view', 'create', 'edit'],
        Deals: ['view', 'create', 'edit'],
        Quotations: ['view', 'create', 'edit', 'approve'],
        Targets: ['view', 'assign'],
        Commissions: ['view', 'approve'],
        Reports: ['view'],
      },
      'Marketing Manager': {
        Marketing: ['view', 'create', 'edit', 'delete', 'approve'],
        Campaigns: ['view', 'create', 'edit', 'delete'],
        Projects: ['view', 'create', 'edit'],
        Resources: ['allocate'],
        Budget: ['view', 'manage'],
      },
      'IT Manager': {
        IT: ['view', 'create', 'edit', 'delete', 'approve_deployment'],
        Projects: ['view', 'create', 'edit'],
        Sprints: ['view', 'create', 'edit', 'plan'],
        Bugs: ['view', 'create', 'edit', 'analyze'],
        DevOps: ['monitor'],
      },
      'Accounting Manager': {
        Invoices: ['view', 'create', 'edit', 'delete', 'approve'],
        Payments: ['view', 'create', 'edit', 'track'],
        Expenses: ['view', 'approve'],
        Commissions: ['view', 'approve'],
        Reports: ['view', 'finance'],
      },
      'Sales Executive': {
        Leads: ['view', 'create', 'edit'],
        Deals: ['view', 'create', 'edit'],
        Quotations: ['view', 'create'],
        Tasks: ['view', 'edit'],
      },
      'Marketing Executive': {
        Marketing: ['view', 'edit'],
        Projects: ['view', 'edit'],
        SEO: ['view', 'edit'],
        Creative: ['request', 'upload'],
      },
      'IT Specialist': {
        IT: ['view', 'edit'],
        Projects: ['view', 'edit'],
        Sprints: ['view'],
        Bugs: ['view', 'create', 'edit'],
        Deployment: ['request'],
      },
      'Accountant': {
        Invoices: ['view', 'create', 'edit'],
        Payments: ['view', 'create'],
        Expenses: ['view', 'create'],
      },
      'Employee': {
        Tasks: ['view', 'edit'],
        Projects: ['view'],
        Deals: ['view', 'edit'],
      }
    };
    
    const rolePerms = ROLE_PERMISSIONS[role];
    if (!rolePerms) return false;
    
    if (rolePerms.canAll) {
      return !rolePerms.except || !rolePerms.except.includes(module);
    }
    
    const modulePerms = rolePerms[module];
    return modulePerms && modulePerms.includes(action);
  } catch (error) {
    console.error('Error checking permission:', error.message);
    if (connection) connection.release();
    return false;
  }
}

// Resolves the single deal a lead becomes, together with every service the client bought.
// A client who takes SEO + PPC + Social Media at once stays ONE deal for that client; the
// services ride along on it so nothing is dropped the way it used to be.
async function resolveDealForLead(db, leadData) {
  const businessType = leadData.business_type;
  const deptName = businessType === 'Marketing' ? 'Marketing Department'
    : businessType === 'Software Services' ? 'IT Department'
    : null;

  let departmentId = leadData.department_id || null;
  if (!departmentId && deptName) {
    const [dept] = await db.query('SELECT id FROM departments WHERE name = ?', [deptName]);
    if (dept.length > 0) departmentId = dept[0].id;
  }

  const resolveServiceCategoryId = async (serviceName) => {
    if (!serviceName) return null;
    const [existing] = await db.query('SELECT id FROM service_categories WHERE name = ?', [serviceName]);
    if (existing.length > 0) return existing[0].id;

    const parentCategory = deptName === 'Marketing Department' ? 'Marketing Services'
      : deptName === 'IT Department' ? 'IT Services'
      : null;
    try {
      const [inserted] = await db.query(
        'INSERT INTO service_categories (name, parent_category, suggested_department_id) VALUES (?, ?, ?)',
        [serviceName, parentCategory, departmentId]
      );
      return inserted.insertId;
    } catch (err) {
      // Another request may have just created the same category (name is UNIQUE) - re-fetch it.
      const [retry] = await db.query('SELECT id FROM service_categories WHERE name = ?', [serviceName]);
      return retry.length > 0 ? retry[0].id : null;
    }
  };

  const dealName = leadData.lead_name || leadData.deal_name || 'New Deal';

  if (businessType === 'Marketing') {
    let services = leadData.marketing_services;
    if (typeof services === 'string') {
      try {
        services = JSON.parse(services);
      } catch (e) {
        services = services ? [services] : [];
      }
    }
    if (!Array.isArray(services)) services = [];
    services = services.map(s => (s || '').trim()).filter(Boolean);

    if (services.length > 0) {
      const serviceCategoryIds = [];
      for (const serviceName of services) {
        serviceCategoryIds.push(await resolveServiceCategoryId(serviceName));
      }
      return {
        dealName,
        // The first service is the deal's primary category (deals.service_category_id is a
        // single FK); the full list lives in deals.services so none of them are lost.
        serviceCategoryId: serviceCategoryIds[0] || null,
        serviceNames: services,
        serviceCategoryIds,
        departmentId
      };
    }
  }

  let serviceCategoryId = leadData.service_category_id || null;
  const itServiceName = businessType === 'Software Services' ? (leadData.it_services || null) : null;
  if (!serviceCategoryId && itServiceName) {
    serviceCategoryId = await resolveServiceCategoryId(itServiceName);
  }

  return {
    dealName,
    serviceCategoryId,
    serviceNames: itServiceName ? [itServiceName] : [],
    serviceCategoryIds: serviceCategoryId ? [serviceCategoryId] : [],
    departmentId
  };
}

// Starter task checklist for one service (SEO / Social Media / WordPress / PPC / IT work...).
function getServiceTaskTitles(serviceType, deptName) {
  if (serviceType === 'SEO') {
    return ['Keyword Research', 'On-page Optimization', 'Technical Audit', 'Backlink Strategy', 'Monthly Reporting'];
  }
  if (serviceType === 'Social Media' || serviceType === 'Social Media Marketing') {
    return ['Content Planning', 'Graphics Request', 'Video Request', 'Scheduling', 'Publishing', 'Analytics Tracking'];
  }
  if (serviceType === 'WordPress') {
    return ['Requirement Analysis', 'Design', 'Development', 'Testing', 'Deployment'];
  }
  if (serviceType === 'GMB' || serviceType === 'Google My Business') {
    return ['Profile Setup & Verification', 'Business Info Optimization', 'Post Scheduling', 'Review Monitoring', 'Monthly Reporting'];
  }
  if (serviceType === 'PPC Advertising' || serviceType === 'PPC') {
    return ['Campaign Setup', 'Keyword & Audience Research', 'Ad Copy Creation', 'Budget Allocation', 'Performance Monitoring'];
  }
  if (serviceType === 'Content Marketing') {
    return ['Content Strategy', 'Topic Research', 'Content Writing', 'Editing & Review', 'Publishing & Distribution'];
  }
  if (serviceType === 'Email Marketing') {
    return ['List Segmentation', 'Campaign Design', 'Copywriting', 'Scheduling & Send', 'Open/Click Reporting'];
  }
  if (serviceType === 'Branding') {
    return ['Brand Discovery', 'Logo & Identity Design', 'Brand Guidelines', 'Asset Delivery'];
  }
  if (deptName === 'IT Department') {
    return ['Requirement Analysis', 'Development', 'Code Commit', 'Internal Review', 'Testing', 'Deployment'];
  }
  return [];
}

// Creates the starter checklist for every service on a project. A client project covering
// several services gets each service's tasks, prefixed so they stay grouped and readable.
async function generateProjectTasks(db, projectId, { serviceType, serviceTypes, departmentId } = {}) {
  let deptName = '';
  if (departmentId) {
    const [dept] = await db.query('SELECT name FROM departments WHERE id = ?', [departmentId]);
    deptName = dept.length > 0 ? dept[0].name : '';
  }

  let services = Array.isArray(serviceTypes) && serviceTypes.length > 0
    ? serviceTypes.filter(Boolean)
    : (serviceType ? [serviceType] : []);
  if (services.length === 0) services = [null]; // fall back to department-level checklist

  // Don't duplicate a service's checklist if it was already added to this project before.
  const [existingRows] = await db.query(
    'SELECT DISTINCT workflow_type FROM general_tasks WHERE project_id = ?',
    [projectId]
  );
  const alreadyAdded = new Set(existingRows.map(r => r.workflow_type).filter(Boolean));

  const multiService = services.length > 1;
  let created = 0;

  for (const service of services) {
    const label = service || deptName || null;
    if (label && alreadyAdded.has(label)) continue;

    const titles = getServiceTaskTitles(service, deptName);
    for (const taskTitle of titles) {
      await db.query(`
        INSERT INTO general_tasks (title, project_id, status, priority, linked_type, linked_id, department_id, workflow_type)
        VALUES (?, ?, ?, ?, 'Project', ?, ?, ?)
      `, [
        multiService && service ? `${service}: ${taskTitle}` : taskTitle,
        projectId, 'To Do', 'Medium', projectId, departmentId || null, label
      ]);
      created++;
    }
  }

  return created;
}

async function generateEstimationNumber(pool) {
  let connection;
  try {
    connection = await pool.getConnection();
    const currentYear = new Date().getFullYear();
    const pattern = `Q-${currentYear}-%`;

    const [rows] = await connection.query(
      'SELECT estimation_number FROM estimations WHERE estimation_number LIKE ? ORDER BY estimation_number DESC LIMIT 1',
      [pattern]
    );

    let nextNumber = 1;
    if (rows.length > 0) {
      const lastNumber = rows[0].estimation_number;
      const parts = lastNumber.split('-');
      // Support formats like Q-2026-001 and Q-2026-001-v1
      if (parts.length >= 3) {
        const lastSeq = parseInt(parts[2]);
        if (!isNaN(lastSeq)) {
          nextNumber = lastSeq + 1;
        }
      }
    }

    return `Q-${currentYear}-${String(nextNumber).padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating estimation number:', error.message);
    // Fallback to timestamp if database fails
    return `Q-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`;
  } finally {
    if (connection) connection.release();
  }
}

module.exports = { hashPassword, checkPermission, generateEstimationNumber, resolveDealForLead, generateProjectTasks };
