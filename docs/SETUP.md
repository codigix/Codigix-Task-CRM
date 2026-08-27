# CRM Dashboard Setup Guide

## Project Structure
- `client/` - React frontend with Tailwind CSS & Lucide Icons
- `server/` - Node.js/Express backend
- `database.sql` - MySQL database schema with full CRM tables

## Prerequisites
- Node.js (v14 or higher)
- MySQL Server running locally
- npm or yarn

## Setup Instructions

### 1. Database Setup

Run the database schema script to create the database and tables:

```bash
mysql -u root -p < database.sql
```

Or manually:
1. Open MySQL command line
2. Copy and paste all commands from `database.sql`

This will create:
- `deals` table
- `companies` table
- `contacts` table
- `leads` table
- `pipeline` table

### 2. Server Setup

```bash
cd server
npm install
```

Create/verify `.env` file in the server directory:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=deals_db
PORT=5000
```

Update the DB credentials if necessary.

### 3. Client Setup

```bash
cd client
npm install
```

### 4. Running the Application

**Terminal 1 - Start the backend server:**
```bash
cd server
npm start
```

Server will run on `http://localhost:5000`

**Terminal 2 - Start the React frontend:**
```bash
cd client
npm start
```

Frontend will run on `http://localhost:3000`

## API Endpoints

### Deals
- `GET /api/deals` - Fetch all deals with company and contact info
- `POST /api/deals` - Create a new deal

### Contacts
- `GET /api/contacts` - Fetch all contacts with company info
- `POST /api/contacts` - Create a new contact

### Companies
- `GET /api/companies` - Fetch all companies
- `POST /api/companies` - Create a new company

### Leads
- `GET /api/leads` - Fetch all leads
- `POST /api/leads` - Create a new lead

### Pipeline
- `GET /api/pipeline` - Fetch all pipelines

## Features Implemented

✅ **Professional Sidebar** with collapsible navigation menus
✅ **Header/TopBar** with search, notifications, and profile menu
✅ **Deals Dashboard** with:
  - Recently Created Deals Table
  - Deals By Stage Bar Chart (Recharts)
  - Status badges (Won, Lost, Pending)
  - Currency formatting

✅ **Contacts Page** with:
  - Full contact list with search
  - Company associations
  - Contact status tracking
  - Position information

✅ **Companies Page** with:
  - Company directory with search
  - Industry categorization
  - Employee count & revenue tracking
  - Contact person display

✅ **Leads Page** with:
  - Lead management with status tracking
  - Star rating system
  - Lead source tracking
  - Qualification status

✅ **Full CRM Database** with:
  - Complete relational schema
  - Sample data for all tables
  - Foreign key relationships
  - Proper indexing

✅ Responsive design (mobile, tablet, desktop)
✅ Tailwind CSS styling
✅ Lucide React icons
✅ Real-time data fetching from backend

## File Structure

```
deals-dashboard/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.js
│   │   │   ├── Sidebar.js
│   │   │   ├── Header.js
│   │   │   ├── DealsDashboard.js
│   │   │   ├── RecentDealsTable.js
│   │   │   ├── DealsByStageChart.js
│   │   │   ├── ContactsPage.js
│   │   │   ├── CompaniesPage.js
│   │   │   └── LeadsPage.js
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.css
│   └── package.json
├── server/
│   ├── server.js
│   ├── .env
│   └── package.json
├── database.sql
└── SETUP.md
```

## Troubleshooting

**Port already in use:**
- Change the PORT in server/.env file
- Update the API URL in client components if needed (currently http://localhost:5000)

**Database connection error:**
- Check MySQL is running
- Verify credentials in .env file
- Ensure database.sql has been executed completely

**CORS errors:**
- Server CORS is configured to allow localhost:3000
- If running on different port, update server.js CORS configuration

**lucide-react not found:**
- Run `npm install lucide-react` in client directory

## Next Steps

- ✨ Add user authentication (JWT)
- 📝 Implement form modals for creating/editing records
- 📊 Add more detailed analytics and KPI cards
- 🔍 Implement advanced filtering and sorting
- 📥 Add export to CSV/PDF functionality
- 🔄 Implement real-time updates with WebSockets
- 🎨 Add dark mode toggle
- 📱 Implement progressive web app (PWA) features
