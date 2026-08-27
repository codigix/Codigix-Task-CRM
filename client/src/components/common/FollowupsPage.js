import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Download, Search, Phone, Mail, CheckSquare, Calendar, Video as VideoIcon, FileUp,
  Receipt, Calculator, Star, TrendingUp, Building2, User, Edit2, FileText,
  ChevronDown, MoreVertical, Plus, MessageCircle, Clock, AlertCircle, CheckCircle2,
  Trash2, RotateCcw, Filter, ExternalLink, Maximize, LayoutGrid, List, ChevronsUpDown,
  ArrowLeft, Layout, PlusCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { followupsAPI, leadsAPI, dealsAPI, estimationsAPI } from '../../services/api';
import { generateMeetingLink } from '../../utils/meetingUtils';
import AddFollowupModal from './AddFollowupModal';
import AddNewEstimationModal from './AddNewEstimationModal';
import AdvancedDataTable from './AdvancedDataTable';
import DateRangeDropdown from './DateRangeDropdown';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const FollowupsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All Follow-Ups');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [followups, setFollowups] = useState([]);
  const [metrics, setMetrics] = useState({
    today: 0,
    overdue: 0,
    discipline: 0,
    performance: 0
  });
  const [selectedItems, setSelectedItems] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [quotationInitialData, setQuotationInitialData] = useState(null);
  const [editingFollowup, setEditingFollowup] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [sortConfig, setSortConfig] = useState({ key: 'scheduled_date', direction: 'desc' });
  const [dateRangeType, setDateRangeType] = useState('All Time');
  const [customDateRange, setCustomDateRange] = useState({ startDate: null, endDate: null });
  const [visibleColumns, setVisibleColumns] = useState([
    'id', 'related_name', 'current_status', 'type', 'calendar_sync', 'attempt', 'next_followup', 'subject', 'scheduled_date', 'scheduled_time', 'priority', 'status', 'outcome', 'assigned_to_name', 'actions'
  ]);
  const columnLabels = {
    id: 'Follow-Up ID',
    related_name: 'Client',
    current_status: 'Current Status',
    type: 'Type',
    calendar_sync: 'Calendar',
    attempt: 'Attempt',
    next_followup: 'Next Follow-Up',
    subject: 'Subject',
    scheduled_date: 'Date',
    scheduled_time: 'Time',
    priority: 'Priority',
    status: 'Status',
    outcome: 'Outcome',
    assigned_to_name: 'Assigned To',
    actions: 'Action'
  };
  const [activeFilters, setActiveFilters] = useState({
    related_type: [],
    priority: [],
    assigned_to: [],
    status: []
  });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [expandedFilterSection, setExpandedFilterSection] = useState('status');
  const [isGroupedView, setIsGroupedView] = useState(true);
  const [expandedClients, setExpandedClients] = useState({});

  const handleAddQuotation = async (formData) => {
    if (!formData) {
      fetchFollowups();
      setIsQuotationModalOpen(false);
      return;
    }
    try {
      const quotationData = {
        ...formData,
        estimation_number: formData.quotationNumber,
        client_id: formData.client_id,
        lead_id: formData.lead_id,
        deal_id: formData.deal_id,
        project_id: formData.project_id,
        amount: parseFloat(formData.amount || formData.total || 0),
        currency: formData.currency,
        estimate_date: formData.quotationDate,
        expiry_date: formData.validUntil,
        status: formData.status || 'Draft',
        description: formData.description,
        estimate_by: formData.assignedExecutiveId,
        total: parseFloat(formData.amount || formData.total || 0)
      };

      if (quotationInitialData && quotationInitialData.id) {
         await estimationsAPI.update(quotationInitialData.id, quotationData);
         showSuccessToast('Quotation updated successfully');
      } else {
         await estimationsAPI.create(quotationData);
         showSuccessToast('Quotation created successfully');
      }
      setIsQuotationModalOpen(false);
      setQuotationInitialData(null);
      fetchFollowups();
    } catch (err) {
      console.error(err);
      showErrorToast('Failed to save quotation');
    }
  };

  const tabs = ['All Follow-Ups', "Today's", 'Overdue', 'Scheduled', 'Completed'];

  const fetchFollowups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await followupsAPI.getAll();
      setFollowups(Array.isArray(data) ? data : (data.data || []));

      // Fetch metrics
      try {
        const metricsData = await followupsAPI.getMetrics();
        setMetrics(metricsData);
      } catch (err) {
        console.warn('Failed to fetch metrics, calculating locally');
        // Fallback local calculation
        const list = Array.isArray(data) ? data : (data.data || []);
        const today = new Date().toISOString().split('T')[0];
        setMetrics({
          today: list.filter(f => f.scheduled_date === today && f.status !== 'Completed').length,
          overdue: list.filter(f => f.scheduled_date < today && f.status !== 'Completed').length,
          discipline: 85, // Dummy
          performance: 92  // Dummy
        });
      }
    } catch (error) {
      console.error('Error fetching followups:', error);
      showErrorToast('Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  const sanitizeFollowupForAPI = (data) => {
    const sanitized = { ...data };
    const dateFields = ['scheduled_date', 'recurrence_end_date', 'next_followup_date', 'created_at', 'updated_at'];

    const formatDateForAPI = (dateVal) => {
      if (!dateVal) return dateVal;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) {
        return typeof dateVal === 'string' ? dateVal.split('T')[0] : dateVal;
      }
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    dateFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = formatDateForAPI(sanitized[field]);
      }
    });

    return sanitized;
  };

  const handleAddFollowup = async (formData) => {
    try {
      const sanitizedData = sanitizeFollowupForAPI(formData);
      if (formData.id) {
        await followupsAPI.update(formData.id, sanitizedData);

        // If status is Completed AND a next followup date is provided, create a new followup
        if (formData.status === 'Completed' && formData.next_followup_date) {
          const nextFollowupData = sanitizeFollowupForAPI({
            related_type: formData.related_type,
            related_id: formData.related_id,
            related_name: formData.related_name,
            type: formData.next_followup_type || 'Call',
            subject: `Follow-up after: ${formData.subject}`,
            scheduled_date: formData.next_followup_date,
            scheduled_time: formData.next_followup_time || '10:00',
            priority: formData.priority || 'Medium',
            assigned_to: formData.assigned_to,
            assigned_to_name: formData.assigned_to_name,
            status: 'Scheduled',
            previous_followup_id: formData.id
          });
          await followupsAPI.create(nextFollowupData);
          showSuccessToast('Follow-up updated and next one scheduled');
        } else {
          showSuccessToast('Follow-up updated successfully');
        }

        // Automation: Update Lead/Deal stages based on selected Outcome
        if (formData.status === 'Completed' && formData.outcome) {
          try {
            if (formData.outcome === 'Asking for Quotation') {
              if (formData.related_type === 'Lead') {
                await leadsAPI.update(formData.related_id, { lead_status: 'Qualified' });
                console.log(`Auto-updated lead ${formData.related_id} to Qualified`);
              } else if (formData.related_type === 'Deal') {
                await dealsAPI.update(formData.related_id, { deal_stage: 'Quotation' });
                console.log(`Auto-updated deal ${formData.related_id} to Quotation stage`);
              }
            } else if (formData.outcome === 'Converted to Deal' && formData.related_type === 'Lead') {
              // Optional: trigger conversion logic if needed, or just status update
              await leadsAPI.update(formData.related_id, { lead_status: 'Converted to Deal' });
            } else if (formData.outcome === 'Quotation Accepted & Converted to Deal' && formData.related_type === 'Lead') {
              try {
                await leadsAPI.convertToDeal(formData.related_id, {});
                console.log(`Auto-converted lead ${formData.related_id} to Deal`);
              } catch (convErr) {
                console.warn('Failed to convert to deal via API, updating status only:', convErr);
                await leadsAPI.update(formData.related_id, { lead_status: 'Converted to Deal' });
              }
            }
          } catch (autoErr) {
            console.error('Automation failed:', autoErr);
          }
        }
      } else {
        await followupsAPI.create(sanitizedData);
        showSuccessToast('Follow-up scheduled successfully');
      }

      setEditingFollowup(null);
      setIsAddModalOpen(false);
      await fetchFollowups();
    } catch (err) {
      console.error('Error saving followup:', err);
      showErrorToast(err.message || 'Failed to save follow-up');
    }
  };

  const handleComplete = (followup) => {
    setEditingFollowup({ ...followup, status: 'Completed' });
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this follow-up?')) {
      try {
        await followupsAPI.delete(id);
        showSuccessToast('Follow-up deleted');
        fetchFollowups();
      } catch (err) {
        showErrorToast('Failed to delete follow-up');
      }
    }
  };

  const handleJoinMeeting = async (e, row) => {
    e.stopPropagation();
    let link = row.meeting_link;

    // Validate if it's a valid Google Meet link (must be exactly abc-defg-hij format)
    const meetCode = link ? link.split('/').filter(Boolean).pop() : null;
    const isInvalidGoogleMeet = row.type === 'Google Meet' && (!meetCode || !/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(meetCode));

    if (!link || isInvalidGoogleMeet) {
      // Use the utility to generate a valid meeting link (letters only for Google Meet)
      link = generateMeetingLink(row.type);

      try {
        // Ensure date fields are in YYYY-MM-DD format for the API to avoid "Incorrect date value" errors
        const updateData = sanitizeFollowupForAPI({ ...row, meeting_link: link });

        await followupsAPI.update(row.id, updateData);
        showSuccessToast('New meeting link generated');
        // Refresh to show the link
        fetchFollowups();
      } catch (err) {
        showErrorToast('Failed to generate meeting link');
        return;
      }
    }

    window.open(link, '_blank');
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return ' text-red-600 border border-red-100';
      case 'Medium': return ' text-blue-600 border border-blue-100';
      case 'Low': return ' text-green-600 border border-green-100';
      default: return ' text-gray-600 border border-gray-100';
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Scheduled': return ' text-blue-600 border border-blue-100';
      case 'Completed': return ' text-green-600 border border-green-100';
      case 'Pending': return ' text-orange-600 border border-orange-100';
      case 'Overdue': return ' text-red-600 border border-red-100';
      case 'Cancelled': return ' text-gray-600 border border-gray-200';
      case 'Client Joined': return ' text-green-700 bg-green-50 border border-green-200 ';
      default: return ' text-gray-600';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Call': return <Phone size={14} />;
      case 'Email': return <Mail size={14} />;
      case 'WhatsApp': return <MessageCircle size={14} />;
      case 'Google Meet':
      case 'Zoom Meeting': return <VideoIcon size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      // If it's already a Date object, use it
      if (dateStr instanceof Date) {
        if (isNaN(dateStr.getTime())) return 'Invalid Date';
        // Use local date methods instead of UTC to avoid timezone shifts
        const year = dateStr.getFullYear();
        const month = dateStr.getMonth();
        const day = dateStr.getDate();
        const d = new Date(year, month, day);
        return new Intl.DateTimeFormat('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }).format(d);
      }

      // Handle ISO strings that might contain T00:00:00.000Z
      if (typeof dateStr === 'string' && dateStr.includes('T')) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          // Use local date methods instead of UTC to avoid timezone shifts
          const year = d.getFullYear();
          const month = d.getMonth();
          const day = d.getDate();
          const localD = new Date(year, month, day);
          return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }).format(localD);
        }
      }

      // Handle YYYY-MM-DD strings directly to avoid any timezone shifting
      if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.split('T')[0])) {
        const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
        // Create date at local noon to avoid any midnight-related shifts
        const d = new Date(year, month - 1, day, 12, 0, 0);
        return new Intl.DateTimeFormat('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }).format(d);
      }

      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      // Fallback: if it's a generic date string, use local components
      const year = d.getFullYear();
      const month = d.getMonth();
      const day = d.getDate();
      const finalD = new Date(year, month, day);

      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(finalD);
    } catch (e) {
      return dateStr;
    }
  };

  const parseDateSafely = (dateStr, timeStr = '00:00') => {
    if (!dateStr) return new Date(0);
    try {
      if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
        const [hours, minutes] = (timeStr || '00:00').split(':').map(Number);
        return new Date(year, month - 1, day, hours || 0, minutes || 0);
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return new Date(0);
      return d;
    } catch (e) {
      return new Date(0);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return 'No time';
    try {
      if (timeStr.includes(':')) {
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      }
      return timeStr;
    } catch (e) {
      return timeStr;
    }
  };

  const columns = [
    // {
    //   key: 'id',
    //   label: 'Follow-Up ID',
    //   render: (id) => (
    //     <span className="text-xs text-gray-600  whitespace-nowrap">
    //       FU-2025-{String(id).padStart(3, '0')}
    //     </span>
    //   )
    // },
    {
      key: 'related_name',
      label: 'Client',
      render: (name, row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs  text-gray-600 overflow-hidden">
            <img src={`https://i.pravatar.cc/150?u=${name}`} alt={name} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs  text-gray-900">{name || 'N/A'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'current_status',
      label: 'Current Status',
      render: (_, row) => {
        const entityStatus = row.related_type === 'Lead' ? row.lead_status : (row.deal_stage || row.deal_status);
        const quotStatus = row.latest_quotation_status;
        const revisions = row.revision_count;

        if (!entityStatus && !quotStatus) return <span className="text-xs text-gray-400">N/A</span>;

        let colorClass = 'bg-gray-50 text-gray-600';
        if (['Quotation', 'Revised Quotation', 'Sent'].includes(entityStatus || quotStatus)) colorClass = 'bg-blue-50 text-blue-600';
        else if (['Won', 'Accepted'].includes(entityStatus || quotStatus)) colorClass = 'bg-green-50 text-green-600';
        else if (['Lost', 'Declined'].includes(entityStatus || quotStatus)) colorClass = 'bg-red-50 text-red-600';
        else if (['Draft'].includes(entityStatus || quotStatus)) colorClass = 'bg-yellow-50 text-yellow-600';

        return (
          <div className="flex flex-col gap-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-[500] w-fit ${colorClass}`}>
              {entityStatus || 'N/A'}
            </span>
            {quotStatus && (
              <div className="flex items-center gap-1">
                <span className={`text-[9px] ${quotStatus === 'Accepted' ? 'text-green-600' : quotStatus === 'Declined' ? 'text-red-600' : 'text-blue-600'} font-medium`}>
                  Quotation: {quotStatus}
                </span>
                {revisions > 0 && (
                  <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1 rounded">
                    Rev: {revisions}
                  </span>
                )}
              </div>
            )}
            {!quotStatus && (entityStatus === 'Quotation' || entityStatus === 'Qualified') && (
              <span className="text-[9px] text-gray-400">No Quotation Created</span>
            )}
          </div>
        );
      }
    },
    {
      key: 'type',
      label: 'Type',
      render: (type, row) => (
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${getStatusStyle(row.status)}`}>
            {getTypeIcon(type)}
          </div>
          <span className="text-xs  text-gray-700">{type}</span>
        </div>
      )
    },
    {
      key: 'calendar_sync',
      label: 'Calendar',
      render: (_, row) => (
        <div className="flex flex-col items-center">
          {row.calendar_event_id ? (
            <span className="text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded border border-green-100 ">SYNCED</span>
          ) : (
            <span className="text-[9px] bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded border border-gray-100 ">OFFLINE</span>
          )}
        </div>
      )
    },
    {
      key: 'attempt',
      label: 'Attempt',
      render: (attempt) => (
        <div className="flex items-center justify-center w-8">
          <span className="text-xs text-gray-700 ">{attempt}</span>
        </div>
      )
    },
    {
      key: 'next_followup',
      label: 'Next Follow-Up',
      render: (_, row) => {
        if (!row.next_followup_data) {
          return <span className="text-xs text-gray-400 ">No Follow-Up</span>;
        }
        const next = row.next_followup_data;
        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[#067647] ">{formatDate(next.scheduled_date)}</span>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center justify-center bg-[#ECFDF3] rounded px-1.5 py-0.5">
                <ArrowLeft size={10} className="text-[#12B76A]" />
              </div>
              <span className="text-xs text-gray-500 ">{formatTime(next.scheduled_time)}</span>
            </div>
          </div>
        );
      }
    },
    // {
    //   key: 'subject',
    //   label: 'Subject',
    //   render: (subject) => (
    //     <span className="text-xs text-gray-600 truncate max-w-[150px]" title={subject}>
    //       {subject}
    //     </span>
    //   )
    // },
    {
      key: 'scheduled_date',
      label: 'Date',
      render: (date) => (
        <span className="text-xs text-gray-700">{formatDate(date)}</span>
      )
    },
    {
      key: 'scheduled_time',
      label: 'Time',
      render: (time) => (
        <span className="text-xs text-gray-700">{formatTime(time)}</span>
      )
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (priority) => (
        <span className={`px-2 py-0.5 rounded-full text-xs  ${priority === 'High' ? 'bg-orange-50 text-orange-600' :
          priority === 'Medium' ? 'bg-blue-50 text-blue-600' :
            'bg-green-50 text-green-600'
          }`}>
          {priority}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (status) => (
        <span className={`px-2 py-0.5 rounded-md text-xs  ${status === 'Scheduled' ? 'bg-blue-50 text-blue-600' :
          status === 'Completed' ? 'bg-green-50 text-green-600' :
            status === 'Pending' ? 'bg-orange-50 text-orange-600' :
              status === 'Overdue' ? 'bg-red-50 text-red-600' :
                status === 'Client Joined' ? 'bg-green-100 text-green-700 animate-pulse ' :
                  'bg-gray-100 text-gray-600'
          }`}>
          {status}
        </span>
      )
    },
    {
      key: 'outcome',
      label: 'Outcome',
      render: (outcome) => {
        if (!outcome) return <span className="text-gray-400">—</span>;

        let colorClass = 'text-gray-600 bg-gray-50 border-gray-100';

        // Positive outcomes
        if (['Interested', 'Asking for Quotation', 'Meeting Scheduled', 'Converted to Deal', 'Useful', 'Accepted'].includes(outcome)) {
          colorClass = 'text-green-700 bg-green-50 border-green-100';
        }
        // Neutral/Follow-up outcomes
        else if (['Call Back Later', 'Follow-up Required', 'No Answer', 'Neutral'].includes(outcome)) {
          colorClass = 'text-blue-700 bg-blue-50 border-blue-100';
        }
        // Negative/Unqualified outcomes
        else if (['Not Interested', 'Wrong Number', 'Lost', 'Unsuccessful', 'Declined'].includes(outcome)) {
          colorClass = 'text-red-700 bg-red-50 border-red-100';
        }

        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
            {outcome}
          </span>
        );
      }
    },
    // {
    //   key: 'assigned_to_name',
    //   label: 'Assigned To',
    //   render: (name) => (
    //     <div className="flex items-center gap-2">
    //       <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[9px] font-[500]">
    //         {name?.split(' ').map(n => n[0]).join('')}
    //       </div>
    //       <span className="text-xs text-gray-600">{name}</span>
    //     </div>
    //   )
    // },
    {
      key: 'actions',
      label: 'Action',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          {row.outcome === 'Asking for Quotation' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/sales/quotations', {
                  state: {
                    related_type: row.related_type,
                    related_id: row.related_id,
                    related_name: row.related_name,
                    client_email: row.client_email,
                    client_phone: row.client_phone,
                    autoOpenAdd: !row.latest_quotation_status
                  }
                });
              }}
              title={row.latest_quotation_status ? `Quotation Status: ${row.latest_quotation_status}` : "Create Quotation"}
              className={`px-2 py-1 ${row.latest_quotation_status ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded text-xs transition-all flex items-center gap-1`}
            >
              <Calculator size={12} /> {row.latest_quotation_status ? 'VIEW QUOTATION' : 'CREATE QUOTATION'}
            </button>
          )}
          {((row.type === 'Google Meet' || row.type === 'Zoom Meeting') || row.meeting_link) && (row.status === 'Scheduled' || row.status === 'Pending' || row.status === 'Client Joined') && (
            <button
              onClick={(e) => handleJoinMeeting(e, row)}
              title="Join Meeting"
              className={`px-2 py-1 ${row.status === 'Client Joined' ? 'bg-green-600 animate-pulse' : 'bg-white border border-red-200 text-red-500'} rounded text-xs hover:opacity-90 transition-all flex items-center gap-1 `}
            >
              <VideoIcon size={12} className={row.status === 'Client Joined' ? 'text-white' : 'text-red-500'} /> {row.status === 'Client Joined' ? 'JOIN NOW' : 'JOIN'}
            </button>
          )}
          {(() => {
            const isRowFinalized = 
              row.lead_status === 'Converted' || 
              row.deal_status === 'Won' || 
              row.deal_status === 'Lost' || 
              row.deal_status === 'Finalized Deal' ||
              row.outcome === 'Converted to Deal' ||
              row.outcome === 'Won';

            return (
              <>
                {!isRowFinalized && row.status !== 'Completed' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleComplete(row); }}
                    title="Mark Completed"
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                  >
                    <CheckCircle2 size={15} />
                  </button>
                )}
                {!isRowFinalized && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingFollowup(row); setIsAddModalOpen(true); }}
                    title="Edit Follow-up"
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <Edit2 size={15} />
                  </button>
                )}
                {!isRowFinalized && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Create next follow-up with pre-filled data
                      const nextData = {
                        related_type: row.related_type,
                        related_id: row.related_id,
                        related_name: row.related_name,
                        client_email: row.client_email,
                        client_phone: row.client_phone,
                        formal_message: `Dear ${row.related_name || 'Client'}, I would like to schedule a session to discuss our collaboration. Looking forward to connecting with you.`,
                        subject: `Follow-up: ${row.subject.replace('Follow-up: ', '')}`,
                        previous_outcome: row.outcome || 'No outcome recorded',
                        previous_followup_id: row.id,
                        isNextFollowup: true,
                        status: 'Scheduled',
                        type: row.type || 'Call',
                        priority: row.priority || 'High'
                      };
                      setEditingFollowup(nextData);
                      setIsAddModalOpen(true);
                    }}
                    title="Create Next Follow-up"
                    className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
                {!isRowFinalized && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }}
                    title="Delete"
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </>
            );
          })()}
        </div>
      )
    }
  ];

  const processedFollowups = useMemo(() => {
    // Group by related_id and related_type
    const groups = {};
    followups.forEach(f => {
      const key = `${f.related_type}-${f.related_id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });

    // Sort each group by date and time
    Object.entries(groups).forEach(([key, group]) => {
      group.sort((a, b) => {
        return a.id - b.id; // Sort strictly by creation order (database ID) to maintain immutable audit trail
      });
    });

    // Create a flat array in the sorted order to ensure attempt calculation is correct
    const allSorted = Object.values(groups).flat();

    // Assign attempt number and find next followup
    return allSorted.map(f => {
      const key = `${f.related_type}-${f.related_id}`;
      const group = groups[key];
      const index = group.findIndex(item => item.id === f.id);

      const nextFollowup = group[index + 1];

      return {
        ...f,
        attempt: index + 1,
        next_followup_data: nextFollowup || null
      };
    });
  }, [followups]);

  const filteredFollowups = useMemo(() => {
    return processedFollowups.filter(f => {
      // Search logic
      const searchStr = `${f.subject} ${f.related_name || ''} ${f.assigned_to_name || ''}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // Tab logic
      const now = new Date();
      const todayDateString = now.toDateString();
      const fDate = parseDateSafely(f.scheduled_date, f.scheduled_time);
      const fDateString = fDate.toDateString();
      const isToday = fDateString === todayDateString;
      const isOverdue = fDate < new Date(now.setHours(0, 0, 0, 0)) && f.status !== 'Completed';

      if (activeTab === "Today's" && (!isToday || f.status === 'Completed')) return false;
      if (activeTab === 'Overdue' && (!isOverdue || isToday)) return false;
      if (activeTab === 'Scheduled' && f.status !== 'Scheduled') return false;
      if (activeTab === 'Completed' && f.status !== 'Completed') return false;

      // Active Filters logic
      if (activeFilters.related_type?.length > 0 && !activeFilters.related_type.includes(f.related_type)) return false;
      if (activeFilters.priority?.length > 0 && !activeFilters.priority.includes(f.priority)) return false;
      if (activeFilters.status?.length > 0 && !activeFilters.status.includes(f.status)) return false;
      if (activeFilters.assigned_to?.length > 0 && !activeFilters.assigned_to.includes(f.assigned_to_name)) return false;

      // Hide finalized/converted entities to avoid duplication confusion (e.g. Lead -> Deal conversion)
      // unless the user is specifically viewing the 'Completed' tab or searching
      const isFinalized = f.lead_status === 'Converted' || 
                          f.deal_status === 'Won' || 
                          f.deal_status === 'Lost' || 
                          f.deal_status === 'Finalized Deal' ||
                          f.outcome === 'Converted to Deal' ||
                          f.outcome === 'Won';
      
      if (isFinalized && activeTab !== 'Completed' && !searchTerm) {
        return false;
      }

      // Hide IT Project follow-ups (Reports) from Sales-specific dashboards
      const isSalesContext = window.location.pathname.includes('/sales/') || 
                             window.location.pathname.includes('/deals/') || 
                             window.location.pathname.includes('/leads/');
      if (isSalesContext && f.type === 'Report' && f.related_type === 'Customer') {
        return false;
      }

      // Date Range logic
      if (dateRangeType !== 'All Time') {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        if (dateRangeType === 'Today') {
          if (!isToday) return false;
        } else if (dateRangeType === 'Yesterday') {
          const yesterday = new Date(startOfToday);
          yesterday.setDate(yesterday.getDate() - 1);
          if (fDateString !== yesterday.toDateString()) return false;
        } else if (dateRangeType === 'Last 7 Days') {
          const last7 = new Date(startOfToday);
          last7.setDate(last7.getDate() - 7);
          if (fDate < last7) return false;
        } else if (dateRangeType === 'Last 30 Days') {
          const last30 = new Date(startOfToday);
          last30.setDate(last30.getDate() - 30);
          if (fDate < last30) return false;
        } else if (dateRangeType === 'Custom Range' && customDateRange.startDate && customDateRange.endDate) {
          const start = new Date(customDateRange.startDate);
          const end = new Date(customDateRange.endDate);
          end.setHours(23, 59, 59, 999);
          if (fDate < start || fDate > end) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const valA = a[sortConfig.key] || '';
      const valB = b[sortConfig.key] || '';
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [processedFollowups, searchTerm, activeTab, activeFilters, dateRangeType, customDateRange, sortConfig]);

  const clientsWithFollowups = useMemo(() => {
    const groups = {};
    filteredFollowups.forEach(f => {
      const key = `${f.related_type}-${f.related_id}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          id: f.related_id,
          type: f.related_type,
          name: f.related_name,
          followups: [],
          last_followup: null,
          next_followup: null,
          total_count: 0,
          completed_count: 0
        };
      }
      groups[key].followups.push(f);
      groups[key].total_count++;
      if (f.status === 'Completed') groups[key].completed_count++;
    });

    return Object.values(groups).map(client => {
      // Sort followups by date (Oldest First)
      const sorted = [...client.followups].sort((a, b) => {
        return a.id - b.id; // Sort strictly by creation order (database ID) to maintain immutable audit trail
      });

      return {
        ...client,
        followups: sorted,
        last_followup: sorted.find(f => f.status === 'Completed') || sorted[sorted.length - 1],
        next_followup: [...client.followups]
          .filter(f => {
            const now = new Date();
            const fDate = parseDateSafely(f.scheduled_date, f.scheduled_time);
            const isOverdue = fDate < new Date(now.setHours(0, 0, 0, 0)) && f.status !== 'Completed';
            return f.status === 'Scheduled' || f.status === 'Pending' || f.status === 'Overdue' || isOverdue;
          })
          .sort((a, b) => {
            const dateA = parseDateSafely(a.scheduled_date, a.scheduled_time);
            const dateB = parseDateSafely(b.scheduled_date, b.scheduled_time);
            return dateA - dateB; // Earliest first for NEXT followup
          })[0]
      };
    });
  }, [filteredFollowups]);

  const toggleClientExpansion = (key) => {
    setExpandedClients(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const SortByDropdown = () => (
    <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded shadow-xl z-50 py-1">
      {['Newest', 'Oldest'].map(option => (
        <button
          key={option}
          onClick={() => {
            setSortConfig(prev => ({ ...prev, direction: option === 'Newest' ? 'desc' : 'asc' }));
            setOpenDropdown(null);
          }}
          className="w-full p-2 text-left text-xs text-gray-600 hover:bg-gray-50 hover:text-red-600"
        >
          {option}
        </button>
      ))}
    </div>
  );

  const FilterDropdown = () => {
    const sections = [
      { id: 'related_type', label: 'Related Type', options: ['Lead', 'Deal', 'Customer', 'Invoice'] },
      { id: 'priority', label: 'Priority', options: ['High', 'Medium', 'Low'] },
      { id: 'status', label: 'Status', options: ['Scheduled', 'Completed', 'Missed', 'Cancelled'] },
      { id: 'assigned_to', label: 'Assigned To', options: [...new Set(followups.map(f => f.assigned_to_name).filter(Boolean))] },
    ];

    const toggleFilter = (sectionId, option) => {
      setActiveFilters(prev => {
        const current = prev[sectionId] || [];
        const updated = current.includes(option)
          ? current.filter(o => o !== option)
          : [...current, option];
        return { ...prev, [sectionId]: updated };
      });
    };

    return (
      <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded shadow-2xl z-50 flex flex-col max-h-[600px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="p-2 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2 text-gray-900 text-xs ">
            <Filter size={18} className="text-gray-700" /> Filter
          </div>
          <button onClick={() => setOpenDropdown(null)} className="w-4 h-4 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <Plus size={15} className="rotate-45" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 custom-scrollbar p-2">
          {sections.map(section => (
            <div key={section.id} className="mb-1">
              <button
                className={`w-full p-2 flex items-center justify-between text-xs  transition-colors rounded ${expandedFilterSection === section.id ? 'text-gray-900 bg-gray-50' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setExpandedFilterSection(expandedFilterSection === section.id ? null : section.id)}
              >
                <div className="flex items-center gap-2">
                  <ChevronDown size={14} className={`transition-transform duration-200 ${expandedFilterSection === section.id ? '' : '-rotate-90'}`} />
                  {section.label}
                </div>
              </button>
              {expandedFilterSection === section.id && (
                <div className="p-2 pt-1 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {section.options.map(opt => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer group py-0.5">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${activeFilters[section.id]?.includes(opt) ? 'bg-red-600 border-red-600' : 'border-gray-300 group-hover:border-red-400'}`}>
                          {activeFilters[section.id]?.includes(opt) && (
                            <CheckSquare size={12} className="text-white" />
                          )}
                        </div>
                        <input type="checkbox" className="hidden" checked={activeFilters[section.id]?.includes(opt)} onChange={() => toggleFilter(section.id, opt)} />
                        <span className={`text-xs transition-colors ${activeFilters[section.id]?.includes(opt) ? 'text-gray-900 ' : 'text-gray-600 group-hover:text-gray-900'}`}>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="p-2 border-t border-gray-100 grid grid-cols-2 gap-2 bg-gray-50/50">
          <button onClick={() => setActiveFilters({ related_type: [], priority: [], assigned_to: [], status: [] })} className="py-2 border border-gray-200 bg-white rounded text-xs  text-gray-700 hover:bg-gray-50 transition-all ">Reset</button>
          <button onClick={() => setOpenDropdown(null)} className="p-2 bg-red-600 text-white rounded text-xs  hover:bg-red-700 transition-all shadow-md">Apply</button>
        </div>
      </div>
    );
  };

  const ManageColumnsDropdown = () => (
    <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded shadow-2xl z-50 py-3 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="px-4 pb-2 border-b border-gray-50 mb-2">
        <p className="text-xs  text-gray-500 tracking-wider ">Show/Hide Columns</p>
      </div>
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        {Object.keys(columnLabels).map(col => (
          <div
            key={col}
            className="p-2  flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors group"
            onClick={(e) => {
              e.stopPropagation();
              setVisibleColumns(prev =>
                prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
              );
            }}
          >
            <div className="flex items-center gap-2">
              <span className={`text-xs transition-colors ${visibleColumns.includes(col) ? 'text-gray-900 ' : 'text-gray-500'}`}>{columnLabels[col]}</span>
            </div>
            <div className={`w-9 h-5 rounded-full relative transition-all duration-200 p-1 ${visibleColumns.includes(col) ? 'bg-red-600' : 'bg-gray-200'}`}>
              <div className={`w-3 h-3 bg-white rounded-full transition-all duration-200  ${visibleColumns.includes(col) ? 'translate-x-[16px]' : 'translate-x-0'}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const kanbanColumns = [
    { id: 'Scheduled', name: 'Scheduled', color: '#3B82F6' },
    { id: 'Completed', name: 'Completed', color: '#10B981' },
    { id: 'Missed', name: 'Missed', color: '#EF4444' },
    { id: 'Cancelled', name: 'Cancelled', color: '#6B7280' },
  ];

  const groupedFollowups = useMemo(() => {
    return kanbanColumns.map(col => {
      return {
        ...col,
        items: filteredFollowups.filter(f => f.status === col.id)
      };
    });
  }, [filteredFollowups]);

  const FollowupsKanban = () => (
    <div className="flex gap-4 overflow-x-auto p-4 custom-scrollbar min-h-[600px] bg-gray-50/50">
      {groupedFollowups.map(column => (
        <div key={column.id} className="flex-shrink-0 w-80 flex flex-col gap-2">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }}></div>
              <h3 className="text-sm  text-gray-700">{column.name}</h3>
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{column.items.length}</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            {column.items.map(item => (
              <div
                key={item.id}
                className="bg-white p-2 rounded border border-gray-200  hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => { setEditingFollowup(item); setIsAddModalOpen(true); }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-1.5 rounded ${getStatusStyle(item.status)}`}>
                    {getTypeIcon(item.type)}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded  ${getPriorityColor(item.priority)}`}>
                    {item.priority}
                  </span>
                </div>
                <h4 className="text-xs  text-gray-900 mb-1 group-hover:text-red-600 transition-colors">{item.subject}</h4>
                <div className="flex flex-col gap-1 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Building2 size={12} />
                    <span>{item.related_name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>{formatDate(item.scheduled_date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{formatTime(item.scheduled_time)}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-[500]">
                      {item.assigned_to_name?.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-xs text-gray-600">{item.assigned_to_name}</span>
                  </div>
                </div>
              </div>
            ))}
            {column.items.length === 0 && (
              <div className="h-32 border-2 border-dashed border-gray-200 rounded flex items-center justify-center text-xs text-gray-400 ">
                No follow-ups
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-2 bg-[#F7F8F9] min-h-screen space-y-3">
      {/* Metrics Dashboard */}


      <div className="">
        {/* Header Section */}
        <div className="p-2 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-[500] text-gray-900">Follow-Up Management</h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 p-2 border border-gray-200 rounded text-xs  text-gray-600 hover:bg-gray-50 transition-colors">
                <Download size={15} /> Export
              </button>
              <button
                onClick={() => {
                  setEditingFollowup(null);
                  setIsAddModalOpen(true);
                }}
                className="flex items-center gap-2 p-2 bg-red-600 text-white rounded text-xs font-[500] hover:bg-red-700 transition-all shadow-md shadow-red-100"
              >
                <Plus size={15} /> Add Follow-Up
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar Section */}
        <div className="p-2 ">
          <div className="flex items-center  p-1 rounded mb-2">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`p-2 rounded-md text-xs  transition-all ${activeTab === tab
                  ? 'bg-white text-red-600  border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              {/* Search Bar */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                />
              </div>

              {/* Sort By */}
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                  className=" p-2 border border-gray-200 rounded text-xs text-gray-700 flex items-center gap-2 bg-white hover:bg-gray-50 transition-colors"
                >
                  <ChevronsUpDown size={14} className="text-gray-400" />
                  <span className=" text-gray-900">{sortConfig.direction === 'asc' ? 'Oldest' : 'Newest'}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${openDropdown === 'sort' ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === 'sort' && <SortByDropdown />}
              </div>

              {/* Date Range */}
              <div className="relative">
                <DateRangeDropdown
                  value={dateRangeType}
                  onChange={setDateRangeType}
                  onDateRangeChange={setCustomDateRange}
                  options={['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'Custom Range']}
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-2">
              {/* Tabs for quick filtering */}


              <div className="flex items-center gap-2">
                {/* Filter */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'filter' ? null : 'filter')}
                    className={`h-9 px-3 border rounded text-xs flex items-center gap-2 transition-all ${openDropdown === 'filter' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <Filter size={15} />
                    <span>Filter</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${openDropdown === 'filter' ? 'rotate-180' : ''}`} />
                  </button>
                  {openDropdown === 'filter' && <FilterDropdown />}
                </div>

                {/* Manage Columns */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'columns' ? null : 'columns')}
                    className="h-9 px-3 border border-gray-200 rounded text-xs text-gray-700 flex items-center gap-2 bg-white hover:bg-gray-50"
                  >
                    <LayoutGrid size={15} className="text-gray-400" />
                    <span>Manage Columns</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${openDropdown === 'columns' ? 'rotate-180' : ''}`} />
                  </button>
                  {openDropdown === 'columns' && <ManageColumnsDropdown />}
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center border border-gray-200 rounded bg-white overflow-hidden p-0.5 ml-1">
                  <button
                    onClick={() => { setViewMode('list'); setIsGroupedView(false); }}
                    className={`w-7 h-7 flex items-center justify-center rounded ${viewMode === 'list' && !isGroupedView ? 'bg-red-50 text-red-600  border border-red-100' : 'text-gray-400 hover:bg-gray-50'}`}
                    title="List View"
                  >
                    <List size={14} />
                  </button>
                  <button
                    onClick={() => { setViewMode('list'); setIsGroupedView(true); }}
                    className={`w-7 h-7 flex items-center justify-center rounded ${isGroupedView ? 'bg-red-50 text-red-600  border border-red-100' : 'text-gray-400 hover:bg-gray-50'}`}
                    title="Grouped View (Nested)"
                  >
                    <Layout size={14} />
                  </button>
                  <button
                    onClick={() => { setViewMode('kanban'); setIsGroupedView(false); }}
                    className={`w-7 h-7 flex items-center justify-center rounded ${viewMode === 'kanban' ? 'bg-red-50 text-red-600  border border-red-100' : 'text-gray-400 hover:bg-gray-50'}`}
                    title="Kanban View"
                  >
                    <LayoutGrid size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nested Tables / List View / Kanban View */}
        <div className="p-0">
          {isGroupedView ? (
            <div className="bg-white border border-gray-200 rounded  overflow-hidden mx-2 mb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F9FAFB] border-b border-gray-200">
                    <tr>
                      <th className="p-2 text-center"></th>
                      <th className="p-2 text-xs text-gray-700 font-[500]">Client / Related Entity</th>
                      <th className="p-2 text-xs text-gray-700 font-[500]">Type</th>
                      <th className="p-2 text-xs text-gray-700 font-[500]">Current Status</th>
                      <th className="p-2 text-xs text-gray-700 font-[500]">Total Follow-ups</th>
                      <th className="p-2 text-xs text-gray-700 font-[500]">Last Outcome</th>
                      <th className="p-2 text-xs text-gray-700 font-[500]">Next Follow-up</th>
                      <th className="p-2 text-xs text-gray-700 font-[500] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clientsWithFollowups.map(client => {
                      const isFinalized = client.followups.some(f => 
                        f.lead_status === 'Converted' || 
                        f.deal_status === 'Won' || 
                        f.deal_status === 'Lost' || 
                        f.deal_status === 'Finalized Deal' ||
                        f.outcome === 'Converted to Deal' ||
                        f.outcome === 'Won'
                      );

                      return (
                        <React.Fragment key={client.key}>
                          <tr
                          onClick={() => toggleClientExpansion(client.key)}
                          className={`hover:bg-gray-50/80 transition-colors cursor-pointer ${expandedClients[client.key] ? 'bg-gray-50/50' : ''}`}
                        >
                          <td className="p-2 text-center">
                            <ChevronDown
                              size={15}
                              className={`text-gray-400 transition-transform duration-200 ${expandedClients[client.key] ? '' : '-rotate-90'}`}
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-xs font-[500] text-red-600">
                                {client.name?.split(' ').map(n => n[0]).join('') || '?'}
                              </div>
                              <span className="text-xs  text-gray-900">{client.name || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full ">{client.type}</span>
                          </td>
                          <td className="p-2">
                            {(() => {
                              const entityStatus = client.type === 'Lead' ? client.last_followup?.lead_status : (client.last_followup?.deal_stage || client.last_followup?.deal_status);
                              const quotStatus = client.last_followup?.latest_quotation_status;
                              const revisions = client.last_followup?.revision_count || 0;

                              if (!entityStatus && !quotStatus) return <span className="text-xs text-gray-400">N/A</span>;

                              let colorClass = 'bg-gray-50 text-gray-600';
                              if (['Quotation', 'Revised Quotation', 'Sent'].includes(entityStatus || quotStatus)) colorClass = 'bg-blue-50 text-blue-600';
                              else if (['Won', 'Accepted'].includes(entityStatus || quotStatus)) colorClass = 'bg-green-50 text-green-600';
                              else if (['Lost', 'Declined'].includes(entityStatus || quotStatus)) colorClass = 'bg-red-50 text-red-600';
                              else if (['Draft'].includes(entityStatus || quotStatus)) colorClass = 'bg-yellow-50 text-yellow-600';

                              return (
                                <div className="flex flex-col gap-1">
                                  {entityStatus && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-[500] w-fit ${colorClass}`}>
                                      {entityStatus}
                                    </span>
                                  )}
                                  {quotStatus && (
                                    <div className="flex items-center gap-1">
                                      <span className={`text-[9px] ${quotStatus === 'Accepted' ? 'text-green-600' : quotStatus === 'Declined' ? 'text-red-600' : 'text-blue-600'} font-medium`}>
                                        Quotation: {quotStatus}
                                      </span>
                                      {revisions > 0 && (
                                        <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1 rounded">
                                          Rev: {revisions}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {!quotStatus && (entityStatus === 'Quotation' || entityStatus === 'Qualified') && (
                                    <span className="text-[9px] text-gray-400">No Quotation Created</span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-700 ">{client.total_count}</span>
                              <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full"
                                  style={{ width: `${(client.completed_count / client.total_count) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{client.completed_count} done</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <span className={`text-xs ${client.last_followup?.outcome ? 'text-green-600  ' : 'text-gray-400'}`}>
                              {client.last_followup?.outcome || 'No outcome'}
                            </span>
                          </td>
                          <td className="p-2">
                            {client.next_followup ? (
                              <div className="flex flex-col">
                                <span className="text-xs text-red-600 ">{formatDate(client.next_followup.scheduled_date)}</span>
                                <span className="text-xs text-gray-500">{formatTime(client.next_followup.scheduled_time)}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 ">None scheduled</span>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {/* Parent-row + button removed to prevent sequence mismatch */}
                          </td>
                        </tr>
                        {expandedClients[client.key] && (
                          <tr>
                            <td colSpan={8} className="p-0 bg-gray-50/30">
                              <div className="p-2 bg-gray-50/30 border-t border-b border-gray-100">
                                <div className="border border-gray-200 rounded bg-white ">
                                  <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                      <tr>
                                        <th className="p-2 text-xs  text-gray-500  font-[500]">Attempt</th>
                                        <th className="p-2 text-xs  text-gray-500  font-[500]">Type</th>
                                        <th className="p-2 text-xs  text-gray-500  font-[500]">Date & Time</th>
                                        <th className="p-2 text-xs  text-gray-500  font-[500]">Subject</th>
                                        <th className="p-2 text-xs  text-gray-500  font-[500]">Status</th>
                                        <th className="p-2 text-xs  text-gray-500  font-[500]">Outcome</th>
                                        <th className="p-2 text-xs  text-gray-500  font-[500] text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                      {client.followups.map((f, idx) => (
                                        <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                                          <td className="p-2 text-xs text-gray-500">#{f.attempt}</td>
                                          <td className="p-2">
                                            <div className="flex items-center gap-1.5">
                                              <div className={`p-1 rounded ${getStatusStyle(f.status)}`}>
                                                {getTypeIcon(f.type)}
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <span className="text-xs text-gray-700">{f.type}</span>
                                                {['Google Meet', 'Zoom Meeting', 'Internal Video Call', 'Demo'].includes(f.type) && f.calendar_event_id && (
                                                  <span 
                                                    className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" 
                                                    title="Synced to Google Calendar"
                                                  />
                                                )}
                                              </div>
                                            </div>
                                          </td>
                                          <td className="p-2">
                                            <div className="flex flex-col">
                                              <span className="text-xs text-gray-900 ">{formatDate(f.scheduled_date)}</span>
                                              <span className="text-xs text-gray-500">{formatTime(f.scheduled_time)}</span>
                                            </div>
                                          </td>
                                          <td className="p-2 text-xs text-gray-700 font-[500] w-fit truncate" title={f.subject}>{f.subject}</td>
                                          <td className="p-2">
                                            <span className={`px-2 py-0.5 rounded text-xs  ${f.status === 'Scheduled' ? 'bg-blue-50 text-blue-600' :
                                              f.status === 'Completed' ? 'bg-green-50 text-green-600' :
                                                'bg-red-50 text-red-600'
                                              }`}>
                                              {f.status}
                                            </span>
                                          </td>
                                          <td className="p-2 text-xs  text-gray-600">
                                            {f.outcome || '—'}
                                          </td>
                                          <td className="p-2 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                              {(['Asking for Quotation', 'Revise Quotation'].includes(f.outcome) || (f.subject && f.subject.includes('Send Revised Quotation'))) && (
                                                <div className="flex items-center gap-1">
                                                  {f.latest_quotation_status && (
                                                    <span className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-200 font-medium whitespace-nowrap">
                                                      Quotation: {f.latest_quotation_status}
                                                    </span>
                                                  )}
                                                  <button
                                                    onClick={async (e) => {
                                                      e.stopPropagation();
                                                      try {
                                                        const res = await estimationsAPI.getAll();
                                                        const allEsts = Array.isArray(res) ? res : (res.data || []);
                                                        // Sort to get latest quotation for this entity
                                                        const matchingEsts = allEsts.filter(est => 
                                                          (f.related_type === 'Lead' && est.lead_id === f.related_id) ||
                                                          (f.related_type === 'Deal' && est.deal_id === f.related_id) ||
                                                          (f.related_type === 'Customer' && est.client_id === f.related_id)
                                                        ).sort((a, b) => b.id - a.id);
                                                        
                                                        const matchingEst = matchingEsts[0];

                                                        if (matchingEst) {
                                                          setQuotationInitialData({
                                                            ...matchingEst,
                                                            quotationNumber: matchingEst.estimation_number || matchingEst.quotation_number,
                                                            quotationDate: matchingEst.estimate_date,
                                                            validUntil: matchingEst.expiry_date,
                                                            client: matchingEst.client_name || matchingEst.lead_name || f.related_name,
                                                            lead_id: f.related_type === 'Lead' ? f.related_id : null,
                                                            deal_id: f.related_type === 'Deal' ? f.related_id : null,
                                                            client_email: f.client_email,
                                                            client_phone: f.client_phone,
                                                            isFromFollowup: true,
                                                          });
                                                        } else {
                                                          setQuotationInitialData({
                                                            client: f.related_name,
                                                            client_id: f.related_type === 'Customer' ? f.related_id : null,
                                                            lead_id: f.related_type === 'Lead' ? f.related_id : null,
                                                            deal_id: f.related_type === 'Deal' ? f.related_id : null,
                                                            client_email: f.client_email,
                                                            client_phone: f.client_phone,
                                                          });
                                                        }
                                                        setIsQuotationModalOpen(true);
                                                      } catch (err) {
                                                        console.error(err);
                                                      }
                                                    }}
                                                    className={`p-1 flex items-center gap-1 ${f.latest_quotation_status ? 'text-blue-600 hover:bg-blue-50' : 'text-green-600 hover:bg-green-50'} rounded transition-colors`}
                                                    title={f.latest_quotation_status ? "View Quotations" : "Create Quotation"}
                                                  >
                                                    <Calculator size={12} />
                                                  </button>
                                                </div>
                                              )}
                                              {f.status === 'Scheduled' && ['Google Meet', 'Zoom Meeting', 'Internal Video Call', 'Demo'].includes(f.type) && (
                                                <button
                                                  onClick={(e) => handleJoinMeeting(e, f)}
                                                  className="px-2 py-1 text-red-600 hover:bg-red-50 border border-red-200 rounded flex items-center gap-1  transition-all"
                                                  title="Join Meeting"
                                                >
                                                  <VideoIcon size={12} />
                                                  <span className="text-xs font-medium">JOIN</span>
                                                </button>
                                              )}
                                              {!isFinalized && f.status === 'Completed' && !client.next_followup && idx === client.followups.length - 1 && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingFollowup({
                                                      related_type: f.related_type,
                                                      related_id: f.related_id,
                                                      related_name: f.related_name,
                                                      client_email: f.client_email,
                                                      client_phone: f.client_phone,
                                                      previous_followup_id: f.id,
                                                      subject: `Follow-up #${client.followups.length} for ${client.name}`,
                                                      type: 'Call',
                                                      priority: 'Medium',
                                                      status: 'Scheduled',
                                                      isNextFollowup: true
                                                    });
                                                    setIsAddModalOpen(true);
                                                  }}
                                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                  title="Create Next Followup"
                                                >
                                                  <PlusCircle size={14} />
                                                </button>
                                              )}
                                              {!isFinalized && f.status !== 'Completed' && (
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); handleComplete(f); }}
                                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                  title="Mark as Completed"
                                                >
                                                  <CheckCircle2 size={14} />
                                                </button>
                                              )}
                                              {!isFinalized && (
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); setEditingFollowup(f); setIsAddModalOpen(true); }}
                                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                  title="Edit Follow-up"
                                                >
                                                  <Edit2 size={14} />
                                                </button>
                                              )}
                                              {!isFinalized && (
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }}
                                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                  title="Delete"
                                                >
                                                  <Trash2 size={14} />
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )})}
                    {clientsWithFollowups.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-gray-500">
                          No clients with follow-ups found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <AdvancedDataTable
              columns={columns}
              data={filteredFollowups}
              loading={loading}
              hideInternalHeader={true}
              externalVisibleColumns={visibleColumns}
              kanbanView={<FollowupsKanban />}
              initialViewMode={viewMode}
              searchKeys={['subject', 'related_name', 'assigned_to_name']}
              externalSearchTerm={searchTerm}
              onRowClick={(row) => {
                setEditingFollowup(row);
                setIsAddModalOpen(true);
              }}
            />
          )}
        </div>
      </div>

      <AddFollowupModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingFollowup(null);
        }}
        onSubmit={handleAddFollowup}
        initialData={editingFollowup}
      />
      
      <AddNewEstimationModal
        isOpen={isQuotationModalOpen}
        onClose={() => {
          setIsQuotationModalOpen(false);
          setQuotationInitialData(null);
        }}
        onSubmit={handleAddQuotation}
        initialData={quotationInitialData}
        onGeneratePDF={() => {}}
      />
    </div>
  );
};

export default FollowupsPage;

