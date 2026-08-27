# Complete Authentication System: Login, Signup & Logout

## Overview
Fully implemented role-based authentication system with complete signup, login, and logout flow integrated with 6 roles (Admin, Company Owner, Deal Owner, Project Manager, Client, Lead).

## Architecture

### Frontend Components

#### 1. **LoginPage.js** (`client/src/components/LoginPage.js`)
- Email/password login form
- Demo user quick access (6 roles)
- Link to signup page
- Password visibility toggle
- Backend API integration
- Error handling and loading states

**Features:**
- Real-time validation
- Demo login bypass for testing
- Responsive design
- Auto-redirect to dashboard if authenticated

#### 2. **SignupPage.js** (`client/src/components/SignupPage.js`)
- Complete registration form
- Role selection grid (6 roles)
- Password confirmation validation
- Optional fields (phone, company)
- Real-time password matching indicator
- Full form validation

**Features:**
- First name, last name, email, password fields
- Phone and company optional fields
- 6 role options with visual selection
- Password strength validation
- Duplicate email detection
- Auto-login on successful signup

#### 3. **AuthContext.js** (`client/src/context/AuthContext.js`)
- Centralized auth state management
- User info storage in localStorage
- Permission checking helpers
- Role validation methods
- Logout functionality

**Key Functions:**
```javascript
login(userData)           // Set authenticated user
logout()                  // Clear user & redirect
hasPermission(module, action)  // Check specific permission
hasRole(role)            // Check user role
canAccess(modules)       // Check module access
```

#### 4. **Header.js** (Updated - `client/src/components/Header.js`)
- Displays logged-in user info
- Shows user avatar with initials
- Profile menu with logout button
- Integrates with AuthContext for logout
- User name and role display

**Logout Implementation:**
```javascript
<button onClick={() => {
  logout();
  navigate('/login');
}}>
  Sign Out
</button>
```

#### 5. **App.js** (Updated - `client/src/App.js`)
- Added `/signup` route
- Routes protected with AuthProvider
- Login/Signup pages accessible without authentication

**Routes:**
```javascript
/login   → LoginPage
/signup  → SignupPage
/*       → Protected routes (require authentication)
```

### Backend Routes

#### **POST /api/auth/login** (`server/server.js` - Lines 590-635)
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "email": "user@example.com",
  "avatar": "https://...",
  "role_name": "Admin"
}
```

**Error Responses:**
- `400` - Missing email or password
- `401` - Invalid credentials
- `500` - Server error

**Implementation Details:**
- Validates email and password
- Queries users table with role JOIN
- Direct password comparison (for demo)
- Returns user data with role_name

#### **POST /api/auth/signup** (`server/server.js` - Lines 637-702)
**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "role_name": "Lead",
  "phone": "+1 555-1234",
  "company": "Acme Corp"
}
```

**Response (201):**
```json
{
  "id": 2,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "avatar": null,
  "role_name": "Lead"
}
```

**Error Responses:**
- `400` - Missing required fields or email already registered
- `500` - Server error

**Implementation Details:**
- Validates all required fields
- Checks for duplicate email
- Maps role names to role IDs (1-6)
- Creates username from email
- Sets user status as Active
- Inserts into users table with role_id

### Role Mapping
```javascript
{
  'Admin': 1,
  'Company Owner': 2,
  'Deal Owner': 3,
  'Project Manager': 4,
  'Client': 5,
  'Lead': 6
}
```

## User Flow

### 1. Signup Flow
```
SignupPage → Form Validation → POST /api/auth/signup
  ↓
User Created → Auto Login → AuthContext.login() → Redirect to Dashboard
```

### 2. Login Flow
```
LoginPage → Email/Password Input → POST /api/auth/login
  ↓
User Found & Password Match → AuthContext.login() → Redirect to Dashboard
```

### 3. Logout Flow
```
Header (Profile Menu) → Click "Sign Out"
  ↓
AuthContext.logout() → Clear localStorage → Navigate to /login
```

## State Management

### LocalStorage Structure
```javascript
{
  "currentUser": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "Admin",
    "avatar": "https://..."
  }
}
```

### AuthContext Values
```javascript
{
  user: { id, email, name, role, avatar },
  loading: boolean,
  isAuthenticated: boolean,
  login: (userData) => {},
  logout: () => {},
  hasPermission: (module, action) => boolean,
  hasRole: (role) => boolean,
  canAccess: (modules) => boolean,
  getRolePermissions: (role) => {}
}
```

## Testing the System

### Test Accounts (Demo Mode)
```
Admin:            admin@example.com / admin123
Company Owner:    owner@example.com / owner123
Deal Owner:       deal@example.com / deal123
Project Manager:  pm@example.com / pm123
Client:           client@example.com / client123
Lead:             lead@example.com / lead123
```

### Test Signup
1. Navigate to `/signup`
2. Fill all required fields
3. Select a role
4. Confirm password match
5. Click "Create Account"
6. Should auto-login and redirect to dashboard

### Test Login
1. Navigate to `/login`
2. Enter credentials
3. Click "Login" or select demo user
4. Should redirect to dashboard with role-specific access

### Test Logout
1. Click profile avatar in header
2. Click "Sign Out"
3. Should redirect to login page
4. LocalStorage should be cleared

## Security Notes

### Current Implementation (Demo)
- ⚠️ Passwords stored as plain text
- ⚠️ No JWT tokens
- ⚠️ No HTTPS requirement
- ⚠️ No rate limiting

### Production Recommendations
1. **Password Hashing**
   - Use bcrypt for password hashing
   - Never store plain text passwords

2. **JWT Implementation**
   ```javascript
   // On login
   const token = jwt.sign(
     { userId: user.id, role: user.role },
     process.env.JWT_SECRET,
     { expiresIn: '24h' }
   );
   
   // Return token to client
   res.json({ user, token });
   ```

3. **Token Storage**
   - Store JWT in httpOnly cookie (most secure)
   - Or localStorage with CSRF protection
   - Never store in regular cookies for XSS protection

4. **Request Authentication**
   ```javascript
   // Middleware to verify JWT
   app.use('/api', (req, res, next) => {
     const token = req.headers.authorization?.split(' ')[1];
     if (!token) return res.status(401).json({ error: 'No token' });
     
     try {
       const decoded = jwt.verify(token, process.env.JWT_SECRET);
       req.userId = decoded.userId;
       next();
     } catch {
       res.status(401).json({ error: 'Invalid token' });
     }
   });
   ```

5. **Rate Limiting**
   - Limit login attempts (e.g., 5 per minute)
   - Use packages like `express-rate-limit`

6. **CORS & Security Headers**
   - Set strict CORS origin
   - Add security headers (helmet.js)
   - Implement CSRF tokens for POST requests

## File References

### Frontend Files Modified/Created
- ✅ `client/src/components/SignupPage.js` - NEW
- ✅ `client/src/components/LoginPage.js` - Updated
- ✅ `client/src/components/Header.js` - Updated
- ✅ `client/src/context/AuthContext.js` - Existing
- ✅ `client/src/App.js` - Updated

### Backend Files Modified/Created
- ✅ `server/server.js` - Added auth routes (Lines 590-702)

### Existing Files
- `client/src/hooks/useAuth.js` - Custom hook for useAuth
- `server/middleware/authMiddleware.js` - Auth middleware

## Integration Checklist

### Setup
- [ ] Test signup with all 6 roles
- [ ] Test login with test accounts
- [ ] Test logout functionality
- [ ] Verify role-based permissions work
- [ ] Check localStorage clearing on logout
- [ ] Test auto-redirect when authenticated

### Database
- [ ] Ensure roles table populated with 6 roles
- [ ] Verify users table has role_id column
- [ ] Test direct password login
- [ ] Confirm email uniqueness constraint

### Frontend
- [ ] SignupPage displays all 6 roles
- [ ] Login/Signup link visible on pages
- [ ] Logout button visible in header
- [ ] User info displays in profile menu
- [ ] Protected routes redirect to login

### Backend
- [ ] Auth endpoints respond correctly
- [ ] Email validation on signup
- [ ] Duplicate email detection works
- [ ] Role mapping correct (1-6)
- [ ] Error messages clear and helpful

## Environment Variables

### .env files
```
REACT_APP_API_URL=http://localhost:5000/api

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=deals_db
```

## Next Steps for Production

1. **Implement JWT tokens** instead of demo auth
2. **Add password hashing** with bcrypt
3. **Set up email verification** for new accounts
4. **Implement password reset** flow
5. **Add 2FA (Two-Factor Authentication)**
6. **Set up audit logging** for auth events
7. **Implement session management**
8. **Add CORS restrictions**
9. **Enable HTTPS/SSL**
10. **Add rate limiting** for auth endpoints
11. **Implement refresh tokens**
12. **Add OAuth/SSO integration** if needed

## Support

For issues or questions:
1. Check browser console for errors
2. Check server logs in api.log
3. Verify database connection
4. Ensure all 6 roles exist in roles table
5. Check environment variables are set correctly
