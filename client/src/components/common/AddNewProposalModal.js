import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, X, CheckCircle, Upload } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AddNewProposalModal = ({ isOpen, onClose, onSubmit, companies = [], contacts = [], deals = [] }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [descriptionFocused, setDescriptionFocused] = useState(false);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [localCompanies, setLocalCompanies] = useState([]);
  const [localContacts, setLocalContacts] = useState([]);
  const [localDeals, setLocalDeals] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    proposal_date: new Date().toISOString().split('T')[0],
    validity_date: '',
    client_id: '',
    project_id: '',
    related_to: '',
    deal_id: '',
    currency: 'INR',
    status: 'Draft',
    assigned_to: '',
    tags: [],
    description: '',
    attachments: []
  });

  useEffect(() => {
    if (isOpen) {
      console.log('🔵 Modal opened - syncing data from props:', {
        companies: companies?.length,
        contacts: contacts?.length,
        deals: deals?.length
      });
      console.log('📦 Full data:', { companies, contacts, deals });

      fetchUsersAndProjects();

      if (companies && companies.length > 0) {
        setLocalCompanies(companies);
        console.log('✅ Companies set:', companies.length);
      } else {
        console.warn('⚠️ No companies received');
      }

      if (contacts && contacts.length > 0) {
        setLocalContacts(contacts);
        console.log('✅ Contacts set:', contacts.length);
      } else {
        console.warn('⚠️ No contacts received');
      }

      if (deals && deals.length > 0) {
        setLocalDeals(deals);
        console.log('✅ Deals set:', deals.length);
      } else {
        console.warn('⚠️ No deals received');
      }
    }
  }, [isOpen, companies, contacts, deals]);

  const fetchUsersAndProjects = async () => {
    setLoadingData(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const [usersRes, projectsRes] = await Promise.all([
        fetch(`${apiUrl}/contacts`),
        fetch(`${apiUrl}/projects`)
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(Array.isArray(projectsData) ? projectsData : []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setUsers([]);
      setProjects([]);
    } finally {
      setLoadingData(false);
    }
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

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getSelectedUser = () => {
    if (!formData.assigned_to) return null;
    return users.find(u => u.id === parseInt(formData.assigned_to));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.client_id) {
      setError('Please fill in required fields: Subject and Client');
      return;
    }

    setIsLoading(true);
    try {
      console.log('📤 Submitting proposal with data:', formData);
      if (onSubmit) {
        await onSubmit(formData);
        console.log('✅ Proposal created successfully');
      }
      handleCancel();
    } catch (err) {
      const errorMsg = err.message || 'Failed to create proposal';
      setError(errorMsg);
      console.error('❌ Form submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      title: '',
      proposal_date: new Date().toISOString().split('T')[0],
      validity_date: '',
      client_id: '',
      project_id: '',
      related_to: '',
      deal_id: '',
      currency: 'INR',
      status: 'Draft',
      assigned_to: '',
      tags: [],
      description: '',
      attachments: []
    });
    setError('');
    setTagInput('');
    setShowUserDropdown(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <div className="h-full w-full md:w-[72%] lg:w-[60%] xl:w-[55%] bg-white shadow-xl overflow-y-auto border-l border-gray-200">
        <div className="flex justify-between items-center p-3  border-b border-[#EAECF0] sticky top-0 bg-white z-10">
          <h2 className="text-md  text-gray-900">Create New Proposal</h2>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="text-[#1F2020] hover:text-red  transition-colors text-2xl disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-5">
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded ">
              <p className="text-xs  text-red-700  ">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-xs    text-gray-700 mb-2">
              Subject<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter subject"
              className="w-full p-2 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Date<span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="proposal_date"
                value={formData.proposal_date}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Open Till<span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="validity_date"
                value={formData.validity_date}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs    text-gray-700 mb-2">
              Client<span className="text-red-500">*</span>
            </label>
            <select
              name="client_id"
              value={formData.client_id}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-blue-500 transition"
            >
              <option value="">Choose</option>
              {localCompanies && localCompanies.length > 0 ? (
                localCompanies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.company_name}
                  </option>
                ))
              ) : (
                <option disabled>No companies available</option>
              )}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs    text-gray-700 mb-2">
                Project
              </label>
              <select
                name="project_id"
                value={formData.project_id}
                onChange={handleInputChange}
                disabled={loadingData}
                className="w-full p-2 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
              >
                <option value="">Choose</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.project_name || project.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="text-red-500 hover:text-red-700 text-lg  mb-1" title="Add New">+</button>
          </div>

          <div>
            <label className="block text-xs    text-gray-700 mb-2">
              Related to
            </label>
            <select
              name="related_to"
              value={formData.related_to}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-blue-500 transition"
            >
              <option value="">Choose</option>
              {localContacts && localContacts.length > 0 ? (
                localContacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                  </option>
                ))
              ) : (
                <option disabled>No contacts available</option>
              )}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs    text-gray-700 mb-2">
                Deals
              </label>
              <select
                name="deal_id"
                value={formData.deal_id}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-blue-500 transition"
              >
                <option value="">Choose</option>
                {localDeals && localDeals.length > 0 ? (
                  localDeals.map(deal => (
                    <option key={deal.id} value={deal.id}>
                      {deal.deal_name}
                    </option>
                  ))
                ) : (
                  <option disabled>No deals available</option>
                )}
              </select>
            </div>
            <button type="button" className="text-red-500 hover:text-red-700 text-lg  mb-1" title="Add New">+</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-blue-500 transition"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="block text-xs    text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-blue-500 transition"
              >
                <option value="Draft">Draft</option>
                <option value="Accepted">Accepted</option>
                <option value="Declined">Declined</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs    text-gray-700 mb-2">
              Assigned to
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                disabled={loadingData}
                className="w-full p-2 border border-gray-300 rounded  text-xs  bg-white focus:outline-none focus:border-blue-500 transition disabled:opacity-50 text-left flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  {getSelectedUser() ? (
                    <>
                      <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs ">
                        {getInitials(getSelectedUser().first_name, getSelectedUser().last_name)}
                      </div>
                      <span>{getSelectedUser().first_name} {getSelectedUser().last_name}</span>
                    </>
                  ) : (
                    <span className="text-gray-500">{loadingData ? 'Loading...' : 'Select'}</span>
                  )}
                </span>
                <span className="text-[#1F2020]">▼</span>
              </button>

              {showUserDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded  shadow-lg z-10 max-h-48 overflow-y-auto">
                  {users.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          assigned_to: user.id.toString()
                        }));
                        setShowUserDropdown(false);
                      }}
                      className="w-full p-2 text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-b-0"
                    >
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
          </div>

          <div>
            <label className="block text-xs    text-gray-700 mb-2">
              Attachment
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded p-3  text-center hover:border-gray-400 transition cursor-pointer">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <Upload size={32} className="text-[#1F2020]" />
                  <p className="text-xs  text-gray-600">Drop your files here or <span className="text-blue-500 hover:underline">browse</span></p>
                  <p className="text-xs text-gray-500">Maximum size: 50 MB</p>
                </div>
              </label>
            </div>
            {formData.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {formData.attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs  p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        attachments: prev.attachments.filter((_, i) => i !== idx)
                      }))}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs    text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded  bg-white min-h-[40px]">
              {formData.tags.map((tag, idx) => (
                <span key={idx} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs  flex items-center gap-2 border border-gray-200">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-gray-500 hover:text-gray-700 "
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Enter value separated by comma"
                className="flex-1 outline-none text-xs  min-w-[100px]"
                onKeyPress={(e) => e.key === 'Enter' && addTag(e)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs    text-gray-700 mb-2">
              Description
            </label>
            <div className="border border-gray-300 rounded  overflow-hidden">
              <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-300">
                <select defaultValue="Normal" className="p-1  border border-gray-300 rounded text-xs bg-white">
                  <option>Normal</option>
                  <option>Heading</option>
                  <option>Code</option>
                </select>
                <button type="button" className="p-1  hover:bg-gray-200 rounded text-xs  ">B</button>
                <button type="button" className="p-1  hover:bg-gray-200 rounded text-xs  ">I</button>
                <button type="button" className="p-1  hover:bg-gray-200 rounded text-xs  underline">U</button>
                <button type="button" className="p-1  hover:bg-gray-200 rounded">🔗</button>
                <button type="button" className="p-1  hover:bg-gray-200 rounded">•</button>
                <button type="button" className="p-1  hover:bg-gray-200 rounded">1.</button>
                <button type="button" className="p-1  hover:bg-gray-200 rounded">a/A</button>
              </div>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                onFocus={() => setDescriptionFocused(true)}
                onBlur={() => setDescriptionFocused(false)}
                placeholder="Enter description..."
                rows="4"
                className="w-full p-2 text-xs  focus:outline-none resize-none"
              />
            </div>
          </div>
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
            className="p-2  bg-red-600 hover:bg-red-700 text-white  text-xs rounded  transition disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddNewProposalModal;
