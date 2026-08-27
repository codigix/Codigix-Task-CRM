# Role-Based Authentication Implementation Guide

Complete guide to implementing and using role-based access control in your Deals Dashboard application.

---

## 📁 File Structure

```
client/src/
├── context/
│   └── AuthContext.js           # Auth state and permissions logic
├── hooks/
│   └── useAuth.js               # Custom hook for auth context
├── utils/
│   └── roleBasedAccess.js        # UI visibility utilities
├── components/
│   ├── LoginPage.js             # Login page with demo users
│   ├── ProtectedRoute.js         # Route protection wrapper
│   ├── Sidebar.js               # Updated with role-based visibility
│   └── [other components]
└── App.js                       # Updated with AuthProvider

server/
├── middleware/
│   └── authMiddleware.js        # Backend auth & permission checks
└── server.js                    # Main server file
```

---

## 🎯 6 Roles & Their Permissions

### 1. **Admin** - Full Access
- **Access Level**: Complete system access
- **Key Permissions**: All modules (CRUD + Export)
- **Sidebar**: All sections visible
- **Components**: All buttons visible (Create, Edit, Delete, Bulk Actions, Settings)

### 2. **Company Owner** - Company Management
- **Access Level**: Company-wide management
- **Key Permissions**: Contacts, Companies, Leads, Deals, Projects, Campaigns
- **Sidebar**: CRM, Reports, Applications visible
- **Restrictions**: Cannot delete, Cannot manage users, No settings access

### 3. **Deal Owner** - Deal & Lead Focused
- **Access Level**: Deal and lead management
- **Key Permissions**: Leads, Deals, Contacts, Tasks, Proposals, Estimations
- **Sidebar**: Limited CRM items
- **Restrictions**: Cannot access campaigns, finance modules, No bulk actions

### 4. **Project Manager** - Project & Task Management
- **Access Level**: Project delivery management
- **Key Permissions**: Projects, Tasks, Campaigns, Reports
- **Sidebar**: CRM (Limited), Applications, Reports
- **Restrictions**: Cannot access leads, finance, No user management

### 5. **Client** - View-Only Access
- **Access Level**: Read-only dashboard access
- **Key Permissions**: View only (Dashboard, Deals, Projects, Invoices, Contracts)
- **Sidebar**: Minimal navigation
- **Restrictions**: No create/edit/delete, No internal modules, No analytics

### 6. **Lead** - Sales Team Member
- **Access Level**: Personal lead and deal management
- **Key Permissions**: Leads, Deals, Contacts, Tasks
- **Sidebar**: CRM (Most items), Applications
- **Restrictions**: Cannot delete, No finance modules, No bulk operations

---

## 🚀 Getting Started

### Step 1: Update Environment Variables

```env
# .env.development
REACT_APP_API_URL=http://localhost:5000/api
```

### Step 2: Run the Application

```bash
npm start
```

Navigate to `http://localhost:3000/login`

### Step 3: Demo Login Users

Use any of these demo accounts:

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | admin123 | Admin |
| owner@example.com | owner123 | Company Owner |
| deal@example.com | deal123 | Deal Owner |
| pm@example.com | pm123 | Project Manager |
| client@example.com | client123 | Client |
| lead@example.com | lead123 | Lead |

---

## 💻 Frontend Implementation

### Using AuthContext

```jsx
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
  const { user, hasPermission, hasRole, canAccess } = useAuth();

  // Check if user has specific role
  if (!hasRole('Admin')) {
    return <div>Access Denied</div>;
  }

  // Check if user has permission for action
  if (!hasPermission('deals', 'create')) {
    return <div>Cannot create deals</div>;
  }

  // Check if can access module
  if (!canAccess('leads')) {
    return <div>No access to leads</div>;
  }

  return <div>Welcome {user.name}!</div>;
}
```

### Using ProtectedRoute

```jsx
import ProtectedRoute from './components/ProtectedRoute';

<Routes>
  {/* Protect by role */}
  <ProtectedRoute requiredRoles="Admin">
    <ManageUsersPage />
  </ProtectedRoute>

  {/* Protect by multiple roles */}
  <ProtectedRoute requiredRoles={['Admin', 'Company Owner']}>
    <CompanyManagementPage />
  </ProtectedRoute>

  {/* Protect by module access */}
  <ProtectedRoute requiredModules="deals">
    <DealsPage />
  </ProtectedRoute>
</Routes>
```

### Conditional UI Rendering

```jsx
import { useAuth } from '../hooks/useAuth';
import { isComponentVisible } from '../utils/roleBasedAccess';

function ListComponent() {
  const { user, hasPermission } = useAuth();

  return (
    <div>
      {isComponentVisible(user.role, 'createButton') && (
        <button>Create New Item</button>
      )}

      {isComponentVisible(user.role, 'deleteButton') && (
        <button>Delete Item</button>
      )}

      {hasPermission('deals', 'export') && (
        <button>Export</button>
      )}
    </div>
  );
}
```

### Sidebar Role-Based Visibility

The Sidebar component automatically shows/hides menu items based on user role:

```jsx
{isSidebarItemVisible(user?.role, 'reports') && (
  <MenuSection title="Reports" items={reportsItems} />
)}
```

**Visible Sections by Role:**

| Section | Admin | Owner | Deal Owner | PM | Client | Lead |
|---------|-------|-------|------------|-----|--------|------|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CRM | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Applications | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Reports | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| User Management | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Settings | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

---

## 🔒 Backend Implementation

### Using Authentication Middleware

```javascript
const { 
  requireAuth, 
  requireRole, 
  requirePermission, 
  checkPermission 
} = require('./middleware/authMiddleware');

// Protect all endpoints
app.use(requireAuth);

// Role-based access
app.delete('/api/users/:id', 
  requireRole('Admin'), 
  (req, res) => {
    // Only Admin can delete users
  }
);

// Permission-based access
app.post('/api/deals', 
  requirePermission('deals', 'create'), 
  (req, res) => {
    // Only users with deals.create permission
  }
);
```

### API Request Headers

All API requests must include:

```javascript
const headers = {
  'Content-Type': 'application/json',
  'X-User-ID': userId,
  'X-User-Role': userRole,
};

fetch('/api/deals', {
  headers,
  method: 'GET',
});
```

### Checking Permissions Manually

```javascript
const { checkPermission } = require('./middleware/authMiddleware');

const canCreate = checkPermission(userRole, 'deals', 'create');
if (!canCreate) {
  return res.status(403).json({ error: 'Permission denied' });
}
```

---

## 📋 Permission Matrix

### Module-Level Permissions

#### Admin Permissions
```javascript
{
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
}
```

#### Lead Permissions
```javascript
{
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
}
```

---

## 🔐 API Endpoint Protection Examples

### Protected Endpoints Pattern

```javascript
// DELETE /api/users/:id
// Requires: Admin role
app.delete('/api/users/:id', 
  requireAuth,
  requireRole('Admin'),
  async (req, res) => {
    // Delete user logic
  }
);

// POST /api/deals
// Requires: deals.create permission
app.post('/api/deals', 
  requireAuth,
  requirePermission('deals', 'create'),
  async (req, res) => {
    // Create deal logic
  }
);

// GET /api/contacts
// Requires: contacts.view permission
app.get('/api/contacts', 
  requireAuth,
  requirePermission('contacts', 'view'),
  async (req, res) => {
    // Get contacts logic
  }
);

// PUT /api/projects/:id
// Requires: Project Manager or Admin role
app.put('/api/projects/:id', 
  requireAuth,
  requireRole('Project Manager', 'Admin'),
  async (req, res) => {
    // Update project logic
  }
);
```

---

## 🎨 Component Examples

### Example 1: Conditional Button Display

```jsx
import { useAuth } from '../hooks/useAuth';

function DealsList() {
  const { hasPermission, user } = useAuth();

  return (
    <div>
      <h1>Deals</h1>
      
      {hasPermission('deals', 'create') && (
        <button className="btn-primary">Create Deal</button>
      )}

      <table>
        <tbody>
          {deals.map(deal => (
            <tr key={deal.id}>
              <td>{deal.name}</td>
              <td>{deal.value}</td>
              <td>
                {hasPermission('deals', 'edit') && (
                  <button>Edit</button>
                )}
                {hasPermission('deals', 'delete') && (
                  <button className="text-red ">Delete</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Example 2: Role-Based Page Access

```jsx
import ProtectedRoute from './ProtectedRoute';

function Routes() {
  return (
    <Routes>
      {/* Admin only */}
      <ProtectedRoute requiredRoles="Admin">
        <ManageUsersPage />
      </ProtectedRoute>

      {/* Admin or Company Owner */}
      <ProtectedRoute requiredRoles={['Admin', 'Company Owner']}>
        <CompanySettingsPage />
      </ProtectedRoute>

      {/* Anyone who can access deals */}
      <ProtectedRoute requiredModules="deals">
        <DealsPage />
      </ProtectedRoute>
    </Routes>
  );
}
```

### Example 3: Custom Permission Check

```jsx
function ProjectDetails({ projectId }) {
  const { hasRole, hasPermission, user } = useAuth();
  const [project, setProject] = useState(null);

  const canEditProject = 
    hasRole('Admin') || 
    (hasRole('Project Manager') && hasPermission('projects', 'edit'));

  const canManageTeam = 
    hasRole('Admin') || 
    (hasRole('Project Manager') && hasPermission('projects', 'manage_team'));

  return (
    <div>
      <h1>{project?.name}</h1>
      
      {canEditProject && (
        <button>Edit Project</button>
      )}

      {canManageTeam && (
        <div>
          <h2>Team Members</h2>
          <button>Add Team Member</button>
        </div>
      )}

      {hasPermission('projects', 'view') && (
        <div>
          <h2>Project Details</h2>
          {/* Show details */}
        </div>
      )}
    </div>
  );
}
```

---

## 🔄 Updating User Roles

### Backend: Update User Role in Database

```javascript
const connection = await pool.getConnection();

await connection.query(
  'UPDATE users SET role_id = ? WHERE id = ?',
  [newRoleId, userId]
);

// Get role name
const [user] = await connection.query(
  'SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
  [userId]
);
```

### Frontend: Dynamic Role Update

```jsx
async function updateUserRole(userId, newRole) {
  try {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': currentUserId,
        'X-User-Role': currentUserRole,
      },
      body: JSON.stringify({ role: newRole }),
    });

    if (response.ok) {
      // User role updated successfully
      // User may need to refresh to see new permissions
    }
  } catch (error) {
    console.error('Failed to update user role:', error);
  }
}
```

---

## 📊 Permission Check Utilities

### Available Utility Functions

```javascript
import {
  getVisibility,
  isSidebarItemVisible,
  isComponentVisible,
  isModuleAccessible,
  getVisibleModules,
  getVisibleSidebarSections,
} from '../utils/roleBasedAccess';

// Get specific visibility
const canSeeCreateButton = getVisibility('Admin', 'components', 'createButton');

// Check sidebar item visibility
const showReports = isSidebarItemVisible('Admin', 'reports');

// Check component visibility
const showDeleteBtn = isComponentVisible('Lead', 'deleteButton');

// Check module accessibility
const canAccessDeals = isModuleAccessible('Company Owner', 'Deals');

// Get list of visible modules for a role
const modules = getVisibleModules('Project Manager');
// Returns: ['Dashboard', 'Contacts', 'Companies', 'Deals', 'Projects', 'Tasks', ...]

// Get visible sidebar sections
const sections = getVisibleSidebarSections('Client');
// Returns: ['dashboard']
```

---

## ⚠️ Security Best Practices

### DO ✅
- Always validate permissions on backend
- Use secure authentication tokens (JWT in production)
- Log all permission-based access for audit trails
- Implement role-based rate limiting
- Clear sensitive data on logout
- Use HTTPS in production
- Validate role and permissions on every API call

### DON'T ❌
- Don't trust frontend-only permission checks
- Don't expose sensitive data in local storage
- Don't hardcode credentials in frontend
- Don't skip backend validation
- Don't cache permissions indefinitely
- Don't allow role elevation without approval
- Don't expose user roles in error messages

### Example: Secure Implementation

```javascript
// ✅ GOOD: Validate on backend
app.delete('/api/users/:id',
  requireAuth,
  requireRole('Admin'),
  async (req, res) => {
    // Backend validates role
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // Delete user
  }
);

// ❌ BAD: Only frontend validation
function DeleteButton() {
  if (localStorage.getItem('userRole') === 'Admin') {
    // Sends delete request anyway!
    return <button onClick={deleteUser}>Delete</button>;
  }
}
```

---

## 🧪 Testing Roles

### Test Checklist

- [ ] Login with each role
- [ ] Verify sidebar shows correct sections
- [ ] Check all buttons display/hide correctly
- [ ] Test route access restrictions
- [ ] Verify API permissions work
- [ ] Check modal/form visibility
- [ ] Test permission checks on API calls
- [ ] Verify role-based reports

### Test Scenarios

```javascript
// Test Admin Role
// ✓ Can access all modules
// ✓ Can create, edit, delete everything
// ✓ Can manage users and roles
// ✓ Can export data

// Test Lead Role
// ✓ Can create leads and deals
// ✓ Cannot delete anything
// ✓ Cannot access finance modules
// ✓ Cannot manage other users

// Test Client Role
// ✓ Can only view data
// ✓ Cannot create anything
// ✓ Limited sidebar visibility
// ✓ No access to internal activities
```

---

## 🚨 Common Issues & Solutions

### Issue: User sees empty sidebar
**Solution**: Check if role is properly set in AuthContext. Verify role name matches exactly (case-sensitive).

### Issue: Cannot access protected route
**Solution**: Verify user is logged in. Check `requiredRoles` and `requiredModules` match user permissions.

### Issue: API calls return 403
**Solution**: Ensure headers include `X-User-ID` and `X-User-Role`. Verify permissions in authMiddleware for that endpoint.

### Issue: Buttons not hiding
**Solution**: Use `isComponentVisible()` or `hasPermission()` instead of just checking role. Verify component name matches exactly.

### Issue: Role changes not reflected
**Solution**: Clear localStorage and re-login. Or refresh the page after role update.

---

## 📚 File Reference Guide

### AuthContext.js
- **Location**: `client/src/context/AuthContext.js`
- **Purpose**: Provides user state and permission checking
- **Exports**: `AuthContext`, `AuthProvider`
- **Key Methods**: `hasPermission()`, `hasRole()`, `canAccess()`, `getRolePermissions()`

### useAuth.js
- **Location**: `client/src/hooks/useAuth.js`
- **Purpose**: Custom hook to use AuthContext
- **Usage**: `const { user, hasPermission } = useAuth();`

### roleBasedAccess.js
- **Location**: `client/src/utils/roleBasedAccess.js`
- **Purpose**: UI visibility utilities for components and sidebar
- **Key Functions**: `getVisibility()`, `isComponentVisible()`, `isModuleAccessible()`

### ProtectedRoute.js
- **Location**: `client/src/components/ProtectedRoute.js`
- **Purpose**: Wrapper component to protect routes
- **Props**: `requiredRoles`, `requiredModules`, `fallback`

### LoginPage.js
- **Location**: `client/src/components/LoginPage.js`
- **Purpose**: Login interface with demo users
- **Demo Users**: 6 role-based demo accounts

### authMiddleware.js
- **Location**: `server/middleware/authMiddleware.js`
- **Purpose**: Backend authentication and authorization
- **Exports**: `requireAuth`, `requireRole`, `requirePermission`, `checkPermission`

---

## 🎓 Summary

**You now have:**
- ✅ 6 fully defined roles with specific permissions
- ✅ Frontend authentication context and hooks
- ✅ Route protection with ProtectedRoute component
- ✅ Utility functions for UI visibility
- ✅ Backend middleware for API protection
- ✅ Login page with demo users
- ✅ Role-based sidebar menu
- ✅ Complete implementation guide

**Next Steps:**
1. Integrate with your user database
2. Implement real JWT authentication
3. Add user role management interface
4. Set up audit logging
5. Deploy to production

---

## 📞 Support

For questions about implementation, refer to:
- `ROLE_UI_ACCESS_MATRIX.md` - Detailed role access details
- `ROLE_BASED_AUTH_ANALYSIS.md` - Initial analysis document
- Component source files for code examples

