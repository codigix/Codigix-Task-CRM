# Quick Start Guide - CRM Dashboard

## 🚀 Get Running in 5 Minutes

### Step 1: Setup Database
```bash
mysql -u root -p < database.sql
```

### Step 2: Start Backend (Terminal 1)
```bash
cd server
npm install
npm start
```
✅ Server runs on `http://localhost:5000`

### Step 3: Start Frontend (Terminal 2)
```bash
cd client
npm install
npm start
```
✅ App opens on `http://localhost:3000`

---

## 📋 What's Included

### Dashboard Features
- **Deals Dashboard** - Track deals, stages, and win rates
- **Contacts** - Manage contacts with company associations
- **Companies** - Company directory with industry & employee tracking
- **Leads** - Lead management with qualification tracking

### UI Components
- Professional sidebar with navigation
- Header with search, notifications, and profile menu
- Responsive layout (mobile, tablet, desktop)
- Charts and data tables with Recharts
- Status badges and filtering

### Database
- 5 complete CRM tables with sample data
- Proper relationships and indexing
- Ready to extend with more functionality

---

## 🛠️ Tech Stack

**Frontend:**
- React 19
- Tailwind CSS
- Lucide Icons
- Recharts
- Axios

**Backend:**
- Express.js
- MySQL 2
- Node.js

---

## 📖 Pages Overview

### Deals Dashboard
- Recently created deals table
- Deals by stage bar chart
- Status tracking (Won, Lost, Pending)
- Deal value visualization

### Contacts
- Full contact list
- Search functionality
- Company & position info
- Contact status

### Companies
- Company directory
- Industry categorization
- Employee count tracking
- Revenue data

### Leads
- Lead management
- 5-star rating system
- Lead source tracking
- Lead status (New, Qualified, Contacted, Unqualified)

---

## 🔧 Default Credentials

**Database:**
- Host: localhost
- User: root
- Password: (empty)
- Database: deals_db

**API:**
- Base URL: `http://localhost:5000`
- CORS enabled for: `http://localhost:3000`

---

## 🎨 Key Files

```
client/src/components/
├── Layout.js          - Main layout wrapper
├── Sidebar.js         - Navigation sidebar
├── Header.js          - Top header with search & notifications
├── DealsDashboard.js  - Main deals dashboard
├── ContactsPage.js    - Contacts listing
├── CompaniesPage.js   - Companies listing
├── LeadsPage.js       - Leads listing
└── ...chart & table components

server/
├── server.js          - Express server with all API endpoints
├── .env              - Environment configuration
└── package.json
```

---

## 📊 Sample Data Included

- 5 Companies (SkyHigh Solutions, Enterprise Corp, etc.)
- 5 Contacts (John Anderson, Sarah Williams, etc.)
- 10 Deals (ranging from $414K to $7.2M)
- 5 Leads (with various qualification statuses)
- 4 Pipelines (Sales, Marketing, Email, Partnership)

---

## 🔍 Next Steps

1. **Explore the Dashboard** - Navigate through all pages
2. **Check the Data** - View contacts, companies, and deals
3. **Customize** - Modify colors, add your own branding
4. **Extend** - Add more features like forms, edit pages, etc.
5. **Deploy** - Use the deployed guide for production setup

---

## ⚠️ Troubleshooting

### Can't connect to database?
- Ensure MySQL is running
- Check credentials in `server/.env`
- Verify `database.sql` was imported

### Frontend shows blank/errors?
- Check browser console for errors
- Ensure backend is running on port 5000
- Clear browser cache and reload

### Port already in use?
- Change `PORT=5000` in `.env` to another port
- Update API URL in components if needed

---

## 💡 Tips

- Use the sidebar to navigate between pages
- Search functionality works on all list pages
- All data is live from the MySQL database
- Charts update automatically with data changes
- Mobile-friendly layout automatically activates on smaller screens

---

## 📞 Support

For issues or questions, check:
1. SETUP.md for detailed configuration
2. Browser console for JavaScript errors
3. Server logs in terminal for API errors
4. Database for data integrity

Happy Dashboard Building! 🎉
