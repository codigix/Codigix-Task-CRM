# Quick Start Guide

Get your CRM Dashboard up and running in minutes!

## Prerequisites

- Node.js v14+
- MySQL Server
- Git

## 1-Minute Setup

### Windows Users

```bash
# Navigate to project directory
cd deals-dashboard

# Run full setup
npm run setup

# Start everything
npm start
```

### macOS/Linux Users

```bash
# Navigate to project directory
cd deals-dashboard

# Run full setup
npm run setup

# Start everything
npm start
```

## Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api

## What Was Set Up?

✅ MySQL database created and populated with sample data
✅ Backend server running on port 5000
✅ Frontend React app running on port 3000
✅ API service layer configured
✅ CORS enabled for local development

## Available Commands

```bash
# Development
npm start              # Start backend + frontend
npm run server         # Backend only
npm run client         # Frontend only

# Build
npm run build          # Build for production

# Database
cd server && npm run setup   # Reset database

# Testing
npm test              # Run tests
```

## Default Credentials

**Database:**
- Host: localhost
- User: root
- Password: backend
- Database: deals_db

## Environment Files

Development environment is pre-configured in:
- `client/.env.development`
- `server/.env.development`

For production, see: **SETUP_ENVIRONMENTS.md**

## Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :5000
kill -9 <PID>
```

### Database Connection Error
1. Ensure MySQL is running
2. Check credentials in `server/.env.development`
3. Restart server

### API Not Loading
1. Check backend is running on port 5000
2. Check `REACT_APP_API_URL` in `client/.env.development`

## Next Steps

1. Explore the dashboard at http://localhost:3000
2. Check API endpoints at http://localhost:5000/api/companies
3. Read full setup guide: **SETUP_ENVIRONMENTS.md**
4. Review API documentation: **BACKEND_SETUP_GUIDE.md**

## Need Help?

1. Check the logs in terminal
2. Review SETUP_ENVIRONMENTS.md for detailed configuration
3. Verify all prerequisites are installed

---

**Tip:** Keep this guide handy and refer to SETUP_ENVIRONMENTS.md for advanced configuration!
