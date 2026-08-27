# Campaign Form - Quick Start Guide

## ✅ Implementation Complete

A fully functional **"Add New Campaign"** form has been created with:
- ✓ Complete database integration (`campaigns` table)
- ✓ 5 working API endpoints (GET, POST, PUT, DELETE)
- ✓ Professional modal form matching screenshot
- ✓ Form validation and error handling
- ✓ File upload support (drag-and-drop)
- ✓ Data persistence to MySQL
- ✓ Real-time list updates

---

## 🚀 Quick Access

### Start Application
```bash
cd c:\All_IN_One\deals-dashboard
npm start
```

Client: `http://localhost:3000` (port 3000)
Server: `http://localhost:5000` (port 5000)

### Go to Campaign Page
1. Navigate to: `http://localhost:3000/campaign`
2. Or: Click **"Campaign"** in left sidebar

---

## 📋 Form Fields

| Field | Type | Required | Options/Notes |
|-------|------|----------|---------------|
| **Name** | Text | ✓ | Campaign title |
| **Campaign Type** | Dropdown | ✓ | Email, Social Media, Content, Brand, Sales, Media, PR, Product Launch |
| **Deal Value** | Number | ✓ | Numeric amount |
| **Currency** | Dropdown | ✓ | USD, EUR, GBP, CAD, AUD, INR |
| **Period** | Dropdown | ✓ | Daily, Weekly, Monthly, Quarterly, Yearly |
| **Period Value** | Text | ✓ | Duration (e.g., "3 months") |
| **Target Audience** | Tags | ✗ | Add multiple segments |
| **Description** | Textarea | ✓ | Campaign details |
| **Attachment** | File | ✗ | Max 50 MB, drag & drop supported |

---

## ⚡ Quick Test Steps

### Test 1: Create Campaign
1. Click "Add New Campaign"
2. Fill in all required fields:
   - Name: `Test Campaign`
   - Type: `Email Marketing`
   - Value: `50000`
   - Currency: `USD`
   - Period: `Monthly`
   - Period Value: `3`
   - Description: `Test campaign`
3. Click "Create"
4. ✓ Campaign saved, modal closes

### Test 2: Add Target Audience
1. Type: `Small Business`
2. Click "Add"
3. Add more: `Corporate`, `Startups`
4. See tags displayed
5. Remove tag: Click × on any tag

### Test 3: Upload File
1. Drag file into attachment zone
   OR
   Click "browse" button
2. Max 50 MB
3. File details shown
4. Remove with × button

### Test 4: View in Database
```sql
SELECT * FROM campaigns;
```

---

## 🔌 API Endpoints

All endpoints return JSON. Base URL: `http://localhost:5000/api`

### GET All Campaigns
```
GET /campaigns
Response: Array of campaigns
```

### Create Campaign
```
POST /campaigns
Content-Type: application/json

{
  "name": "Summer Sale",
  "campaign_type": "Email Marketing",
  "deal_value": 50000,
  "currency": "USD",
  "period": "Monthly",
  "period_value": "3 months",
  "target_audience": ["SMB", "Enterprise"],
  "description": "Summer campaign",
  "status": "Draft"
}

Response:
{
  "message": "Campaign created successfully",
  "id": 1
}
```

### Get Specific Campaign
```
GET /campaigns/:id
Response: Single campaign object
```

### Update Campaign
```
PUT /campaigns/:id
(Same payload as POST)
Response: { "message": "Campaign updated successfully" }
```

### Delete Campaign
```
DELETE /campaigns/:id
Response: { "message": "Campaign deleted successfully" }
```

---

## 📁 Key Files

```
client/src/
├── components/
│   ├── CrmCampaignPage.js        (Main page with button)
│   └── AddNewCampaignModal.js    (Form modal)
└── services/
    └── api.js                     (campaignAPI methods)

server/
├── server.js                      (API endpoints)
└── setup-campaign-tables.js       (DB table creation)
```

---

## ✨ Features Implemented

- **Form Validation**: Required fields checked
- **Error Handling**: User-friendly error messages
- **State Management**: Form state properly managed
- **Loading States**: Button shows "Creating..." during submission
- **Modal Design**: Smooth slide-in from right
- **Responsive**: Works on all screen sizes
- **Database**: Data persisted to MySQL
- **Real-time**: Campaign list updates after creation
- **File Upload**: Drag-and-drop file attachment
- **Tags System**: Add/remove audience segments

---

## 🧪 Test with API

### Using Node.js Script
```bash
node test-campaign-api.js
```

This tests:
1. GET all campaigns
2. POST create new campaign
3. GET specific campaign
4. PUT update campaign
5. DELETE campaign

### Expected Results
```
✓ All endpoints return 200 status
✓ New campaign created with ID
✓ Campaign data stored correctly
✓ Update modifies data
✓ Delete removes from database
```

---

## 🐛 Troubleshooting

### Campaign endpoint returns 404
**Solution**: Restart server
```bash
npm start
```

### Form won't submit
**Check**: 
- All required fields filled
- No console errors (press F12)
- Server running on port 5000

### File upload fails
**Check**:
- File size < 50 MB
- Supported format
- Check browser console for errors

### Database table doesn't exist
**Solution**: Run setup script
```bash
cd server
node setup-campaign-tables.js
```

### Data not persisting
**Check**:
- MySQL running
- Database `deals_db` exists
- `campaigns` table created
- Check server logs for SQL errors

---

## 📊 Test Data Created

When you run the test:

```json
{
  "name": "Summer Sales Campaign",
  "campaign_type": "Email Marketing",
  "deal_value": 50000,
  "currency": "USD",
  "period": "Monthly",
  "period_value": "3 months",
  "target_audience": "Small Business,Corporate Companies,Urban Apartment",
  "description": "Test campaign for summer products...",
  "status": "Draft",
  "created_at": "2025-12-02T12:38:57.000Z"
}
```

---

## 🎯 Next Actions

1. **Try the Form**
   - Navigate to `http://localhost:3000/campaign`
   - Click "Add New Campaign"
   - Fill fields and submit

2. **Check Database**
   ```sql
   SELECT COUNT(*) FROM campaigns;
   ```

3. **Monitor API**
   - Open DevTools (F12)
   - Network tab
   - Watch requests/responses

4. **Review Logs**
   - Server console shows API activity
   - Browser console shows form errors

---

## ✅ Status

- **Database**: Ready ✓
- **Backend APIs**: All working ✓
- **Frontend Form**: Fully functional ✓  
- **Integration**: Complete ✓
- **Testing**: Passed ✓
- **Documentation**: Complete ✓

**The campaign management feature is fully operational and ready to use!**

---

## 📞 Support

For detailed documentation, see:
- `CAMPAIGN_IMPLEMENTATION_COMPLETE.md` - Full technical details
- `PIPELINE_QUICK_START.md` - Similar feature reference
- Server logs - Check for errors
- Browser console - Client-side errors

**All features tested and verified working!**
