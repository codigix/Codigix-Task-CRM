# Toast Notification Implementation Guide

## Overview
Toast notifications have been integrated across the CRM application to provide user feedback for CRUD operations (Create, Read, Update, Delete). The toast system uses SweetAlert2 for a consistent, professional look.

## Setup

The toast utility is available at: `src/utils/toast.js`

### Available Functions
- `showSuccessToast(message)` - Shows a green success notification
- `showErrorToast(message)` - Shows a red error notification
- `showInfoToast(message)` - Shows a blue info notification (optional)
- `showWarningToast(message)` - Shows a yellow warning notification (optional)

### Toast Configuration
- **Position**: Top-right corner
- **Duration**: 3 seconds (auto-dismisses)
- **Timer Progress Bar**: Yes
- **Mouse Interaction**: Pauses timer on hover, resumes on mouse leave

## Implementation Pattern

### 1. Import Toast Functions
```javascript
import { showSuccessToast, showErrorToast } from '../utils/toast';
```

### 2. Add Toast to Create Operations
```javascript
const handleCreateLead = async (formData) => {
  try {
    const response = await leadsAPI.create(formData);
    
    if (response.id) {
      // Update state...
      setLeads(prev => [newLead, ...prev]);
      setIsModalOpen(false);
      
      // Show success toast
      showSuccessToast(`Lead "${formData.name}" created successfully!`);
    }
  } catch (err) {
    const errorMessage = err.message || 'Failed to create lead';
    showErrorToast(errorMessage);
    throw new Error(errorMessage);
  }
};
```

### 3. Add Toast to Update Operations
```javascript
const handleUpdateDeal = async (formData) => {
  try {
    await dealsAPI.update(dealId, formData);
    
    // Update state...
    setDeals(prev => prev.map(d => d.id === dealId ? updatedDeal : d));
    setIsEditModalOpen(false);
    
    // Show success toast
    showSuccessToast(`Deal "${formData.deal_name}" updated successfully!`);
  } catch (err) {
    const errorMessage = err.message || 'Failed to update deal';
    showErrorToast(errorMessage);
    throw new Error(errorMessage);
  }
};
```

### 4. Add Toast to Delete Operations
```javascript
const handleDeleteProject = async (projectId) => {
  if (window.confirm('Are you sure?')) {
    try {
      const projectToDelete = projects.find(p => p.id === projectId);
      await projectAPI.delete(projectId);
      
      // Update state...
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      // Show success toast
      showSuccessToast(`Project "${projectToDelete?.name}" deleted successfully!`);
    } catch (err) {
      showErrorToast('Failed to delete project');
    }
  }
};
```

### 5. Add Toast to Complex Operations (e.g., Status Changes, Drag & Drop)
```javascript
const handleStatusChange = async (itemId, newStatus) => {
  try {
    await apiCall.update(itemId, { status: newStatus });
    
    // Update state...
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, status: newStatus } : item
    ));
    
    // Show success toast
    showSuccessToast(`Item moved to ${newStatus}!`);
  } catch (err) {
    showErrorToast(`Failed to move item to ${newStatus}`);
  }
};
```

## Best Practices

### 1. Message Format
- **Success**: `"[Entity Name] [Operation] successfully!"`
  - Examples: `"Lead 'John Doe' created successfully!"`
  - Examples: `"Project moved to In Progress!"`

- **Error**: Be descriptive about what went wrong
  - Examples: `"Failed to create lead: Email already exists"`
  - Examples: `"Failed to delete project: It has active tasks"`

### 2. Placement
- Place `showSuccessToast()` after successful operation and state updates
- Place `showErrorToast()` in catch blocks
- For modals, show toast before closing the modal

### 3. Loading States
Don't show success toast while still loading. Wait until the operation completes and UI is updated.

```javascript
try {
  setIsLoading(true);
  const response = await api.create(data);
  setItems(prev => [...prev, response]);
  setIsLoading(false);
  showSuccessToast('Created successfully!'); // After state update
} catch (err) {
  showErrorToast(err.message);
  setIsLoading(false);
}
```

### 4. User-Friendly Names
Use entity names from the data in messages:
```javascript
// Good ✓
showSuccessToast(`Deal "${deal.company}" won successfully!`);

// Bad ✗
showSuccessToast('Deal updated');
```

## Implemented Pages

### ✅ Completed
1. **CrmLeadsPage** - Create, Delete, Clone
2. **CrmDealsPage** - Create, Update, Delete, Stage Move, Win
3. **ProjectsListPage** - Delete
4. **AddNewProjectModal** - Create
5. **CrmCompaniesPage** - Delete
6. **AddCompanyPage** - Create, Update

### ⏳ Pending Implementation
The following pages should follow the same pattern:

#### Contacts
- AddNewContactModal (Create)
- Contacts List Page (Delete, Update)

#### Tasks
- TasksPage (Create, Update, Delete)
- TaskDetailsPage (Update status, Delete)

#### Proposals
- ProposalsPage (Create, Delete, Status Change)
- ProposalDetailsPage (Update, Approve, Reject, Send)

#### Contracts
- ContractsPage (Create, Delete)
- ContractDetailsPage (Update, Sign)

#### Estimations
- EstimationsPage (Create, Delete)
- EstimationDetailsPage (Update, Send, Convert)

#### Campaigns
- AddNewCampaignModal (Create)
- CampaignsList (Delete, Status Update)

#### Invoices
- InvoicesPage (Create, Delete, Mark Paid)
- InvoiceDetailsPage (Update, Send)

#### Payments
- PaymentsPage (Create, Delete)
- PaymentDetailsPage (Update)

## Testing Checklist

When implementing toast notifications:
- [ ] Test successful operation shows green toast with entity name
- [ ] Test failed operation shows red error toast
- [ ] Test toast auto-dismisses after 3 seconds
- [ ] Test timer pauses on hover
- [ ] Test multiple toasts stack properly
- [ ] Test message text is clear and helpful
- [ ] Test error messages provide actionable feedback

## Files Modified

```
src/utils/toast.js (existing utility)
src/components/CrmLeadsPage.js ✅
src/components/CrmDealsPage.js ✅
src/components/ProjectsListPage.js ✅
src/components/AddNewProjectModal.js ✅
src/components/CrmCompaniesPage.js ✅ (already had partial implementation)
src/components/AddCompanyPage.js ✅
```

## Future Enhancements

1. **Custom Toast Messages**: Add optional parameters for custom messages
2. **Toast Actions**: Add action buttons (Undo, Retry) for certain operations
3. **Success Analytics**: Track which operations are most commonly used
4. **Toast Queue**: Manage multiple toasts elegantly
5. **Accessibility**: Ensure ARIA labels are proper for screen readers

## Support

For questions or issues with toast notifications:
1. Check the `src/utils/toast.js` file for the toast utility
2. Review implemented examples in the pages listed above
3. Follow the implementation pattern documented here
