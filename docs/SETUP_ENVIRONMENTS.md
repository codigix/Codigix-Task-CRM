# Full Environment Setup Guide - Development & Production

## Overview

This guide explains how to set up and configure your CRM Dashboard for **development** and **production** environments with proper API URL management across the entire project.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Environment Setup](#development-environment-setup)
3. [Production Environment Setup](#production-environment-setup)
4. [Environment Configuration](#environment-configuration)
5. [API Service Layer](#api-service-layer)
6. [Database Setup](#database-setup)
7. [Starting the Application](#starting-the-application)
8. [Deployment Guide](#deployment-guide)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js** v14 or higher
- **npm** (comes with Node.js)
- **MySQL Server** v8.0 or higher
- **Git** (for version control)

### Verify Installation

```bash
node --version
npm --version
mysql --version
```

---

## Development Environment Setup

### Step 1: Install Dependencies

From the project root directory:

```bash
npm run setup
```

This command will:
- Install server dependencies
- Install client dependencies
- Initialize the database with sample data

### Step 2: Verify Development Environment Files

Ensure these files exist:

- `client/.env.development` - Frontend dev configuration
- `server/.env.development` - Backend dev configuration

**Client Environment** (`client/.env.development`):
```env
REACT_APP_ENV=development
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_DEBUG=true
```

**Server Environment** (`server/.env.development`):
```env
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=backend
DB_NAME=deals_db
PORT=5000
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
```

### Step 3: Start Development Server

From project root:

```bash
npm start
```

This starts both the backend and frontend concurrently:
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:3000`

**Alternative**: Start services separately

```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

---

## Production Environment Setup

### Step 1: Configure Production Environment Files

Update `server/.env.production` with your production database credentials:

```env
NODE_ENV=production
DB_HOST=your_prod_db_host
DB_USER=your_prod_db_user
DB_PASSWORD=your_prod_db_password
DB_NAME=deals_db_prod
PORT=5000
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info
```

Update `client/.env.production` with your production API URL:

```env
REACT_APP_ENV=production
REACT_APP_API_URL=https://api.yourdomain.com/api
REACT_APP_DEBUG=false
```

### Step 2: Build Frontend for Production

```bash
cd client
npm run build
```

This creates an optimized production build in `client/build/`

### Step 3: Set Up Production Database

1. Create a new database on production MySQL server
2. Run migrations using the setup script:

```bash
cd server
NODE_ENV=production npm run setup
```

### Step 4: Start Production Server

```bash
cd server
npm start
```

Or using process manager (recommended):

```bash
# Using PM2 (install with: npm install -g pm2)
pm2 start server.js --name "crm-api" --env production
```

---

## Environment Configuration

### Frontend Environment Variables

**File Locations:**
- Development: `client/.env.development`
- Production: `client/.env.production`
- Example: `client/.env.example`

**Available Variables:**

| Variable | Purpose | Dev Value | Prod Value |
|----------|---------|-----------|-----------|
| `REACT_APP_ENV` | Environment mode | `development` | `production` |
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:5000/api` | `https://api.yourdomain.com/api` |
| `REACT_APP_DEBUG` | Enable debug mode | `true` | `false` |

### Server Environment Variables

**File Locations:**
- Development: `server/.env.development`
- Production: `server/.env.production`
- Example: `server/.env.example`

**Available Variables:**

| Variable | Purpose | Dev Value | Prod Value |
|----------|---------|-----------|-----------|
| `NODE_ENV` | Environment mode | `development` | `production` |
| `DB_HOST` | Database host | `localhost` | `prod-db.example.com` |
| `DB_USER` | Database user | `root` | `db_user` |
| `DB_PASSWORD` | Database password | `backend` | `secure_password` |
| `DB_NAME` | Database name | `deals_db` | `deals_db_prod` |
| `PORT` | Server port | `5000` | `5000` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` | `https://yourdomain.com` |
| `LOG_LEVEL` | Logging level | `debug` | `info` |

---

## API Service Layer

### Frontend API Service

The frontend uses a centralized API service for all backend communication.

**Location:** `client/src/services/api.js`

**Features:**
- Automatic URL construction using environment variables
- Consistent error handling
- Support for GET, POST, PUT, DELETE methods

**Usage Example:**

```javascript
import { companiesAPI, dealsAPI, contactsAPI } from '../services/api';

// Fetch all companies
const companies = await companiesAPI.getAll();

// Get specific company
const company = await companiesAPI.getById(1);

// Create company
await companiesAPI.create({
  company_name: 'New Company',
  email: 'company@example.com'
});

// Update company
await companiesAPI.update(1, { company_name: 'Updated Name' });

// Delete company
await companiesAPI.delete(1);
```

**Available API Modules:**

- `companiesAPI` - Company CRUD operations
- `dealsAPI` - Deal management
- `contactsAPI` - Contact management
- `leadsAPI` - Lead management
- `plansAPI` - Subscription plans
- `pipelineAPI` - Pipeline management

### Environment Configuration in Frontend

**Location:** `client/src/config/environment.js`

Provides utility functions to access environment configuration:

```javascript
import { environment, isDevelopment, isProduction } from '../config/environment';

// Check environment
if (isDevelopment()) {
  console.log('Running in development mode');
}

// Get API URL
const apiUrl = environment.apiUrl;

// Check debug mode
if (environment.debug) {
  console.log('Debug mode enabled');
}
```

---

## Database Setup

### Development Database

The development database is automatically created when you run:

```bash
npm run setup
```

**Database Name:** `deals_db`

**Sample Data Included:**
- 5 companies with different subscription plans
- Contact information
- Deal data
- Lead information
- Pipeline data

### Production Database

1. **Create Database:**

```sql
CREATE DATABASE deals_db_prod;
```

2. **Run Setup Script:**

```bash
cd server
NODE_ENV=production npm run setup
```

3. **Verify Connection:**

```bash
mysql -h your_prod_db_host -u your_prod_db_user -p your_prod_db_password deals_db_prod -e "SHOW TABLES;"
```

### Database Schema

The setup script creates the following tables:

- `companies` - Company information
- `company_subscriptions` - Subscription details
- `company_plans` - Available plans
- `contacts` - Contact records
- `deals` - Deal tracking
- `leads` - Lead management
- `pipeline` - Sales pipeline

---

## Starting the Application

### Development Mode

**Start Everything:**
```bash
npm start
```

**Start Backend Only:**
```bash
npm run server
```

**Start Frontend Only:**
```bash
npm run client
```

**Expected Output:**
```
✓ Server running on port 5000
✓ Environment: development
✓ CORS origin: http://localhost:3000

Frontend available at http://localhost:3000
```

### Production Mode

**Build and Start:**
```bash
npm run build
npm run server:prod
```

**Or in separate steps:**
```bash
cd client
npm run build

cd ../server
npm start
```

---

## Deployment Guide

### Local Machine Deployment

1. **Configure Production Environment:**
   - Update `server/.env.production`
   - Update `client/.env.production`

2. **Build Frontend:**
   ```bash
   npm run build
   ```

3. **Setup Database:**
   ```bash
   cd server
   NODE_ENV=production npm run setup
   ```

4. **Start Server:**
   ```bash
   npm run server:prod
   ```

5. **Serve Frontend:**
   - Option A: Use server to serve static files
   - Option B: Deploy to CDN/hosting service

### Cloud Deployment (AWS, Heroku, etc.)

#### AWS EC2

1. **SSH into instance:**
   ```bash
   ssh -i your-key.pem ec2-user@your-instance-ip
   ```

2. **Install Node.js and MySQL:**
   ```bash
   curl -sL https://rpm.nodesource.com/setup_16.x | sudo bash -
   sudo yum install nodejs mysql
   ```

3. **Clone project and install:**
   ```bash
   git clone your-repo.git
   cd deals-dashboard
   npm run setup
   ```

4. **Configure environment:**
   ```bash
   # Edit server/.env.production with production values
   nano server/.env.production
   ```

5. **Start with PM2:**
   ```bash
   npm install -g pm2
   pm2 start server/server.js --name "crm-api" --env production
   pm2 startup
   pm2 save
   ```

#### Heroku Deployment

1. **Initialize git and add Heroku remote:**
   ```bash
   git init
   heroku create your-app-name
   ```

2. **Set environment variables:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set DB_HOST=your-db-host
   heroku config:set DB_USER=your-db-user
   heroku config:set DB_PASSWORD=your-db-password
   heroku config:set DB_NAME=deals_db_prod
   ```

3. **Deploy:**
   ```bash
   git push heroku main
   ```

#### Docker Deployment

**Dockerfile (server):**
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY server/package*.json ./

RUN npm install

COPY server/ .

ENV NODE_ENV=production

EXPOSE 5000

CMD ["npm", "start"]
```

**Dockerfile (client):**
```dockerfile
FROM node:16-alpine as build

WORKDIR /app

COPY client/package*.json ./

RUN npm install

COPY client/ .

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: your_password
      MYSQL_DATABASE: deals_db_prod
    volumes:
      - mysql_data:/var/lib/mysql

  api:
    build: ./server
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      DB_HOST: mysql
      DB_USER: root
      DB_PASSWORD: your_password
      DB_NAME: deals_db_prod
    depends_on:
      - mysql

  web:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - api

volumes:
  mysql_data:
```

---

## Environment-Specific Features

### Development

- ✅ Debug logging enabled
- ✅ Verbose error messages
- ✅ CORS from localhost
- ✅ Hot module reloading
- ✅ Source maps

### Production

- ✅ Optimized build
- ✅ Minimal logging
- ✅ Secure headers
- ✅ Error handling (user-friendly messages)
- ✅ Database connection pooling
- ✅ CORS restricted to domain

---

## Troubleshooting

### Issue: "Cannot find module 'mysql2'"

**Solution:**
```bash
cd server
npm install
```

### Issue: "Connection refused on port 5000"

**Solution:**
1. Check if server is running: `lsof -i :5000` (macOS/Linux)
2. Kill process if needed: `kill -9 <PID>`
3. Restart server: `npm run server`

### Issue: "Database connection error"

**Solution:**
1. Verify MySQL is running
2. Check credentials in `.env` file
3. Test connection: `mysql -h localhost -u root -p`
4. Ensure database exists: `mysql -e "SHOW DATABASES;"`

### Issue: "CORS error in browser"

**Solution:**
1. Check `CORS_ORIGIN` in `server/.env`
2. Ensure it matches your frontend URL
3. Restart server after changes

### Issue: "API URL not loading"

**Solution:**
1. Verify environment file exists: `client/.env.development`
2. Check `REACT_APP_API_URL` is set correctly
3. Restart frontend: `npm run client`
4. Clear browser cache: `Ctrl+Shift+Delete`

### Issue: "Environment variables not loading"

**Solution:**
1. Ensure `.env` files exist in correct location
2. Restart the server/client after editing `.env`
3. On Windows, use: `set NODE_ENV=production` before running

---

## Quick Reference

### Development Commands

```bash
# Full setup
npm run setup

# Start all services
npm start

# Start individual services
npm run server
npm run client

# Run tests
npm test
```

### Production Commands

```bash
# Build frontend
npm run build

# Start backend in production
NODE_ENV=production npm start

# Setup production database
NODE_ENV=production npm run setup
```

### Environment Files Checklist

- ✅ `server/.env.development` - Backend dev config
- ✅ `server/.env.production` - Backend prod config
- ✅ `client/.env.development` - Frontend dev config
- ✅ `client/.env.production` - Frontend prod config
- ✅ `.gitignore` includes `.env` files (don't commit credentials)

### API URL Configuration

- **Development:** `http://localhost:5000/api`
- **Production:** `https://api.yourdomain.com/api` (update as needed)

---

## Security Checklist

Before deploying to production:

- [ ] Remove `.env` files from git history
- [ ] Update database credentials
- [ ] Use HTTPS for all API calls
- [ ] Enable CORS only for your domain
- [ ] Set strong database passwords
- [ ] Use environment-specific secrets management
- [ ] Enable database backups
- [ ] Set up monitoring and logging
- [ ] Implement rate limiting on API endpoints
- [ ] Add authentication/authorization

---

## Support & Documentation

For additional help:
1. Check logs in server console
2. Review browser DevTools console
3. Verify MySQL connectivity
4. Check firewall settings for ports 3000, 5000
5. Review API endpoint documentation in `BACKEND_SETUP_GUIDE.md`

---

## File Structure Overview

```
deals-dashboard/
├── client/
│   ├── src/
│   │   ├── services/
│   │   │   └── api.js              # Centralized API service
│   │   ├── config/
│   │   │   └── environment.js      # Environment utilities
│   │   ├── components/              # React components
│   │   └── App.js
│   ├── .env.development
│   ├── .env.production
│   ├── .env.example
│   └── package.json
│
├── server/
│   ├── server.js                    # Express server with API endpoints
│   ├── setup-db.js                  # Database setup script
│   ├── .env.development
│   ├── .env.production
│   ├── .env.example
│   └── package.json
│
├── package.json                     # Root scripts
├── SETUP_ENVIRONMENTS.md           # This file
└── BACKEND_SETUP_GUIDE.md          # Detailed API documentation
```

---

## Version History

- **v1.0** - Initial setup with environment configuration
- **v1.1** - Added Docker deployment guide
- **v1.2** - Enhanced production security checklist
