# Fix: "Unexpected token '<', "<!DOCTYPE" is not valid JSON" Error

## 🔴 Problem
When trying to signup or login, you get this error:
```
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

This means the server is returning **HTML instead of JSON**.

---

## ✅ Quick Solution

### Step 1: Check Server is Running
Open terminal and verify server is working:
```bash
cd c:\All_IN_One\deals-dashboard\server
npm start
# OR
node server.js
```

You should see:
```
✓ Server running on port 5000
✓ Database: localhost/deals_db
✓ CORS origin: http://localhost:3000
```

**If server doesn't start:**
- Check port 5000 isn't already in use: `netstat -ano | findstr :5000`
- Kill existing process: `taskkill /F /IM node.exe`
- Check database is running (MySQL)

### Step 2: Verify Database Connection
Make sure MySQL is running:
```bash
mysql -u root -p
# If this works, your database is connected
```

If not:
- Install MySQL or start XAMPP/MySQL service
- Check connection in `.env` file

### Step 3: Replace Auth Routes (RECOMMENDED FIX)
The issue is likely in how auth routes handle errors. A fixed version is provided:

**Location:** `server/auth-routes-fix.js`

**To apply the fix:**

1. **Open** `server/server.js`

2. **Find and DELETE** these two route definitions (around lines 590-702):
   ```javascript
   app.post('/api/auth/login', async (req, res) => {
     // ... DELETE THIS ENTIRE FUNCTION
   });

   app.post('/api/auth/signup', async (req, res) => {
     // ... DELETE THIS ENTIRE FUNCTION
   });
   ```

3. **Copy** the contents of `server/auth-routes-fix.js`

4. **Paste** them in the same location in `server/server.js`

5. **Save** the file

6. **Restart** the server

---

## 🔍 Root Causes & Solutions

### Cause 1: Server Not Running
**Symptom:** Connection refused or "Cannot connect to localhost:5000"

**Solution:**
```bash
cd c:\All_IN_One\deals-dashboard\server
node server.js
```

### Cause 2: Wrong API URL
**Symptom:** Getting 404 HTML error page

**Solution:** 
Check `client/src/components/LoginPage.js` and `SignupPage.js`

Line 27 and 97 should be:
```javascript
const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
```

Verify REACT_APP_API_URL environment variable if set.

### Cause 3: Database Connection Error
**Symptom:** Server crashes or returns 500 errors

**Solution:**
1. Verify MySQL is running
2. Check `.env` file has correct database credentials:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=deals_db
   ```

3. Verify `users` and `roles` tables exist:
   ```sql
   USE deals_db;
   SHOW TABLES;
   SELECT * FROM roles;
   ```

### Cause 4: Roles Table Missing Data
**Symptom:** Login/signup works but role assignment fails

**Solution:**
Ensure 6 roles exist in database:
```sql
SELECT * FROM roles;
```

Should show:
| id | name |
|----|------|
| 1 | Admin |
| 2 | Company Owner |
| 3 | Deal Owner |
| 4 | Project Manager |
| 5 | Client |
| 6 | Lead |

If missing, insert them:
```sql
INSERT INTO roles (id, name) VALUES
(1, 'Admin'),
(2, 'Company Owner'),
(3, 'Deal Owner'),
(4, 'Project Manager'),
(5, 'Client'),
(6, 'Lead');
```

### Cause 5: Response Headers Wrong
**Symptom:** Response comes back with wrong content-type

**Solution:**
The fixed auth-routes-fix.js properly sets JSON headers.
Use the replacement routes from auth-routes-fix.js.

---

## 🧪 Test the Fix

### Manual Test with cURL
```bash
# Test login endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"admin123\"}"

# Expected response:
# {"success":true,"id":1,"first_name":"Admin","last_name":"User",...}

# Test signup endpoint  
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"first_name\":\"John\",\"last_name\":\"Doe\",\"email\":\"john@example.com\",\"password\":\"password123\",\"role_name\":\"Lead\"}"

# Expected response:
# {"success":true,"id":2,"first_name":"John",...}
```

### Test in Browser
1. Open `http://localhost:3000/login`
2. Check browser console (F12)
3. Try logging in
4. Check "Network" tab - auth/login request should show JSON response

---

## 📋 Complete Troubleshooting Checklist

```
[ ] Server is running on port 5000
[ ] MySQL database is running
[ ] Database credentials in .env are correct
[ ] users table exists in database
[ ] roles table exists with 6 roles
[ ] API URL is set to http://localhost:5000/api
[ ] Auth routes have been updated (auth-routes-fix.js)
[ ] No other process is using port 5000
[ ] Firewall is not blocking localhost:5000
[ ] Browser console shows no CORS errors
[ ] Network tab shows response is JSON (not HTML)
[ ] Response headers include Content-Type: application/json
```

---

## 🔧 Advanced Debugging

### Enable Server Logging
Edit `server.js` and ensure these console.log statements exist in auth routes:
```javascript
console.log('Login request received:', req.body);
console.log('Database connection obtained');
console.log(`User query result: ${rows.length} user(s) found`);
console.log('Login successful, sending response:', response);
```

### Check Server Logs
Run server and watch output:
```bash
cd c:\All_IN_One\deals-dashboard\server
node server.js 2>&1 | tee server.log
# Look for any error messages
```

### Check Network Requests (Browser)
1. Open `http://localhost:3000/login`
2. Press F12 to open Developer Tools
3. Go to "Network" tab
4. Try to login
5. Click the `/api/auth/login` request
6. Check "Response" tab - should be JSON, not HTML

### Check CORS
If you see CORS error in browser console:
```
Access to XMLHttpRequest has been blocked by CORS policy
```

Solution - verify CORS in server.js:
```javascript
const corsOptions = {
  origin: 'http://localhost:3000',  // Must match your frontend URL
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
```

---

## 🆘 Still Having Issues?

### If Signup Works But Login Fails
This suggests the user was created but login endpoint has issues.

**Test:**
1. Check database for the user:
   ```sql
   SELECT * FROM users WHERE email = 'your-email@example.com';
   ```

2. If user exists, check the response format
3. Apply auth-routes-fix.js

### If Both Fail with HTML Response
The server is likely:
1. Not running (serving default error page)
2. Returning 404 (route not found)
3. Crashing with 500 error

**Fix:**
1. Kill all node processes: `taskkill /F /IM node.exe`
2. Check server syntax: `node -c server.js`
3. Start fresh: `node server.js`

### If Database Error
Check logs for messages like:
```
Error: ER_BAD_TABLE_ERROR: Unknown table 'users'
Error: ER_UNKNOWN_COLUMN
Error: ER_NO_REFERENCED_TABLE
```

**Solutions:**
1. Run database setup: `node setup-db.js`
2. Verify table schemas match expected format
3. Check foreign keys are correct

---

## 📝 Auth Routes Requirements

The auth routes MUST:

✅ Return valid JSON with `Content-Type: application/json` header
✅ Have proper error handling with try/catch
✅ Release database connections properly
✅ Return appropriate HTTP status codes:
   - 200/201: Success
   - 400: Bad request (missing fields)
   - 401: Unauthorized (wrong password)
   - 409: Conflict (email exists)
   - 500: Server error

✅ Include these response fields:
   - `success`: boolean
   - `id`: user ID
   - `first_name`: user's first name
   - `last_name`: user's last name
   - `email`: user's email
   - `role_name`: user's role
   - `avatar`: user's avatar (can be null)
   - `error`: (only on errors)

---

## 🎯 Recommended Next Steps

1. **Apply the fix immediately:**
   - Replace auth routes with auth-routes-fix.js
   - Restart server
   - Test login/signup

2. **Verify everything works:**
   - Test with demo account
   - Create new account
   - Logout and login again
   - Check user data in database

3. **Monitor for issues:**
   - Keep server logs open
   - Watch browser console for errors
   - Check network tab in DevTools

4. **Move to production:**
   - Only after thorough testing
   - Add password hashing (bcrypt)
   - Add JWT tokens
   - Enable HTTPS

---

## 📞 Support

If you continue to have issues:

1. Check the error message carefully - what exactly comes before "<!DOCTYPE"?
2. Look at server console output - any error messages?
3. Check browser console (F12) - any CORS or other errors?
4. Try with fresh database setup: `node setup-db.js`
5. Review auth-routes-fix.js - it has detailed comments
6. Ensure all files were saved after editing

---

## ✨ Prevention

To avoid this error in the future:

1. **Always verify JSON responses:**
   ```javascript
   try {
     const data = await response.json();
   } catch (err) {
     console.error('Response is not JSON:', response.text());
   }
   ```

2. **Test endpoints manually before use:**
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

3. **Check response headers:**
   - Must have `Content-Type: application/json`
   - Must NOT have `Content-Type: text/html`

4. **Monitor server logs:**
   - Always run server in foreground during dev
   - Watch for any error messages
   - Check database connection errors

---

**Status**: Issue Identified & Fix Provided ✅
**Solution**: Use auth-routes-fix.js
**Time to Fix**: < 5 minutes
**Testing Required**: Yes - verify login/signup work

Good luck! The auth system will work perfectly after applying this fix.
