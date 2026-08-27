# CRM Dashboard - Professional Deals Management System

A full-stack CRM dashboard built with **React**, **Node.js/Express**, and **MySQL**, designed to match the Preadmin CRM template exactly.

## 🎯 Features

### Dashboard Components
- ✅ **Recently Created Deals** - Table showing latest 5 deals
- ✅ **Deals By Stage** - Bar chart visualization
- ✅ **Lost Deals** - Red horizontal bar chart
- ✅ **Won Deals** - Green horizontal bar chart  
- ✅ **Deals by Year** - Line chart showing trends

### Navigation
- **Sidebar** - 20+ menu items with collapsible sections
- **Header** - Search, notifications, user profile
- **Pages** - Contacts, Companies, Deals, Leads, Pipeline

### Data Management
- 15 sample deals with proper stages and statuses
- 5 companies across industries
- 5 contacts linked to companies
- 5 leads with ratings and sources
- 4 sales pipelines

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MySQL 5.7+ running on localhost:3306
- npm or yarn

### 1. One-Command Setup
```bash
npm run setup
```

This will:
- Install server dependencies
- Install client dependencies
- Create and populate MySQL database
- Get everything ready to run

### 2. Start the Application
```bash
npm start
```

This runs both server and client simultaneously:
- **Server**: http://localhost:5000
- **Client**: http://localhost:3000

### 3. Manual Alternative
```bash
# Terminal 1: Server
cd server
npm install
npm run setup
npm start

# Terminal 2: Client
cd client
npm install
npm start
```

## 📊 Dashboard Preview

```
┌────────────────────────────────────────────────┐
│  Deals Dashboard          [Date Range Filter]   │
├────────────────────────────────────────────────┤
│ Recently Created Deals  │  Deals By Stage      │
│ ┌──────────────────────┴──────────────────────┐│
│ │ Deal Name │ Stage │ Value │ Status │ │
│ ├──────────────────────────────────────────────┤│
│ │ SkyHigh Annual Booking │ Appointment │ ... │ │
│ │ CRM Onboarding Package │ Contact Made│ ... │ │
│ └──────────────────────────────────────────────┘│
├────────────────────────────────────────────────┤
│  Lost Deals Stage      │  Won Deals Stage      │
│  (Red Chart)           │  (Green Chart)        │
├────────────────────────────────────────────────┤
│        Deals by Year (Full Width)              │
│        (Orange Line Chart)                     │
└────────────────────────────────────────────────┘
```

## 🏗️ Architecture

### Frontend (React)
```
client/src/
├── components/
│   ├── Layout.js                 # Main layout wrapper
│   ├── Sidebar.js                # Navigation menu
│   ├── Header.js                 # Top bar with search/notifications
│   ├── DealsDashboard.js         # Main dashboard
│   ├── RecentDealsTable.js       # Deals table
│   ├── DealsByStageChart.js      # Bar chart
│   ├── LostDealsChart.js         # Red horizontal chart
│   ├── WonDealsChart.js          # Green horizontal chart
│   ├── DealsByYearChart.js       # Line chart
│   ├── ContactsPage.js           # Contacts list
│   ├── CompaniesPage.js          # Companies list
│   └── LeadsPage.js              # Leads list
└── App.js                        # Router & state management
```

### Backend (Node.js/Express)
```
server/
├── server.js                     # API server
├── .env                          # Database credentials
├── setup-db.js                   # Database initialization
└── package.json
```

### Database (MySQL)
```
deals_db/
├── companies                     # 5 sample companies
├── contacts                      # 5 sample contacts
├── deals                         # 15 sample deals
├── leads                         # 5 sample leads
└── pipeline                      # 4 sales pipelines
```

## 📡 API Endpoints

### Deals
- `GET /api/deals` - Get all deals
- `POST /api/deals` - Create new deal

### Contacts
- `GET /api/contacts` - Get all contacts
- `POST /api/contacts` - Create new contact

### Companies
- `GET /api/companies` - Get all companies
- `POST /api/companies` - Create new company

### Leads
- `GET /api/leads` - Get all leads
- `POST /api/leads` - Create new lead

### Pipeline
- `GET /api/pipeline` - Get all pipelines

## 🎨 Styling Details

Exact Preadmin CRM template styling:
- **Cards**: ` border border-border-light`
- **Padding**: `p-2` on card bodies
- **Table rows**: `py-4` height
- **Borders**: `border-gray-100` (light)
- **Headers**: Light gray background
- **Status badges**: Color-coded (Green=Won, Red=Lost, Yellow=Pending)

## 🗄️ Database Schema

### Companies
```sql
id, company_name, industry, email, phone, website, 
employee_count, status, created_at, updated_at
```

### Contacts
```sql
id, first_name, last_name, email, phone, company_id,
position, status, created_at, updated_at
```

### Deals
```sql
id, deal_name, company_id, contact_id, stage, deal_value,
status, probability, created_at, updated_at
```

### Leads
```sql
id, lead_name, email, phone, company, lead_source,
lead_status, rating, created_at, updated_at
```

### Pipeline
```sql
id, name, description, total_deals, total_value, created_at
```

## 🔧 Configuration

### Server (.env)
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=backend
DB_NAME=deals_db
PORT=5000
```

### React Config
- Tailwind CSS for styling
- Lucide React for icons
- Recharts for charts
- Axios for API calls

## 📋 Sample Data

### Deal Stages
- Appointment
- Contact Made
- Presentation
- Proposal Made
- Qualify To Buy
- Inpipeline
- Follow Up
- Conversation

### Deal Statuses
- Won (10 deals)
- Lost (3 deals)
- Pending (2 deals)

### Deal Values
- Ranges from $414,800 to $7,214,078
- Mix of small, medium, and enterprise deals

## 🛠️ Available Commands

```bash
# Root directory
npm run setup          # Complete setup (install + DB init)
npm start              # Run both server & client
npm run server         # Run only server
npm run client         # Run only client
npm run build          # Build React for production
npm test               # Test API endpoints

# Server directory
npm start              # Start API server
npm run setup          # Initialize database
npm test               # Test API

# Client directory
npm start              # Start React dev server
npm run build          # Build for production
npm test               # Run tests
```

## 🐛 Troubleshooting

### "Failed to fetch deals" Error
**Solution**: 
1. Verify MySQL is running: `mysql -u root -p`
2. Check server is running: `npm start` in server folder
3. Initialize database: `npm run setup` in server folder

### "Unknown database 'deals_db'"
**Solution**: Run database setup
```bash
cd server
npm run setup
```

### Port 5000 Already in Use
**Solution**:
```bash
# Windows
taskkill /F /IM node.exe

# Or modify .env
DB_PORT=5000
```

### MySQL Password Error
**Solution**: Update server/.env
```
DB_PASSWORD=your_actual_password
```

## 📦 Dependencies

### Frontend
- react@18
- react-dom@18
- axios@1.6
- recharts@2.10
- lucide-react@0.378
- tailwindcss@3.4

### Backend
- express@5.1
- mysql2@3.15
- cors@2.8
- dotenv@17.2
- body-parser@2.2

## 🎓 Learning Resources

This project demonstrates:
- ✅ React component architecture
- ✅ State management with hooks
- ✅ REST API design
- ✅ MySQL database design
- ✅ Responsive UI with Tailwind
- ✅ Data visualization with Recharts
- ✅ CORS and API integration
- ✅ Environment configuration

## 🚀 Deployment

### Frontend Deployment (Vercel/Netlify)
```bash
npm run build
# Upload build/ folder
```

### Backend Deployment
- Use Railway, Heroku, or AWS
- Set environment variables in platform
- Update React API URL to production

### Database Deployment
- Use AWS RDS, DigitalOcean, or Planetscale
- Update connection string in .env

## 📝 License

MIT License - feel free to use and modify

## 🤝 Contributing

Feel free to fork, modify, and submit pull requests

## 💡 Future Enhancements

- [ ] User authentication (JWT)
- [ ] Advanced filtering and search
- [ ] Export to CSV/PDF
- [ ] Real-time notifications (WebSocket)
- [ ] Mobile app version
- [ ] Advanced reporting
- [ ] Multi-user collaboration
- [ ] Dark mode

---

**Status**: ✅ Production Ready  
**Last Updated**: November 26, 2025  
**Build Version**: 1.0.0
