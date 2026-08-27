import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Trash2, FileText, User, Building2, Zap,
  Phone, MessageSquare, Calendar, CheckCircle, XCircle, Clock,
  Plus, History, Star, MoreVertical, Lock, Shield, Mail, FileUp,
  ChevronDown, Search, Download, RotateCcw, Maximize, Printer,
  Layout, Target, Layers, Briefcase, MapPin, List, Check,
  FileSpreadsheet, DownloadCloud, Trash, Settings, X, Paperclip,
  Image as ImageIcon, Share2, Filter, Info, ThumbsUp, ChevronLeft, ChevronRight, ExternalLink, Users, Video as VideoIcon, CreditCard, DollarSign, Play
} from 'lucide-react';
import { leadsAPI, companiesAPI, activitiesAPI, estimationsAPI, notesAPI, filesAPI, dealsAPI, followupsAPI } from '../../services/api';
import ConvertLeadModal from './ConvertLeadModal';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const LeadDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isFromDeals = location.pathname.startsWith('/deals');
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertType, setConvertType] = useState('contact');
  const [companies, setCompanies] = useState([]);
  const [editData, setEditData] = useState({});
  const [followups, setFollowups] = useState([]);
  const [notes, setNotes] = useState([]);
  const [files, setFiles] = useState([]);
  const [estimations, setEstimations] = useState([]);
  const [isLoggingFollowup, setIsLoggingFollowup] = useState(false);
  const [activeTab, setActiveTab] = useState('Activities');
  const [newFollowup, setNewFollowup] = useState({
    type: 'Call',
    notes: '',
    next_followup_date: '',
    next_followup_time: ''
  });

  // New states for modals and dropdowns
  const [isSortByOpen, setIsSortByOpen] = useState(false);
  const [sortBy, setSortBy] = useState('Newest');
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [isNoteMenuOpen, setIsNoteMenuOpen] = useState(null);
  const [isAddCallLogModalOpen, setIsAddCallLogModalOpen] = useState(false);
  const [isCallStatusMenuOpen, setIsCallStatusMenuOpen] = useState(null);
  const [isAddFileModalOpen, setIsAddFileModalOpen] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(null);
  const [isConnectAccountModalOpen, setIsConnectAccountModalOpen] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date(2026, 0, 1)); // Default to Jan 2026 as per screenshot
  const [fileModalTab, setFileModalTab] = useState('Basic Info');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [dealContacts, setDealContacts] = useState([]);

  const fetchDealContacts = async (targetDealId) => {
    const isVirtual = !isNaN(parseInt(targetDealId)) && parseInt(targetDealId) > 1000000;
    if (!targetDealId || isVirtual) return;
    try {
      const response = await dealsAPI.getContacts(targetDealId);
      if (response.success && Array.isArray(response.data)) {
        setDealContacts(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch deal contacts:', err);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteForm.title || !noteForm.note) return;

    try {
      await notesAPI.create({
        title: noteForm.title,
        description: noteForm.note,
        lead_id: lead.lead_id || (isFromDeals ? null : id),
        deal_id: lead.deal_id && !lead.is_virtual_deal ? lead.deal_id : null,
        company_id: lead.company_id || null,
        priority: 'Medium',
        is_important: false
      });
      showSuccessToast('Note added successfully');
      setNoteForm({ title: '', note: '', attachments: [] });
      setIsAddNoteModalOpen(false);
      fetchNotes(lead.lead_id, lead.deal_id, lead.company_id);
      fetchFollowups(lead.lead_id, lead.deal_id, lead.company_id); // Update unified feed
    } catch (err) {
      showErrorToast('Failed to add note: ' + err.message);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await notesAPI.delete(noteId);
      showSuccessToast('Note deleted successfully');
      fetchNotes(lead.lead_id, lead.deal_id, lead.company_id);
      fetchFollowups(lead.lead_id, lead.deal_id, lead.company_id);
    } catch (err) {
      showErrorToast('Failed to delete note: ' + err.message);
    }
  };

  const handleAddCallLog = async (e) => {
    e.preventDefault();
    if (!callLogForm.note) return;

    try {
      await activitiesAPI.create({
        title: `Call Log: ${callLogForm.status}`,
        description: callLogForm.note,
        activity_type: 'Call',
        lead_id: lead.lead_id || (isFromDeals ? null : id),
        deal_id: lead.deal_id && !lead.is_virtual_deal ? lead.deal_id : null,
        company_id: lead.company_id || null,
        status: 'Completed',
        priority: 'Medium'
      });
      showSuccessToast('Call log added successfully');
      setCallLogForm({ status: 'Busy', followUpDate: '23 Jan, 2026', note: '', createFollowupTask: false });
      setIsAddCallLogModalOpen(false);
      fetchFollowups(lead.lead_id, lead.deal_id, lead.company_id);
    } catch (err) {
      showErrorToast('Failed to add call log: ' + err.message);
    }
  };

  const handleCreateFile = async (e) => {
    e.preventDefault();
    if (!fileForm.title) return;

    try {
      await filesAPI.create({
        name: fileForm.title,
        file_type: fileForm.documentType || 'Document',
        lead_id: lead.lead_id || (isFromDeals ? null : id),
        deal_id: fileForm.deal || (lead.deal_id && !lead.is_virtual_deal ? lead.deal_id : null),
        company_id: lead.company_id || null,
        owner_id: 1, // Default to system user
        status: 'Draft'
      });
      showSuccessToast('File created successfully');
      setFileForm({
        deal: '', documentType: '', owner: '', title: '',
        signature: 'No Signature', recipients: [{ name: '', email: '' }],
        content: '', subject: '', message: 'Your document is ready'
      });
      setIsAddFileModalOpen(false);
      fetchFiles(lead.lead_id, lead.deal_id, lead.company_id);
    } catch (err) {
      showErrorToast('Failed to create file: ' + err.message);
    }
  };

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const generateCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    // First day of the month
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    // Total days in the current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Total days in the previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true });
    }

    // Next month days to fill the grid (up to 42 days for a 6-row grid)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, isCurrentMonth: false });
    }

    return days;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Form states
  const [noteForm, setNoteForm] = useState({ title: '', note: '', attachments: [] });
  const [callLogForm, setCallLogForm] = useState({ status: 'Busy', followUpDate: '23 Jan, 2026', note: '', createFollowupTask: false });
  const [fileForm, setFileForm] = useState({
    deal: '',
    documentType: '',
    owner: '',
    title: '',
    signature: 'No Signature',
    recipients: [{ name: '', email: '' }],
    content: '',
    subject: '',
    message: 'Your document is ready'
  });
  const [accountForm, setAccountForm] = useState({ type: 'Gmail', syncFrom: 'Now' });

  const leadStages = ['Not Contacted', 'Contacted', 'Qualified', 'Lost'];
  const pipelineStages = ['Converted Lead', 'Quotation', 'Won'];

  useEffect(() => {
    fetchLeadDetails();
    fetchCompanies();
  }, [id, sortBy]);

  useEffect(() => {
    if (lead) {
      fetchFollowups(lead.lead_id, lead.deal_id, lead.company_id);
      fetchNotes(lead.lead_id, lead.deal_id, lead.company_id);
      fetchFiles(lead.lead_id, lead.deal_id, lead.company_id);
    }
  }, [lead?.id, lead?.deal_id, lead?.company_id, sortBy]);

  const fetchFiles = async (targetLeadId, targetDealId, targetCompanyId) => {
    try {
      let allFiles = [];

      // Fetch lead files
      const effectiveLeadId = targetLeadId !== undefined ? targetLeadId : (lead?.lead_id || (isFromDeals ? null : id));
      if (effectiveLeadId) {
        try {
          const data = await filesAPI.getAll({ lead_id: effectiveLeadId });
          if (Array.isArray(data)) allFiles = [...data];
        } catch (e) { console.error('Error fetching lead files:', e); }
      }

      // Fetch deal files
      const effectiveDealId = targetDealId !== undefined ? targetDealId : (lead?.deal_id || (isFromDeals ? id : null));
      if (effectiveDealId) {
        try {
          const dealFiles = await filesAPI.getAll({ deal_id: effectiveDealId });
          if (Array.isArray(dealFiles)) {
            const existingIds = new Set(allFiles.map(f => f.id));
            dealFiles.forEach(f => {
              if (!existingIds.has(f.id)) allFiles.push(f);
            });
          }
        } catch (e) { console.error('Error fetching deal files:', e); }
      }

      // Fetch company files
      const effectiveCompanyId = targetCompanyId !== undefined ? targetCompanyId : lead?.company_id;
      if (effectiveCompanyId) {
        try {
          const companyFiles = await filesAPI.getAll({ company_id: effectiveCompanyId });
          if (Array.isArray(companyFiles)) {
            const existingIds = new Set(allFiles.map(f => f.id));
            companyFiles.forEach(f => {
              if (!existingIds.has(f.id)) allFiles.push(f);
            });
          }
        } catch (e) { console.error('Error fetching company files:', e); }
      }

      setFiles(allFiles);
    } catch (err) {
      console.error('Failed to fetch files:', err);
    }
  };

  const fetchEstimations = async (targetLeadId, targetDealId) => {
    try {
      let allEstimations = [];

      const effectiveLeadId = targetLeadId !== undefined ? targetLeadId : (lead?.lead_id || (isFromDeals ? null : id));
      if (effectiveLeadId) {
        try {
          const leadEstimations = await estimationsAPI.getAll({ lead_id: effectiveLeadId });
          if (Array.isArray(leadEstimations)) allEstimations = [...leadEstimations];
        } catch (e) { console.error('Error fetching lead estimations:', e); }
      }

      const effectiveDealId = targetDealId !== undefined ? targetDealId : (lead?.deal_id || (isFromDeals ? id : null));
      if (effectiveDealId) {
        try {
          const dealEstimations = await estimationsAPI.getAll({ deal_id: effectiveDealId });
          if (Array.isArray(dealEstimations)) {
            const existingIds = new Set(allEstimations.map(e => e.id));
            dealEstimations.forEach(e => {
              if (!existingIds.has(e.id)) allEstimations.push(e);
            });
          }
        } catch (e) { console.error('Error fetching deal estimations:', e); }
      }

      setEstimations(allEstimations);
    } catch (err) {
      console.error('Failed to fetch estimations:', err);
    }
  };

  const fetchNotes = async (targetLeadId, targetDealId, targetCompanyId) => {
    try {
      let allNotes = [];

      const effectiveLeadId = targetLeadId !== undefined ? targetLeadId : (lead?.lead_id || (isFromDeals ? null : id));
      if (effectiveLeadId) {
        try {
          const data = await notesAPI.getAll({ lead_id: effectiveLeadId });
          if (Array.isArray(data)) allNotes = [...data];
        } catch (e) { console.error('Error fetching lead notes:', e); }
      }

      const effectiveDealId = targetDealId !== undefined ? targetDealId : (lead?.deal_id || (isFromDeals ? id : null));
      if (effectiveDealId) {
        try {
          const dealNotes = await notesAPI.getAll({ deal_id: effectiveDealId });
          if (Array.isArray(dealNotes)) {
            const existingIds = new Set(allNotes.map(n => n.id));
            dealNotes.forEach(n => {
              if (!existingIds.has(n.id)) allNotes.push(n);
            });
          }
        } catch (e) { console.error('Error fetching deal notes:', e); }
      }

      const effectiveCompanyId = targetCompanyId !== undefined ? targetCompanyId : lead?.company_id;
      if (effectiveCompanyId) {
        try {
          const companyNotes = await notesAPI.getAll({ company_id: effectiveCompanyId });
          if (Array.isArray(companyNotes)) {
            const existingIds = new Set(allNotes.map(n => n.id));
            companyNotes.forEach(n => {
              if (!existingIds.has(n.id)) allNotes.push(n);
            });
          }
        } catch (e) { console.error('Error fetching company notes:', e); }
      }

      setNotes(allNotes);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  };

  const fetchFollowups = async (targetLeadId, targetDealId, targetCompanyId) => {
    try {
      let allActivities = [];
      const seenKeys = new Set();

      const addUnique = (activities) => {
        if (!Array.isArray(activities)) return;
        activities.forEach(a => {
          const key = a.id ? String(a.id) : `${a.title || a.type}-${a.created_at || a.scheduled_date || a.date}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            allActivities.push(a);
          }
        });
      };

      const effectiveLeadId = targetLeadId !== undefined ? targetLeadId : (lead?.lead_id || (isFromDeals ? null : id));
      if (effectiveLeadId) {
        try {
          const data = await activitiesAPI.getUnifiedFeed({ lead_id: effectiveLeadId });
          addUnique(data);
          const followupsData = await followupsAPI.getByRelated('Lead', effectiveLeadId);
          addUnique(followupsData);
        } catch (e) { console.error('Error fetching lead activities:', e); }
      }

      const effectiveDealId = targetDealId !== undefined ? targetDealId : (lead?.deal_id || (isFromDeals ? id : null));
      if (effectiveDealId) {
        try {
          const dealActivities = await activitiesAPI.getUnifiedFeed({ deal_id: effectiveDealId });
          addUnique(dealActivities);
          const dealFollowups = await followupsAPI.getByRelated('Deal', effectiveDealId);
          addUnique(dealFollowups);
        } catch (e) { console.error('Error fetching deal activities:', e); }
      }

      const effectiveCompanyId = targetCompanyId !== undefined ? targetCompanyId : lead?.company_id;
      if (effectiveCompanyId) {
        try {
          const companyActivities = await activitiesAPI.getUnifiedFeed({ company_id: effectiveCompanyId });
          addUnique(companyActivities);
          const companyFollowups = await followupsAPI.getByRelated('Company', effectiveCompanyId);
          addUnique(companyFollowups);
        } catch (e) { console.error('Error fetching company activities:', e); }
      }

      // Add estimations to activities feed
      if (Array.isArray(estimations) && estimations.length > 0) {
        estimations.forEach(est => {
          addUnique([{
            id: `est-${est.id}`,
            title: `Quotation: ${est.estimation_number || est.quotation_number}`,
            description: est.description || `Amount: ${est.currency || 'INR'} ${est.amount || est.total}`,
            type: 'Proposal',
            activity_source: 'Quotation',
            created_at: est.created_at || est.estimate_date || est.quotation_date,
            status: est.status
          }]);
        });
      }

      // Sort by newest first
      allActivities.sort((a, b) => {
        const dateA = new Date(a.created_at || a.scheduled_date || a.date || 0);
        const dateB = new Date(b.created_at || b.scheduled_date || b.date || 0);
        return sortBy === 'Newest' ? dateB - dateA : dateA - dateB;
      });
      setFollowups(allActivities);
    } catch (err) {
      console.error('Failed to fetch followups:', err);
    }
  };

  const fetchLeadDetails = async () => {
    try {
      setLoading(true);
      let leadData;

      // Virtual ID logic: IDs > 1000000 are actually leads (virtual deals)
      const numericId = parseInt(id);
      const isVirtualDeal = !isNaN(numericId) && numericId > 1000000;
      const realLeadId = isVirtualDeal ? numericId - 1000000 : null;

      try {
        if (isVirtualDeal) {
          // If it's a virtual deal, fetch as lead first
          leadData = await leadsAPI.getById(realLeadId);
          if (leadData) {
            leadData.deal_id = numericId; // Keep the virtual deal ID
            leadData.lead_id = realLeadId; // Map to the real lead ID
            leadData.is_virtual_deal = true;
            if (leadData.owner_first_name) {
              leadData.owner_name = `${leadData.owner_first_name} ${leadData.owner_last_name || ''}`.trim();
            }
          }
        } else {
          leadData = await leadsAPI.getById(id);
          if (leadData && leadData.owner_first_name) {
            leadData.owner_name = `${leadData.owner_first_name} ${leadData.owner_last_name || ''}`.trim();
          }
        }
      } catch (err) {
        // If lead not found, maybe it's a deal ID?
        if (err.message.includes('404')) {
          const deals = await dealsAPI.getAll();
          const deal = deals.find(d => String(d.id) === String(id));
          if (deal && deal.lead_id && String(deal.lead_id) !== String(id) && !isFromDeals) {
            // Redirect to the actual lead ONLY if not already in deals context
            navigate(`/leads/lead/${deal.lead_id}`, { replace: true });
            return;
          }

          // If no lead_id, but we have a deal, maybe create a pseudo-lead?
          if (deal) {
            leadData = {
              id: deal.id,
              lead_id: deal.lead_id || null,
              deal_id: deal.id,
              status: 'Converted to Deal',
              name: deal.deal_name || deal.company_name,
              value: deal.deal_value || deal.value || 0,
              email: deal.contact_email || deal.email,
              phone: deal.contact_phone || deal.phone,
              deal_stage: deal.deal_stage || deal.stage || 'Converted Lead',
              created_at: deal.created_at || deal.date,
              currency: deal.currency || '$',
              follow_up_date: deal.follow_up_date,
              source: deal.source || deal.lead_source,
              company: deal.company_name || deal.company,
              location: deal.location,
              owner_id: deal.owner_id || deal.assignee_id,
              owner_name: deal.owner_name || deal.owner,
              assignee_name: deal.assignee_name || (deal.assignee_first_name ? `${deal.assignee_first_name} ${deal.assignee_last_name || ''}`.trim() : null)
            };
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }

      const response = leadData;

      // If the lead is qualified, try to fetch deal info
      if (response.status === 'Qualified' || response.lead_status === 'Qualified' || response.status === 'Converted to Deal') {
        try {
          const deals = await dealsAPI.getAll();
          const deal = deals.find(d => String(d.lead_id) === String(id) || String(d.id) === String(id));
          if (deal) {
            response.lead_id = deal.lead_id || response.lead_id || null;
            response.deal_id = deal.id;
            response.deal_stage = deal.deal_stage || deal.stage || 'Converted Lead';
            response.probability = deal.probability || 80;
            // Merge deal data into lead if lead data is sparse (common with directly created deals)
            if (!response.name) response.name = deal.deal_name || deal.company_name;
            if (!response.value) response.value = deal.deal_value || deal.value || 0;
            if (!response.email) response.email = deal.contact_email || deal.email;
            if (!response.phone) response.phone = deal.contact_phone || deal.phone;
            if (!response.created_at) response.created_at = deal.created_at || deal.date;
            if (!response.follow_up_date) response.follow_up_date = deal.follow_up_date;
            if (!response.source) response.source = deal.source || deal.lead_source;
            if (!response.company) response.company = deal.company_name || deal.company;
            if (!response.company_id) response.company_id = deal.company_id;
            if (!response.location) response.location = deal.location;
            if (!response.owner_id) response.owner_id = deal.owner_id;
            if (!response.owner_name) response.owner_name = deal.owner_name || deal.owner;
            if (deal.assignee_first_name) {
              response.assignee_name = `${deal.assignee_first_name} ${deal.assignee_last_name || ''}`.trim();
            }
          }
        } catch (dealErr) {
          console.error('Failed to fetch deal details:', dealErr);
        }
      }

      setLead(response);
      setEditData(response);

      // Fetch deal-specific data if applicable
      if (response.deal_id) {
        fetchDealContacts(response.deal_id);
      }

      // Proactively fetch related data using resolved IDs
      fetchFollowups(response.lead_id, response.deal_id, response.company_id);
      fetchNotes(response.lead_id, response.deal_id, response.company_id);
      fetchFiles(response.lead_id, response.deal_id, response.company_id);
      fetchEstimations(response.lead_id, response.deal_id);
    } catch (err) {
      setError(err.message || 'Failed to fetch lead');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await companiesAPI.getAll();
      setCompanies(response);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    }
  };

  const handleLogFollowup = async (e) => {
    e.preventDefault();
    if (!newFollowup.notes) return;

    try {
      const scheduledAt = newFollowup.next_followup_date
        ? `${newFollowup.next_followup_date}${newFollowup.next_followup_time ? 'T' + newFollowup.next_followup_time : ''}`
        : null;

      await activitiesAPI.create({
        title: `${newFollowup.type} with ${lead.name || lead.lead_name}`,
        description: newFollowup.notes,
        activity_type: newFollowup.type,
        lead_id: lead.lead_id || (isFromDeals ? null : id),
        deal_id: lead.deal_id && !lead.is_virtual_deal ? lead.deal_id : null,
        company_id: lead.company_id || null,
        scheduled_date: scheduledAt,
        status: scheduledAt ? 'Pending' : 'Completed'
      });

      if (newFollowup.next_followup_date) {
        // Use real lead ID for update if virtual
        const updateId = lead.is_virtual_deal ? lead.lead_id : id;
        await leadsAPI.update(updateId, {
          ...lead,
          follow_up_date: scheduledAt
        });
        setLead(prev => ({ ...prev, follow_up_date: scheduledAt }));
      }

      showSuccessToast('Follow-up logged successfully');
      setNewFollowup({
        type: 'Call',
        notes: '',
        next_followup_date: '',
        next_followup_time: ''
      });
      setIsLoggingFollowup(false);
      fetchFollowups(lead.lead_id, lead.deal_id, lead.company_id);
    } catch (err) {
      showErrorToast('Failed to log follow-up: ' + err.message);
    }
  };

  const handleQualify = async () => {
    if (!window.confirm('Are you sure you want to qualify this lead? This will automatically create a quotation.')) return;

    try {
      const updateId = lead.is_virtual_deal ? lead.lead_id : id;
      await leadsAPI.update(updateId, { ...lead, lead_status: 'Qualified', status: 'Qualified' });
      setLead(prev => ({ ...prev, lead_status: 'Qualified', status: 'Qualified' }));

      await estimationsAPI.create({
        client_id: lead.company_id || null,
        client_name: lead.name || lead.lead_name,
        amount: lead.value || 0,
        currency: lead.currency || 'USD',
        status: 'Draft',
        description: `Quotation for qualified lead: ${lead.name || lead.lead_name}`,
        estimate_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      showSuccessToast('Lead qualified and quotation created successfully');
      navigate('/quotations');
    } catch (err) {
      showErrorToast('Failed to qualify lead: ' + err.message);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Are you sure you want to reject this lead?')) return;

    try {
      const updateId = lead.is_virtual_deal ? lead.lead_id : id;
      await leadsAPI.update(updateId, { ...lead, lead_status: 'Lost', status: 'Lost' });
      setLead(prev => ({ ...prev, lead_status: 'Lost', status: 'Lost' }));
      showSuccessToast('Lead marked as rejected (Lost)');
    } catch (err) {
      showErrorToast('Failed to reject lead: ' + err.message);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const isPipelineStage = pipelineStages.includes(newStatus);
      const isLeadMode = (lead.status === 'Qualified' || lead.lead_status === 'Qualified' || lead.status === 'Converted to Deal');

      if (isPipelineStage && isLeadMode) {
        // Find the deal for this lead
        const deals = await dealsAPI.getAll();
        const deal = deals.find(d => String(d.lead_id) === String(id) || String(d.id) === String(id));

        if (deal) {
          await dealsAPI.update(deal.id, { ...deal, deal_stage: newStatus, stage: newStatus });
          setLead(prev => ({
            ...prev,
            deal_stage: newStatus,
            stage: newStatus,
            // Ensure lead status remains Qualified/Converted
            status: lead.status === 'Converted to Deal' ? 'Converted to Deal' : 'Qualified',
            lead_status: lead.status === 'Converted to Deal' ? 'Converted to Deal' : 'Qualified'
          }));
          showSuccessToast(`Deal stage updated to ${newStatus}`);
          return;
        }
      }

      // Ensure we don't send a deal stage to the leads API
      const fallbackStatus = lead.status === 'Converted to Deal' ? 'Converted to Deal' : 'Qualified';
      const validLeadStatus = leadStages.includes(newStatus) ? newStatus : (isLeadMode ? fallbackStatus : 'New');

      const updateId = lead.is_virtual_deal ? lead.lead_id : id;
      await leadsAPI.update(updateId, { ...lead, lead_status: validLeadStatus, status: validLeadStatus });
      setLead(prev => ({ ...prev, lead_status: validLeadStatus, status: validLeadStatus }));
      showSuccessToast(`Lead status updated to ${validLeadStatus}`);
    } catch (err) {
      showErrorToast('Failed to update status: ' + err.message);
    }
  };

  const handleUpdatePriority = async (newPriority) => {
    try {
      const updateId = lead.is_virtual_deal ? lead.lead_id : id;
      await leadsAPI.update(updateId, { ...lead, priority: newPriority });
      setLead(prev => ({ ...prev, priority: newPriority }));
      showSuccessToast(`Priority updated to ${newPriority}`);
    } catch (err) {
      showErrorToast('Failed to update priority: ' + err.message);
    }
  };

  const handleEditSave = async () => {
    try {
      // Sanitize editData to ensure lead_status is valid for the leads table
      const sanitizedData = { ...editData };
      if (sanitizedData.lead_status && !leadStages.includes(sanitizedData.lead_status)) {
        sanitizedData.lead_status = (lead.status === 'Qualified' || lead.lead_status === 'Qualified' || lead.status === 'Converted to Deal') ? 'Qualified' : 'New';
      }
      if (sanitizedData.status && !leadStages.includes(sanitizedData.status)) {
        sanitizedData.status = sanitizedData.lead_status;
      }

      const updateId = lead.is_virtual_deal ? lead.lead_id : id;
      await leadsAPI.update(updateId, sanitizedData);
      setLead(sanitizedData);
      setIsEditing(false);
      showSuccessToast('Lead updated successfully');
    } catch (err) {
      showErrorToast('Failed to update lead: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      const deleteId = lead.is_virtual_deal ? lead.lead_id : id;
      await leadsAPI.delete(deleteId);
      showSuccessToast('Lead deleted successfully');
      navigate('/leads');
    } catch (err) {
      showErrorToast('Failed to delete lead: ' + err.message);
    }
  };

  const handleConvert = async (data) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const realLeadId = lead.is_virtual_deal ? lead.lead_id : id;

      if (convertType === 'contact') {
        const response = await fetch(`${apiUrl}/leads/${realLeadId}/convert-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Conversion failed');
        }

        showSuccessToast('Lead converted successfully');
      } else if (convertType === 'company') {
        await leadsAPI.convertToCompany(realLeadId, data);
        showSuccessToast('Lead converted to company successfully');
      } else if (convertType === 'deal') {
        await leadsAPI.convertToDeal(realLeadId, data);
        showSuccessToast('Lead converted to deal successfully');
        navigate('/deals-dashboard');
        return;
      }
      navigate('/leads');
    } catch (err) {
      showErrorToast('Conversion failed: ' + err.message);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-50"><Clock className="animate-spin text-red mr-2" /> Loading...</div>;
  if (error || !lead) return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <button onClick={() => navigate('/leads')} className="inline-flex items-center gap-2 text-red-600 mb-4"><ArrowLeft size={18} /> Back to Leads</button>
      <div className="bg-red-50 border border-red-200 p-4 rounded text-red-700">{error || 'Lead not found'}</div>
    </div>
  );

  const parseArrayData = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return val.split(',').map(v => v.trim()).filter(Boolean);
    return [];
  };

  const getInitials = (name) => {
    if (!name) return 'L';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const formatDateTime = (dateStr, timeStr = null, showSeconds = true) => {
    if (!dateStr) return 'N/A';

    let date;
    if (timeStr && typeof timeStr === 'string' && !dateStr.includes('T') && !dateStr.includes(' ')) {
      // If dateStr is just a date (YYYY-MM-DD) and timeStr is provided
      date = new Date(`${dateStr}T${timeStr}`);
    } else {
      date = new Date(dateStr);
    }

    // Fallback if timeStr is provided separately and not yet in the date object
    if (timeStr && isNaN(date.getTime())) {
      date = new Date(dateStr); // try again
    }

    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    if (showSeconds) timeOptions.second = '2-digit';

    const formattedTime = date.toLocaleTimeString('en-GB', timeOptions);

    // If the date object's time is 00:00:00 and we have a timeStr, use timeStr
    let finalTime = formattedTime;
    if (timeStr && (formattedTime === '00:00:00' || formattedTime.includes('12:00:00 AM'))) {
      finalTime = timeStr;
    }

    const dateStrFormatted = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    return `${dateStrFormatted}, ${finalTime}`;
  };

  const groupFollowupsByDate = (items) => {
    const groups = {};
    items.forEach(item => {
      const dateStr = item.scheduled_date || item.created_at || new Date().toISOString();
      const date = new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  };

  const groupFollowupsByHierarchy = (items) => {
    const groups = {};
    const isLeadQualified = lead?.status === 'Qualified' || lead?.lead_status === 'Qualified' || lead?.status === 'Converted to Deal';

    // Sort items by date descending (Latest status on top)
    const sortedItems = [...items].sort((a, b) => {
      const dateA = new Date(a.created_at || a.scheduled_date || a.date || 0);
      const dateB = new Date(b.created_at || b.scheduled_date || b.date || 0);
      return dateB - dateA;
    });

    // Sort estimations to identify parents and children
    const sortedEstimations = [...estimations].sort((a, b) => {
      const dateA = new Date(a.created_at || a.estimate_date || 0);
      const dateB = new Date(b.created_at || b.estimate_date || 0);
      return dateA - dateB; // Oldest first for versioning logic
    });

    // Add estimations as their own hierarchy nodes
    if (Array.isArray(sortedEstimations) && sortedEstimations.length > 0) {
      sortedEstimations.forEach((est, idx) => {
        const versionNum = est.version || (idx + 1);
        const estKey = `Quotation:${est.id}`;

        // If it has a parent, it's a revision
        const isRevision = est.parent_id || versionNum > 1 || est.status === 'Revised';

        groups[estKey] = {
          type: isRevision ? 'Revised Quotation' : 'Quotation',
          name: `${isRevision ? 'Revised Quotation' : 'Quotation'}: ${est.estimation_number || est.id}`,
          items: [
            {
              type: 'Proposal',
              title: `Quotation Version ${versionNum} (${est.status || 'Draft'})`,
              description: est.description || `Amount: ${est.currency || 'INR'}${est.amount}`,
              created_at: est.created_at || est.estimate_date,
              status: est.status,
              deal_id: est.deal_id,
              lead_id: est.lead_id
            }
          ]
        };
      });
    }

    sortedItems.forEach(item => {
      let entityKey = 'Other';
      let entityType = 'Other';
      let entityName = 'General Activities';

      // Grouping hierarchy: Deal -> Project -> Task -> Lead -> Company
      if (item.deal_id && isLeadQualified) {
        entityKey = `Deal:${item.deal_id}`;
        entityType = 'Deal';
        entityName = `Deal: ${item.deal_name || 'Deal'}`;
      } else if (item.company_id) {
        entityKey = `Company:${item.company_id}`;
        entityType = 'Company';
        entityName = `Company: ${item.company_name || lead?.company || 'Company'}`;
      } else if (item.lead_id || (item.deal_id && !isLeadQualified)) {
        entityKey = `Lead:${item.lead_id || lead?.id}`;
        entityType = 'Lead';
        entityName = `Lead: ${item.lead_name || lead?.name || lead?.lead_name || 'Lead'}`;
      } else if (item.project_id) {
        entityKey = `Project:${item.project_id}`;
        entityType = 'Project';
        entityName = `Project: ${item.project_name || 'Project'}`;
      } else if (item.task_id) {
        entityKey = `Task:${item.task_id}`;
        entityType = 'Task';
        entityName = item.task_name || 'Internal Task';
      }

      if (!groups[entityKey]) {
        groups[entityKey] = {
          type: entityType,
          name: entityName,
          items: []
        };
      }
      groups[entityKey].items.push(item);
    });

    // Sort groups by the latest activity date in each group
    return Object.values(groups).sort((a, b) => {
      const maxA = Math.max(...a.items.map(i => new Date(i.created_at || i.scheduled_date || i.date || 0).getTime()));
      const maxB = Math.max(...b.items.map(i => new Date(i.created_at || i.scheduled_date || i.date || 0).getTime()));

      if (maxA !== maxB) {
        return sortBy === 'Newest' ? maxB - maxA : maxA - maxB;
      }

      // Secondary sort by type priority
      const typeOrder = {
        'Deal': 1,
        'Quotation': 2,
        'Revised Quotation': 3,
        'Project': 4,
        'Task': 5,
        'Lead': 6,
        'Company': 7,
        'Other': 8
      };
      return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
    });
  };

  const getIcon = (item) => {
    switch (item.activity_source) {
      case 'Note': return <FileText size={15} />;
      case 'Activity':
        if (item.type === 'Meeting') return <Calendar size={15} />;
        if (item.type === 'Call') return <Phone size={15} />;
        return <CheckCircle size={15} />;
      case 'Lead': return <Star size={15} />;
      default: return <Clock size={15} />;
    }
  };

  const getColor = (item) => {
    switch (item.activity_source) {
      case 'Note': return 'bg-red-500';
      case 'Activity':
        if (item.type === 'Meeting') return 'bg-blue-500';
        if (item.type === 'Call') return 'bg-teal-500';
        return 'bg-green-500';
      case 'Lead': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeBadgeStyle = (type) => {
    switch (type) {
      case 'Call': return ' text-blue-600 border-blue-100';
      case 'Meeting':
      case 'Google Meet': return ' text-green-600 border-green-100';
      case 'Proposal':
      case 'Proposal Discussion': return ' text-purple-600 border-purple-100';
      case 'Deal Negotiation': return ' text-orange-600 border-orange-100';
      case 'Payment':
      case 'Payment Reminder': return ' text-red-600 border-red-100';
      case 'Internal': return ' text-gray-600 border-gray-100';
      case 'Team': return ' text-teal-600 border-teal-100';
      default: return ' text-blue-600 border-blue-100';
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Completed': return ' text-green-700';
      case 'Scheduled': return ' text-blue-700';
      case 'Pending': return ' text-orange-700';
      case 'In Progress': return ' text-purple-700';
      default: return ' text-gray-700';
    }
  };

  const latestFollowup = followups.length > 0 ? followups.reduce((latest, current) => {
    const currentDate = new Date(current.scheduled_date || current.created_at || 0);
    const latestDate = new Date(latest.scheduled_date || latest.created_at || 0);
    return currentDate > latestDate ? current : latest;
  }, followups[0]) : null;

  const latestFollowupDate = latestFollowup ? (latestFollowup.scheduled_date || latestFollowup.created_at) : lead.follow_up_date;

  const parseJson = (str) => {
    if (!str) return null;
    if (typeof str !== 'string') return str;
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return str;
    }
  };

  const marketingServices = parseJson(lead.marketing_services) || [];

  return (
    <div className="bg-[#F8F9FA] min-h-screen p-4 font-sans text-[#1F2020]">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span className="text-gray-900 ">{isFromDeals ? 'Deals' : 'Leads'}</span>
            <span className="bg-red-50 text-red px-1.5 py-0.5 rounded text-xs">125</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Home</span>
            <ChevronDown size={10} className="-rotate-90" />
            <span className="text-gray-600">{isFromDeals ? 'Deals' : 'Leads'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 p-2 border border-gray-200 rounded bg-white text-xs hover:bg-gray-50">
            <Download size={14} /> Export <ChevronDown size={14} />
          </button>
          <button onClick={() => window.location.reload()} className="p-1.5 border border-gray-200 rounded bg-white hover:bg-gray-50">
            <RotateCcw size={14} />
          </button>
          <button className="p-1.5 border border-gray-200 rounded bg-white hover:bg-gray-50">
            <Maximize size={14} />
          </button>
        </div>
      </div>

      <button
        onClick={() => navigate(isFromDeals ? '/deals/list' : '/leads')}
        className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft size={14} /> Back to {isFromDeals ? 'Deals' : 'Leads'}
      </button>

      {/* Profile Header Card */}
      <div className="bg-white rounded border border-gray-200 p-2 mb-3 flex  justify-between">
        <div className="flex  gap-4">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-sm  border border-amber-200">
            {getInitials(lead.name || lead.lead_name)}
          </div>
          <div>
            <h1 className="text-md font-[500] text-gray-900 flex items-center gap-2">
              {lead.project_name || 'No Project Name'} <Star size={15} className="fill-yellow-400 text-yellow-400" />
            </h1>
            <div className="text-sm text-gray-600  mt-0.5">
              Client: {lead.name || lead.lead_name}
            </div>
            {lead.notes && (
              <div className="text-xs text-gray-600 ">
                {lead.notes}
              </div>
            )}
            <div className="flex flex-col gap-2 text-xs text-gray-500 mt-2">
              <span className="flex items-center gap-1"><Briefcase size={14} /> {lead.business_type || 'N/A'}</span>
              {(lead.it_services || (Array.isArray(marketingServices) && marketingServices.length > 0)) && (
                <span className="flex items-start gap-1">
                  <List size={14} className="mt-0.5" />
                  <span className="flex flex-wrap gap-1">
                    {lead.it_services && lead.it_services !== 'None' && (
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-sm text-xs border border-blue-100">
                        {lead.it_services === 'Other' ? lead.it_services_other : lead.it_services}
                      </span>
                    )}
                    {Array.isArray(marketingServices) && marketingServices.map((s, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-sm text-xs border border-purple-100">
                        {s}
                      </span>
                    ))}
                  </span>
                </span>
              )}

            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="flex  gap-1 p-2 bg-red-50 text-red-600 rounded text-xs  border border-red-100">
            <Lock size={14} /> Private
          </span>
          <div className="relative">
            <button
              onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
              className="flex items-center gap-1 p-2 bg-green-600 text-white rounded text-xs  hover:bg-green-700 transition-colors"
            >
              <ThumbsUp size={14} /> {(lead.status === 'Qualified' || lead.status === 'Converted to Deal') ? lead.status : (lead.status || 'New')} <ChevronDown size={14} className={`transition-transform ${isStatusMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isStatusMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-gray-100 rounded shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  className="w-full text-left p-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors "
                  onClick={() => {
                    setConvertType('deal');
                    setEditData(lead);
                    setIsConvertModalOpen(true);
                    setIsStatusMenuOpen(false);
                  }}
                >
                  Qualified
                </button>
                <button
                  className="w-full text-left p-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors "
                  onClick={() => {
                    handleStatusChange('Contacted');
                    setIsStatusMenuOpen(false);
                  }}
                >
                  Contacted
                </button>
                <button
                  className="w-full text-left p-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors "
                  onClick={() => {
                    handleStatusChange('Lost');
                    setIsStatusMenuOpen(false);
                  }}
                >
                  Lost
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {/* Left Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <div className="bg-white rounded border border-gray-200 overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <h3 className="text-sm  text-gray-900">{(lead.status === 'Qualified' || lead.status === 'Converted to Deal') ? 'Deal Information' : 'Lead Information'}</h3>
            </div>
            <div className="p-4 space-y-2">
              {[
                { label: 'Date Created', value: lead.created_at ? new Date(lead.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A' },
                ...(lead.status === 'Qualified' || lead.status === 'Converted to Deal' ? [{ label: 'Probability - Win', value: `${lead.probability || 80}%` }] : []),
                { label: 'Deal Value', value: `${lead.currency || '$'}${lead.value ? lead.value.toLocaleString() : '0'}` },
                { label: 'Follow Up', value: latestFollowupDate ? new Date(latestFollowupDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A' },
                { label: 'Project Name', value: lead.project_name || 'N/A' },
                { label: 'Source', value: lead.source || lead.lead_source || 'N/A' },
                ...((lead.source === 'Referral' || lead.lead_source === 'Referral') ? [
                  { label: 'Referral Name', value: lead.referral_name || 'N/A' },
                  { label: 'Referral Contact', value: lead.referral_contact || 'N/A' }
                ] : [])
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="text-gray-900 ">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-sm  text-gray-900 mb-4">Owner</h3>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs  text-blue-600 overflow-hidden">
                <img src={`https://i.pravatar.cc/100?u=${lead.assignee_id || lead.owner_id || 1}`} alt="" className="w-full h-full object-cover" />
              </div>
              <span className="text-xs  text-gray-700">{lead.assignee_name || lead.owner_name || 'Steve Vaughan'}</span>
            </div>
          </div>

          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-sm  text-gray-900 mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {parseArrayData(lead.tags).length > 0 ? (
                parseArrayData(lead.tags).map((tag, idx) => (
                  <span key={idx} className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs  border border-green-100 ">{tag}</span>
                ))
              ) : (
                <>
                  <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs  border border-green-100 ">Collab</span>
                  <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded text-xs  border border-amber-100 ">Vip</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-sm  text-gray-900 mb-2">Priority</h3>
            <div className="relative">
              <select
                value={lead.priority || 'Medium'}
                onChange={(e) => handleUpdatePriority(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs  focus:ring-1 focus:ring-red-500 outline-none appearance-none"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-sm  text-gray-900 mb-4">Projects</h3>
            <div className="flex flex-wrap gap-2">
              {lead.project_name || parseArrayData(lead.projects).length > 0 ? (
                <>
                  {lead.project_name && (
                    <span className="px-2.5 py-1 bg-blue-50 border border-blue-100 rounded text-xs text-blue-600 ">{lead.project_name}</span>
                  )}
                  {parseArrayData(lead.projects).map((project, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-gray-50 border border-gray-100 rounded text-xs text-gray-600">{project.name || project}</span>
                  ))}
                </>
              ) : (
                <span className="text-xs text-gray-400 italic">No projects linked</span>
              )}
            </div>
          </div>

          <div className="bg-white rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm  text-gray-900">Contacts</h3>
              <button
                onClick={() => setIsAddContactModalOpen(true)}
                className="text-red text-xs  flex items-center gap-1 hover:underline"
              >
                <Plus size={12} /> Add New
              </button>
            </div>
            <div className="space-y-4">
              {dealContacts.length > 0 ? (
                dealContacts.map((contact, idx) => (
                  <div key={idx} className={`flex items-center gap-3 ${idx > 0 ? 'pt-4 border-t border-gray-50' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                      {contact.profile_image ? (
                        <img src={contact.profile_image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-500">{contact.first_name?.[0]}{contact.last_name?.[0]}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs  text-gray-900">{contact.first_name} {contact.last_name}</p>
                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>{contact.job_title || 'Contact'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs text-gray-400">No linked contacts found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline Status */}
        <div className="col-span-12 lg:col-span-8 space-y-3">
          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-sm text-gray-900 mb-6">Pipeline Status</h3>

            <div className="flex flex-wrap items-center gap-y-3">
              {/* Unified Pipeline Stages */}
              {[...leadStages.filter(s => s !== 'Lost' || lead.status === 'Lost' || lead.lead_status === 'Lost'),
              ...((lead.status === 'Qualified' || lead.status === 'Converted to Deal' || lead.lead_status === 'Qualified') ? pipelineStages : [])
              ].map((stage, idx) => {
                const isLeadStage = leadStages.includes(stage);
                const isQualified = lead.status === 'Qualified' || lead.lead_status === 'Qualified' || lead.status === 'Converted to Deal';

                let isActive = false;
                let isPast = false;
                let bgColor = 'bg-[#F8F9FA] text-[#E9EBEC]';
                let cursorStyle = 'cursor-pointer';

                const stageColors = {
                  'Not Contacted': 'bg-[#6366F1]',
                  'Contacted': 'bg-[#3B82F6]',
                  'Qualified': 'bg-[#10B981]',
                  'Lost': 'bg-[#EF4444]',
                  'Converted Lead': 'bg-[#F59E0B]',
                  'Quotation': 'bg-[#8B5CF6]',
                  'Revised Quotation': 'bg-[#EC4899]',
                  'Finalized Deal': 'bg-[#14B8A6]'
                };

                if (isLeadStage) {
                  const rawStatus = lead.lead_status || lead.status || 'New';
                  const currentStatus = (rawStatus === 'New' || rawStatus === 'Not Contacted') ? 'Not Contacted' :
                    (rawStatus === 'Converted to Deal') ? 'Qualified' : rawStatus;
                  const activeIdx = leadStages.indexOf(currentStatus);
                  const stageIdx = leadStages.indexOf(stage);

                  isPast = isQualified || stageIdx < activeIdx;
                  isActive = !isQualified && stageIdx === activeIdx;

                  if (isActive || isPast) {
                    bgColor = `${stageColors[stage] || 'bg-blue-600'} text-white`;
                    if (isPast && !isActive) bgColor += ' opacity-70';
                  }
                } else {
                  // Deal stages
                  const currentStage = lead.deal_stage || pipelineStages[0];
                  const dealActiveIdx = pipelineStages.indexOf(currentStage);
                  const stageIdx = pipelineStages.indexOf(stage);

                  isActive = stageIdx === dealActiveIdx;
                  isPast = stageIdx < dealActiveIdx;

                  if (isActive || isPast) {
                    bgColor = `${stageColors[stage] || 'bg-blue-600'} text-white`;
                    if (isPast && !isActive) bgColor += ' opacity-70';
                  }
                }

                return (
                  <div
                    key={idx}
                    className={`h-10 px-4 min-w-[120px] rounded flex items-center justify-center text-[12px] transition-all ${cursorStyle} ${bgColor}`}
                    style={{
                      clipPath: idx === 0
                        ? 'polygon(0% 0%, calc(100% - 15px) 0%, 100% 50%, calc(100% - 15px) 100%, 0% 100%)'
                        : 'polygon(0% 0%, calc(100% - 15px) 0%, 100% 50%, calc(100% - 15px) 100%, 0% 100%, 15px 50%)',
                      marginLeft: idx === 0 ? '0' : '-12px',
                      marginBottom: '4px'
                    }}
                    onClick={() => {
                      if (isLeadStage) {
                        if (!isPast || isActive) {
                          handleStatusChange(stage === 'Qualified' ? 'Qualified' : (stage === 'Not Contacted' ? 'New' : stage));
                        }
                      } else {
                        handleStatusChange(stage);
                      }
                    }}
                  >
                    {stage}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity Tabs */}
          <div className="bg-white rounded border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-6 border-b border-gray-100 overflow-x-auto scrollbar-hide">
              {['Activities', 'Hierarchy', 'Notes', 'Calls', 'Files', 'Email'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={` text-[12px]  text-gray-900 font-[500] p-2 whitespace-nowrap transition-all border-b-2 relative ${activeTab === tab ? 'text-red border-red-600 ' : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    {tab === 'Activities' && <History size={14} />}
                    {tab === 'Hierarchy' && <Layers size={14} />}
                    {tab === 'Notes' && <FileText size={14} />}
                    {tab === 'Calls' && <Phone size={14} />}
                    {tab === 'Files' && <FileUp size={14} />}
                    {tab === 'Email' && <Mail size={14} />}
                    {tab}
                  </div>
                </button>
              ))}
            </div>

            <div className="p-4">
              {activeTab === 'Activities' ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base text-gray-900 font-[500]">Activities</h3>
                    <div className="flex items-center gap-2 relative">
                      <button
                        onClick={() => setIsSortByOpen(!isSortByOpen)}
                        className="flex items-center gap-1.5 p-2   rounded text-xs font-[500] hover:bg-red-600 transition-all  border border-gray-200  hover:text-white"
                      >
                        <List size={14} /> Sort By <ChevronDown size={14} className={`transition-transform ${isSortByOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isSortByOpen && (
                        <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-gray-200 rounded  z-50 py-1">
                          {['Newest', 'Oldest'].map((option) => (
                            <button
                              key={option}
                              className={`w-full text-left p-2 text-xs hover:bg-gray-50 ${sortBy === option ? 'text-red font-[500]' : 'text-gray-700'}`}
                              onClick={() => {
                                setSortBy(option);
                                setIsSortByOpen(false);
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity List */}
                  <div className="space-y-8">
                    {Object.entries(groupFollowupsByDate(followups)).map(([date, items]) => (
                      <div key={date}>
                        <div className="flex items-center gap-2 text-xs text-blue-500 bg-blue-50 w-fit px-2 py-1 rounded mb-4">
                          <Calendar size={12} /> {date}
                        </div>
                        <div className="space-y-4">
                          {items.map((item, idx) => (
                            <div key={idx} className="p-3 bg-white border border-gray-200 rounded flex gap-4 ">
                              <div className={`w-8 h-8 rounded ${getColor(item)} text-white flex items-center justify-center shrink-0`}>
                                {getIcon(item)}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <p className="text-[12px] text-gray-900 font-[500]">{item.title || item.type}</p>
                                  {item.meeting_link && (
                                    <a
                                      href={item.meeting_link.startsWith('http') ? item.meeting_link : `https://${item.meeting_link}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                      Join Meeting <ExternalLink size={10} />
                                    </a>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    {item.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                                  <div className="flex items-center gap-1">
                                    <Clock size={12} className="text-gray-400" />
                                    <span className="text-xs text-gray-400">
                                      {formatDateTime(item.created_at)}
                                    </span>
                                  </div>
                                  {(item.scheduled_date || item.scheduled_time) && (
                                    <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                      <Calendar size={10} />
                                      <span className="text-xs ">
                                        Scheduled: {formatDateTime(item.scheduled_date, item.scheduled_time)}
                                      </span>
                                    </div>
                                  )}
                                  {item.created_by_name && (
                                    <span className="text-xs text-gray-400 ml-auto">by {item.created_by_name}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {followups.length === 0 && (
                      <div className="text-center py-10 text-gray-500 text-sm">
                        No activities found for this lead.
                      </div>
                    )}
                  </div>
                </>
              ) : activeTab === 'Hierarchy' ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base text-gray-900 font-[500]">Followup Hierarchy</h3>
                    <div className="flex items-center gap-2 relative">
                      <button
                        onClick={() => setIsSortByOpen(!isSortByOpen)}
                        className="flex items-center gap-1.5 p-2   rounded text-xs font-[500] hover:bg-red-600 transition-all  border border-gray-200  hover:text-white"
                      >
                        <List size={14} /> Sort By <ChevronDown size={14} className={`transition-transform ${isSortByOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isSortByOpen && (
                        <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-gray-200 rounded  z-50 py-1">
                          {['Newest', 'Oldest'].map((option) => (
                            <button
                              key={option}
                              className={`w-full text-left p-2 text-xs hover:bg-gray-50 ${sortBy === option ? 'text-red font-[500]' : 'text-gray-700'}`}
                              onClick={() => {
                                setSortBy(option);
                                setIsSortByOpen(false);
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity List */}
                  <div className="relative min-h-[200px] pl-2 pr-2">
                    {followups.length > 0 && (
                      <div className="absolute left-[27px] top-8 bottom-8 w-[1px] border-l border-dotted border-gray-300"></div>
                    )}

                    {groupFollowupsByHierarchy(followups).map((group, groupIdx) => (
                      <div key={groupIdx} className="mb-8 last:mb-0">
                        {/* Parent Node */}
                        <div className="flex items-center gap-4 mb-4 relative">
                          <div className="relative z-10 shrink-0">
                            <div className={`w-10 h-10 rounded flex items-center justify-center  ${group.type === 'Company' ? 'bg-indigo-600 text-white' :
                              group.type === 'Lead' ? 'bg-blue-500 text-white' :
                                group.type === 'Deal' ? 'bg-orange-500 text-white' :
                                  group.type === 'Quotation' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'
                              }`}>
                              {group.type === 'Company' && <Building2 size={20} />}
                              {group.type === 'Lead' && <User size={20} />}
                              {group.type === 'Deal' && <Zap size={20} />}
                              {group.type === 'Quotation' && <FileSpreadsheet size={20} />}
                              {group.type === 'Project' && <Briefcase size={20} />}
                              {group.type === 'Task' && <List size={20} />}
                              {!['Lead', 'Deal', 'Project', 'Task', 'Quotation'].includes(group.type) && <History size={20} />}
                            </div>
                            {/* Dot on line for root */}
                            <div className="absolute -left-[11px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-gray-400 border-2 border-white"></div>
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <h4 className="text-sm  text-gray-900 whitespace-nowrap">{group.name}</h4>
                            <div className="flex-1 h-[1px] bg-gray-100"></div>
                          </div>
                        </div>

                        {/* Child Items */}
                        <div className="space-y-1 ml-10 relative">
                          {group.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex items-center gap-4 py-2 hover:bg-gray-50/50 rounded transition-colors px-2 relative group">
                              <div className="relative flex items-center justify-center shrink-0">
                                {/* Horizontal connector line */}
                                <div className="absolute -left-5 w-5 h-[1px] border-t border-dotted border-gray-300"></div>
                                <div className="w-8 h-8 rounded bg-white flex items-center justify-center z-10 border border-gray-100  transition-transform group-hover:scale-110">
                                  {item.type === 'Call' && <Phone size={16} className="text-blue-500" />}
                                  {item.type === 'Google Meet' && <VideoIcon size={16} className="text-teal-500" />}
                                  {item.type === 'Meeting' && <Users size={16} className="text-green-500" />}
                                  {item.type === 'Proposal Discussion' && <FileSpreadsheet size={16} className="text-orange-500" />}
                                  {item.type === 'Proposal' && <FileText size={16} className="text-purple-500" />}
                                  {item.type === 'Email' && <Mail size={16} className="text-red-500" />}
                                  {item.type === 'Payment Reminder' && <CreditCard size={16} className="text-red-500" />}
                                  {item.type === 'Payment' && <DollarSign size={16} className="text-green-600" />}
                                  {item.type === 'Internal' && <Layers size={16} className="text-gray-600" />}
                                  {item.type === 'Team' && <Users size={16} className="text-teal-600" />}
                                  {!['Call', 'Google Meet', 'Meeting', 'Proposal Discussion', 'Proposal', 'Email', 'Payment Reminder', 'Payment', 'Internal', 'Team'].includes(item.type) && <CheckCircle size={16} className="text-gray-500" />}
                                </div>
                                {/* Small dot on the vertical line */}
                                <div className="absolute -left-[14.5px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-300 z-20"></div>
                              </div>

                              <div className="flex-1 flex items-center gap-2">
                                <div className="w-fit">
                                  <span className="text-[12px] font-[500] text-gray-700 block whitespace-pre-wrap truncate group-hover:text-red-600 transition-colors">{item.title || item.type}</span>
                                </div>

                                <div className="w-fit">
                                  <span className={`  text-xs   whitespace-nowrap ${getTypeBadgeStyle(item.type)}`}>
                                    {item.type === 'Call' ? 'Client Call' :
                                      item.type === 'Google Meet' ? 'Client Meeting' :
                                        item.type === 'Proposal Discussion' ? 'Proposal' :
                                          item.type === 'Proposal' ? 'Proposal' :
                                            item.type === 'Payment Reminder' ? 'Payment' :
                                              item.type === 'Payment' ? 'Payment' :
                                                item.type === 'Internal' ? 'Internal' :
                                                  item.type === 'Team' ? 'Team' : item.type}
                                  </span>
                                </div>

                                <div className="flex-1 h-[1px] bg-gray-500"></div>

                                <div className="w-fit text-right">
                                  <span className="text-xs text-gray-500  whitespace-nowrap">
                                    {item.scheduled_date ? formatDateTime(item.scheduled_date, item.scheduled_time) : formatDateTime(item.created_at)}
                                  </span>
                                </div>

                                <div className="w-fit text-right">
                                  <span className={` rounded text-xs   ${getStatusBadgeStyle(item.status)}`}>
                                    {item.status || 'Pending'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {followups.length === 0 && (
                      <div className="text-center py-20 text-gray-400">
                        <History size={40} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No activities found for this lead.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : activeTab === 'Notes' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-[500] text-gray-900">Notes</h3>
                    <div className="flex items-center gap-4 relative">
                      <button
                        onClick={() => setIsSortByOpen(!isSortByOpen)}
                        className="flex items-center gap-1.5 p-2 border border-gray-200 rounded bg-white text-xs text-gray-600  hover:bg-gray-50 transition-colors"
                      >
                        <List size={14} /> Sort By: {sortBy} <ChevronDown size={14} className={`transition-transform ${isSortByOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isSortByOpen && activeTab === 'Notes' && (
                        <div className="absolute top-full right-24 mt-1 w-32 bg-white border border-gray-200 rounded  z-50 py-1">
                          {['Newest', 'Oldest'].map((option) => (
                            <button
                              key={option}
                              className={`w-full text-left p-2 text-xs hover:bg-gray-50 ${sortBy === option ? 'text-red font-[500]' : 'text-gray-700'}`}
                              onClick={() => {
                                setSortBy(option);
                                setIsSortByOpen(false);
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => setIsAddNoteModalOpen(true)}
                        className="text-red text-xs font-[500] flex items-center gap-1 hover:underline"
                      >
                        <Plus size={16} /> Add New
                      </button>
                    </div>
                  </div>

                  {/* Notes List */}
                  {notes.map((note) => (
                    <div key={note.id} className="bg-white border border-gray-100 rounded p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-red-50 text-red flex items-center justify-center ">
                            {getInitials(note.created_by_name || 'U')}
                          </div>
                          <div>
                            <h4 className="text-xs font-[500] text-gray-900">{note.created_by_name || 'System User'}</h4>
                            <p className="text-xs text-gray-400">
                              {new Date(note.created_at).toLocaleString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setIsNoteMenuOpen(isNoteMenuOpen === note.id ? null : note.id)}
                            className="text-gray-400 hover:text-gray-600 p-1  rounded-full transition-colors"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {isNoteMenuOpen === note.id && (
                            <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-gray-100 rounded shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="w-full text-left p-2 text-xs text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="pl-[52px]">
                        <h5 className="text-xs font-[500] text-gray-900">{note.title}</h5>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {note.description}
                        </p>
                      </div>
                    </div>
                  ))}

                  {notes.length === 0 && (
                    <div className="text-center py-10 text-gray-500 text-sm">
                      No notes found for this lead.
                    </div>
                  )}
                </div>
              ) : activeTab === 'Calls' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-[500] text-gray-900">Calls & Meetings</h3>
                    <button
                      onClick={() => setIsAddCallLogModalOpen(true)}
                      className="text-red text-xs font-[500] flex items-center gap-1 hover:underline"
                    >
                      <Plus size={16} /> Add New
                    </button>
                  </div>

                  {followups.filter(f => ['Call', 'Google Meet', 'Meeting', 'WhatsApp', 'Zoom', 'Proposal Discussion', 'Internal Video Call', 'WhatsApp Call', 'Phone Call'].includes(f.type || f.activity_type)).map((call, idx) => (
                    <div key={idx} className="bg-white border border-gray-100 rounded p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded ${['Call', 'Phone Call', 'WhatsApp Call'].includes(call.type) ? 'bg-blue-50 text-blue-600' : 'bg-teal-50 text-teal-600'} flex items-center justify-center`}>
                            {['Call', 'Phone Call', 'WhatsApp Call'].includes(call.type) ? <Phone size={20} /> : <VideoIcon size={20} />}
                          </div>
                          <div>
                            <h4 className="text-xs text-gray-900">
                              <span className="font-[500]">{call.created_by_name || call.assigned_to_name || 'System User'}</span>
                              <span className="text-gray-400"> logged a {call.type || 'call'} on {formatDateTime(call.created_at || call.date || call.scheduled_date)}</span>
                            </h4>
                            <p className="text-xs font-[500] text-gray-700 mt-1">{call.title || call.subject}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {call.ai_sentiment && (
                            <span className={`px-2 py-0.5 rounded text-xs font-[500] ${call.ai_sentiment === 'Positive' ? 'bg-green-50 text-green-600' :
                              call.ai_sentiment === 'Negative' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
                              }`}>
                              {call.ai_sentiment}
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded text-xs font-[500] ${call.status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                            }`}>
                            {call.status || 'Pending'}
                          </span>
                        </div>
                      </div>

                      {/* AI Summary and Key Points */}
                      {call.ai_summary && (
                        <div className="mt-3 p-3 bg-blue-50/50 rounded border border-blue-100/50 animate-in fade-in duration-500">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap size={14} className="text-blue-600" />
                            <h5 className="text-xs  text-blue-900  tracking-wider">AI Meeting Summary</h5>
                          </div>
                          <p className="text-xs text-blue-800 leading-relaxed italic">"{call.ai_summary}"</p>

                          {call.ai_key_points && (
                            <div className="mt-3 grid grid-cols-1 gap-2">
                              {JSON.parse(typeof call.ai_key_points === 'string' ? call.ai_key_points : JSON.stringify(call.ai_key_points)).map((point, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <Check size={12} className="text-green-600 mt-0.5 shrink-0" />
                                  <span className="text-xs text-gray-700">{point}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {call.ai_suggested_actions && (
                            <div className="mt-3 pt-3 border-t border-blue-100">
                              <h6 className="text-xs  text-blue-900 mb-2 ">Suggested Next Actions</h6>
                              <div className="flex flex-wrap gap-2">
                                {JSON.parse(typeof call.ai_suggested_actions === 'string' ? call.ai_suggested_actions : JSON.stringify(call.ai_suggested_actions)).map((action, i) => (
                                  <span key={i} className="px-2 py-1 bg-white border border-blue-200 text-blue-700 rounded text-[9px] font-medium">
                                    {action}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {(call.description || call.notes || call.remarks) && (
                        <div>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            {call.description || call.notes || call.remarks}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-2">
                        {call.meeting_link && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Always use internal video call page for recording and AI analysis
                              let code = call.meeting_link;
                              if (call.meeting_link?.includes('meet.google.com/')) {
                                code = call.meeting_link.split('meet.google.com/').pop().split('?')[0];
                              } else if (call.meeting_link?.includes('zoom.us/')) {
                                code = call.meeting_link.split('/').pop().split('?')[0];
                              } else if (call.meeting_link?.includes('/')) {
                                code = call.meeting_link.split('/').pop();
                              }
                              navigate(`/video-call/${code || call.id}`);
                            }}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                          >
                            <VideoIcon size={10} /> {call.meeting_link.startsWith('/') ? 'Join Internal Call' : 'Join Meeting'}
                          </button>
                        )}

                        {call.recording_url && (
                          <div className="flex flex-col gap-2 mt-2 p-2 bg-gray-50 rounded border border-gray-100">
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => window.open(`${process.env.REACT_APP_API_URL || API_BASE_URL.replace(/\/api\/?$/, '') + ''}${call.recording_url}`, '_blank')}
                                className="text-xs text-red-600 hover:underline flex items-center gap-1 font-medium"
                              >
                                <Play size={10} /> Listen to Recording
                              </button>
                              {call.ai_sentiment && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${call.ai_sentiment === 'Positive' ? 'bg-green-100 text-green-700' :
                                  call.ai_sentiment === 'Negative' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                  Sentiment: {call.ai_sentiment}
                                </span>
                              )}
                            </div>

                            {call.ai_summary && (
                              <div className="space-y-1">
                                <p className="text-xs  text-gray-700">AI Summary:</p>
                                <p className="text-xs text-gray-600 leading-relaxed italic">"{call.ai_summary}"</p>
                              </div>
                            )}

                            {call.ai_key_points && (
                              <div className="space-y-1">
                                <p className="text-xs  text-gray-700">Key Discussion Points:</p>
                                <ul className="list-disc list-inside text-xs text-gray-600 pl-1">
                                  {(typeof call.ai_key_points === 'string' ? JSON.parse(call.ai_key_points) : call.ai_key_points).map((point, i) => (
                                    <li key={i}>{point}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {call.ai_suggested_actions && (
                              <div className="space-y-1">
                                <p className="text-xs  text-blue-700">Suggested Next Actions:</p>
                                <ul className="list-disc list-inside text-xs text-blue-600 pl-1">
                                  {(typeof call.ai_suggested_actions === 'string' ? JSON.parse(call.ai_suggested_actions) : call.ai_suggested_actions).map((action, i) => (
                                    <li key={i}>{action}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {followups.filter(f => ['Call', 'Google Meet', 'Meeting', 'WhatsApp', 'Zoom', 'Proposal Discussion'].includes(f.type || f.activity_type)).length === 0 && (
                    <div className="text-center py-10 text-gray-500 text-sm">
                      No calls or meetings found for this lead.
                    </div>
                  )}
                </div>
              ) : activeTab === 'Email' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-[500] text-gray-900">Email</h3>
                    <button className="text-red text-xs font-[500] flex items-center gap-1 hover:underline">
                      <Plus size={16} /> Create Email
                    </button>
                  </div>

                  {followups.filter(f => (f.type || f.activity_type) === 'Email').map((email, idx) => (
                    <div key={idx} className="bg-white border border-gray-100 rounded p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-50 text-red flex items-center justify-center text-xs">
                            <Mail size={16} />
                          </div>
                          <div>
                            <h4 className="text-[12px] font-[500] text-gray-900 mb-1">{email.title}</h4>
                            <p className="text-xs text-gray-400">Sent on {formatDateTime(email.created_at || email.date)} by {email.created_by_name || 'System User'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-[500] rounded">Sent</span>
                        </div>
                      </div>
                      {email.description && (
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {email.description}
                        </p>
                      )}
                    </div>
                  ))}

                  {followups.filter(f => (f.type || f.activity_type) === 'Email').length === 0 && (
                    <div className="text-center py-10 text-gray-500 text-sm">
                      No emails found for this lead.
                    </div>
                  )}
                </div>
              ) : activeTab === 'Files' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-[500] text-gray-900">Files & Quotations</h3>
                    <button
                      onClick={() => setIsAddFileModalOpen(true)}
                      className="bg-red-600 text-white p-2 rounded text-xs font-[500] flex items-center gap-1 hover:bg-red-700 transition-colors"
                    >
                      <Plus size={14} /> Create Document
                    </button>
                  </div>

                  {/* Quotations Section */}
                  {estimations.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-[600] text-gray-700  tracking-wider">Quotations (PDF Versions)</h4>
                      {[...estimations].sort((a, b) => new Date(b.created_at || b.estimate_date || 0) - new Date(a.created_at || a.estimate_date || 0)).map((est, idx) => {
                        const versionNum = est.version || (estimations.length - idx);
                        const isRevision = est.parent_id || versionNum > 1 || est.status === 'Revised';
                        return (
                          <div key={`est-${est.id}`} className="bg-white border border-gray-100 rounded p-4 space-y-2 hover:border-red-200 transition-colors">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded bg-red-50 text-red flex items-center justify-center">
                                  <FileText size={20} />
                                </div>
                                <div>
                                  <h4 className="text-[12px] font-[500] text-gray-900 mb-0.5">{est.estimation_number || est.quotation_number} - {isRevision ? `Revision v${versionNum}` : `Version v${versionNum}`}</h4>
                                  <p className="text-xs text-gray-500">
                                    {est.currency || 'INR'} {(est.amount || est.total)?.toLocaleString()} • {est.status} • {formatDateTime(est.created_at || est.estimate_date || est.quotation_date)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button className="p-1.5 text-gray-400 hover:text-red transition-colors">
                                  <DownloadCloud size={16} />
                                </button>
                                <button className="p-1.5 text-gray-400 hover:text-red transition-colors">
                                  <Printer size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Other Files Section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-[600] text-gray-700  tracking-wider">Other Documents</h4>
                    {files.map((file) => (
                      <div key={file.id} className="bg-white border border-gray-100 rounded p-4 space-y-2 hover:border-gray-200 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-gray-50 text-gray-500 flex items-center justify-center">
                              <Paperclip size={16} />
                            </div>
                            <div>
                              <h4 className="text-[12px] font-[500] text-gray-900 mb-1">{file.name}</h4>
                              <p className="text-xs text-gray-500">{file.file_type} • {formatDateTime(file.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-white text-xs font-[500] rounded ${file.status === 'Sent' ? 'bg-green-600' : 'bg-blue-500'
                              }`}>
                              {file.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                          <div className="w-6 h-6 rounded-full bg-red-50 text-red flex items-center justify-center text-[9px]">
                            {getInitials(file.owner_name || 'U')}
                          </div>
                          <span className="text-xs text-gray-600">{file.owner_name || 'System User'}</span>
                        </div>
                      </div>
                    ))}

                    {files.length === 0 && estimations.length === 0 && (
                      <div className="text-center py-10 text-gray-500 text-sm">
                        No files or quotations found for this lead.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-20 text-gray-400 text-xs ">
                  No data available for {activeTab}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConvertLeadModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        onSubmit={handleConvert}
        convertType={convertType}
        leadData={lead}
        companies={companies}
      />

      {/* Add New Note Modal */}
      {isAddNoteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded  w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-2 border-b border-gray-100">
              <h3 className="text-base font-[500] text-gray-900">Add New Notes</h3>
              <button onClick={() => setIsAddNoteModalOpen(false)} className="p-1  rounded-full text-gray-400">
                <X size={15} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <div>
                <label className="block text-xs font-[500] text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                  placeholder="Enter title"
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-[500] text-gray-700 mb-1.5">Note <span className="text-red-500">*</span></label>
                <textarea
                  className="w-full p-2 border border-gray-200 rounded text-xs min-h-[20px] focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                  placeholder="Enter note details"
                  value={noteForm.note}
                  onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-[500] text-gray-700 mb-1.5">Attachment <span className="text-red-500">*</span></label>
                <div className="border border-dashed border-gray-200 rounded p-2 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FileUp size={15} className="text-red" />
                  </div>
                  <p className="text-xs text-black-600">Drop your files here or <span className="text-red font-[500]">browse</span></p>
                  <p className="text-xs text-gray-400 mt-1">Maximum size : 50 MB</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 bg-gray-50 border border-gray-100 rounded group">
                <div className="w-10 h-10 bg-green-500 rounded flex items-center justify-center text-white">
                  <FileSpreadsheet size={15} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-[500] text-gray-900">Project Specs.xls</p>
                  <p className="text-xs text-gray-400 ">365 KB</p>
                </div>
                <button className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 bg-gray-50/50 border-t border-gray-100">
              <button
                onClick={() => setIsAddNoteModalOpen(false)}
                className="p-2 text-xs font-[500] text-gray-700  rounded transition-colors bg-gray-200"
              >
                Cancel
              </button>
              <button
                className="p-2 text-xs font-[500] text-white bg-red-600 rounded  transition-colors  "
                onClick={handleAddNote}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Call Log Modal */}
      {isAddCallLogModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded  w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-2 border-b border-gray-100">
              <h3 className="text-base font-[500] text-gray-900">Create Call Log</h3>
              <button onClick={() => setIsAddCallLogModalOpen(false)} className="p-1  rounded-full text-gray-400">
                <X size={15} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-[500] text-gray-700 mb-1.5  ">Status <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select
                    className="w-full p-2 bg-white border border-gray-200 rounded text-xs  focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none appearance-none cursor-pointer"
                    value={callLogForm.status}
                    onChange={(e) => setCallLogForm({ ...callLogForm, status: e.target.value })}
                  >
                    <option>Busy</option>
                    <option>Unavailable</option>
                    <option>No Answer</option>
                    <option>Wrong Number</option>
                    <option>Left Voice Message</option>
                    <option>Moving Forward</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="relative">
                <label className="block text-xs font-[500] text-gray-700 mb-1.5  ">Follow Up Date <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all pr-10 cursor-pointer"
                    placeholder="23 Jan, 2026"
                    value={callLogForm.followUpDate}
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    readOnly
                  />
                  <Calendar
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                  />
                </div>

                {isDatePickerOpen && (
                  <div className="absolute top-full left-0 mt-1 w-[280px] bg-white border border-gray-100 rounded shadow-2xl z-[110] p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={handlePrevMonth}
                        className="p-1 hover:bg-gray-50 rounded text-gray-400 transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="relative">
                        <div
                          className="flex items-center gap-1 text-sm font-[500] text-gray-700 cursor-pointer hover:text-red transition-colors"
                          onClick={() => {
                            // In a real app this would open a month/year picker
                            setCalendarDate(new Date());
                          }}
                        >
                          {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()} <ChevronDown size={14} />
                        </div>
                      </div>
                      <button
                        onClick={handleNextMonth}
                        className="p-1 hover:bg-gray-50 rounded text-gray-400 transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="text-xs font-[500] text-gray-400 text-center py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {generateCalendarDays().map((dateObj, idx) => {
                        const { day, isCurrentMonth } = dateObj;
                        // For demo selection highlighting
                        const isSelected = isCurrentMonth && day === 23 && calendarDate.getMonth() === 0 && calendarDate.getFullYear() === 2026;

                        return (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isCurrentMonth) {
                                const formattedDate = `${day} ${monthNames[calendarDate.getMonth()].substring(0, 3)}, ${calendarDate.getFullYear()}`;
                                setCallLogForm({ ...callLogForm, followUpDate: formattedDate });
                                setIsDatePickerOpen(false);
                              }
                            }}
                            className={`
                              h-8 w-8 flex items-center justify-center text-xs  rounded-full transition-all
                              ${!isCurrentMonth ? 'text-gray-300 pointer-events-none' : 'text-gray-600 hover:bg-red-50 hover:text-red'}
                              ${isSelected ? 'bg-red text-white hover:bg-red-700' : ''}
                            `}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-[500] text-gray-700 mb-1.5  ">Note <span className="text-red-500">*</span></label>
                <textarea
                  className="w-full p-2 border border-gray-200 rounded text-xs min-h-[100px] focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                  placeholder="Enter call notes"
                  value={callLogForm.note}
                  onChange={(e) => setCallLogForm({ ...callLogForm, note: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setCallLogForm({ ...callLogForm, createFollowupTask: !callLogForm.createFollowupTask })}>
                <div className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${callLogForm.createFollowupTask ? 'bg-red-600 border-red text-white' : 'border-gray-300 bg-white group-hover:border-red'}`}>
                  {callLogForm.createFollowupTask && <Check size={12} strokeWidth={3} />}
                </div>
                <span className="text-xs  text-gray-600 group-hover:text-gray-900 transition-colors">Create a follow up task</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 bg-gray-50/50 border-t border-gray-100">
              <button
                onClick={() => setIsAddCallLogModalOpen(false)}
                className="p-2 text-xs font-[500] text-gray-700  rounded transition-colors bg-gray-200"
              >
                Cancel
              </button>
              <button
                className="p-2 text-xs font-[500] text-white bg-red-600 rounded  transition-colors  "
                onClick={handleAddCallLog}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New File Modal */}
      {isAddFileModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded  w-full max-w-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-2 border-b border-gray-100">
              <h3 className="text-base font-[500] text-gray-900">Create New File</h3>
              <button onClick={() => setIsAddFileModalOpen(false)} className="p-1  rounded-full text-gray-400">
                <X size={15} />
              </button>
            </div>
            <div className="bg-gray-50/50 p-4 flex gap-2 border-b border-gray-100">
              <button
                onClick={() => setFileModalTab('Basic Info')}
                className={`flex items-center gap-2 p-2 rounded text-xs font-[500] transition-all ${fileModalTab === 'Basic Info' ? 'bg-red-600 text-white shadow-md shadow-red-500/10' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                <FileText size={14} /> Basic Info
              </button>
              <button
                onClick={() => setFileModalTab('Add Recipient')}
                className={`flex items-center gap-2 p-2 rounded text-xs font-[500] transition-all ${fileModalTab === 'Add Recipient' ? 'bg-red-600 text-white shadow-md shadow-red-500/10' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                <Plus size={14} /> Add Recipient
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {fileModalTab === 'Basic Info' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-[500] text-gray-700 mb-1.5  ">Deal <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select className="w-full p-2 bg-white border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 outline-none appearance-none cursor-pointer">
                          <option>Select</option>
                          <option>Deal A</option>
                          <option>Deal B</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-[500] text-gray-700 mb-1.5  ">Document Type <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select className="w-full p-2 bg-white border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 outline-none appearance-none cursor-pointer">
                          <option>Select</option>
                          <option>Contract</option>
                          <option>Proposal</option>
                          <option>Quote</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-[500] text-gray-700 mb-1.5  ">Owner <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select className="w-full p-2 bg-white border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 outline-none appearance-none cursor-pointer">
                          <option>Select</option>
                          <option>Steve Vaughan</option>
                          <option>Jessica Louise</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-[500] text-gray-700 mb-1.5  ">Title <span className="text-red-500">*</span></label>
                      <input type="text" className="w-full p-2 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 outline-none" placeholder="Enter title" />
                    </div>
                  </div>

                  <div className='bg-gray-100 rounded p-2'>
                    <label className="block text-xs font-[500] text-gray-700 mb-3">Signature</label>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="signature"
                          className="mt-1 accent-red w-3 h-3 cursor-pointer"
                          checked={fileForm.signature === 'No Signature'}
                          onChange={() => setFileForm({ ...fileForm, signature: 'No Signature' })}
                        />
                        <div>
                          <p className={`text-xs font-[500] ${fileForm.signature === 'No Signature' ? 'text-gray-900' : 'text-gray-500'}`}>No Signature</p>
                          <p className="text-xs text-gray-400">This document does not require a signature before acceptance.</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="signature"
                          className="mt-1 accent-red w-3 h-3 cursor-pointer"
                          checked={fileForm.signature === 'Use e-signature'}
                          onChange={() => setFileForm({ ...fileForm, signature: 'Use e-signature' })}
                        />
                        <div>
                          <p className={`text-xs font-[500] ${fileForm.signature === 'Use e-signature' ? 'text-gray-900' : 'text-gray-500'}`}>Use e-signature</p>
                          <p className="text-xs text-gray-400">This document require e-signature before acceptance.</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {fileForm.signature === 'Use e-signature' && (
                    <div className="space-y-4">
                      {fileForm.recipients.map((recipient, idx) => (
                        <div key={idx} className="grid grid-cols-2 gap-4 relative">
                          <div>
                            <label className="block text-xs font-[500] text-gray-700 mb-1.5">Recipients Name <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              placeholder="Enter Name"
                              className="w-full p-2 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 outline-none"
                              value={recipient.name}
                              onChange={(e) => {
                                const newRecipients = [...fileForm.recipients];
                                newRecipients[idx].name = e.target.value;
                                setFileForm({ ...fileForm, recipients: newRecipients });
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-[500] text-gray-700 mb-1.5">Recipients Email <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <input
                                type="email"
                                placeholder="Email Address"
                                className="w-full p-2 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 outline-none pr-10"
                                value={recipient.email}
                                onChange={(e) => {
                                  const newRecipients = [...fileForm.recipients];
                                  newRecipients[idx].email = e.target.value;
                                  setFileForm({ ...fileForm, recipients: newRecipients });
                                }}
                              />
                              {idx === 0 ? (
                                <button
                                  onClick={() => setFileForm({ ...fileForm, recipients: [...fileForm.recipients, { name: '', email: '' }] })}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-gray-400 rounded-full flex items-center justify-center text-gray-400 text-xs font-[500] hover:border-red hover:text-red transition-colors"
                                >
                                  +
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    const newRecipients = fileForm.recipients.filter((_, i) => i !== idx);
                                    setFileForm({ ...fileForm, recipients: newRecipients });
                                  }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-[500] text-gray-700 mb-1.5">Content <span className="text-red-500">*</span></label>
                    <textarea
                      className="w-full p-2 border border-gray-200 rounded text-xs min-h-[20px] focus:ring-2 focus:ring-red-500/20 outline-none"
                      placeholder="Add Content"
                      value={fileForm.content}
                      onChange={(e) => setFileForm({ ...fileForm, content: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 border border-gray-100 rounded bg-white ">
                    <h4 className="text-sm font-[500] text-gray-900 mb-1">Send the document to following signers</h4>
                    <p className="text-xs text-gray-500 mb-4">In order to send the document to the signers</p>

                    <div className="space-y-4">
                      {fileForm.recipients.map((recipient, idx) => (
                        <div key={idx} className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-[500] text-gray-700 mb-1.5">Recipients Name <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              placeholder="Enter Name"
                              className="w-full p-2 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 outline-none"
                              value={recipient.name}
                              onChange={(e) => {
                                const newRecipients = [...fileForm.recipients];
                                newRecipients[idx].name = e.target.value;
                                setFileForm({ ...fileForm, recipients: newRecipients });
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-[500] text-gray-700 mb-1.5">Recipients Email <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <input
                                type="email"
                                placeholder="Email Address"
                                className="w-full p-2 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 outline-none pr-10"
                                value={recipient.email}
                                onChange={(e) => {
                                  const newRecipients = [...fileForm.recipients];
                                  newRecipients[idx].email = e.target.value;
                                  setFileForm({ ...fileForm, recipients: newRecipients });
                                }}
                              />
                              {idx === 0 ? (
                                <button
                                  onClick={() => setFileForm({ ...fileForm, recipients: [...fileForm.recipients, { name: '', email: '' }] })}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-gray-400 rounded-full flex items-center justify-center text-gray-400 text-xs font-[500] hover:border-red hover:text-red transition-colors"
                                >
                                  +
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    const newRecipients = fileForm.recipients.filter((_, i) => i !== idx);
                                    setFileForm({ ...fileForm, recipients: newRecipients });
                                  }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-[500] text-gray-700 mb-1.5">Message Subject <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="Enter Subject"
                      className="w-full p-2 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 outline-none"
                      value={fileForm.subject}
                      onChange={(e) => setFileForm({ ...fileForm, subject: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-[500] text-gray-700 mb-1.5">Message Text <span className="text-red-500">*</span></label>
                    <textarea
                      className="w-full p-2 border border-gray-200 rounded text-xs min-h-[20px] focus:ring-2 focus:ring-red-500/20 outline-none"
                      placeholder="Your document is ready"
                      value={fileForm.message}
                      onChange={(e) => setFileForm({ ...fileForm, message: e.target.value })}
                    />
                  </div>

                  <button className="px-4 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-[500] text-gray-700 hover:bg-gray-100 transition-colors">
                    Send Now
                  </button>

                  <div className="p-3 bg-green-50 border border-green-200 rounded flex items-center gap-2 text-green-700 text-xs ">
                    <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center text-white">
                      <Check size={10} strokeWidth={4} />
                    </div>
                    Document sent successfully to the selected recipients
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-4 bg-gray-50/50 border-t border-gray-100">
              <button
                onClick={() => setIsAddFileModalOpen(false)}
                className="p-2 text-xs font-[500] text-gray-700  rounded transition-colors bg-gray-200"
              >
                Cancel
              </button>
              <button
                className="p-2 text-xs font-[500] text-white bg-red-600 rounded  transition-colors  "
                onClick={(e) => {
                  if (fileModalTab === 'Basic Info') {
                    setFileModalTab('Add Recipient');
                  } else if (fileModalTab === 'Add Recipient') {
                    setFileModalTab('Message Info');
                  } else {
                    handleCreateFile(e);
                  }
                }}
              >
                {fileModalTab === 'Basic Info' || fileModalTab === 'Add Recipient' ? 'Next' : 'Create File'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Account Modal */}
      {isConnectAccountModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded  w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-2 border-b border-gray-100">
              <h3 className="text-base font-[500] text-gray-900">Connect Account</h3>
              <button onClick={() => setIsConnectAccountModalOpen(false)} className="p-1  rounded-full text-gray-400">
                <X size={15} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-[500] text-gray-700 mb-1.5  ">Account type <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select
                    className="w-full p-2 bg-white border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 outline-none appearance-none cursor-pointer"
                    value={accountForm.type}
                    onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })}
                  >
                    <option>Gmail</option>
                    <option>Outlook</option>
                    <option>Imap</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-[500] text-gray-700 mb-3  ">Sync emails from</label>
                <div className="space-y-3">
                  {['Now', '1 Month Ago', '3 Month Ago', '6 Month Ago'].map((option) => (
                    <label key={option} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="sync"
                        className="accent-red w-3 h-3 cursor-pointer"
                        checked={accountForm.syncFrom === option}
                        onChange={() => setAccountForm({ ...accountForm, syncFrom: option })}
                      />
                      <span className="text-sm  text-gray-700 group-hover:text-gray-900 transition-colors">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 bg-gray-50/50 border-t border-gray-100">
              <button
                onClick={() => setIsConnectAccountModalOpen(false)}
                className="p-2 text-xs font-[500] text-gray-700  rounded transition-colors bg-gray-200"
              >
                Cancel
              </button>
              <button
                className="p-2 text-xs font-[500] text-white bg-red-600 rounded  transition-colors  "
                onClick={() => setIsConnectAccountModalOpen(false)}
              >
                Connect Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {isAddContactModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded  w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-2 border-b border-gray-100">
              <h3 className="text-base font-[500] text-gray-900">Add Contact</h3>
              <button onClick={() => setIsAddContactModalOpen(false)} className="p-1  rounded-full text-gray-400">
                <X size={15} />
              </button>
            </div>
            <div className="p-2 max-h-[400px] overflow-y-auto">
              {[
                { id: 1, name: 'Darlee Robertson', img: 'https://i.pravatar.cc/100?u=darlee' },
                { id: 2, name: 'Sharon Roy', img: 'https://i.pravatar.cc/100?u=sharon' },
                { id: 3, name: 'Vaughan Lewis', img: 'https://i.pravatar.cc/100?u=vaughan' },
                { id: 4, name: 'Jessica Louise', img: 'https://i.pravatar.cc/100?u=jessica' },
                { id: 5, name: 'Carol Thomas', img: 'https://i.pravatar.cc/100?u=carol' },
                { id: 6, name: 'Dawn Mercha', img: 'https://i.pravatar.cc/100?u=dawn' },
              ].map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors group"
                  onClick={() => {
                    if (selectedContacts.includes(contact.id)) {
                      setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                    } else {
                      setSelectedContacts([...selectedContacts, contact.id]);
                    }
                  }}
                >
                  <div className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${selectedContacts.includes(contact.id) ? 'bg-red-600 border-red text-white' : 'border-gray-300 bg-white group-hover:border-red'}`}>
                    {selectedContacts.includes(contact.id) && <Check size={12} strokeWidth={3} />}
                  </div>
                  <img src={contact.img} alt="" className="w-8 h-8 rounded-full object-cover" />
                  <span className="text-xs  text-gray-700 group-hover:text-gray-900">{contact.name}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 p-2 bg-gray-50/50 border-t border-gray-100">
              <button
                onClick={() => setIsAddContactModalOpen(false)}
                className="p-2 text-xs font-[500] text-gray-700  rounded transition-colors"
              >
                Cancel
              </button>
              <button
                className="p-2 text-xs font-[500] text-white bg-red-600 rounded  transition-colors  "
                onClick={() => setIsAddContactModalOpen(false)}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <ConvertLeadModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        onSubmit={handleConvert}
        convertType={convertType}
        leadData={lead}
        companies={companies}
      />
    </div>
  );
};

export default LeadDetailsPage;