import React, { useState, useEffect } from 'react';
import { Upload, Plus } from 'lucide-react';
import AddNewDealModal from '../sales/AddNewDealModal';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AddContactModal = ({ isOpen, onClose, onSubmit, initialData = null, isEditMode = false, autoFillCompanyId = null, autoFillCompanyName = null }) => {
  const [companies, setCompanies] = useState([]);
  const [deals, setDeals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [avatar, setAvatar] = useState(null);
  const fileInputRef = React.useRef(null);
  const [openPanels, setOpenPanels] = useState({
    basic: true,
    address: false,
    social: false,
    access: false,
  });
  const [emailOptOut, setEmailOptOut] = useState(false);
  const [isDealFormOpen, setIsDealFormOpen] = useState(false);
  const [localDeals, setLocalDeals] = useState([]);
  const [selectPeopleDropdownOpen, setSelectPeopleDropdownOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    position: '',
    company_id: '',
    email: '',
    phone: '',
    phone2: '',
    countryCode1: '+1',
    countryCode2: '+1',
    fax: '',
    dateOfBirth: '',
    deals: '',
    reviews: '',
    source: '',
    industry: '',
    currency: '',
    language: '',
    description: '',
    street: '',
    country: '',
    state: '',
    city: '',
    zipcode: '',
    facebook: '',
    skype: '',
    linkedin: '',
    twitter: '',
    whatsapp: '',
    instagram: '',
    visibility: 'select',
  });

  useEffect(() => {
    fetchCompanies();
    fetchDeals();
    fetchProjects();
    fetchContacts();
    fetchUsers();
  }, []);

  useEffect(() => {
    setLocalDeals(deals);
  }, [deals]);

  useEffect(() => {
    if (isOpen && autoFillCompanyId) {
      setForm(prev => ({
        ...prev,
        company_id: autoFillCompanyId.toString()
      }));
    }
  }, [isOpen, autoFillCompanyId]);

  const fetchCompanies = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/companies`);
      let data = await response.json();

      if (!Array.isArray(data)) {
        data = data.data || data.companies || [];
      }

      setCompanies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      setCompanies([]);
    }
  };

  const fetchDeals = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/deals`);
      const data = await response.json();
      setDeals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching deals:', error);
      setDeals([]);
    }
  };

  const fetchProjects = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/projects`);
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    }
  };

  const fetchContacts = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/contacts`);
      const data = await response.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/users`);
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  useEffect(() => {
    if (isEditMode && initialData) {
      setForm({
        firstName: initialData.name?.split(' ')[0] || '',
        lastName: initialData.name?.split(' ').slice(1).join(' ') || '',
        position: initialData.position || '',
        company_id: initialData.company_name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        phone2: '',
        countryCode1: '+1',
        countryCode2: '+1',
        fax: '',
        dateOfBirth: '',
        deals: '',
        reviews: '',
        source: '',
        industry: '',
        currency: '',
        language: '',
        description: '',
        street: '',
        country: initialData.country || '',
        state: '',
        city: '',
        zipcode: '',
        facebook: '',
        skype: '',
        linkedin: '',
        twitter: '',
        whatsapp: '',
        instagram: '',
        visibility: 'select',
      });
    }
  }, [isEditMode, initialData]);

  const togglePanel = (name) => {
    setOpenPanels((p) => ({ ...p, [name]: !p[name] }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatar(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (firstName, lastName) => {
    const first = (firstName || '').charAt(0).toUpperCase();
    const last = (lastName || '').charAt(0).toUpperCase();
    return (first + last) || '?';
  };

  const getSelectedPeopleNames = () => {
    return users.filter(user =>
      selectedPeople.includes(user.id.toString()) ||
      selectedPeople.includes(user.id)
    );
  };

  const handleCreateDeal = async (dealData) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';

      const response = await fetch(`${apiUrl}/deals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dealData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create deal');
      }

      const createdDeal = await response.json();

      const newDeal = {
        id: createdDeal.id,
        deal_name: dealData.deal_name,
        ...createdDeal
      };

      setLocalDeals(prev => [newDeal, ...prev]);
      setForm(prev => ({
        ...prev,
        deals: createdDeal.id?.toString() || ''
      }));

      setIsDealFormOpen(false);
      fetchDeals();
      showSuccessToast(`Deal "${dealData.deal_name}" created successfully!`);
    } catch (err) {
      console.error('Error creating deal:', err);
      showErrorToast('Failed to create deal');
      throw err;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.firstName || !form.lastName || !form.email) {
      alert('Please fill in required fields: First Name, Last Name, and Email');
      return;
    }

    const submitData = {
      first_name: form.firstName,
      last_name: form.lastName,
      position: form.position,
      company_id: form.company_id || null,
      email: form.email,
      phone: form.phone,
      phone2: form.phone2 || null,
      fax: form.fax || null,
      status: 'Active',
      avatar: avatar,
      address: form.street || null,
      city: form.city || null,
      state: form.state || null,
      country: form.country || null,
      source: form.source || null,
      notes: form.description || null,
      department: form.department || null,
    };

    onSubmit(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <div
        className="h-full w-full md:w-[72%] lg:w-[60%] xl:w-[55%] bg-white shadow-xl overflow-y-auto border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex justify-between items-center p-2 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl  text-gray-900">
            {isEditMode ? 'Edit Contact' : 'Add New Contact'}
          </h2>
          <button
            onClick={onClose}
            disabled={false}
            className="text-[#1F2020] hover:text-red  transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">

          {/* Basic Info Panel */}
          <div className="border-b border-gray-200 mb-4">
            <button
              type="button"
              onClick={() => togglePanel('basic')}
              className="w-full text-left p-2  flex items-center justify-between bg-white hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded bg-red-500 text-white  text-base">
                  👤
                </div>
                <span className="  text-gray-900 text-xs ">Basic Info</span>
              </div>
              <span className={`text-gray-500 transition ${openPanels.basic ? 'rotate-180' : ''}`}>
                ▾
              </span>
            </button>

            {openPanels.basic && (
              <div className="px-6 py-5 space-y-5 border-t border-gray-200 bg-white">

                {/* Avatar Upload */}
                <div className="flex gap-3 mb-2">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded border-2 border-dashed border-[#E5E7EB] flex items-center justify-center overflow-hidden bg-[#F9FAFB]">
                      {avatar ? (
                        <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <Upload size={14} className="mx-auto text-[#9CA3AF]" />
                          <div className="text-[9px] text-[#9CA3AF] mt-1">Upload</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-red-500 hover:bg-red-600 text-white p-2  rounded  text-xs    flex items-center gap-2 transition-colors"
                    >
                      <Upload size={16} />
                      Upload file
                    </button>
                    <p className="text-xs text-gray-500 mt-2">JPG, GIF or PNG. Max size of 800K</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFile}
                      className="mt-1 text-xs hidden"
                    />
                  </div>
                </div>

                {/* First Name & Last Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      placeholder="Enter first name"
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      placeholder="Enter last name"
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    />
                  </div>
                </div>

                {/* Job Title & Company Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      name="position"
                      value={form.position}
                      onChange={handleChange}
                      placeholder="Enter job title"
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      Company Name
                    </label>
                    <select
                      name="company_id"
                      value={form.company_id}
                      onChange={handleChange}
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    >
                      <option value="">Select</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Email with Opt Out */}
                <div>
                  <label className="block text-xs    text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter email address"
                      className="flex-1 p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setEmailOptOut(!emailOptOut)}
                      className={`w-10 h-6 rounded-full transition flex-shrink-0 ${emailOptOut ? 'bg-red-500' : 'bg-gray-300'} relative`}
                    >
                      <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition ${emailOptOut ? 'translate-x-4' : 'translate-x-0.5'}`}></span>
                    </button>
                  </div>
                  <div className="text-right mt-1">
                    <span className="text-xs text-gray-600">Email Opt Out</span>
                  </div>
                </div>

                {/* Phone 1 & Phone 2 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <div className="flex gap-2">
                      <select
                        name="countryCode1"
                        value={form.countryCode1}
                        onChange={handleChange}
                        className="p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                      >
                        <option>🇺🇸 +1</option>
                        <option>🇮🇳 +91</option>
                        <option>🇩🇪 +49</option>
                        <option>🇨🇳 +86</option>
                        <option>🇬🇧 +44</option>
                      </select>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="Enter phone number"
                        className="flex-1 p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      Phone Number 2
                    </label>
                    <div className="flex gap-2">
                      <select
                        name="countryCode2"
                        value={form.countryCode2}
                        onChange={handleChange}
                        className="p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                      >
                        <option>🇺🇸 +1</option>
                        <option>🇮🇳 +91</option>
                        <option>🇩🇪 +49</option>
                        <option>🇨🇳 +86</option>
                        <option>🇬🇧 +44</option>
                      </select>
                      <input
                        type="tel"
                        name="phone2"
                        value={form.phone2}
                        onChange={handleChange}
                        placeholder="Enter phone number"
                        className="flex-1 p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Fax */}
                <div>
                  <label className="block text-xs    text-gray-700 mb-1">
                    Fax
                  </label>
                  <input
                    type="tel"
                    name="fax"
                    value={form.fax}
                    onChange={handleChange}
                    placeholder="Enter fax number"
                    className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                  />
                </div>

                {/* Date of Birth & Deals */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={form.dateOfBirth}
                      onChange={handleChange}
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs    text-gray-700">
                        Deals
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsDealFormOpen(true)}
                        className="flex items-center gap-1 text-red  hover:text-red-700   text-xs transition"
                      >
                        <Plus size={14} />
                        Add New
                      </button>
                    </div>
                    <select
                      name="deals"
                      value={form.deals}
                      onChange={handleChange}
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    >
                      <option value="">Select</option>
                      {localDeals.map((deal) => (
                        <option key={deal.id} value={deal.id}>
                          {deal.deal_name || deal.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Source & Industry */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      Source
                    </label>
                    <select
                      name="source"
                      value={form.source}
                      onChange={handleChange}
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    >
                      <option>Select</option>
                      <option>Website</option>
                      <option>Referral</option>
                      <option>Email</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      Industry
                    </label>
                    <select
                      name="industry"
                      value={form.industry}
                      onChange={handleChange}
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    >
                      <option>Select</option>
                      <option>Technology</option>
                      <option>Finance</option>
                      <option>Healthcare</option>
                    </select>
                  </div>
                </div>

                {/* Currency & Language */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      name="currency"
                      value={form.currency}
                      onChange={handleChange}
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    >
                      <option>Select</option>
                      <option>USD</option>
                      <option>EUR</option>
                      <option>INR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      Language
                    </label>
                    <select
                      name="language"
                      value={form.language}
                      onChange={handleChange}
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    >
                      <option>Select</option>
                      <option>English</option>
                      <option>Spanish</option>
                      <option>French</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs    text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Enter description"
                    rows="2"
                    className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400 resize-none"
                  ></textarea>
                </div>
              </div>
            )}
          </div>

          {/* Address Info Panel */}
          <div className="border-b border-gray-200 mb-4">
            <button
              type="button"
              onClick={() => togglePanel('address')}
              className="w-full text-left p-2  flex items-center justify-between bg-white hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded bg-red-500 text-white  text-base">
                  📍
                </div>
                <span className="  text-gray-900 text-xs ">Address Info</span>
              </div>
              <span className={`text-gray-500 transition ${openPanels.address ? 'rotate-180' : ''}`}>
                ▾
              </span>
            </button>

            {openPanels.address && (
              <div className="px-6 py-5 space-y-5 border-t border-gray-200 bg-white">
                {/* Street Address */}
                <div>
                  <label className="block text-xs    text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="street"
                    value={form.street}
                    onChange={handleChange}
                    placeholder="Enter street address"
                    className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                  />
                </div>

                {/* Country & State */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      Country
                    </label>
                    <select
                      name="country"
                      value={form.country}
                      onChange={handleChange}
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    >
                      <option value="">Select</option>
                      <option>United States</option>
                      <option>India</option>
                      <option>Germany</option>
                      <option>China</option>
                      <option>United Kingdom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      State / Province
                    </label>
                    <select
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    >
                      <option value="">Select</option>
                      <option>State A</option>
                      <option>State B</option>
                      <option>State C</option>
                    </select>
                  </div>
                </div>

                {/* City & Zipcode */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      City
                    </label>
                    <select
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    >
                      <option value="">Select</option>
                      <option>City A</option>
                      <option>City B</option>
                      <option>City C</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      Zipcode
                    </label>
                    <input
                      type="text"
                      name="zipcode"
                      value={form.zipcode}
                      onChange={handleChange}
                      placeholder="Enter zipcode"
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Social Profile Panel */}
          <div className="border-b border-gray-200 mb-4">
            <button
              type="button"
              onClick={() => togglePanel('social')}
              className="w-full text-left p-2  flex items-center justify-between bg-white hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded bg-red-500 text-white  text-base">
                  👥
                </div>
                <span className="  text-gray-900 text-xs ">Social Profile</span>
              </div>
              <span className={`text-gray-500 transition ${openPanels.social ? 'rotate-180' : ''}`}>
                ▾
              </span>
            </button>

            {openPanels.social && (
              <div className="px-6 py-5 space-y-5 border-t border-gray-200 bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      Facebook
                    </label>
                    <input
                      type="text"
                      name="facebook"
                      value={form.facebook}
                      onChange={handleChange}
                      placeholder="Enter Facebook profile"
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      Skype
                    </label>
                    <input
                      type="text"
                      name="skype"
                      value={form.skype}
                      onChange={handleChange}
                      placeholder="Enter Skype username"
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      LinkedIn
                    </label>
                    <input
                      type="text"
                      name="linkedin"
                      value={form.linkedin}
                      onChange={handleChange}
                      placeholder="Enter LinkedIn profile"
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      Twitter
                    </label>
                    <input
                      type="text"
                      name="twitter"
                      value={form.twitter}
                      onChange={handleChange}
                      placeholder="Enter Twitter handle"
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      WhatsApp
                    </label>
                    <input
                      type="text"
                      name="whatsapp"
                      value={form.whatsapp}
                      onChange={handleChange}
                      placeholder="Enter WhatsApp number"
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-1">
                      Instagram
                    </label>
                    <input
                      type="text"
                      name="instagram"
                      value={form.instagram}
                      onChange={handleChange}
                      placeholder="Enter Instagram handle"
                      className="w-full p-2  border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-gray-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Access Panel */}
          <div className="border-b border-gray-200 mb-4">
            <button
              type="button"
              onClick={() => togglePanel('access')}
              className="w-full text-left p-2  flex items-center justify-between bg-white hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded bg-red-500 text-white  text-base">
                  🔒
                </div>
                <span className="  text-gray-900 text-xs ">Access</span>
              </div>
              <span className={`text-gray-500 transition ${openPanels.access ? 'rotate-180' : ''}`}>
                ▾
              </span>
            </button>

            {openPanels.access && (
              <div className="px-6 py-5 border-t border-gray-200 bg-white">
                <label className="block text-xs    text-gray-700 mb-3">
                  Visibility
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={form.visibility === 'public'}
                      onChange={handleChange}
                      className="w-4 h-4 accent-red-500"
                    />
                    <span className="text-xs  text-gray-700">Public</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value="private"
                      checked={form.visibility === 'private'}
                      onChange={handleChange}
                      className="w-4 h-4 accent-red-500"
                    />
                    <span className="text-xs  text-gray-700">Private</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value="select"
                      checked={form.visibility === 'select'}
                      onChange={handleChange}
                      className="w-4 h-4 accent-red-500"
                    />
                    <span className="text-xs  text-gray-700">Select People</span>
                  </label>
                </div>

                {form.visibility === 'select' && (
                  <div className="mt-4">
                    <label className="block text-xs    text-gray-700 mb-2">
                      Select Users
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setSelectPeopleDropdownOpen(!selectPeopleDropdownOpen)}
                        disabled={users.length === 0}
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
                                const isSelected = selectedPeople.includes(user.id.toString()) || selectedPeople.includes(user.id);
                                setSelectedPeople(isSelected
                                  ? selectedPeople.filter(id => id !== user.id.toString() && id !== user.id)
                                  : [...selectedPeople, user.id.toString()]
                                );
                              }}
                              className="w-full p-2 text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-b-0"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPeople.includes(user.id.toString()) || selectedPeople.includes(user.id)}
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
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="p-6 flex justify-end gap-3 border-t border-gray-200 sticky bottom-0 bg-white mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded  text-xs    hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-500 text-white rounded  text-xs    hover:bg-red-600 transition-colors"
            >
              Create New
            </button>
          </div>
        </form>

        {/* Deal Form Sidebar */}
        <AddNewDealModal
          isOpen={isDealFormOpen}
          onClose={() => setIsDealFormOpen(false)}
          onSubmit={handleCreateDeal}
          contacts={contacts}
          projects={projects}
          companies={companies}
        />
      </div>
    </div>
  );
};

export default AddContactModal;
