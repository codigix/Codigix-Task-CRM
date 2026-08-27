# CRM Dashboard - Complete Setup Guide

## ✅ Database Setup Complete

Your database has been successfully initialized with:
- **5 Companies** (SkyHigh Solutions, Enterprise Corp, Tech Innovations, Global Industries, StartUp Ventures)
- **5 Contacts** (linked to companies)
- **15 Deals** with proper stages and statuses
- **5 Leads** for lead tracking
- **4 Sales Pipelines**

### Sample Deal Data
All deals are populated with realistic business scenarios matching the Preadmin template:

| Deal Name | Stage | Value | Status |
|-----------|-------|-------|--------|
| SkyHigh Annual Booking | Appointment | $5,451,000 | Won |
| CRM Onboarding Package | Contact Made | $7,214,078 | Lost |
| Enterprise Plan Upgrade | Presentation | $414,800 | Won |
| CRM Migration Project | Proposal Made | $1,611,400 | Won |
| Sales Pipeline Optimization | Qualify To Buy | $905,947 | Won |
| Tech Solutions Integration | Inpipeline | $2,150,000 | Pending |
| Cloud Services Migration | Follow Up | $1,850,000 | Lost |
| Digital Transformation | Conversation | $3,200,000 | Won |
| API Integration Suite | Inpipeline | $1,250,000 | Won |
| Marketing Automation | Conversation | $1,800,000 | Pending |

## 🚀 Starting the Application

### Option 1: Automated Setup (Recommended)
```bash
cd deals-dashboard
npm install
npm run setup
npm start
```

### Option 2: Manual Setup

#### 1. Install Dependencies
```bash
cd deals-dashboard/server
npm install

cd ../client
npm install
```

#### 2. Setup Database
```bash
cd server
node setup-db.js
```

#### 3. Start Server (Terminal 1)
```bash
cd server
npm start
# Server will run on http://localhost:5000
```

#### 4. Start React Client (Terminal 2)
```bash
cd client
npm start
# App will open at http://localhost:3000
```

## 📊 Dashboard Features

### Charts & Visualizations
- **Recently Created Deals** - Table with 5 latest deals
- **Deals By Stage** - Bar chart showing deal distribution
- **Lost Deals Stage** - Horizontal bar chart (Red)
- **Won Deals Stage** - Horizontal bar chart (Green)
- **Deals by Year** - Line chart with monthly trends

### Navigation
- **Sidebar**: Full menu with 20+ navigation items
- **Main Menu**: Dashboard, Leads Dashboard, Project Dashboard
- **CRM Section**: Contacts, Companies, Deals, Leads, Pipeline, etc.
- **Header**: Search, notifications, user profile

### Pages Available
1. **Deals Dashboard** (default) - with all charts
2. **Contacts Page** - view all contacts
3. **Companies Page** - view all companies
4. **Leads Page** - view all leads

## 🔧 API Endpoints

All endpoints return JSON data from MySQL:

### GET Endpoints
- `GET /api/deals` - List all deals with company/contact info
- `GET /api/contacts` - List all contacts with company association
- `GET /api/companies` - List all companies
- `GET /api/leads` - List all leads
- `GET /api/pipeline` - List all pipelines

### POST Endpoints
- `POST /api/deals` - Create new deal
- `POST /api/contacts` - Create new contact
- `POST /api/companies` - Create new company
- `POST /api/leads` - Create new lead

## 📝 Database Schema

### Companies Table
- id, company_name, industry, email, phone, website, employee_count, status, timestamps

### Contacts Table
- id, first_name, last_name, email, phone, company_id, position, status, timestamps

### Deals Table
- id, deal_name, company_id, contact_id, stage, deal_value, status, probability, timestamps

### Leads Table
- id, lead_name, email, phone, company, lead_source, lead_status, rating, timestamps

### Pipeline Table
- id, name, description, total_deals, total_value, timestamps

## 🎨 Styling

The UI matches Preadmin CRM template with:
- Exact padding: `p-2` for cards
- Subtle shadows: ` border border-border-light`
- Light borders: `gray-100` instead of `gray-200`
- Proper spacing between components
- Responsive grid layout (1 col mobile, 2 col desktop)

## ⚙️ Configuration

### Server (.env)
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=backend
DB_NAME=deals_db
PORT=5000
```

### Client Config
- React 18 with Tailwind CSS
- Lucide React icons
- Recharts for data visualization
- Axios for API calls

## 🐛 Troubleshooting

### Error: "Failed to fetch deals"
**Solution**: Make sure:
1. MySQL is running on localhost
2. Server is running on port 5000: `npm start` from server directory
3. Database is initialized: `node setup-db.js`

### Error: "Unknown database 'deals_db'"
**Solution**: Run the database setup script:
```bash
cd server
node setup-db.js
```

### Port already in use
If port 5000 is already in use:
```bash
# Kill processes
taskkill /F /IM node.exe

# Or change port in .env
```

## 📦 Deployment

### Production Build
```bash
cd client
npm run build
# Output in build/ folder
```

### API Deployment
- Use Node.js hosting (Heroku, Railway, Render)
- Update MySQL connection string in .env
- Set environment variables in hosting platform

## ✨ Next Steps

1. **Authentication**: Implement JWT-based login
2. **Search**: Add real search across all pages
3. **Filters**: Add date range and status filters
4. **Export**: Add CSV/PDF export for reports
5. **Real-time**: WebSocket updates for live data
6. **Mobile**: Optimize for mobile devices

## 📞 Support

For issues or questions, check:
- API logs: `npm start` shows real-time errors
- Browser console: Check for frontend errors
- MySQL logs: Verify database operations

---

**Dashboard Status**: ✅ Ready to Use
**Last Updated**: 2025-11-26
**Build Status**: Successfully Compiled
