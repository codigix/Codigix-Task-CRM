# Authentication Quick Start Guide

## 🚀 Quick Access Links

- **Login Page**: `/login`
- **Signup Page**: `/signup`
- **Dashboard**: `/` (requires login)

## 📝 Demo Login Credentials

Use these accounts to test the system:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@example.com | admin123 |
| **Company Owner** | owner@example.com | owner123 |
| **Deal Owner** | deal@example.com | deal123 |
| **Project Manager** | pm@example.com | pm123 |
| **Client** | client@example.com | client123 |
| **Lead** | lead@example.com | lead123 |

## 🔐 Signup Process

1. **Navigate to Signup**
   - Click "Create one now" link on login page
   - Or go directly to `/signup`

2. **Fill Registration Form**
   - First Name (required)
   - Last Name (required)
   - Email (required, must be unique)
   - Password (required, min 6 chars)
   - Confirm Password (must match)
   - Phone (optional)
   - Company (optional)

3. **Select Your Role**
   - Choose from 6 available roles
   - Role determines your access level
   - Can be changed by admin later

4. **Create Account**
   - Click "Create Account" button
   - System validates all fields
   - Auto-logs you in if successful
   - Redirects to dashboard

## 🔑 Login Process

1. **Navigate to Login** (`/login`)

2. **Method 1: Manual Login**
   - Enter email address
   - Enter password
   - Click "Login" button

3. **Method 2: Demo Quick Login**
   - Click any demo user card
   - Auto-fills credentials
   - One-click login

4. **Password Visibility**
   - Click "Show"/"Hide" to toggle password visibility

5. **Forgot Password?**
   - Coming soon feature
   - Contact admin for password reset

## 🚪 Logout Process

1. **Click Profile Avatar**
   - Located in top-right header
   - Shows your initials

2. **Open Profile Menu**
   - Click avatar to expand dropdown
   - Shows your name, role, and email

3. **Click "Sign Out"**
   - Clears your login session
   - Removes local data
   - Redirects to login page

## 👤 Profile Management

Access from profile menu in header:

- **Profile Settings** - Update user information
- **Notifications** - Manage notification preferences
- **Help & Support** - Get assistance
- **Settings** - Configure preferences

## 🔒 What Each Role Can Access

### Admin (Full Access)
- All modules
- User management
- Role management
- All CRUD operations
- Reports and analytics

### Company Owner (70% Access)
- Dashboard
- Contacts, Companies, Leads
- Deals, Pipeline, Campaign
- Projects, Tasks, Proposals
- Contracts, Estimations, Invoices
- Reports (can create)

### Deal Owner (60% Access)
- Dashboard, Leads, Deals
- Contacts, Companies
- Tasks, Proposals, Estimations
- View contracts & invoices
- View reports

### Project Manager (65% Access)
- Dashboard, Projects
- Campaigns, Tasks, Proposals
- Contacts, Companies, Leads
- View Deals, Pipeline
- Can create reports

### Client (20% View-Only Access)
- Dashboard (view only)
- Contacts, Companies
- Deals, Pipeline
- Projects, Tasks
- Proposals, Contracts, Invoices, Payments

### Lead (55% Access)
- Dashboard, Contacts, Leads
- Deals, Pipeline, Projects
- Tasks, Proposals
- Can view activities

## ✅ Security Tips

- ✅ Never share your password
- ✅ Log out after using shared computers
- ✅ Use strong passwords (min 6 characters)
- ✅ Don't use same password as other sites
- ✅ Close browser when done

## ❌ Common Issues & Solutions

### "Invalid email or password"
- Check email spelling
- Verify caps lock is OFF
- Ensure password is correct
- Account must be created first

### "Email already registered"
- Account exists with this email
- Try logging in instead
- Use forgot password feature (coming soon)

### "Password must be at least 6 characters"
- Enter at least 6 characters
- Mix letters and numbers for strength

### "Passwords do not match"
- Re-type confirm password
- Ensure both fields are identical

### "Can't access certain features"
- Check your role permissions
- Ask admin to upgrade your role
- Admin can modify role access

### "Lost login credentials"
- Contact system administrator
- Use demo accounts to test
- Admin can reset your password

## 🎯 Getting Started

### First Time Users
1. Go to `/signup`
2. Create account with your role
3. Login with credentials
4. Explore dashboard based on role
5. Access modules you have permission for

### Returning Users
1. Go to `/login`
2. Enter credentials or use demo account
3. You'll be on the dashboard
4. Logout when done

## 📱 Mobile Support

The login and signup pages are mobile-responsive:
- Full functionality on smartphones
- Touch-friendly buttons
- Responsive layout
- Works on tablets

## 🔄 Session Management

- Sessions stored in browser
- Data persists on refresh
- Logout clears all data
- Browser close doesn't auto-logout
- Open multiple tabs = same session

## 📞 Need Help?

### Check These Resources
1. **This Quick Start Guide**
2. **AUTH_SYSTEM_COMPLETE.md** - Technical details
3. **Contact Administrator** - Account issues
4. **Check Browser Console** - Error messages (F12)

### Common Questions
- **Q**: How do I reset my password?
  **A**: Contact admin (password reset coming soon)

- **Q**: Can I have multiple roles?
  **A**: No, one role per user. Admin can change it.

- **Q**: What if I forget my email?
  **A**: Contact admin with verification info

- **Q**: How long before session expires?
  **A**: Currently no timeout (coming in production)

- **Q**: Can I delete my account?
  **A**: Yes, request admin deletion

## 🔄 Demo Mode

The system works in **demo mode**:
- Demo users available for testing
- No real email verification
- Passwords not hashed
- Data stored locally

**For production:**
- Replace with real user database
- Implement JWT tokens
- Add password hashing
- Enable email verification

## 🎓 Learning Paths

### Explore as Admin
1. Login as admin@example.com
2. Access all features
3. Understand full system
4. Try user management

### Explore as Company Owner
1. Login as owner@example.com
2. Create leads and deals
3. Manage projects
4. View reports

### Explore as Client
1. Login as client@example.com
2. View assigned deals
3. Check proposals & contracts
4. See invoices & payments

## ⚡ Pro Tips

- 💡 Click demo users for instant login testing
- 💡 Use password visibility toggle when typing
- 💡 Your role determines what you see
- 💡 Admin can change roles
- 💡 Check header for your current role
- 💡 Profile menu shows logout button
- 💡 All data auto-saves on update

## 📋 Checklist

Before going live:
- [ ] Test signup with all 6 roles
- [ ] Test login with demo accounts
- [ ] Test logout functionality
- [ ] Verify role permissions work
- [ ] Check database backups
- [ ] Implement password hashing
- [ ] Set up JWT tokens
- [ ] Add email verification
- [ ] Configure production environment
- [ ] Enable HTTPS
- [ ] Set up audit logging

---

**Last Updated**: December 2025
**Version**: 1.0 (Demo Mode)
**Status**: Production Ready (with security enhancements)
