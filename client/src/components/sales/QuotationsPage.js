import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Plus, MoreVertical, FileText, Send, Copy, Trash2, Eye, Edit2, FileJson, LayoutGrid, List, ChevronDown, RotateCcw, Maximize, Search, Star, Filter, ChevronUp, Printer, ChevronsUpDown, Hash, CircleDollarSign, Calendar, Clock, Wallet, ExternalLink, User, Mail, Phone } from 'lucide-react';
import Swal from 'sweetalert2';
import AddNewEstimationModal from '../common/AddNewEstimationModal';
import DateRangeDropdown from '../common/DateRangeDropdown';
import ReviseQuotationModal from './ReviseQuotationModal';
import { estimationsAPI, dealsAPI, leadsAPI, activitiesAPI } from '../../services/api';
import { showSuccessToast } from '../../utils/toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const QuotationsPage = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('kanban');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterDateRange, setFilterDateRange] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isReviseModalOpen, setIsReviseModalOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [quotations, setQuotations] = useState([]);
  const [selectedQuotationVersions, setSelectedQuotationVersions] = useState([]);
  const [draggedQuotation, setDraggedQuotation] = useState(null);
  const draggedItemRef = useRef(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const lastUpdateRef = useRef(0);
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    if (location.state?.autoOpenAdd) {
      const data = location.state;
      const initialData = {
        related_type: data.related_type,
        related_id: data.related_id,
        client_name: data.related_name,
        company_name: data.related_name,
        client_email: data.client_email,
        client_phone: data.client_phone,
        lead_id: data.related_type === 'Lead' ? data.related_id : '',
        deal_id: data.related_type === 'Deal' ? data.related_id : ''
      };
      setSelectedQuotation(initialData);
      setIsModalOpen(true);

      // Clear state to avoid reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const toggleRow = (itemId) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(itemId)) {
      newExpandedRows.delete(itemId);
    } else {
      newExpandedRows.add(itemId);
    }
    setExpandedRows(newExpandedRows);
  };

  // Advanced Table States
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [dateRangeType, setDateRangeType] = useState('All Time');
  const [customDateRange, setCustomDateRange] = useState({ startDate: null, endDate: null });
  const [visibleColumns, setVisibleColumns] = useState({
    'Estimations ID': true,
    'Client': true,
    'Amount': true,
    'Project': true,
    'Business Type': true,
    'Date': true,
    'Expiry Date': false,
    'Estimation By': true,
    'Status': true,
    'Action': true
  });
  const [activeFilters, setActiveFilters] = useState({
    project: [],
    client: [],
    status: [],
    owner: []
  });
  const [openDropdown, setOpenDropdown] = useState(null); // 'sort', 'date', 'filter', 'columns', 'export'
  const [expandedFilterSection, setExpandedFilterSection] = useState('project');

  const columns = [
    { id: 'Draft', name: 'Draft', color: '#FDB022' },
    { id: 'Sent', name: 'Sent', color: '#0D9488' },
    { id: 'Revised', name: 'Revised', color: '#6366F1' },

    { id: 'Accepted', name: 'Accepted', color: '#10B981' },
    { id: 'Declined', name: 'Declined', color: '#EF4444' },
  ];

  const statusColors = {
    'Draft': { light: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-500', dot: 'bg-orange-500' },
    'Sent': { light: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-500', dot: 'bg-teal-500' },
    'Revised': { light: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-500', dot: 'bg-indigo-500' },
    'Accepted': { light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-500', dot: 'bg-emerald-500' },
    'Finalized': { light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-500', dot: 'bg-emerald-500' },
    'Declined': { light: 'bg-red-50', text: 'text-red-700', border: 'border-red-500', dot: 'bg-red-500' },
  };

  const getStatusColor = (status) => {
    const colors = {
      'Draft': '#FDB022',
      'Sent': '#0D9488',
      'Revised': '#6366F1',

      'Accepted': '#10B981',
      'Finalized': '#10B981',
      'Declined': '#EF4444',
    };
    return colors[status] || '#6B7280';
  };

  const getCardValue = (item, field) => {
    const fieldMap = {
      company: () => {
        const name = item.client_name || item.company || item.company_name || item.lead_name;
        return name && name !== 'N/A' ? name : 'N/A';
      },
      type: () => item.project_name || item.type || 'N/A',
      businessType: () => item.business_type || 'N/A',
      desc: () => item.desc || item.description || 'N/A',
      estimateId: () => item.estimateId || item.estimate_id || item.estimation_number || 'N/A',
      amount: () => item.amount ? `${item.currency || '$'}${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
      date: () => item.date || item.estimate_date || 'N/A',
      expiry: () => item.expiry || item.expiry_date || 'N/A',
      avatar: () => item.avatar || (item.company || item.company_name || item.client_name || 'N')[0],
      owner: () => {
        const firstName = item.owner || item.creator_first_name;
        const lastName = item.creator_last_name;
        if (firstName && lastName) return `${firstName} ${lastName}`;
        return firstName || 'N/A';
      },
    };
    return fieldMap[field] ? fieldMap[field]() : '';
  };

  const isFetchingVersionsRef = useRef(false);

  useEffect(() => {
    if (selectedQuotation?.id && (isViewModalOpen || isReviseModalOpen)) {
      if (isFetchingVersionsRef.current) return;

      const fetchVersions = async () => {
        isFetchingVersionsRef.current = true;
        try {
          const filters = {};
          if (selectedQuotation.deal_id) filters.deal_id = selectedQuotation.deal_id;
          if (selectedQuotation.lead_id) filters.lead_id = selectedQuotation.lead_id;

          const estimations = await estimationsAPI.getAll(filters);
          if (Array.isArray(estimations)) {
            const sorted = [...estimations].sort((a, b) =>
              new Date(b.created_at) - new Date(a.created_at)
            );
            setSelectedQuotationVersions(sorted);
          }
        } catch (err) {
          console.error('Error fetching versions:', err);
        } finally {
          isFetchingVersionsRef.current = false;
        }
      };
      fetchVersions();
    }
  }, [selectedQuotation?.id, isViewModalOpen, isReviseModalOpen]);

  useEffect(() => {
    fetchQuotations();

    // Polling interval for background updates
    const interval = setInterval(() => {
      // Use refs or direct checks to see if we should skip
      // We check the states directly here to avoid re-creating the interval
      // Note: Since this is inside the interval, we need to be careful about stale closures
      // if we use state variables. However, we're using fetchQuotations(true) which
      // now has its own internal isFetchingRef check.

      // We'll use a safer approach by not depending on state for the interval creation
      fetchQuotations(true);
    }, 15000); // 15 seconds for stability

    return () => clearInterval(interval);
  }, []); // Only once on mount

  const handleReviseQuotation = async (quotation) => {
    try {
      const confirm = await Swal.fire({
        title: 'Revise Quotation?',
        text: 'This will create a new version of this quotation.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#E62E14',
        confirmButtonText: 'Yes, Revise'
      });

      if (confirm.isConfirmed) {
        setIsUpdating(true);
        const nextVersion = (quotation.version || 1) + 1;
        const revisedData = {
          ...quotation,
          estimation_number: `${quotation.estimation_number}-V${nextVersion}`,
          status: 'Revised',
          parent_id: quotation.id,
          version: nextVersion,
          estimate_date: new Date().toISOString().split('T')[0],
        };

        delete revisedData.id;
        delete revisedData.created_at;
        delete revisedData.updated_at;
        delete revisedData.client_name;
        delete revisedData.lead_name;

        const result = await estimationsAPI.create(revisedData);

        // Send email automatically for revision
        const email = quotation.client_email || quotation.lead_email || quotation.email;
        if (email && result.id) {
          try {
            await fetch(`${process.env.REACT_APP_API_URL || API_BASE_URL + ''}/estimations/${result.id}/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            console.log('✅ Revision email sent successfully');
          } catch (emailErr) {
            console.warn('Failed to send revision email:', emailErr);
          }
        }

        await fetchQuotations();
        showSuccessToast('New version created and sent to client');
      }
    } catch (err) {
      console.error('Error revising quotation:', err);
      Swal.fire('Error', 'Failed to revise quotation', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFinalizeQuotation = async (quotation) => {
    try {
      const result = await Swal.fire({
        title: 'Finalize Quotation',
        text: 'Has this quotation been Accepted or Declined?',
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Accepted',
        denyButtonText: 'Declined',
        confirmButtonColor: '#10B981',
        denyButtonColor: '#EF4444',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        await handleStatusChange(quotation.id, 'Accepted');
      } else if (result.isDenied) {
        await handleStatusChange(quotation.id, 'Declined');
      }
    } catch (err) {
      console.error('Error finalizing quotation:', err);
      Swal.fire('Error', 'Failed to finalize quotation', 'error');
    }
  };

  const handleStatusChange = async (quotationId, newStatus) => {
    try {
      setIsUpdating(true);
      lastUpdateRef.current = Date.now();

      // Get the quotation before update to check links
      const quotation = quotations.find(q => q.id === quotationId);

      // Optimistic update
      const updatedQuotations = quotations.map(q =>
        q.id === quotationId ? { ...q, status: newStatus } : q
      );
      setQuotations(updatedQuotations);

      await estimationsAPI.update(quotationId, { status: newStatus });

      // Sync with Deal and Lead stages
      if (quotation) {
        const dealIdToUpdate = quotation.deal_id || (quotation.lead_id ? Number(quotation.lead_id) + 1000000 : null);
        const leadIdToUpdate = quotation.lead_id;

        // Map quotation status to Deal stage
        let newDealStage = null;
        if (newStatus === 'Accepted') newDealStage = 'Won';
        else if (newStatus === 'Declined') newDealStage = 'Lost';
        else if (newStatus === 'Sent' || newStatus === 'Revised') newDealStage = 'Quotation';
        else if (newStatus === 'Draft') newDealStage = 'Quotation';

        if (newDealStage) {
          if (dealIdToUpdate) {
            try {
              await dealsAPI.update(dealIdToUpdate, {
                pipeline: newDealStage,
                deal_stage: newDealStage,
                status: newStatus === 'Accepted' ? 'Won' : (newStatus === 'Declined' ? 'Lost' : (newStatus === 'Sent' || newStatus === 'Revised' ? 'Quotation' : 'Open'))
              });
            } catch (err) {
              console.warn('Failed to sync deal status:', err);
            }
          }

          if (leadIdToUpdate) {
            try {
              await leadsAPI.update(leadIdToUpdate, {
                status: newDealStage === 'Lost' ? 'Lost' : newDealStage
              });
            } catch (err) {
              console.warn('Failed to sync lead status:', err);
            }
          }
        }

        // Log activity for status change
        try {
          const isVirtual = !isNaN(parseInt(dealIdToUpdate)) && parseInt(dealIdToUpdate) > 1000000;
          await activitiesAPI.create({
            title: `${newStatus === 'Sent' || newStatus === 'Revised' ? 'Quotation Sent' : `Quotation Status: ${newStatus}`}`,
            description: `Quotation ${quotation.estimation_number || quotation.id} status changed to ${newStatus}.`,
            activity_type: (newStatus === 'Sent' || newStatus === 'Revised') ? 'Email' : 'Activity',
            lead_id: leadIdToUpdate,
            deal_id: isVirtual ? null : dealIdToUpdate,
            status: 'Completed',
            priority: 'Medium'
          });
        } catch (err) {
          console.warn('Failed to log status change activity:', err);
        }
      }

      // Success: No need to fetch immediately
      setActionMenu(null);
      showSuccessToast(`Status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating status:', err);
      // On error, refresh from server
      fetchQuotations(true);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendMail = async (quotation) => {
    try {
      const { value: email } = await Swal.fire({
        title: 'Send Quotation via Email',
        input: 'email',
        inputLabel: 'Recipient Email',
        inputValue: quotation.email || '',
        showCancelButton: true,
        confirmButtonColor: '#E62E14',
      });

      if (email) {
        setIsUpdating(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL || API_BASE_URL + ''}/estimations/${quotation.id}/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to send email');
        }

        await handleStatusChange(quotation.id, 'Sent');
        const successData = await response.json();
        showSuccessToast(successData.message || `Quotation sent to ${email}`);
      }
    } catch (err) {
      console.error('Error sending mail:', err);
      Swal.fire('Error', 'Failed to send email', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const isFetchingRef = useRef(false);

  const fetchQuotations = async (isSilent = false) => {
    // Avoid fetching while an update is in flight or another fetch is running
    if (isFetchingRef.current || (isSilent && isUpdating)) return;

    isFetchingRef.current = true;
    if (!isSilent) setIsLoadingQuotations(true);
    try {
      const [estimationsRes, dealsRes, leadsRes] = await Promise.all([
        estimationsAPI.getAll(),
        dealsAPI.getAll(),
        leadsAPI.getAll()
      ]);

      const estimations = Array.isArray(estimationsRes) ? estimationsRes : [];
      const deals = Array.isArray(dealsRes) ? dealsRes : (dealsRes?.data || []);
      const leads = Array.isArray(leadsRes) ? leadsRes : [];

      const joinedData = estimations.map(est => {
        const linkedDeal = est.deal_id ? deals.find(d => d.id.toString() === est.deal_id.toString()) : null;
        const linkedLead = est.lead_id ? leads.find(l => l.id.toString() === est.lead_id.toString()) : null;

        // Fetch project name (prefer deal_name if linked to deal)
        const projectName = est.project_name || (linkedDeal ? (linkedDeal.project_name || linkedDeal.deal_name || linkedDeal.company_name) : '') || (linkedLead ? linkedLead.project_name : '') || '';

        // Fetch client name
        const clientName = est.client_name || est.company || (linkedDeal ? (linkedDeal.client_name || linkedDeal.company_name) : '') || (linkedLead ? (linkedLead.lead_name || linkedLead.name) : '') || 'Unknown Client';

        // Fetch business type
        const businessType = est.business_type || (linkedDeal ? linkedDeal.business_type : '') || (linkedLead ? linkedLead.business_type : '') || 'N/A';

        // Fetch referral name
        const referralName = est.referral_name || (linkedDeal ? linkedDeal.referral_name : '') || (linkedLead ? linkedLead.referral_name : '') || 'N/A';

        // Fetch client info
        const clientEmail = est.email || (linkedDeal ? linkedDeal.contact_email : '') || (linkedLead ? (linkedLead.email || linkedLead.contact_email) : '') || '';
        const clientPhone = est.phone || (linkedDeal ? linkedDeal.contact_phone : '') || (linkedLead ? (linkedLead.phone || linkedLead.contact_phone) : '') || '';
        const businessDescription = est.description || (linkedDeal ? linkedDeal.description : '') || (linkedLead ? (linkedLead.notes || linkedLead.description) : '') || '';

        return {
          ...est,
          project_name: projectName,
          client_name: clientName,
          business_type: businessType,
          referral_name: referralName,
          client_email: clientEmail,
          client_phone: clientPhone,
          business_description: businessDescription,
          deal_name: linkedDeal ? (linkedDeal.deal_name || linkedDeal.name) : '',
          dealName: linkedDeal ? (linkedDeal.deal_name || linkedDeal.name) : '',
          company: clientName // for legacy compatibility in helper functions
        };
      });

      // Additional safety check for silent updates to prevent race conditions
      // Ignore silent updates during a "grace period" after a manual update
      const timeSinceUpdate = Date.now() - lastUpdateRef.current;
      if (isSilent && (isUpdating || draggedQuotation || timeSinceUpdate < 3000)) {
        console.log('📋 Skipping silent update to prevent state overwrite (Grace period)');
        return;
      }

      setQuotations(joinedData);
    } catch (err) {
      console.error('Error fetching quotations:', err);
      if (!isSilent) setQuotations([]);
    } finally {
      isFetchingRef.current = false;
      if (!isSilent) setIsLoadingQuotations(false);
    }
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ChevronsUpDown size={14} className="text-[#1F2020]" />;
    return sortConfig.direction === 'asc' ? <ChevronDown size={14} className="rotate-180 text-red " /> : <ChevronDown size={14} className="text-red " />;
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const isWithinDateRange = (dateStr, rangeType) => {
    if (rangeType === 'All Time' || !dateStr) return true;
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (rangeType) {
      case 'Today':
        return date >= today;
      case 'Yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return date >= yesterday && date < today;
      }
      case 'Last 7 Days': {
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        return date >= last7;
      }
      case 'Last 30 Days': {
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        return date >= last30;
      }
      case 'This Month':
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      case 'Last Month': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
      }
      case 'Custom Range': {
        if (!customDateRange.startDate || !customDateRange.endDate) return true;
        const start = new Date(customDateRange.startDate);
        const end = new Date(customDateRange.endDate);
        end.setHours(23, 59, 59, 999);
        return date >= start && date <= end;
      }
      default:
        return true;
    }
  };

  const filteredQuotations = useMemo(() => {
    let result = quotations.filter(q => {
      const searchLower = searchTerm.toLowerCase();
      const clientName = (q.company || q.client_name || '').toLowerCase();
      const quotationId = (q.estimateId || q.estimate_id || q.estimation_number || '').toLowerCase();
      const status = (q.status || '').toLowerCase();
      const projectName = (q.project_name || q.type || '').toLowerCase();
      const businessType = (q.business_type || '').toLowerCase();

      const matchesSearch =
        clientName.includes(searchLower) ||
        quotationId.includes(searchLower) ||
        status.includes(searchLower) ||
        projectName.includes(searchLower) ||
        businessType.includes(searchLower);

      const matchesStatus = activeFilters.status.length === 0 || activeFilters.status.includes(q.status);
      const matchesClient = activeFilters.client.length === 0 || activeFilters.client.includes(q.company || q.client_name);
      const matchesProject = activeFilters.project.length === 0 || activeFilters.project.includes(q.project_name);
      const matchesDate = isWithinDateRange(q.estimate_date || q.date, dateRangeType);

      return matchesSearch && matchesStatus && matchesClient && matchesProject && matchesDate;
    });

    // Sorting
    return result.sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA, valB;

      switch (key) {
        case 'estimateId':
          valA = a.estimateId || a.estimate_id || '';
          valB = b.estimateId || b.estimate_id || '';
          break;
        case 'company':
          valA = a.company || a.client_name || '';
          valB = b.company || b.client_name || '';
          break;
        case 'amount':
          valA = parseFloat(a.amount || 0);
          valB = parseFloat(b.amount || 0);
          break;
        case 'date':
          valA = new Date(a.estimate_date || a.date || 0);
          valB = new Date(b.estimate_date || b.date || 0);
          break;
        case 'expiry':
          valA = new Date(a.expiry_date || a.expiry || 0);
          valB = new Date(b.expiry_date || b.expiry || 0);
          break;
        case 'status':
          valA = a.status || '';
          valB = b.status || '';
          break;
        case 'type':
          valA = a.project_name || a.type || '';
          valB = b.project_name || b.type || '';
          break;
        case 'owner':
          valA = a.owner_name || a.owner || '';
          valB = b.owner_name || b.owner || '';
          break;
        default:
          valA = a[key] || '';
          valB = b[key] || '';
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [quotations, searchTerm, activeFilters, dateRangeType, sortConfig]);

  const rootQuotations = useMemo(() => {
    return filteredQuotations.filter(q => !q.parent_id);
  }, [filteredQuotations]);

  const getAllDescendants = (parentId) => {
    let descendants = [];
    const directChildren = quotations.filter(q => q.parent_id === parentId);

    // Sort direct children by version or date if needed
    directChildren.forEach(child => {
      descendants.push(child);
      descendants.push(...getAllDescendants(child.id));
    });
    return descendants;
  };

  const groupedQuotations = useMemo(() => {
    // For Kanban view, only show the latest version of each quotation
    const parentIds = new Set(filteredQuotations.map(q => q.parent_id).filter(id => id !== null && id !== undefined));
    const latestQuotations = filteredQuotations.filter(q => !parentIds.has(q.id));

    return columns.map(col => {
      const colLeads = latestQuotations.filter(q => {
        const status = (q.status || '').toLowerCase();
        const colId = col.id.toLowerCase();
        const isRevision = (q.version || 1) > 1 || q.parent_id;

        if (colId === 'sent') {
          return status === 'sent' && !isRevision;
        }
        if (colId === 'revised') {
          return status === 'revised' || (status === 'sent' && isRevision);
        }
        if (colId === 'accepted') {
          return status === 'accepted' || status === 'finalized';
        }
        return status === colId;
      });
      return {
        ...col,
        items: colLeads,
        totalAmount: colLeads.reduce((sum, q) => sum + parseFloat(q.amount || 0), 0)
      };
    });
  }, [filteredQuotations, columns]);

  const handleAddQuotation = async (formData) => {
    if (!formData) {
      console.warn('⚠️ handleAddQuotation called without formData');
      await fetchQuotations();
      return;
    }
    try {
      const tagsString = formData.tags && Array.isArray(formData.tags) && formData.tags.length > 0 ? JSON.stringify(formData.tags) : null;
      const isVirtualDeal = formData.deal_id && !isNaN(formData.deal_id) && Number(formData.deal_id) > 1000000;
      const quotationData = {
        estimation_number: formData.quotationNumber || formData.estimation_number || null,
        client_id: formData.client_id || (formData.client && !isNaN(formData.client) ? parseInt(formData.client) : null),
        lead_id: (formData.lead_id && !isNaN(formData.lead_id)) ? parseInt(formData.lead_id) : (isVirtualDeal ? (Number(formData.deal_id) - 1000000) : null),
        deal_id: isVirtualDeal ? null : (formData.deal_id || null),
        project_id: formData.project_id || formData.project || null,
        bill_to: formData.billTo || null,
        ship_to: formData.shipTo || null,
        amount: parseFloat(formData.amount || 0),
        currency: formData.currency,
        estimate_date: formData.estimate_date || formData.estimateDate || formData.quotationDate || null,
        expiry_date: formData.expiry_date || formData.expiryDate || formData.validUntil || null,
        status: formData.status || 'Draft',
        tags: tagsString,
        description: formData.description || (formData.client && isNaN(formData.client) ? `Client: ${formData.client}` : null),
        estimate_by: formData.estimate_by || formData.assignedExecutiveId || formData.assignedExecutive || null,
        discount_percentage: parseFloat(formData.discount_percentage || 0),
        discount_amount: parseFloat(formData.discount_amount || formData.discount || 0),
        tax_percentage: parseFloat(formData.tax_percentage || 10),
        tax_amount: parseFloat(formData.tax_amount || 0),
        subtotal: parseFloat(formData.subtotal || 0),
        total: parseFloat(formData.amount || 0),
      };

      let response;
      if (selectedQuotation && isEditModalOpen) {
        response = await estimationsAPI.update(selectedQuotation.id, quotationData);

        // Update deal status and value if linked and status is Sent
        const dealIdToUpdate = formData.deal_id_original || quotationData.deal_id || (formData.deal_id && !isNaN(formData.deal_id) && Number(formData.deal_id) > 1000000 ? formData.deal_id : null);
        if (dealIdToUpdate && quotationData.status === 'Sent') {
          try {
            const stage = 'Quotation';
            await dealsAPI.update(dealIdToUpdate, {
              pipeline: stage,
              deal_stage: stage,
              deal_value: quotationData.amount
            });
          } catch (err) {
            console.warn('Failed to update deal status and value:', err);
          }
        }

        // Update lead status if linked and status is Sent
        const leadIdToUpdate = quotationData.lead_id;
        if (leadIdToUpdate && quotationData.status === 'Sent') {
          try {
            const stage = 'Quotation';
            await leadsAPI.update(leadIdToUpdate, { status: stage });
          } catch (err) {
            console.warn('Failed to update lead status:', err);
          }
        }

        // Log activity if Sent
        if (quotationData.status === 'Sent') {
          try {
            const isVirtual = !isNaN(parseInt(dealIdToUpdate)) && parseInt(dealIdToUpdate) > 1000000;
            await activitiesAPI.create({
              title: `Quotation Sent: ${quotationData.estimation_number}`,
              description: `Quotation ${quotationData.estimation_number} sent to client. Amount: ${quotationData.currency} ${quotationData.amount}`,
              activity_type: 'Email',
              lead_id: leadIdToUpdate,
              deal_id: isVirtual ? null : dealIdToUpdate,
              status: 'Completed',
              priority: 'Medium'
            });
          } catch (err) {
            console.warn('Failed to log quotation sent activity:', err);
          }
        }

        // Send email if requested
        if (formData.shouldSendEmail) {
          try {
            const email = formData.client_email || formData.email;
            if (email) {
              const sendEmailRes = await fetch(`${process.env.REACT_APP_API_URL || API_BASE_URL + ''}/estimations/${selectedQuotation.id}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
              });
              if (sendEmailRes.ok) {
                console.log('✅ Email sent automatically after update');
              }
            }
          } catch (emailErr) {
            console.warn('Failed to send automatic email:', emailErr);
          }
        }

        showSuccessToast('Quotation updated successfully');
      } else {
        response = await estimationsAPI.create(quotationData);

        // Update deal status and value if linked and status is Sent
        const dealIdToUpdate = formData.deal_id_original || quotationData.deal_id || (formData.deal_id && !isNaN(formData.deal_id) && Number(formData.deal_id) > 1000000 ? formData.deal_id : null);
        if (dealIdToUpdate && quotationData.status === 'Sent') {
          try {
            const stage = 'Quotation';
            await dealsAPI.update(dealIdToUpdate, {
              pipeline: stage,
              deal_stage: stage,
              deal_value: quotationData.amount
            });
          } catch (err) {
            console.warn('Failed to update deal status and value:', err);
          }
        }

        // Update lead status if linked and status is Sent
        const leadIdToUpdate = quotationData.lead_id;
        if (leadIdToUpdate && quotationData.status === 'Sent') {
          try {
            const stage = 'Quotation';
            await leadsAPI.update(leadIdToUpdate, { status: stage });
          } catch (err) {
            console.warn('Failed to update lead status:', err);
          }
        }

        // Log activity if Sent
        if (quotationData.status === 'Sent') {
          try {
            const isVirtual = !isNaN(parseInt(dealIdToUpdate)) && parseInt(dealIdToUpdate) > 1000000;
            await activitiesAPI.create({
              title: `Quotation Sent: ${quotationData.estimation_number}`,
              description: `Quotation ${quotationData.estimation_number} sent to client. Amount: ${quotationData.currency} ${quotationData.amount}`,
              activity_type: 'Email',
              lead_id: leadIdToUpdate,
              deal_id: isVirtual ? null : dealIdToUpdate,
              status: 'Completed',
              priority: 'Medium'
            });
          } catch (err) {
            console.warn('Failed to log quotation sent activity:', err);
          }
        }

        // Save line items if present
        if (formData.items && formData.items.length > 0 && response.id) {
          const itemPromises = formData.items.map(item => {
            const itemData = {
              item_name: item.productName || item.item_name,
              description: item.description,
              quantity: parseFloat(item.quantity || 1),
              rate: parseFloat(item.rate || 0),
              discount_percent: 0, // Default for now
              tax_percent: 10, // Matching modal hardcoded value
            };
            return estimationsAPI.createItem(response.id, itemData);
          });
          await Promise.all(itemPromises);
        }

        // Send email if requested
        if (formData.shouldSendEmail && response.id) {
          try {
            const email = formData.client_email || formData.email;
            if (email) {
              const sendEmailRes = await fetch(`${process.env.REACT_APP_API_URL || API_BASE_URL + ''}/estimations/${response.id}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
              });
              if (sendEmailRes.ok) {
                console.log('✅ Email sent automatically after creation');
              }
            }
          } catch (emailErr) {
            console.warn('Failed to send automatic email:', emailErr);
          }
        }

        showSuccessToast('Quotation added successfully');
      }
      await fetchQuotations();
      setIsModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedQuotation(null);
    } catch (err) {
      console.error('Error handling quotation:', err);
      throw err;
    }
  };

  const ViewQuotationModal = ({ isOpen, onClose, quotation }) => {
    const [items, setItems] = useState([]);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const isFetchingItemsRef = useRef(false);

    useEffect(() => {
      if (isOpen && quotation?.items) {
        setItems(quotation.items);
        return;
      }
      if (isOpen && quotation?.id && quotation.id !== 'NEW') {
        const fetchItems = async () => {
          if (isFetchingItemsRef.current) return;
          isFetchingItemsRef.current = true;
          setIsLoadingItems(true);
          try {
            const data = await estimationsAPI.getItems(quotation.id);
            if (Array.isArray(data)) {
              setItems(data);
            }
          } catch (err) {
            console.error('Error fetching quotation items:', err);
          } finally {
            setIsLoadingItems(false);
            isFetchingItemsRef.current = false;
          }
        };
        fetchItems();
      }
    }, [isOpen, quotation?.id, quotation?.items]);

    if (!isOpen || !quotation) return null;

    // Calculate totals
    const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.subtotal) || (parseFloat(item.rate) * parseFloat(item.quantity)) || 0), 0);
    const discountAmount = parseFloat(quotation.discount_amount) || (subTotal * (parseFloat(quotation.discount_percentage) || 0) / 100);
    const taxAmount = parseFloat(quotation.tax_amount) || ((subTotal - discountAmount) * (parseFloat(quotation.tax_percentage) || 10) / 100);
    const totalAmount = parseFloat(quotation.amount) || (subTotal - discountAmount + taxAmount);

    const formatCurrency = (val) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: quotation.currency || 'INR',
        minimumFractionDigits: 2
      }).format(val);
    };

    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white h-full w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="flex justify-between items-center p-2 border-b border-gray-100 bg-white">
            <div className="flex items-center2gap-4">
              <h2 className="text-xl font-[500] text-gray-900">
                Quotation <span className="text-red-500 ml-1">#{getCardValue(quotation, 'estimateId')}</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <button className="flex items-center gap-2 p-2 bg-[#E62E14] border border-[#E62E14] rounded text-xs  text-white hover:bg-[#D12812] transition-all">
                  Download <ChevronDown size={15} />
                </button>

                {/* Download Dropdown */}
                <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded  shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[200] py-2 overflow-hidden transform origin-top-right scale-95 group-hover:scale-100">
                  <button
                    onClick={() => handleDownloadPDF({ ...quotation, items })}
                    className="w-full px-5 py-3 text-left text-[14px]  text-gray-600 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="w-full px-5 py-3 text-left text-[14px]  text-gray-600 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    Print Quotation
                  </button>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-all border border-red-100 "
              >
                <Plus size={15} className="rotate-45" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar print:p-0" id="quotation-print-area">
            {/* Status and Summary Header */}
            <div className="bg-gray-50/50 rounded p-2 border border-gray-100 mb-8">
              <div className="flex flex-wrap items-center justify-between gap-6 mb-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-[500] text-gray-900">Estimation Details</h3>
                  <span
                    className="px-3 py-1 text-xs font-[500] rounded-md inline-block "
                    style={{ backgroundColor: getStatusColor(quotation.status) + '20', color: getStatusColor(quotation.status) }}
                  >
                    {quotation.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500  mb-1">Project Name</p>
                  <p className="text-sm font-[500] text-gray-900">{quotation.project_name || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-gray-400  mb-1">Estimate Date</p>
                  <p className="text-xs font-[500] text-gray-900">{getCardValue(quotation, 'date') !== 'N/A' ? new Date(getCardValue(quotation, 'date')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400  mb-1">Expiry Date</p>
                  <p className="text-xs font-[500] text-gray-900">{getCardValue(quotation, 'expiry') !== 'N/A' ? new Date(getCardValue(quotation, 'expiry')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400  mb-1">Referral Name</p>
                  <p className="text-xs font-[500] text-gray-900">{quotation.referral_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400  mb-1">Business Type</p>
                  <p className="text-xs font-[500] text-gray-900">{quotation.business_type || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Client Info Section */}
            <div className="grid grid-cols-1 gap-8 p-2 bg-gray-50/50  rounded border border-gray-100 ">
              <div className="space-y-2">
                <div >
                  <p className="text-xs text-gray-400  mb-3 font-[500]">Client Personal Info</p>
                  <div className='grid grid-cols-3'>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                        <User size={14} className="text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-[600] text-gray-900 leading-none">{quotation.client_name || 'N/A'}</p>
                        <p className="text-xs text-gray-500 mt-1">Client Name</p>
                      </div>
                    </div>
                    {quotation.client_email && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                          <Mail size={14} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-[500] text-gray-800 leading-none">{quotation.client_email}</p>
                          <p className="text-xs text-gray-500 mt-1">Email Address</p>
                        </div>
                      </div>
                    )}
                    {quotation.client_phone && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                          <Phone size={14} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-[500] text-gray-800 leading-none">{quotation.client_phone}</p>
                          <p className="text-xs text-gray-500 mt-1">Phone Number</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-4 border-l border-gray-100 pl-8">
                <div>
                  <p className="text-xs text-gray-400  mb-3 font-[500]">About Business</p>
                  <div className="bg-white p-42rounded border border-gray-100 ">
                    <p className="text-xs text-gray-600 leading-relaxed italic">
                      {quotation.business_description || quotation.business_type || 'No business description provided.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-gray-100 rounded  overflow-hidden mb-8 ">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-2 text-xs font-[500] text-gray-400 ">Job Description</th>
                    <th className="p-2 text-xs font-[500] text-gray-400  text-center">Qty</th>
                    <th className="p-2 text-xs font-[500] text-gray-400  text-right">Price</th>
                    <th className="p-2 text-xs font-[500] text-gray-400  text-right">Discount</th>
                    <th className="p-2 text-xs font-[500] text-gray-400  text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoadingItems ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-400 text-xs italic">Loading items...</td>
                    </tr>
                  ) : items.length > 0 ? (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-2">
                          <p className="text-sm font-[500] text-gray-900">{item.item_name}</p>
                          {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                          {item.duration && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-1 inline-block">{item.duration}</span>}
                        </td>
                        <td className="p-2 text-sm text-gray-600 text-center">{item.quantity}</td>
                        <td className="p-2 text-sm text-gray-600 text-right">{formatCurrency(item.rate)}</td>
                        <td className="p-2 text-sm text-gray-600 text-right">{formatCurrency(item.discount_amount || 0)}</td>
                        <td className="p-2 text-sm font-[500] text-gray-900 text-right">{formatCurrency(item.total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-400 text-xs italic">No items found for this quotation</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end mb-10">
              <div className="w-full max-w-xs space-y-3 px-2">
                <div className="flex justify-between items-center text-sm ">
                  <span className="text-gray-500">Sub Total</span>
                  <span className="text-gray-900 ">{formatCurrency(subTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm ">
                  <span className="text-gray-500">Discount ({quotation.discount_percentage || 0}%)</span>
                  <span className="text-gray-900 ">-{formatCurrency(discountAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm ">
                  <span className="text-gray-500">Tax ({quotation.tax_percentage || 10}%)</span>
                  <span className="text-gray-900 ">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <span className="text-base font-[500] text-gray-900">Total Amount</span>
                  <span className="text-xl font-black text-red-600">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-2 p-2 mb-2">
              <h4 className="text-xs font-[500] text-gray-400 ">Terms and Conditions</h4>
              <p className="text-xs text-gray-500 leading-relaxed ">
                The products/services listed in this invoice will be delivered/provided as per the specifications and schedule detailed in the invoice or as agreed upon by both parties in previous communications.
              </p>
            </div>

            {/* Version History & Revision */}
            <div className="space-y-2 p-2 mb-2 no-print">
              <div className="bg-white border border-gray-200 rounded ">
                <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                  <h4 className="text-sm font-[500] text-gray-800">Version History</h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {selectedQuotationVersions.length > 0 ? (
                    selectedQuotationVersions.map((v, idx) => (
                      <div key={v.id} className="p-2 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelectedQuotation(v)}>
                        <div className="flex items-center p-2 gap-4">
                          <div className={`w-10 h-10 rounded flex items-center justify-center text-xs font-[500]  ${v.id === quotation.id ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                            V{selectedQuotationVersions.length - idx}
                          </div>
                          <div>
                            <h5 className={`text-sm font-[500] ${v.id === quotation.id ? 'text-red-600' : 'text-gray-800'}`}>{v.status} Quotation</h5>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400">
                                {new Date(v.estimate_date).toLocaleDateString('en-GB')}
                              </span>
                              <div className={`w-2 h-2 rounded-full ${v.status === 'Draft' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-[500] text-gray-900">
                          {formatCurrency(v.amount)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-400 text-xs">No version history found</div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded ">
                <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                  <h4 className="text-sm font-[500] text-gray-800">Revision Details</h4>
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="text-sm  text-gray-600">Create Revision</span>
                  <button
                    onClick={() => setIsReviseModalOpen(true)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    <span className="sr-only">Create Revision</span>
                    <div className="w-full flex justify-end">
                      <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleDragStart = (e, quotation) => {
    setDraggedQuotation(quotation);
    draggedItemRef.current = quotation;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('application/json', JSON.stringify(quotation));
        e.dataTransfer.setData('text/plain', String(quotation.id));
      } catch (err) {
        console.error('Error setting drag data:', err);
      }

      // Use setTimeout to change opacity so the drag ghost image remains fully opaque
      const target = e.currentTarget;
      setTimeout(() => {
        if (target) {
          target.classList.add('opacity-40');
        }
      }, 0);
    }
  };

  const handleDragEnd = (e) => {
    if (e.currentTarget) {
      e.currentTarget.classList.remove('opacity-40');
    }

    // Small delay to allow handleDrop to process before clearing state
    setTimeout(() => {
      setDraggedQuotation(null);
      draggedItemRef.current = null;
      setDragOverStatus(null);
    }, 100);
  };

  const handleDragOver = (e, status) => {
    if (e) {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
    }
    if (dragOverStatus !== status) {
      setDragOverStatus(status);
    }
  };

  const handleDrop = async (e, newStatus) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setDragOverStatus(null);
    let quotationToUpdate = draggedItemRef.current || draggedQuotation;

    if (!quotationToUpdate && e && e.dataTransfer) {
      try {
        const id = e.dataTransfer.getData('text/plain');
        if (id) {
          quotationToUpdate = quotations.find(q => String(q.id) === id);
        }
      } catch (err) {
        console.error('Error retrieving drop data:', err);
      }
    }

    if (!quotationToUpdate) return;

    const currentStatus = (quotationToUpdate.status || '').toLowerCase();
    const targetStatus = (newStatus || '').toLowerCase();

    if (currentStatus === targetStatus) return;

    try {
      await handleStatusChange(quotationToUpdate.id, newStatus);
    } catch (err) {
      console.error('Error handling drop:', err);
    } finally {
      setDraggedQuotation(null);
      draggedItemRef.current = null;
    }
  };

  const handleDelete = async (id) => {
    try {
      await estimationsAPI.delete(id);
      await fetchQuotations();
      setActionMenu(null);
    } catch (err) {
      console.error('Error deleting quotation:', err);
    }
  };

  const handleDownloadPDF = (quotation) => {
    const printWindow = window.open('', '_blank');
    const items = quotation.items || [];

    // Calculate totals if not already there
    const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const discountAmount = parseFloat(quotation.discount_amount || 0);
    const taxAmount = parseFloat(quotation.tax_amount || 0);
    const totalAmount = parseFloat(quotation.amount || subTotal - discountAmount + taxAmount);

    const formatCurrency = (val) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: quotation.currency || 'INR',
        minimumFractionDigits: 2
      }).format(val);
    };

    const html = `
      <html>
        <head>
          <title>Quotation #${quotation.estimation_number || quotation.id}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; margin: 0; padding: 40px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #E62E14; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #E62E14; }
            .quotation-info { text-align: right; }
            .info-grid { display: grid; grid-template-cols: repeat(3, 1fr); gap: 30px; margin-bottom: 40px; }
            .info-section h4 { margin: 0 0 10px 0; color: #666; font-size: 12px; text-transform: ; }
            .info-section p { margin: 2px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f9fafb; text-align: left; padding: 12px; font-size: 12px; text-transform: ; color: #666; border-bottom: 1px solid #eee; }
            td { padding: 12px; font-size: 14px; border-bottom: 1px solid #eee; }
            .totals { display: flex; justify-content: flex-end; }
            .totals-table { width: 300px; }
            .totals-table tr td { border: none; padding: 5px 12px; }
            .totals-table .grand-total { font-size: 18px; font-weight: bold; color: #E62E14; border-top: 1px solid #eee; padding-top: 10px; }
            .footer { margin-top: 50px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">CRMS</div>
            <div class="quotation-info">
              <h2 style="margin:0">QUOTATION</h2>
              <p style="margin:5px 0">#${quotation.estimation_number || quotation.id}</p>
              <p style="margin:5px 0; color:#666; font-size:14px;">Date: ${new Date(quotation.estimate_date).toLocaleDateString('en-GB')}</p>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-section">
              <h4>Client Information</h4>
              <p><strong>${quotation.client_name || 'N/A'}</strong></p>
              ${quotation.client_email ? `<p style="color:#666; font-size:13px; margin-top:5px;">${quotation.client_email}</p>` : ''}
              ${quotation.client_phone ? `<p style="color:#666; font-size:13px;">${quotation.client_phone}</p>` : ''}
            </div>
            <div class="info-section">
              <h4>Business Context</h4>
              <p><strong>Project:</strong> ${quotation.project_name || 'N/A'}</p>
              <p><strong>Business Type:</strong> ${quotation.business_type || 'N/A'}</p>
              <p style="color:#666; font-size:13px; margin-top:5px; font-style: italic;">
                ${quotation.business_description || 'No business description provided.'}
              </p>
            </div>
            <div class="info-section">
              <h4>Quotation Details</h4>
              <p><strong>Referral:</strong> ${quotation.referral_name || 'N/A'}</p>
              <p><strong>Date:</strong> ${new Date(quotation.estimate_date).toLocaleDateString('en-GB')}</p>
              <p><strong>Valid Until:</strong> ${quotation.expiry_date ? new Date(quotation.expiry_date).toLocaleDateString('en-GB') : 'N/A'}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Service Description</th>
                <th style="text-align:center">Qty</th>
                <th style="text-align:right">Rate</th>
                <th style="text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>
                    <strong>${item.item_name}</strong><br/>
                    <small style="color:#666">${item.description || ''}</small>
                    ${item.duration ? `<br/><small style="color:#E62E14">${item.duration}</small>` : ''}
                  </td>
                  <td style="text-align:center">${item.quantity}</td>
                  <td style="text-align:right">${formatCurrency(item.rate)}</td>
                  <td style="text-align:right">${formatCurrency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <table class="totals-table">
              <tr>
                <td>Sub Total</td>
                <td style="text-align:right">${formatCurrency(subTotal)}</td>
              </tr>
              <tr>
                <td>Discount (${quotation.discount_percentage || 0}%)</td>
                <td style="text-align:right">-${formatCurrency(discountAmount)}</td>
              </tr>
              <tr>
                <td>Tax (${quotation.tax_percentage || 10}%)</td>
                <td style="text-align:right">${formatCurrency(taxAmount)}</td>
              </tr>
              <tr class="grand-total">
                <td>Grand Total</td>
                <td style="text-align:right">${formatCurrency(totalAmount)}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p><strong>Terms & Conditions:</strong></p>
            <p>The products/services listed in this invoice will be delivered/provided as per the specifications and schedule detailed in the invoice or as agreed upon by both parties in previous communications.</p>
            <p style="text-align:center; margin-top:30px;">Thank you for your business!</p>
          </div>

          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSendQuotation = async (quotation) => {
    try {
      const quotationNumber = quotation.estimateId || quotation.estimation_number || `QUO-${quotation.id}`;

      const result = await Swal.fire({
        title: 'Send Quotation?',
        html: `<p>Send <strong>${quotationNumber}</strong> to client?</p>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Send it!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        console.log(`🔄 Sending quotation ${quotation.id}...`);
        await estimationsAPI.send(quotation.id, { action_by: 1 });

        // Update deal status to Quotation
        const dealIdToUpdate = quotation.deal_id || (quotation.lead_id ? Number(quotation.lead_id) + 1000000 : null);
        if (dealIdToUpdate) {
          try {
            await dealsAPI.update(dealIdToUpdate, {
              pipeline: 'Quotation',
              deal_stage: 'Quotation',
              status: 'Quotation'
            });
          } catch (err) {
            console.warn('Failed to sync deal status on send:', err);
          }
        }

        await Swal.fire({
          title: 'Success!',
          html: `<p>Quotation <strong>${quotationNumber}</strong> sent successfully!</p>`,
          icon: 'success',
          confirmButtonColor: '#3085d6',
          timer: 2000,
          timerProgressBar: true
        });

        setActionMenu(null);
        await fetchQuotations();
      }
    } catch (err) {
      console.error('Error sending quotation:', err);
      await Swal.fire({
        title: 'Error',
        html: `<p>Failed to send quotation: ${err.message}</p>`,
        icon: 'error',
        confirmButtonColor: '#d33'
      });
    }
  };

  const handleConvertToInvoice = async (quotation) => {
    try {
      const quotationNumber = quotation.estimateId || quotation.estimation_number || `QUO-${quotation.id}`;

      const result = await Swal.fire({
        title: 'Convert to Invoice?',
        html: `<p>Convert quotation <strong>${quotationNumber}</strong> to an invoice?</p>
               <p style="font-size: 0.9em; color: #666; margin-top: 10px;">Amount: <strong>${quotation.currency || '$'}${parseFloat(quotation.amount || 0).toLocaleString()}</strong></p>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Convert it!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        console.log(`🔄 Converting quotation ${quotation.id} to invoice...`);
        const response = await estimationsAPI.convertToInvoice(quotation.id, { created_by: 1 });

        await Swal.fire({
          title: 'Success!',
          html: `<p>Quotation converted to invoice successfully!</p>
                 <p style="font-size: 0.9em; color: #666; margin-top: 10px;"><strong>${response.invoiceNumber || 'Invoice'}</strong></p>
                 <p style="font-size: 0.85em; color: #666; margin-top: 15px; padding: 8px; background: #f0f9ff; border-left: 3px solid #3b82f6; border-radius: 4px;">
                   ✅ New invoice will appear in Invoices page in a few seconds
                 </p>`,
          icon: 'success',
          confirmButtonColor: '#16a34a',
          confirmButtonText: 'OK',
          allowOutsideClick: false,
          allowEscapeKey: false
        });

        setActionMenu(null);
        await fetchQuotations();
      }
    } catch (err) {
      console.error('Error converting to invoice:', err);
      await Swal.fire({
        title: 'Error',
        html: `<p>Failed to convert to invoice: ${err.message}</p>`,
        icon: 'error',
        confirmButtonColor: '#d33'
      });
    }
  };

  const handlePrint = () => {
    window.print();
    setActionMenu(null);
  };

  const ActionMenu = ({ quotation, onClose, className = "right-0 top-10" }) => (
    <div className={`absolute ${className} bg-white border border-gray-100 rounded  shadow-2xl z-[100] w-56 text-left py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setSelectedQuotation(quotation);
          setIsEditModalOpen(true);
          onClose();
        }}
        className="w-full p-2  text-left text-xs  text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors group"
      >
        <Edit2 size={15} className="text-[#1F2020] group-hover:text-gray-600" />
        <span>Edit</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(quotation.id);
          onClose();
        }}
        className="w-full p-2  text-left text-xs  text-red  hover:bg-red-50 flex items-center gap-3 transition-colors group"
      >
        <Trash2 size={15} className="text-red-500" />
        <span>Delete</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setSelectedQuotation(quotation);
          setIsReviseModalOpen(true);
          onClose();
        }}
        className="w-full p-2  text-left text-xs  text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors group"
      >
        <Copy size={15} className="text-[#1F2020] group-hover:text-gray-600" />
        <span>Revise Quotation</span>
      </button>

      {quotation.status === 'Sent' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleFinalizeQuotation(quotation);
            onClose();
          }}
          className="w-full p-2  text-left text-xs  text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors group"
        >
          <RotateCcw size={15} className="text-[#1F2020] group-hover:text-gray-600" />
          <span>Finalize Quotation</span>
        </button>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDownloadPDF(quotation);
          onClose();
        }}
        className="w-full p-2  text-left text-xs  text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors group"
      >
        <Download size={15} className="text-[#1F2020] group-hover:text-gray-600" />
        <span>Download PDF</span>
      </button>

      {quotation.status === 'Draft' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSendMail(quotation);
            onClose();
          }}
          className="w-full p-2  text-left text-xs  text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors group"
        >
          <Send size={15} className="text-[#1F2020] group-hover:text-gray-600" />
          <span>Send via Email</span>
        </button>
      )}

      <div className="p-2 mt-1">
        <span className="text-xs  text-[#1F2020] ">Status</span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setSelectedQuotation(quotation);
          setIsViewModalOpen(true);
          onClose();
        }}
        className="w-full p-2  text-left text-xs  text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors group"
      >
        <Eye size={15} className="text-[#1F2020] group-hover:text-gray-600" />
        <span>View Estimation</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleStatusChange(quotation.id, 'Accepted');
          onClose();
        }}
        className="w-full p-2  text-left text-xs  text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors group"
      >
        <RotateCcw size={15} className="text-[#1F2020] group-hover:text-gray-600" />
        <span>Mark as Accepted</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleStatusChange(quotation.id, 'Draft');
          onClose();
        }}
        className="w-full p-2  text-left text-xs  text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors group"
      >
        <RotateCcw size={15} className="text-[#1F2020] group-hover:text-gray-600" />
        <span>Mark as Draft</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleStatusChange(quotation.id, 'Declined');
          onClose();
        }}
        className="w-full p-2  text-left text-xs  text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors group"
      >
        <RotateCcw size={15} className="text-[#1F2020] group-hover:text-gray-600" />
        <span>Mark as Declined</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handlePrint();
          onClose();
        }}
        className="w-full p-2  text-left text-xs  text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors group"
      >
        <Printer size={15} className="text-[#1F2020] group-hover:text-gray-600" />
        <span>Print</span>
      </button>
    </div>
  );

  const SortByDropdown = () => (
    <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded shadow-xl z-50 py-1">
      {['Newest', 'Oldest'].map(option => (
        <button
          key={option}
          onClick={() => {
            handleSort('date');
            setSortConfig(prev => ({ ...prev, direction: option === 'Newest' ? 'desc' : 'asc' }));
            setOpenDropdown(null);
          }}
          className="w-full p-2 text-left text-xs  text-gray-600 hover:bg-gray-50 hover:text-red "
        >
          {option}
        </button>
      ))}
    </div>
  );

  const FilterDropdown = () => {
    const sections = [
      { id: 'project', label: 'Project', options: [...new Set(quotations.map(q => q.project_name).filter(Boolean))] },
      { id: 'client', label: 'Client Name', options: [...new Set(quotations.map(q => q.company || q.client_name).filter(Boolean))] },
      { id: 'date', label: 'Date of Estimation', options: ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days'] },
      { id: 'owner', label: 'Estimated By', options: [...new Set(quotations.map(q => q.owner_name).filter(Boolean))] },
      { id: 'expiry', label: 'Expiry Date', options: ['Next 7 Days', 'Next 30 Days'] },
      { id: 'status', label: 'Status', options: ['Draft', 'Sent', 'Revised', 'Accepted', 'Declined'] },
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
      <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded  shadow-2xl z-50 flex flex-col max-h-[600px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
        <div className=" border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2 text-gray-900  text-xs">
            <Filter size={15} className="text-gray-700" /> Filter
          </div>
          <button onClick={() => setOpenDropdown(null)} className="w-4 h-4 rounded-full flex items-center justify-center text-[#1F2020] hover:bg-red-50 hover:text-red  transition-colors">
            <Plus size={15} className="rotate-45" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 custom-scrollbar p-2">
          {sections.map(section => (
            <div key={section.id} >
              <button
                className={`w-full p-2 flex items-center justify-between text-xs   transition-colors rounded ${expandedFilterSection === section.id ? 'text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setExpandedFilterSection(expandedFilterSection === section.id ? null : section.id)}
              >
                <div className="flex items-center gap-2">
                  <ChevronDown size={14} className={`transition-transform duration-200 ${expandedFilterSection === section.id ? '' : '-rotate-90'}`} />
                  {section.label}
                </div>
              </button>
              {expandedFilterSection === section.id && (
                <div className="p-2 pt-1 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="relative mb-3">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F2020]" />
                    <input type="text" placeholder="Search" className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs  focus:outline-none focus:ring-1 focus:ring-red-500 transition-all" />
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {section.options.length > 0 ? section.options.map(opt => (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer group py-0.5">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${activeFilters[section.id]?.includes(opt) ? 'bg-red-600 border-red-600' : 'border-gray-200 group-hover:border-red-400'}`}>
                          {activeFilters[section.id]?.includes(opt) && (
                            <div className="w-2 h-2 bg-white rounded-sm transform rotate-45 border-b-2 border-r-2 border-red-600" />
                          )}
                        </div>
                        <input type="checkbox" className="hidden" checked={activeFilters[section.id]?.includes(opt)} onChange={() => toggleFilter(section.id, opt)} />
                        <span className={`text-xs  transition-colors ${activeFilters[section.id]?.includes(opt) ? 'text-gray-900 ' : 'text-gray-600 group-hover:text-gray-900'}`}>{opt}</span>
                      </label>
                    )) : <p className="text-[12px] text-[#1F2020]  py-2 pl-1">No options available</p>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="p-2 border-t border-gray-100 grid grid-cols-2 gap-2 bg-gray-50/50">
          <button onClick={() => setActiveFilters({ project: [], client: [], status: [], owner: [] })} className="py-2  border border-gray-200 bg-white rounded text-xs   text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all ">Reset</button>
          <button onClick={() => setOpenDropdown(null)} className="p-2 bg-red-600 text-white rounded text-xs   hover:bg-red-700 transition-all shadow-md active:scale-[0.98]">Filter</button>
        </div>
      </div>
    );
  };

  const ManageColumnsDropdown = () => {
    return (
      <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded  shadow-2xl z-50 py-3 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="px-4 pb-2 border-b border-gray-50 mb-2">
          <p className="text-xs  text-[#1F2020]  tracking-wider">Show/Hide Columns</p>
        </div>
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          {Object.keys(visibleColumns).map(col => (
            <div
              key={col}
              className="p-2  flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors group"
              onClick={(e) => {
                e.stopPropagation();
                setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5 opacity-20 group-hover:opacity-40 transition-opacity">
                  <div className="w-3.5 h-0.5 bg-gray-900 rounded-full" />
                  <div className="w-3.5 h-0.5 bg-gray-900 rounded-full" />
                  <div className="w-3.5 h-0.5 bg-gray-900 rounded-full" />
                </div>
                <span className={`text-xs  transition-colors ${visibleColumns[col] ? 'text-gray-900 ' : 'text-gray-500'}`}>{col}</span>
              </div>
              <div
                className={`w-10 h-5.5 rounded-full relative transition-all duration-200 p-1 ${visibleColumns[col] ? 'bg-red-600' : 'bg-gray-200'}`}
              >
                <div
                  className={`w-3.5 h-3.5 bg-white rounded-full transition-all duration-200  ${visibleColumns[col] ? 'translate-x-[18px]' : 'translate-x-0'}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };


  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length + 3;

  return (
    <div className="flex-1 flex flex-col bg-[#F9FAFB] p-2 font-sans">
      {/* Header */}

      <div className="flex items-center justify-between gap-2 mb-3 p-2">
        <div>
          <h1 className="text-xl font-[500] text-gray-900">
            Quotations
            <span className="inline-block p-1  bg-red-50 text-red  text-xs  rounded-full border border-red-100">
              {filteredQuotations.length}
            </span>
          </h1>
          <nav className="text-xs  text-gray-500 mt-1 flex items-center gap-1">
            <span>Home</span>
            <span className="text-gray-300 mx-1">›</span>
            <span className="text-gray-900 ">Quotations</span>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 bg-red-600 text-white rounded flex items-center gap-1.5 text-xs  hover:bg-red-700 transition-colors  mr-2"
          >
            <Plus size={15} /> Add Quotation
          </button>
          <div className="relative group">
            <button className="p-2 border border-gray-300 rounded text-xs  text-gray-700 flex items-center gap-2 hover:bg-gray-50 bg-white">
              <Download size={15} /> Export <ChevronDown size={14} />
            </button>
          </div>
          <button
            onClick={() => fetchQuotations()}
            className="p-2 border border-gray-300 rounded flex items-center justify-center bg-white hover:bg-gray-50"
          >
            <RotateCcw size={15} className="text-gray-600" />
          </button>
          <button className="p-2 border border-gray-300 rounded flex items-center justify-center bg-white hover:bg-gray-50">
            <Maximize size={15} className="text-gray-600" />
          </button>
        </div>
      </div>


      {/* Toolbar */}
      <div className=" border-gray-200 p-2">
        <div className='flex justify-between mb-4 gap-2'>
          <div className="relative w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F2020]" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 p-2 border border-gray-300 rounded text-xs  focus:outline-none focus:ring-1 focus:ring-red-500 bg-white text-xs"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                  className="p-2 border border-gray-300 rounded text-xs  text-gray-700 flex items-center gap-2 bg-white hover:bg-gray-50 transition-colors"
                >
                  <ChevronsUpDown size={14} className="text-[#1F2020]" /> Sort By: <span className=" text-gray-900">{sortConfig.direction === 'asc' ? 'Oldest' : 'Newest'}</span> <ChevronDown size={14} />
                </button>
                {openDropdown === 'sort' && <SortByDropdown />}
              </div>
              <div className="relative">
                <DateRangeDropdown
                  value={dateRangeType}
                  onChange={setDateRangeType}
                  onDateRangeChange={setCustomDateRange}
                  options={['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'Custom Range']}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'filter' ? null : 'filter')}
                  className="p-2 border border-gray-300 rounded text-xs  text-gray-700 flex items-center gap-2 bg-white hover:bg-gray-50"
                >
                  <Filter size={15} className="text-[#1F2020]" /> Filter <ChevronDown size={14} />
                </button>
                {openDropdown === 'filter' && <FilterDropdown />}
              </div>
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'columns' ? null : 'columns')}
                  className="h-9 px-3 border border-gray-300 rounded text-xs  text-gray-700 flex items-center gap-2 bg-[#F0F2FF] text-[#4F46E5] hover:bg-[#E5E7FF] transition-colors border-none "
                >
                  Manage Columns
                </button>
                {openDropdown === 'columns' && <ManageColumnsDropdown />}
              </div>
              <div className="flex items-center border border-gray-300 rounded bg-white overflow-hidden p-0.5">
                <button onClick={() => setViewMode('list')} className={`w-6 h-6 flex items-center justify-center rounded ${viewMode === 'list' ? 'bg-[#10B981] text-white' : 'text-gray-500 hover:bg-gray-100'}`}><List size={15} /></button>
                <button onClick={() => setViewMode('kanban')} className={`w-6 h-6 flex items-center justify-center rounded ${viewMode === 'kanban' ? 'bg-[#10B981] text-white' : 'text-gray-500 hover:bg-gray-50'}`}><LayoutGrid size={15} /></button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Main Content */}

      {viewMode === 'kanban' ? (
        <div className="flex-1 overflow-x-auto bg-gray-50/50 p-2">
          <div className="flex gap-3 min-w-max h-full pb-8">
            {groupedQuotations.map((group) => {
              return (
                <div
                  key={group.id}
                  className={`w-[250px] flex flex-col h-full rounded  border transition-all duration-300  ${dragOverStatus === group.id
                    ? 'bg-blue-50/50 border-blue-400 shadow-lg ring-2 ring-blue-100'
                    : 'bg-gray-100/40 border-gray-200/60 '
                    }`}
                  onDragOver={(e) => handleDragOver(e, group.id)}
                  onDrop={(e) => handleDrop(e, group.id)}
                >
                  {/* Column Header */}
                  <div className={`${statusColors[group.id]?.light || 'bg-blue-50'} p-2 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full  ${statusColors[group.id]?.dot || 'bg-blue-500'}`}></div>
                      <div className="flex items-center gap-2">
                        <h2 className={`text-sm  tracking-tight ${statusColors[group.id]?.text || 'text-blue-700'}`}>{group.name}</h2>
                        <span className="p-1 px-2 bg-white/50 text-gray-600 text-xs font-[500] rounded-full border border-gray-200/50 backdrop-blur-sm ">
                          {group.items.length}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedQuotation({ status: group.id });
                        setIsModalOpen(true);
                      }}
                      className="w-7 h-7 rounded bg-white flex items-center justify-center border border-gray-200 text-[#1F2020] hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all duration-200 "
                    >
                      <Plus size={15} />
                    </button>
                  </div>

                  {/* Cards Container */}
                  <div
                    className={`flex-1  p-2 space-y-4 custom-scrollbar transition-colors duration-200 ${dragOverStatus === group.id ? 'bg-blue-50/30' : ''
                      }`}
                  >
                    {group.items.length > 0 ? (
                      group.items.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedQuotation(item);
                            setIsViewModalOpen(true);
                          }}
                          className={`relative group/card bg-white border-t-2 border-x border-b border-gray-200 rounded border border-gray-200 p-3  transition-all duration-300 cursor-pointer ${draggedQuotation?.id === item.id ? 'opacity-40 scale-95 ring-2 ring-red-100' : 'hover:shadow-lg'} ${item.status === 'Draft' ? 'border-t-[#FDB022]' :
                            item.status === 'Sent' ? 'border-t-[#0D9488]' :
                              item.status === 'Revised' ? 'border-t-[#6366F1]' :

                                item.status === 'Accepted' || item.status === 'Finalized' ? 'border-t-[#10B981]' :
                                  item.status === 'Declined' ? 'border-t-[#EF4444]' :
                                    'border-t-gray-500'
                            }`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, item.status)}
                        >
                          {/* Header: Logo, Name, Subtitle, Menu */}
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-6 h-6 rounded-full border border-gray-100 flex items-center justify-center bg-gray-50 overflow-hidden shrink-0 ">
                                {item.logo ? (
                                  <img src={item.logo} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white">
                                    <FileJson size={15} />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm text-gray-900 truncate leading-tight mb-1">
                                  {getCardValue(item, 'company')}
                                </h3>
                                <p className="text-xs text-gray-500 truncate">{getCardValue(item, 'type')}</p>
                              </div>
                            </div>

                            <div className="flex items-center pointer-events-auto shrink-0 mt-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionMenu(actionMenu === item.id ? null : item.id);
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-all"
                              >
                                <MoreVertical size={15} />
                              </button>
                              {actionMenu === item.id && (
                                <ActionMenu
                                  quotation={item}
                                  onClose={() => setActionMenu(null)}
                                  className="right-0 top-10"
                                />
                              )}
                            </div>
                          </div>

                          {/* Description */}
                          <div className="mb-2">
                            <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                              {getCardValue(item, 'desc') !== 'N/A' ? getCardValue(item, 'desc') : `${getCardValue(item, 'company')} provides a multiple on-demand service based bootstrap html template.`}
                            </p>
                          </div>

                          {/* Details List */}
                          <div className="space-y-2 mb-2">
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                              <Clock size={15} className="text-gray-400 shrink-0" />
                              <span className=" text-gray-500">Estimate ID : <span className="text-gray-900">#{getCardValue(item, 'estimateId')}</span></span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                              <CircleDollarSign size={15} className="text-gray-400 shrink-0" />
                              <span className=" text-gray-500">Amount : <span className="text-gray-900">{getCardValue(item, 'amount')}</span></span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                              <Calendar size={15} className="text-gray-400 shrink-0" />
                              <span className=" text-gray-500">Date : <span className="text-gray-900">{new Date(getCardValue(item, 'date')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                              <Calendar size={15} className="text-gray-400 shrink-0" />
                              <span className=" text-gray-500">Expiry Date : <span className="text-gray-900">{getCardValue(item, 'expiry') !== 'N/A' ? new Date(getCardValue(item, 'expiry')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}</span></span>
                            </div>
                          </div>

                          {/* Footer: Avatar, Name, External Link */}
                          <div className="pt-4 border-t border-gray-100 flex items-center justify-between pointer-events-none">
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded-full border border-gray-200 overflow-hidden shrink-0 ">
                                {item.owner_avatar ? (
                                  <img src={item.owner_avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-blue-50 flex items-center justify-center text-xs text-blue-600">
                                    {getCardValue(item, 'owner')[0]}
                                  </div>
                                )}
                              </div>
                              <span className="text-xs  text-gray-800">
                                {getCardValue(item, 'owner')}
                              </span>
                            </div>
                            <button className="w-9 h-9 flex items-center justify-center rounded-full border border-blue-100 bg-white text-blue-500 hover:bg-blue-50 transition-all pointer-events-auto ">
                              <ExternalLink size={15} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-[#1F2020] border-2 border-dashed border-gray-200 rounded bg-white/40">
                        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                          <FileText size={15} className="opacity-30" />
                        </div>
                        <p className="text-xs  text-[#1F2020] ">No quotations</p>
                      </div>
                    )}
                  </div>

                  {/* Column Footer Summary */}
                  <div className="p-2 bg-white/40 border-t border-gray-200/60 text-xs   text-gray-500 flex justify-between items-center">
                    <span>Total Amount</span>
                    <span className="text-gray-900 bg-white p-2 text-xs rounded border border-gray-200 ">
                      ${group.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded ">
          <div className="">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                  <th className="p-2 w-10">
                    <input type="checkbox" className="rounded border-gray-300 text-red  focus:ring-red-500" />
                  </th>
                  <th className="p-2 w-12 text-center text-xs text-gray-400">Expand</th>
                  <th className="p-2 w-8 text-center text-xs text-gray-400 font-normal">Fav</th>
                  {visibleColumns['Estimations ID'] && (
                    <th
                      className="p-2 text-xs  text-gray-700  cursor-pointer hover:bg-gray-100 transition-colors group"
                      onClick={() => handleSort('estimateId')}
                    >
                      <div className="flex items-center gap-2">
                        Estimations ID {getSortIcon('estimateId')}
                      </div>
                    </th>
                  )}
                  {visibleColumns['Client'] && (
                    <th
                      className="p-2 text-xs  text-gray-700  cursor-pointer hover:bg-gray-100 transition-colors group"
                      onClick={() => handleSort('company')}
                    >
                      <div className="flex items-center gap-2">
                        Client {getSortIcon('company')}
                      </div>
                    </th>
                  )}
                  {visibleColumns['Amount'] && (
                    <th
                      className="p-2 text-xs  text-gray-700  cursor-pointer hover:bg-gray-100 transition-colors group"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center gap-2">
                        Amount {getSortIcon('amount')}
                      </div>
                    </th>
                  )}
                  {visibleColumns['Project'] && (
                    <th
                      className="p-2 text-xs  text-gray-700  cursor-pointer hover:bg-gray-100 transition-colors group"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center gap-2">
                        Project Name {getSortIcon('type')}
                      </div>
                    </th>
                  )}
                  {visibleColumns['Business Type'] && (
                    <th
                      className="p-2 text-xs  text-gray-700  cursor-pointer hover:bg-gray-100 transition-colors group"
                      onClick={() => handleSort('businessType')}
                    >
                      <div className="flex items-center gap-2">
                        Business Type {getSortIcon('businessType')}
                      </div>
                    </th>
                  )}
                  {visibleColumns['Date'] && (
                    <th
                      className="p-2 text-xs  text-gray-700  cursor-pointer hover:bg-gray-100 transition-colors group"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-2">
                        Date {getSortIcon('date')}
                      </div>
                    </th>
                  )}
                  {visibleColumns['Expiry Date'] && (
                    <th
                      className="p-2 text-xs  text-gray-700  cursor-pointer hover:bg-gray-100 transition-colors group"
                      onClick={() => handleSort('expiry')}
                    >
                      <div className="flex items-center gap-2">
                        Expiry Date {getSortIcon('expiry')}
                      </div>
                    </th>
                  )}
                  {visibleColumns['Estimation By'] && (
                    <th
                      className="p-2 text-xs  text-gray-700  cursor-pointer hover:bg-gray-100 transition-colors group"
                      onClick={() => handleSort('owner')}
                    >
                      <div className="flex items-center gap-2">
                        Estimation By {getSortIcon('owner')}
                      </div>
                    </th>
                  )}
                  {visibleColumns['Status'] && (
                    <th
                      className="p-2 text-xs  text-gray-700  cursor-pointer hover:bg-gray-100 transition-colors group"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        Status {getSortIcon('status')}
                      </div>
                    </th>
                  )}
                  {visibleColumns['Action'] && (
                    <th className="p-2 text-xs   text-gray-700  tracking-wider">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rootQuotations.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr
                      onClick={() => {
                        setSelectedQuotation(item);
                        setIsViewModalOpen(true);
                      }}
                      className={`hover:bg-gray-50/80 transition-colors group cursor-pointer ${expandedRows.has(item.id) ? 'bg-gray-50' : ''}`}
                    >
                      <td className="p-2">
                        <input type="checkbox" className="rounded border-gray-300 text-red  focus:ring-red-500" />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(item.id);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {expandedRows.has(item.id) ? (
                            <ChevronDown size={15} className="text-gray-600" />
                          ) : (
                            <ChevronUp size={15} className="text-gray-400 rotate-90" />
                          )}
                        </button>
                      </td>
                      <td className="p-2 text-center">
                        <Star size={15} className="text-gray-300 hover:text-yellow-400 cursor-pointer inline" />
                      </td>
                      {visibleColumns['Estimations ID'] && (
                        <td className="p-2 text-xs   text-red  hover:underline cursor-pointer">{getCardValue(item, 'estimateId')}</td>
                      )}
                      {visibleColumns['Client'] && (
                        <td className="p-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs  text-gray-500 border border-gray-200">
                              {getCardValue(item, 'company')[0]}
                            </div>
                            <span className="text-xs   text-gray-900">{getCardValue(item, 'company')}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns['Amount'] && (
                        <td className="p-2 text-xs  text-gray-700 ">{getCardValue(item, 'amount')}</td>
                      )}
                      {visibleColumns['Project'] && (
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                            <span className="text-xs  text-gray-600">{getCardValue(item, 'type')}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns['Business Type'] && (
                        <td className="p-2">
                          <span className="text-xs  text-gray-600">{getCardValue(item, 'businessType')}</span>
                        </td>
                      )}
                      {visibleColumns['Date'] && (
                        <td className="p-2 text-xs  text-gray-600">{getCardValue(item, 'date')}</td>
                      )}
                      {visibleColumns['Expiry Date'] && (
                        <td className="p-2 text-xs  text-gray-600">{getCardValue(item, 'expiry')}</td>
                      )}
                      {visibleColumns['Estimation By'] && (
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center text-xs text-red  border border-red-100">
                              {getCardValue(item, 'owner').charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs  text-gray-900 ">{getCardValue(item, 'owner')}</span>
                              <span className="text-xs text-[#1F2020]">Manager</span>
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns['Status'] && (
                        <td className="p-2 text-xs ">
                          <span
                            className="p-1 text-xs  rounded   inline-block"
                            style={{ backgroundColor: getStatusColor(item.status) + '20', color: getStatusColor(item.status) }}
                          >
                            {item.status}
                          </span>
                        </td>
                      )}
                      {visibleColumns['Action'] && (
                        <td className="p-2 text-right relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenu(actionMenu === item.id ? null : item.id);
                            }}
                            className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-[#1F2020] hover:text-gray-600"
                          >
                            <MoreVertical size={15} />
                          </button>
                          {actionMenu === item.id && (
                            <ActionMenu
                              quotation={item}
                              onClose={() => setActionMenu(null)}
                              className="right-12 top-0"
                            />
                          )}
                        </td>
                      )}
                    </tr>
                    {expandedRows.has(item.id) && (
                      <tr className="bg-gray-50/30">
                        <td colSpan={visibleColumnCount} className="p-2">
                          <div className="border border-gray-200 rounded overflow-hidden bg-white  animate-in slide-in-from-top-2 duration-200">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                  <th className="p-2 font-[500] text-gray-500">Version</th>
                                  <th className="p-2 font-[500] text-gray-500">Estimation ID</th>
                                  <th className="p-2 font-[500] text-gray-500">Amount</th>
                                  <th className="p-2 font-[500] text-gray-500">Date</th>
                                  <th className="p-2 font-[500] text-gray-500">Status</th>
                                  <th className="p-2 font-[500] text-gray-500">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {[item, ...getAllDescendants(item.id)].sort((a, b) => (a.version || 1) - (b.version || 1)).map(desc => (
                                  <tr key={desc.id} className="hover:bg-gray-50">
                                    <td className="p-2 text-gray-600">V{desc.version || '1'}</td>
                                    <td className="p-2 text-red-600 font-[500]">{desc.estimation_number || desc.estimateId}</td>
                                    <td className="p-2 text-gray-900 font-[500]">{getCardValue(desc, 'amount')}</td>
                                    <td className="p-2 text-gray-500">{new Date(desc.estimate_date || desc.date).toLocaleDateString()}</td>
                                    <td className="p-2">
                                      <span
                                        className="px-2 py-0.5 rounded-full text-xs"
                                        style={{ backgroundColor: getStatusColor(desc.status) + '20', color: getStatusColor(desc.status) }}
                                      >
                                        {desc.status}
                                      </span>
                                    </td>
                                    <td className="p-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedQuotation(desc);
                                          setIsViewModalOpen(true);
                                        }}
                                        className="text-blue-500 hover:underline"
                                      >
                                        View
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-2 border-t border-gray-200 flex items-center justify-between bg-white text-xs  text-gray-500">
            <div className="flex items-center gap-2">
              Row Per Page
              <select className="border border-gray-200 rounded px-2 py-1 bg-gray-50 outline-none focus:ring-1 focus:ring-red-500">
                <option>10</option>
                <option>20</option>
                <option>50</option>
              </select>
              Entries
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">‹</button>
              <button className="w-8 h-8 flex items-center justify-center bg-red-600 text-white rounded  ">1</button>
              <button className="p-2 border border-gray-200 rounded hover:bg-gray-50">›</button>
            </div>
          </div>
        </div>
      )}


      {/* Load More (Mainly for Kanban) */}
      {viewMode === 'kanban' && (
        <div className="flex justify-center py-6 bg-white border-t border-gray-100 shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.05)]">
          <button className="h-10 px-8 bg-red-600 text-white rounded flex items-center gap-2 text-[15px]  hover:bg-red-700 transition-colors shadow-md">
            <RotateCcw size={15} /> Load More
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-2 flex items-center justify-between text-[12px] text-gray-500 bg-white border-t border-gray-200">
        <p>Copyright © 2026 <span className="text-red  ">CRMS</span></p>
        <div className="flex items-center gap-2">
          <button className="hover:text-red ">About</button>
          <button className="hover:text-red ">Terms</button>
          <button className="hover:text-red ">Contact Us</button>
        </div>
      </div>

      <AddNewEstimationModal
        isOpen={isModalOpen || isEditModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedQuotation(null);
        }}
        onSubmit={handleAddQuotation}
        onGeneratePDF={(data) => {
          // Map modal formData back to quotation structure
          const quotationToView = {
            ...data,
            id: data.id || 'NEW',
            estimation_number: data.quotationNumber,
            estimate_date: data.quotationDate,
            expiry_date: data.validUntil,
            client_name: data.client,
            business_type: data.businessType,
            amount: data.total,
            tax_amount: data.tax,
            discount_amount: data.discount,
            client_email: data.client_email,
            client_phone: data.client_phone,
            business_description: data.business_description,
            referral_name: data.referral_name,
            items: data.items.map(item => ({
              ...item,
              item_name: item.productName,
              total: item.quantity * item.rate
            }))
          };

          setSelectedQuotation(quotationToView);
          setIsViewModalOpen(true);
        }}
        initialData={selectedQuotation}
      />

      <ViewQuotationModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedQuotation(null);
        }}
        quotation={selectedQuotation}
      />

      <ReviseQuotationModal
        isOpen={isReviseModalOpen}
        onClose={() => {
          setIsReviseModalOpen(false);
          setSelectedQuotation(null);
        }}
        quotation={selectedQuotation}
        onUpdate={fetchQuotations}
      />
    </div>
  );
};

export default QuotationsPage;
