# CRM Quick Reference Guide

## Table Structure at a Glance

```
COMPANIES (Root)
├── CONTACTS
├── DEALS
│   ├── ESTIMATIONS → ESTIMATION_LINE_ITEMS → INVOICES
│   ├── PROJECTS → PROJECT_TASKS, PROJECT_TEAM, PROJECT_TIMESHEETS
│   └── Linked to: ACTIVITIES, NOTES, FILES
├── INVOICES → INVOICE_ITEMS
├── FILES
├── ACTIVITIES (type: Call, Email, Meeting, Note, Follow-up, Task)
└── NOTES
```

---

## Core Tables Quick Reference

### COMPANIES
Primary entity representing client/organization
- Link contacts, deals, projects
- Track revenue, employees, status

### CONTACTS
People at companies
- Email, phone, job title
- Activity history (calls, emails, meetings)
- Associated deals and tasks

### DEALS
Sales opportunities
- Linked to Company + Contact
- Track value, stage, probability
- Convert to Estimations → Invoices → Projects

### ESTIMATIONS (Quotations)
Proposals for deals
- Line items with pricing
- Calculate tax & discount automatically
- Convert to invoices

### INVOICES
Billing documents
- From estimations or projects
- Line items & payment tracking
- Status: Draft, Sent, Paid, Overdue

### PROJECTS
Execution of deals
- Team management
- Task tracking
- Timesheet recording
- Budget tracking

---

## Key Relationships

| Action | Table | Related Tables |
|--------|-------|----------------|
| View contact history | CONTACTS | → ACTIVITIES, NOTES, CONTACT_TASKS |
| Create quote | DEALS | → ESTIMATIONS → ESTIMATION_LINE_ITEMS |
| Convert to invoice | ESTIMATIONS | → INVOICES → INVOICE_ITEMS |
| Create project | DEALS | → PROJECTS |
| Assign team | PROJECTS | → PROJECT_TEAM → USERS |
| Track time | PROJECTS | → PROJECT_TIMESHEETS |
| Log call/email | Any entity | → ACTIVITIES |
| Add note | Any entity | → ENTITY_NOTES |
| Upload file | Any entity | → ENTITY_FILES → FILES |

---

## API Endpoints Quick Reference

### Activities
```
POST   /api/activities                    Create
GET    /api/activities?deal_id=X          List with filters
PUT    /api/activities/:id                Update
DELETE /api/activities/:id                Delete
```

### Notes
```
POST   /api/notes                         Create
GET    /api/notes?deal_id=X               List with filters
DELETE /api/notes/:id                     Delete
```

### Project Tasks
```
POST   /api/projects/:projectId/tasks     Create
GET    /api/projects/:projectId/tasks     List
PUT    /api/project-tasks/:id             Update
DELETE /api/project-tasks/:id             Delete
```

### Project Team
```
POST   /api/projects/:projectId/team      Add member
GET    /api/projects/:projectId/team      List team
DELETE /api/projects/:projectId/team/:userId  Remove
```

### Project Timesheets
```
POST   /api/projects/:projectId/timesheets         Create entry
GET    /api/projects/:projectId/timesheets?dates   List
```

### Estimation Items
```
POST   /api/estimations/:estId/items      Add item
GET    /api/estimations/:estId/items      List items
DELETE /api/estimation-items/:id          Delete item
```

### Pipeline Stages
```
GET    /api/pipeline-stages               List all
POST   /api/pipeline-stages               Create new
```

### Entity Files
```
POST   /api/entity-files                  Link file
GET    /api/entity-files?deal_id=X        List files
DELETE /api/entity-files/:id              Remove link
```

---

## Common Data Flow Patterns

### Pattern 1: Sales Process
```
1. Create Contact (belongs to Company)
2. Create Deal (Company + Contact)
3. Create Activity "Call" (linked to Deal)
4. Create Estimation (from Deal)
5. Add Estimation Items (products/services)
6. Send to client (update Estimation status)
7. Convert to Invoice (from Estimation)
8. Track Payment (update Invoice status)
```

### Pattern 2: Project Execution
```
1. Deal reaches close stage
2. Convert Deal → Project
3. Add Project Tasks (deliverables)
4. Add Project Team (assign resources)
5. Create Timesheets (track work)
6. Create Activities (status updates)
7. Create Notes (documentation)
8. Create Invoice (from Project)
```

### Pattern 3: Communication Tracking
```
1. Create Activity "Email" (linked to Contact)
2. Create Activity "Call" (linked to Deal)
3. Create Activity "Meeting" (linked to Project)
4. Add follow-up Activity (with scheduled_date)
5. Mark completed when done
6. Create Note (for documentation)
```

---

## Field Reference

### Status Enums
```
Deals: Open, In Progress, Closed Won, Closed Lost
Estimations: Draft, Sent, Accepted, Declined
Invoices: Draft, Sent, Paid, Unpaid, Overdue
Projects: Planning, In Progress, On Hold, Completed, Cancelled
Tasks: Open, In Progress, Completed, On Hold
Activities: Pending, Completed, Cancelled
Companies: Active, Inactive, Prospect
Contacts: Active, Inactive
```

### Priority Levels
```
Low, Medium, High, Critical
```

### Activity Types
```
Call, Email, Meeting, Note, Follow-up, Task
```

---

## Query Examples

### Get all deals for a company
```sql
SELECT d.* FROM deals d 
WHERE d.company_id = ? 
ORDER BY d.created_at DESC
```

### Get contact activity timeline
```sql
SELECT a.* FROM activities a 
WHERE a.contact_id = ? 
ORDER BY a.created_at DESC 
LIMIT 50
```

### Get project with team and tasks
```sql
SELECT 
  p.*,
  COUNT(DISTINCT pt.id) as task_count,
  COUNT(DISTINCT pte.user_id) as team_size
FROM projects p
LEFT JOIN project_tasks pt ON p.id = pt.project_id
LEFT JOIN project_team pte ON p.id = pte.project_id
WHERE p.id = ?
GROUP BY p.id
```

### Get estimation with line items
```sql
SELECT 
  e.*,
  SUM(eli.quantity * eli.rate) as subtotal,
  SUM(eli.tax_amount) as total_tax
FROM estimations e
LEFT JOIN estimation_line_items eli ON e.id = eli.estimation_id
WHERE e.id = ?
GROUP BY e.id
```

### Get invoice payment status
```sql
SELECT 
  i.invoice_number,
  i.total,
  i.amount_paid,
  (i.total - i.amount_paid) as balance,
  i.status
FROM invoices i
WHERE i.client_id = ? AND i.status != 'Paid'
ORDER BY i.open_till ASC
```

---

## Best Practices Checklist

### When Creating Records:
- [x] Always provide required fields (validation on frontend)
- [x] Link to parent entity (Company for most records)
- [x] Set appropriate status/priority
- [x] Assign to responsible user if applicable
- [x] Add descriptive notes for context

### When Updating Records:
- [x] Update status via correct endpoint
- [x] Add notes when making significant changes
- [x] Keep timestamps current (automatic)
- [x] Maintain referential integrity

### When Deleting Records:
- [x] Check for dependent records first
- [x] Archive instead of delete if possible
- [x] Update related records appropriately
- [x] Keep audit trail

### When Querying:
- [x] Use filters to limit results
- [x] Use indexes for lookups
- [x] JOIN related tables in single query
- [x] ORDER BY relevant fields

---

## Common Mistakes to Avoid

❌ **Don't:**
- Create Deal without Company
- Add Contact without Company
- Create Project without Deal
- Add line items to Invoice directly (should be from Estimation)
- Update status in wrong table

✅ **Do:**
- Link activities to appropriate entities
- Use pipeline stages for deal tracking
- Create notes for important decisions
- Track time via timesheets
- Use task status to track progress

---

## Database Maintenance

### Regular Tasks:
1. Archive old records (> 1 year)
2. Clean up orphaned records
3. Update statistics/indexes
4. Backup database weekly
5. Review slow queries

### Monitoring:
- Track table sizes
- Monitor query performance
- Check connection pool usage
- Verify index usage
- Monitor disk space

---

## Integration Checklist

- [ ] Activities integrated in UI timeline
- [ ] Notes display on entity pages
- [ ] Files properly linked to entities
- [ ] Tasks shown in project dashboard
- [ ] Team visible in project details
- [ ] Timesheets tracked for billing
- [ ] Estimations → Invoices workflow
- [ ] Deal → Project conversion working
- [ ] Pipeline stages configured
- [ ] Email notifications on activities
- [ ] Calendar sync for meetings
- [ ] File upload integration

---

## Performance Optimization Tips

1. **Indexing:**
   - Always index foreign key columns
   - Index commonly filtered columns
   - Index columns in ORDER BY

2. **Query Optimization:**
   - Use SELECT specific columns, not *
   - JOIN instead of multiple queries
   - Use WHERE to filter early
   - Limit result sets

3. **Caching:**
   - Cache pipeline stages
   - Cache user lists
   - Cache company lookups

4. **Pagination:**
   - Use LIMIT/OFFSET for large result sets
   - Implement cursor-based pagination for better performance

---

## Testing Endpoints

### Test Activity Creation
```bash
curl -X POST http://localhost:5000/api/activities \
  -H "Content-Type: application/json" \
  -d '{
    "activity_type": "Call",
    "title": "Follow-up call",
    "contact_id": 1,
    "assigned_to": 2
  }'
```

### Test Estimation Items
```bash
curl -X POST http://localhost:5000/api/estimations/1/items \
  -H "Content-Type: application/json" \
  -d '{
    "item_name": "Development",
    "quantity": 40,
    "rate": 100,
    "tax_percent": 18
  }'
```

### Test Project Team
```bash
curl -X POST http://localhost:5000/api/projects/1/team \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 3,
    "role": "Developer",
    "allocation_percentage": 100
  }'
```

---

## Quick Links

- **Full Documentation:** `CRM_STRUCTURE_DOCUMENTATION.md`
- **Implementation Summary:** `IMPLEMENTATION_SUMMARY.md`
- **Migration Script:** `server/migrate-crm-structure.js`
- **API Routes:** `server/crm-api-routes.js`
- **Server Entry:** `server/server.js` (lines 5844-5845)

---

## Support

For detailed information, see:
1. **Database Schema**: CRM_STRUCTURE_DOCUMENTATION.md (Section 2)
2. **API Endpoints**: CRM_STRUCTURE_DOCUMENTATION.md (Section 4)
3. **Data Flows**: CRM_STRUCTURE_DOCUMENTATION.md (Section 5)
4. **Best Practices**: CRM_STRUCTURE_DOCUMENTATION.md (Section 7)

---

Last Updated: 2025-12-09
Status: ✅ PRODUCTION READY
