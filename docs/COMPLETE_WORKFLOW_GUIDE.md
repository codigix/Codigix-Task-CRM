# 🎯 Complete CRM Workflow Guide

**Last Updated:** December 6, 2025  
**Status:** ✅ All Workflows Operational

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Lead Conversion Workflow](#lead-conversion-workflow)
3. [Deal Pipeline Workflow](#deal-pipeline-workflow)
4. [Campaign Management](#campaign-management)
5. [Proposal & Estimate Workflow](#proposal--estimate-workflow)
6. [Project & Invoice Management](#project--invoice-management)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The CRM system implements a complete sales pipeline workflow:

```
Lead → Contact/Company → Deal → Pipeline Movement → Proposal → Invoice
```

### Key Features

- ✅ **Lead Management**: Create, track, and qualify leads
- ✅ **Lead Conversion**: Convert leads to Contact, Company, or Deal
- ✅ **Pipeline Management**: Kanban-style deal tracking
- ✅ **Campaign Tracking**: Monitor marketing campaign performance
- ✅ **Proposal Generation**: Create proposals from deals
- ✅ **Invoice Management**: Generate and track invoices
- ✅ **Real-time Relationships**: All entities linked and synchronized

---

## Lead Conversion Workflow

### **STEP 1: Create a Lead**

**Path:** `http://localhost:3000/leads` → "Add New Lead"

**Form Fields:**
```
Lead Name:        ✓ Required
Email:            ✓ Required
Phone:            Optional
Company:          Optional
Lead Source:      Website, LinkedIn, Referral, Cold Call, etc.
Status:           Default = "New"
Rating:           1-5 stars
Notes:            Optional
```

**Example:**
```json
{
  "name": "Sarah Johnson - Website Redesign",
  "email": "sarah.johnson@websitecos.com",
  "phone": "555-1234",
  "company": "Website Innovations Inc",
  "source": "LinkedIn",
  "status": "New",
  "rating": 5,
  "description": "High-priority client needs website redesign"
}
```

**API Endpoint:**
```bash
POST /api/leads
```

---

### **STEP 2: View Lead Details**

**Path:** `http://localhost:3000/leads` → Click on Lead Name

**Details Page Shows:**
- Lead information (name, email, phone, company)
- Lead status with progression flowchart
- Rating system
- Status change dropdown
- Edit & Delete buttons
- Three conversion options

---

### **STEP 3: Update Lead Status**

**Status Progression:**
```
New → Contacted → Qualified → [Unqualified or Convert]
```

**To Update:**
1. Click lead name to open details page
2. Use status dropdown to change status
3. Status updates immediately

**API Endpoint:**
```bash
PUT /api/leads/{id}
{
  "status": "Contacted"
}
```

---

### **STEP 4: Convert Lead to Contact**

**When:** Lead is qualified and represents a person

**API Endpoint:**
```bash
POST /api/leads/{id}/convert-to-contact
```

**Request Body:**
```json
{
  "first_name": "Sarah",
  "last_name": "Johnson",
  "company_id": 7,
  "position": "Marketing Director",
  "status": "Active"
}
```

**Auto-filled Fields:**
- Email (from lead)
- Phone (from lead)

**Result:**
- ✅ Contact created in database
- ✅ Linked to company (if specified)
- ✅ Ready for deal creation

---

### **STEP 5: Convert Lead to Company**

**When:** Lead represents an organization

**API Endpoint:**
```bash
POST /api/leads/{id}/convert-to-company
```

**Request Body:**
```json
{
  "company_name": "Website Innovations Inc",
  "industry": "Digital Services",
  "website": "www.webinnovations.com",
  "address": "456 Tech Boulevard, San Jose, CA"
}
```

**Auto-filled Fields:**
- Email (from lead)
- Phone (from lead)

**Result:**
- ✅ Company created in database
- ✅ All contact info preserved
- ✅ Ready for contact creation

---

### **STEP 6: Convert Lead to Deal**

**When:** Lead is ready to move into sales pipeline

**API Endpoint:**
```bash
POST /api/leads/{id}/convert-to-deal
```

**Request Body:**
```json
{
  "deal_name": "Website Redesign Project",
  "deal_value": 5000,
  "currency": "USD",
  "company_id": 7,
  "contact_id": 10,
  "pipeline": "Sales",
  "status": "New",
  "description": "Complete website redesign"
}
```

**Result:**
- ✅ Deal created with $5,000 value
- ✅ Linked to Company (ID: 7)
- ✅ Linked to Contact (ID: 10)
- ✅ Added to Sales pipeline
- ✅ Ready for pipeline movement

---

## Deal Pipeline Workflow

### **Pipeline Stages**

```
New → Proposal → Negotiation → Closed Won
             ↘ Closed Lost
```

### **STEP 7: View Deal Pipeline (Kanban Board)**

**Path:** `http://localhost:3000/crm/deals` (or CRM → Deal Pipeline)

**Board Features:**
- Kanban columns by stage
- Drag & drop deals between stages
- Deal cards showing:
  - Deal name
  - Deal value ($5K format)
  - Company name
  - Priority badge
- Stage totals

---

### **STEP 8: Move Deal Through Pipeline**

#### **Option A: Drag & Drop (Recommended)**
1. Open Kanban board
2. Find deal in current stage
3. Drag to next stage
4. Deal updates automatically in database

#### **Option B: Via Deal Details Page**
1. Click deal name to open details
2. Use "Current Stage" dropdown
3. Select new stage
4. Saves automatically

#### **Option C: API Call**
```bash
PUT /api/deals/{id}
{
  "pipeline": "Proposal"
}
```

---

### **STEP 9: Update Win Probability**

**Purpose:** Track confidence level as deal progresses

**How to Update:**
1. Open Deal Details page
2. Use "Win Probability" slider
3. Adjust percentage (0-100%)
4. Auto-saves

**Auto-Calculated by Stage:**
- New: 25%
- Proposal: 50%
- Negotiation: 75%
- Closed Won: 100%
- Closed Lost: 0%

---

### **STEP 10: Close Deal as Won**

**To Mark as Closed Won:**
1. Move deal to "Closed Won" stage
2. Set probability to 100%
3. Update status to "Won"

**Results:**
- ✅ Deal marked as closed
- ✅ Revenue recognized
- ✅ Can trigger project creation (optional)
- ✅ Ready for invoice generation

---

## Campaign Management

### **STEP 11: View Campaign Dashboard**

**Path:** `http://localhost:3000/campaign`

**Dashboard Shows:**
- **Dynamic Stats** (calculated from actual campaigns)
  - Total Campaigns
  - Active Campaigns
  - Completed Campaigns
  - Paused Campaigns

- **Campaign Table** with:
  - Campaign name & type
  - Progress metrics
  - Team members
  - Status badges
  - Date range

---

### **Campaign Stats Calculation**

Stats are now **dynamically calculated** from campaign data:

```javascript
Total Campaigns = All campaigns in system
Active Campaigns = Campaigns with "Running" or "Active" status
Completed Campaigns = Campaigns with "Success" or "Completed" status
Paused Campaigns = Campaigns with "Paused" status

Percentages = (Count / Total) × 100
```

**Example:**
- If you have 8 campaigns total
- 2 are active → "Sent: 2 (+25.0%)"
- 3 are completed → "Opened: 3 (+37.5%)"
- 1 is paused → "Completed: 1 (+12.5%)"

---

### **STEP 12: Create New Campaign**

**Path:** Campaign page → "Add New Campaign"

**Form Fields:**
```
Campaign Name:    ✓ Required
Campaign Type:    Email, Social, Content, etc.
Description:      ✓ Required
Period:           Days, Weeks, Months
Budget:           Optional
Status:           Draft, Running, Paused, Completed
```

---

## Proposal & Estimate Workflow

### **STEP 13: Create Proposal from Deal**

**Path:** Deal Details page → "Create Proposal"

**Proposal Details:**
- Proposal title
- Auto-linked to deal
- Amount: From deal value
- Items/services breakdown
- Terms & conditions
- Validity period

**To Create:**
1. Open closed deal with value
2. Click "Create Proposal"
3. Fill proposal details
4. Add line items
5. Save & send to client

---

### **STEP 14: Create Estimate**

**Path:** CRM → Estimations → "Add Estimate"

**Estimate Form:**
```
Estimate #:       AUTO (EST-YYYY-###)
Project Name:     ✓ Required
Items:            
  - Description
  - Quantity
  - Unit Price
  - Line Total
Client:           ✓ Required (dropdown)
Valid Until:      Date picker
```

**To Create:**
1. Navigate to Estimations page
2. Click "Add Estimate"
3. Enter estimate details
4. Add cost line items
5. Save estimate
6. Send to client for approval

---

## Project & Invoice Management

### **STEP 15: Create Project from Deal**

**When Deal is Closed Won:**
1. Open Deal Details
2. Click "Convert to Project"
3. Fill project details:
   - Project name
   - Start date
   - End date (auto-calculated from duration)
   - Team members
   - Description

**Project Creation:**
- Auto-linked to deal
- Budget inherited from deal value
- Team assigned
- Tasks can be added
- Timeline tracking

---

### **STEP 16: Add Project Tasks**

**Path:** Project Details → "Tasks" tab → "Add Task"

**Task Form:**
```
Task Title:       ✓ Required
Description:      Optional
Assigned To:      ✓ Required (team member)
Due Date:         ✓ Required
Priority:         High, Medium, Low
Status:           Open, In Progress, Completed
Category:         Development, Design, QA, etc.
```

**Example Tasks:**
```
1. Homepage UI Design
   - Assigned: Sarah
   - Due: +7 days
   - Priority: High

2. Backend API Development
   - Assigned: John
   - Due: +12 days
   - Priority: High

3. Testing & QA
   - Assigned: Mike
   - Due: +14 days
   - Priority: Medium
```

---

### **STEP 17: Create Invoice**

**Path:** CRM → Invoices → "Add Invoice"

**Invoice Form:**
```
Invoice Number:   AUTO (INV-YYYY-###)
Client:           ✓ Required (dropdown)
Project/Deal:     Link to deal (optional)
Items:
  - Description
  - Quantity
  - Unit Price
  - Tax
  - Line Total
Issue Date:       Today
Due Date:         +30 days (customizable)
Terms:            Payment terms
Notes:            Optional
```

**To Create:**
1. Navigate to Invoices page
2. Click "Add Invoice"
3. Select client from linked deal
4. Add line items
5. Set payment terms
6. Generate & send to client

---

## Testing Guide

### **Automated Test Scripts**

**Test 1: Lead Conversion Workflow**
```bash
cd server
node test-lead-conversion.js
```

**Output:**
- ✅ Creates 3 test leads
- ✅ Converts to Contact, Company, Deal
- ✅ Verifies database records

**Test 2: Complete Workflow**
```bash
cd server
node test-full-workflow.js
```

**Output:**
- ✅ Creates lead with full qualification
- ✅ Converts to all entities
- ✅ Moves deal through entire pipeline
- ✅ Verifies all relationships

---

### **Manual Testing Checklist**

#### Lead Workflow
- [ ] Create new lead on `/leads` page
- [ ] View lead details by clicking lead name
- [ ] Update lead status through progression
- [ ] Convert lead to contact successfully
- [ ] Verify contact appears in Contacts list
- [ ] Verify contact is linked to company

#### Deal Pipeline
- [ ] Create deal from lead conversion
- [ ] See deal in "New" column on Kanban board
- [ ] Drag deal to "Proposal" stage
- [ ] See deal value displayed ($5K)
- [ ] Drag deal to "Negotiation"
- [ ] Update win probability slider
- [ ] Move to "Closed Won"

#### Campaign Stats
- [ ] Navigate to `/campaign`
- [ ] Verify stats show percentages (not 0.0%)
- [ ] Stats should show: "Active: +XX%"
- [ ] Create new campaign
- [ ] Verify stats update dynamically

#### Relationships
- [ ] Open deal details page
- [ ] Verify company is linked
- [ ] Verify contact is linked
- [ ] Click on company name → opens company details
- [ ] Click on contact name → opens contact details

---

## Troubleshooting

### **Issue: Deal Value Shows $0**

**Cause:** Deal created without value in API

**Solution:**
```bash
PUT /api/deals/{id}
{
  "deal_value": 5000
}
```

---

### **Issue: Pipeline Stages Not Showing**

**Cause:** Deal's `pipeline` field is NULL or empty

**Solution:**
1. Open deal details
2. Select stage from dropdown
3. Value updates to database

---

### **Issue: Campaign Stats Show 0.0%**

**Status:** ✅ FIXED - Stats now calculate dynamically

**What was fixed:**
- Stats now compute from actual campaign data
- Percentages show real values
- Updates when campaigns are created/updated

---

### **Issue: Contact/Company Not Linked to Deal**

**Cause:** Conversion didn't include IDs

**Solution:**
```bash
POST /api/leads/{id}/convert-to-deal
{
  "deal_name": "...",
  "deal_value": 5000,
  "company_id": 7,      # ← Include these
  "contact_id": 10,     # ← Include these
  ...
}
```

---

### **Issue: Cannot Find Deal After Conversion**

**Solutions:**
1. Refresh browser page
2. Navigate to `/crm/deals` Kanban board
3. Deal should appear in "New" column
4. Use search to find by name or company

---

## API Endpoints Reference

### Lead Endpoints
```bash
GET    /api/leads                    # Get all leads
GET    /api/leads/{id}               # Get lead details
POST   /api/leads                    # Create lead
PUT    /api/leads/{id}               # Update lead
DELETE /api/leads/{id}               # Delete lead

# Conversions
POST   /api/leads/{id}/convert-to-contact
POST   /api/leads/{id}/convert-to-company
POST   /api/leads/{id}/convert-to-deal
```

### Deal Endpoints
```bash
GET    /api/deals                    # Get all deals
GET    /api/deals/{id}               # Get deal details
POST   /api/deals                    # Create deal
PUT    /api/deals/{id}               # Update deal (including stage)
DELETE /api/deals/{id}               # Delete deal
```

### Related Endpoints
```bash
GET    /api/contacts                 # Get all contacts
GET    /api/companies                # Get all companies
GET    /api/invoices                 # Get all invoices
GET    /api/campaigns                # Get all campaigns
GET    /api/proposals                # Get all proposals
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     LEAD LIFECYCLE                          │
└─────────────────────────────────────────────────────────────┘

1. LEAD CREATION
   User Input → Lead Created (Status: New)
   
2. LEAD QUALIFICATION
   Lead → Contact Updated (Contacted → Qualified)
   
3. CONVERSION OPTIONS
   ├─→ Convert to CONTACT
   │   └─→ Contact Created (linked to Company)
   │
   ├─→ Convert to COMPANY
   │   └─→ Company Created (with contact info)
   │
   └─→ Convert to DEAL
       └─→ Deal Created ($5,000 value)
           └─→ Linked to: Company + Contact

4. PIPELINE MOVEMENT
   New → Proposal → Negotiation → Closed Won
   
5. PROJECT CREATION (Optional)
   Deal Closed Won → Project Created
   
6. TASK CREATION
   Project → Add Tasks → Team Assignment
   
7. INVOICE GENERATION
   Project → Add Invoice → Send to Client
   
8. PAYMENT TRACKING
   Invoice → Payment Received → Project Completion
```

---

## Key Business Workflows

### Workflow 1: Simple Deal
**Timeline:** 2-3 days
```
Lead Created (Day 1)
  ↓
Lead Qualified (Day 1)
  ↓
Deal Created ($5,000) (Day 1)
  ↓
Proposal Sent (Day 2)
  ↓
Deal Closed Won (Day 3)
  ↓
Invoice Generated (Day 3)
  ↓
Payment Received
```

### Workflow 2: Complex Sale
**Timeline:** 2-4 weeks
```
Lead Created (Week 1)
  ↓
Lead Contacted (Week 1)
  ↓
Lead Qualified (Week 1)
  ↓
Deal Created - Proposal Stage (Week 1-2)
  ↓
Negotiations - Multiple Rounds (Week 2-3)
  ↓
Deal Closed Won (Week 3)
  ↓
Project Created (Week 3)
  ↓
Project Execution (Week 3-4)
  ↓
Project Completion (Week 4)
  ↓
Invoice Generated & Paid
```

---

## Performance Metrics

### Typical Conversion Rates
- Lead to Qualified: 40-60%
- Qualified to Deal: 70-80%
- Deal to Closed Won: 20-40%
- Deal to Project: 60-80%

### Average Timeline
- Lead to Deal: 3-5 days
- Deal to Closed Won: 7-14 days
- Deal to Project Start: 2-3 days
- Project Duration: 14-30 days

---

## Security Notes

- All endpoints require valid database connection
- Lead data includes PII (email, phone) - treat as sensitive
- Deal values are financial data - audit trail recommended
- Invoice generation creates financial records - approval workflow suggested

---

## Support & Documentation

- **Lead Conversion Details:** See `LEADS_WORKFLOW_IMPLEMENTATION.md`
- **Database Schema:** See `database.sql`
- **API Service:** See `client/src/services/api.js`
- **Backend Server:** See `server/server.js`

---

**Last Updated:** December 6, 2025  
**Status:** ✅ Production Ready  
**Version:** 1.0
