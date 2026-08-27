import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AddNewDealModal = ({ isOpen, onClose, onSubmit, contacts = [], projects = [], companies = [], dealToEdit = null, isCompanyContext = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [localCompanies, setLocalCompanies] = useState(companies);
  const [localContacts, setLocalContacts] = useState(contacts);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [openPanels, setOpenPanels] = useState({
    deal: true,
    client: true,
    dates: true,
    assignment: true,
    optional: true,
  });

  const [formData, setFormData] = useState({
    deal_name: '',
    pipeline: '',
    status: 'Pending',
    deal_value: '',
    currency: 'INR',
    contact_id: '',
    expected_close_date: '',
    assignee_id: '',
    follow_up_date: '',
    priority: 'Medium',
    description: '',
    company_id: '',
    lead_id: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchLeads();
      fetchCompanies();
      fetchContacts();
    }
  }, [isOpen]);

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

  const fetchLeads = async () => {
    setIsLoadingLeads(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/leads?status=Qualified`);
      const data = await response.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      setLeads([]);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const fetchCompanies = async () => {
    setIsLoadingCompanies(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/companies`);
      const data = await response.json();
      setLocalCompanies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      setLocalCompanies([]);
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const fetchContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/contacts`);
      const data = await response.json();
      setLocalContacts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setLocalContacts([]);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleLeadSelect = (e) => {
    const leadId = e.target.value;
    if (!leadId) {
      setFormData(prev => ({ ...prev, lead_id: '' }));
      return;
    }

    const selectedLead = leads.find(l => l.id.toString() === leadId);
    if (selectedLead) {
      setFormData(prev => ({
        ...prev,
        lead_id: leadId,
        deal_name: selectedLead.lead_name || selectedLead.name || prev.deal_name,
        deal_value: selectedLead.value || prev.deal_value,
        company_id: selectedLead.company_id || prev.company_id,
        description: selectedLead.notes || selectedLead.description || prev.description,
        pipeline: 'Converted Lead',
      }));
    }
  };

  useEffect(() => {
    setLocalCompanies(companies);
  }, [companies]);

  useEffect(() => {
    setLocalContacts(contacts);
  }, [contacts]);

  useEffect(() => {
    if (isOpen && dealToEdit) {
      setFormData({
        deal_name: dealToEdit.deal_name || dealToEdit.company || '',
        pipeline: dealToEdit.pipeline || dealToEdit.stage || '',
        status: dealToEdit.status || 'Pending',
        deal_value: dealToEdit.deal_value || dealToEdit.value || '',
        currency: dealToEdit.currency || 'INR',
        contact_id: dealToEdit.contact_id || '',
        expected_close_date: dealToEdit.expected_close_date || '',
        assignee_id: dealToEdit.assignee_id || '',
        follow_up_date: dealToEdit.follow_up_date || '',
        priority: dealToEdit.priority || 'Medium',
        description: dealToEdit.description || '',
        company_id: dealToEdit.company_id || '',
        lead_id: dealToEdit.lead_id || '',
      });
    } else if (isOpen) {
      setFormData({
        deal_name: '',
        pipeline: '',
        status: 'Pending',
        deal_value: '',
        currency: 'INR',
        contact_id: '',
        expected_close_date: '',
        assignee_id: '',
        follow_up_date: '',
        priority: 'Medium',
        description: '',
        company_id: '',
        lead_id: '',
      });
    }
  }, [isOpen, dealToEdit]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.deal_name) {
      setError('Please fill in required fields: Deal Name');
      return;
    }

    if (!formData.pipeline) {
      setError('Please select a Pipeline');
      return;
    }

    setIsLoading(true);
    try {
      if (onSubmit) {
        // Sanitize data: convert empty strings to null for date fields and other optional fields
        const sanitizedData = {
          ...formData,
          expected_close_date: formData.expected_close_date || null,
          follow_up_date: formData.follow_up_date || null,
          assignee_id: formData.assignee_id || null,
          company_id: formData.company_id || null,
          contact_id: formData.contact_id || null,
          lead_id: formData.lead_id || null,
          deal_value: formData.deal_value === '' ? null : formData.deal_value
        };
        await onSubmit(sanitizedData);
      }
      handleCancel();
    } catch (err) {
      setError(err.message || 'Failed to create deal');
      console.error('Form submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      deal_name: '',
      pipeline: '',
      status: 'Pending',
      deal_value: '',
      currency: 'INR',
      contact_id: '',
      expected_close_date: '',
      assignee_id: '',
      follow_up_date: '',
      priority: 'Medium',
      description: '',
      company_id: '',
      lead_id: '',
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={handleCancel}>
      <div
        className="h-full w-full md:w-[80%] lg:w-[70%] xl:w-[65%] bg-white shadow-xl overflow-y-auto border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-3  border-b border-[#EAECF0] sticky top-0 bg-white z-10">
          <h2 className="text-xl  text-gray-900">{dealToEdit ? 'Edit Deal' : 'Add New Deal'}</h2>
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

        <form id="add-deal-form" onSubmit={handleSubmit} className="p-2 space-y-0">

          {/* Deal Details Panel */}
          <div className="border-b border-[#EAECF0]">
            <button
              type="button"
              onClick={() => togglePanel('deal')}
              className="w-full text-left p-2  flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded bg-red-500 text-white  text-base">
                  🤝
                </div>
                <span className=" text-gray-900 text-xs ">Deal Details</span>
              </div>
              <ChevronDown
                size={18}
                className={`text-gray-500 transition ${openPanels.deal ? 'rotate-180' : ''}`}
              />
            </button>

            {openPanels.deal && (
              <div className="p-2 space-y-2 border-t border-[#EAECF0] bg-white">
                {/* Converted Lead */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="mb-2">
                    <label className="block text-xs text-gray-700 mb-2">
                      Converted Lead
                    </label>
                    <select
                      name="lead_id"
                      value={formData.lead_id}
                      onChange={handleLeadSelect}
                      disabled={isLoadingLeads}
                      className="w-full p-2.5 border border-[#E5E7EB] rounded text-xs bg-white focus:outline-none focus:border-red-500 transition"
                    >
                      <option value="">Select a Converted Lead (to auto-fill)</option>
                      {leads.map(lead => (
                        <option key={lead.id} value={lead.id}>
                          {lead.lead_name || lead.name} ({lead.company_name || 'No Company'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Deal Name */}
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Deal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="deal_name"
                      value={formData.deal_name}
                      onChange={handleInputChange}
                      placeholder="Enter deal name"
                      className="w-full p-2.5 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                </div>


                {/* Stage / Pipeline & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Stage / Pipeline <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="pipeline"
                      value={formData.pipeline}
                      onChange={handleInputChange}
                      className="w-full p-2.5 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    >
                      <option value="">Select a Stage</option>
                      <option value="Converted Lead">Converted Lead</option>
                      <option value="Quotation">Quotation</option>
                      <option value="Revised Quotation">Revised Quotation</option>
                      <option value="Negotiation">Negotiation</option>
                      <option value="Finalized Deal">Finalized Deal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full p-2.5 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    >
                      <option value="">Choose</option>
                      <option value="Pending">Pending</option>
                      <option value="Won">Won</option>
                      <option value="Lost">Lost</option>
                      <option value="In Progress">In Progress</option>
                    </select>
                  </div>
                </div>

                {/* Deal Value & Currency */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Deal Value
                    </label>
                    <input
                      type="number"
                      name="deal_value"
                      value={formData.deal_value}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      className="w-full p-2.5 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
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
                      className="w-full p-2.5 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    >
                      <option value="">Choose</option>
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Client Details Panel */}
          <div className="border-b border-[#EAECF0]">
            <button
              type="button"
              onClick={() => togglePanel('client')}
              className="w-full text-left p-2  flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded bg-red-500 text-white  text-base">
                  🏢
                </div>
                <span className=" text-gray-900 text-xs ">Client Details</span>
              </div>
              <ChevronDown
                size={18}
                className={`text-gray-500 transition ${openPanels.client ? 'rotate-180' : ''}`}
              />
            </button>

            {openPanels.client && (
              <div className="grid grid-cols-2 gap-4 p-2  border-t border-[#EAECF0] bg-white">
                <div>
                  <label className="block text-xs    text-gray-700 ">
                    Company
                  </label>
                  <select
                    name="company_id"
                    value={formData.company_id}
                    onChange={handleInputChange}
                    disabled={isLoadingCompanies}
                    className="w-full p-2.5 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                  >
                    <option value="">{isLoadingCompanies ? 'Loading Companies...' : 'Select Company'}</option>
                    {localCompanies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.company_name || company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs    text-gray-700 ">
                    Contact
                  </label>
                  <select
                    name="contact_id"
                    value={formData.contact_id}
                    onChange={handleInputChange}
                    disabled={isLoadingContacts}
                    className="w-full p-2.5 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                  >
                    <option value="">{isLoadingContacts ? 'Loading Contacts...' : 'Select Contact'}</option>
                    {localContacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Dates Panel */}
          <div className="border-b border-[#EAECF0]">
            <button
              type="button"
              onClick={() => togglePanel('dates')}
              className="w-full text-left p-2  flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded bg-red-500 text-white  text-base">
                  📅
                </div>
                <span className=" text-gray-900 text-xs ">Dates</span>
              </div>
              <ChevronDown
                size={18}
                className={`text-gray-500 transition ${openPanels.dates ? 'rotate-180' : ''}`}
              />
            </button>

            {openPanels.dates && (
              <div className="p-2 space-y-2 border-t border-[#EAECF0] bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Expected Closing Date
                    </label>
                    <input
                      type="date"
                      name="expected_close_date"
                      value={formData.expected_close_date}
                      onChange={handleInputChange}
                      className="w-full p-2.5 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs    text-gray-700 mb-2">
                      Follow-Up Date
                    </label>
                    <input
                      type="date"
                      name="follow_up_date"
                      value={formData.follow_up_date}
                      onChange={handleInputChange}
                      className="w-full p-2.5 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Assignment Panel */}
          <div className="border-b border-[#EAECF0]">
            <button
              type="button"
              onClick={() => togglePanel('assignment')}
              className="w-full text-left p-2  flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded bg-red-500 text-white  text-base">
                  👤
                </div>
                <span className=" text-gray-900 text-xs ">Assignment</span>
              </div>
              <ChevronDown
                size={18}
                className={`text-gray-500 transition ${openPanels.assignment ? 'rotate-180' : ''}`}
              />
            </button>

            {openPanels.assignment && (
              <div className="p-2 space-y-2 border-t border-[#EAECF0] bg-white">
                <div>
                  <label className="block text-xs    text-gray-700 mb-2">
                    Assignee
                  </label>
                  <select
                    name="assignee_id"
                    value={formData.assignee_id}
                    onChange={handleInputChange}
                    className="w-full p-2.5 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                  >
                    <option value="">Select Assignee</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name || user.name} {user.last_name || ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Optional Panel */}
          <div className="border-b border-[#EAECF0]">
            <button
              type="button"
              onClick={() => togglePanel('optional')}
              className="w-full text-left p-2  flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded bg-red-500 text-white  text-base">
                  ➕
                </div>
                <span className=" text-gray-900 text-xs ">Optional</span>
              </div>
              <ChevronDown
                size={18}
                className={`text-gray-500 transition ${openPanels.optional ? 'rotate-180' : ''}`}
              />
            </button>

            {openPanels.optional && (
              <div className="p-2 space-y-2 border-t border-[#EAECF0] bg-white">
                <div>
                  <label className="block text-xs    text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full p-2.5 border border-[#E5E7EB] rounded  text-xs  bg-white focus:outline-none focus:border-red-500 transition"
                  >
                    <option value="">Select Priority</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs    text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter deal description"
                    rows="4"
                    className="w-full p-2 border border-[#E5E7EB] rounded  text-xs bg-white focus:outline-none focus:border-red-500 transition resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-6 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-[#EAECF0] z-10">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="p-2 text-xs  text-gray-700 bg-white border border-gray-300 rounded  hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="p-2 text-xs  text-white bg-red-500 rounded  hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                dealToEdit ? 'Update Deal' : 'Save Deal'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNewDealModal;