const ROLE_PERMISSIONS = {
  'Admin': {
    dashboard: ['view', 'edit', 'create', 'delete'],
    contacts: ['view', 'create', 'edit', 'delete', 'export'],
    companies: ['view', 'create', 'edit', 'delete', 'export'],
    leads: ['view', 'create', 'edit', 'delete', 'convert', 'export'],
    deals: ['view', 'create', 'edit', 'delete', 'assign', 'export'],
    pipeline: ['view', 'create', 'edit', 'delete'],
    campaign: ['view', 'create', 'edit', 'delete'],
    projects: ['view', 'create', 'edit', 'delete', 'manage_team'],
    tasks: ['view', 'create', 'edit', 'delete', 'assign'],
    proposals: ['view', 'create', 'edit', 'delete'],
    contracts: ['view', 'create', 'edit', 'delete'],
    estimations: ['view', 'create', 'edit', 'delete'],
    invoices: ['view', 'create', 'edit', 'delete'],
    payments: ['view', 'create', 'edit', 'delete'],
    activities: ['view', 'export'],
    analytics: ['view', 'export'],
  },
  'Company Owner': {
    dashboard: ['view', 'edit'],
    contacts: ['view', 'create', 'edit'],
    companies: ['view', 'edit'],
    leads: ['view', 'create', 'edit', 'convert'],
    deals: ['view', 'create', 'edit', 'assign'],
    pipeline: ['view'],
    campaign: ['view', 'create', 'edit'],
    projects: ['view', 'create', 'edit', 'manage_team'],
    tasks: ['view', 'create', 'edit', 'assign'],
    proposals: ['view', 'create', 'edit'],
    contracts: ['view', 'create', 'edit'],
    estimations: ['view', 'create', 'edit'],
    invoices: ['view', 'create', 'edit'],
    payments: ['view'],
    activities: ['view'],
    analytics: ['view'],
  },
  'Deal Owner': {
    dashboard: ['view'],
    contacts: ['view', 'edit'],
    companies: ['view'],
    leads: ['view', 'create', 'edit', 'convert'],
    deals: ['view', 'create', 'edit', 'assign'],
    pipeline: ['view'],
    campaign: ['view'],
    projects: ['view'],
    tasks: ['view', 'create', 'edit'],
    proposals: ['view', 'create', 'edit'],
    contracts: ['view'],
    estimations: ['view', 'create', 'edit'],
    invoices: ['view'],
    payments: ['view'],
    activities: ['view'],
    analytics: ['view'],
  },
  'Project Manager': {
    dashboard: ['view'],
    contacts: ['view'],
    companies: ['view'],
    leads: ['view'],
    deals: ['view'],
    pipeline: ['view'],
    campaign: ['view', 'create', 'edit'],
    projects: ['view', 'create', 'edit', 'manage_team'],
    tasks: ['view', 'create', 'edit', 'delete', 'assign'],
    proposals: ['view'],
    contracts: ['view'],
    estimations: ['view'],
    invoices: ['view'],
    payments: ['view'],
    activities: ['view'],
    analytics: ['view'],
  },
  'Client': {
    dashboard: ['view'],
    contacts: ['view'],
    companies: ['view'],
    leads: [],
    deals: ['view'],
    pipeline: ['view'],
    campaign: [],
    projects: ['view'],
    tasks: ['view'],
    proposals: ['view'],
    contracts: ['view'],
    estimations: ['view'],
    invoices: ['view'],
    payments: ['view'],
    activities: [],
    analytics: [],
  },
  'Lead': {
    dashboard: ['view'],
    contacts: ['view', 'create', 'edit'],
    companies: ['view'],
    leads: ['view', 'create', 'edit'],
    deals: ['view', 'create', 'edit'],
    pipeline: ['view'],
    campaign: [],
    projects: ['view'],
    tasks: ['view', 'create', 'edit'],
    proposals: ['view'],
    contracts: [],
    estimations: [],
    invoices: [],
    payments: [],
    activities: ['view'],
    analytics: [],
  },
};

const requireAuth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (!userId || !userRole) {
    return res.status(401).json({ error: 'Unauthorized - Missing authentication headers' });
  }

  req.user = {
    id: userId,
    role: userRole,
  };

  next();
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized - User not found' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden - Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

const requirePermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized - User not found' });
    }

    const rolePermissions = ROLE_PERMISSIONS[req.user.role];
    if (!rolePermissions) {
      return res.status(403).json({ error: 'Forbidden - Role not found' });
    }

    const modulePermissions = rolePermissions[module];
    if (!modulePermissions || !modulePermissions.includes(action)) {
      return res.status(403).json({ 
        error: 'Forbidden - Missing required permission',
        required: `${module}:${action}`,
        role: req.user.role
      });
    }

    next();
  };
};

const checkPermission = (userRole, module, action) => {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) return false;

  const modulePermissions = rolePermissions[module];
  return modulePermissions && modulePermissions.includes(action);
};

module.exports = {
  requireAuth,
  requireRole,
  requirePermission,
  checkPermission,
  ROLE_PERMISSIONS,
};
