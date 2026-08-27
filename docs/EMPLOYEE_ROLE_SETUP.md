# Employee Role Setup Instructions

## ✅ Completed Implementations

### 1. Backend Configuration
- ✅ Added to default roles in `server.js` 
- ✅ Added to role mapping in `server.js`
- ✅ Employee role ID: 7

### 2. Frontend Role Configuration
- ✅ Added to `AuthContext.js` permissions
- ✅ Added to `roleBasedAccess.js` UI visibility
- ✅ Added to `SignupPage.js` role selection
- ✅ Added to `RolesPermissionsPage.js`

---

## 📋 Manual Setup Required

### Option 1: Using the Insert Script (Recommended)

Run this command in your terminal:

```bash
cd c:\All_IN_One\deals-dashboard\server
node insert-employee-demo.js
```

This will:
- ✅ Ensure Employee role exists in database
- ✅ Create demo user: `employee@example.com` / `employee123`
- ✅ Assign Employee role to demo user

### Option 2: Manual Database Insert

Connect to your database and run:

```sql
# Add Employee role if not exists
INSERT INTO roles (name) VALUES ('Employee')
ON DUPLICATE KEY UPDATE name = 'Employee';

# Add demo Employee user
INSERT INTO users (first_name, last_name, username, email, password, role_id, status)
VALUES ('Employee', 'Demo', 'employee', 'employee@example.com', 'employee123', 7, 'Active');
```

### Option 3: Via Signup Page

1. Go to **Signup Page** (`http://localhost:3000/signup`)
2. Fill in details:
   - First Name: `Employee`
   - Last Name: `Demo`
   - Email: `employee@example.com`
   - Password: `employee123`
3. Select **Employee** from role dropdown
4. Click **Create Account**

---

## 🔐 Test the Employee Role

### Demo Login Credentials
```
Role:     Employee
Email:    employee@example.com
Password: employee123
```

### Test in Login Page
1. Go to **Login** page (`http://localhost:3000/login`)
2. Click on **Employee** demo account button
3. System will auto-login as Employee

### Verify UI Changes
After logging in as Employee, you should see:

**✅ Visible:**
- Dashboard section
- CRM section with: Contacts, Companies, Deals, Pipelines, Projects, Tasks, Proposals, Contracts, Estimations, Invoices, Payments, Activities

**❌ Hidden:**
- Applications
- Reports
- User Management
- Settings

**Button Visibility:**
- ✅ View buttons enabled
- ✅ Edit buttons enabled (can edit records)
- ❌ Create button hidden
- ❌ Delete button hidden
- ❌ Export button hidden

---

## 👥 Add Employee User in Manage Users

Once the Employee role exists, you can create employees in two ways:

### Method 1: Manage Users Page
1. Go to **Manage Users** page
2. Click **"Add New User"** button
3. Fill form:
   - First Name: `[Employee Name]`
   - Username: `[Username]`
   - Email: `[Email]`
   - Password: `[Password]`
   - **Role: Select "Employee"** ← (From dropdown)
4. Click **Create User**

The role dropdown will show all roles from database, including "Employee".

### Method 2: Programmatically
Use the API endpoint to create users:

```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "username": "johndoe",
    "email": "john.doe@company.com",
    "password": "securepass123",
    "role_id": 7,
    "phone1": "+1234567890",
    "location": "New York",
    "status": "Active"
  }'
```

---

## 🔍 Verify Employee Role in RolesPermissionsPage

1. Go to **Roles & Permissions** page (Admin only)
2. Search for "Employee"
3. Should see:
   - **Role Name**: Employee
   - **Created**: 08 Dec 2025, 04:03 pm (or current date)
   - **Actions**: Edit, Permission, Delete buttons

---

## 📊 Role-Based Features for Employee

### Permissions Summary
| Module | View | Edit | Create | Delete | Export |
|--------|------|------|--------|--------|--------|
| Dashboard | ✅ | - | - | - | - |
| Contacts | ✅ | ✅ | ❌ | ❌ | ❌ |
| Companies | ✅ | ❌ | ❌ | ❌ | ❌ |
| Deals | ✅ | ✅ | ❌ | ❌ | ❌ |
| Pipelines | ✅ | ❌ | ❌ | ❌ | ❌ |
| Projects | ✅ | ❌ | ❌ | ❌ | ❌ |
| Tasks | ✅ | ✅ | ✅ | ❌ | ❌ |
| Proposals | ✅ | ❌ | ❌ | ❌ | ❌ |
| Contracts | ✅ | ❌ | ❌ | ❌ | ❌ |
| Estimations | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invoices | ✅ | ❌ | ❌ | ❌ | ❌ |
| Payments | ✅ | ❌ | ❌ | ❌ | ❌ |
| Activities | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🛠️ Troubleshooting

### Issue: Employee role not appearing in Manage Users dropdown

**Solution:**
1. Ensure script was run: `node insert-employee-demo.js`
2. Check database: `SELECT * FROM roles WHERE name = 'Employee';`
3. Restart backend server
4. Refresh page

### Issue: Employee not showing in Roles & Permissions

**Solution:**
1. Check if role was inserted: `SELECT id, name FROM roles;`
2. If not present, run insert script
3. Clear browser cache
4. Refresh page

### Issue: Employee user cannot login

**Solution:**
1. Verify user exists: `SELECT * FROM users WHERE email = 'employee@example.com';`
2. Check role_id is 7: `SELECT u.*, r.name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = 'employee@example.com';`
3. If not, create user using Manage Users or signup page

---

## 📝 Code Changes Summary

### Files Modified:
1. **AuthContext.js** - Added ROLE_PERMISSIONS for Employee
2. **roleBasedAccess.js** - Added ROLE_UI_VISIBILITY for Employee  
3. **SignupPage.js** - Added Employee to ROLES array
4. **RolesPermissionsPage.js** - Added Employee to dummyRolesData
5. **server.js** - Added Employee to defaultRoles and roleMapping

### Files Created:
1. **insert-employee-demo.js** - Setup script for Employee role and demo user

### Files Pending Update (Manual):
1. **LoginPage.js** - Add Employee to DEMO_USERS array
   - Need to add: `{ email: 'employee@example.com', password: 'employee123', role: 'Employee' }`

---

## ✨ Employee Role Benefits

✅ **For Operations Team:**
- Can view and edit ongoing deals
- Can create and manage tasks
- Can edit contact information
- Cannot accidentally delete important records
- Cannot export sensitive data

✅ **For Support Staff:**
- Full visibility into customer data
- Can update contact details
- Can mark tasks as complete
- Safe access without admin rights

✅ **For Management:**
- Monitor employee activities
- Ensure data integrity with limited permissions
- Prevent accidental deletions
- Control who can create new records

---

## 🚀 Next Steps

1. Run: `node insert-employee-demo.js`
2. Login as Employee: `employee@example.com` / `employee123`
3. Create more Employee users in Manage Users page
4. Assign Employee users to teams and projects
5. Monitor activities in Activity Log

Done! 🎉
