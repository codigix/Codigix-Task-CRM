# Role-Based UI Access Matrix & Components

## 📋 Complete Role Access Overview

---

## 1️⃣ **ADMIN ROLE**
**Full System Access - All Features Enabled**

### Sidebar Visibility
```
✓ Dashboard
✓ CRM Module (All sub-items)
✓ Applications (Chat, Calls, Calendar, Email, etc.)
✓ Reports (All report types)
✓ User Management
✓ CRM Settings
✓ Content Management
✓ System Settings
```

### Accessible Modules
```
Dashboard ...................... ✓ View, Edit, Create, Delete
Contacts ....................... ✓ View, Create, Edit, Delete, Export
Companies ...................... ✓ View, Create, Edit, Delete, Export
Leads .......................... ✓ View, Create, Edit, Delete, Convert, Export
Deals .......................... ✓ View, Create, Edit, Delete, Assign, Export
Pipeline ....................... ✓ View, Create, Edit, Delete
Campaign ....................... ✓ View, Create, Edit, Delete
Projects ....................... ✓ View, Create, Edit, Delete, Manage Team
Tasks .......................... ✓ View, Create, Edit, Delete, Assign
Proposals ...................... ✓ View, Create, Edit, Delete
Contracts ...................... ✓ View, Create, Edit, Delete
Estimations .................... ✓ View, Create, Edit, Delete
Invoices ....................... ✓ View, Create, Edit, Delete
Payments ....................... ✓ View, Create, Edit, Delete
Activities ..................... ✓ View, Export
Analytics ...................... ✓ View, Export, Create Reports
```

### UI Components Visibility
```
Create Button .................. ✓ Visible
Edit Button .................... ✓ Visible
Delete Button .................. ✓ Visible
Bulk Actions ................... ✓ Visible
Export Button .................. ✓ Visible
Import Button .................. ✓ Visible
Settings Button ................ ✓ Visible
Assign/Transfer ................ ✓ Visible
User Management ................ ✓ Visible
Roles & Permissions ............ ✓ Visible & Editable
```

---

## 2️⃣ **COMPANY OWNER ROLE**
**Company-Level Management**

### Sidebar Visibility
```
✓ Dashboard
✓ CRM Module (Most sub-items)
✓ Applications (Chat, Calls, Calendar, Email, etc.)
✓ Reports (Limited reports)
✗ User Management
✗ CRM Settings
✗ Content Management
✗ System Settings
```

### Accessible Modules
```
Dashboard ...................... ✓ View, Edit
Contacts ....................... ✓ View, Create, Edit
Companies ...................... ✓ View, Edit (Own company)
Leads .......................... ✓ View, Create, Edit, Convert
Deals .......................... ✓ View, Create, Edit, Assign
Pipeline ....................... ✓ View Only
Campaign ....................... ✓ View, Create, Edit
Projects ....................... ✓ View, Create, Edit, Manage Team
Tasks .......................... ✓ View, Create, Edit, Assign
Proposals ...................... ✓ View, Create, Edit
Contracts ...................... ✓ View, Create, Edit
Estimations .................... ✓ View, Create, Edit
Invoices ....................... ✓ View, Create, Edit
Payments ....................... ✓ View Only
Activities ..................... ✓ View Only
Analytics ...................... ✓ View Only
```

### UI Components Visibility
```
Create Button .................. ✓ Visible
Edit Button .................... ✓ Visible
Delete Button .................. ✗ Hidden
Bulk Actions ................... ✓ Visible
Export Button .................. ✓ Visible
Import Button .................. ✗ Hidden
Settings Button ................ ✗ Hidden
Assign/Transfer ................ ✓ Visible
User Management ................ ✗ Hidden
Roles & Permissions ............ ✗ Hidden
```

### Row-Level Access
- Can only view/edit own company's data
- Cannot delete any company
- Cannot manage users

---

## 3️⃣ **DEAL OWNER ROLE**
**Deal & Lead Focused**

### Sidebar Visibility
```
✓ Dashboard
✓ CRM Module (Core items)
✓ Applications (Limited)
✗ Reports
✗ User Management
✗ CRM Settings
✗ Content Management
✗ System Settings
```

### Accessible Modules
```
Dashboard ...................... ✓ View Only
Contacts ....................... ✓ View, Edit
Companies ...................... ✓ View Only
Leads .......................... ✓ View, Create, Edit, Convert
Deals .......................... ✓ View, Create, Edit, Assign
Pipeline ....................... ✓ View Only
Campaign ....................... ✗ No Access
Projects ....................... ✓ View Only
Tasks .......................... ✓ View, Create, Edit
Proposals ...................... ✓ View, Create, Edit
Contracts ...................... ✓ View Only
Estimations .................... ✓ View, Create, Edit
Invoices ....................... ✓ View Only
Payments ....................... ✓ View Only
Activities ..................... ✓ View Only
Analytics ...................... ✓ View Only
```

### UI Components Visibility
```
Create Button .................. ✓ Visible (Own only)
Edit Button .................... ✓ Visible (Own only)
Delete Button .................. ✗ Hidden
Bulk Actions ................... ✗ Hidden
Export Button .................. ✓ Visible
Import Button .................. ✗ Hidden
Settings Button ................ ✗ Hidden
Assign/Transfer ................ ✓ Limited
User Management ................ ✗ Hidden
Roles & Permissions ............ ✗ Hidden
```

### Row-Level Access
- Can only create/edit own deals
- Can view all deals (read-only)
- Can only edit own contacts
- Cannot access campaign module

---

## 4️⃣ **PROJECT MANAGER ROLE**
**Project & Task Management**

### Sidebar Visibility
```
✓ Dashboard
✓ CRM Module (Limited)
✓ Applications (Chat, Calendar, Tasks)
✓ Reports (Project reports)
✗ User Management
✗ CRM Settings
✗ Content Management
✗ System Settings
```

### Accessible Modules
```
Dashboard ...................... ✓ View Only
Contacts ....................... ✓ View Only
Companies ...................... ✓ View Only
Leads .......................... ✗ No Access
Deals .......................... ✓ View Only
Pipeline ....................... ✓ View Only
Campaign ....................... ✓ View, Create, Edit
Projects ....................... ✓ View, Create, Edit, Delete, Manage Team
Tasks .......................... ✓ View, Create, Edit, Delete, Assign
Proposals ...................... ✓ View Only
Contracts ...................... ✓ View Only
Estimations .................... ✗ No Access
Invoices ....................... ✗ No Access
Payments ....................... ✗ No Access
Activities ..................... ✓ View Only
Analytics ...................... ✓ View Only
```

### UI Components Visibility
```
Create Button .................. ✓ Visible (Projects & Tasks)
Edit Button .................... ✓ Visible
Delete Button .................. ✓ Visible (Tasks & Projects)
Bulk Actions ................... ✓ Visible
Export Button .................. ✓ Visible
Import Button .................. ✗ Hidden
Settings Button ................ ✗ Hidden
Assign/Transfer ................ ✓ Visible
User Management ................ ✗ Hidden
Roles & Permissions ............ ✗ Hidden
```

### Row-Level Access
- Full control over assigned projects
- Can manage project team members
- Cannot access leads or estimations
- Cannot manage invoices/payments

---

## 5️⃣ **CLIENT ROLE**
**View-Only Access for External Clients**

### Sidebar Visibility
```
✓ Dashboard (Minimal)
✗ CRM Module
✗ Applications
✗ Reports
✗ User Management
✗ CRM Settings
✗ Content Management
✗ System Settings
```

### Accessible Modules
```
Dashboard ...................... ✓ View Only
Contacts ....................... ✓ View Only
Companies ...................... ✓ View Only
Leads .......................... ✗ No Access
Deals .......................... ✓ View Only
Pipeline ....................... ✓ View Only
Campaign ....................... ✗ No Access
Projects ....................... ✓ View Only
Tasks .......................... ✓ View Only
Proposals ...................... ✓ View Only
Contracts ...................... ✓ View Only
Estimations .................... ✓ View Only
Invoices ....................... ✓ View Only
Payments ....................... ✓ View Only
Activities ..................... ✗ No Access
Analytics ...................... ✗ No Access
```

### UI Components Visibility
```
Create Button .................. ✗ Hidden
Edit Button .................... ✗ Hidden
Delete Button .................. ✗ Hidden
Bulk Actions ................... ✗ Hidden
Export Button .................. ✗ Hidden
Import Button .................. ✗ Hidden
Settings Button ................ ✗ Hidden
Assign/Transfer ................ ✗ Hidden
User Management ................ ✗ Hidden
Roles & Permissions ............ ✗ Hidden
```

### Row-Level Access
- Read-only access to all assigned items
- Cannot perform any create/edit/delete operations
- Dashboard shows limited metrics only
- Cannot access internal activities or analytics

---

## 6️⃣ **LEAD ROLE**
**Sales Team Member**

### Sidebar Visibility
```
✓ Dashboard
✓ CRM Module (Most items)
✓ Applications (Chat, Calendar, Tasks)
✗ Reports (Limited)
✗ User Management
✗ CRM Settings
✗ Content Management
✗ System Settings
```

### Accessible Modules
```
Dashboard ...................... ✓ View Only
Contacts ....................... ✓ View, Create, Edit
Companies ...................... ✓ View Only
Leads .......................... ✓ View, Create, Edit
Deals .......................... ✓ View, Create, Edit
Pipeline ....................... ✓ View Only
Campaign ....................... ✗ No Access
Projects ....................... ✓ View Only
Tasks .......................... ✓ View, Create, Edit
Proposals ...................... ✓ View Only
Contracts ...................... ✗ No Access
Estimations .................... ✗ No Access
Invoices ....................... ✗ No Access
Payments ....................... ✗ No Access
Activities ..................... ✓ View Only
Analytics ...................... ✗ No Access
```

### UI Components Visibility
```
Create Button .................. ✓ Visible (Leads, Deals, Contacts)
Edit Button .................... ✓ Visible (Own records)
Delete Button .................. ✗ Hidden
Bulk Actions ................... ✗ Hidden
Export Button .................. ✗ Hidden
Import Button .................. ✗ Hidden
Settings Button ................ ✗ Hidden
Assign/Transfer ................ ✗ Hidden
User Management ................ ✗ Hidden
Roles & Permissions ............ ✗ Hidden
```

### Row-Level Access
- Can create and manage own leads
- Can create and manage own deals
- Can edit own contacts
- Cannot access financial modules (contracts, estimations, invoices)
- Cannot manage campaigns or projects

---

## 🔐 API Endpoint Access Control

### Implementation in Backend

```javascript
// Example: GET /api/leads
// Requires: 'leads' module access with 'view' permission

// Example: POST /api/deals
// Requires: 'deals' module access with 'create' permission

// Example: DELETE /api/projects/:id
// Requires: 'projects' module access with 'delete' permission
// AND Admin or Project Manager role
```

### Headers Required
```
X-User-ID: <user_id>
X-User-Role: <role_name>
```

---

## 🎯 Feature Comparison Table

| Feature | Admin | Company Owner | Deal Owner | Project Manager | Client | Lead |
|---------|-------|---------------|-----------|-----------------|--------|------|
| **Dashboard** | Full | Full | View | View | View | View |
| **Contacts** | CRUD | CRU | RU | R | R | CR |
| **Companies** | CRUD | RU | R | R | R | R |
| **Leads** | CRUD+ | CRU+ | CRU+ | ✗ | ✗ | CR |
| **Deals** | CRUD+ | CRU+ | CRU+ | R | R | CR |
| **Pipeline** | CRUD | R | R | R | R | R |
| **Campaign** | CRUD | CRU | ✗ | CRU | ✗ | ✗ |
| **Projects** | CRUD+ | CRU+ | R | CRUD+ | R | R |
| **Tasks** | CRUD+ | CRU+ | CRU | CRUD | R | CRU |
| **Proposals** | CRUD | CRU | CRU | R | R | R |
| **Contracts** | CRUD | CRU | R | R | R | ✗ |
| **Estimations** | CRUD | CRU | CRU | ✗ | R | ✗ |
| **Invoices** | CRUD | CRU | R | ✗ | R | ✗ |
| **Payments** | CRUD | R | R | ✗ | R | ✗ |
| **Reports** | CRUD | CRU | R | CR | ✗ | ✗ |
| **User Mgmt** | CRD | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Roles** | CRD | ✗ | ✗ | ✗ | ✗ | ✗ |

**Legend:** 
- C = Create
- R = Read
- U = Update
- D = Delete
- `+` = With additional permissions (assign, export, manage team)
- ✗ = No access

---

## 🛠️ Implementation Steps

### 1. Frontend Implementation
- Wrap App with `<AuthProvider>`
- Use `useAuth()` hook to get user permissions
- Use `ProtectedRoute` for route protection
- Use `isComponentVisible()` for UI element visibility

### 2. Backend Implementation
- Add `requireAuth` middleware to all protected routes
- Add `requireRole()` for role-specific endpoints
- Add `requirePermission()` for granular permission checks
- Return appropriate HTTP status codes (401, 403)

### 3. Database Seeding
- Insert 6 default roles
- Create permission mappings for each role
- Associate users with roles

---

## 📝 Example Usage

### Frontend - Route Protection
```jsx
<ProtectedRoute requiredRoles="Admin">
  <ManageUsersPage />
</ProtectedRoute>

<ProtectedRoute requiredModules="deals">
  <DealsPage />
</ProtectedRoute>
```

### Frontend - Component Visibility
```jsx
import { isComponentVisible } from '../utils/roleBasedAccess';
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
  const { user } = useAuth();
  
  return (
    <>
      {isComponentVisible(user.role, 'deleteButton') && (
        <button>Delete</button>
      )}
    </>
  );
}
```

### Backend - Route Protection
```javascript
const { requireAuth, requireRole, requirePermission } = require('./middleware/authMiddleware');

app.delete('/api/users/:id', requireAuth, requireRole('Admin'), (req, res) => {
  // Delete user logic
});

app.post('/api/deals', requireAuth, requirePermission('deals', 'create'), (req, res) => {
  // Create deal logic
});
```

---

## 🔄 Update User Role

To update a user's role:

```javascript
await connection.query(
  'UPDATE users SET role_id = ? WHERE id = ?',
  [roleId, userId]
);
```

Then fetch the role name:

```javascript
const [user] = await connection.query(
  'SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
  [userId]
);
```

---

## ⚠️ Security Checklist

- [x] Always validate permissions on backend (never trust frontend only)
- [x] Use role headers in API requests (with authentication token later)
- [x] Log all permission-based access for audit trails
- [x] Implement rate limiting per role
- [x] Use HTTPS in production
- [x] Validate user session before granting access
- [x] Clear sensitive data from local storage on logout

---

## 🚀 Next Steps

1. ✅ Create AuthContext (DONE)
2. ✅ Create role utilities (DONE)
3. Create authentication/login page
4. Integrate with existing user database
5. Update Sidebar component with role-based visibility
6. Add API middleware to server
7. Update all page components to check permissions
8. Test all role access scenarios
9. Document role assignments for each user
10. Set up audit logging

