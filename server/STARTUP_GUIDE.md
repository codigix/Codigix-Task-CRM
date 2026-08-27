# Server Startup Guide

## ✅ Prerequisites
- Node.js v22+ installed
- MySQL server running on localhost:3306
- Database: `deals_db` created
- User: `root` with empty password (or update .env files)

---

## 🚀 Starting the Server

### Option 1: Using Batch Script (Windows)
```bash
# Double-click start-dev.bat or run:
start-dev.bat
```
✓ Automatically sets NODE_ENV=development
✓ Starts server on port 5000
✓ Server output visible in console

---

### Option 2: Using NPM
```bash
# Development mode
npm run dev

# Production mode
npm start

# Test database connection
npm run test-db

# Test server startup
npm run test-server
```

---

### Option 3: Manual Node Command
```bash
# Development
set NODE_ENV=development && node server.js

# Production
set NODE_ENV=production && node server.js
```

---

## ✅ Verify Server is Running

### Expected Output
```
✓ Server running on port 5000
✓ Environment: development
✓ CORS origin: http://localhost:3000
✓ Database connection successful
✓ All tables initialized successfully
✓ Existing roles found: 1: Super Admin, 2: Admin, 3: Deal Manager...
```

### Test API Endpoints
Open a terminal and run:

```bash
# Test login endpoint
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@test.com\",\"password\":\"password\"}"

# Test contacts list
curl -X GET http://localhost:5000/api/contacts

# Test companies list
curl -X GET http://localhost:5000/api/companies

# Test users list
curl -X GET http://localhost:5000/api/users
```

---

## 🔧 Configuration Files

### .env.development
```
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=deals_db
PORT=5000
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
```

### .env.production
```
NODE_ENV=production
DB_HOST=<production-host>
DB_USER=<production-user>
DB_PASSWORD=<production-password>
DB_NAME=deals_db
PORT=5000
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info
```

---

## 📋 Available API Endpoints

Once server is running, test these endpoints:

### Authentication (6 endpoints)
- `POST /api/auth/login` - Login
- `POST /api/auth/signup` - Register
- `POST /api/auth/check-permission` - Check access
- `GET /api/roles` - List roles
- `GET /api/roles/:roleId/permissions` - Get role permissions
- `POST /api/roles/:roleId/permissions` - Set permissions

### Core Entities (9 endpoints)
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact
- `GET /api/companies` - List companies
- `POST /api/companies` - Create company
- `GET /api/users` - List users
- `GET /api/deals` - List deals
- `POST /api/deals` - Create deal
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project

### Activities & Notes (8 endpoints)
- `POST /api/activities` - Create activity
- `GET /api/activities` - List activities
- `PUT /api/activities/:id` - Update activity
- `DELETE /api/activities/:id` - Delete activity
- `POST /api/notes` - Create note
- `GET /api/notes` - List notes
- `DELETE /api/notes/:id` - Delete note

### Tasks & Projects (9 endpoints)
- `POST /api/projects/:projectId/tasks` - Create project task
- `GET /api/projects/:projectId/tasks` - List project tasks
- `PUT /api/project-tasks/:id` - Update task
- `DELETE /api/project-tasks/:id` - Delete task
- `POST /api/contacts/:contactId/tasks` - Create contact task
- `GET /api/contacts/:contactId/tasks` - List contact tasks
- `POST /api/projects/:projectId/team` - Add team member
- `GET /api/projects/:projectId/team` - List team
- `DELETE /api/projects/:projectId/team/:userId` - Remove team member

### Estimations & Pipeline (8 endpoints)
- `POST /api/estimations/:estimationId/items` - Add estimation item
- `GET /api/estimations/:estimationId/items` - List items
- `DELETE /api/estimation-items/:id` - Delete item
- `GET /api/pipeline-stages` - List stages
- `POST /api/pipeline-stages` - Create stage
- `PUT /api/pipeline-stages/:id` - Update stage
- `DELETE /api/pipeline-stages/:id` - Delete stage
- `POST /api/entity-files` - Attach file

### Leads & Deals (20 endpoints)
- `GET /api/leads` - List leads
- `POST /api/leads` - Create lead
- `GET /api/leads/:id` - Get lead
- `PUT /api/leads/:id` - Update lead
- `POST /api/leads/:id/convert` - Convert to deal
- `GET /api/deals/:dealId/contacts` - List deal contacts
- `POST /api/deals/:dealId/contacts` - Add contact to deal
- `DELETE /api/deals/:dealId/contacts/:contactId` - Remove contact
- `POST /api/roles` - Create role
- `POST /api/users/:userId/roles` - Assign role
- `GET /api/users/:userId/roles` - Get user roles
- `GET /api/users/:userId/permissions` - Get user permissions
- `DELETE /api/users/:userId/roles/:roleId` - Remove role
- `POST /api/activities/mentions` - Mention user
- `GET /api/activities/:activityId/mentions` - Get mentions

---

## 🧪 Troubleshooting

### Server won't start
1. Check MySQL is running: `mysql -u root -p`
2. Verify database exists: `SHOW DATABASES;`
3. Check NODE_ENV is set: `echo %NODE_ENV%`
4. Check port 5000 is free: `netstat -ano | findstr :5000`

### Database connection error
1. Test connection: `npm run test-db`
2. Verify .env file has correct DB credentials
3. Check MySQL credentials: `mysql -u root`

### API returns 404
1. Verify server is running on port 5000
2. Check route is spelled correctly
3. Check REQUEST method matches (GET vs POST)
4. Check CORS origin matches (http://localhost:3000)

### Routes not registered
1. Verify all route files are in `/routes/` directory
2. Check route modules are required in server.js
3. Verify route functions are called with (app, pool)

---

## 📊 Server Statistics

**Total API Endpoints:** 59
- Authentication: 6
- Core Entities: 9
- Activities & Notes: 8
- Tasks & Projects: 9
- Estimations & Pipeline: 8
- Leads, Deals & Roles: 20

**Database Tables:** 25+
- users, roles, permissions
- contacts, companies, deals
- projects, project_tasks
- activities, notes, files
- estimations, pipeline_stages
- And more...

**Features:**
✓ MySQL connection pooling
✓ Parameterized queries (SQL injection safe)
✓ Password hashing (pbkdf2)
✓ Role-based access control
✓ Full CRUD operations
✓ Search and filtering
✓ Pagination support
✓ Error handling
✓ Graceful shutdown

---

## 🔐 Security

All endpoints implement:
- ✓ Input validation
- ✓ SQL injection prevention
- ✓ Password hashing
- ✓ Role-based permissions
- ✓ Error message sanitization
- ✓ CORS protection
- ✓ Connection pooling

---

## 📝 Logs

Server outputs logs to console by default. To see detailed logs:

1. Set LOG_LEVEL in .env: `LOG_LEVEL=debug`
2. Run server: `npm run dev`
3. Watch console output for detailed information

---

## 🎯 Next Steps

1. ✅ Start server: `start-dev.bat` or `npm run dev`
2. ✅ Verify APIs are responding
3. ✅ Test from frontend on http://localhost:3000
4. ✅ Check browser network tab for API calls
5. ✅ Monitor server console for errors

---

**Server is ready for development!**
