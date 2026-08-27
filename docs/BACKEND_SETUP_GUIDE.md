# Backend Setup & API Integration Guide

## Overview

This guide explains how to set up and run the complete **Preadmin Companies Management System** with backend database integration.

## Prerequisites

- **Node.js** (v14 or higher)
- **MySQL Server** (v8.0 or higher)
- **npm** (comes with Node.js)

## Step 1: Database Setup

### 1.1 Ensure MySQL is Running

Make sure MySQL server is running on your machine. You can verify this by:

```bash
mysql -u root -p
```

If prompted, enter your MySQL root password.

### 1.2 Update Database Credentials

Edit `server/.env` file and configure:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=backend
DB_NAME=deals_db
PORT=5000
```

### 1.3 Run Database Setup

Navigate to the server directory and run the setup script:

```bash
cd server
npm install
npm run setup
```

This will:
- Create the `deals_db` database
- Create all necessary tables:
  - `companies` - Company information
  - `company_plans` - Available subscription plans
  - `company_subscriptions` - Company's current subscription
  - `contacts` - Contact information
  - `deals` - Deal tracking
  - `leads` - Lead management
  - `pipeline` - Sales pipeline data
- Insert sample data for testing

### Sample Companies Created:
1. **NovaWave LLC** - Advanced Plan (Monthly)
2. **BlueSky Industries** - Enterprise Plan (Monthly) - Inactive
3. **Silver Hawk** - Advanced Plan (Monthly)
4. **Summit Peak** - Advanced Plan (Monthly)
5. **RiverStone Venture** - Basic Plan (Monthly)

## Step 2: Start the Backend Server

From the `server` directory, start the Express server:

```bash
npm start
```

Expected output:
```
Server running on port 5000
```

The server will be accessible at `http://localhost:5000`

## Step 3: Start the Frontend Application

From the `client` directory, start the React development server:

```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## API Endpoints

### Companies Management

#### **GET /api/companies**
Fetch all companies with their active subscriptions.

**Response:**
```json
[
  {
    "id": 1,
    "company_name": "NovaWave LLC",
    "email": "nova@llc.com",
    "phone": "+1-234-567-8900",
    "website": "www.novawave.com",
    "account_url": "nw.nova.com",
    "status": "Active",
    "plan_name": "Advanced",
    "plan_type": "Monthly",
    "currency": "USD",
    "language": "English",
    "price": 199.99,
    "registered_date": "2024-09-12",
    "expiring_on": "2024-10-11"
  }
]
```

#### **GET /api/companies/:id**
Fetch a specific company with subscription details.

**Example:**
```
GET /api/companies/1
```

#### **POST /api/companies**
Create a new company with optional plan subscription.

**Request Body:**
```json
{
  "company_name": "New Company Inc",
  "email": "info@newcompany.com",
  "phone": "+1-234-567-1234",
  "website": "www.newcompany.com",
  "address": "123 Business St",
  "account_url": "newco.company.com",
  "password": "secure_password",
  "status": "Active",
  "planName": "Professional",
  "planType": "Monthly",
  "currency": "USD",
  "language": "English"
}
```

**Response:**
```json
{
  "message": "Company created successfully",
  "id": 6
}
```

#### **PUT /api/companies/:id**
Update company information.

**Request Body:**
```json
{
  "company_name": "Updated Company Name",
  "email": "updated@company.com",
  "phone": "+1-234-567-5678",
  "website": "www.updated.com",
  "address": "456 New Street",
  "account_url": "updated.company.com",
  "status": "Active"
}
```

#### **DELETE /api/companies/:id**
Delete a company and its associated subscriptions.

**Example:**
```
DELETE /api/companies/6
```

#### **POST /api/companies/:id/upgrade**
Upgrade or change a company's subscription plan.

**Request Body:**
```json
{
  "planName": "Enterprise",
  "planType": "Yearly",
  "currency": "USD",
  "language": "English"
}
```

**Response:**
```json
{
  "message": "Company plan upgraded successfully",
  "subscriptionId": 6
}
```

### Plans Management

#### **GET /api/plans**
Fetch all available subscription plans.

**Response:**
```json
[
  {
    "id": 1,
    "plan_name": "Basic",
    "plan_type": "Monthly",
    "price": 29.99,
    "currency": "USD",
    "description": "Basic plan for small teams",
    "features": "Basic features, up to 10 users"
  },
  ...
]
```

## Frontend Features

### Companies List Page (`/super-admin-companies`)

**Features Implemented:**
- ✅ Display all companies with their current plan
- ✅ Search companies by name
- ✅ Filter by status, country, owner, tags, rating
- ✅ Sort by various criteria
- ✅ Date range selection
- ✅ Manage column visibility
- ✅ Star/favorite companies
- ✅ Add new company with form
- ✅ Upgrade company plan
- ✅ View company details
- ✅ Edit company information
- ✅ Delete company
- ✅ Export data

### Add New Company Form

**Fields:**
- Company Name (required)
- Email Address
- Account URL
- Phone Number (required)
- Website
- Password (required)
- Confirm Password (required)
- Address
- Plan Name (required)
- Plan Type (required)
- Currency (required)
- Language (required)
- Status (Active/Inactive)
- Logo Upload

### Upgrade Plan Modal

**Features:**
- Display current plan details
- Show current subscription information
- Select new plan
- Choose plan type (Monthly/Yearly/Lifetime)
- Select currency
- Choose language
- Save changes

## Database Schema

### Companies Table
```sql
CREATE TABLE companies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_name VARCHAR(255) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(20),
  website VARCHAR(255),
  address VARCHAR(500),
  account_url VARCHAR(255),
  logo LONGBLOB,
  password VARCHAR(255),
  status ENUM('Active', 'Inactive', 'Prospect'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Company Subscriptions Table
```sql
CREATE TABLE company_subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT NOT NULL,
  plan_name VARCHAR(100),
  plan_type VARCHAR(50),
  currency VARCHAR(10),
  language VARCHAR(50),
  price DECIMAL(10, 2),
  registered_date TIMESTAMP,
  expiring_on DATE,
  status ENUM('Active', 'Expired', 'Cancelled'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
)
```

### Company Plans Table
```sql
CREATE TABLE company_plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  plan_name VARCHAR(100) UNIQUE NOT NULL,
  plan_type VARCHAR(50),
  price DECIMAL(10, 2),
  currency VARCHAR(10),
  description TEXT,
  features TEXT,
  created_at TIMESTAMP
)
```

## Troubleshooting

### Issue: "Cannot find module 'mysql2'"
**Solution:** Run `npm install` in the server directory.

### Issue: "Connection refused" on port 5000
**Solution:** Ensure the server is running with `npm start` in the server directory.

### Issue: Database connection error
**Solution:** Check your MySQL credentials in `.env` file and ensure MySQL server is running.

### Issue: CORS errors
**Solution:** The server is configured with CORS enabled. Ensure you're accessing from `http://localhost:3000`.

## File Structure

```
deals-dashboard/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Companies.js        # Main companies list page
│   │   │   ├── AddNewCompanyForm.js # Add company form
│   │   │   └── UpgradePlanModal.js  # Upgrade plan modal
│   │   └── data/
│   │       └── companiesData.json   # Sample data (can be removed)
│   └── package.json
│
├── server/                          # Express backend
│   ├── server.js                    # Main server file with API endpoints
│   ├── setup-db.js                  # Database initialization script
│   ├── .env                         # Database credentials
│   └── package.json
│
├── database.sql                     # SQL schema (reference)
└── BACKEND_SETUP_GUIDE.md          # This file
```

## Next Steps

1. **Test the API** - Use Postman or curl to test endpoints
2. **Verify Data** - Check MySQL to ensure data is created properly
3. **Test Frontend** - Navigate to `/super-admin-companies` and test all features
4. **Production Deployment** - Configure environment variables for production

## Support

For issues or questions:
1. Check the console logs in both frontend and backend
2. Verify MySQL is running and credentials are correct
3. Ensure ports 3000 and 5000 are not in use
4. Check network connectivity between services

## Security Notes

- Never commit `.env` files with real credentials
- Use environment variables for sensitive data in production
- Implement proper authentication (JWT recommended)
- Validate and sanitize all inputs
- Use HTTPS in production
- Implement rate limiting on API endpoints
- Use database connection pooling (already configured)
