import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../common/DataTable';
import AddNewDealModal from './AddNewDealModal';
import ContactActionDropdown from '../common/ContactActionDropdown';
import { dealsAPI, contactsAPI, companiesAPI } from '../../services/api';

const DealsListPage = () => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      let dealsRes, contactsRes, companiesRes;
      
      try {
        [dealsRes, contactsRes, companiesRes] = await Promise.all([
          dealsAPI.getAll(),
          contactsAPI.getAll(),
          companiesAPI.getAll(),
        ]);
      } catch (apiErr) {
        console.error('❌ DealsListPage - API Error:', apiErr.message);
        dealsRes = [];
        contactsRes = [];
        companiesRes = [];
        setError(`Failed to load deals data from server: ${apiErr.message}`);
      }
      
      console.log('✅ DealsListPage - API Response:', { dealsRes, contactsRes, companiesRes });
      
      let actualDeals = dealsRes || [];
      if (dealsRes && !Array.isArray(dealsRes) && typeof dealsRes === 'object') {
        if (dealsRes.data && Array.isArray(dealsRes.data)) {
          actualDeals = dealsRes.data;
        } else if (dealsRes.deals && Array.isArray(dealsRes.deals)) {
          actualDeals = dealsRes.deals;
        } else if (dealsRes.rows && Array.isArray(dealsRes.rows)) {
          actualDeals = dealsRes.rows;
        }
      }
      
      let actualContacts = contactsRes || [];
      if (contactsRes && !Array.isArray(contactsRes) && typeof contactsRes === 'object') {
        if (contactsRes.data && Array.isArray(contactsRes.data)) {
          actualContacts = contactsRes.data;
        } else if (contactsRes.contacts && Array.isArray(contactsRes.contacts)) {
          actualContacts = contactsRes.contacts;
        }
      }
      
      let actualCompanies = companiesRes || [];
      if (companiesRes && !Array.isArray(companiesRes) && typeof companiesRes === 'object') {
        if (companiesRes.data && Array.isArray(companiesRes.data)) {
          actualCompanies = companiesRes.data;
        } else if (companiesRes.companies && Array.isArray(companiesRes.companies)) {
          actualCompanies = companiesRes.companies;
        }
      }
      
      console.log('✅ DealsListPage - Data extracted:', { actualDeals, actualContacts, actualCompanies });
      
      const transformedDeals = (actualDeals || []).map(deal => {
        const company = actualCompanies?.find(c => c.id === deal.company_id);
        const contact = actualContacts?.find(c => c.id === deal.contact_id);
        
        const contactName = contact 
          ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
          : (deal.contact_first_name && deal.contact_last_name 
              ? `${deal.contact_first_name} ${deal.contact_last_name}`
              : 'N/A');
        
        const assignedName = deal.assignee_first_name && deal.assignee_last_name
          ? `${deal.assignee_first_name} ${deal.assignee_last_name}`
          : 'Unassigned';
        
        const email = deal.contact_email || 'N/A';
        const phone = deal.contact_phone || 'N/A';
        
        return {
          id: deal.id,
          name: deal.deal_name,
          company: company?.company_name || deal.company_name || 'N/A',
          contact: contactName,
          email: email,
          phone: phone,
          location: deal.location || 'N/A',
          assigned_name: assignedName,
          stage: deal.pipeline || deal.deal_stage || 'Converted Lead',
          value: parseFloat(deal.deal_value) || 0,
          status: deal.status || 'Pending',
          deal_name: deal.deal_name,
          company_id: deal.company_id,
          contact_id: deal.contact_id,
          ...deal
        };
      });
      
      console.log('✅ DealsListPage - Transformed Deals:', transformedDeals);
      
      const sortedDeals = [...transformedDeals].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at || 0);
        const dateB = new Date(b.updated_at || b.created_at || 0);
        return dateB - dateA;
      });
      
      setDeals(sortedDeals);
      setContacts(actualContacts);
      setCompanies(actualCompanies);
    } catch (err) {
      console.error('❌ DealsListPage - Error fetching data:', err);
      setError(`Failed to load deals data from server: ${err.message}`);
      setDeals([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDeal = async (formData) => {
    try {
      const response = await dealsAPI.create(formData);
      
      if (response.id) {
        setIsModalOpen(false);
        await fetchData();
      }
    } catch (err) {
      throw new Error(err.message || 'Failed to create deal');
    }
  };

  const handleUpdateDeal = async (formData) => {
    try {
      if (!selectedDeal?.id) return;
      await dealsAPI.update(selectedDeal.id, formData);
      setIsModalOpen(false);
      setSelectedDeal(null);
      await fetchData();
    } catch (err) {
      throw new Error(err.message || 'Failed to update deal');
    }
  };

  const handleDeleteDeal = async (id) => {
    try {
      await dealsAPI.delete(id);
      await fetchData();
    } catch (err) {
      console.error('Error deleting deal:', err);
      setError(`Failed to delete deal: ${err.message}`);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status) => {
    const colors = {
      'Won': 'bg-green-100 text-green-800',
      'Lost': 'bg-red-100 text-red-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Quotation': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const columns = [
    {
      key: 'name',
      label: 'Deal Name',
      sortable: true,
      render: (value, row) => <span className="cursor-pointer hover:text-red-600 transition-colors " onClick={() => navigate(`/deals/deal/${row.id}`)}>{value}</span>
    },
    {
      key: 'company',
      label: 'Company',
      sortable: true,
      render: (value, row) => <span className="cursor-pointer hover:text-red-600 transition-colors" onClick={() => navigate(`/deals/deal/${row.id}`)}>{value}</span>
    },
    {
      key: 'contact',
      label: 'Contact Person',
      sortable: true
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (value) => <span className="text-xs  text-gray-600">{value}</span>
    },
    {
      key: 'phone',
      label: 'Phone',
      sortable: true,
      render: (value) => <span className="text-xs  text-gray-600">{value}</span>
    },
    {
      key: 'location',
      label: 'Location',
      sortable: true,
      render: (value) => <span className="text-xs  text-gray-600">{value}</span>
    },
    {
      key: 'assigned_name',
      label: 'Assigned To',
      sortable: true,
      render: (value) => <span className="inline-flex items-center p-1  bg-blue-100 text-blue-800 rounded text-xs  ">{value}</span>
    },
    {
      key: 'stage',
      label: 'Stage',
      sortable: true
    },
    {
      key: 'value',
      label: 'Value',
      sortable: true,
      render: (value) => <span className=" ">{formatCurrency(value)}</span>
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs   ${getStatusBadge(value)}`}>
          {value}
        </span>
      )
    },
    {
      key: 'id',
      label: 'Action',
      render: (value, rowData) => (
        <ContactActionDropdown 
          contact={{ ...rowData, name: rowData.deal_name || rowData.name }}
          entityName="deal"
          onEdit={(deal) => {
            setSelectedDeal(deal);
            setIsModalOpen(true);
          }}
          onDelete={handleDeleteDeal}
          onPreview={(deal) => navigate(`/deals/deal/${deal.id}`)}
        />
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="p-2 bg-[#F7F8F9] min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading deals...</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[#F7F8F9] min-h-screen w-full overflow-hidden">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-[1.250025rem]  text-gray-900">Deals</h1>
          <p className="text-gray-600 text-xs ">Manage all your deals in one place</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-red-600 text-white p-2  rounded    hover:bg-red-700 transition flex items-center gap-2"
        >
          <Plus size={18} /> Add New Deal
        </button>
      </div>

      {error && (
        <div className="p-2 mb-4 bg-yellow-50 border border-yellow-200 rounded ">
          <p className="text-xs  text-yellow-700">{error}</p>
        </div>
      )}

      <DataTable 
        columns={columns}
        data={deals}
        title="All Deals"
        searchKeys={['name', 'company', 'contact', 'email', 'phone', 'location', 'assigned_name', 'stage']}
      />

      <AddNewDealModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDeal(null);
        }}
        onSubmit={selectedDeal ? handleUpdateDeal : handleCreateDeal}
        dealToEdit={selectedDeal}
        contacts={contacts}
        companies={companies}
      />
    </div>
  );
};

export default DealsListPage;
