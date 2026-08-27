# CRM Corrections - Implementation Guide

## Quick Start

### 1. Database Migration
```bash
cd server
node migrate-crm-corrections.js
```

**Expected Output**:
```
🔄 Starting CRM Corrections Migration...

1️⃣ Adding LEADS table...
   ✓ leads table created/updated

2️⃣ Adding DEAL_CONTACTS table...
   ✓ deal_contacts table created/updated

3️⃣ Updating ENTITY_FILES...
   ✓ entity_files updated with estimation_id and invoice_id

4️⃣ Refactoring ACTIVITIES...
   ✓ activities table enhanced with entity_type and entity_id

5️⃣ Refactoring ENTITY_NOTES...
   ✓ entity_notes table enhanced with entity_type and entity_id

6️⃣ Setting up USERS table...
   ✓ users table configured with manager hierarchy

7️⃣ Setting up ROLES & PERMISSIONS...
   ✓ role_permissions and user_roles tables created

✅ Migration Completed Successfully!
```

### 2. Server Integration (ALREADY DONE)
The corrections API routes are automatically integrated in `server.js`:
```javascript
const setupCRMCorrectionsRoutes = require('./crm-corrections-api-routes');
setupCRMCorrectionsRoutes(app, pool);
```

### 3. Restart Server
```bash
npm start
# or
npm run dev
```

---

## API Endpoints Quick Reference

### Leads Management
```
GET    /api/leads                    - List all leads
POST   /api/leads                    - Create new lead
GET    /api/leads/:id                - Get lead details
PUT    /api/leads/:id                - Update lead
POST   /api/leads/:id/convert        - Convert lead to contact/deal
```

### Deal Contacts
```
GET    /api/deals/:dealId/contacts            - List deal contacts
POST   /api/deals/:dealId/contacts            - Add contact to deal
DELETE /api/deals/:dealId/contacts/:contactId - Remove contact from deal
```

### Roles Management
```
GET    /api/roles                            - List all roles
POST   /api/roles                            - Create role
GET    /api/roles/:roleId/permissions        - Get role permissions
POST   /api/roles/:roleId/permissions        - Add permission to role
PUT    /api/roles/:roleId/permissions/:id    - Update permission
```

### User Roles
```
GET    /api/users/:userId/roles              - Get user roles
POST   /api/users/:userId/roles              - Assign role to user
DELETE /api/users/:userId/roles/:roleId      - Remove role from user
GET    /api/users/:userId/permissions        - Get user permissions
```

### Activity Mentions
```
POST   /api/activities/mentions              - Add mentions to activity
GET    /api/activities/:activityId/mentions  - Get activity mentions
```

---

## Testing the API

### Create a Lead
```bash
curl -X POST http://localhost:5000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Prospect",
    "email": "john@example.com",
    "phone": "+1-555-0100",
    "company_name": "Prospect Corp",
    "source": "Website",
    "status": "New"
  }'
```

### Add Contact to Deal
```bash
curl -X POST http://localhost:5000/api/deals/1/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": 5,
    "role": "Decision Maker",
    "is_primary": true
  }'
```

### Create Role
```bash
curl -X POST http://localhost:5000/api/roles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sales Manager",
    "description": "Manage sales team and deals"
  }'
```

### Assign Role to User
```bash
curl -X POST http://localhost:5000/api/users/5/roles \
  -H "Content-Type: application/json" \
  -d '{
    "role_id": 2,
    "assigned_by": 1
  }'
```

---

## Database Verification

### Check All New Tables
```sql
-- Run in MySQL
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'deals_db' 
AND TABLE_NAME IN ('leads', 'deal_contacts', 'role_permissions', 'user_roles', 'activity_mentions', 'note_mentions', 'contact_company_roles');
```

Expected: 7 new tables

### Verify Activities Table
```sql
DESCRIBE activities;
-- Should show: entity_type, entity_id columns
```

### Verify Entity-Files Table
```sql
DESCRIBE entity_files;
-- Should show: estimation_id, invoice_id columns
```

### Verify Users Table
```sql
DESCRIBE users;
-- Should show: full_name, department, manager_id columns
```

---

## Frontend Integration

### React Component Example: Lead Creation
```jsx
import { useState } from 'react';

function CreateLead() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    company_name: '',
    source: 'Website'
  });

  const handleCreate = async () => {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await response.json();
    if (data.success) {
      console.log('Lead created:', data.data);
    }
  };

  return (
    <form onSubmit={e => { e.preventDefault(); handleCreate(); }}>
      <input placeholder="First Name" onChange={e => setForm({...form, first_name: e.target.value})} />
      <input placeholder="Email" onChange={e => setForm({...form, email: e.target.value})} />
      <button type="submit">Create Lead</button>
    </form>
  );
}
```

### React Component Example: Deal Contacts
```jsx
import { useState, useEffect } from 'react';

function DealContacts({ dealId }) {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    fetch(`/api/deals/${dealId}/contacts`)
      .then(r => r.json())
      .then(data => setContacts(data.data));
  }, [dealId]);

  const addContact = async (contactId) => {
    const response = await fetch(`/api/deals/${dealId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: contactId,
        role: 'Decision Maker',
        is_primary: false
      })
    });
    if (response.ok) {
      const data = await response.json();
      setContacts([...contacts, data.data]);
    }
  };

  return (
    <div>
      <h3>Deal Contacts</h3>
      {contacts.map(contact => (
        <div key={contact.id}>
          {contact.first_name} {contact.last_name} - {contact.role}
          {contact.is_primary && <span> (Primary)</span>}
        </div>
      ))}
    </div>
  );
}
```

---

## Migration from Old Structure

### Update Activities Queries
```javascript
// OLD WAY (works but inefficient)
const activities = await db.query(
  'SELECT * FROM activities WHERE contact_id = ? OR deal_id = ? OR project_id = ?',
  [contactId, dealId, projectId]
);

// NEW WAY (clean and efficient)
const activities = await db.query(
  'SELECT * FROM activities WHERE entity_type = ? AND entity_id = ?',
  ['Contact', contactId]
);
```

### Update Deal Contact Handling
```javascript
// OLD WAY (single contact)
const deal = await db.query(
  'INSERT INTO deals (name, contact_id) VALUES (?, ?)',
  [dealName, contactId]
);

// NEW WAY (multiple contacts)
const deal = await db.query(
  'INSERT INTO deals (name) VALUES (?)',
  [dealName]
);
const dealId = deal.insertId;

await db.query(
  'INSERT INTO deal_contacts (deal_id, contact_id, is_primary) VALUES (?, ?, ?)',
  [dealId, primaryContactId, true]
);

// Add secondary contacts
for (const contactId of secondaryContactIds) {
  await db.query(
    'INSERT INTO deal_contacts (deal_id, contact_id) VALUES (?, ?)',
    [dealId, contactId]
  );
}
```

---

## Troubleshooting

### Migration Fails with "Unknown column"
**Issue**: Tables or columns don't exist yet  
**Solution**: Run migration script in order, check database connectivity

```bash
# Test connection
mysql -h localhost -u root -p deals_db -e "SELECT 1;"
```

### Foreign Key Constraint Error
**Issue**: Referenced table doesn't exist  
**Solution**: Ensure all base tables (users, companies, etc.) exist before migration

```sql
-- Check if required tables exist
SHOW TABLES LIKE 'users';
SHOW TABLES LIKE 'companies';
```

### Performance Issues After Migration
**Issue**: Queries slower on new columns  
**Solution**: Indexes are created automatically, but force index usage

```sql
-- Verify indexes exist
SHOW INDEXES FROM activities;
SHOW INDEXES FROM entity_files;

-- Analyze tables
ANALYZE TABLE activities;
ANALYZE TABLE deal_contacts;
```

---

## Best Practices

### When Working with Leads
1. Always set `source` when creating leads
2. Track `created_by` for audit purposes
3. Use `status` transitions: New → Contacted → Qualified → Converted
4. Document conversion details in `converted_company_id`, `converted_contact_id`, `converted_deal_id`

### When Working with Deal Contacts
1. Always have at least one primary contact
2. Use `role` field to document stakeholder relationship
3. Keep `is_primary` unique per deal
4. Maintain contact history even after removal (use soft deletes if needed)

### When Working with Roles & Permissions
1. Create roles before assigning to users
2. Grant minimum necessary permissions
3. Regularly audit role assignments
4. Document reason for role changes in application logs

### When Using Universal Entity Pattern
1. Always validate `entity_type` against ENUM values
2. Always provide both `entity_type` and `entity_id`
3. Use indexes efficiently in queries
4. Consider performance impact of polymorphic queries

---

## Rollback Procedure

If you need to rollback to the previous structure:

```bash
# Create backup
mysqldump -u root -p deals_db > backup_with_corrections.sql

# Drop new tables (if needed)
mysql -u root -p deals_db << EOF
DROP TABLE IF EXISTS activity_mentions;
DROP TABLE IF EXISTS note_mentions;
DROP TABLE IF EXISTS contact_company_roles;
DROP TABLE IF EXISTS deal_contacts;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS role_permissions;
EOF

# Remove added columns (CAREFUL: This is destructive)
# ALTER TABLE activities DROP COLUMN entity_type, DROP COLUMN entity_id;
# ALTER TABLE entity_notes DROP COLUMN entity_type, DROP COLUMN entity_id;
```

⚠️ **Note**: Rollback will lose data in new tables. Always backup first!

---

## Performance Benchmarks

### Expected Query Performance

| Operation | Estimated Time |
|-----------|-----------------|
| Create lead | < 50ms |
| List 100 leads | < 100ms |
| Add contact to deal | < 50ms |
| Get deal contacts | < 100ms |
| Assign role to user | < 50ms |
| Get user permissions | < 100ms |
| Activity mention query | < 150ms |

---

## Support Resources

- **Full Documentation**: See `CRM_CORRECTIONS_DOCUMENTATION.md`
- **API Examples**: See examples throughout this guide
- **Database Queries**: See "Query Examples" section in main documentation
- **Troubleshooting**: See "Troubleshooting" section above

---

## Checklist

- [ ] Run migration script successfully
- [ ] Verify all 7 new tables exist
- [ ] Restart server
- [ ] Test leads API endpoints
- [ ] Test deal-contacts API endpoints
- [ ] Test role management endpoints
- [ ] Update frontend components (if applicable)
- [ ] Run existing tests
- [ ] Monitor performance in staging
- [ ] Deploy to production

---

**Version**: 1.0  
**Last Updated**: 2025-12-09  
**Status**: Ready for Implementation ✅
