import React, { useState, useEffect } from 'react';
import {
  X, ChevronDown, Calendar, Clock, Link, MapPin, Repeat, CheckCircle,
  Video as VideoIcon, Phone, MessageSquare, Mail, Layout, Paperclip, Image as ImageIcon
} from 'lucide-react';
import { leadsAPI, dealsAPI, contactsAPI, invoicesAPI, usersAPI, followupsAPI, projectAPI } from '../../services/api';
import { generateMeetingCode, generateMeetingLink } from '../../utils/meetingUtils';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AddFollowUpModal = ({ isOpen, onClose, onSubmit, initialData = null }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [relatedRecords, setRelatedRecords] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isFirstForClient, setIsFirstForClient] = useState(false);
  const [projects, setProjects] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);

  const [formData, setFormData] = useState({
    related_type: 'Lead',
    related_id: '',
    project_id: '',
    type: 'Internal Video Call',
    subject: '',
    description: '',
    scheduled_date: '',
    scheduled_time: '',
    priority: 'High',
    reminder_before: '10 minutes',
    is_recurring: false,
    recurrence_frequency: 'Weekly',
    recurrence_end_date: '',
    meeting_link: '',
    meeting_location: '',
    meeting_duration: '30 min',
    client_email: '',
    client_phone: '',
    formal_message: '',
    assigned_to: '',
    assigned_to_name: '',
    status: 'Scheduled',
    outcome: '',
    call_duration: '',
    remarks: '',
    next_followup_date: '',
    next_followup_time: '10:00',
    next_followup_type: 'Call',
    isNextFollowup: false,
    previous_followup_id: '',
    previous_outcome: '',
    workflow_type: ''
  });

  const [openPanels, setOpenPanels] = useState({
    basic: true,
    details: true,
    recurrence: false,
    meeting: false,
    completion: false
  });

  useEffect(() => {
    if (isOpen) {
      const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
          return typeof dateStr === 'string' ? dateStr.split('T')[0] : '';
        }
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      if (initialData) {
        const clientEmail = initialData.client_email || initialData.email || initialData.company_email || initialData.contact_email || '';
        const clientPhone = initialData.client_phone || initialData.phone || initialData.company_phone || initialData.contact_phone || '';
        const clientName = initialData.related_name || initialData.client_name || initialData.lead_name || initialData.company_name || initialData.name || '';

        const formattedData = {
          ...initialData,
          client_email: clientEmail,
          client_phone: clientPhone,
          related_name: clientName,
          scheduled_date: formatDateForInput(initialData.scheduled_date) || formatDateForInput(new Date()),
          scheduled_time: initialData.scheduled_time || '10:00',
          recurrence_end_date: formatDateForInput(initialData.recurrence_end_date),
          next_followup_date: formatDateForInput(initialData.next_followup_date)
        };

        const userStr = localStorage.getItem('user');
        let userEmail = '';
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            userEmail = user.email || '';
          } catch (e) { }
        }

        setFormData(prev => ({
          ...prev,
          ...formattedData,
          assigned_to_email: initialData.assigned_to_email || userEmail,
          isNextFollowup: !!initialData.isNextFollowup || !!initialData.previous_followup_id,
          previous_outcome: initialData.previous_outcome || '',
          id: initialData.id,
          workflow_type: initialData.workflow_type || '',
          formal_message: initialData.formal_message || `Dear ${clientName || 'Client'}, I would like to schedule a ${initialData.type || 'Call'} to discuss our collaboration. Looking forward to connecting with you.`
        }));
      } else {
        const isSeoGmb = window.location.pathname.includes('seo-gmb');
        const workflowContext = isSeoGmb ? (window.location.pathname.includes('gmb') ? 'GMB' : 'SEO') : '';
        const userStr = localStorage.getItem('user');
        let userId = '';
        let userName = '';
        let userEmail = '';

        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            setCurrentUser(user); // Set the state so it can be used elsewhere
            userId = user.id || user.userId || '';
            userName = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : (user.username || '');
            userEmail = user.email || '';
          } catch (e) {
            console.error('Error parsing user from localStorage');
          }
        }

        setFormData({
          related_type: workflowContext ? 'Project' : 'Lead',
          related_id: '',
          project_id: '',
          type: 'Call',
          subject: '',
          description: '',
          scheduled_date: new Date().toISOString().split('T')[0],
          scheduled_time: '10:00',
          priority: 'Medium',
          reminder_before: '10 minutes',
          is_recurring: false,
          recurrence_frequency: 'Weekly',
          recurrence_end_date: '',
          meeting_link: '',
          meeting_location: '',
          meeting_duration: '30 min',
          client_email: '',
          client_phone: '',
          formal_message: '',
          assigned_to: userId,
          assigned_to_name: userName,
          assigned_to_email: userEmail,
          status: 'Scheduled',
          outcome: '',
          call_duration: '',
          remarks: '',
          next_followup_date: '',
          next_followup_time: '10:00',
          next_followup_type: 'Call',
          isNextFollowup: false,
          previous_followup_id: '',
          previous_outcome: '',
          workflow_type: workflowContext
        });
      }
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (isOpen) {
      fetchRelatedRecords();
      fetchUsers();
      fetchProjects();
    }
  }, [formData.related_type, isOpen, currentUser]);

  const fetchProjects = async () => {
    try {
      const data = await projectAPI.getAll();
      setProjects(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  useEffect(() => {
    const checkFollowups = async () => {
      if (isOpen && formData.related_id && formData.related_type && !formData.id) {
        try {
          const followups = await followupsAPI.getByRelated(formData.related_type, formData.related_id);
          const count = Array.isArray(followups) ? followups.length : 0;
          setIsFirstForClient(count === 0);

          // Auto-suggest subject if it's empty
          if (!formData.subject && !initialData?.subject) {
            setFormData(prev => ({
              ...prev,
              subject: count === 0 ? 'Initial Contact' : `Follow-up #${count}`
            }));
          }
        } catch (err) {
          console.error('Error checking follow-ups:', err);
        }
      }
    };
    checkFollowups();
  }, [formData.related_id, formData.related_type, isOpen]);

  useEffect(() => {
    const fetchExistingFiles = async () => {
      if (isOpen && formData.related_id && formData.related_type) {
        try {
          const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
          let paramName = '';
          switch (formData.related_type) {
            case 'Lead': paramName = 'lead_id'; break;
            case 'Deal': paramName = 'deal_id'; break;
            case 'Customer': paramName = 'contact_id'; break;
            case 'Project': paramName = 'project_id'; break;
            default: break;
          }

          if (paramName) {
            const response = await fetch(`${apiUrl}/files?${paramName}=${formData.related_id}`);
            if (response.ok) {
              const data = await response.json();
              setExistingFiles(Array.isArray(data) ? data : []);
            }
          } else {
            setExistingFiles([]);
          }
        } catch (err) {
          console.error('Error fetching existing files:', err);
          setExistingFiles([]);
        }
      } else {
        setExistingFiles([]);
      }
    };

    fetchExistingFiles();
  }, [formData.related_id, formData.related_type, isOpen]);

  const fetchUsers = async () => {
    try {
      const data = await usersAPI.getAll();
      const usersList = Array.isArray(data) ? data : (data.data || []);
      setUsers(usersList);

      if (!initialData && (!formData.assigned_to || !formData.assigned_to_name)) {
        if (currentUser) {
          const name = currentUser.first_name && currentUser.last_name ? `${currentUser.first_name} ${currentUser.last_name}` : (currentUser.username || '');
          if (name) {
            setFormData(prev => ({
              ...prev,
              assigned_to: currentUser.id,
              assigned_to_name: name,
              assigned_to_email: currentUser.email || ''
            }));
          }
        } else if (usersList.length > 0) {
          const firstUser = usersList[0];
          const name = firstUser.first_name && firstUser.last_name ? `${firstUser.first_name} ${firstUser.last_name}` : (firstUser.username || '');
          setFormData(prev => ({
            ...prev,
            assigned_to: firstUser.id,
            assigned_to_name: name,
            assigned_to_email: firstUser.email || ''
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchRelatedRecords = async () => {
    try {
      let data = [];
      const filters = {};
      const userRole = currentUser?.role_name || currentUser?.role || currentUser?.userRole;
      const isSalesExecutive = userRole === 'Sales Executive';

      if (isSalesExecutive && currentUser?.id) {
        if (formData.related_type === 'Lead') {
          filters.owner_id = currentUser.id;
        } else if (formData.related_type === 'Deal') {
          filters.assignee_id = currentUser.id;
        }
      }

      switch (formData.related_type) {
        case 'Lead': data = await leadsAPI.getAll(filters); break;
        case 'Deal': data = await dealsAPI.getAll(filters); break;
        case 'Customer': data = await contactsAPI.getAll(); break;
        case 'Invoice': data = await invoicesAPI.getAll(); break;
        default: break;
      }
      setRelatedRecords(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      console.error('Error fetching related records:', err);
    }
  };

  const togglePanel = (name) => {
    setOpenPanels((p) => ({ ...p, [name]: !p[name] }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'assigned_to') {
      const selectedUser = users.find(u => String(u.id) === String(value));
      const nameVal = selectedUser ? (selectedUser.first_name && selectedUser.last_name ? `${selectedUser.first_name} ${selectedUser.last_name}` : (selectedUser.username || '')) : '';
      const emailVal = selectedUser?.email || '';
      setFormData(prev => ({
        ...prev,
        assigned_to: value,
        assigned_to_name: nameVal,
        assigned_to_email: emailVal
      }));
    } else if (name === 'related_id') {
      const record = relatedRecords.find(r => String(r.id) === String(value));
      console.log('Selected related record:', record);

      if (record) {
        // Handle various field names from different entities (Lead, Deal, Contact, Invoice)
        const clientEmail = record.email || record.contact_email || record.company_email || record.email_address || '';
        const clientPhone = record.phone || record.contact_phone || record.company_phone || record.phone1 || record.mobile || record.phone_number || '';
        const clientName = record.lead_name || record.deal_name || record.client_name || record.company_name || (record.first_name ? `${record.first_name} ${record.last_name}` : '') || record.name || 'Client';
        const description = record.description || record.notes || record.requirement || record.deal_description || record.additional_info || record.requirement_details || record.project_notes || '';

        console.log('Populating client info:', { clientEmail, clientPhone, clientName, description });

        setFormData(prev => ({
          ...prev,
          related_id: value,
          related_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          description: description,
          formal_message: `Dear ${clientName}, I would like to schedule a ${prev.type} to discuss our collaboration. Looking forward to connecting with you.`
        }));
      } else {
        setFormData(prev => ({ ...prev, related_id: value }));
      }
    } else if (name === 'type') {
      // Auto-update subject based on type if subject is generic
      setFormData(prev => {
        const isGenericSubject = prev.subject.includes('Follow-up') || !prev.subject.trim();
        let newSubject = prev.subject;

        if (isGenericSubject) {
          const prefix = prev.isNextFollowup ? 'Next ' : prev.isFirstFollowup ? 'Initial ' : '';
          newSubject = `${prefix}${value} for ${prev.related_name || 'Client'}`;
        }

        let meeting_link = prev.meeting_link;
        // Generate new link if currently empty OR if the type changed
        if (!meeting_link || prev.type !== value) {
          if (['Internal Video Call', 'WhatsApp Call', 'Phone Call', 'Zoom Meeting', 'Demo', 'Google Meet', 'Meeting', 'Call'].includes(value)) {
            meeting_link = generateMeetingLink(value);
          }
        }

        return {
          ...prev,
          type: value,
          subject: newSubject,
          meeting_link: meeting_link,
          formal_message: `Dear ${prev.related_name || 'Client'}, I would like to schedule a ${value} to discuss our collaboration. Looking forward to connecting with you.`
        };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }

    if (name === 'status' && value === 'Completed') {
      setOpenPanels(prev => ({ ...prev, completion: true }));
    } else if (name === 'status' && value !== 'Completed') {
      setOpenPanels(prev => ({ ...prev, completion: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.related_id) {
      setError('Please select a related record');
      return;
    }
    if (!formData.subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!formData.scheduled_date) {
      setError('Scheduled date is required');
      return;
    }
    if (!formData.scheduled_time) {
      setError('Scheduled time is required');
      return;
    }
    if (!formData.type) {
      setError('Follow-up type is required');
      return;
    }
    if (!formData.priority) {
      setError('Priority is required');
      return;
    }

    if (['Zoom Meeting'].includes(formData.type) && !formData.meeting_link) {
      setError(`${formData.type} link is required`);
      return;
    }

    if (formData.type === 'In-Person Meeting' && !formData.meeting_location) {
      setError('Meeting location is required');
      return;
    }

    if (formData.status === 'Completed' && formData.next_followup_date) {
      // Use local date parsing to avoid timezone shifts during comparison
      const [sYear, sMonth, sDay] = formData.scheduled_date.split('-').map(Number);
      const scheduled = new Date(sYear, sMonth - 1, sDay);

      const [nYear, nMonth, nDay] = formData.next_followup_date.split('-').map(Number);
      const next = new Date(nYear, nMonth - 1, nDay);

      if (next < scheduled) {
        setError('Next follow-up date cannot be before current follow-up date');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save follow-up');
    } finally {
      setIsLoading(false);
    }
  };

  const isMeetingType = [
    'Google Meet', 'Zoom Meeting', 'In-Person Meeting', 'Demo',
    'Internal Video Call', 'WhatsApp Call', 'Meeting',
    'Proposal Discussion', 'Payment Reminder', 'Call'
  ].includes(formData.type);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[2px] transition-all duration-300" onClick={onClose}>
      <div
        className="h-full w-full md:w-[500px] bg-white shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-4 py-3 border-b border-[#EAECF0] sticky top-0 bg-white z-10">
          <div className="flex flex-col">
            <h2 className="text-lg text-gray-900 ">
              {formData.id ? 'Edit Follow-Up' :
                formData.isNextFollowup ? 'Schedule Next Follow-Up' :
                  isFirstForClient ? 'Add First Follow-Up' : 'Add Follow-Up'}
            </h2>
            {initialData?.related_name && (
              <span className="text-xs text-gray-500 ">FOR: {initialData.related_name.toUpperCase()}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!formData.id && (
              <span className={`px-2 py-0.5 rounded text-[9px]    ${formData.isNextFollowup ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                isFirstForClient ? 'bg-green-50 text-green-600 border border-green-100' :
                  'bg-blue-50 text-blue-600 border border-blue-100'
                }`}>
                {formData.isNextFollowup ? 'Next Follow-up' :
                  isFirstForClient ? 'First Step' : 'Subsequent'}
              </span>
            )}
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="w-5 h-5 flex-shrink-0 bg-red-100 text-red-600 rounded-full flex items-center justify-center  text-xs">!</div>
            <p className="text-xs text-red-700 leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Related Information Panel */}
            <div className="border-b border-[#EAECF0]">
              <button
                type="button"
                onClick={() => togglePanel('basic')}
                className="w-full text-left p-2 flex items-center justify-between hover:bg-gray-50/50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center rounded bg-blue-500 text-white  shadow-blue-100">
                    <Link size={15} />
                  </div>
                  <span className="text-gray-900 ">Related Information</span>
                </div>
                <ChevronDown
                  size={15}
                  className={`text-gray-400 transition-transform duration-200 ${openPanels.basic ? 'rotate-180' : ''}`}
                />
              </button>

              {openPanels.basic && (
                <div className="p-2 space-y-2 bg-white animate-in fade-in duration-200">
                  {formData.previous_outcome && (
                    <div className="p-2 mb-2 bg-blue-50 border border-blue-100 rounded flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                      <div className="w-6 h-6 flex-shrink-0 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center  text-xs">
                        i
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs   text-blue-600 ">Previous Outcome</span>
                        <p className="text-xs text-blue-800 leading-tight ">"{formData.previous_outcome}"</p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {!(formData.workflow_type === 'SEO' || formData.workflow_type === 'GMB') && (
                      <>
                        <div>
                          <label className="block text-xs  text-gray-700 mb-1.5">
                            Related Type <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <select
                              name="related_type"
                              value={formData.related_type}
                              onChange={handleInputChange}
                              className="w-full p-2 bg-white border border-gray-300 rounded text-xs appearance-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all pr-10"
                            >
                              <option value="Lead">Lead</option>
                              <option value="Deal">Deal</option>
                              <option value="Customer">Customer</option>
                              <option value="Invoice">Invoice</option>
                              <option value="Project">Project</option>
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs  text-gray-700 mb-1.5">
                            Related Record <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <select
                              name="related_id"
                              value={formData.related_id}
                              onChange={handleInputChange}
                              className="w-full p-2 bg-white border border-gray-300 rounded text-xs appearance-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all pr-10"
                            >
                              <option value="">Select {formData.related_type}</option>
                              {relatedRecords.map(record => (
                                <option key={record.id} value={record.id}>
                                  {record.lead_name || record.name || record.deal_name || record.company_name || record.invoice_number ||
                                    ((record.first_name || record.last_name) ? `${record.first_name || ''} ${record.last_name || ''}`.trim() : null) ||
                                    `ID: ${record.id}`}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {(formData.related_type === 'Project' || formData.workflow_type === 'SEO' || formData.workflow_type === 'GMB') && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-xs text-gray-700 mb-1.5 flex items-center gap-2">
                        <Layout size={14} className="text-red-500" />
                        Project Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          name="project_id"
                          value={formData.project_id || formData.related_id}
                          onChange={handleInputChange}
                          className="w-full p-2 bg-white border border-gray-300 rounded text-xs appearance-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all pr-10"
                        >
                          <option value="">Select Project</option>
                          {projects.map(project => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs  text-gray-700 mb-1.5 flex justify-between items-center">
                      <span>Subject <span className="text-red-500">*</span></span>
                      {formData.isNextFollowup ? (
                        <span className="text-xs text-purple-500  animate-pulse">Update subject for this follow-up</span>
                      ) : isFirstForClient ? (
                        <span className="text-xs text-green-500  animate-pulse">First follow-up for this client</span>
                      ) : null}
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        placeholder="Enter follow-up subject"
                        className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all pr-8"
                      />
                      {formData.subject && (
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, subject: '' }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Schedule & Details Panel */}
            <div className="border-b border-[#EAECF0]">
              <button
                type="button"
                onClick={() => togglePanel('details')}
                className="w-full text-left p-2 flex items-center justify-between hover:bg-gray-50/50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center rounded bg-orange-500 text-white  shadow-orange-100">
                    <Calendar size={15} />
                  </div>
                  <span className="text-gray-900 ">Schedule & Details</span>
                </div>
                <ChevronDown
                  size={15}
                  className={`text-gray-400 transition-transform duration-200 ${openPanels.details ? 'rotate-180' : ''}`}
                />
              </button>

              {openPanels.details && (
                <div className="p-2 space-y-2 bg-white animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs  text-gray-700 mb-1.5">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          name="type"
                          value={formData.type}
                          onChange={handleInputChange}
                          className="w-full p-2 bg-white border border-gray-300 rounded text-xs appearance-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all pr-10"
                        >
                          <option value="Call">Phone Call</option>
                          <option value="WhatsApp Call">WhatsApp Call</option>
                          <option value="WhatsApp">WhatsApp Message</option>
                          <option value="SMS">SMS</option>
                          <option value="Email">Email</option>
                          <option value="Google Meet">Google Meet</option>
                          <option value="Zoom Meeting">Zoom Meeting</option>
                          <option value="Internal Video Call">Internal Video Call</option>
                          <option value="In-Person Meeting">In-Person Meeting</option>
                          <option value="Demo">Demo</option>
                          <option value="Proposal Discussion">Proposal Discussion</option>
                          <option value="Payment Reminder">Payment Reminder</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs  text-gray-700 mb-1.5">
                        Priority <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          name="priority"
                          value={formData.priority}
                          onChange={handleInputChange}
                          className={`w-full p-2 border rounded text-xs appearance-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all pr-10 ${formData.priority === 'High' ? 'border-red-200 text-red-700 bg-red-50' :
                            formData.priority === 'Medium' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                              'border-green-200 text-green-700 bg-green-50'
                            }`}
                        >
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Conditional Meeting Fields */}
                  {isMeetingType && (
                    <div className="p-2 bg-blue-50/50 rounded border border-blue-100/50 animate-in slide-in-from-top-2 duration-300 space-y-3">
                      {['Google Meet', 'Zoom Meeting', 'Demo', 'Internal Video Call', 'WhatsApp Call'].includes(formData.type) && (
                        <div>
                          <label className="block text-xs  text-blue-600   mb-1.5 flex items-center gap-2">
                            <VideoIcon size={12} />
                            {['Internal Video Call', 'WhatsApp Call'].includes(formData.type) ? 'Connection ID / Link' : `${formData.type} Link`} <span className="text-red-500">*</span>
                          </label>
                          <div className="relative group">
                            <input
                              type="text"
                              name="meeting_link"
                              value={formData.meeting_link}
                              onChange={handleInputChange}
                              placeholder={
                                formData.meeting_link ? formData.meeting_link :
                                  formData.type === 'Google Meet' ? "Will be generated automatically..." :
                                    ['Internal Video Call', 'WhatsApp Call'].includes(formData.type) ? "Session ID will be generated..." :
                                      `Paste ${formData.type} link here...`
                              }
                              className={`w-full p-2 pl-9 border border-blue-200 rounded text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${formData.meeting_link ? 'bg-blue-50 text-blue-700 font-medium' : 'bg-white'}`}
                              required={['Zoom Meeting', 'Internal Video Call', 'WhatsApp Call'].includes(formData.type)}
                            />
                            <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
                          </div>
                        </div>
                      )}

                      {formData.type === 'In-Person Meeting' && (
                        <div>
                          <label className="block text-xs  text-blue-600   mb-1.5 flex items-center gap-2">
                            <MapPin size={12} />
                            Meeting Location <span className="text-red-500">*</span>
                          </label>
                          <div className="relative group">
                            <input
                              type="text"
                              name="meeting_location"
                              value={formData.meeting_location}
                              onChange={handleInputChange}
                              placeholder="Enter physical address or location details..."
                              className="w-full p-2 pl-9 border border-blue-200 rounded text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
                              required
                            />
                            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-xs text-blue-600 mb-1.5 flex items-center gap-2  tracking-wider ">
                            <Mail size={12} /> Client Email
                          </label>
                          <input
                            type="email"
                            name="client_email"
                            value={formData.client_email}
                            onChange={handleInputChange}
                            placeholder="client@example.com"
                            className="w-full p-2 border border-blue-200 rounded text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-blue-600 mb-1.5 flex items-center gap-2  tracking-wider ">
                            <Phone size={12} /> Client Phone
                          </label>
                          <input
                            type="text"
                            name="client_phone"
                            value={formData.client_phone}
                            onChange={handleInputChange}
                            placeholder="+1 234 567 890"
                            className="w-full p-2 border border-blue-200 rounded text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-xs text-blue-600 mb-1.5 flex items-center gap-2  tracking-wider ">
                          <MessageSquare size={12} /> Formal Invitation Message
                        </label>
                        <textarea
                          name="formal_message"
                          value={formData.formal_message}
                          onChange={handleInputChange}
                          rows={3}
                          placeholder="Write a formal message for the calendar invitation..."
                          className="w-full p-2 border border-blue-200 rounded text-xs focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                        ></textarea>
                        <p className="text-[9px] text-blue-400 mt-1">This message will be included in the Google Calendar invitation sent to the client.</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs  text-gray-700 mb-1.5">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <div className="relative group">
                        <input
                          type="date"
                          name="scheduled_date"
                          value={formData.scheduled_date}
                          onChange={handleInputChange}
                          className="w-full p-2 pl-10 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all cursor-pointer"
                        />
                        <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-red-500 transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs  text-gray-700 mb-1.5">
                        Time <span className="text-red-500">*</span>
                      </label>
                      <div className="relative group">
                        <input
                          type="time"
                          name="scheduled_time"
                          value={formData.scheduled_time}
                          onChange={handleInputChange}
                          className="w-full p-2 pl-10 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all cursor-pointer"
                        />
                        <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-red-500 transition-colors" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs  text-gray-700 mb-1.5">
                        Reminder Before
                      </label>
                      <div className="relative">
                        <select
                          name="reminder_before"
                          value={formData.reminder_before}
                          onChange={handleInputChange}
                          className="w-full p-2 bg-white border border-gray-300 rounded text-xs appearance-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all pr-10"
                        >
                          <option value="5 minutes">5 minutes</option>
                          <option value="10 minutes">10 minutes</option>
                          <option value="15 minutes">15 minutes</option>
                          <option value="30 minutes">30 minutes</option>
                          <option value="1 hour">1 hour</option>
                          <option value="1 day">1 day</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs  text-gray-700 mb-1.5">
                        Assigned To
                      </label>
                      <div className="relative">
                        <select
                          name="assigned_to"
                          value={formData.assigned_to}
                          onChange={handleInputChange}
                          className="w-full p-2 bg-white border border-gray-300 rounded text-xs appearance-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all pr-10"
                        >
                          <option value="">Select Assignee</option>
                          {users.map(user => {
                            const name = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : (user.username || user.name || '');
                            return (
                              <option key={user.id} value={user.id}>{name} ({user.role_name || user.role || 'User'})</option>
                            );
                          })}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs  text-gray-700 mb-1.5">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Enter follow-up details..."
                      className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs  text-gray-700 flex items-center gap-1  tracking-wider">
                        <Paperclip size={12} className="text-red-500" />
                        Documents
                      </label>
                      <div
                        onClick={() => document.getElementById('followup-doc-upload').click()}
                        className="border border-dashed border-gray-200 rounded p-3 text-center cursor-pointer hover:border-red-400 transition-colors bg-gray-50/50"
                      >
                        <span className="text-[9px] text-gray-500">Click to Upload</span>
                        <input
                          id="followup-doc-upload"
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files);
                            setFormData(prev => ({ ...prev, documents: [...(prev.documents || []), ...files] }));
                          }}
                        />
                      </div>
                      {existingFiles.filter(file => !['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP'].includes(file.file_type?.toUpperCase())).length > 0 && (
                        <div className="mt-2 space-y-1 text-left">
                          <p className="text-[9px] font-semibold text-gray-500">Existing Docs:</p>
                          <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {existingFiles.filter(file => !['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP'].includes(file.file_type?.toUpperCase())).map(file => (
                              <a
                                key={file.id}
                                href={`${process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : API_BASE_URL.replace(/\/api\/?$/, '') + ''}${file.file_path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 p-1 bg-gray-50 rounded hover:bg-gray-100 transition text-[9px] text-blue-600 hover:text-blue-800 border border-gray-100 truncate"
                                title={file.name}
                              >
                                <Paperclip size={10} className="text-gray-400" />
                                <span className="truncate flex-1">{file.name}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs  text-gray-700 flex items-center gap-1  tracking-wider">
                        <ImageIcon size={12} className="text-red-500" />
                        Images
                      </label>
                      <div
                        onClick={() => document.getElementById('followup-img-upload').click()}
                        className="border border-dashed border-gray-200 rounded p-3 text-center cursor-pointer hover:border-red-400 transition-colors bg-gray-50/50"
                      >
                        <span className="text-[9px] text-gray-500">Add Images</span>
                        <input
                          id="followup-img-upload"
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files);
                            setFormData(prev => ({ ...prev, images: [...(prev.images || []), ...files] }));
                          }}
                        />
                      </div>
                      {existingFiles.filter(file => ['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP'].includes(file.file_type?.toUpperCase())).length > 0 && (
                        <div className="mt-2 space-y-1 text-left">
                          <p className="text-[9px] font-semibold text-gray-500">Existing Images:</p>
                          <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {existingFiles.filter(file => ['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP'].includes(file.file_type?.toUpperCase())).map(file => (
                              <a
                                key={file.id}
                                href={`${process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : API_BASE_URL.replace(/\/api\/?$/, '') + ''}${file.file_path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 p-1 bg-gray-50 rounded hover:bg-gray-100 transition text-[9px] text-blue-600 hover:text-blue-800 border border-gray-100 truncate"
                                title={file.name}
                              >
                                <ImageIcon size={10} className="text-gray-400" />
                                <span className="truncate flex-1">{file.name}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Additional Options (Collapsible) */}
            <div className="border-b border-[#EAECF0]">
              <button
                type="button"
                onClick={() => togglePanel('recurrence')}
                className="w-full text-left p-2 flex items-center justify-between hover:bg-gray-50/50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center rounded bg-green-500 text-white  shadow-green-100">
                    <Repeat size={15} />
                  </div>
                  <span className="text-gray-900text-md ">Recurrence & Completion</span>
                </div>
                <ChevronDown
                  size={15}
                  className={`text-gray-400 transition-transform duration-200 ${openPanels.recurrence ? 'rotate-180' : ''}`}
                />
              </button>

              {openPanels.recurrence && (
                <div className="p-2 space-y-2 bg-white animate-in fade-in duration-200">
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded border border-gray-100">
                    <input
                      type="checkbox"
                      id="is_recurring"
                      name="is_recurring"
                      checked={formData.is_recurring}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <label htmlFor="is_recurring" className="text-xs text-gray-700  cursor-pointer">Recurring Follow-up</label>
                  </div>

                  {formData.is_recurring && (
                    <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-200">
                      <div>
                        <label className="block text-xs  text-gray-700 mb-1.5">Frequency</label>
                        <select
                          name="recurrence_frequency"
                          value={formData.recurrence_frequency}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                        >
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Monthly">Monthly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs  text-gray-700 mb-1.5">End Date</label>
                        <input
                          type="date"
                          name="recurrence_end_date"
                          value={formData.recurrence_end_date}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className=" border-t border-gray-100">
                    <label className="block text-xs  text-gray-700 mb-1.5">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Completed">Completed</option>
                      <option value="Pending">Pending</option>
                      <option value="Overdue">Overdue</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  {formData.status === 'Completed' && (
                    <div className=" border-t border-gray-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                      <div>
                        <label className="block text-xs  text-gray-700 mb-1.5">
                          Follow-up Outcome <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="outcome"
                          value={formData.outcome}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                          required={formData.status === 'Completed'}
                        >
                          <option value="">Select Outcome</option>
                          <option value="Interested">Interested</option>
                          <option value="Asking for Quotation">Asking for Quotation</option>
                          <option value="Revise Quotation">Revise Quotation</option>
                          <option value="Quotation Accepted">Quotation Accepted</option>
                          <option value="Quotation Accepted & Converted to Deal">Quotation Accepted & Converted to Deal</option>
                          <option value="Quotation Declined">Quotation Declined</option>
                          <option value="Not Interested">Not Interested</option>
                          <option value="Call Back Later">Call Back Later</option>
                          <option value="Wrong Number">Wrong Number</option>
                          <option value="Meeting Scheduled">Meeting Scheduled</option>
                          <option value="Converted to Deal">Converted to Deal</option>
                          <option value="Follow-up Required">Follow-up Required</option>
                          <option value="No Answer">No Answer</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs  text-gray-700 mb-1.5">
                          Remarks / Notes
                        </label>
                        <textarea
                          name="remarks"
                          value={formData.remarks}
                          onChange={handleInputChange}
                          rows={2}
                          placeholder="Enter any concluding remarks..."
                          className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all resize-none"
                        />
                      </div>

                      <h4 className="text-xs  text-gray-900    border-t border-gray-50">Next Follow-Up Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs  text-gray-700 mb-1.5">Next Date</label>
                          <input
                            type="date"
                            name="next_followup_date"
                            value={formData.next_followup_date}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs  text-gray-700 mb-1.5">Next Time</label>
                          <input
                            type="time"
                            name="next_followup_time"
                            value={formData.next_followup_time}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs  text-gray-700 mb-1.5">Next Type</label>
                        <select
                          name="next_followup_type"
                          value={formData.next_followup_type}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                        >
                          <option value="Call">Phone Call</option>
                          <option value="WhatsApp Call">WhatsApp Call</option>
                          <option value="WhatsApp">WhatsApp Message</option>
                          <option value="SMS">SMS</option>
                          <option value="Email">Email</option>
                          <option value="Google Meet">Google Meet</option>
                          <option value="Zoom Meeting">Zoom Meeting</option>
                          <option value="Internal Video Call">Internal Video Call</option>
                          <option value="In-Person Meeting">In-Person Meeting</option>
                          <option value="Demo">Demo</option>
                          <option value="Proposal Discussion">Proposal Discussion</option>
                          <option value="Payment Reminder">Payment Reminder</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-[#EAECF0] flex items-center justify-end gap-3 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-2.5 border border-gray-300 rounded text-xs  text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-red-600 text-white rounded text-xs  hover:bg-red-700 transition-all shadow-md shadow-red-100 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                initialData ? 'Update Follow-Up' : 'Add Follow-Up'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFollowUpModal;
