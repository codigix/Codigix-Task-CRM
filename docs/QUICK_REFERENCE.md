# Quick Reference Card

## 🚀 Start Here

```bash
# Complete setup in one command
npm run setup

# Then run the app
npm start
```

Done! Open http://localhost:3000

---

## 📊 What You Get

| Component | Status | Details |
|-----------|--------|---------|
| Recently Created Deals | ✅ | 5 latest deals with company info |
| Deals By Stage | ✅ | Vertical bar chart |
| Lost Deals Chart | ✅ | Red horizontal bars |
| Won Deals Chart | ✅ | Green horizontal bars |
| Deals by Year | ✅ | Orange line chart |
| Sidebar Navigation | ✅ | 20+ menu items |
| Header Bar | ✅ | Search, notifications, profile |
| Contacts Page | ✅ | Full contact directory |
| Companies Page | ✅ | Company list with details |
| Leads Page | ✅ | Lead tracking with ratings |

---

## 💾 Database

**Automatically Created & Populated**

- 5 Companies
- 5 Contacts  
- 15 Deals ($414K-$7.2M)
- 5 Leads
- 4 Pipelines

---

## 🔗 Access Points

| Service | URL | Port |
|---------|-----|------|
| React App | http://localhost:3000 | 3000 |
| API Server | http://localhost:5000 | 5000 |
| MySQL | localhost | 3306 |

---

## ⚡ Common Commands

```bash
# In project root
npm run setup      # One-time setup
npm start          # Run everything
npm run server     # Just backend
npm run client     # Just frontend
npm run build      # Production build
npm test           # Test API

# In server folder
npm run setup      # Initialize database
npm start          # Start API

# In client folder
npm start          # Start React dev server
npm run build      # Build for production
```

---

## 🎯 Deal Data Included

| Deal | Value | Status | Stage |
|------|-------|--------|-------|
| SkyHigh Annual Booking | $5.4M | Won | Appointment |
| CRM Onboarding | $7.2M | Lost | Contact Made |
| Enterprise Plan | $414K | Won | Presentation |
| CRM Migration | $1.6M | Won | Proposal Made |
| Sales Optimization | $905K | Won | Qualify To Buy |
| Tech Solutions | $2.1M | Pending | Inpipeline |
| Cloud Migration | $1.8M | Lost | Follow Up |
| Digital Transform | $3.2M | Won | Conversation |
| API Integration | $1.2M | Won | Inpipeline |
| Marketing Automation | $1.8M | Pending | Conversation |

---

## 🎨 Design Features

✨ **Matches Preadmin CRM Template 100%**
- Professional card styling
- Proper spacing and padding
- Light subtle borders
- Color-coded status badges
- Responsive layout

---

## 🔴 Troubleshooting

### Error: 500 Internal Server Error
```
✓ Database setup: npm run setup
✓ Server running: npm start (in server folder)
✓ MySQL running: Check Windows Services
```

### Error: Cannot find module
```
npm install
```

### Port Already in Use
```
taskkill /F /IM node.exe
```

---

## 📁 Project Structure

```
deals-dashboard/
├── server/                  # Node.js/Express backend
│   ├── server.js           # API routes
│   ├── setup-db.js         # Database init
│   └── .env               # Config
├── client/                  # React frontend
│   ├── src/components/     # All UI components
│   └── public/             # Static files
├── README.md               # Full documentation
└── SETUP_COMPLETE.md       # Setup guide
```

---

## 🔌 API Endpoints (Fast Reference)

```
GET  /api/deals       - All deals
POST /api/deals       - Create deal
GET  /api/contacts    - All contacts
POST /api/contacts    - Create contact
GET  /api/companies   - All companies
GET  /api/leads       - All leads
GET  /api/pipeline    - All pipelines
```

---

## 🎯 Next Time Setup is Faster

Once setup is done:
```bash
# Just run this
npm start

# That's it!
# Server: http://localhost:5000
# App: http://localhost:3000
```

---

**Created**: November 26, 2025  
**Status**: ✅ Ready to Use  
**Tech Stack**: React | Node.js | MySQL | Recharts | Tailwind
