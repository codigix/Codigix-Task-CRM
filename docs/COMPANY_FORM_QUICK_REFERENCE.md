# Company Form - Quick Reference Guide

## 🎯 Quick Start

### Prerequisites
```bash
# 1. MySQL is running
# 2. Database created: npm run setup (in server directory)
# 3. Both servers running:
#    - Backend: npm run dev (port 5000)
#    - Frontend: npm start (port 3000)
```

### Add a Company in 3 Steps
1. Navigate to `http://localhost:3000/companies`
2. Click **"Add Company"** button
3. Fill form → Click **"Create New"**

---

## 📁 Key Files Location

| File | Purpose |
|------|---------|
| `client/src/components/AddNewCompanyForm.js` | Company form UI component |
| `client/src/components/Companies.js` | Companies list & form handler |
| `client/src/services/api.js` | API service layer |
| `server/server.js` | Express API endpoints |
| `database.sql` | Database schema & seed data |

---

## 🔗 API Endpoints

### Create Company
```http
POST /api/companies
Content-Type: application/json

{
  "company_name": "string",
  "email": "string",
  "phone": "string",
  "website": "string",
  "address": "string",
  "account_url": "string",
  "status": "Active|Inactive|Prospect"
}
```

**Response:**
```json
{
  "message": "Company created successfully",
  "id": 6
}
```

### Get All Companies
```http
GET /api/companies
```

**Response:**
```json
[
  {
    "id": 1,
    "company_name": "NovaWave LLC",
    "email": "nova@llc.com",
    "phone": "+1-234-567-8900",
    "website": "www.novawave.com",
    "status": "Active",
    "created_at": "2024-09-12T10:30:00Z"
  }
]
```

### Get Company by ID
```http
GET /api/companies/:id
```

### Update Company
```http
PUT /api/companies/:id
Content-Type: application/json

{
  "company_name": "string",
  "email": "string",
  "phone": "string",
  "website": "string",
  "address": "string",
  "account_url": "string",
  "status": "string"
}
```

### Delete Company
```http
DELETE /api/companies/:id
```

### Upgrade Company Plan
```http
POST /api/companies/:id/upgrade
Content-Type: application/json

{
  "planName": "string",
  "planType": "string",
  "currency": "string",
  "language": "string"
}
```

---

## 📊 Form Fields Mapping

| Frontend Field | API Field | Database Field | Type | Required |
|---|---|---|---|---|
| companyName | company_name | company_name | VARCHAR(255) | ✅ |
| emailAddress | email | email | VARCHAR(150) | ✅ |
| phoneNumber | phone | phone | VARCHAR(20) | ✅ |
| website | website | website | VARCHAR(255) | ❌ |
| address | address | address | VARCHAR(500) | ❌ |
| industryType | industry | industry | VARCHAR(100) | ❌ |
| city | city | city | VARCHAR(100) | ❌ |
| state | state | state | VARCHAR(100) | ❌ |
| country | country | country | VARCHAR(100) | ❌ |
| zipCode | zip_code | (custom) | VARCHAR(20) | ❌ |
| employeeCount | employee_count | employee_count | INT | ❌ |
| annualRevenue | annual_revenue | annual_revenue | DECIMAL(15,2) | ❌ |
| accountUrl | account_url | account_url | VARCHAR(255) | ❌ |

---

## 🗄️ Database Schema

```sql
-- Companies Table
CREATE TABLE companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(20),
  website VARCHAR(255),
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  account_url VARCHAR(255),
  status ENUM('Active', 'Inactive', 'Prospect') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Company Subscriptions Table
CREATE TABLE company_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  plan_type VARCHAR(50) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  language VARCHAR(50) DEFAULT 'English',
  registered_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiring_on DATE,
  status ENUM('Active', 'Expired', 'Cancelled') DEFAULT 'Active',
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
```

---

## 🔍 Debug Commands

### Check MySQL Connection
```bash
cd server
node -e "
const mysql = require('mysql2/promise');
mysql.createPool({ host: 'localhost', user: 'root', database: 'deals_db' })
  .getConnection()
  .then(conn => { console.log('✅ Connected'); conn.release(); process.exit(0); })
  .catch(err => { console.log('❌ Failed:', err.message); process.exit(1); });
"
```

### View Companies in DB
```sql
SELECT id, company_name, email, phone, status, created_at FROM companies;
```

### View Company with Plan
```sql
SELECT c.*, cs.plan_name, cs.plan_type 
FROM companies c 
LEFT JOIN company_subscriptions cs ON c.id = cs.company_id 
WHERE c.id = 1;
```

### Test API Endpoint
```bash
curl -X GET http://localhost:5000/api/companies
```

### Test Create Company
```bash
curl -X POST http://localhost:5000/api/companies \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Corp",
    "email": "test@corp.com",
    "phone": "+1-234-567-8900",
    "website": "www.test.com",
    "address": "123 Main St",
    "account_url": "test.example.com",
    "status": "Active"
  }'
```

---

## 🐛 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **"Cannot GET /api/companies"** | API not running | Run `npm run dev` in server directory |
| **"CORS error"** | Frontend & backend port mismatch | Check `.env` CORS_ORIGIN setting |
| **"Failed to create company"** | Form validation failed | Fill required fields (name, email, phone) |
| **"Database connection failed"** | MySQL not running | Start MySQL service |
| **"Submitted form refreshes page"** | Form submission not prevented | Check form onSubmit handler |
| **"New company not showing in list"** | List not refreshed | Verify fetchCompanies() is called |

---

## ✅ Testing Checklist

- [ ] MySQL server running
- [ ] Database `deals_db` exists
- [ ] Backend server on port 5000
- [ ] Frontend running on port 3000
- [ ] Can access http://localhost:3000/companies
- [ ] "Add Company" button visible
- [ ] Form opens when button clicked
- [ ] Form validates required fields
- [ ] Can submit form with all fields filled
- [ ] Success message appears
- [ ] New company appears in table
- [ ] Can refresh page and see new company persisted
- [ ] Can view company details
- [ ] Can edit company info
- [ ] Can delete company

---

## 📝 Environment Configuration

### Backend (.env.development)
```env
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=deals_db
CORS_ORIGIN=http://localhost:3000
PORT=5000
```

### Frontend (.env or .env.local)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 🔄 Request/Response Flow

```
User Action
    ↓
AddNewCompanyForm.handleSubmit()
    ↓
companiesAPI.create(formData)
    ↓
fetch(POST /api/companies)
    ↓
Backend: app.post('/api/companies')
    ↓
Database: INSERT INTO companies
    ↓
Return: { message: "...", id: 6 }
    ↓
Frontend: fetchCompanies()
    ↓
Update state & show toast
    ↓
User sees new company in list
```

---

## 🎨 Form Structure

```
ADD NEW COMPANY
├── Basic Info (Expandable)
│   ├── 🏢 Logo Upload
│   ├── Company Name * (Required)
│   ├── Email * (Required)
│   ├── Phone * (Required)
│   ├── Website
│   ├── Industry Type
│   ├── Employee Count (Dropdown)
│   ├── Annual Revenue (Dropdown)
│   └── Founded Year
│
├── Address Info (Expandable)
│   ├── 📍 Address (Textarea)
│   ├── City
│   ├── State
│   ├── Zip Code
│   └── Country
│
├── Social Profile (Expandable)
│   ├── 📱 Facebook
│   ├── Skype
│   ├── LinkedIn
│   ├── Twitter
│   ├── Whatsapp
│   └── Instagram
│
└── Access (Expandable)
    └── 🔐 Visibility (Public/Private/Select People)

[Cancel] [Create New]
```

---

## 📈 Success Indicators

✅ Company created → Check email field in response
✅ Subscription created → Check company_subscriptions table
✅ Form closes → Modal dismissed after submission
✅ Toast message → "Company created successfully!"
✅ List updated → New company visible in Companies table
✅ Data persisted → Still visible after page refresh

---

## 🚀 Performance Tips

1. **Connection Pooling** - Reuses MySQL connections (10 limit)
2. **Indexes** - Database indexes on status and created_at for faster queries
3. **Lazy Loading** - Forms load on demand via modal
4. **Batch Operations** - Combine company + subscription creation
5. **Error Handling** - Graceful fallbacks and retry logic

---

**Version:** 1.0
**Last Updated:** December 2, 2025
**Status:** ✅ Production Ready
