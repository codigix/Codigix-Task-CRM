import React, { useState, useRef, useEffect } from 'react';
import { Upload, ChevronDown } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AddNewCompanyForm = ({ isOpen, onClose, onSubmit }) => {
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [openPanels, setOpenPanels] = useState({
    basic: true,
    address: false,
    social: false,
    access: false,
  });
  const [formData, setFormData] = useState({
    logo: null,
    logoPreview: null,
    companyName: '',
    emailAddress: '',
    emailOptOut: false,
    phoneNumber: '',
    phone2: '',
    fax: '',
    website: '',
    industryType: '',
    employeeCount: '',
    annualRevenue: '',
    foundedYear: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    facebook: '',
    skype: '',
    linkedin: '',
    twitter: '',
    whatsapp: '',
    instagram: '',
    visibility: 'Private',
    reviews: '',
    owner: '',
    tags: [],
    source: '',
    currency: 'INR',
    language: 'English',
    description: '',
    contacts: [],
  });

  const employeeCounts = ['1-50', '51-100', '101-500', '501-1000', '1000+'];
  const revenueRanges = ['< $1M', '$1M - $10M', '$10M - $50M', '$50M - $100M', '$100M+'];

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
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
      setLoadingUsers(false);
    }
  };

  const togglePanel = (name) => {
    setOpenPanels((p) => ({ ...p, [name]: !p[name] }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          logo: file,
          logoPreview: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.companyName || !formData.emailAddress || !formData.phoneNumber) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
      handleCancel();
    } catch (err) {
      setError(err.message || 'Failed to create company');
      console.error('Form submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      logo: null,
      logoPreview: null,
      companyName: '',
      emailAddress: '',
      emailOptOut: false,
      phoneNumber: '',
      phone2: '',
      fax: '',
      website: '',
      industryType: '',
      employeeCount: '',
      annualRevenue: '',
      foundedYear: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      facebook: '',
      skype: '',
      linkedin: '',
      twitter: '',
      whatsapp: '',
      instagram: '',
      visibility: 'Private',
      reviews: '',
      owner: '',
      tags: [],
      source: '',
      currency: 'INR',
      language: 'English',
      description: '',
      contacts: [],
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <div
        className="h-full w-full md:w-[72%] lg:w-[60%] xl:w-[55%] bg-white shadow-xl overflow-y-auto border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-centerp-3  border-b border-[#EAECF0] sticky top-0 bg-white">
          <h2 className="text-md  text-gray-900">Add New Company</h2>
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

        <form id="add-company-form" onSubmit={handleSubmit} className="p-2 space-y-0">

          {/* Basic Info Panel */}
          <div className="border-b border-[#EAECF0]">
            <button
              type="button"
              onClick={() => togglePanel('basic')}
              className="w-full text-left p-2  flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded bg-red-500 text-white  text-base">
                  🏢
                </div>
                <span className=" text-gray-900 text-xs ">Basic Info</span>
              </div>
              <ChevronDown
                size={18}
                className={`text-gray-500 transition ${openPanels.basic ? 'rotate-180' : ''}`}
              />
            </button>

            {openPanels.basic && (
              <div className="px-4 py-5 space-y-5 border-t border-[#EAECF0] bg-white">

                {/* Logo Upload */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded  border-2 border-dashed border-[#E5E7EB] flex items-center justify-center overflow-hidden bg-[#F9FAFB]">
                      {formData.logoPreview ? (
                        <img src={formData.logoPreview} alt="Company logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <Upload size={16} className="mx-auto text-[#9CA3AF]" />
                          <div className="text-[9px] text-[#9CA3AF] mt-1">Upload</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={handleUploadClick}
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
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Company Name & Email */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      placeholder="Enter company name"
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="emailAddress"
                      value={formData.emailAddress}
                      onChange={handleInputChange}
                      placeholder="Enter email"
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                </div>

                {/* Phone & Website */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="Enter phone"
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      placeholder="https://example.com"
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                </div>

                {/* Phone 2 & Fax */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Phone 2
                    </label>
                    <input
                      type="tel"
                      name="phone2"
                      value={formData.phone2}
                      onChange={handleInputChange}
                      placeholder="Enter alternate phone"
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Fax
                    </label>
                    <input
                      type="tel"
                      name="fax"
                      value={formData.fax}
                      onChange={handleInputChange}
                      placeholder="Enter fax number"
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                </div>

                {/* Email Opt Out */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="emailOptOut"
                    name="emailOptOut"
                    checked={formData.emailOptOut}
                    onChange={(e) => setFormData(prev => ({ ...prev, emailOptOut: e.target.checked }))}
                    className="w-4 h-4 rounded border-[#E5E7EB] accent-red-500"
                  />
                  <label htmlFor="emailOptOut" className="text-xs  text-gray-700">
                    Email: Opt Out
                  </label>
                </div>

                {/* Industry & Employee Count */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Industry Type
                    </label>
                    <input
                      type="text"
                      name="industryType"
                      value={formData.industryType}
                      onChange={handleInputChange}
                      placeholder="e.g., Technology"
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Employee Count
                    </label>
                    <select
                      name="employeeCount"
                      value={formData.employeeCount}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    >
                      <option value="">Select</option>
                      {employeeCounts.map(count => (
                        <option key={count} value={count}>{count}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Revenue & Founded Year */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Annual Revenue
                    </label>
                    <select
                      name="annualRevenue"
                      value={formData.annualRevenue}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    >
                      <option value="">Select</option>
                      {revenueRanges.map(range => (
                        <option key={range} value={range}>{range}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Founded Year
                    </label>
                    <input
                      type="number"
                      name="foundedYear"
                      value={formData.foundedYear}
                      onChange={handleInputChange}
                      placeholder="e.g., 2020"
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                </div>

                {/* Reviews & Owner */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Reviews
                    </label>
                    <input
                      type="text"
                      name="reviews"
                      value={formData.reviews}
                      onChange={handleInputChange}
                      placeholder="e.g., 4.5/5"
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Owner
                    </label>
                    <select
                      name="owner"
                      value={formData.owner}
                      onChange={handleInputChange}
                      disabled={loadingUsers}
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition disabled:opacity-50"
                    >
                      <option value="">{loadingUsers ? 'Loading...' : 'Select Owner'}</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.first_name} {user.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tags & Source */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Deals (comma separated)"
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                      onBlur={(e) => {
                        if (e.target.value) {
                          setFormData(prev => ({
                            ...prev,
                            tags: e.target.value.split(',').map(t => t.trim())
                          }));
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Source
                    </label>
                    <select
                      name="source"
                      value={formData.source}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    >
                      <option value="">Select source</option>
                      <option value="Direct">Direct</option>
                      <option value="Referral">Referral</option>
                      <option value="Website">Website</option>
                      <option value="Event">Event</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Currency & Language */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="INR">INR</option>
                      <option value="AUD">AUD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Language
                    </label>
                    <select
                      name="language"
                      value={formData.language}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs    text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter company description"
                    rows="3"
                    className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Address Info Panel */}
          <div className="border-b border-[#EAECF0]">
            <button
              type="button"
              onClick={() => togglePanel('address')}
              className="w-full text-left p-2  flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded bg-red-500 text-white  text-base">
                  📍
                </div>
                <span className=" text-gray-900 text-xs ">Address Info</span>
              </div>
              <ChevronDown
                size={18}
                className={`text-gray-500 transition ${openPanels.address ? 'rotate-180' : ''}`}
              />
            </button>

            {openPanels.address && (
              <div className="px-4 py-5 space-y-4 border-t border-[#EAECF0] bg-white">
                <div>
                  <label className="block text-xs    text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter street address"
                    rows="3"
                    className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Enter city"
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="Enter state"
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Zip Code
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      placeholder="Enter zip code"
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      placeholder="Enter country"
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Social Profile Panel */}
          <div className="border-b border-[#EAECF0]">
            <button
              type="button"
              onClick={() => togglePanel('social')}
              className="w-full text-left p-2  flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded bg-red-500 text-white  text-base">
                  📱
                </div>
                <span className=" text-gray-900 text-xs ">Social Profile</span>
              </div>
              <ChevronDown
                size={18}
                className={`text-gray-500 transition ${openPanels.social ? 'rotate-180' : ''}`}
              />
            </button>

            {openPanels.social && (
              <div className="px-4 py-5 border-t border-[#EAECF0] bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Facebook
                    </label>
                    <input
                      type="url"
                      name="facebook"
                      value={formData.facebook}
                      onChange={handleInputChange}
                      placeholder="https://facebook.com/..."
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Skype
                    </label>
                    <input
                      type="text"
                      name="skype"
                      value={formData.skype}
                      onChange={handleInputChange}
                      placeholder="Enter Skype ID"
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      LinkedIn
                    </label>
                    <input
                      type="url"
                      name="linkedin"
                      value={formData.linkedin}
                      onChange={handleInputChange}
                      placeholder="https://linkedin.com/..."
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Twitter
                    </label>
                    <input
                      type="url"
                      name="twitter"
                      value={formData.twitter}
                      onChange={handleInputChange}
                      placeholder="https://twitter.com/..."
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Whatsapp
                    </label>
                    <input
                      type="tel"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Instagram
                    </label>
                    <input
                      type="url"
                      name="instagram"
                      value={formData.instagram}
                      onChange={handleInputChange}
                      placeholder="https://instagram.com/..."
                      className="w-full p-2 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Access Panel */}
          <div className="border-b border-[#EAECF0]">
            <button
              type="button"
              onClick={() => togglePanel('access')}
              className="w-full text-left p-2  flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded bg-red-500 text-white  text-base">
                  🔐
                </div>
                <span className=" text-gray-900 text-xs ">Access</span>
              </div>
              <ChevronDown
                size={18}
                className={`text-gray-500 transition ${openPanels.access ? 'rotate-180' : ''}`}
              />
            </button>

            {openPanels.access && (
              <div className="px-4 py-5 border-t border-[#EAECF0] bg-white">
                <div>
                  <label className="block text-xs    text-gray-700 mb-3">
                    Visibility
                  </label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        value="Public"
                        checked={formData.visibility === 'Public'}
                        onChange={handleInputChange}
                        className="w-4 h-4 cursor-pointer accent-red-500"
                      />
                      <span className="text-xs  text-gray-700">Public</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        value="Private"
                        checked={formData.visibility === 'Private'}
                        onChange={handleInputChange}
                        className="w-4 h-4 cursor-pointer accent-red-500"
                      />
                      <span className="text-xs  text-gray-700">Private</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        value="Select People"
                        checked={formData.visibility === 'Select People'}
                        onChange={handleInputChange}
                        className="w-4 h-4 cursor-pointer accent-red-500"
                      />
                      <span className="text-xs  text-gray-700">Select People</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>

        <div className="p-6 flex justify-end gap-3 border-t border-[#EAECF0] sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="px-5 py-2 border border-[#E5E7EB] text-gray-700 rounded  text-xs    hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-company-form"
            disabled={isLoading}
            className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded  text-xs    transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="inline-block animate-spin">⏳</span>
                Creating...
              </>
            ) : (
              'Create New'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddNewCompanyForm;
