# RBAC Quick Reference Card

## 🔑 Core Functions

### Check Sidebar Visibility
```javascript
import { isSidebarItemVisible } from '../utils/roleBasedAccess';

isSidebarItemVisible(user.role, 'dashboard');      // true/false
isSidebarItemVisible(user.role, 'reports');        // true/false
isSidebarItemVisible(user.role, 'userManagement'); // true/false
```

### Check Module Access
```javascript
import { isModuleAccessible } from '../utils/roleBasedAccess';

isModuleAccessible(user.role, 'Deals');      // true/false
isModuleAccessible(user.role, 'Reports');    // true/false
isModuleAccessible(user.role, 'Analytics');  // true/false
```

### Check Menu Item Access
```javascript
import { getMenuItemAccess, canViewMenuItem, isViewOnly, isAssignedOnly } from '../utils/roleBasedAccess';

// Get access level
const access = getMenuItemAccess(user.role, 'dealsDashboard');
// Returns: 'view' | 'view_only' | 'assigned_only' | 'assigned_tasks_only' | false

// Check if can view
canViewMenuItem(user.role, 'dealsDashboard');    // true/false

// Check if view-only (read-only)
isViewOnly(user.role, 'dealsDashboard');         // true/false

// Check if assigned-only
isAssignedOnly(user.role, 'dealsDashboard');     // true/false
```

### Use Auth Context
```javascript
import { useAuth } from '../hooks/useAuth';

const { 
  user,                          // Current user object
  hasPermission,                 // Check action permission
  hasRole,                       // Check if user has role
  canAccess,                     // Check module access
  getDataAccessLevel,            // Get data filtering level
  canAccessData,                 // Check data access for item
  isAuthenticated               // Is user logged in
} = useAuth();

// Examples:
if (user?.role === 'Super Admin') { /* ... */ }
if (hasRole('Admin')) { /* ... */ }
if (hasRole(['Admin', 'Super Admin'])) { /* ... */ }
if (hasPermission('deals', 'delete')) { /* ... */ }
if (canAccess('Deals')) { /* ... */ }
if (canAccessData('deals', dealItem)) { /* ... */ }
```

### UI Helper Functions
```javascript
import { 
  getButtonVisibility, 
  shouldDisableButton, 
  getAccessRestriction,
  renderLockedButton 
} from '../utils/roleBasedUI';

// Get button visibility
getButtonVisibility(user.role, 'createButton');   // true/false
getButtonVisibility(user.role, 'deleteButton');   // true/false

// Check if button should be disabled
shouldDisableButton(user.role, 'editButton', 'deals');  // true/false

// Get access restriction details
const { canEdit, canDelete, message } = getAccessRestriction(user.role, 'deals');

// Render locked button
{!canEdit && renderLockedButton('Edit', 'View-only access')}
```

---

## 🛡️ Route Protection

### Basic Route Protection
```javascript
<Route path="/deals" element={
  <ProtectedRoute>
    <DealsPage />
  </ProtectedRoute>
} />
```

### Role-Required Route
```javascript
<ProtectedRoute requiredRoles="Admin">
  <ManageUsersPage />
</ProtectedRoute>

<ProtectedRoute requiredRoles={['Admin', 'Super Admin']}>
  <SettingsPage />
</ProtectedRoute>
```

### Module-Required Route
```javascript
<ProtectedRoute requiredModules="Reports">
  <ReportsPage />
</ProtectedRoute>
```

### Menu Item Route
```javascript
<ProtectedRoute 
  requiredMenuItem="dealsDashboard"
  minAccessLevel="edit"
>
  <DealsPage />
</ProtectedRoute>
```

### Custom Fallback
```javascript
<ProtectedRoute fallback={<CustomAccessDenied />}>
  <PageContent />
</ProtectedRoute>
```

---

## 💻 Common UI Patterns

### Show Button Only for Permitted Roles
```javascript
{getButtonVisibility(user.role, 'deleteButton') && (
  <button onClick={handleDelete}>Delete</button>
)}
```

### Disable Edit for View-Only
```javascript
const { canEdit } = getAccessRestriction(user.role, 'deals');

<button disabled={!canEdit} onClick={handleEdit}>
  Edit Deal
</button>
```

### Filter Data by User Assignment
```javascript
const visibleDeals = deals.filter(deal => 
  canAccessData('deals', deal)
);
```

### Show Lock Icon for View-Only
```javascript
import { Lock } from 'lucide-react';

{isViewOnly(user.role, 'dealsDashboard') && (
  <Lock size={14} className="text-red-500" />
)}
```

### Display Access Denied Message
```javascript
import { isAssignedOnly } from '../utils/roleBasedAccess';

{isAssignedOnly(user.role, 'dealsDashboard') && (
  <p className="text-yellow-600">
    ℹ️ You can only view deals assigned to you
  </p>
)}
```

---

## 📊 Role Access Levels

### Access Level Values
- `'view'` - Full create, read, update, delete
- `'view_only'` - Read-only, no edit/delete
- `'assigned_only'` - Only own assigned items
- `'assigned_tasks_only'` - Only assigned tasks
- `false` - No access at all

### Data Access Levels
- `'all'` - Access to all records
- `'assigned_and_team'` - Own + team assignments
- `'assigned_only'` - Only own assignments
- `'linked_to_project'` - Only linked to user's projects
- `'assigned_projects'` - Only user's projects
- `'none'` - No access

---

## 🎭 5 Roles Summary

| Role | Best For | Key Modules | Access |
|------|----------|-------------|--------|
| Super Admin | System Owner | All | Full |
| Admin | Manager | All (no settings) | Full |
| Deal Manager | Sales Rep | Deals, Leads, Pipeline | Full |
| Project Manager | Project Lead | Projects, Tasks | Full |
| Employee | Team Member | Assigned items | Limited |

---

## 🔍 Debugging Tips

### Check User Role in Browser Console
```javascript
// In React DevTools or console
const user = JSON.parse(localStorage.getItem('currentUser'));
console.log(user.role);
```

### Check if User Has Permission
```javascript
import { useAuth } from '../hooks/useAuth';

const { hasPermission } = useAuth();
console.log(hasPermission('deals', 'create')); // true/false
```

### Check Menu Access
```javascript
import { getMenuItemAccess } from '../utils/roleBasedAccess';

console.log(getMenuItemAccess('Deal Manager', 'dealsDashboard'));
// Output: 'view' or 'view_only' or 'assigned_only' or false
```

### List All Accessible Modules
```javascript
import { getVisibleModules } from '../utils/roleBasedAccess';

console.log(getVisibleModules(user.role));
// Output: ['Dashboard', 'Contacts', 'Deals', ...]
```

---

## ✅ Common Tasks

### Hide a Menu Item for a Role
```javascript
// In roleBasedAccess.js, find the role, set:
'Employee': {
  menuItems: {
    reports: false,  // Hidden from Employee
    // ...
  }
}
```

### Make Item View-Only for a Role
```javascript
'Project Manager': {
  menuItems: {
    crmDeals: 'view_only',  // Project Manager can only view deals
    // ...
  }
}
```

### Filter Data for Employee
```javascript
const deals = allDeals.filter(deal => {
  return canAccessData('deals', { 
    ...deal, 
    assignedTo: [deal.assignedUserId] 
  });
});
```

### Create Role-Restricted Component
```javascript
export const AdminOnly = ({ children }) => {
  const { hasRole } = useAuth();
  
  return hasRole(['Admin', 'Super Admin']) ? children : null;
};

// Usage:
<AdminOnly>
  <DeleteButton />
</AdminOnly>
```

---

## 📱 Import Statements

```javascript
// Role checking
import { 
  isSidebarItemVisible,
  isModuleAccessible,
  getMenuItemAccess,
  canViewMenuItem,
  isViewOnly,
  isAssignedOnly,
  getVisibleModules,
  getVisibleSidebarSections,
  getDataAccessLevel
} from '../utils/roleBasedAccess';

// Authentication
import { useAuth } from '../hooks/useAuth';

// Route protection
import ProtectedRoute from '../components/ProtectedRoute';

// UI helpers
import { 
  getButtonVisibility,
  shouldDisableButton,
  getAccessRestriction,
  renderLockedButton
} from '../utils/roleBasedUI';
```

---

## 🚀 Quick Implementation Template

```javascript
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { isViewOnly, getMenuItemAccess } from '../utils/roleBasedAccess';
import { Lock } from 'lucide-react';

export const MyComponent = () => {
  const { user, hasPermission, canAccessData } = useAuth();
  const isReadOnly = isViewOnly(user?.role, 'dealsDashboard');
  
  return (
    <div>
      {/* Header with lock icon if view-only */}
      <div className="flex items-center gap-2">
        <h1>My Deals</h1>
        {isReadOnly && <Lock size={16} className="text-red-500" />}
      </div>
      
      {/* Hide create button if not permitted */}
      {hasPermission('deals', 'create') && (
        <button>Create Deal</button>
      )}
      
      {/* Filter data by user access */}
      {items
        .filter(item => canAccessData('deals', item))
        .map(item => (
          <div key={item.id}>
            {item.name}
            {!isReadOnly && <EditButton item={item} />}
          </div>
        ))
      }
    </div>
  );
};
```

---

**Last Updated**: 2025-12-11  
**Status**: ✅ Ready for Production
