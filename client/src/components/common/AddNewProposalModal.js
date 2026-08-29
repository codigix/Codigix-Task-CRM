import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, X, CheckCircle, Upload, User } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AddNewProposalModal = ({ isOpen, onClose, onSubmit, companies = [], contacts = [], deals = [], leads = [], initialData = null }) => {
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
  const [localLeads, setLocalLeads] = useState([]);
  const [selectedLeadInfo, setSelectedLeadInfo] = useState(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    proposal_date: new Date().toISOString().split('T')[0],
    validity_date: '',
    lead_id: '',
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

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (!hasFetchedRef.current) {
        hasFetchedRef.current = true;
        fetchUsersAndProjects();
      }

      if (companies && companies.length > 0) {
        setLocalCompanies(companies);
      }
      if (contacts && contacts.length > 0) {
        setLocalContacts(contacts);
      }
      if (deals && deals.length > 0) {
        setLocalDeals(deals);
      }
      if (leads && leads.length > 0) {
        setLocalLeads(leads);
      }
    } else {
      hasFetchedRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        let atts = [];
        if (initialData.attachments) {
          try {
            atts = typeof initialData.attachments === 'string' ? JSON.parse(initialData.attachments) : initialData.attachments;
          } catch {
            atts = [];
          }
        }
        setFormData({
          title: initialData.title || '',
          proposal_date: initialData.proposal_date ? new Date(initialData.proposal_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          validity_date: initialData.validity_date ? new Date(initialData.validity_date).toISOString().split('T')[0] : '',
          lead_id: initialData.lead_id ? String(initialData.lead_id) : '',
          client_id: initialData.client_id ? String(initialData.client_id) : '',
          currency: initialData.currency || 'INR',
          status: initialData.status || 'Draft',
          assigned_to: initialData.assigned_to ? String(initialData.assigned_to) : '',
          description: initialData.description || '',
          attachments: Array.isArray(atts) ? atts : []
        });

        setSelectedLeadInfo({
          name: initialData.lead_name || '',
          company: initialData.client_name || '',
          email: initialData.email || initialData.client_email || '',
          phone: initialData.phone || initialData.client_phone || '',
          industry: initialData.industry || '',
          status: initialData.lead_status || initialData.status_badge || '',
          business_type: initialData.business_type || '',
          service_needed: initialData.service_needed || '',
          project_name: initialData.project_scope || ''
        });
      } else {
        setFormData({
          title: '',
          proposal_date: new Date().toISOString().split('T')[0],
          validity_date: '',
          lead_id: '',
          client_id: '',
          currency: 'INR',
          status: 'Draft',
          assigned_to: '',
          description: '',
          attachments: []
        });
        setSelectedLeadInfo(null);
      }
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (isOpen && formData.lead_id && localLeads.length > 0) {
      const foundLead = localLeads.find(l => String(l.id) === String(formData.lead_id));
      if (foundLead) {
        if (!selectedLeadInfo || !selectedLeadInfo.email || !selectedLeadInfo.phone || !selectedLeadInfo.status) {
          handleLeadSelect(foundLead.id, { lead: foundLead });
        }
      }
    }
  }, [isOpen, formData.lead_id, localLeads, selectedLeadInfo]);

  const fetchUsersAndProjects = async () => {
    setLoadingData(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';

      if (leads && leads.length > 0) {
        setLocalLeads(leads);
      }

      const tasks = [fetch(`${apiUrl}/users`)];
      const keys = ['users'];

      if (!leads || leads.length === 0) {
        tasks.push(fetch(`${apiUrl}/leads`));
        keys.push('leads');
      }
      if (!companies || companies.length === 0) {
        tasks.push(fetch(`${apiUrl}/companies`));
        keys.push('companies');
      }

      const responses = await Promise.all(tasks);
      for (let i = 0; i < responses.length; i++) {
        const res = responses[i];
        const key = keys[i];
        if (res.ok) {
          const data = await res.json();
          if (key === 'users') setUsers(Array.isArray(data) ? data : []);
          if (key === 'leads') setLocalLeads(Array.isArray(data) ? data : []);
          if (key === 'companies') setLocalCompanies(Array.isArray(data) ? data : []);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
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

  const handleLeadSelect = (valOrEvent, rawOption) => {
    const leadId = typeof valOrEvent === 'object' && valOrEvent?.target ? valOrEvent.target.value : valOrEvent;
    const lead = rawOption?.lead || localLeads.find(l => l.id.toString() === String(leadId));

    if (lead) {
      let matchedClientId = '';
      if (lead.company_id) {
        matchedClientId = lead.company_id.toString();
      } else if (lead.converted_company_id) {
        matchedClientId = lead.converted_company_id.toString();
      } else {
        const compName = lead.company || lead.company_name;
        if (compName) {
          const found = localCompanies.find(
            c => c.company_name?.toLowerCase() === compName.toLowerCase()
          );
          if (found) matchedClientId = found.id.toString();
        }
      }

      let servicesNeeded = '';
      if (lead.it_services) {
        servicesNeeded = lead.it_services;
      } else if (lead.marketing_services) {
        if (Array.isArray(lead.marketing_services)) {
          servicesNeeded = lead.marketing_services.join(', ');
        } else if (typeof lead.marketing_services === 'string') {
          try {
            const parsed = JSON.parse(lead.marketing_services);
            servicesNeeded = Array.isArray(parsed) ? parsed.join(', ') : lead.marketing_services;
          } catch (e) {
            servicesNeeded = lead.marketing_services;
          }
        }
      }

      const leadName = lead.lead_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.name || `Lead #${lead.id}`;
      const companyName = lead.company || lead.company_name || '';
      
      let autoTitle = '';
      if (lead.project_name) {
        autoTitle = `${lead.project_name} Proposal`;
      } else if (servicesNeeded) {
        autoTitle = `${servicesNeeded} Proposal - ${companyName || leadName}`;
      } else if (companyName) {
        autoTitle = `Proposal for ${companyName}`;
      } else {
        autoTitle = `Proposal for ${leadName}`;
      }

      let matchedProjectId = '';
      if (lead.project_name && projects && projects.length > 0) {
        const foundProj = projects.find(p => 
          (p.project_name || p.name || '').toLowerCase() === lead.project_name.toLowerCase()
        );
        if (foundProj) matchedProjectId = foundProj.id.toString();
      }

      let assignedUserId = '';
      if (lead.owner_id) {
        assignedUserId = String(lead.owner_id);
      } else if (lead.people_assigned) {
        try {
          const parsed = typeof lead.people_assigned === 'string' ? JSON.parse(lead.people_assigned) : lead.people_assigned;
          assignedUserId = Array.isArray(parsed) ? String(parsed[0]) : String(parsed);
        } catch {
          assignedUserId = String(lead.people_assigned);
        }
      }

      setSelectedLeadInfo({
        name: leadName,
        company: companyName,
        email: lead.email || '',
        phone: lead.phone || '',
        industry: lead.industry || '',
        status: lead.lead_status || lead.status || '',
        business_type: lead.business_type || '',
        service_needed: servicesNeeded,
        project_name: lead.project_name || '',
        budget: lead.value || '',
        currency: lead.currency || 'INR'
      });

      setFormData(prev => ({
        ...prev,
        lead_id: leadId,
        title: autoTitle,
        client_id: matchedClientId || prev.client_id,
        project_id: matchedProjectId || prev.project_id,
        assigned_to: assignedUserId || prev.assigned_to,
        currency: lead.currency || prev.currency || 'INR'
      }));
    } else {
      setSelectedLeadInfo(null);
      setFormData(prev => ({
        ...prev,
        lead_id: '',
        title: ''
      }));
    }
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

  const handleFileUpload = async (e) => {
    const rawFiles = Array.from(e.target.files);
    if (!rawFiles || rawFiles.length === 0) return;

    setIsUploadingFile(true);
    try {
      const uploadedList = [];
      for (const file of rawFiles) {
        const fd = new FormData();
        fd.append('file', file);
        if (formData.lead_id) fd.append('lead_id', formData.lead_id);
        if (formData.client_id) fd.append('company_id', formData.client_id);

        try {
          const res = await fetch(`${API_BASE_URL}/files/upload`, {
            method: 'POST',
            body: fd
          });
          if (res.ok) {
            const savedFile = await res.json();
            uploadedList.push({
              id: savedFile.id,
              name: savedFile.name || file.name,
              file_path: savedFile.file_path,
              url: savedFile.file_path,
              size: savedFile.size_bytes || file.size,
              type: savedFile.mime_type || file.type
            });
            continue;
          }
        } catch (err) {
          console.warn('File upload to server failed:', err);
        }

        // Fallback
        uploadedList.push({
          name: file.name,
          size: file.size,
          type: file.type
        });
      }

      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...uploadedList]
      }));
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setIsUploadingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.lead_id || !formData.client_id) {
      setError('Please fill in required fields: Lead and Client');
      return;
    }

    const finalTitle = formData.title || (selectedLeadInfo ? `Proposal for ${selectedLeadInfo.company || selectedLeadInfo.name}` : 'Proposal');

    setIsLoading(true);
    try {
      console.log('📤 Submitting proposal with data:', formData);
      if (onSubmit) {
        await onSubmit({
          ...formData,
          proposal_number: formData.proposal_number || `PROP-${Date.now()}`,
          title: finalTitle,
          business_type: selectedLeadInfo?.business_type || '',
          service_needed: selectedLeadInfo?.service_needed || '',
          project_scope: selectedLeadInfo?.project_name || '',
          amount: 0
        });
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
      lead_id: '',
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
    setSelectedLeadInfo(null);
    setTagInput('');
    setShowUserDropdown(false);
    onClose();
  };

  const leadOptions = (localLeads || []).map(lead => {
    const leadName = lead.lead_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.name || `Lead #${lead.id}`;
    const companyName = lead.company || lead.company_name;
    let serviceStr = lead.it_services || '';
    if (!serviceStr && lead.marketing_services) {
      if (Array.isArray(lead.marketing_services)) {
        serviceStr = lead.marketing_services.join(', ');
      } else if (typeof lead.marketing_services === 'string') {
        try {
          const parsed = JSON.parse(lead.marketing_services);
          serviceStr = Array.isArray(parsed) ? parsed.join(', ') : lead.marketing_services;
        } catch (e) {
          serviceStr = lead.marketing_services;
        }
      }
    }
    const subParts = [companyName, serviceStr || lead.business_type, lead.email].filter(Boolean);
    return {
      id: lead.id,
      value: lead.id,
      label: companyName ? `${leadName} (${companyName})` : leadName,
      sublabel: subParts.join(' • '),
      lead: lead
    };
  });

  const clientOptions = (localCompanies || []).map(company => ({
    id: company.id,
    value: company.id,
    label: company.company_name,
    sublabel: company.email || company.phone || company.city || ''
  }));

  const projectOptions = (projects || []).map(project => ({
    id: project.id,
    value: project.id,
    label: project.project_name || project.name || `Project #${project.id}`
  }));

  const contactOptions = (localContacts || []).map(contact => ({
    id: contact.id,
    value: contact.id,
    label: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || `Contact #${contact.id}`,
    sublabel: contact.email || contact.phone || ''
  }));

  const userOptions = (users || []).map(user => {
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.name || `User #${user.id}`;
    return {
      id: user.id,
      value: String(user.id),
      label: name,
      sublabel: user.email || user.role_name || '',
      initials: getInitials(user.first_name, user.last_name)
    };
  });

  const isEditMode = Boolean(initialData && (initialData.id || initialData.proposal_number));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <div className="h-full w-full md:w-[72%] lg:w-[60%] xl:w-[55%] bg-white shadow-xl overflow-y-auto border-l border-gray-200">
        <div className="flex justify-between items-center p-3  border-b border-[#EAECF0] sticky top-0 bg-white z-10">
          <h2 className="text-md font-semibold text-gray-900">{isEditMode ? 'Edit Proposal' : 'Create New Proposal'}</h2>
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
            <SearchableSelect
              label="Lead"
              required={true}
              placeholder="Choose Lead"
              options={leadOptions}
              value={formData.lead_id}
              onChange={(val, raw) => handleLeadSelect(val, raw)}
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
            <SearchableSelect
              label="Client"
              required={true}
              placeholder="Choose Client"
              options={clientOptions}
              value={formData.client_id}
              onChange={(val) => setFormData(prev => ({ ...prev, client_id: val }))}
            />
          </div>

          {selectedLeadInfo && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-900 flex items-center gap-1.5">
                  <User size={13} className="text-blue-600" />
                  Client & Lead Information
                </span>
                <div className="flex items-center gap-1.5">
                  {selectedLeadInfo.status && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-semibold">
                      {selectedLeadInfo.status}
                    </span>
                  )}
                  {selectedLeadInfo.business_type && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-semibold">
                      {selectedLeadInfo.business_type}
                    </span>
                  )}
                </div>
              </div>

              {(selectedLeadInfo.service_needed || selectedLeadInfo.project_name) && (
                <div className="p-2 bg-white/90 border border-blue-100 rounded text-[11px] space-y-1">
                  {selectedLeadInfo.service_needed && (
                    <div className="pt-1">
                      <span className="text-blue-900 font-semibold block text-[11px] mb-1">
                        Services Needed:
                      </span>
                      <ul className="space-y-1">
                        {selectedLeadInfo.service_needed
                          .split(',')
                          .map(s => s.trim())
                          .filter(Boolean)
                          .map((srv, idx) => (
                            <li key={idx} className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 text-emerald-800 font-medium border border-emerald-200 text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                              <span>{srv}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                  {selectedLeadInfo.project_name && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500 shrink-0">Project Scope:</span>
                      <strong className="text-gray-900">{selectedLeadInfo.project_name}</strong>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-700 pt-1.5 border-t border-blue-200/60">
                <div>
                  <span className="text-gray-500">Client / Company:</span>{' '}
                  <strong className="text-gray-900">{selectedLeadInfo.company || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Contact Person:</span>{' '}
                  <strong className="text-gray-900">{selectedLeadInfo.name || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>{' '}
                  <span className="text-gray-800">{selectedLeadInfo.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>{' '}
                  <span className="text-gray-800">{selectedLeadInfo.phone || 'N/A'}</span>
                </div>
                {selectedLeadInfo.industry && (
                  <div>
                    <span className="text-gray-500">Industry:</span>{' '}
                    <span className="text-gray-800">{selectedLeadInfo.industry}</span>
                  </div>
                )}
                {selectedLeadInfo.business_type && (
                  <div>
                    <span className="text-gray-500">Business Type:</span>{' '}
                    <span className="text-gray-800 font-medium">{selectedLeadInfo.business_type}</span>
                  </div>
                )}
              </div>
            </div>
          )}


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

          <div>
            <SearchableSelect
              label="Assigned to"
              placeholder="Select"
              options={userOptions}
              value={formData.assigned_to}
              onChange={(val) => setFormData(prev => ({ ...prev, assigned_to: val ? val.toString() : '' }))}
              disabled={loadingData}
            />
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
                  <Upload size={32} className={`text-[#1F2020] ${isUploadingFile ? 'animate-bounce text-blue-600' : ''}`} />
                  <p className="text-xs  text-gray-600">
                    {isUploadingFile ? (
                      <span className="text-blue-600 font-semibold">Uploading file to server...</span>
                    ) : (
                      <>Drop your files here or <span className="text-blue-500 hover:underline">browse</span></>
                    )}
                  </p>
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
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-4 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition font-medium disabled:opacity-50"
            >
              {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Proposal' : 'Create')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AddNewProposalModal;
