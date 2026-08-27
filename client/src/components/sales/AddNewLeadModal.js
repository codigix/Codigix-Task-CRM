import React, { useState, useEffect } from 'react';
import { X, Plus, ChevronDown } from 'lucide-react';
import AddNewCompanyForm from '../common/AddNewCompanyForm';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AddNewLeadModal = ({ isOpen, onClose, onSubmit, companies = [], onCompanyAdded, leadToEdit, currentUser }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [users, setUsers] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    project_name: '',
    email: '',
    phone: '',
    business_type: '', // Marketing or Software Services
    marketing_services: [], // Multi-select
    it_services: '', // Select
    it_services_other: '',
    company: '',
    lead_type: 'Person',
    value: '',
    currency: 'INR',
    source: 'Website',
    source_other: '',
    referral_name: '',
    referral_contact: '',
    industry: '',
    industry_other: '',
    owner: currentUser?.id?.toString() || '',
    status: 'New',
    rating: 5,
    tags: [],
    description: '',
    visibility: 'Public',
    selectedPeople: [],
  });

  useEffect(() => {
    setSelectedFile(null);
    if (leadToEdit) {
      const it_services = leadToEdit.it_services || '';
      const isItServiceOther = it_services && !itServiceOptions.includes(it_services);

      const source = leadToEdit.source || leadToEdit.lead_source || 'Website';
      const isSourceOther = source && !sourceOptions.includes(source);

      const industry = leadToEdit.industry || '';
      const isIndustryOther = industry && !industryOptions.includes(industry);

      const parseJson = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          return [val];
        }
      };

      setFormData({
        name: leadToEdit.name || leadToEdit.lead_name || '',
        project_name: leadToEdit.project_name || '',
        email: leadToEdit.email || '',
        phone: leadToEdit.phone || '',
        business_type: leadToEdit.business_type || '',
        marketing_services: parseJson(leadToEdit.marketing_services),
        it_services: isItServiceOther ? 'Other' : it_services,
        it_services_other: isItServiceOther ? it_services : '',
        company: leadToEdit.company_id?.toString() || leadToEdit.company || '',
        lead_type: leadToEdit.lead_type || 'Person',
        value: leadToEdit.value?.toString() || '',
        currency: leadToEdit.currency || 'INR',
        source: isSourceOther ? 'Other' : source,
        source_other: isSourceOther ? source : '',
        referral_name: leadToEdit.referral_name || '',
        referral_contact: leadToEdit.referral_contact || '',
        industry: isIndustryOther ? 'Other' : industry,
        industry_other: isIndustryOther ? industry : '',
        owner: leadToEdit.owner_id?.toString() || '',
        status: leadToEdit.status || leadToEdit.lead_status || 'New',
        rating: leadToEdit.rating || 5,
        tags: parseJson(leadToEdit.tags),
        description: leadToEdit.description || leadToEdit.notes || '',
        visibility: leadToEdit.visibility || 'Public',
        selectedPeople: parseJson(leadToEdit.people_assigned),
      });
    } else {
      setFormData({
        name: '',
        project_name: '',
        email: '',
        phone: '',
        business_type: '',
        marketing_services: [],
        it_services: '',
        it_services_other: '',
        company: '',
        lead_type: 'Person',
        value: '',
        currency: 'INR',
        source: 'Website',
        source_other: '',
        referral_name: '',
        referral_contact: '',
        industry: '',
        industry_other: '',
        owner: currentUser?.id?.toString() || '',
        status: 'Not Contacted',
        rating: 5,
        tags: [],
        description: '',
        visibility: 'Public',
        selectedPeople: [],
      });
    }
  }, [leadToEdit, isOpen]);

  const [tagInput, setTagInput] = useState('');
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
  const [selectPeopleDropdownOpen, setSelectPeopleDropdownOpen] = useState(false);
  const [isCompanyFormOpen, setIsCompanyFormOpen] = useState(false);
  const [localCompanies, setLocalCompanies] = useState(companies);
  const [companySearchOpen, setCompanySearchOpen] = useState(false);
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [fetchedCompanies, setFetchedCompanies] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [itServicesList, setItServicesList] = useState([]);
  const [itServiceSearchOpen, setItServiceSearchOpen] = useState(false);
  const [itServiceSearchTerm, setItServiceSearchTerm] = useState('');

  const marketingServiceOptions = [
    'SEO',
    'Content Marketing',
    'Social Media Marketing',
    'Email Marketing',
    'PPC Advertising',
    'Branding',
    'Other'
  ];

  const itServiceOptions = [
    'ERP software',
    'CRM software',
    'Web CSM',
    'Web Development',
    'AI Based services',
    'Other'
  ];

  const sourceOptions = [
    'Website',
    'Facebook',
    'Instagram',
    'LinkedIn',
    'Twitter',
    'Google Ads',
    'Referral',
    'Cold Call',
    'Email Campaign',
    'Event',
    'Trade Show',
    'Other'
  ];

  const industryOptions = [
    'Technology',
    'Healthcare',
    'Finance',
    'Retail',
    'Manufacturing',
    'Education',
    'Real Estate',
    'Hospitality',
    'Transportation',
    'Telecommunications',
    'Energy',
    'Media & Entertainment',
    'Consulting',
    'Other'
  ];

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchCompaniesData();
      fetchItServicesData();
    }
  }, [isOpen]);

  useEffect(() => {
    setLocalCompanies(companies);
  }, [companies]);

  const fetchUsers = async () => {
    setLoadingData(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/users`);
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchCompaniesData = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/companies`);
      if (response.ok) {
        const data = await response.json();
        const companiesArray = Array.isArray(data) ? data : [];
        setFetchedCompanies(companiesArray);
        setLocalCompanies(companiesArray);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const fetchItServicesData = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/it-services`);
      if (response.ok) {
        const data = await response.json();
        setItServicesList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching IT services:', err);
    }
  };


  const getSelectedOwner = () => {
    if (!formData.owner) return null;
    return users.find(u => u.id === parseInt(formData.owner));
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getSelectedPeopleNames = () => {
    return formData.selectedPeople
      .map(id => users.find(u => u.id === parseInt(id)))
      .filter(Boolean);
  };

  const getFilteredCompanies = () => {
    if (!companySearchTerm.trim()) {
      return localCompanies;
    }
    return localCompanies.filter(c => {
      const companyName = (c.company_name || c.name || '').toLowerCase();
      const industry = (c.industry || '').toLowerCase();
      const searchTerm = companySearchTerm.toLowerCase();
      return companyName.includes(searchTerm) || industry.includes(searchTerm);
    });
  };

  const getFilteredItServices = () => {
    if (!itServiceSearchTerm.trim()) {
      return itServicesList;
    }
    return itServicesList.filter(s => {
      const serviceName = (s.name || '').toLowerCase();
      return serviceName.includes(itServiceSearchTerm.toLowerCase());
    });
  };


  const getSelectedCompanyName = () => {
    if (!formData.company) return '';
    const company = localCompanies.find(c => c.id.toString() === formData.company.toString());
    if (company) return (company.company_name || company.name);
    // If it's not an ID, it might be the company name string itself
    return formData.company;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleCreateCompany = async (companyData) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';

      const apiPayload = {
        company_name: companyData.companyName,
        email: companyData.emailAddress,
        phone: companyData.phoneNumber,
        phone2: companyData.phone2,
        fax: companyData.fax,
        website: companyData.website,
        industry_type: companyData.industryType,
        employee_count: companyData.employeeCount,
        annual_revenue: companyData.annualRevenue,
        founded_year: companyData.foundedYear,
        address: companyData.address,
        city: companyData.city,
        state: companyData.state,
        zip_code: companyData.zipCode,
        country: companyData.country,
        facebook: companyData.facebook,
        skype: companyData.skype,
        linkedin: companyData.linkedin,
        twitter: companyData.twitter,
        whatsapp: companyData.whatsapp,
        instagram: companyData.instagram,
        visibility: companyData.visibility,
        reviews: companyData.reviews,
        owner_id: companyData.owner ? parseInt(companyData.owner) : null,
        tags: companyData.tags,
        source: companyData.source,
        currency: companyData.currency,
        language: companyData.language,
        description: companyData.description,
        email_opt_out: companyData.emailOptOut
      };

      const response = await fetch(`${apiUrl}/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create company');
      }

      const createdCompany = await response.json();

      const newCompany = {
        id: createdCompany.id,
        company_name: companyData.companyName,
        name: companyData.companyName,
        ...createdCompany
      };

      setLocalCompanies(prev => [newCompany, ...prev]);
      setFormData(prev => ({
        ...prev,
        company: createdCompany.id?.toString() || '',
        email: createdCompany.email || prev.email,
        phone: createdCompany.phone || prev.phone
      }));

      setIsCompanyFormOpen(false);

      if (onCompanyAdded) {
        onCompanyAdded(newCompany);
      }
    } catch (err) {
      console.error('Error creating company:', err);
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.name.trim()) {
      setError('Please fill in the required field: Lead Name');
      return;
    }

    if (!formData.phone || !formData.phone.trim()) {
      setError('Please fill in the required field: Phone');
      return;
    }

    if (!formData.source) {
      setError('Please fill in the required field: Source');
      return;
    }

    if (!formData.industry) {
      setError('Please fill in the required field: Industry');
      return;
    }

    if (!formData.description || !formData.description.trim()) {
      setError('Please fill in the required field: Description');
      return;
    }

    setIsLoading(true);
    try {
      const visibility = formData.visibility === 'Select People' ? 'People' : formData.visibility;

      const payload = {
        name: formData.name,
        project_name: formData.project_name,
        referral_name: formData.source === 'Referral' ? formData.referral_name : null,
        referral_contact: formData.source === 'Referral' ? formData.referral_contact : null,
        lead_name: formData.name,
        email: formData.email || null,
        phone: formData.phone,
        business_type: formData.business_type,
        marketing_services: formData.business_type === 'Marketing' ? formData.marketing_services : [],
        it_services: formData.business_type === 'Software Services' ? (formData.it_services === 'Other' ? formData.it_services_other : formData.it_services) : null,
        company: getSelectedCompanyName() || null,
        company_id: formData.company ? parseInt(formData.company) : null,
        source: formData.source === 'Other' ? formData.source_other : formData.source,
        lead_source: formData.source === 'Other' ? formData.source_other : formData.source,
        status: formData.status,
        lead_status: formData.status,
        rating: formData.rating || 5,
        description: formData.description,
        notes: formData.description,
        owner_id: formData.owner ? parseInt(formData.owner) : null,
        value: formData.value ? parseFloat(formData.value) : null,
        currency: formData.currency,
        lead_type: formData.lead_type,
        industry: formData.industry === 'Other' ? formData.industry_other : formData.industry,
        visibility: visibility,
        tags: formData.tags && formData.tags.length > 0 ? formData.tags : [],
        people_assigned: visibility === 'People' ? formData.selectedPeople.map(p => parseInt(p)) : null
      };

      if (onSubmit) {
        const response = await onSubmit(payload);
        if (response && response.id && selectedFile) {
          const fileData = new FormData();
          fileData.append('file', selectedFile);
          fileData.append('lead_id', response.id);
          fileData.append('userId', formData.owner || '1');

          const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
          await fetch(`${apiUrl}/files/upload`, {
            method: 'POST',
            body: fileData
          });
        }
      }
      handleCancel();
    } catch (err) {
      setError(err.message || 'Failed to create lead');
      console.error('Form submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      project_name: '',
      email: '',
      phone: '',
      business_type: '',
      marketing_services: [],
      it_services: '',
      it_services_other: '',
      company: '',
      lead_type: 'Person',
      value: '',
      currency: 'INR',
      source: 'Website',
      source_other: '',
      referral_name: '',
      referral_contact: '',
      industry: '',
      industry_other: '',
      owner: currentUser?.id?.toString() || '',
      status: 'New',
      rating: 5,
      tags: [],
      description: '',
      visibility: 'Public',
      selectedPeople: [],
    });
    setError('');
    setTagInput('');
    setOwnerDropdownOpen(false);
    setSelectPeopleDropdownOpen(false);
    setCompanySearchOpen(false);
    setCompanySearchTerm('');
    setItServiceSearchTerm('');
    setItServiceSearchOpen(false);
    setSelectedFile(null);
    onClose();
  };

  const toggleMarketingService = (service) => {
    setFormData(prev => ({
      ...prev,
      marketing_services: prev.marketing_services.includes(service)
        ? prev.marketing_services.filter(s => s !== service)
        : [...prev.marketing_services, service]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <div
        className="h-full w-full md:w-[72%] lg:w-[60%] xl:w-[55%] bg-white shadow-xl overflow-y-auto border-l border-gray-200"
      >
        <div className="flex justify-between items-center p-3  border-b border-[#EAECF0] sticky top-0 bg-white z-10">
          <h2 className="text-md  text-gray-900">{leadToEdit ? 'Edit Lead' : 'Add New Lead'}</h2>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="text-[#1F2020] hover:text-red  transition-colors text-2xl disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="p-2 m-4 bg-red-50 border border-red-200 rounded ">
            <p className="text-xs  text-red-700  ">{error}</p>
          </div>
        )}

        <form id="add-lead-form" onSubmit={handleSubmit} className="p-3 space-y-5">

          <div>
            <label className="block text-xs text-gray-700 mb-2">
              Lead Type (Legal Status)
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="lead_type"
                  value="Person"
                  checked={formData.lead_type === 'Person'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-red-600 focus:ring-red-500"
                />
                <span className="text-xs text-gray-700">Person</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="lead_type"
                  value="Organization"
                  checked={formData.lead_type === 'Organization'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-red-600 focus:ring-red-500"
                />
                <span className="text-xs text-gray-700">Organization</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Client Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter client name"
                className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-2">
                Company
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCompanySearchOpen(!companySearchOpen)}
                  className="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-red-500 transition text-left flex items-center justify-between"
                >
                  <span className={getSelectedCompanyName() ? 'text-gray-900' : 'text-gray-500'}>
                    {getSelectedCompanyName() || 'Select Company'}
                  </span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {companySearchOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-20">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        type="text"
                        placeholder="Search company..."
                        value={companySearchTerm}
                        onChange={(e) => setCompanySearchTerm(e.target.value)}
                        className="w-full p-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-red-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, company: '' }));
                          setCompanySearchOpen(false);
                        }}
                        className="w-full p-2 text-left text-xs text-gray-500 hover:bg-gray-50 border-b border-gray-50"
                      >
                        None (Clear Selection)
                      </button>
                      {getFilteredCompanies().map(company => (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              company: company.id.toString(),
                              email: company.email || prev.email,
                              phone: company.phone || prev.phone
                            }));
                            setCompanySearchOpen(false);
                          }}
                          className="w-full p-2 text-left text-xs text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                        >
                          {company.company_name || company.name}
                        </button>
                      ))}
                      {getFilteredCompanies().length === 0 && (
                        <div className="p-2 text-xs text-gray-500 text-center">No companies found</div>
                      )}
                    </div>
                    <div className="p-2 border-t border-gray-100 bg-gray-50">
                      <button
                        type="button"
                        onClick={() => {
                          setCompanySearchOpen(false);
                          setIsCompanyFormOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-red-600  hover:text-red-700 transition"
                      >
                        <Plus size={14} /> Add New Company
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
                className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Phone Number<span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter phone number"
                className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Project Name
              </label>
              <input
                type="text"
                name="project_name"
                value={formData.project_name}
                onChange={handleInputChange}
                placeholder="Enter project name"
                className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Business Type<span className="text-red-500">*</span>
              </label>
              <select
                name="business_type"
                value={formData.business_type}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
              >
                <option value="">Select Business Type</option>
                <option value="Marketing">Marketing</option>
                <option value="Software Services">Software Services</option>
              </select>
            </div>
          </div>

          {formData.business_type === 'Marketing' && (
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <label className="block text-xs  text-gray-700 mb-3">
                Marketing Services (Multi-select)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {marketingServiceOptions.map(service => (
                  <label key={service} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded transition">
                    <input
                      type="checkbox"
                      checked={formData.marketing_services.includes(service)}
                      onChange={() => toggleMarketingService(service)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-xs text-gray-700">{service}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {formData.business_type === 'Software Services' && (
            <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-3">
              <div>
                <label className="block text-xs  text-gray-700 mb-2">
                  IT Services
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setItServiceSearchOpen(!itServiceSearchOpen)}
                    className="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:border-red-500 transition text-left flex items-center justify-between"
                  >
                    <span className={formData.it_services ? 'text-gray-900' : 'text-gray-500'}>
                      {formData.it_services || 'Select IT Service'}
                    </span>
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>

                  {itServiceSearchOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-20">
                      <div className="p-2 border-b border-gray-100">
                        <input
                          type="text"
                          placeholder="Search IT service..."
                          value={itServiceSearchTerm}
                          onChange={(e) => setItServiceSearchTerm(e.target.value)}
                          className="w-full p-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-red-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, it_services: '' }));
                            setItServiceSearchOpen(false);
                          }}
                          className="w-full p-2 text-left text-xs text-gray-500 hover:bg-gray-50 border-b border-gray-50"
                        >
                          None (Clear Selection)
                        </button>
                        {getFilteredItServices().map(service => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, it_services: service.name }));
                              setItServiceSearchOpen(false);
                            }}
                            className="w-full p-2 text-left text-xs text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                          >
                            {service.name}
                          </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, it_services: 'Other' }));
                              setItServiceSearchOpen(false);
                            }}
                            className="w-full p-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                          >
                            Other
                        </button>
                        {getFilteredItServices().length === 0 && (
                          <div className="p-2 text-xs text-gray-500 text-center">No services found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {formData.it_services === 'Other' && (
                <div>
                  <label className="block text-xs  text-gray-700 mb-2">
                    Other IT Service
                  </label>
                  <input
                    type="text"
                    name="it_services_other"
                    value={formData.it_services_other}
                    onChange={handleInputChange}
                    placeholder="Specify other IT service"
                    className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Budget (Value)
              </label>
              <input
                type="number"
                name="value"
                value={formData.value}
                onChange={handleInputChange}
                placeholder="0.00"
                className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
              >
                <option value="">Select Currency</option>
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs    text-gray-700 mb-2">
                  Source<span className="text-red-500">*</span>
                </label>
                <select
                  name="source"
                  value={formData.source}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
                >
                  <option value="">Select</option>
                  {sourceOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              {formData.source === 'Other' && (
                <div>
                  <label className="block text-xs  text-gray-700 mb-2">
                    Other Source
                  </label>
                  <input
                    type="text"
                    name="source_other"
                    value={formData.source_other}
                    onChange={handleInputChange}
                    placeholder="Specify other source"
                    className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
                  />
                </div>
              )}

              {formData.source === 'Referral' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs  text-gray-700 mb-2">
                      Referral Name
                    </label>
                    <input
                      type="text"
                      name="referral_name"
                      value={formData.referral_name}
                      onChange={handleInputChange}
                      placeholder="Name"
                      className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs  text-gray-700 mb-2">
                      Referral Contact
                    </label>
                    <input
                      type="text"
                      name="referral_contact"
                      value={formData.referral_contact}
                      onChange={handleInputChange}
                      placeholder="Contact Info"
                      className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs    text-gray-700 mb-2">
                  Status<span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              <div>
                <label className="block text-xs    text-gray-700 mb-2">
                  Industry<span className="text-red-500">*</span>
                </label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
                >
                  <option value="">Select</option>
                  {industryOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              {formData.industry === 'Other' && (
                <div>
                  <label className="block text-xs  text-gray-700 mb-2">
                    Other Industry
                  </label>
                  <input
                    type="text"
                    name="industry_other"
                    value={formData.industry_other}
                    onChange={handleInputChange}
                    placeholder="Specify other industry"
                    className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs    text-gray-700 mb-2">
              Assignee (Owner)
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setOwnerDropdownOpen(!ownerDropdownOpen)}
                disabled={loadingData}
                className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition disabled:opacity-50 text-left flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  {getSelectedOwner() ? (
                    <>
                      <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs ">
                        {getInitials(getSelectedOwner().first_name, getSelectedOwner().last_name)}
                      </div>
                      <span>{getSelectedOwner().first_name} {getSelectedOwner().last_name}</span>
                    </>
                  ) : (
                    <span className="text-gray-500">{loadingData ? 'Loading...' : 'Select Assignee'}</span>
                  )}
                </span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {ownerDropdownOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-300 rounded  shadow-lg z-20 max-h-48 overflow-y-auto">
                  {users.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          owner: user.id.toString()
                        }));
                        setOwnerDropdownOpen(false);
                      }}
                      className="w-full p-2 text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-xs flex-shrink-0">
                        {getInitials(user.first_name, user.last_name)}
                      </div>
                      <div>
                        <div className="text-xs  text-gray-900">{user.first_name} {user.last_name}</div>
                        <div className="text-xs text-gray-500">{user.email || 'No email'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs    text-gray-700 mb-2">
              Description (Whole Information)<span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter detailed description"
              rows="4"
              className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700 mb-2 font-[500]">
              Attachment (PRD or Document)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded cursor-pointer bg-white hover:bg-gray-50 transition text-xs text-gray-700 font-[500]">
                <Plus size={14} className="text-gray-500" />
                <span>Choose File</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </label>
              {selectedFile ? (
                <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded text-xs text-gray-700">
                  <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-red hover:text-red-800 font-bold"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <span className="text-xs text-gray-400">No file chosen</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs    text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded  bg-white min-h-[40px]">
              {formData.tags.map((tag, idx) => (
                <span key={idx} className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border border-red-200">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-red  hover:text-red-800 font-[500]"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag"
                className="flex-1 outline-none text-xs  min-w-[80px]"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(e);
                  }
                }}
              />
            </div>
          </div>

          {formData.visibility === 'Select People' && (
            <div className="mt-4">
              <label className="block text-xs    text-gray-700 mb-2">
                Select Users
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSelectPeopleDropdownOpen(!selectPeopleDropdownOpen)}
                  disabled={loadingData}
                  className="w-full p-2 border border-gray-300 rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition disabled:opacity-50 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getSelectedPeopleNames().length > 0 ? (
                        <>
                          <div className="flex -space-x-2">
                            {getSelectedPeopleNames().slice(0, 3).map(user => (
                              <div key={user.id} className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs  border border-white">
                                {getInitials(user.first_name, user.last_name)}
                              </div>
                            ))}
                          </div>
                          <span className="text-xs  text-gray-700">
                            {getSelectedPeopleNames().length} user{getSelectedPeopleNames().length !== 1 ? 's' : ''} selected
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-500">Select users</span>
                      )}
                    </div>
                    <span className="text-[#1F2020]">▼</span>
                  </div>
                </button>

                {selectPeopleDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded  shadow-lg z-10 max-h-48 overflow-y-auto">
                    {users.map(user => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          const isSelected = formData.selectedPeople.includes(user.id.toString());
                          setFormData(prev => ({
                            ...prev,
                            selectedPeople: isSelected
                              ? prev.selectedPeople.filter(id => id !== user.id.toString())
                              : [...prev.selectedPeople, user.id.toString()]
                          }));
                        }}
                        className="w-full p-2 text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedPeople.includes(user.id.toString())}
                          readOnly
                          className="w-4 h-4"
                        />
                        <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-xs  flex-shrink-0">
                          {getInitials(user.first_name, user.last_name)}
                        </div>
                        <div>
                          <div className="text-xs    text-gray-900">{user.first_name} {user.last_name}</div>
                          <div className="text-xs text-gray-500">{user.email || 'No email'}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Click users to select/deselect</p>
            </div>
          )}

        </form>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-2  flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="p-2  border border-gray-300 rounded text-xs text-gray-700   hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="p-2  bg-red-600 text-white text-xs  rounded  hover:bg-red-700 transition disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : (leadToEdit ? 'Update Lead' : 'Create New')}
          </button>
        </div>
      </div>

      <AddNewCompanyForm
        isOpen={isCompanyFormOpen}
        onClose={() => setIsCompanyFormOpen(false)}
        onSubmit={handleCreateCompany}
      />
    </div>
  );
};

export default AddNewLeadModal;
