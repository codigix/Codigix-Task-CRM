# Frontend API Service Guide

## Overview

The frontend uses a centralized API service layer that automatically configures the API base URL based on the environment (development or production).

**Location:** `client/src/services/api.js`

---

## Using the API Service

### Basic Setup

Import the API modules you need:

```javascript
import { 
  companiesAPI, 
  dealsAPI, 
  contactsAPI,
  leadsAPI,
  plansAPI,
  pipelineAPI
} from '../services/api';
```

### Companies API

#### Get All Companies
```javascript
try {
  const companies = await companiesAPI.getAll();
  console.log(companies);
} catch (error) {
  console.error('Failed to fetch companies:', error);
}
```

#### Get Single Company
```javascript
const company = await companiesAPI.getById(1);
```

#### Create Company
```javascript
const newCompany = await companiesAPI.create({
  company_name: 'Acme Corp',
  email: 'contact@acme.com',
  phone: '+1-234-567-8900',
  website: 'www.acme.com',
  address: '123 Business St',
  account_url: 'acme.example.com',
  password: 'secure_password',
  status: 'Active',
  planName: 'Professional',
  planType: 'Monthly',
  currency: 'USD',
  language: 'English'
});
```

#### Update Company
```javascript
const updated = await companiesAPI.update(1, {
  company_name: 'Updated Name',
  email: 'newemail@acme.com',
  status: 'Active'
});
```

#### Delete Company
```javascript
await companiesAPI.delete(1);
```

#### Upgrade Company Plan
```javascript
const upgraded = await companiesAPI.upgrade(1, {
  planName: 'Enterprise',
  planType: 'Yearly',
  currency: 'USD',
  language: 'English'
});
```

### Deals API

#### Get All Deals
```javascript
const deals = await dealsAPI.getAll();
```

#### Create Deal
```javascript
const deal = await dealsAPI.create({
  deal_name: 'Big Contract',
  stage: 'Negotiation',
  deal_value: 50000,
  status: 'Active',
  company_id: 1,
  contact_id: 5
});
```

### Contacts API

#### Get All Contacts
```javascript
const contacts = await contactsAPI.getAll();
```

#### Create Contact
```javascript
const contact = await contactsAPI.create({
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '+1-555-1234',
  company_id: 1,
  position: 'Manager',
  status: 'Active'
});
```

### Leads API

#### Get All Leads
```javascript
const leads = await leadsAPI.getAll();
```

#### Create Lead
```javascript
const lead = await leadsAPI.create({
  lead_name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '+1-555-5678',
  company: 'Tech Solutions',
  lead_source: 'Website',
  lead_status: 'New',
  rating: 5,
  notes: 'Interested in premium plan'
});
```

### Plans API

#### Get All Plans
```javascript
const plans = await plansAPI.getAll();
```

### Pipeline API

#### Get All Pipeline
```javascript
const pipeline = await pipelineAPI.getAll();
```

---

## Error Handling

All API calls include built-in error handling. Errors are logged and thrown for you to handle:

```javascript
try {
  const companies = await companiesAPI.getAll();
  // Use data
} catch (error) {
  console.error('API Error:', error);
  // Handle error - show toast, etc
}
```

### Error Response
```javascript
{
  error: 'Failed to fetch companies',
  status: 500,
  message: 'Server error'
}
```

---

## Using in React Components

### Example: Companies List Component

```javascript
import React, { useState, useEffect } from 'react';
import { companiesAPI } from '../services/api';

const CompaniesList = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await companiesAPI.getAll();
      setCompanies(data);
      setError(null);
    } catch (err) {
      setError('Failed to load companies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async (formData) => {
    try {
      await companiesAPI.create(formData);
      fetchCompanies(); // Refresh list
    } catch (err) {
      setError('Failed to add company');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h1>Companies</h1>
      <button onClick={() => handleAddCompany(formData)}>Add Company</button>
      <table>
        <tbody>
          {companies.map(company => (
            <tr key={company.id}>
              <td>{company.company_name}</td>
              <td>{company.email}</td>
              <td>{company.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CompaniesList;
```

---

## Environment Configuration

### Development
```env
REACT_APP_ENV=development
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_DEBUG=true
```

### Production
```env
REACT_APP_ENV=production
REACT_APP_API_URL=https://api.yourdomain.com/api
REACT_APP_DEBUG=false
```

The API service automatically uses the correct URL based on `REACT_APP_API_URL`.

---

## Advanced Usage

### Custom API Requests

For endpoints not covered by the pre-built modules, use the base API service:

```javascript
import apiService from '../services/api';

// GET request
const data = await apiService.get('/custom-endpoint');

// POST request
const result = await apiService.post('/custom-endpoint', { data: 'value' });

// PUT request
const updated = await apiService.put('/custom-endpoint/1', { data: 'new' });

// DELETE request
const deleted = await apiService.delete('/custom-endpoint/1');
```

### With Query Parameters

```javascript
// Build query string manually
const data = await apiService.get('/companies?status=Active&limit=10');
```

---

## Response Format

All API endpoints return data in JSON format. Example:

```json
[
  {
    "id": 1,
    "company_name": "Acme Corp",
    "email": "contact@acme.com",
    "phone": "+1-234-567-8900",
    "website": "www.acme.com",
    "status": "Active",
    "plan_name": "Professional",
    "created_at": "2024-09-12T10:30:00Z"
  }
]
```

---

## Debugging

### Enable Debug Mode

Set `REACT_APP_DEBUG=true` in your `.env` file to see:
- API request URLs
- Request payload
- Response data
- Errors with full details

### Check Environment

Use the environment config utility:

```javascript
import { environment, isDevelopment, isProduction } from '../config/environment';

console.log('Environment:', environment);
console.log('Is Development:', isDevelopment());
console.log('Is Production:', isProduction());
console.log('API URL:', environment.apiUrl);
```

---

## Troubleshooting

### Issue: "API calls returning 404"

**Solutions:**
1. Check backend is running on correct port
2. Verify `REACT_APP_API_URL` is correct
3. Check API endpoint paths match backend routes

### Issue: "CORS error"

**Solutions:**
1. Verify `CORS_ORIGIN` in `server/.env` matches frontend URL
2. Restart backend server
3. Clear browser cache

### Issue: "Failed to fetch"

**Solutions:**
1. Check network connectivity
2. Verify backend server is running
3. Check browser DevTools Network tab for actual error

### Issue: "Environment variable not loading"

**Solutions:**
1. Ensure `.env` file exists in correct location
2. Restart development server after editing `.env`
3. Check file is not in `.gitignore`

---

## Best Practices

### ✅ DO

- Use the API service modules for consistent error handling
- Handle errors appropriately in try-catch blocks
- Show user-friendly error messages
- Keep API calls in custom hooks or services
- Validate data before sending to backend

### ❌ DON'T

- Make direct fetch calls instead of using API service
- Hardcode API URLs in components
- Ignore error handling
- Commit `.env` files with real credentials
- Mix old fetch calls with new API service

---

## Performance Tips

### Avoid N+1 Queries

```javascript
// Bad - multiple API calls
const companies = await companiesAPI.getAll();
for (let company of companies) {
  const details = await companiesAPI.getById(company.id);
}

// Good - single API call
const companies = await companiesAPI.getAll(); // Already includes details
```

### Use React Query or SWR for Caching

```javascript
// Example with React Query
import { useQuery } from '@tanstack/react-query';

function CompaniesList() {
  const { data, isLoading, error } = useQuery(
    ['companies'],
    () => companiesAPI.getAll(),
    { staleTime: 5 * 60 * 1000 } // 5 minutes
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{data.map(c => <div>{c.company_name}</div>)}</div>;
}
```

---

## Summary

| Task | Example |
|------|---------|
| Get all companies | `companiesAPI.getAll()` |
| Get company by ID | `companiesAPI.getById(1)` |
| Create company | `companiesAPI.create(data)` |
| Update company | `companiesAPI.update(id, data)` |
| Delete company | `companiesAPI.delete(id)` |
| Upgrade plan | `companiesAPI.upgrade(id, data)` |

For more details, see `SETUP_ENVIRONMENTS.md` and `BACKEND_SETUP_GUIDE.md`.
