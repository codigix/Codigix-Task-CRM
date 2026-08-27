# CRM Database Structure Documentation

## Overview
This document describes the complete CRM system architecture and relationships implemented in the deals-dashboard application. The system follows a hierarchical structure with Companies as the root entity.

---

## 1. Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         COMPANIES (Root)                             │
│ ├─ company_name, email, phone, website, industry, revenue, etc.    │
│ └─ id (Primary Key)                                                 │
└─────────────────────────────────────────────────────────────────────┘
    │
    ├─────────────────┬──────────────────┬──────────────┬─────────────┤
    │                 │                  │              │             │
    ▼                 ▼                  ▼              ▼             ▼
┌──────────┐  ┌──────────┐  ┌─────────┐  ┌────────┐  ┌──────┐
│CONTACTS  │  │  DEALS   │  │PROJECTS │  │ FILES  │  │NOTES │
│  ├─1-M   │  │  ├─1-M   │  │  ├─1-M  │  │        │  │      │
│  │activity│  │  │activity│  │ ├─Tasks│  │        │  │      │
│  │notes   │  │  │notes   │  │ ├─Team │  │        │  │      │
│  │files   │  │  │files   │  │ └─Time │  │        │  │      │
│  └─tasks  │  │  │        │  │  Sheet│  │        │  │      │
└──────────┘  └──────────┘  └─────────┘  └────────┘  └──────┘
    │              │
    │              ├─────────────────┬────────────────┤
    │              │                 │                │
    │              ▼                 ▼                ▼
    │         ┌─────────────┐  ┌──────────┐  ┌───────────┐
    │         │ESTIMATIONS  │  │INVOICES  │  │PIPELINE   │
    │         │  ├─Line Items│  │├─From Est│  │ STAGES    │
    │         │  └─           │  ├─Line Items│  │           │
    │         └─────────────┘  └──────────┘  └───────────┘
    │
    └─ ACTIVITIES (linked to Company, Contact, Deal, or Project)
    └─ NOTES (linked to Company, Contact, Deal, or Project)
    └─ FILES (linked to Company, Contact, Deal, or Project)
```

---

## 2. Core Tables

### 2.1 COMPANIES
**Primary entity - represents client/organization**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| company_name | VARCHAR(255) | NOT NULL | Company legal name |
| email | VARCHAR(150) | UNIQUE | Company email |
| phone | VARCHAR(20) | | Company phone |
| website | VARCHAR(255) | | Company website URL |
| industry | VARCHAR(100) | | Industry classification |
| revenue | DECIMAL(15,2) | | Annual revenue |
| employees | INT | | Number of employees |
| description | LONGTEXT | | Company description |
| logo | LONGTEXT | | Company logo (base64) |
| address, city, state, country, zipcode | VARCHAR | | Full address |
| status | ENUM('Active', 'Inactive', 'Prospect') | | Company status |
| created_by | INT | FK → users | User who created record |
| created_at, updated_at | TIMESTAMP | | Audit timestamps |

**Relationships:**
- → **CONTACTS** (1:M)
- → **DEALS** (1:M)
- → **PROJECTS** (1:M)
- → **INVOICES** (1:M)
- → **FILES** (1:M)
- → **ACTIVITIES** (1:M)
- → **NOTES** (1:M)

---

### 2.2 CONTACTS
**Represents a person at a company**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| first_name | VARCHAR(100) | NOT NULL | First name |
| last_name | VARCHAR(100) | | Last name |
| email | VARCHAR(150) | UNIQUE | Email address |
| phone | VARCHAR(20) | | Phone number |
| company_id | INT | FK → companies | Parent company |
| position | VARCHAR(100) | | Job title |
| department | VARCHAR(100) | | Department name |
| source | VARCHAR(100) | | How contact was acquired |
| status | ENUM('Active', 'Inactive') | | Contact status |
| avatar | LONGTEXT | | Profile picture (base64) |
| notes | LONGTEXT | | Contact notes |
| created_at, updated_at | TIMESTAMP | | Audit timestamps |

**Relationships:**
- ← **COMPANIES** (M:1)
- → **ACTIVITIES** (1:M)
- → **NOTES** (1:M)
- → **FILES** (1:M)
- → **CONTACT_TASKS** (1:M)
- → **DEALS** (1:M - optional)

---

### 2.3 DEALS
**Represents a sales opportunity**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| deal_name | VARCHAR(255) | NOT NULL | Deal name/description |
| company_id | INT | FK → companies | Associated company |
| contact_id | INT | FK → contacts | Primary contact |
| assignee_id | INT | FK → users | Assigned sales person |
| deal_value | DECIMAL(15,2) | | Deal amount |
| currency | VARCHAR(10) | DEFAULT 'USD' | Currency code |
| deal_stage | VARCHAR(100) | | Current stage |
| pipeline_stage_id | INT | FK → pipeline_stages | Pipeline stage reference |
| pipeline | VARCHAR(100) | | Pipeline name |
| status | VARCHAR(100) | | Status (Won/Lost/Open) |
| probability | INT | | Win probability (0-100) |
| expected_close_date | DATE | | Expected closing date |
| due_date | DATE | | Due date |
| follow_up_date | DATE | | Follow-up scheduled date |
| source | VARCHAR(100) | | Deal source |
| priority | VARCHAR(50) | | Priority level |
| tags | VARCHAR(500) | | Comma-separated tags |
| description | LONGTEXT | | Deal details |
| created_at, updated_at | TIMESTAMP | | Audit timestamps |

**Relationships:**
- ← **COMPANIES** (M:1)
- ← **CONTACTS** (M:1) - optional
- → **ESTIMATIONS** (1:M)
- → **INVOICES** (1:M)
- → **PROJECTS** (1:M)
- → **ACTIVITIES** (1:M)
- → **NOTES** (1:M)
- → **FILES** (1:M)
- → **PIPELINE_STAGES** (M:1) - optional

---

### 2.4 ESTIMATIONS (Quotations)
**Proposal/quotation for a deal**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| estimation_number | VARCHAR(50) | UNIQUE | Reference number |
| client_id | INT | FK → companies | Company |
| contact_id | INT | FK → contacts | Primary contact |
| deal_id | INT | FK → deals | Associated deal |
| project_id | INT | FK → projects | Optional project |
| bill_to, ship_to | VARCHAR(255) | | Billing/shipping address |
| amount | DECIMAL(15,2) | | Total amount |
| currency | VARCHAR(10) | DEFAULT 'USD' | Currency |
| subtotal | DECIMAL(15,2) | | Subtotal before tax |
| discount_percentage | DECIMAL(5,2) | | Discount % |
| tax_percentage | DECIMAL(5,2) | | Tax % |
| total | DECIMAL(15,2) | | Final total |
| estimate_date | DATE | | Date created |
| expiry_date | DATE | | Quote expiry date |
| status | ENUM('Draft','Sent','Accepted','Declined') | | Estimation status |
| description | LONGTEXT | | Details |
| estimate_by | INT | FK → users | Created by user |
| created_at, updated_at | TIMESTAMP | | Audit timestamps |

**Relationships:**
- ← **COMPANIES** (M:1)
- ← **CONTACTS** (M:1) - optional
- ← **DEALS** (M:1) - optional
- → **ESTIMATION_LINE_ITEMS** (1:M)
- → **INVOICES** (1:M) - conversion

---

### 2.5 ESTIMATION_LINE_ITEMS
**Line items in an estimation**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| estimation_id | INT | FK → estimations | Parent estimation |
| item_name | VARCHAR(255) | NOT NULL | Item description |
| description | LONGTEXT | | Detailed description |
| quantity | DECIMAL(10,2) | NOT NULL | Quantity |
| rate | DECIMAL(15,2) | NOT NULL | Unit price |
| discount_percent | DECIMAL(5,2) | | Line item discount % |
| discount_amount | DECIMAL(15,2) | | Calculated discount amount |
| tax_percent | DECIMAL(5,2) | | Line item tax % |
| tax_amount | DECIMAL(15,2) | | Calculated tax amount |
| subtotal | DECIMAL(15,2) | | qty × rate - discount |
| total | DECIMAL(15,2) | | subtotal + tax |
| created_at, updated_at | TIMESTAMP | | Audit timestamps |

**Relationships:**
- ← **ESTIMATIONS** (M:1)

---

### 2.6 INVOICES
**Generated from estimations or projects**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| invoice_number | VARCHAR(50) | UNIQUE | Reference number |
| client_id | INT | FK → companies | Billing company |
| estimate_id | INT | FK → estimations | From which estimation |
| project_id | INT | FK → projects | Associated project |
| deal_id | INT | FK → deals | Associated deal |
| bill_to, ship_to | VARCHAR(255) | | Address |
| amount | DECIMAL(15,2) | | Amount |
| currency | VARCHAR(10) | DEFAULT 'USD' | Currency |
| invoice_date | DATE | | Invoice date |
| open_till | DATE | | Payment due date |
| status | ENUM(...) | | Paid/Unpaid/Overdue |
| payment_method | VARCHAR(100) | | How paid |
| amount_paid | DECIMAL(15,2) | | Amount received |
| payment_date | DATE | | Payment date |
| subtotal | DECIMAL(15,2) | | Before discounts/tax |
| discount_percentage | DECIMAL(5,2) | | Discount % |
| discount_amount | DECIMAL(15,2) | | Discount amount |
| tax_percentage | DECIMAL(5,2) | | Tax % |
| tax_amount | DECIMAL(15,2) | | Tax amount |
| total | DECIMAL(15,2) | | Final total |
| description, notes, terms_conditions | LONGTEXT | | Details |
| created_at, updated_at | TIMESTAMP | | Audit timestamps |

**Relationships:**
- ← **COMPANIES** (M:1)
- ← **ESTIMATIONS** (M:1) - optional
- ← **PROJECTS** (M:1) - optional
- → **INVOICE_ITEMS** (1:M)

---

### 2.7 INVOICE_ITEMS
**Line items in an invoice**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| invoice_id | INT | FK → invoices | Parent invoice |
| item_name | VARCHAR(255) | NOT NULL | Item description |
| description | LONGTEXT | | Details |
| quantity | DECIMAL(10,2) | NOT NULL | Quantity |
| price | DECIMAL(15,2) | NOT NULL | Unit price |
| discount_percentage | DECIMAL(5,2) | | Discount % |
| discount_amount | DECIMAL(15,2) | | Discount amount |
| tax_percentage | DECIMAL(5,2) | | Tax % |
| tax_amount | DECIMAL(15,2) | | Tax amount |
| amount | DECIMAL(15,2) | | Line item total |
| created_at, updated_at | TIMESTAMP | | Audit timestamps |

**Relationships:**
- ← **INVOICES** (M:1)

---

### 2.8 PROJECTS
**Conversion of a deal into a project for execution**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Project name |
| title | VARCHAR(255) | | Alternative title |
| description | LONGTEXT | | Project details |
| deal_id | INT | FK → deals | Source deal |
| company_id | INT | FK → companies | Company |
| contact_id | INT | FK → contacts | Primary contact |
| budget | DECIMAL(15,2) | | Project budget |
| currency | VARCHAR(10) | DEFAULT 'USD' | Currency |
| status | ENUM('Planning','In Progress','On Hold','Completed','Cancelled','Active') | | Project status |
| start_date | DATE | | Project start |
| end_date | DATE | | Project end |
| due_date | DATE | | Due date |
| created_by | INT | FK → users | Project creator |
| created_at, updated_at | TIMESTAMP | | Audit timestamps |

**Relationships:**
- ← **COMPANIES** (M:1)
- ← **CONTACTS** (M:1) - optional
- ← **DEALS** (M:1)
- → **PROJECT_TASKS** (1:M)
- → **PROJECT_TEAM** (1:M)
- → **PROJECT_TIMESHEETS** (1:M)
- → **INVOICES** (1:M)
- → **ACTIVITIES** (1:M)
- → **NOTES** (1:M)
- → **FILES** (1:M)

---

### 2.9 PROJECT_TASKS
**Tasks within a project**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| title | VARCHAR(255) | NOT NULL | Task title |
| description | LONGTEXT | | Task details |
| project_id | INT | FK → projects | Parent project |
| status | ENUM('Open','In Progress','Completed','On Hold') | | Task status |
| priority | ENUM('Low','Medium','High','Critical') | | Priority level |
| assigned_to | INT | FK → users | Assigned user |
| created_by | INT | FK → users | Task creator |
| start_date | DATE | | Start date |
| due_date | DATE | | Due date |
| completed_date | DATETIME | | Completion timestamp |
| created_at, updated_at | TIMESTAMP | | Audit timestamps |

**Relationships:**
- ← **PROJECTS** (M:1)
- → **USERS** (M:1) - assignment

---

### 2.10 PROJECT_TEAM
**Team members assigned to a project**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| project_id | INT | FK → projects | Project |
| user_id | INT | FK → users | Team member |
| role | VARCHAR(100) | | Role in project |
| allocation_percentage | INT | DEFAULT 100 | % time allocation |
| joined_at | TIMESTAMP | | Join date |
| UNIQUE KEY | (project_id, user_id) | | Prevent duplicates |

**Relationships:**
- ← **PROJECTS** (M:1)
- → **USERS** (M:1)

---

### 2.11 PROJECT_TIMESHEETS
**Time tracking for project work**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| project_id | INT | FK → projects | Project |
| user_id | INT | FK → users | Team member |
| work_date | DATE | NOT NULL | Date of work |
| hours_worked | DECIMAL(5,2) | NOT NULL | Hours worked |
| description | LONGTEXT | | Work description |
| created_by | INT | FK → users | Entry creator |
| created_at, updated_at | TIMESTAMP | | Audit timestamps |

**Relationships:**
- ← **PROJECTS** (M:1)
- → **USERS** (M:1)

---

## 3. Supporting Tables

### 3.1 ACTIVITIES
**Tracks interactions: calls, emails, meetings, follow-ups**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| activity_type | ENUM('Call','Email','Meeting','Note','Follow-up','Task') | | Activity type |
| title | VARCHAR(255) | NOT NULL | Activity title |
| description | LONGTEXT | | Details |
| status | ENUM('Pending','Completed','Cancelled') | | Status |
| priority | ENUM('Low','Medium','High','Critical') | | Priority |
| contact_id | INT | FK → contacts | Associated contact |
| deal_id | INT | FK → deals | Associated deal |
| project_id | INT | FK → projects | Associated project |
| company_id | INT | FK → companies | Associated company |
| assigned_to | INT | FK → users | Assigned to |
| created_by | INT | FK → users | Created by |
| scheduled_date | DATETIME | | When scheduled |
| completed_date | DATETIME | | When completed |
| duration_minutes | INT | | Duration |
| meeting_link | VARCHAR(500) | | Video call link |
| notes | LONGTEXT | | Activity notes |
| created_at, updated_at | TIMESTAMP | | Audit timestamps |

**Relationships:**
- → **CONTACTS** (M:1) - optional
- → **DEALS** (M:1) - optional
- → **PROJECTS** (M:1) - optional
- → **COMPANIES** (M:1) - optional
- → **USERS** (M:1) - assignment

---

### 3.2 ENTITY_NOTES
**Notes attached to any entity**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| title | VARCHAR(255) | NOT NULL | Note title |
| description | LONGTEXT | NOT NULL | Note content |
| contact_id | INT | FK → contacts | For contact |
| company_id | INT | FK → companies | For company |
| deal_id | INT | FK → deals | For deal |
| project_id | INT | FK → projects | For project |
| priority | ENUM('Low','Medium','High') | | Note importance |
| is_important | BOOLEAN | DEFAULT FALSE | Flagged as important |
| created_by | INT | FK → users | Created by |
| created_at, updated_at | TIMESTAMP | | Audit timestamps |

**Relationships:**
- → **CONTACTS** (M:1) - optional
- → **COMPANIES** (M:1) - optional
- → **DEALS** (M:1) - optional
- → **PROJECTS** (M:1) - optional

---

### 3.3 CONTACT_TASKS
**Tasks specifically for contacts**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| title | VARCHAR(255) | NOT NULL | Task title |
| description | LONGTEXT | | Details |
| contact_id | INT | FK → contacts | For contact |
| status | ENUM('Open','In Progress','Completed','On Hold') | | Status |
| priority | ENUM('Low','Medium','High','Critical') | | Priority |
| assigned_to | INT | FK → users | Assigned to |
| created_by | INT | FK → users | Created by |
| due_date | DATE | | Due date |
| completed_date | DATETIME | | Completion time |
| created_at, updated_at | TIMESTAMP | | Audit timestamps |

**Relationships:**
- ← **CONTACTS** (M:1)
- → **USERS** (M:1) - assignment

---

### 3.4 ENTITY_FILES
**File associations with entities**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| file_id | INT | FK → files | The file |
| company_id | INT | FK → companies | For company |
| deal_id | INT | FK → deals | For deal |
| contact_id | INT | FK → contacts | For contact |
| project_id | INT | FK → projects | For project |
| uploaded_by | INT | FK → users | Uploader |
| created_at, updated_at | TIMESTAMP | | Audit timestamps |

**Relationships:**
- → **FILES** (M:1)
- → **COMPANIES** (M:1) - optional
- → **DEALS** (M:1) - optional
- → **CONTACTS** (M:1) - optional
- → **PROJECTS** (M:1) - optional

---

### 3.5 PIPELINE_STAGES
**Deal pipeline configuration**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| name | VARCHAR(100) | NOT NULL | Stage name |
| pipeline_id | INT | | Pipeline reference |
| position | INT | DEFAULT 0 | Display order |
| description | TEXT | | Stage description |
| created_at, updated_at | TIMESTAMP | | Audit timestamps |

**Relationships:**
- → **DEALS** (1:M) - optional

---

### 3.6 FILES (existing)
**File storage and management**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique identifier |
| user_id | INT | FK → users | File owner |
| folder_id | INT | FK → file_folders | Parent folder |
| name | VARCHAR(255) | NOT NULL | File name |
| file_type | VARCHAR(50) | | Extension |
| size_bytes | BIGINT | NOT NULL | File size |
| storage_type | ENUM(...) | DEFAULT 'Internal' | Storage location |
| file_path | VARCHAR(500) | | Server path |
| mime_type | VARCHAR(100) | | MIME type |
| is_favorite | BOOLEAN | DEFAULT FALSE | Marked favorite |
| is_shared | BOOLEAN | DEFAULT FALSE | Shared with others |
| access_count | INT | DEFAULT 0 | Access count |
| created_at, updated_at | TIMESTAMP | | Audit timestamps |

**Relationships:**
- ← **ENTITY_FILES** (1:M)

---

## 4. API Endpoints Summary

### 4.1 Activities Endpoints
```
POST   /api/activities                          Create activity
GET    /api/activities?contact_id=X&deal_id=Y  List activities (with filters)
PUT    /api/activities/:id                      Update activity
DELETE /api/activities/:id                      Delete activity
```

### 4.2 Notes Endpoints
```
POST   /api/notes                               Create note
GET    /api/notes?company_id=X&deal_id=Y       List notes (with filters)
DELETE /api/notes/:id                           Delete note
```

### 4.3 Project Tasks Endpoints
```
POST   /api/projects/:projectId/tasks           Create task
GET    /api/projects/:projectId/tasks           List project tasks
PUT    /api/project-tasks/:id                   Update task
DELETE /api/project-tasks/:id                   Delete task
```

### 4.4 Contact Tasks Endpoints
```
POST   /api/contacts/:contactId/tasks           Create contact task
GET    /api/contacts/:contactId/tasks           List contact tasks
```

### 4.5 Project Team Endpoints
```
POST   /api/projects/:projectId/team            Add team member
GET    /api/projects/:projectId/team            List team
DELETE /api/projects/:projectId/team/:userId    Remove team member
```

### 4.6 Project Timesheets Endpoints
```
POST   /api/projects/:projectId/timesheets           Create timesheet
GET    /api/projects/:projectId/timesheets?filters   List timesheets
```

### 4.7 Estimation Items Endpoints
```
POST   /api/estimations/:estimationId/items         Add line item
GET    /api/estimations/:estimationId/items         List items
DELETE /api/estimation-items/:id                     Delete item
```

### 4.8 Pipeline Stages Endpoints
```
GET    /api/pipeline-stages                    List all stages
POST   /api/pipeline-stages                    Create new stage
```

### 4.9 Entity Files Endpoints
```
POST   /api/entity-files                       Associate file
GET    /api/entity-files?company_id=X&deal_id=Y   List files
DELETE /api/entity-files/:id                   Remove association
```

---

## 5. Data Flow Examples

### 5.1 Lead to Invoice Flow
```
1. Lead (New prospect)
2. → Convert to Contact (linked to Company)
3. → Create Deal (Company + Contact + Value)
4. → Create Estimation (from Deal with line items)
5. → Review & Accept Estimation
6. → Convert to Project (Deal → Project)
7. → Create Invoice (from Estimation)
8. → Track in Project (Tasks, Team, Timesheets)
9. → Mark Invoice Paid
10. → Close Project → Close Deal
```

### 5.2 Activity Tracking Flow
```
Contact receives a call
→ Create Activity (type: Call, contact_id: X)
→ Activity linked to Contact
→ Can also link to Company or Deal if relevant
→ Can assign follow-up task
→ Mark complete when done
```

### 5.3 Document Management Flow
```
Sales creates Estimation
→ Upload supporting documents
→ Entity_Files links document to Estimation & Deal
→ When Deal → Project: documents accessible in project
→ Team can access and download files
```

---

## 6. Key Features Implemented

### ✓ Multi-Entity Relationships
- Activities, Notes, and Files can be linked to any entity (Company, Contact, Deal, Project)
- Flexible architecture supports future entity additions

### ✓ Financial Tracking
- Estimations with line items and automatic calculations
- Invoices from estimations with full audit trail
- Tax and discount handling at line item level

### ✓ Project Management
- Deal → Project conversion
- Team assignment with allocation percentages
- Task management with status tracking
- Time tracking via timesheets

### ✓ Pipeline Management
- Configurable pipeline stages
- Deal stage tracking
- Status management (Won/Lost/Open)

### ✓ Audit Trail
- created_at, updated_at on all tables
- created_by, updated_by tracking where applicable
- Status change history tracking

### ✓ Data Integrity
- Foreign key constraints ensure referential integrity
- Cascade deletes for child entities
- Unique constraints on reference numbers

---

## 7. Best Practices

### When Creating a Deal:
1. Always link to a Company
2. Optionally link to a Contact (if known)
3. Set appropriate pipeline stage
4. Assign to sales person
5. Create activities for follow-ups

### When Creating an Estimation:
1. Link to Deal
2. Add line items with accurate pricing
3. Set expiry date
4. Add supporting files if needed
5. Create activity reminder

### When Converting Deal to Project:
1. Ensure Deal is progressing well
2. Create Project from Deal
3. Add team members
4. Create project tasks
5. Set team allocation percentages

### When Invoicing:
1. Create from Estimation (if possible)
2. Link to Deal for traceability
3. Attach project if applicable
4. Set payment terms
5. Create activity reminder for follow-up

---

## 8. Database Indexes

All major lookup columns are indexed:
- `companies(company_name, status, created_at)`
- `contacts(email, company_id, status)`
- `deals(company_id, deal_stage, status, expected_close_date)`
- `projects(company_id, status, deal_id)`
- `activities(contact_id, deal_id, project_id, activity_type)`
- `entity_notes(contact_id, company_id, deal_id, project_id)`
- `estimations(client_id, status, estimate_date)`
- `invoices(client_id, status, invoice_date)`

---

## 9. Migration Applied

The following migration was executed:
- `migrate-crm-structure.js` - Creates all CRM-specific tables and relationships

To run manually:
```bash
cd server
node migrate-crm-structure.js
```

---

## 10. Integration Points

### Frontend Components Need:
- Activity timeline display
- Note management UI
- Task assignment interface
- Project team management
- Timesheet entry forms
- Estimation/Invoice builders
- File upload integration

### Backend Services:
- File storage integration (already present)
- Email notifications for activities
- Payment processing for invoices
- Reporting and analytics queries

---

End of Documentation
