# Role-Based Access Control (RBAC) System

## Overview

This CRM application implements a comprehensive role-based access control system with 5 distinct roles, each with specific permissions and data access levels.

## Roles & Permissions

### 1. **Super Admin** 🔴
**Full system access** - Can manage everything including users, roles, and system configuration.

- **Menu Access**: ✅ All menus
- **Key Permissions**:
  - Create, read, update, delete all records
  - Manage users and roles
  - Configure pipelines and system settings
  - Access all reports and analytics
  - Change user roles and permissions

**Best For**: CRM system owner, IT administrator

---

### 2. **Admin** 🟠
**Company-wide management** - Can manage business operations but NOT system settings.

- **Menu Access**: ✅ All menus except System Settings
- **Key Permissions**:
  - Create, read, update, delete deals, leads, projects
  - Manage user assignments (but NOT user creation)
  - Configure pipelines and stages
  - Access all reports
  - Manage team tasks and activities

**Restrictions**:
- ❌ Cannot change system settings
- ❌ Cannot edit or delete Super Admin users
- ❌ Cannot manage user roles

**Best For**: Business manager, operations manager

---

### 3. **Deal Manager** 🟣
**Sales & deals focused** - Specializes in deal and lead management.

- **Primary Modules**:
  - ✅ Deals Dashboard (full access)
  - ✅ Leads Dashboard (full access)
  - ✅ Pipeline Management
  - ✅ Reports & Analytics (view + create)
  - ✅ Campaign Management
  - ✅ Proposals & Estimations
  - ✅ Invoices & Payments

- **Limited Access**:
  - 👁️ Projects (view-only)
  - ❌ Cannot access Contracts

**Key Features**:
- Create and manage deals from lead conversion
- Track pipeline progress
- Assign deals to team members
- Generate sales reports

**Restrictions**:
- ❌ Cannot delete pipelines
- ❌ Cannot create/manage projects
- ❌ Cannot access user management

**Best For**: Sales manager, deal manager

---

### 4. **Project Manager** 🟢
**Project focused** - Specializes in project management and delivery.

- **Primary Modules**:
  - ✅ Project Dashboard (full access)
  - ✅ Projects & Tasks
  - ✅ Estimations & Proposals
  - ✅ Invoices & Payments
  - ✅ Team Management

- **Conditional Access**:
  - 👁️ Deals (view-only) - Can see linked deals
  - 👁️ Contacts (view-only if linked to project)
  - 👁️ Analytics (view-only)
  - 👁️ Reports (view-only)

- **No Access**:
  - ❌ Leads Dashboard
  - ❌ Companies
  - ❌ Pipeline Management

**Key Features**:
- Create and manage projects
- Assign tasks to team members
- Create proposals and estimates
- Generate project-based invoices

**Restrictions**:
- ❌ Cannot delete projects created by admins
- ❌ Cannot see full sales pipeline
- ❌ Cannot access full lead information

**Best For**: Project manager, project lead

---

### 5. **Employee** 👥
**Limited user access** - Can only see assigned work.

- **Menu Access**:
  - ✅ Chat, Calendar, Email, Activities
  - ✅ Applications

- **Data Access** (Assigned Only):
  - 👁️ Own assigned deals
  - 👁️ Own assigned tasks
  - 👁️ Own assigned projects
  - 👁️ Associated contacts and companies

- **No Access**:
  - ❌ Reports & Analytics
  - ❌ Proposals, Invoices, Payments
  - ❌ User Management
  - ❌ Pipeline Management

**Key Features**:
- View and update assigned deals
- Complete assigned tasks
- Update task status
- Add notes and activities

**Restrictions**:
- ❌ Cannot create new deals or leads
- ❌ Cannot delete any records
- ❌ Cannot see other teams' data
- ❌ Cannot access financial reports

**Best For**: Team member, sales representative

---

## Menu Access Matrix

| Menu Item | Super Admin | Admin | Deal Manager | Project Manager | Employee |
|-----------|:-----------:|:-----:|:------------:|:---------------:|:--------:|
| Deals Dashboard | ✅ | ✅ | ✅ | 👁️ if assigned | Assigned only |
| Leads Dashboard | ✅ | ✅ | ✅ | ❌ | Assigned only |
| Project Dashboard | ✅ | ✅ | 👁️ | ✅ | Assigned |
| Applications | ✅ | ✅ | ✅ | ✅ | ✅ |
| Chat/Call/Email/Calendar | ✅ | ✅ | ✅ | ✅ | ✅ |
| CRM → Contacts | ✅ | ✅ | ✅ | 👁️ if linked | Assigned only |
| CRM → Companies | ✅ | ✅ | ✅ | ❌ | Assigned only |
| CRM → Deals | ✅ | ✅ | ✅ | 👁️ | Assigned only |
| CRM → Leads | ✅ | ✅ | ✅ | ❌ | Assigned only |
| CRM → Pipeline | ✅ | ✅ | ✅ | ❌ | ❌ |
| Projects / Tasks | ✅ | ✅ | 👁️ | ✅ | Assigned tasks |
| Proposals / Estimations | ✅ | ✅ | ✅ | ✅ | ❌ |
| Invoices / Payments | ✅ | ✅ | ✅ | ✅ | ❌ |
| Analytics | ✅ | ✅ | ✅ | 👁️ | ❌ |
| Reports | ✅ | ✅ | ✅ | 👁️ | ❌ |

**Legend:**
- ✅ = Full access (create, read, update, delete)
- 👁️ = View-only (read only, cannot edit/delete)
- ❌ = No access (hidden from menu)
- "Assigned only" = Can only see items assigned to this user

---

## Implementation Details

### Frontend Files

#### `roleBasedAccess.js`
Contains the role visibility configuration and helper functions:

```javascript
// Check if a menu item is visible
import { isSidebarItemVisible } from '../utils/roleBasedAccess';
const visible = isSidebarItemVisible(user.role, 'dashboard');

// Check if a module is accessible
import { isModuleAccessible } from '../utils/roleBasedAccess';
const canAccess = isModuleAccessible(user.role, 'Deals');

// Get menu item access level
import { getMenuItemAccess } from '../utils/roleBasedAccess';
const access = getMenuItemAccess(user.role, 'dealsDashboard');
// Returns: 'view', 'view_only', 'assigned_only', false
```

#### `AuthContext.js`
Manages user authentication and provides permission checking:

```javascript
const { user, hasPermission, hasRole, canAccess, canAccessData } = useAuth();

// Check if user has specific role
if (hasRole('Super Admin')) { /* ... */ }

// Check if user has permission for action
if (hasPermission('deals', 'create')) { /* ... */ }

// Check if user can access data
if (canAccessData('deals', dealItem)) { /* ... */ }
```

#### `ProtectedRoute.js`
Enhanced route protection with role and permission checks:

```javascript
<Route
  path="/deals"
  element={
    <ProtectedRoute requiredModules="Deals">
      <DealsPage />
    </ProtectedRoute>
  }
/>
```

#### `roleBasedUI.js`
Utilities for UI components to respect role restrictions:

```javascript
import { getButtonVisibility, getAccessRestriction } from '../utils/roleBasedUI';

const { canEdit, canDelete, message } = getAccessRestriction(user.role, 'deals');

// Show/hide buttons based on role
{getButtonVisibility(user.role, 'deleteButton') && (
  <button onClick={deleteDeal}>Delete</button>
)}
```

### Using Role-Based Access in Components

#### Example: Conditional Menu Item
```javascript
import { isSidebarItemVisible } from '../utils/roleBasedAccess';

{isSidebarItemVisible(user?.role, 'reports') && (
  <MenuSection title="Reports" items={reportItems} />
)}
```

#### Example: View-Only Content
```javascript
import { isViewOnly } from '../utils/roleBasedAccess';

const isReadOnly = isViewOnly(user.role, 'dealsDashboard');

// Disable edit buttons
<button disabled={isReadOnly}>Edit Deal</button>
```

#### Example: Data-Level Access
```javascript
import { canAccessData } from '../hooks/useAuth';

const { canAccessData } = useAuth();

// Filter deals to only show assigned
const visibleDeals = deals.filter(deal => 
  canAccessData('deals', deal)
);
```

---

## Database Structure

### Users Table
```sql
id INT PRIMARY KEY
first_name VARCHAR(100)
last_name VARCHAR(100)
email VARCHAR(150) UNIQUE
password VARCHAR(255)
role_id INT FOREIGN KEY -> roles.id
status ENUM('Active', 'Inactive')
created_at TIMESTAMP
```

### Roles Table
```sql
id INT PRIMARY KEY (1=Super Admin, 2=Admin, 3=Deal Manager, 4=Project Manager, 5=Employee)
name VARCHAR(100) UNIQUE
description TEXT
```

### Permissions Table
```sql
id INT PRIMARY KEY
role_id INT FOREIGN KEY -> roles.id
module_name VARCHAR(100)
can_create BOOLEAN
can_read BOOLEAN
can_update BOOLEAN
can_delete BOOLEAN
```

---

## How to Assign Roles

### At Signup
Users select their role during registration:
```javascript
// SignupPage.js - Users can select from:
const ROLES = [
  { id: 'Super Admin', label: 'Super Admin', color: 'red' },
  { id: 'Admin', label: 'Admin', color: 'orange' },
  { id: 'Deal Manager', label: 'Deal Manager', color: 'purple' },
  { id: 'Project Manager', label: 'Project Manager', color: 'green' },
  { id: 'Employee', label: 'Employee', color: 'cyan' },
];
```

### Change Existing User's Role
Admins and Super Admins can change user roles:
```javascript
// In ManageUsersPage or similar
await updateUserRole(userId, newRole);
```

---

## Best Practices

1. **Always Check Permissions in Components**
   - Use `isSidebarItemVisible()` to hide menu items
   - Use `isModuleAccessible()` to control module access
   - Use `getMenuItemAccess()` for fine-grained control

2. **Disable Actions Based on Access Level**
   - Hide delete buttons from Deal Manager
   - Show "View-Only" indicator for Project Manager viewing deals
   - Disable edit buttons for Employee-assigned-only items

3. **Data Filtering**
   - Always filter API responses based on user role
   - Employees should only see their assigned items
   - Project Managers should only see linked deals

4. **Server-Side Validation** (Important!)
   - Backend must validate role before processing requests
   - Never trust frontend role checks alone
   - Implement middleware to verify user permissions on API

5. **User Communication**
   - Show helpful messages when access is denied
   - Indicate "View-Only" status clearly
   - Suggest alternatives or request role change if needed

---

## Testing Role-Based Access

### Test Account Credentials
Create test accounts with each role:

```
Super Admin: admin@example.com
Admin: manager@example.com
Deal Manager: sales@example.com
Project Manager: pm@example.com
Employee: employee@example.com
```

### Test Checklist
- [ ] Menu items show/hide correctly per role
- [ ] Edit buttons disabled for view-only roles
- [ ] Delete buttons only show for permitted roles
- [ ] Data filtered correctly per user assignment
- [ ] Reports only show for authorized roles
- [ ] Sidebar collapses correctly per section visibility

---

## Extending Role-Based Access

### Add a New Permission
1. Update `ROLE_PERMISSIONS` in `AuthContext.js`
2. Add to `ROLE_UI_VISIBILITY` in `roleBasedAccess.js`
3. Use in components with `hasPermission()`

### Add a New Menu Item
1. Add to `crmMenuItems` or relevant section in `Sidebar.js`
2. Add access level to `menuItems` in `roleBasedAccess.js`
3. Wrap with `ProtectedRoute` if needed

### Change Permission for a Role
1. Edit `DATA_ACCESS_LEVELS` in `AuthContext.js`
2. Edit `ROLE_UI_VISIBILITY` in `roleBasedAccess.js`
3. Test with test accounts

---

## Troubleshooting

### Menu Item Not Showing
1. Check `ROLE_UI_VISIBILITY` in `roleBasedAccess.js`
2. Verify role name matches exactly
3. Check if parent section is visible

### Button Still Shows for View-Only Role
1. Use `isComponentVisible()` or `getAccessRestriction()`
2. Ensure button click handler checks permissions
3. Wrap button component in conditional render

### User Can Access Unauthorized Data
1. Check `DATA_ACCESS_LEVELS` in `AuthContext.js`
2. Verify `canAccessData()` is called in data filtering
3. Check API response filtering on backend

---

## Support & Questions

For role configuration questions or to modify access controls:
1. Check `roleBasedAccess.js` for UI visibility rules
2. Check `AuthContext.js` for permission rules
3. Refer to `ProtectedRoute.js` for route protection examples
