# 🧪 CRM WORKFLOW TESTING GUIDE
**Complete End-to-End Testing Reference**

---

## 📋 TEST MATRIX: 15 MODULES × 5 SCENARIOS

### Legend
- ✅ = Fully Testable
- ⚠️ = Partially Implemented (requires manual step)
- ⚡ = Automated (backend handles)

---

## 1️⃣ CONTACTS MODULE TESTING

### Test Case 1.1: Create Contact
```gherkin
Given: User is on Contacts page
When: Click "Add New Contact" button
And: Fill form (name, email, phone, company)
And: Click "Submit"
Then: Contact appears in list
And: API call: POST /api/contacts ✅
```

### Test Case 1.2: Link Contact to Company
```gherkin
Given: Contact created
When: Select company from dropdown
Then: contact.company_id = company.id
And: Visible in company contact list
And: API call: GET /api/companies/:id/contacts ✅
```

### Test Case 1.3: Add Notes to Contact
```gherkin
Given: Contact detail page open
When: Click "Add Note"
And: Enter note content
Then: Note saved to contact
And: API call: POST /api/contacts/:id/notes ✅
And: Activity logged automatically ⚡
```

### Test Case 1.4: Add Activity to Contact
```gherkin
Given: Contact detail page
When: Click "Log Activity"
And: Select activity type (Call/Email/Meeting)
And: Enter description
Then: Activity recorded
And: API call: POST /api/contacts/:id/activities ✅
And: Appears in activity timeline
```

### Test Case 1.5: Contact Reports
```gherkin
Given: Contacts Report page
Then: Shows total contacts ✅
And: Shows contacts by company ✅
And: Shows recent contacts ✅
And: Shows contact activity trend ✅
```

---

## 2️⃣ COMPANIES MODULE TESTING

### Test Case 2.1: Create Company
```gherkin
Given: User on Companies page
When: Click "Add New Company"
And: Fill form (name, industry, email, website, etc)
Then: Company created in database
And: API call: POST /api/companies ✅
And: Redirect to company detail page
```

### Test Case 2.2: Add Contacts to Company
```gherkin
Given: Company detail page
When: Click "Add Contact" in contacts section
Then: Contact creation modal opens
And: Company automatically pre-filled
And: Contact.company_id = company.id ⚡
And: Appears in company's contacts list ✅
```

### Test Case 2.3: View Company Deals
```gherkin
Given: Company detail page
When: Navigate to "Deals" section
Then: Fetch all deals where company_id = this.id
And: API call: GET /api/companies/:id/deals ✅
And: Shows deal name, value, stage
```

### Test Case 2.4: Upgrade Company Plan
```gherkin
Given: Company detail page
When: Click "Upgrade Plan"
Then: Plan selection modal opens
And: Choose new plan (Starter/Pro/Enterprise)
And: Click "Upgrade"
And: API call: POST /api/companies/:id/upgrade ⚡
And: company_plan updated ⚡
```

### Test Case 2.5: Company Reports
```gherkin
Given: Company Reports page
Then: Shows total companies ✅
And: Companies by industry distribution
And: Companies by status (Active/Prospect)
And: Top companies by deal value
```

---

## 3️⃣ LEADS MODULE TESTING

### Test Case 3.1: Create Lead
```gherkin
Given: User on Leads page
When: Click "Add New Lead"
And: Fill form (name, email, phone, source, rating)
Then: Lead created with status = "New"
And: API call: POST /api/leads ✅
And: Appears in leads list
```

### Test Case 3.2: Lead Qualification
```gherkin
Given: Lead created with status = "New"
When: View lead details
And: Assign owner (sales person)
And: Add notes
And: Rate as "Hot"
Then: Lead status = "Hot"
And: API call: PUT /api/leads/:id ✅
```

### Test Case 3.3: Convert Lead to Contact (Main Test Case)
```gherkin
Given: Lead with rating = "Hot"
When: Click "Convert to Contact"
And: Click "Confirm"
Then: 3 entities created:
    ✅ New Contact (first_name, last_name, email, phone)
    ✅ New Company (company_name from lead)
    ✅ New Deal (deal_name from lead, stage = "New")
And: All linked to each other
And: API call: POST /api/leads/:id/convert-to-contact ⚡
And: Returns { contact_id, company_id, deal_id }
And: Lead status changes to "Converted"
```

### Test Case 3.4: Convert Lead to Company
```gherkin
Given: Lead (Organization type)
When: Click "Convert to Company"
Then: New company created
And: company_name from lead.company
And: company_id returned
And: API call: POST /api/leads/:id/convert-to-company
```

### Test Case 3.5: Convert Lead to Deal
```gherkin
Given: Lead converted to contact/company
When: Click "Create Deal"
Then: Deal created (stage = "New")
And: Linked to contact & company
And: deal_value from lead.value
And: API call: POST /api/leads/:id/convert-to-deal
```

### Test Case 3.6: Lead Kanban View
```gherkin
Given: Leads Kanban page
Then: Columns show: "New" | "Qualified" | "Converted" | "Lost"
And: Leads distributed by status
And: Click deal card → Open lead details
```

---

## 4️⃣ DEALS MODULE TESTING

### Test Case 4.1: Create Deal
```gherkin
Given: Deal modal opened
When: Fill (deal_name, company, contact, value, stage)
Then: Deal created with stage = first default stage
And: API call: POST /api/deals ✅
And: probability auto-calculated from stage
```

### Test Case 4.2: Move Deal in Pipeline (Kanban) - CRITICAL TEST
```gherkin
Given: Deals Kanban board open
When: Drag deal card from "New" to "Discovery"
Then: Visual move on board
And: API call: PUT /api/deals/:id { stage: "Discovery" } ⚡
And: Backend updates deal.stage ⚡
And: Activity logged: "Deal moved to Discovery" ⚡
And: Database persists change
```

### Test Case 4.3: Deal Status Tracking
```gherkin
Given: Deal in pipeline
When: View deal details
Then: Shows current stage
And: Shows probability (based on stage)
And: Shows status (Active/Won/Lost/On Hold)
```

### Test Case 4.4: Convert Deal to Project (Won Only)
```gherkin
Given: Deal status = "Won"
When: Click "Convert to Project"
Then: Project modal opens
And: project.name = deal.name
And: project.budget = deal.value
And: project.company_id = deal.company_id
And: API call: POST /api/deals/:id/convert-to-project ⚡
And: Returns { project_id }
And: Project created in database
```

### Test Case 4.5: Convert Deal to Invoice
```gherkin
Given: Deal status = "Won"
When: Click "Generate Invoice"
Then: Invoice created
And: invoice.client_id = deal.contact_id
And: invoice.amount = deal.value
And: API call: POST /api/deals/:id/convert-to-invoice ⚡
And: Returns { invoice_id }
```

### Test Case 4.6: Deal Reports
```gherkin
Given: Deal Reports page
Then: Shows total deals by stage
And: Shows won vs lost deals
And: Shows average deal size
And: Shows win rate percentage
And: Shows revenue by month
```

---

## 5️⃣ PIPELINE MODULE TESTING

### Test Case 5.1: View Pipeline Kanban
```gherkin
Given: Pipeline page open
Then: Kanban board displays
And: Columns = Deal stages (New, Discovery, Proposal, Won, Lost)
And: Each column shows count of deals
And: Each column shows total value of deals
```

### Test Case 5.2: Drag & Drop Functionality
```gherkin
Given: Kanban board visible
When: Drag deal from "New" to "Discovery"
Then: Animation shows movement
And: Visual update on board
And: API call: PUT /api/deals/:id ⚡
And: Backend persists
And: Cannot drag after update fails
```

### Test Case 5.3: Pipeline Metrics
```gherkin
Given: Pipeline view
Then: Total pipeline value visible
And: Breakdown by stage showing:
    - Stage name
    - Deal count
    - Total value
    - Average deal size
```

---

## 6️⃣ CAMPAIGN MODULE TESTING

### Test Case 6.1: Create Campaign
```gherkin
Given: Campaign creation modal
When: Fill (name, type, audience, dates, budget)
Then: Campaign created
And: API call: POST /api/campaigns ✅
```

### Test Case 6.2: Target Audience Selection
```gherkin
Given: Campaign created
When: Select audience type
Then: Options: "All Contacts" | "Specific Contacts" | "Lead List"
And: Selected audience linked
```

### Test Case 6.3: Campaign Status Tracking
```gherkin
Given: Campaign in progress
When: Check status
Then: Shows: "Not Started" | "Running" | "Completed"
And: Shows leads generated
And: Shows conversion metrics
```

---

## 7️⃣ PROJECTS MODULE TESTING

### Test Case 7.1: Auto-Create Project from Won Deal
```gherkin
Given: Deal marked as "Won"
When: Click "Convert to Project"
Then: Project created automatically ⚡
And: project.name = deal.name
And: project.deal_id = deal.id
And: project.budget = deal.value
And: project.company_id = deal.company_id
And: API call: POST /api/deals/:id/convert-to-project ⚡
```

### Test Case 7.2: Add Team Members to Project
```gherkin
Given: Project detail page
When: Click "Add Team Member"
And: Select user from dropdown
Then: User added to project.team_members
And: User receives notification
And: Appears in team list
```

### Test Case 7.3: Create Task in Project
```gherkin
Given: Project detail page
When: Click "Add Task"
And: Fill (name, assignee, due_date, priority)
Then: Task created
And: API call: POST /api/projects/:projectId/tasks ✅
And: Task appears in project task list
```

### Test Case 7.4: Track Project Progress
```gherkin
Given: Project with tasks
Then: Shows:
    - Total tasks
    - Completed tasks (%)
    - On-time tasks (%)
    - Over-budget alerts
```

### Test Case 7.5: Project Timeline
```gherkin
Given: Project detail page
When: View activities
Then: Shows project history:
    - Team added
    - Tasks created
    - Milestones reached
    - Budget updates
```

---

## 8️⃣ TASKS MODULE TESTING

### Test Case 8.1: Create Task for Contact
```gherkin
Given: Contact detail page
When: Click "Add Task"
And: Fill (task_name, assignee, due_date, priority)
Then: Task created with contact_id
And: API call: POST /api/tasks ✅
And: Task appears in task list
```

### Test Case 8.2: Create Task for Deal
```gherkin
Given: Deal detail page
When: Click "Add Task"
Then: Task created with deal_id
And: Task shows in deal's task panel
```

### Test Case 8.3: Create Task for Project
```gherkin
Given: Project detail page
When: Click "Add Task"
Then: Task created with project_id
And: API call: POST /api/projects/:projectId/tasks ✅
```

### Test Case 8.4: Task Status Flow
```gherkin
Given: Task with status = "To Do"
When: User updates status
Then: Can change to: "In Progress" | "Done"
And: API call: PUT /api/tasks/:id { status: "In Progress" } ✅
And: Task moves to appropriate column
And: Activity logged
```

### Test Case 8.5: Task Priority & Due Date
```gherkin
Given: Task detail page
When: Set priority = "Critical"
And: Set due_date = tomorrow
Then: Task highlights with warning
And: Shows in "Due This Week" report
And: Assignee receives notification
```

---

## 9️⃣ PROPOSALS MODULE TESTING

### Test Case 9.1: Create Proposal
```gherkin
Given: Deal detail page
When: Click "Create Proposal"
And: Fill (client, items, pricing)
Then: Proposal created
And: Status = "Draft"
And: API call: POST /api/invoices { type: "Proposal" } ✅
```

### Test Case 9.2: Add Proposal Items
```gherkin
Given: Proposal form
When: Click "Add Item"
And: Fill (description, quantity, rate)
Then: Item added
And: Total automatically calculated
And: Tax calculated if applicable
```

### Test Case 9.3: Send Proposal
```gherkin
Given: Proposal in Draft
When: Click "Send"
Then: PDF generated
And: Email sent to client
And: Status changed to "Sent"
And: API call: PUT /api/invoices/:id { status: "Sent" }
And: Activity logged ⚡
```

### Test Case 9.4: Track Proposal Status
```gherkin
Given: Proposal sent
When: Client opens email PDF
Then: System tracks: "Viewed"
And: Status updated to "Viewed"
And: Shows view timestamp
```

### Test Case 9.5: Proposal Acceptance
```gherkin
Given: Proposal viewed by client
When: Client clicks "Accept" link
Then: Proposal status = "Accepted"
And: Auto-convert to Invoice ⚡
And: Related deal stage → "Proposal Accepted"
And: Invoice created with proposal details
And: API call: POST /api/invoices/:id/accept
```

---

## 🔟 CONTRACTS MODULE TESTING

### Test Case 10.1: Create Contract
```gherkin
Given: Deal won
When: Click "Create Contract"
And: Fill (name, terms, start_date, end_date)
Then: Contract created
And: API call: POST /api/contracts ✅
```

### Test Case 10.2: Upload Contract Document
```gherkin
Given: Contract detail page
When: Click "Upload Document"
And: Select PDF file
Then: File uploaded
And: Stored as contract.document_url
And: Accessible for download
```

### Test Case 10.3: Contract Status Tracking
```gherkin
Given: Contract created
When: Check status field
Then: Shows: "Draft" | "Active" | "Expired" | "Terminated"
And: Can transition between statuses
And: Activity logged for each change
```

---

## 1️⃣1️⃣ ESTIMATIONS MODULE TESTING

### Test Case 11.1: Create Estimate
```gherkin
Given: Deal or Project exists
When: Click "Create Estimate"
And: Fill (items, pricing, expiry_date)
Then: Estimate created
And: Status = "Draft"
And: API call: POST /api/invoices { type: "Estimate" } ✅
```

### Test Case 11.2: Add Estimate Items
```gherkin
Given: Estimate form
When: Click "Add Item"
And: Fill (description, qty, rate)
Then: Item added with auto-calculation
And: Subtotal, tax, total updated
```

### Test Case 11.3: Send Estimate
```gherkin
Given: Estimate in Draft
When: Click "Send to Client"
Then: PDF generated
And: Email sent
And: Status = "Sent"
And: Expiry date set
```

### Test Case 11.4: Estimate Expiration
```gherkin
Given: Estimate with expiry_date
When: Expiry date passes
Then: Status = "Expired"
And: Cannot accept expired estimate
And: Can create new estimate
```

### Test Case 11.5: Estimate to Invoice Conversion
```gherkin
Given: Estimate approved by client
When: Client clicks "Approve" in email
Then: Estimate status = "Approved"
And: Auto-convert to Invoice ⚡
And: Invoice created with estimate items
And: Deal stage updated
And: Activity logged ⚡
```

---

## 1️⃣2️⃣ INVOICES MODULE TESTING

### Test Case 12.1: Create Invoice Manually
```gherkin
Given: Invoice creation form
When: Fill (client, items, due_date)
Then: Invoice created
And: Status = "Draft"
And: invoice_number auto-generated
And: API call: POST /api/invoices ✅
```

### Test Case 12.2: Auto-Create from Deal (Won)
```gherkin
Given: Deal with status = "Won"
When: Click "Generate Invoice"
Then: Invoice created automatically ⚡
And: Populated with deal data
And: invoice.amount = deal.value
And: invoice.client_id = deal.contact_id
And: invoice.deal_id = deal.id
```

### Test Case 12.3: Tax Calculation
```gherkin
Given: Invoice with items
And: tax_rate = 10%
When: Click "Calculate Tax"
Then: Tax calculated: Subtotal × 10%
And: Total = Subtotal + Tax - Discount
And: Auto-calculation on item changes ⚡
```

### Test Case 12.4: Send Invoice
```gherkin
Given: Invoice status = "Draft"
When: Click "Send"
Then: PDF generated
And: Email sent to client
And: Status changed to "Sent"
And: API call: PUT /api/invoices/:id { status: "Sent" } ✅
And: Activity logged: "Invoice Sent" ⚡
```

### Test Case 12.5: Invoice Status Tracking - CRITICAL TEST
```gherkin
Given: Invoice sent to client
Then: Status progression possible:
    Draft → Sent → Viewed → Overdue → Partially Paid → Paid
And: Status changes tracked
And: Each status has timestamp
And: API call: GET /api/invoices/:id ✅
```

### Test Case 12.6: Invoice Link to Deal
```gherkin
Given: Invoice created
When: Click "Link to Deal"
And: Select deal
Then: invoice.deal_id = deal.id
And: Appears in deal's invoices list
And: API call: POST /api/invoices/:invoiceId/link-to-deal/:dealId ✅
```

### Test Case 12.7: Invoice Metrics Dashboard
```gherkin
Given: Invoice Report page
Then: Shows:
    - Total Invoiced (sum of all invoices)
    - Total Paid (sum of payments)
    - Outstanding (Total - Paid)
    - Average Payment Time (days)
    - Overdue Count
And: API call: GET /api/invoices/metrics/summary ✅
```

### Test Case 12.8: Invoice Status Breakdown
```gherkin
Given: Invoice Reports
Then: Shows breakdown:
    - Draft: X invoices
    - Sent: Y invoices
    - Viewed: Z invoices
    - Paid: W invoices
    - Overdue: V invoices
And: API call: GET /api/invoices/status/breakdown ✅
```

---

## 1️⃣3️⃣ PAYMENTS MODULE TESTING

### Test Case 13.1: Record Payment
```gherkin
Given: Invoice with status = "Sent"
When: Click "Record Payment"
And: Fill (amount, method, reference)
Then: Payment recorded
And: Amount applied to invoice
And: API call: POST /api/invoices/:id/payment ✅
```

### Test Case 13.2: Partial Payment
```gherkin
Given: Invoice total = $1000
When: Record payment = $500
Then: payment.amount = 500
And: invoice.status = "Partially Paid"
And: Remaining = $500
And: Show remaining balance
And: API call: POST /api/invoices/:id/payment ✅
```

### Test Case 13.3: Full Payment
```gherkin
Given: Invoice total = $1000
And: Previous payments = $500
When: Record payment = $500
Then: payment.amount = 500
And: Total paid = $1000
And: invoice.status = "Paid" ✅
And: Activity logged: "Invoice Paid" ⚡
And: Financial report updated ⚡
```

### Test Case 13.4: Payment Methods
```gherkin
Given: Payment recording form
When: Select payment method
Then: Options available:
    - Cash
    - Bank Transfer
    - Credit Card
    - UPI
    - Check
    - Other
And: Can enter reference number for each
```

### Test Case 13.5: Generate Payment Receipt
```gherkin
Given: Payment recorded
When: Click "Generate Receipt"
Then: PDF receipt created
And: Shows payment details
And: Can download or email
```

---

## 1️⃣4️⃣ ACTIVITIES MODULE TESTING

### Test Case 14.1: Activity Auto-Logging
```gherkin
Given: Any module action occurs
When: Deal created / Contact updated / Invoice sent
Then: Activity auto-logged ⚡
And: Activity record created
And: type = action type
And: description = action details
And: created_by = current user
And: created_at = NOW()
```

### Test Case 14.2: View Contact Activity Timeline
```gherkin
Given: Contact detail page
When: Scroll to "Activities" section
Then: Shows chronological list:
    - Newest first
    - Timestamp for each
    - Activity type
    - Description
And: API call: GET /api/contacts/:id/activities ✅
```

### Test Case 14.3: View Deal Activity Log
```gherkin
Given: Deal detail page
When: Click "Activity Log"
Then: Shows all actions on deal:
    - Deal created
    - Stage changed (with old → new)
    - Notes added
    - Tasks created
    - Users assigned
And: API call: GET /api/deals/:id/activities ✅
```

### Test Case 14.4: Log Activity Manually
```gherkin
Given: Contact detail page
When: Click "Log Activity"
And: Select activity type (Call/Email/Meeting)
And: Enter description
Then: Activity recorded
And: Appears in timeline immediately
And: API call: POST /api/contacts/:id/activities ✅
```

### Test Case 14.5: Activity Types Tracked
```gherkin
Then: System logs:
    ✅ Lead Created
    ✅ Deal Created
    ✅ Deal Stage Changed
    ✅ Invoice Sent
    ✅ Payment Recorded
    ✅ Task Created
    ✅ Task Completed
    ✅ Note Added
    ✅ Call Logged
    ✅ Email Sent
    And: Any custom activity types
```

---

## 1️⃣5️⃣ ANALYTICS MODULE TESTING

### Test Case 15.1: Main Analytics Dashboard
```gherkin
Given: Analytics page open
Then: Shows key metrics:
    ✅ Pipeline value (total $)
    ✅ Won deals (count & $)
    ✅ Lost deals (count & $)
    ✅ Average deal size
    ✅ Win rate %
    ✅ Revenue this month
    ✅ Outstanding AR
    ✅ Team performance
```

### Test Case 15.2: Sales Report
```gherkin
Given: Sales Report page
Then: Shows:
    - Deals by stage (breakdown)
    - Deals by person (leaderboard)
    - Deals by month (trend)
    - Top clients by deal value
    - Win/loss ratio
```

### Test Case 15.3: Lead Report
```gherkin
Given: Lead Report page
Then: Shows:
    - Total leads (by status)
    - Conversion rate (Lead → Deal)
    - Lead source performance
    - Time to qualification
    - Leads by rating (Hot/Warm/Cold)
```

### Test Case 15.4: Financial Report
```gherkin
Given: Financial Report page
Then: Shows:
    - Total invoiced (all time)
    - Total paid (all time)
    - Outstanding AR
    - Revenue by month (trend)
    - Top paying clients
    - Average payment collection time
    - Overdue invoices
```

### Test Case 15.5: Project Report
```gherkin
Given: Project Report page
Then: Shows:
    - Active projects count
    - Budget vs actual
    - On-time delivery rate
    - Project profitability
    - Team utilization
```

### Test Case 15.6: Export Reports
```gherkin
Given: Any report page
When: Click "Export"
Then: Options available:
    - Export as PDF
    - Export as CSV
    - Email report
And: Downloads or emails successfully
```

---

## 🔄 END-TO-END WORKFLOW TEST (MASTER TEST)

### Complete Flow from Lead to Payment
```gherkin
SCENARIO: New lead → Qualified → Deal → Won → Invoice → Payment

STEP 1: CREATE LEAD
Given: Marketing campaign running
When: New lead arrives (Web form)
Then: Lead created via POST /api/leads ✅

STEP 2: QUALIFY LEAD
Given: Lead created
When: Sales team reviews
And: Assigns owner (sales person)
And: Sets rating = "Hot"
Then: Lead status = "Qualified"
And: Updated via PUT /api/leads/:id ✅

STEP 3: CONVERT TO 3 ENTITIES
Given: Lead rating = "Hot"
When: Click "Convert to Contact"
Then: ✅ Contact created
And: ✅ Company created
And: ✅ Deal created (stage = "New")
And: All linked to each other
And: API call: POST /api/leads/:id/convert-to-contact ⚡
Response: { contact_id, company_id, deal_id }

STEP 4: MOVE DEAL THROUGH PIPELINE
Given: Deal created with stage = "New"
When: Sales team progresses deal
Then: Kanban drag & drop:
    New → Discovery → Proposal Sent → Won
And: Each stage change:
    ✅ API call: PUT /api/deals/:id
    ✅ Activity logged
    ✅ Probability updated
    ✅ Database persisted

STEP 5: DEAL WON - AUTO-CREATE PROJECT
Given: Deal status = "Won"
When: System triggers (or manual)
Then: ✅ Project auto-created
And: ✅ Budget = deal value
And: ✅ Team assigned
And: ✅ Initial tasks created
And: API call: POST /api/deals/:id/convert-to-project ⚡

STEP 6: CREATE INVOICE
Given: Deal won & Project created
When: Click "Generate Invoice"
Then: ✅ Invoice created
And: ✅ Populated with deal data
And: ✅ Items from estimate (if exists)
And: ✅ Tax calculated automatically
And: API call: POST /api/deals/:id/convert-to-invoice ⚡

STEP 7: SEND INVOICE
Given: Invoice status = "Draft"
When: Click "Send to Client"
Then: ✅ PDF generated
And: ✅ Email sent to client
And: ✅ Status changed to "Sent"
And: ✅ Activity logged
And: API call: PUT /api/invoices/:id { status: "Sent" } ✅

STEP 8: TRACK INVOICE STATUS
Given: Invoice sent
When: Client receives & opens
Then: ✅ Status updated to "Viewed"
And: ✅ Timestamp recorded
And: ✅ Sales team sees status update

STEP 9: RECORD PAYMENT
Given: Invoice due date passed & payment received
When: Finance team logs payment
And: Amount = $X, Method = Bank Transfer
Then: ✅ Payment recorded
And: ✅ Invoice status → "Partially Paid"/"Paid"
And: ✅ Remaining balance shown
And: ✅ Receipt generated
And: API call: POST /api/invoices/:id/payment ✅

STEP 10: ANALYTICS UPDATED
Given: Payment recorded
When: System updates financials
Then: ✅ Dashboard metrics updated
And: ✅ Revenue recognized
And: ✅ AR reduced
And: ✅ Cash flow updated
And: ✅ Reports generated
And: API calls: GET /api/invoices/metrics/summary ✅

RESULT: ✅ COMPLETE END-TO-END WORKFLOW TESTED
```

---

## 📊 TEST COVERAGE MATRIX

| Module | Create | Read | Update | Delete | Link | Convert | Report |
|--------|--------|------|--------|--------|------|---------|--------|
| Contacts | ✅ | ✅ | ✅ | ✅ | ✅ | - | ✅ |
| Companies | ✅ | ✅ | ✅ | ✅ | ✅ | - | ✅ |
| Leads | ✅ | ✅ | ✅ | ✅ | - | ✅ | ✅ |
| Deals | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pipeline | ✅ | ✅ | ✅ | ✅ | - | - | ✅ |
| Campaigns | ✅ | ✅ | ✅ | ✅ | ✅ | - | ✅ |
| Projects | ✅ | ✅ | ✅ | ✅ | ✅ | - | ✅ |
| Tasks | ✅ | ✅ | ✅ | ✅ | ✅ | - | ✅ |
| Proposals | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contracts | ✅ | ✅ | ✅ | ✅ | ✅ | - | ✅ |
| Estimations | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Invoices | ✅ | ✅ | ✅ | ✅ | ✅ | - | ✅ |
| Payments | ✅ | ✅ | ✅ | ✅ | - | - | ✅ |
| Activities | ✅ | ✅ | - | - | - | - | ✅ |
| Analytics | - | ✅ | - | - | - | - | ✅ |

---

## 🎯 CRITICAL TEST PATHS (Must Pass)

These are the highest priority tests:

1. **Lead Conversion** (Test 3.3)
   - Convert lead → Contact + Company + Deal
   - Verify all 3 entities created & linked
   - Status: ⚡ CRITICAL

2. **Deal Pipeline Movement** (Test 4.2)
   - Drag & drop deal between stages
   - Verify database update
   - Status: ⚡ CRITICAL

3. **Deal Won → Invoice** (Test 12.2)
   - Win deal → Auto-create invoice
   - Verify amount & client linkage
   - Status: ⚡ CRITICAL

4. **Invoice Payment Tracking** (Test 13.3)
   - Record payment → Update status
   - Verify financial calculations
   - Status: ⚡ CRITICAL

5. **End-to-End Workflow** (Master Test)
   - Lead → Deal → Invoice → Payment
   - All systems integration
   - Status: ⚡ CRITICAL

---

## 🛠️ MANUAL TESTING CHECKLIST

### Before Production Deployment
- [ ] All 15 modules tested
- [ ] All CRUD operations working
- [ ] All conversions working (Lead→Deal→Project, Deal→Invoice, Estimate→Invoice)
- [ ] Pipeline drag & drop smooth
- [ ] Payment calculation accurate
- [ ] Email notifications sent
- [ ] PDF generation working
- [ ] Database relationships intact
- [ ] API error handling tested
- [ ] Performance under load tested
- [ ] Reports generating correctly
- [ ] Activities logging accurately
- [ ] Analytics updating in real-time

---

**This testing guide covers 75+ test cases across 15 CRM modules.**
