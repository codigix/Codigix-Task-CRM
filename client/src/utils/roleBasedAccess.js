const ROLE_UI_VISIBILITY = {
  'Super Admin': {
    sidebar: {
      dashboard: true,
      crm: true,
      applications: true,
      reports: true,
      userManagement: true,
      crmSettings: true,
      membership: false,
      content: true,
      blog: false,
      settings: true,
      superAdmin: true,
    },
    components: {
      createButton: true,
      editButton: true,
      deleteButton: true,
      bulkActions: true,
      exportButton: true,
      importButton: true,
      settingsButton: true,
      assignButton: true,
      transferButton: true,
    },
    menuItems: {
      dealsDashboard: 'view',
      leadsDashboard: 'view',
      projectDashboard: 'view',
      applications: 'view',
      chatCallEmailCalendar: 'view',
      crmContacts: 'view',
      crmCompanies: 'view',
      crmDeals: 'view',
      crmLeads: 'view',
      crmPipeline: 'view',
      projectsAndTasks: 'view',
      proposalsAndEstimations: 'view',
      invoicesAndPayments: 'view',
      analytics: 'view',
      reports: 'view',
    },
    modules: {
      DealsDashboard: true,
      LeadsDashboard: true,
      ProjectsDashboard: true,
      Contacts: true,
      Companies: true,
      Leads: true,
      Deals: true,
      Pipelines: true,
      Campaign: true,
      Projects: true,
      Tasks: true,
      Proposals: true,
      Contracts: true,
      Estimations: true,
      Invoices: true,
      Payments: true,
      Activities: true,
      Analytics: true,
      Kanban: true,
      UserManagement: true,
      Roles: true,
      Reports: true,
    }
  },
  'Admin': {
    sidebar: {
      dashboard: true,
      crm: true,
      applications: true,
      reports: true,
      userManagement: true,
      crmSettings: true,
      membership: false,
      content: true,
      blog: false,
      settings: false,
      superAdmin: false,
    },
    components: {
      createButton: true,
      editButton: true,
      deleteButton: true,
      bulkActions: true,
      exportButton: true,
      importButton: true,
      settingsButton: false,
      assignButton: true,
      transferButton: true,
    },
    menuItems: {
      dealsDashboard: 'view',
      leadsDashboard: 'view',
      projectDashboard: 'view',
      applications: 'view',
      chatCallEmailCalendar: 'view',
      crmContacts: 'view',
      crmCompanies: 'view',
      crmDeals: 'view',
      crmLeads: 'view',
      crmPipeline: 'view',
      projectsAndTasks: 'view',
      proposalsAndEstimations: 'view',
      invoicesAndPayments: 'view',
      analytics: 'view',
      reports: 'view',
    },
    modules: {
      Dashboard: true,
      DealsDashboard: true,
      LeadsDashboard: true,
      ProjectsDashboard: true,
      Contacts: true,
      Companies: true,
      Leads: true,
      Deals: true,
      Pipelines: true,
      Campaign: true,
      Projects: true,
      Tasks: true,
      Proposals: true,
      Contracts: true,
      Estimations: true,
      Invoices: true,
      Payments: true,
      Activities: true,
      Analytics: true,
      Kanban: true,
      UserManagement: true,
      Roles: false,
      Reports: true,
    }
  },
  'Deal Manager': {
    sidebar: {
      dashboard: true,
      crm: true,
      applications: true,
      reports: true,
      userManagement: false,
      crmSettings: false,
      membership: false,
      content: false,
      blog: false,
      settings: false,
      superAdmin: false,
    },
    components: {
      createButton: true,
      editButton: true,
      deleteButton: false,
      bulkActions: true,
      exportButton: true,
      importButton: false,
      settingsButton: false,
      assignButton: true,
      transferButton: false,
    },
    menuItems: {
      dealsDashboard: 'view',
      leadsDashboard: 'view',
      projectDashboard: false,
      applications: 'view',
      chatCallEmailCalendar: 'view',
      crmContacts: 'view',
      crmCompanies: 'view',
      crmDeals: 'view',
      crmLeads: 'view',
      crmPipeline: 'view',
      projectsAndTasks: false,
      proposalsAndEstimations: false,
      invoicesAndPayments: false,
      analytics: 'view',
      reports: 'view',
    },
    modules: {
      DealsDashboard: true,
      LeadsDashboard: true,
      ProjectsDashboard: false,
      Contacts: true,
      Companies: true,
      Leads: true,
      Deals: true,
      Pipelines: true,
      Campaign: true,
      Projects: false,
      Tasks: false,
      Proposals: true,
      Contracts: true,
      Estimations: true,
      Invoices: true,
      Payments: true,
      Activities: true,
      Analytics: true,
      Kanban: true,
      UserManagement: false,
      Roles: false,
      Reports: true,
    }
  },
  'Project Manager': {
    sidebar: {
      dashboard: true,
      crm: true,
      applications: true,
      reports: true,
      userManagement: false,
      crmSettings: false,
      membership: false,
      content: false,
      blog: false,
      settings: false,
      superAdmin: false,
    },
    components: {
      createButton: true,
      editButton: true,
      deleteButton: true,
      bulkActions: true,
      exportButton: true,
      importButton: false,
      settingsButton: false,
      assignButton: true,
      transferButton: true,
    },
    menuItems: {
      dealsDashboard: false,
      leadsDashboard: false,
      projectDashboard: 'view',
      applications: 'view',
      chatCallEmailCalendar: 'view',
      crmContacts: false,
      crmCompanies: false,
      crmDeals: false,
      crmLeads: false,
      crmPipeline: false,
      projectsAndTasks: 'view',
      proposalsAndEstimations: 'view',
      invoicesAndPayments: false,
      analytics: false,
      reports: 'view_only',
    },
    modules: {
      DealsDashboard: false,
      LeadsDashboard: false,
      ProjectsDashboard: true,
      Contacts: false,
      Companies: false,
      Leads: false,
      Deals: false,
      Pipelines: false,
      Campaign: false,
      Projects: true,
      Tasks: true,
      Proposals: false,
      Contracts: false,
      Estimations: false,
      Invoices: false,
      Payments: false,
      Activities: true,
      Analytics: false,
      Kanban: true,
      UserManagement: false,
      Roles: false,
      Reports: true,
    }
  },
  'Employee': {
    sidebar: {
      dashboard: true,
      crm: true,
      applications: true,
      reports: true,
      userManagement: false,
      crmSettings: false,
      membership: false,
      content: false,
      blog: false,
      settings: false,
      superAdmin: false,
    },
    components: {
      createButton: false,
      editButton: true,
      deleteButton: false,
      bulkActions: false,
      exportButton: false,
      importButton: false,
      settingsButton: false,
      assignButton: false,
      transferButton: false,
    },
    menuItems: {
      dealsDashboard: false,
      leadsDashboard: false,
      projectDashboard: 'assigned_only',
      applications: 'view',
      chatCallEmailCalendar: 'view',
      crmContacts: false,
      crmCompanies: false,
      crmDeals: false,
      crmLeads: false,
      crmPipeline: false,
      projectsAndTasks: 'assigned_tasks_only',
      proposalsAndEstimations: false,
      invoicesAndPayments: false,
      analytics: false,
      reports: 'view_only',
    },
    modules: {
      DealsDashboard: false,
      LeadsDashboard: false,
      ProjectsDashboard: true,
      Contacts: false,
      Companies: false,
      Leads: false,
      Deals: false,
      Pipelines: false,
      Campaign: false,
      Projects: true,
      Tasks: true,
      Proposals: false,
      Contracts: false,
      Estimations: false,
      Invoices: false,
      Payments: false,
      Activities: true,
      Analytics: false,
      Kanban: true,
      UserManagement: false,
      Roles: false,
      Reports: true,
    }
  },
  'Sales': {
    sidebar: {
      dashboard: true,
      crm: true,
      applications: true,
      reports: true,
      userManagement: false,
      crmSettings: false,
      membership: false,
      content: false,
      blog: false,
      settings: false,
      superAdmin: false,
    },
    components: {
      createButton: true,
      editButton: true,
      deleteButton: false,
      bulkActions: true,
      exportButton: true,
      importButton: true,
      settingsButton: false,
      assignButton: true,
      transferButton: false,
    },
    menuItems: {
      dealsDashboard: 'view',
      leadsDashboard: 'view',
      projectDashboard: 'view',
      applications: 'view',
      chatCallEmailCalendar: 'view',
      crmContacts: 'view',
      crmCompanies: 'view',
      crmDeals: 'view',
      crmLeads: 'view',
      crmPipeline: 'view',
      projectsAndTasks: 'assigned_tasks_only',
      proposalsAndEstimations: 'view',
      invoicesAndPayments: false,
      analytics: 'view',
      reports: 'view',
    },
    modules: {
      SalesDashboard: true,
      DealsDashboard: true,
      LeadsDashboard: true,
      ProjectsDashboard: true,
      Contacts: true,
      Companies: true,
      Leads: true,
      Deals: true,
      Pipelines: true,
      Campaign: true,
      Projects: true,
      Tasks: true,
      Proposals: true,
      Contracts: true,
      Estimations: true,
      Invoices: true,
      Payments: false,
      Activities: true,
      Analytics: true,
      Kanban: true,
      UserManagement: false,
      Roles: false,
      Reports: true,
    }
  },
  'Leads Manager': {
    sidebar: { dashboard: true, crm: true, applications: true, reports: true },
    modules: { LeadsDashboard: true, Leads: true, Contacts: true, Activities: true, Reports: true }
  },
  'Deals Manager': {
    sidebar: { dashboard: true, crm: true, applications: true, reports: true },
    modules: { DealsDashboard: true, Deals: true, Pipelines: true, Proposals: true, Reports: true }
  },
  'Sales Manager': {
    sidebar: { dashboard: true, crm: true, applications: true, reports: true },
    modules: { SalesDashboard: true, LeadsDashboard: true, DealsDashboard: true, Leads: true, Deals: true, Pipelines: true, Proposals: true, Reports: true }
  },
  'Marketing Manager': {
    sidebar: { dashboard: true, crm: true, applications: true, reports: true },
    modules: { ProjectsDashboard: true, Campaign: true, Projects: true, Tasks: true, Reports: true }
  },
  'IT Manager': {
    sidebar: { dashboard: true, crm: true, applications: true, reports: true },
    modules: { ProjectsDashboard: true, Projects: true, Tasks: true, Kanban: true, Reports: true }
  },
  'Accounting Manager': {
    sidebar: { dashboard: true, crm: true, applications: true, reports: true },
    modules: { Invoices: true, Payments: true, Reports: true }
  },
  'Sales Executive': {
    sidebar: { dashboard: true, crm: true, applications: true },
    modules: { SalesDashboard: true, Leads: true, Deals: true, Activities: true }
  },
  'Marketing Executive': {
    sidebar: { dashboard: true, crm: true },
    modules: { ProjectsDashboard: true, Projects: true, Tasks: true }
  },
  'IT Specialist': {
    sidebar: { dashboard: true, crm: true },
    modules: { ProjectsDashboard: true, Projects: true, Tasks: true, Kanban: true }
  },
  'Accountant': {
    sidebar: { dashboard: true, crm: true },
    modules: { Invoices: true, Payments: true }
  }
};

export const getVisibility = (role, category, key) => {
  if (!role || !category || !key) return false;
  
  const roleVisibility = ROLE_UI_VISIBILITY[role] || ROLE_UI_VISIBILITY['IT Specialist'] || ROLE_UI_VISIBILITY['Employee'];
  if (!roleVisibility) return false;
  
  const categoryData = roleVisibility[category];
  if (!categoryData) return false;
  
  return categoryData[key] || false;
};

export const isSidebarItemVisible = (role, item) => {
  return getVisibility(role, 'sidebar', item);
};

export const isComponentVisible = (role, component) => {
  return getVisibility(role, 'components', component);
};

export const isModuleAccessible = (role, module) => {
  return getVisibility(role, 'modules', module);
};

export const getMenuItemAccess = (role, menuItem) => {
  return getVisibility(role, 'menuItems', menuItem) || false;
};

export const canViewMenuItem = (role, menuItem) => {
  const access = getMenuItemAccess(role, menuItem);
  return access && access !== false;
};

export const canEditMenuItem = (role, menuItem) => {
  const access = getMenuItemAccess(role, menuItem);
  return access === 'view' || access === 'view_only_if_assigned' || access === 'assigned_only';
};

export const isAssignedOnly = (role, menuItem) => {
  const access = getMenuItemAccess(role, menuItem);
  return access === 'assigned_only' || access === 'assigned_tasks_only';
};

export const isViewOnly = (role, menuItem) => {
  const access = getMenuItemAccess(role, menuItem);
  return access === 'view_only' || access === 'view_only_if_assigned' || access === 'view_only_if_linked';
};

export const getVisibleModules = (role) => {
  const roleVisibility = ROLE_UI_VISIBILITY[role] || ROLE_UI_VISIBILITY['Employee'];
  if (!roleVisibility || !roleVisibility.modules) return [];
  
  return Object.keys(roleVisibility.modules).filter(
    module => roleVisibility.modules[module]
  );
};

export const getVisibleSidebarSections = (role) => {
  const roleVisibility = ROLE_UI_VISIBILITY[role] || ROLE_UI_VISIBILITY['Employee'];
  if (!roleVisibility || !roleVisibility.sidebar) return [];
  
  return Object.keys(roleVisibility.sidebar).filter(
    section => roleVisibility.sidebar[section]
  );
};

export const getDataAccessLevel = (role) => {
  const levelMap = {
    'Super Admin': 'all',
    'Admin': 'all',
    'Deal Manager': 'assigned_and_team',
    'Project Manager': 'assigned_projects',
    'Employee': 'assigned_only',
  };
  return levelMap[role] || 'assigned_only';
};
