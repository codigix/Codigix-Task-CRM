# 🔄 WORKFLOW IMPLEMENTATION DETAILS
**Complete Module-by-Module Integration Reference**

---

## 1️⃣ CONTACTS WORKFLOW

### Data Flow
```
Add Contact → Store in DB → Link to Company → Add Tags/Notes → Track Activities
     ↓              ↓            ↓                  ↓                ↓
Component: AddContactModal
Database: contacts table
API: /api/contacts (CRUD)
```

### Files Involved
| File | Purpose | Location |
|------|---------|----------|
| `AddContactModal.js` | Add new contact form | `/components` |
| `Contacts.js` | List & manage contacts | `/components` |
| `ContactDetailsPage.js` | Single contact view | `/components` |
| `ContactReportsPage.js` | Contact analytics | `/components` |

### Key API Endpoints
```javascript
// Create contact
POST /api/contacts
Body: { first_name, last_name, email, phone, company_id, ... }

// Get all contacts
GET /api/contacts

// Add note to contact
POST /api/contacts/:contactId/notes
Body: { content, type }

// Log activity
POST /api/contacts/:contactId/activities
Body: { type, description }
```

### Database Schema (contacts table)
```sql
id, first_name, last_name, email, phone, company_id,
position, status, tags, created_at, updated_at, notes
```

### Usage in Workflows
- ✅ **Leads → Contacts**: Convert lead to contact (auto-creates)
- ✅ **Companies**: Link contacts to company
- ✅ **Deals**: Attach contact to deal
- ✅ **Projects**: Team member management
- ✅ **Invoices**: Billing contact

---

## 2️⃣ COMPANIES WORKFLOW

### Data Flow
```
Add Company → Store Info → Add Contacts → Create Deals → Track Activities
     ↓           ↓            ↓               ↓              ↓
Component: AddNewCompanyForm
Database: companies table
API: /api/companies (CRUD)
```

### Files Involved
| File | Purpose |
|------|---------|
| `AddNewCompanyForm.js` | Create company form |
| `Companies.js` | Company list page |
| `CompanyDetailsPage.js` | Company profile + nested resources |
| `CompanyReportsPage.js` | Company analytics |

### Key API Endpoints
```javascript
// Create company
POST /api/companies
Body: { company_name, industry, email, phone, website, ... }

// Get company with all contacts
GET /api/companies/:id

// Get all deals for company
GET /api/companies/:companyId/deals

// Get all invoices for company
GET /api/companies/:companyId/invoices

// Upgrade company plan
POST /api/companies/:id/upgrade
Body: { plan_name, plan_type }
```

### Database Schema (companies table)
```sql
id, company_name, industry, email, phone, website, address, city,
state, country, employee_count, annual_revenue, status, 
account_url, logo, password, created_at, updated_at
```

### Relationships
- ✅ Contains multiple **Contacts**
- ✅ Has multiple **Deals**
- ✅ Has multiple **Invoices**
- ✅ Has **Company Plan** subscription
- ✅ Can be upgraded to customer

---

## 3️⃣ LEADS WORKFLOW

### Data Flow
```
Lead Created → Qualify Lead → Convert to 3 Entities → Auto-create Deal
     ↓           ↓                  ↓                      ↓
Source: Website/Campaign/Referral
Status: Hot/Warm/Cold
Files: AddNewLeadModal, ConvertLeadModal
```

### Files Involved
| File | Purpose |
|------|---------|
| `AddNewLeadModal.js` | Create lead form |
| `CrmLeadsPage.js` | Lead list page |
| `LeadDetailsPage.js` | Lead profile |
| `ConvertLeadModal.js` | Lead conversion (→ Contact/Company/Deal) |
| `LeadsDashboard.js` | Lead dashboard |
| `LeadReport.js` | Lead analytics |

### Conversion Logic
```javascript
// When lead is qualified (Hot):
POST /api/leads/:id/convert-to-contact
Response: { contact_id, company_id, deal_id }

// Creates:
1. Contact (first_name, last_name, email, phone)
2. Company (company_name from lead)
3. Deal (deal_name from lead, auto-stage: "New")

// All linked to each other
```

### Key API Endpoints
```javascript
// Create lead
POST /api/leads
Body: { name, email, phone, company, source, status, rating, ... }

// Convert lead to contact + company + deal
POST /api/leads/:id/convert-to-contact
Response: Creates 3 new records

// Get lead qualification status
GET /api/leads/:id
Response: { rating: 'Hot'/'Warm'/'Cold', ... }
```

### Database Schema (leads table)
```sql
id, lead_name, email, phone, company, lead_source,
lead_status, rating ('Hot'/'Warm'/'Cold'), 
created_at, updated_at
```

### Workflow Integration
```
SOURCE: Website → LEAD CREATED
         ↓
STATUS: New → ASSIGN OWNER
         ↓
QUALIFY: Hot/Warm/Cold → CONVERSION DECISION
         ↓
IF HOT → Convert to Contact + Company + Deal
         ↓
DEAL STARTS → Pipeline Stage 1 (New)
```

---

## 4️⃣ DEALS WORKFLOW

### Data Flow
```
Deal Created → Pipeline Stage 1 → Move Stages → Closed Won → Convert to Project
     ↓            ↓                  ↓            ↓               ↓
Company, Contact assigned
Proposal sent
Activities logged
Database: deals table
```

### Files Involved
| File | Purpose |
|------|---------|
| `AddNewDealModal.js` | Create deal form |
| `CrmDealsPage.js` | Deal list page |
| `DealDetailsPage.js` | Deal profile |
| `DealsKanbanBoard.js` | Kanban board view (drag & drop) |
| `DealConversionModal.js` | Convert to Project/Invoice/Estimate |
| `DealReport.js` | Deal analytics |

### Pipeline Stages
```javascript
// Default stages:
1. "New" - Initial stage
2. "Discovery" - Initial contact
3. "Proposal Sent" - Proposal delivered
4. "Negotiation" - Terms discussed
5. "Closed Won" - Deal won (triggers project creation)
6. "Closed Lost" - Deal lost

// Kanban board shows all stages with cards
// Drag & drop to move deal between stages
```

### Deal Status Tracking
```javascript
// Status enum:
"Active" - Currently in pipeline
"Won" - Deal closed successfully (generates invoice)
"Lost" - Deal closed unsuccessfully
"On Hold" - Temporarily paused

// Probability: 0-100% based on stage
```

### Key API Endpoints
```javascript
// Create deal
POST /api/deals
Body: { deal_name, company_id, contact_id, stage, deal_value, ... }

// Move deal to different stage
PUT /api/deals/:id
Body: { stage: "Proposal Sent" }

// Convert deal to project (when Won)
POST /api/deals/:id/convert-to-project
Response: { project_id }
// Creates project with budget = deal_value

// Convert deal to invoice
POST /api/deals/:id/convert-to-invoice
Response: { invoice_id }
// Creates invoice with deal details

// Convert deal to estimate
POST /api/deals/:id/convert-to-estimate
Response: { estimate_id }
```

### Database Schema (deals table)
```sql
id, deal_name, company_id, contact_id, stage,
deal_value, currency, status ('Active'/'Won'/'Lost'),
probability (0-100), created_at, updated_at
```

### Workflow Integration
```
LEAD QUALIFIED
     ↓
DEAL CREATED (Stage: New)
     ↓
STAGE PROGRESSION
New → Discovery → Proposal Sent → Negotiation → Closed Won
     ↓
IF WON → Auto-trigger:
  ├─ Create Project
  ├─ Create Invoice (optional)
  ├─ Log Activity
  └─ Update Analytics

IF LOST → Mark as Lost, Log reason
```

---

## 5️⃣ PIPELINE WORKFLOW

### Data Flow
```
Pipeline Setup → Add Deals → Visualization → Stage Management
     ↓             ↓            ↓               ↓
Kanban board shows deals by stage
Drag & drop stage movement
Auto-update deal status
```

### Files Involved
| File | Purpose |
|------|---------|
| `CrmPipelinePage.js` | Pipeline main page |
| `PipelineTable.js` | Pipeline table view |
| `DealsKanbanBoard.js` | Kanban visualization |

### Key API Endpoints
```javascript
// Get all pipelines
GET /api/pipeline

// Get single pipeline with all deals
GET /api/pipeline/:id
Response: {
  id, name, description, deals: [...],
  total_deals, total_value
}

// Create new pipeline
POST /api/pipeline
Body: { name, description, stages: [...] }

// Update pipeline
PUT /api/pipeline/:id
Body: { name, stages: [...] }
```

### Pipeline Visualization
```javascript
// Kanban columns represent stages:
┌────────────┬────────────┬────────────┬────────────┐
│   New      │ Discovery  │ Proposal   │ Closed Won │
│  (5 deals) │  (3 deals) │  (2 deals) │  (4 deals) │
│  $5.2M     │  $2.1M     │  $1.8M     │  $8.9M     │
├────────────┼────────────┼────────────┼────────────┤
│ Deal 1     │ Deal 5     │ Deal 8     │ Deal 12    │
│ $500k      │ $750k      │ $600k      │ $2.5M      │
│            │            │            │            │
│ Deal 2     │ Deal 6     │ Deal 9     │ Deal 13    │
│ $480k      │ $680k      │ $700k      │ $2.2M      │
└────────────┴────────────┴────────────┴────────────┘
```

### Database Schema (pipeline table)
```sql
id, name, description, stages (JSON),
total_deals, total_value, created_at, updated_at
```

---

## 6️⃣ CAMPAIGN WORKFLOW

### Data Flow
```
Campaign Created → Target Audience → Run Campaign → Generate Leads
     ↓               ↓                  ↓              ↓
Email/Social campaign setup
Audience selection (Contacts/Leads)
Performance tracking
Auto-create leads from responses
```

### Files Involved
| File | Purpose |
|------|---------|
| `AddNewCampaignModal.js` | Create campaign form |
| `CrmCampaignPage.js` | Campaign list page |
| `CampaignTable.js` | Campaign table view |

### Key API Endpoints
```javascript
// Create campaign
POST /api/campaigns
Body: {
  campaign_name, campaign_type, target_audience,
  start_date, end_date, budget, description
}

// Get all campaigns with performance metrics
GET /api/campaigns
Response: [{ id, name, leads_generated, conversion_rate, ... }]

// Update campaign
PUT /api/campaigns/:id
Body: { status: 'Running'/'Completed' }
```

### Campaign Types
```javascript
Enum: "Email", "Social", "Event", "Referral", "Other"
```

### Workflow Integration
```
CAMPAIGN RUNNING
     ↓
AUDIENCE TARGETED
├─ Existing Contacts
└─ Existing Leads
     ↓
RESPONSE RECEIVED
     ↓
AUTO-CREATE LEAD
     ↓
LEAD ENTERS QUALIFICATION FLOW
     ↓
(See Leads Workflow)
```

---

## 7️⃣ PROJECTS WORKFLOW

### Data Flow
```
Deal Won → Auto-create Project → Add Team → Create Tasks → Track Progress
    ↓              ↓                 ↓          ↓              ↓
Project inherits deal details
Budget = Deal Value
Team members assigned
Milestones tracked
Invoices generated from progress
```

### Files Involved
| File | Purpose |
|------|---------|
| `AddNewProjectModal.js` | Create project form |
| `CrmProjectsPage.js` | Project list page |
| `ProjectDetailsPage.js` | Project profile (main) |
| `ProjectDetailsPageEnhanced.js` | Enhanced view |
| `ProjectActivityPanel.js` | Activity tracking |
| `ProjectTeamPanel.js` | Team management |
| `ProjectTasksPanel.js` | Task management |
| `ProjectReportsPage.js` | Project analytics |

### Project Auto-Creation from Deal
```javascript
// When Deal status = "Won":
POST /api/deals/:dealId/convert-to-project
{
  project_name: deal.deal_name,
  deal_id: dealId,
  company_id: deal.company_id,
  contact_id: deal.contact_id,
  budget: deal.deal_value,
  status: "Not Started"
}

// Creates project with:
├─ Name from deal
├─ Budget = deal value
├─ Linked to deal & company
├─ Status: "Not Started"
└─ Assigned to deal owner
```

### Key API Endpoints
```javascript
// Create project
POST /api/projects
Body: {
  project_name, deal_id, company_id, budget,
  start_date, end_date, status, team_members
}

// Add task to project
POST /api/projects/:projectId/tasks
Body: { task_name, assigned_to, due_date, priority }

// Get project with team & tasks
GET /api/projects/:id
Response: {
  id, name, budget, team: [...], tasks: [...]
}

// Add comment
POST /api/projects/:projectId/comments
Body: { content, author_id }
```

### Project Statuses
```javascript
Enum: "Not Started", "In Progress", "On Hold", "Completed", "Cancelled"
```

### Database Schema (projects table)
```sql
id, project_name, deal_id, company_id, contact_id,
budget, status, start_date, end_date, team_members (JSON),
created_at, updated_at
```

### Workflow Integration
```
DEAL STATUS: Won
     ↓
PROJECT AUTO-CREATED
     ↓
TEAM ASSIGNED
├─ Project Manager
├─ Developers
└─ Designers
     ↓
MILESTONES SET
     ↓
TASKS CREATED
├─ Design Phase
├─ Development Phase
├─ Testing Phase
└─ Delivery
     ↓
TIME LOGGED (optional)
     ↓
INVOICE GENERATED
(Billable hours + milestone completion)
```

---

## 8️⃣ TASKS WORKFLOW

### Data Flow
```
Task Created → Assign to User → Set Priority/Due Date → Update Status → Complete
     ↓             ↓                  ↓                   ↓              ↓
Can be created for: Contact, Lead, Deal, Project
Status: To Do → In Progress → Done
Linked to parent entity
Activity logged
```

### Files Involved
| File | Purpose |
|------|---------|
| `AddNewTaskModal.js` | Create task form |
| `TasksPage.js` | Task list page |
| `TaskDetailsPage.js` | Task details |
| `TaskReportsPage.js` | Task analytics |
| `DealTasksPanel.js` | Deal tasks |
| `ProjectTasksPanel.js` | Project tasks |

### Task Creation Options
```javascript
// Create task for Deal
POST /api/tasks
Body: {
  task_name, description, deal_id,
  assigned_to, priority, due_date, status: "To Do"
}

// Create task for Project
POST /api/projects/:projectId/tasks
Body: {
  task_name, assigned_to, due_date, priority
}

// Create task for Contact
POST /api/tasks
Body: {
  task_name, contact_id, ...
}
```

### Task Status Flow
```
To Do → In Progress → Done
  ↓         ↓          ↓
Unstarted  Active    Complete
           ↓
        Completed time logged
        Activity recorded
```

### Task Priorities
```javascript
Enum: "Low", "Medium", "High", "Critical"
```

### Key API Endpoints
```javascript
// Create task
POST /api/tasks
Body: { task_name, assigned_to, due_date, priority, ... }

// Update task status
PUT /api/tasks/:taskId
Body: { status: "In Progress" }

// Get all tasks
GET /api/tasks

// Get tasks for contact/deal/project
GET /api/tasks?contact_id=X
GET /api/tasks?deal_id=X
GET /api/tasks?project_id=X
```

### Database Schema (tasks table)
```sql
id, task_name, description, assigned_to,
contact_id, deal_id, project_id, 
priority, due_date, status ('To Do'/'In Progress'/'Done'),
created_at, updated_at, completed_at
```

### Workflow Integration
```
CONTACT → Add Task (Follow-up, Call, etc.)
DEAL → Add Task (Call/Email/Demo)
PROJECT → Add Task (Dev/Design/Testing phases)

TASK DASHBOARD shows:
- My Tasks (To Do)
- In Progress
- Completed Today
- Overdue
- Due This Week
```

---

## 9️⃣ PROPOSALS WORKFLOW

### Data Flow
```
Proposal Created → Add Items → Send to Client → Track Status → Accept/Reject
     ↓              ↓            ↓                 ↓              ↓
PDF generation
Email integration
Version history
Auto-convert to invoice if accepted
```

### Files Involved
| File | Purpose |
|------|---------|
| `AddNewProposalModal.js` | Create proposal form |
| `ProposalsPage.js` | Proposal list page |
| `ProposalDetailsPage.js` | Proposal details |
| `ProposalApprovalPanel.js` | Approval workflow |
| `ProposalWorkflow.js` | Workflow manager |
| `ProposalVersionHistory.js` | Version tracking |

### Key API Endpoints
```javascript
// Create proposal (integrated with invoices)
POST /api/invoices
Body: {
  type: "Proposal",
  client_id, items: [...],
  terms, notes
}

// Send proposal
PUT /api/invoices/:id
Body: { status: "Sent" }

// Track proposal status
GET /api/invoices/:id
Response: {
  type: "Proposal",
  status: "Sent"/"Viewed"/"Accepted"/"Rejected"
}
```

### Proposal Statuses
```javascript
Enum: "Draft", "Sent", "Viewed", "Accepted", "Rejected"
```

### Proposal → Invoice Conversion
```javascript
// When proposal status = "Accepted":
POST /api/proposals/:proposalId/accept
Response: {
  invoice_id, deal_id (updated to Proposal Sent stage)
}

// Automatically:
├─ Convert proposal to invoice
├─ Update related deal to "Proposal Sent" stage
├─ Set invoice status to "Sent"
└─ Log activity
```

### Database Schema (proposals table - integrated with invoices)
```sql
id, deal_id, client_id, items (JSON),
pricing, terms, status, version,
created_at, accepted_at, expires_at
```

---

## 🔟 CONTRACTS WORKFLOW

### Data Flow
```
Contract Created → Link to Deal/Project → Upload Documents → Status Management
     ↓              ↓                      ↓                  ↓
Legal agreement tracking
Renewal/Termination tracking
Document vault
Compliance tracking
```

### Files Involved
| File | Purpose |
|------|---------|
| `AddNewContractModal.js` | Create contract form |
| `ContractsPage.js` | Contract list page |
| `ContractDetailsPage.js` | Contract details |

### Key API Endpoints
```javascript
// Create contract
POST /api/contracts
Body: {
  contract_name, deal_id, company_id,
  start_date, end_date, value, status
}

// Get contracts for company
GET /api/companies/:companyId/contracts

// Update contract status
PUT /api/contracts/:id
Body: { status: "Active"/"Expired"/"Terminated" }
```

### Contract Statuses
```javascript
Enum: "Draft", "Active", "Expired", "Terminated"
```

### Workflow Integration
```
DEAL WON
     ↓
CONTRACT CREATED
├─ Link to Company
└─ Link to Project
     ↓
DOCUMENTS UPLOADED
     ↓
CONTRACT ACTIVE
└─ Triggers billing workflow
     ↓
RENEWAL TRACKING
└─ Auto-generate renewal reminders
```

---

## 1️⃣1️⃣ ESTIMATIONS WORKFLOW

### Data Flow
```
Estimate Created → Add Pricing → Send to Client → Approval → Convert to Invoice/Project
     ↓              ↓             ↓                 ↓          ↓
Quotation document
PDF generation
Email delivery
Client review
Auto-conversion on approval
```

### Files Involved
| File | Purpose |
|------|---------|
| `AddNewEstimationModal.js` | Create estimate form |
| `EstimationsPage.js` | Estimate list page |

### Key API Endpoints
```javascript
// Create estimate (integrated with invoices)
POST /api/invoices
Body: {
  type: "Estimate",
  client_id, items: [...],
  pricing, expiry_date
}

// Send estimate
PUT /api/invoices/:id
Body: { status: "Sent" }

// Approve estimate
POST /api/invoices/:id/approve
Response: { invoice_id }
```

### Estimate Statuses
```javascript
Enum: "Draft", "Sent", "Approved", "Rejected", "Expired"
```

### Estimate → Invoice Conversion
```javascript
// When client approves:
POST /api/invoices/:estimateId/approve
Response: {
  invoice_id,
  deal_id (updated),
  project_id (optionally created)
}

// Automatically:
├─ Convert estimate to invoice
├─ Update related deal stage if linked
├─ Create project if needed
└─ Log activity
```

---

## 1️⃣2️⃣ INVOICES WORKFLOW

### Data Flow
```
Invoice Created → Send to Client → Track Status → Payment Received → Complete
     ↓            ↓                ↓              ↓                  ↓
From Deal/Project/Manual
Auto-calculate tax
PDF generation
Email integration
Payment tracking
```

### Files Involved
| File | Purpose |
|------|---------|
| `AddNewInvoiceModal.js` | Create invoice form |
| `EditInvoiceModal.js` | Edit invoice |
| `InvoicesPage.js` | Invoice list page |
| `InvoiceDetailPage.js` | Invoice details |
| `InvoiceDashboard.js` | Invoice dashboard |
| `InvoiceReportPage.js` | Invoice analytics |

### Invoice Creation Methods

#### Method 1: Manual Creation
```javascript
POST /api/invoices
Body: {
  client_id, company_id, items: [
    { description, quantity, rate, tax }
  ],
  due_date, terms, notes
}
```

#### Method 2: Auto-Create from Deal (Won)
```javascript
POST /api/deals/:dealId/convert-to-invoice
// Creates invoice with deal details automatically
```

#### Method 3: Auto-Create from Estimate (Approved)
```javascript
POST /api/invoices/:estimateId/approve
// Converts estimate to invoice
```

### Invoice Statuses
```javascript
Enum: "Draft", "Sent", "Viewed", "Overdue", "Partially Paid", "Paid"

Status flow:
Draft → Sent → Viewed → (Due date passed: Overdue)
                  ↓
            Payment received → Partially Paid/Paid
```

### Key API Endpoints
```javascript
// Create invoice
POST /api/invoices
Body: { client_id, items: [...], due_date, ... }

// Get invoice with items
GET /api/invoices/:id/items

// Update invoice
PUT /api/invoices/:id
Body: { items: [...], status: "Sent" }

// Get invoice metrics
GET /api/invoices/metrics/summary
Response: { total_invoiced, total_paid, outstanding }

// Get invoices by status
GET /api/invoices/status/breakdown

// Link invoice to deal
POST /api/invoices/:invoiceId/link-to-deal/:dealId

// Link invoice to client
POST /api/invoices/:invoiceId/link-to-client/:clientId
```

### Invoice Tax Calculation
```javascript
// Automatic calculation:
Subtotal = Σ(quantity × rate)
Tax = Subtotal × tax_rate%
Total = Subtotal + Tax - Discount
```

### Database Schema (invoices table)
```sql
id, invoice_number, client_id, company_id, deal_id,
subtotal, tax, discount, total, status,
issue_date, due_date, paid_date,
created_at, updated_at, payment_terms
```

### Database Schema (invoice_items table)
```sql
id, invoice_id, description, quantity, rate,
tax_rate, amount, created_at
```

### Workflow Integration
```
DEAL WON
     ↓
INVOICE CREATED (Deal → Invoice conversion)
├─ Auto-populated with deal info
├─ Items from estimate/proposal
└─ Total = deal value
     ↓
INVOICE SENT TO CLIENT
├─ PDF generated
├─ Email delivery
└─ Status: "Sent"
     ↓
CLIENT RECEIVES & REVIEWS
└─ Status: "Viewed"
     ↓
PAYMENT DEADLINE TRACKING
├─ If past due: Status = "Overdue"
└─ Send reminder
     ↓
PAYMENT RECEIVED (See Payments Workflow)
└─ Status: "Paid" / "Partially Paid"
     ↓
ACCOUNTING ENTRY RECORDED
└─ Revenue recognized
```

---

## 1️⃣3️⃣ PAYMENTS WORKFLOW

### Data Flow
```
Payment Recorded → Add Amount/Method → Record Details → Update Invoice Status
     ↓             ↓                   ↓                ↓
Payment method tracking
Receipt generation
Financial reporting
Invoice status update
```

### Files Involved
| File | Purpose |
|------|---------|
| `AddNewPaymentModal.js` | Record payment form |
| `PaymentsPage.js` | Payment list page |
| `PaymentDetailsPage.js` | Payment details |
| `PaymentActionDropdown.js` | Quick actions |

### Payment Recording
```javascript
// Record payment against invoice
POST /api/invoices/:invoiceId/payment
Body: {
  amount, payment_method, payment_date,
  reference_number, notes
}

// Updates invoice:
├─ If amount < total: Status = "Partially Paid"
├─ If amount = total: Status = "Paid"
├─ If amount > total: Create credit note
└─ Log activity
```

### Payment Methods
```javascript
Enum: "Cash", "Bank Transfer", "Credit Card", "UPI", "Check", "Other"
```

### Payment Fields
```javascript
{
  invoice_id,
  amount,
  payment_method,
  payment_date,
  reference_number (check #, transaction ID, etc),
  bank_details (for transfers),
  receipt_number,
  notes,
  created_by
}
```

### Key API Endpoints
```javascript
// Record payment
POST /api/invoices/:invoiceId/payment
Body: { amount, payment_method, ... }

// Get payments for invoice
GET /api/invoices/:invoiceId/payments

// Get all payments
GET /api/payments

// Generate payment receipt
GET /api/payments/:paymentId/receipt
```

### Database Schema (payments table)
```sql
id, invoice_id, amount, payment_method,
payment_date, reference_number, receipt_number,
created_at, created_by, notes
```

### Workflow Integration
```
INVOICE STATUS: "Sent"
     ↓
CLIENT PROCESSES PAYMENT
     ↓
PAYMENT RECEIVED
     ↓
RECORD PAYMENT
POST /api/invoices/:id/payment
Body: { amount: 5000, method: "Bank Transfer" }
     ↓
SYSTEM UPDATES:
├─ Invoice status → "Partially Paid" / "Paid"
├─ Remaining amount calculated
├─ Receipt generated
├─ Activity logged
└─ Accounting entry created
     ↓
FINANCIAL REPORTS UPDATED
└─ Cash flow, revenue, A/R tracking
```

---

## 1️⃣4️⃣ ACTIVITIES WORKFLOW

### Data Flow
```
Event Occurs → Log Activity → Store in Timeline → View History
     ↓          ↓              ↓                  ↓
All module changes logged
Communication tracked
Deal movement recorded
Payment updates
Task status changes
```

### Files Involved
| File | Purpose |
|------|---------|
| `ActivitiesPage.js` | Activity timeline |
| `DealActivityLog.js` | Deal activities |
| `ProjectActivityPanel.js` | Project activities |
| `ContactDetailsPage.js` | Contact activity history |

### Activity Types
```javascript
Enum:
- "Lead Created"
- "Lead Qualified"
- "Contact Added"
- "Company Created"
- "Deal Created"
- "Deal Stage Changed"
- "Deal Won"
- "Deal Lost"
- "Proposal Sent"
- "Invoice Generated"
- "Payment Received"
- "Task Created"
- "Task Completed"
- "Project Created"
- "Project Updated"
- "Note Added"
- "Call Logged"
- "Email Sent"
- "Comment Added"
```

### Activity Logging (Auto & Manual)

#### Auto-Logged
```javascript
// Any entity creation/update:
POST /api/deals → Log: "Deal Created"
PUT /api/deals/:id (stage changed) → Log: "Deal Stage Changed"
POST /api/invoices/:id/payment → Log: "Payment Received"

// Automatic in backend:
async function logActivity(type, description, linkedTo) {
  await Activity.create({
    type, description, linkedTo,
    created_at: NOW(), created_by: req.user.id
  });
}
```

#### Manual Activity Logging
```javascript
// Add note to contact
POST /api/contacts/:contactId/notes
Body: { content, type }
// Creates activity: "Note Added"

// Log activity
POST /api/contacts/:contactId/activities
Body: { type: "Call", description: "Discussed pricing" }
```

### Key API Endpoints
```javascript
// Get contact activities
GET /api/contacts/:contactId/activities

// Get deal activities
GET /api/deals/:dealId/activities

// Get project activities
GET /api/projects/:projectId/activities

// Log activity manually
POST /api/contacts/:contactId/activities
Body: { type, description }

// Get all activities (timeline)
GET /api/activities?limit=50
```

### Database Schema (activities table)
```sql
id, type, description,
contact_id, deal_id, project_id,
created_by, created_at
```

### Activity Timeline View
```
[Today]
├─ 2:30 PM - Deal moved to "Proposal Sent" stage
├─ 1:15 PM - Invoice INV-001 sent to Acme Corp
└─ 10:00 AM - Call with John Smith (notes attached)

[Yesterday]
├─ 4:45 PM - Payment of $5,000 received
├─ 3:20 PM - New task created: "Follow-up call"
└─ 9:00 AM - Deal created: "Acme Corp - Enterprise Package"
```

---

## 1️⃣5️⃣ ANALYTICS & REPORTS WORKFLOW

### Data Flow
```
Data Collected → Aggregate → Calculate Metrics → Display Reports
     ↓            ↓            ↓                  ↓
All modules feeding data
Real-time metrics
Charts & visualizations
Export capabilities
```

### Files Involved
| File | Purpose |
|------|---------|
| `AnalyticsPage.js` | Main analytics dashboard |
| `DealReport.js` | Deal metrics |
| `LeadReport.js` | Lead metrics |
| `ContactReportsPage.js` | Contact analytics |
| `CompanyReportsPage.js` | Company analytics |
| `ProjectReportsPage.js` | Project analytics |
| `InvoiceReportPage.js` | Invoice analytics |
| `TaskReportsPage.js` | Task analytics |
| Various Chart components | Data visualization |

### Key Metrics Tracked

#### Sales Metrics
```javascript
- Pipeline Value (total $ in deals)
- Won Deals (count & value)
- Lost Deals (count & value)
- Average Deal Size
- Deal Win Rate %
- Sales by Month (trend)
- Sales by Person (team performance)
```

#### Lead Metrics
```javascript
- Total Leads
- Qualified Leads (Hot/Warm)
- Conversion Rate (Lead → Deal)
- Lead Source Performance
- Time to Qualification (days)
```

#### Revenue Metrics
```javascript
- Total Revenue (paid invoices)
- Outstanding AR (accounts receivable)
- Invoice Amount vs Received
- Payment Collection Rate
- Revenue by Month (trend)
- Revenue by Client (top clients)
```

#### Project Metrics
```javascript
- Active Projects
- On-Time Delivery Rate
- Budget vs Actual
- Project Profitability
- Team Utilization
```

#### Task Metrics
```javascript
- Total Tasks
- Completed Tasks (%)
- Overdue Tasks
- Team Task Distribution
- Task Completion Time
```

### Key API Endpoints
```javascript
// Get invoice metrics
GET /api/invoices/metrics/summary
Response: {
  total_invoiced, total_paid, outstanding,
  average_payment_time, overdue_count
}

// Get invoice status breakdown
GET /api/invoices/status/breakdown
Response: {
  draft: 5, sent: 12, viewed: 8, paid: 45, overdue: 3
}

// Get deal metrics
GET /api/deals/metrics
Response: {
  total_deals, won_deals, lost_deals, pipeline_value
}

// Get lead metrics
GET /api/leads/metrics
Response: {
  total_leads, qualified_leads, conversion_rate
}
```

### Report Types

#### Dashboard Reports
```
Sales Pipeline Dashboard
├─ Pipeline value by stage
├─ Recent deals
├─ Deal win/loss rate
└─ Top performing sales staff

Financial Dashboard
├─ Invoice metrics
├─ Payment status
├─ Revenue trend
└─ Outstanding AR

Project Dashboard
├─ Active projects
├─ On-time delivery %
├─ Budget variance
└─ Team workload
```

#### Export Options
```
- PDF reports
- CSV export
- Excel spreadsheets
- Email delivery
```

---

## 🔗 COMPLETE WORKFLOW INTEGRATION MAP

### Full End-to-End Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                    LEAD CREATED (CAMPAIGNS)                     │
│                          ↓                                       │
│                   Lead Qualification                             │
│              (Hot/Warm/Cold status assigned)                     │
│                          ↓                                       │
│               ┌──────────┴──────────┐                            │
│               ↓ IF HOT              ↓ IF WARM/COLD               │
│         CONVERT TO 3 ENTITIES  Nurture Campaign                  │
│         ├─ Contact               (See Campaign Workflow)         │
│         ├─ Company                                               │
│         └─ Deal (Stage: New)                                     │
│                          ↓                                       │
│              ┌──────────────────────┐                            │
│              │  SALES PIPELINE      │                            │
│              │  (Deal Kanban Board) │                            │
│              └──────────────────────┘                            │
│         New → Discovery → Proposal → Won                         │
│         ↓       ↓         ↓           ↓                          │
│     Add Tasks, Send Proposals, Track Activities                 │
│                          ↓                                       │
│                    DEAL WON                                      │
│                          ↓                                       │
│         ┌────────────┬────────────┬────────────┐                │
│         ↓            ↓            ↓            ↓                │
│    PROJECT      INVOICE      ESTIMATE    CONTRACT                │
│    CREATED      GENERATED     CREATED     CREATED                │
│         ├─ Team    ├─ Sent to  ├─ PDF       ├─ Status          │
│         ├─ Tasks   │  Client   └─ Approval  └─ Renewal         │
│         └─ Budget  ├─ Payment     Tracking     Tracking         │
│                    │  Tracking                                   │
│                    └─ Auto-convert                              │
│                       to invoice if                             │
│                       estimate approved                         │
│                          ↓                                       │
│              ┌───────────────────┐                              │
│              │  PROJECT EXECUTION │                             │
│              ├─ Assign Team       │                             │
│              ├─ Create Tasks      │                             │
│              ├─ Log Activities    │                             │
│              ├─ Track Progress    │                             │
│              └─ Record Time       │                             │
│              └──────────┬──────────┘                             │
│                         ↓                                        │
│                ┌─────────────────┐                              │
│                │ INVOICE WORKFLOW│                              │
│                ├─ Send to Client │                              │
│                ├─ Track Status   │                              │
│                └─ Wait for Pay   │                              │
│                └─────────┬────────┘                             │
│                         ↓                                        │
│                ┌─────────────────┐                              │
│                │ PAYMENT RECEIVED│                              │
│                ├─ Record Payment │                              │
│                ├─ Generate Rpt   │                              │
│                └─ Update Status  │                              │
│                └─────────┬────────┘                             │
│                         ↓                                        │
│              ┌──────────────────────┐                           │
│              │ ANALYTICS & REPORTS  │                           │
│              ├─ Revenue tracked     │                           │
│              ├─ Pipeline updated    │                           │
│              ├─ Team performance    │                           │
│              ├─ Financial reports   │                           │
│              └─ Activity timeline   │                           │
│                         ↓                                        │
│                   CYCLE COMPLETE                                │
│              (Ready for next Lead/Deal)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📱 USER INTERACTION FLOWS

### Sales Team Flow
```
1. View Leads Dashboard
2. Qualify leads (Hot/Warm/Cold)
3. Convert Hot leads to Deals
4. Move deals through pipeline (Kanban)
5. Send proposals
6. Track deal progress (Activities)
7. Close deal (Won)
8. Monitor invoice & payment
```

### Project Manager Flow
```
1. View Projects Dashboard
2. Check project budget
3. Add tasks for team
4. Assign tasks to team members
5. Track task progress
6. Monitor timeline
7. Generate invoices based on milestones
8. Track project performance
```

### Finance Team Flow
```
1. View Invoices Dashboard
2. Generate invoices (from deals/projects)
3. Send invoices to clients
4. Track payment status
5. Record payments
6. Generate financial reports
7. Track AR (accounts receivable)
8. Revenue forecasting
```

### Admin/Reporting Flow
```
1. Access Analytics Dashboard
2. View all KPIs
3. Generate reports (sales, revenue, projects)
4. Export data
5. View team performance
6. Monitor system health
7. Manage users & roles
```

---

**This document provides the complete technical implementation reference for all 15 CRM modules and their integration into a cohesive end-to-end workflow.**
