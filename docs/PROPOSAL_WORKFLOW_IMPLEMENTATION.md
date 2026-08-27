# Proposal Workflow Implementation Guide

## Overview

The CRM proposal workflow has been enhanced to support a complete lifecycle from creation through client acceptance and invoice conversion. This document outlines the new workflow system, components, and processes.

## Workflow Stages

The proposal workflow consists of the following stages:

### 1. **Draft** (Initial Creation)
- **Status**: `Draft`
- **Description**: Proposal is being prepared but not yet submitted
- **User**: Creator/Sales person
- **Actions Available**:
  - Edit proposal details
  - Add/modify line items
  - Save as draft
  - Submit for Approval

### 2. **Approval** (Manager Review)
- **Status**: `Submitted` → `Approved`
- **Description**: Proposal awaiting manager review and approval
- **User**: Manager/Admin
- **Actions Available**:
  - Approve with comments
  - Reject with feedback
  - Request revisions

### 3. **Sending** (Client Communication)
- **Status**: `Approved` → `Sent`
- **Description**: Approved proposal ready to be sent to client
- **User**: Sales/Manager
- **Actions Available**:
  - Send to client (email integration ready)
  - Export as PDF
  - Download proposal

### 4. **Client Review** (Waiting for Response)
- **Status**: `Sent`
- **Description**: Proposal sent to client, waiting for feedback
- **User**: Client/Sales
- **Actions Available**:
  - Track proposal views
  - Send reminders
  - Create revision if needed

### 5. **Negotiation** (Client Feedback)
- **Status**: `Sent` (extended)
- **Description**: Client providing feedback or requesting changes
- **User**: Client/Sales
- **Actions Available**:
  - Create proposal revision
  - Update terms/pricing
  - Add comments/notes

### 6. **Acceptance** (Deal Closure)
- **Status**: `Accepted`
- **Description**: Client has accepted the proposal
- **User**: Sales/Manager
- **Actions Available**:
  - Convert to Invoice
  - Mark as Won
  - Create project

### 7. **Rejection/Decline**
- **Status**: `Declined` or `Rejected`
- **Description**: Proposal declined by client or rejected by manager
- **User**: Client/Manager
- **Actions Available**:
  - Create new proposal
  - Archive for history
  - Analyze in reports

---

## Frontend Components

### 1. **ProposalWorkflow.js**
Visual workflow indicator showing all stages and current position in the workflow.

**Location**: `client/src/components/ProposalWorkflow.js`

**Features**:
- Visual pipeline of all 7 workflow stages
- Current stage highlighting
- Quick action buttons for workflow transitions
- Proposal summary display
- Comment/notes functionality

**Props**:
```javascript
{
  proposal: Object,           // Current proposal data
  onStatusChange: Function,   // Status change handler
  onApprove: Function,        // Approval handler
  onReject: Function,         // Rejection handler
  onSend: Function,           // Send to client handler
  onConvertToInvoice: Function // Invoice conversion handler
}
```

### 2. **AddNewProposalModal.js** (Enhanced)
Enhanced form for creating new proposals with workflow selection.

**Location**: `client/src/components/AddNewProposalModal.js`

**New Features**:
- **Workflow Action Selection Panel**
  - Save as Draft (stays in Draft status)
  - Submit for Approval (moves to Submitted status)
- Visual indication of selected workflow action
- Expandable sections for better UX
- Line items management
- Terms & conditions support

**Workflow Actions**:
- **Save as Draft**: Proposal saved with `status = 'Draft'`
  - Can be edited later
  - Not visible to managers for approval
  - Button label: "Save as Draft"

- **Submit for Approval**: Proposal saved with `status = 'Submitted'`
  - Goes to manager approval queue
  - Cannot be edited by creator
  - Button label: "Submit for Approval"

### 3. **ProposalApprovalPanel.js**
Manager approval interface for submitted proposals.

**Location**: `client/src/components/ProposalApprovalPanel.js`

**Features**:
- Approval/Rejection form
- Review comments section
- Requested changes field (for rejection)
- Proposal summary for quick review
- Two-button approval flow (Approve/Reject)

**Props**:
```javascript
{
  proposal: Object,        // Proposal being reviewed
  isManager: Boolean,      // Manager permission check
  onApprove: Function,     // Approval handler
  onReject: Function       // Rejection handler
}
```

### 4. **ProposalVersionHistory.js**
Version tracking and revision history component.

**Location**: `client/src/components/ProposalVersionHistory.js`

**Features**:
- Timeline of all proposal versions
- Status tracking for each version
- Date and user information
- Download previous versions
- Compare versions
- Collapsible version details

### 5. **ProposalDetailsPage.js** (Enhanced)
Main proposal detail view with integrated workflow.

**Location**: `client/src/components/ProposalDetailsPage.js`

**New Tabs**:
1. **Workflow Tab** - Visual workflow + approval panel
2. **Details Tab** - Proposal information
3. **Line Items Tab** - Services/products
4. **Version History Tab** - Revision tracking
5. **Activity Log Tab** - Historical changes

---

## Backend Endpoints

### Proposal Creation
```
POST /api/proposals
Body: {
  title, proposal_number, description, client_id, contact_id, deal_id,
  proposal_date, validity_date, currency, terms_conditions, notes,
  lineItems: [{item_name, description, quantity, rate, discount_percent, tax_percent}],
  status: 'Draft'  // or 'Submitted' based on workflow action
}
```

### Workflow Actions

#### 1. Submit for Approval
```
POST /api/proposals/:id/submit
Body: {
  created_by: userId,
  comments: string (optional)
}
Response: { message: 'Proposal submitted for approval successfully' }
Transition: Draft → Submitted
```

#### 2. Approve Proposal
```
POST /api/proposals/:id/approve
Body: {
  action_by: userId,
  comments: string (optional)
}
Response: { message: 'Proposal approved successfully' }
Transition: Submitted → Approved
```

#### 3. Reject Proposal
```
POST /api/proposals/:id/reject
Body: {
  action_by: userId,
  reason: string (optional),
  comments: string (optional)
}
Response: { message: 'Proposal rejected successfully' }
Transition: Submitted → Rejected
```

#### 4. Send to Client
```
POST /api/proposals/:id/send
Body: {
  action_by: userId,
  client_email: string (optional),
  comments: string (optional)
}
Response: { message: 'Proposal sent to client successfully' }
Transition: Approved → Sent
```

#### 5. Get Proposal History
```
GET /api/proposals/:id/history
Response: [
  {
    id, proposal_id, action, action_by, old_status, new_status,
    comments, created_at, first_name, last_name, email
  }
]
```

---

## Database Schema

### Proposals Table
```sql
CREATE TABLE proposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposal_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description LONGTEXT,
  client_id INT NOT NULL,
  contact_id INT,
  deal_id INT,
  created_by INT,
  status ENUM('Draft', 'Submitted', 'Approved', 'Rejected', 'Sent', 'Accepted', 'Declined') DEFAULT 'Draft',
  proposal_date DATE,
  validity_date DATE,
  total_amount DECIMAL(15, 2),
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  terms_conditions LONGTEXT,
  notes LONGTEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ...
)
```

### Proposal History Table
```sql
CREATE TABLE proposal_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  action_by INT,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  comments LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
  FOREIGN KEY (action_by) REFERENCES users(id) ON DELETE SET NULL
)
```

---

## User Journey

### Sales Person's Flow
1. **Create Proposal**: Access "Add New Proposal" form
2. **Fill Details**: Add proposal info, line items, terms
3. **Choose Action**:
   - Save as Draft (edit later)
   - Submit for Approval (send to manager)
4. **Track Status**: View workflow progress on Details page
5. **Send to Client**: After approval, send proposal
6. **Track Response**: Monitor client acceptance
7. **Convert**: Convert accepted proposal to invoice

### Manager's Flow
1. **Review Queue**: See submitted proposals
2. **Open Proposal**: View full details
3. **Review**: Check amounts, terms, client info
4. **Decision**:
   - Approve (send to sales to send client)
   - Reject (with feedback for revision)
5. **Track**: View all proposal approvals

### Client's Flow (Future Integration)
1. **Receive Email**: Proposal link in email
2. **View Proposal**: Download or view online
3. **Respond**: Accept or request changes
4. **Communicate**: Messages with sales team

---

## Status Transitions Diagram

```
CREATION
   ↓
[DRAFT] ←────────────────┐
   ↓                     │ (Rejected)
Submit for Approval      │
   ↓                     │
[SUBMITTED] ─────────────┤
   ↓                     │
Approve/Reject           │
   ↓                     │
[APPROVED] ──────────────┘
   ↓
Send to Client
   ↓
[SENT]
   ↓
Client Response
   ↓
[ACCEPTED] or [DECLINED]
   ↓
Convert to Invoice (if Accepted)
   ↓
[Invoice Created]
```

---

## Key Features

### 1. Draft Saving
- Save proposals without submitting for approval
- Edit anytime before submission
- No manager notification

### 2. Approval Workflow
- Submitted proposals require manager approval
- Approval process with comments
- Rejection with feedback mechanism

### 3. Version Control
- Track all proposal versions
- Download historical versions
- Compare version changes

### 4. Status History
- Complete audit trail of all changes
- User information for each action
- Timestamps for compliance

### 5. Workflow Visualization
- Clear visual indication of current stage
- All possible next steps visible
- Quick action buttons

---

## Security & Permissions

### Draft Proposals
- Only creator can edit
- Not visible to managers until submitted
- Manager can view if submitted

### Submitted Proposals
- Creator cannot edit (locked)
- Manager must approve/reject
- Becomes editable again if rejected

### Approved Proposals
- Cannot be edited
- Can be sent to client
- Ready for client review

---

## Future Enhancements

1. **Email Integration**: Automatic email on status changes
2. **Client Portal**: Client can view/accept proposals
3. **Template System**: Predefined proposal templates
4. **PDF Generation**: Automated PDF generation with styling
5. **eSignature**: Digital signature for acceptance
6. **Notifications**: Real-time push notifications
7. **Analytics**: Conversion rate tracking
8. **Bulk Operations**: Process multiple proposals
9. **Custom Fields**: Add client-specific fields
10. **Revision Tracking**: Track specific changes between versions

---

## Testing Checklist

- [ ] Create proposal as Draft
- [ ] Submit proposal for approval
- [ ] Approve submitted proposal
- [ ] Reject with feedback
- [ ] Send approved proposal to client
- [ ] Mark as accepted
- [ ] Convert to invoice
- [ ] View workflow visualization
- [ ] Check version history
- [ ] Verify activity log
- [ ] Test permission controls
- [ ] Verify API responses

---

## Troubleshooting

### Proposal not showing in list
- Check status filter
- Verify client_id is correct
- Check user permissions

### Cannot submit proposal
- Ensure all required fields are filled
- Check if proposal is in Draft status
- Verify proposal_number is unique

### Approval not working
- Check if proposal is in Submitted status
- Verify user has manager role
- Check database connection

### Status not updating
- Verify API endpoint is correct
- Check error logs
- Ensure valid status transition

---

## Support & Documentation

For more information about:
- API usage: See API_SERVICE_GUIDE.md
- Component integration: Check component files
- Database setup: Run setup-proposals-tables.js
- Testing: Review test files

