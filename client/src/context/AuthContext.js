import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getDataAccessLevel } from '../utils/roleBasedAccess';
import { API_BASE_URL } from '../config/environment';

export const AuthContext = createContext();

const DATA_ACCESS_LEVELS = {
  'Super Admin': {
    deals: 'all',
    leads: 'all',
    contacts: 'all',
    companies: 'all',
    projects: 'all',
    tasks: 'all',
    proposals: 'all',
    invoices: 'all',
  },
  'Admin': {
    deals: 'all',
    leads: 'all',
    contacts: 'all',
    companies: 'all',
    projects: 'all',
    tasks: 'all',
    proposals: 'all',
    invoices: 'all',
  },
  'Deal Manager': {
    deals: 'assigned_and_team',
    leads: 'assigned_and_team',
    contacts: 'assigned_and_team',
    companies: 'assigned_and_team',
    projects: 'assigned_and_team',
    tasks: 'assigned_and_team',
    proposals: 'assigned_and_team',
    invoices: 'assigned_and_team',
  },
  'Project Manager': {
    deals: 'linked_to_project',
    leads: 'none',
    contacts: 'linked_to_project',
    companies: 'none',
    projects: 'assigned',
    tasks: 'assigned',
    proposals: 'assigned',
    invoices: 'assigned',
  },
  'Employee': {
    deals: 'assigned_only',
    leads: 'assigned_only',
    contacts: 'assigned_only',
    companies: 'assigned_only',
    projects: 'assigned_only',
    tasks: 'assigned_only',
    proposals: 'none',
    invoices: 'none',
  },
  'Sales': {
    deals: 'assigned_only',
    leads: 'assigned_only',
    contacts: 'assigned_only',
    companies: 'all',
    projects: 'none',
    tasks: 'none',
    proposals: 'assigned_only',
    invoices: 'assigned_only',
  },
};

const ROLE_PERMISSIONS = {
  'Super Admin': {
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
    users: ['view', 'create', 'edit', 'delete'],
    roles: ['view', 'create', 'edit', 'delete'],
    reports: ['view', 'export', 'create'],
    settings: ['view', 'edit'],
  },
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
    users: ['view', 'create', 'edit'],
    roles: [],
    reports: ['view', 'export', 'create'],
    settings: [],
  },
  'Deal Manager': {
    dashboard: ['view', 'edit'],
    contacts: ['view', 'create', 'edit'],
    companies: ['view', 'create', 'edit'],
    leads: ['view', 'create', 'edit', 'convert'],
    deals: ['view', 'create', 'edit', 'assign'],
    pipeline: ['view', 'create', 'edit'],
    campaign: ['view', 'create', 'edit'],
    projects: ['view'],
    tasks: ['view', 'edit'],
    proposals: ['view', 'create', 'edit'],
    contracts: ['view'],
    estimations: ['view', 'create', 'edit'],
    invoices: ['view', 'create', 'edit'],
    payments: ['view'],
    activities: ['view'],
    analytics: ['view'],
    users: [],
    roles: [],
    reports: ['view', 'create'],
    settings: [],
  },
  'Project Manager': {
    dashboard: ['view'],
    contacts: ['view'],
    companies: ['view'],
    leads: [],
    deals: ['view'],
    pipeline: [],
    campaign: [],
    projects: ['view', 'create', 'edit', 'manage_team'],
    tasks: ['view', 'create', 'edit', 'delete', 'assign'],
    proposals: ['view', 'create', 'edit'],
    contracts: ['view'],
    estimations: ['view', 'create', 'edit'],
    invoices: ['view', 'create', 'edit'],
    payments: ['view'],
    activities: ['view'],
    analytics: ['view'],
    users: [],
    roles: [],
    reports: ['view'],
    settings: [],
  },
  'Employee': {
    dashboard: ['view'],
    contacts: ['view'],
    companies: ['view'],
    leads: [],
    deals: ['view', 'edit'],
    pipeline: [],
    campaign: [],
    projects: ['view'],
    tasks: ['view', 'edit'],
    proposals: ['view'],
    contracts: ['view'],
    estimations: ['view'],
    invoices: ['view'],
    payments: ['view'],
    activities: ['view'],
    analytics: [],
    users: [],
    roles: [],
    reports: [],
    settings: [],
  },
  'Sales': {
    dashboard: ['view'],
    contacts: ['view', 'create', 'edit'],
    companies: ['view', 'create', 'edit'],
    leads: ['view', 'create', 'edit', 'convert'],
    deals: ['view', 'create', 'edit'],
    pipeline: ['view'],
    campaign: ['view'],
    projects: [],
    tasks: [],
    proposals: ['view', 'create', 'edit'],
    contracts: ['view'],
    estimations: ['view', 'create', 'edit'],
    invoices: ['view'],
    payments: [],
    activities: ['view'],
    analytics: ['view'],
    users: [],
    roles: [],
    reports: ['view'],
    settings: [],
  },
};

// Copy and extend permissions dynamically for all department-specific system roles
ROLE_PERMISSIONS['Deals Manager'] = ROLE_PERMISSIONS['Deal Manager'];
ROLE_PERMISSIONS['Leads Manager'] = {
  ...ROLE_PERMISSIONS['Deal Manager'],
  leads: ['view', 'create', 'edit', 'convert', 'delete']
};
ROLE_PERMISSIONS['Sales Manager'] = {
  ...ROLE_PERMISSIONS['Super Admin'],
  users: [],
  roles: [],
  settings: [],
};
ROLE_PERMISSIONS['IT Manager'] = ROLE_PERMISSIONS['Project Manager'];
ROLE_PERMISSIONS['Marketing Manager'] = {
  ...ROLE_PERMISSIONS['Project Manager'],
  campaign: ['view', 'create', 'edit', 'delete']
};
ROLE_PERMISSIONS['Accounting Manager'] = {
  ...ROLE_PERMISSIONS['Admin'],
  projects: ['view'],
  tasks: ['view'],
  leads: [],
  deals: [],
};
ROLE_PERMISSIONS['Sales Executive'] = ROLE_PERMISSIONS['Sales'];
ROLE_PERMISSIONS['Marketing Executive'] = ROLE_PERMISSIONS['Employee'];
ROLE_PERMISSIONS['IT Specialist'] = ROLE_PERMISSIONS['Employee'];
ROLE_PERMISSIONS['Accountant'] = ROLE_PERMISSIONS['Employee'];

['Developer', 'Tester', 'DevOps Engineer', 'Frontend Developer', 'Backend Developer', 'Fullstack Developer'].forEach(r => {
  ROLE_PERMISSIONS[r] = ROLE_PERMISSIONS['Employee'];
  DATA_ACCESS_LEVELS[r] = DATA_ACCESS_LEVELS['Employee'];
});

// Map the data access levels for the new roles as well
DATA_ACCESS_LEVELS['Deals Manager'] = DATA_ACCESS_LEVELS['Deal Manager'];
DATA_ACCESS_LEVELS['Leads Manager'] = DATA_ACCESS_LEVELS['Deal Manager'];
DATA_ACCESS_LEVELS['Sales Manager'] = DATA_ACCESS_LEVELS['Admin'];
DATA_ACCESS_LEVELS['IT Manager'] = DATA_ACCESS_LEVELS['Project Manager'];
DATA_ACCESS_LEVELS['Marketing Manager'] = DATA_ACCESS_LEVELS['Project Manager'];
DATA_ACCESS_LEVELS['Accounting Manager'] = DATA_ACCESS_LEVELS['Admin'];
DATA_ACCESS_LEVELS['Sales Executive'] = DATA_ACCESS_LEVELS['Sales'];
DATA_ACCESS_LEVELS['Marketing Executive'] = DATA_ACCESS_LEVELS['Employee'];
DATA_ACCESS_LEVELS['IT Specialist'] = DATA_ACCESS_LEVELS['Employee'];
DATA_ACCESS_LEVELS['Accountant'] = DATA_ACCESS_LEVELS['Employee'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.role_name && !parsedUser.role) {
        parsedUser.role = parsedUser.role_name;
      }
      return parsedUser;
    }
    return null;
  });

  const [loading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [user]);

  useEffect(() => {
    if (user && user.id) {
      fetch(`${API_BASE_URL}/users`)
        .then(res => res.json())
        .then(data => {
          const userList = Array.isArray(data?.value) ? data.value : (Array.isArray(data) ? data : []);
          const dbUser = userList.find(u => Number(u.id) === Number(user.id));
          if (dbUser && dbUser.role_name && (dbUser.role_name !== user.role || dbUser.role_name !== user.role_name)) {
            const updated = {
              ...user,
              ...dbUser,
              role: dbUser.role_name,
              role_name: dbUser.role_name
            };
            setUser(updated);
            localStorage.setItem('currentUser', JSON.stringify(updated));
          }
        })
        .catch(err => console.error('Error syncing user role:', err));
    }
  }, [user?.id]);

  const login = useCallback((userData) => {
    if (userData.role_name && !userData.role) {
      userData.role = userData.role_name;
    }
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const hasPermission = useCallback((module, action) => {
    if (!user) return false;
    
    const rolePermissions = ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS['Employee'];
    if (!rolePermissions) return false;

    const modulePerms = rolePermissions[module];
    if (!modulePerms) return false;

    return modulePerms.includes(action);
  }, [user]);

  const hasRole = useCallback((role) => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  }, [user]);

  const canAccess = useCallback((modules) => {
    if (!user) return false;
    if (!Array.isArray(modules)) modules = [modules];
    
    if (!user.role) {
      console.warn('User role is not defined:', user);
      return false;
    }
    
    const rolePermissions = ROLE_PERMISSIONS[user.role];
    if (!rolePermissions) {
      console.warn(`Role "${user.role}" not found in ROLE_PERMISSIONS. Available roles:`, Object.keys(ROLE_PERMISSIONS));
      return false;
    }
    
    return modules.some(module => {
      return rolePermissions[module] && rolePermissions[module].length > 0;
    });
  }, [user]);

  const getRolePermissions = useCallback((role) => {
    return ROLE_PERMISSIONS[role] || {};
  }, []);

  const getDataAccessLevel = useCallback((module) => {
    if (!user) return 'none';
    const userDataAccess = DATA_ACCESS_LEVELS[user.role];
    if (!userDataAccess) return 'none';
    return userDataAccess[module] || 'none';
  }, [user]);

  const canAccessData = useCallback((module, dataItem = null) => {
    if (!user) return false;
    
    const accessLevel = getDataAccessLevel(module);
    
    if (accessLevel === 'all') return true;
    if (accessLevel === 'none') return false;
    
    if (accessLevel === 'assigned_only' && dataItem) {
      return dataItem.assignedTo?.includes(user.id) || dataItem.userId === user.id;
    }
    
    if (accessLevel === 'assigned_and_team' && dataItem) {
      return dataItem.assignedTo?.includes(user.id) || 
             dataItem.userId === user.id ||
             dataItem.teamMembers?.includes(user.id);
    }
    
    if (accessLevel === 'assigned' && dataItem) {
      return dataItem.assignedTo?.includes(user.id) || dataItem.userId === user.id;
    }
    
    return false;
  }, [user, getDataAccessLevel]);

  const value = {
    user,
    loading,
    login,
    logout,
    hasPermission,
    hasRole,
    canAccess,
    getRolePermissions,
    getDataAccessLevel,
    canAccessData,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
