# Deal Update Error - 500 Internal Server Error

## Problem
When trying to update a deal, the API returns a 500 error:
```
PUT http://localhost:5000/api/deals/16 500 (Internal Server Error)
```

## Root Cause
The update endpoint requires two mandatory fields from the database schema:
1. `deal_name` - VARCHAR(255) NOT NULL
2. `company_id` - INT NOT NULL

If either of these are null or undefined in the request, the database update fails.

## Changes Made

### 1. Server-Side (server.js)
**Added validation and improved error logging:**

```javascript
if (!deal_name || !company_id) {
  return res.status(400).json({ error: 'deal_name and company_id are required' });
}
```

**Added detailed logging:**
- Logs deal ID being updated
- Logs deal_name and company_id values
- Logs full error details
- Logs request body for debugging

**Removed project_id from update query:**
- The deals table doesn't have a `project_id` column
- This was causing the query to fail

### 2. Client-Side (CrmDealsPage.js)
**Added debugging logs to track the deal being edited:**
```javascript
console.log('✏️ Editing deal:', deal.id);
console.log('✏️ Deal company_id:', deal.company_id);
console.log('✏️ Full deal object:', deal);
console.log('📝 Form data being sent:', formData);
```

### 3. Client-Side (AddNewDealModal.js)
**Added form data validation logging:**
```javascript
console.log('📤 Form submission - formData:', formData);
console.log('✅ Form validation passed, submitting with data:', {
  deal_name: formData.deal_name,
  company_id: formData.company_id,
  contact_id: formData.contact_id,
  pipeline: formData.pipeline,
  deal_value: formData.deal_value
});
```

## How to Debug the Issue

### Step 1: Open Browser DevTools
- Press `F12` or right-click → Inspect
- Go to the Console tab

### Step 2: Edit a Deal
- Click the three-dot menu on a deal card
- Click "Edit"
- Modify any field and try to submit

### Step 3: Check the Logs
Look for these log messages:

**In Client Console:**
```
✏️ Editing deal: 16
✏️ Deal company_id: 5
✏️ Full deal object: {...}
📝 Form data being sent: {deal_name: "...", company_id: 5, ...}
✅ Form validation passed, submitting with data: {...}
```

**In Server Console:**
```
📝 Updating deal ID: 16
📝 deal_name: Your Deal Name
📝 company_id: 5
```

### Step 4: Check Network Response
- Go to Network tab in DevTools
- Look for the PUT request to `/api/deals/16`
- Click on it and check the Response:
  - If 400: `deal_name and company_id are required`
  - If 500: Check the error message for details

## Potential Issues & Solutions

### Issue 1: Missing company_id when editing
**Symptom:** `deal_name: "Deal Name", company_id: undefined`

**Cause:** The deal object being passed to the edit form doesn't have company_id

**Solution:** Ensure the deal object passed from CrmDealsPage contains all required fields from the database

### Issue 2: Form not pre-populating with company_id
**Symptom:** Company field is empty when editing

**Cause:** The deal object from the API doesn't have company_id, or AddNewDealModal isn't reading it properly

**Solution:** Check that the API returns company_id when fetching deals

### Issue 3: Validation passing but still getting 500 error
**Symptom:** Form logs show valid data but server returns 500

**Cause:** Something else in the database update query is failing

**Solution:** Check server logs for the specific error message, which now includes `details: error.message`

## Required Fields for Deal Update
The form MUST include these fields:
- `deal_name` - string, required
- `company_id` - number (company ID), required
- `contact_id` - number, required (validated in form)
- `pipeline` - string, required (validated in form)
- `deal_value` - number or string, required (validated in form)

Optional fields:
- `status` - defaults to 'Pending'
- `currency` - defaults to 'USD'
- `priority` - defaults to 'Medium'
- `description` - defaults to empty string
- All other fields can be null

## Database Schema
```sql
ALTER TABLE deals 
MODIFY deal_name VARCHAR(255) NOT NULL,
MODIFY company_id INT NOT NULL;
```

## Testing Checklist
- [ ] Edit a deal that has all required fields filled
- [ ] Check browser console for edit logging
- [ ] Check server console for update logging
- [ ] Verify the deal updates in the UI
- [ ] Verify in database with: `SELECT id, deal_name, company_id FROM deals WHERE id = 16;`

## Files Modified
- `server/server.js` - Improved update validation and logging
- `client/src/components/CrmDealsPage.js` - Added edit debugging
- `client/src/components/AddNewDealModal.js` - Added form submission debugging
