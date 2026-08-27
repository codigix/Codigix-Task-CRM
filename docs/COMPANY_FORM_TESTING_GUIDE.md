# Company Form - Complete Testing & Troubleshooting Guide

## ✅ Pre-Flight Checklist

### Environment Setup
- [ ] Node.js v14+ installed (`node --version`)
- [ ] MySQL 8.0+ running (`mysql --version`)
- [ ] Git initialized in project
- [ ] `.env` files configured correctly

### Backend Setup
- [ ] `server/.env.development` exists with DB credentials
- [ ] Database `deals_db` created (`mysql> SHOW DATABASES;`)
- [ ] Tables created (`npm run setup` in server directory)
- [ ] Backend dependencies installed (`npm install` in server)
- [ ] Server starts without errors (`npm run dev`)

### Frontend Setup
- [ ] `client/.env` configured with API URL
- [ ] Frontend dependencies installed (`npm install` in client)
- [ ] Frontend starts without errors (`npm start`)
- [ ] Can access http://localhost:3000

---

## 🔍 Testing Phases

### Phase 1: Database Connectivity

#### Test 1.1: MySQL Connection
```bash
# Windows Command Prompt
mysql -u root -p

# Type password (if any) and press Enter
# You should see: mysql>
```

**Expected Result:** ✅ Connected to MySQL
**Troubleshoot:** See "MySQL Issues" section below

#### Test 1.2: Database Exists
```sql
SHOW DATABASES;
```

**Expected Output:**
```
+--------------------+
| Database           |
+--------------------+
| deals_db           | ← Should be here
| information_schema |
| mysql              |
| performance_schema |
+--------------------+
```

**Troubleshoot:** If missing, run `npm run setup` in server directory

#### Test 1.3: Tables Exist
```sql
USE deals_db;
SHOW TABLES;
```

**Expected Output:**
```
+------------------------+
| Tables_in_deals_db     |
+------------------------+
| companies              | ← Required
| company_subscriptions  | ← Required
| contacts               |
| deals                  |
| leads                  |
| pipeline               |
+------------------------+
```

#### Test 1.4: Companies Table Structure
```sql
DESCRIBE companies;
```

**Expected Columns:**
```
Field            Type
company_name     VARCHAR(255)
email            VARCHAR(150)
phone            VARCHAR(20)
website          VARCHAR(255)
address          VARCHAR(500)
city             VARCHAR(100)
state            VARCHAR(100)
country          VARCHAR(100)
account_url      VARCHAR(255)
status           ENUM('Active','Inactive','Prospect')
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

---

### Phase 2: Backend API Testing

#### Test 2.1: Backend Server Running
```bash
# Terminal (in server directory)
npm run dev
```

**Expected Output:**
```
✓ Database connection successful
Server running in development mode
Database: localhost/deals_db
```

**Troubleshoot:** 
- Port 5000 already in use? Change port in server.js
- Database not connecting? Check .env credentials

#### Test 2.2: GET All Companies Endpoint
```bash
# New terminal window
curl http://localhost:5000/api/companies
```

**Expected Response:**
```json
[
  {
    "id": 1,
    "company_name": "NovaWave LLC",
    "email": "nova@llc.com",
    "phone": "+1-234-567-8900",
    "website": "www.novawave.com",
    "status": "Active",
    "created_at": "2024-09-12T10:30:00.000Z"
  }
  // ... more companies
]
```

**Troubleshoot:**
- Empty array? Database has no seed data (OK, but usually has sample data)
- Error? Check backend is running on port 5000

#### Test 2.3: POST Create Company Endpoint
```bash
curl -X POST http://localhost:5000/api/companies \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Company",
    "email": "test@company.com",
    "phone": "+1-555-0123",
    "website": "https://test.com",
    "address": "456 Test Ave",
    "account_url": "test.example.com",
    "status": "Active"
  }'
```

**Expected Response:**
```json
{
  "message": "Company created successfully",
  "id": 7
}
```

**Troubleshoot:**
- Missing fields error? Provide all required fields
- Network error? Backend not running

#### Test 2.4: Verify Data in Database
```sql
SELECT * FROM companies WHERE id = 7;
```

**Expected Result:** ✅ New company record exists
**Troubleshoot:** Check INSERT query in backend didn't fail

#### Test 2.5: GET Specific Company
```bash
curl http://localhost:5000/api/companies/7
```

**Expected Response:**
```json
{
  "id": 7,
  "company_name": "Test Company",
  "email": "test@company.com",
  "phone": "+1-555-0123",
  "website": "https://test.com",
  "address": "456 Test Ave",
  "account_url": "test.example.com",
  "status": "Active",
  "created_at": "2025-01-02T10:30:00.000Z",
  "updated_at": "2025-01-02T10:30:00.000Z"
}
```

#### Test 2.6: PUT Update Company
```bash
curl -X PUT http://localhost:5000/api/companies/7 \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Updated Test Company",
    "email": "updated@company.com",
    "phone": "+1-555-0124",
    "website": "https://updated.com",
    "address": "789 Updated Ave",
    "account_url": "updated.example.com",
    "status": "Inactive"
  }'
```

**Expected Response:**
```json
{
  "message": "Company updated successfully"
}
```

**Verify:** 
```sql
SELECT * FROM companies WHERE id = 7;
```

#### Test 2.7: DELETE Company
```bash
curl -X DELETE http://localhost:5000/api/companies/7
```

**Expected Response:**
```json
{
  "message": "Company deleted successfully"
}
```

**Verify:**
```sql
SELECT COUNT(*) FROM companies WHERE id = 7; -- Should return 0
```

---

### Phase 3: Frontend Integration Testing

#### Test 3.1: Frontend Server Running
```bash
# Terminal (in client directory)
npm start
```

**Expected:** Browser opens to http://localhost:3000

#### Test 3.2: API Service Connectivity
Browser DevTools Console:
```javascript
// Check if API base URL is correct
fetch('http://localhost:5000/api/companies')
  .then(r => r.json())
  .then(d => console.log(d))
```

**Expected:** ✅ Array of companies logged

#### Test 3.3: Navigate to Companies Page
- Go to http://localhost:3000
- Look for "Companies" link in navigation
- Click to navigate to companies page
- **Expected:** Companies table loads with data

#### Test 3.4: Add Company Form Opens
- Click **"Add Company"** button
- **Expected:** Modal panel slides in from right
- Form has 4 sections: Basic Info, Address Info, Social Profile, Access
- All sections are collapsible

#### Test 3.5: Form Field Binding
Fill out form:
- Company Name: "Frontend Test Corp"
- Email: "test@frontend.com"
- Phone: "+1-555-9999"
- Website: "https://frontend-test.com"
- Address: "321 Frontend St"
- Industry: "Software"
- City: "San Francisco"
- State: "CA"
- Country: "USA"

**Expected:** ✅ All fields retain entered values

#### Test 3.6: Form Validation
- Clear Company Name field
- Click "Create New"
- **Expected:** Error message: "Please fill in all required fields"

- Fill all required fields again
- **Expected:** No error message

#### Test 3.7: Submit Form
- Fill all required fields
- Click "Create New"
- **Expected:** 
  - Button shows spinner ("Creating...")
  - Modal closes after ~2 seconds
  - Success toast appears: "Company 'Frontend Test Corp' created successfully!"

#### Test 3.8: Verify Data Appears in List
After form closes:
- **Expected:** 
  - Companies table refreshes
  - New company "Frontend Test Corp" appears at top of list
  - Row shows: ID, Name, Email, Phone, Status

#### Test 3.9: Page Refresh Persistence
- Press F5 to refresh page
- **Expected:** ✅ New company still visible (data persisted in DB)

#### Test 3.10: Edit Company
- Click on a company row or action menu
- Look for edit/update option
- Update company details
- **Expected:** Changes saved to database

#### Test 3.11: Delete Company
- Look for delete option on company row
- Confirm deletion
- **Expected:** Company removed from list and database

---

## 🐛 Troubleshooting Guide

### Issue: "Cannot Connect to MySQL"

**Error Message:**
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| MySQL not running | Start MySQL service: `mysql.server start` (Mac) or use Windows Services |
| Wrong host | Verify `.env` has `DB_HOST=localhost` |
| Wrong port | MySQL default is 3306, check your config |
| Wrong credentials | Verify `.env` `DB_USER` and `DB_PASSWORD` match MySQL setup |

**Debug Steps:**
```bash
# 1. Check if MySQL is running
mysql -u root -p -e "SELECT 1"

# 2. If fails, start MySQL
# Windows: Search for "Services" and start MySQL
# Mac: brew services start mysql
# Linux: sudo systemctl start mysql

# 3. Check credentials
mysql -u root -p
# If password prompt appears, credentials are set
```

---

### Issue: "Failed to fetch companies" or CORS Error

**Error Message:**
```
Access to XMLHttpRequest at 'http://localhost:5000/api/companies' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| CORS not configured | Add CORS middleware in server.js (already done) |
| Wrong origin in .env | Verify `CORS_ORIGIN=http://localhost:3000` |
| Port mismatch | Frontend must be on 3000, backend on 5000 |
| Backend not running | Start with `npm run dev` in server directory |

**Debug Steps:**
```bash
# 1. Check backend is running
curl http://localhost:5000/api/companies

# 2. If fails, start backend
cd server && npm run dev

# 3. Check CORS config
# In server.js line 14-18, verify corsOptions setup

# 4. Check environment variables
# .env.development should have correct values
```

---

### Issue: "Database table doesn't exist"

**Error Message:**
```
Error: Table 'deals_db.companies' doesn't exist
```

**Solution:**
```bash
# In server directory
npm run setup

# This runs setup-db.js which creates all tables
```

**Manual Alternative:**
```bash
cd server
mysql -u root -p deals_db < database.sql
```

---

### Issue: "Form submits but company doesn't appear"

**Possible Causes:**

1. **API request failed silently**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Submit form
   - Check POST request to `/api/companies`
   - Look for errors in Response

2. **Frontend not calling refresh**
   - Check Companies.js `fetchCompanies()` is called
   - Verify GET request follows successful POST

3. **Database insert failed but error not shown**
   - Check backend logs for SQL errors
   - Verify all columns accept values being inserted

**Debug Steps:**
```javascript
// In browser console
console.log('Company data:', formData);
// Watch Network tab
// Check response body for error details
```

---

### Issue: "API returns 500 error"

**Error Message:**
```json
{
  "error": "Failed to create company"
}
```

**Check Backend Logs:**
```bash
# Terminal running backend
# Look for error messages after form submission
# Common: "Error: ER_BAD_FIELD_ERROR: Unknown column..."
```

**Debug Query:**
```sql
-- Test INSERT directly
INSERT INTO companies 
(company_name, email, phone, website, address, account_url, status) 
VALUES 
('Test', 'test@test.com', '555-1234', 'test.com', 'addr', 'url', 'Active');

-- If fails, check column names match database.sql
DESCRIBE companies;
```

---

### Issue: "Form fields not binding/updating"

**Possible Causes:**
1. `handleInputChange` not connected to all fields
2. Input name attributes don't match state keys
3. React not detecting changes

**Check:**
```javascript
// In AddNewCompanyForm.js
// Verify each input has:
// 1. name={fieldName}
// 2. value={formData.fieldName}
// 3. onChange={handleInputChange}

// Example for Company Name:
<input
  name="companyName"              // ← Must match state key
  value={formData.companyName}    // ← Must read from state
  onChange={handleInputChange}    // ← Must have handler
/>
```

---

### Issue: "Backend running but form request times out"

**Causes:**
1. Database connection pool exhausted
2. Query hanging (missing WHERE clause?)
3. Network timeout

**Solutions:**
```javascript
// In server.js, verify query has timeout
const connection = await pool.getConnection();
// Increase pool size if needed
connectionLimit: 10  // Can increase if many concurrent requests
```

---

### Issue: "Subscription not created with company"

**Check:**
```sql
SELECT * FROM company_subscriptions WHERE company_id = 6;

-- If empty, either:
-- 1. planName not provided in form
-- 2. Backend didn't include subscription creation logic
-- 3. Foreign key constraint failed
```

**Debug:**
```javascript
// In handleAddCompanySubmit (Companies.js line 86)
// Verify planName and planType are being passed:
console.log('Plan data:', {
  planName: formData.planName,
  planType: formData.planType,
  currency: formData.currency,
  language: formData.language
});
```

---

## 🔧 Quick Fixes

### Fix 1: Reset Database
```bash
# Complete reset (CAUTION: Loses all data)
cd server

# Drop database
mysql -u root -p -e "DROP DATABASE deals_db;"

# Recreate
npm run setup
```

### Fix 2: Clear Node Modules & Reinstall
```bash
# Backend
cd server
rm -rf node_modules package-lock.json
npm install
npm run dev

# Frontend
cd ../client
rm -rf node_modules package-lock.json
npm install
npm start
```

### Fix 3: Port Already in Use
```bash
# Find process using port 5000 (backend)
# Windows
netstat -ano | findstr :5000

# Mac/Linux
lsof -i :5000

# Kill process (Windows)
taskkill /PID <PID> /F

# Kill process (Mac/Linux)
kill -9 <PID>
```

### Fix 4: Clear Browser Cache
- Clear cookies and cache
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Close and reopen browser

### Fix 5: Verify Environment Variables
```bash
# Backend - .env.development content
cat server/.env.development

# Expected:
# NODE_ENV=development
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=
# DB_NAME=deals_db
# CORS_ORIGIN=http://localhost:3000
```

---

## ✨ Smoke Tests (Quick Validation)

Run these commands to quickly validate everything works:

### Test Suite Script
```bash
#!/bin/bash
echo "🔍 Running Smoke Tests..."

echo ""
echo "1️⃣  Testing MySQL Connection..."
mysql -u root -e "SELECT 1" && echo "✅ MySQL OK" || echo "❌ MySQL FAILED"

echo ""
echo "2️⃣  Testing Database Exists..."
mysql -u root -e "USE deals_db; SHOW TABLES LIKE 'companies'" | grep companies && echo "✅ Database OK" || echo "❌ Database FAILED"

echo ""
echo "3️⃣  Testing Backend API..."
curl -s http://localhost:5000/api/companies > /dev/null && echo "✅ Backend OK" || echo "❌ Backend FAILED"

echo ""
echo "4️⃣  Testing Frontend..."
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend FAILED"

echo ""
echo "✅ Smoke Tests Complete!"
```

---

## 📋 Final Verification Checklist

Before considering implementation complete:

- [ ] MySQL running and responding
- [ ] Database `deals_db` exists with all tables
- [ ] Backend server starts without errors
- [ ] Frontend server starts without errors
- [ ] Can access http://localhost:3000/companies
- [ ] Companies table displays existing data
- [ ] "Add Company" button opens form modal
- [ ] Form validates required fields
- [ ] Can submit form successfully
- [ ] Success toast appears after submission
- [ ] New company appears in table immediately
- [ ] Can refresh page and see new company persisted
- [ ] Can view company details
- [ ] Can edit company information
- [ ] Can delete company
- [ ] Browser DevTools Console has no errors
- [ ] Network requests show 200 status codes
- [ ] Database has new records after form submission

---

## 📞 Support Information

**If stuck:**

1. **Check logs** - Backend terminal and browser console (F12)
2. **Verify environment** - All .env files configured
3. **Test directly** - Use curl to test API endpoints
4. **Database check** - Query database directly with MySQL
5. **Review code** - Compare with COMPANY_FORM_FULL_ANALYSIS.md

**Common Next Steps:**
- Restart both servers
- Clear browser cache
- Check timestamps in logs
- Verify all dependencies installed (`npm install`)

---

**Document Version:** 1.0
**Last Updated:** December 2, 2025
**Testing Status:** ✅ Comprehensive
