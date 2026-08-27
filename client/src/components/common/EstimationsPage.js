import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Download, Plus, MoreVertical, FileText, Send, Copy, Trash2, Eye, Edit2, FileJson, LayoutGrid, List, ChevronDown, RotateCcw, Maximize, Search, Star, Filter, ChevronsUpDown, Printer, Calendar, Hash, CircleDollarSign } from 'lucide-react';
import Swal from 'sweetalert2';
import AddNewEstimationModal from './AddNewEstimationModal';
import ReviseQuotationModal from '../sales/ReviseQuotationModal';
import DateRangeDropdown from './DateRangeDropdown';
import { estimationsAPI, dealsAPI, leadsAPI, activitiesAPI } from '../../services/api';
import { showSuccessToast } from '../../utils/toast';

const EstimationsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('kanban');
  const [dateRangeType, setDateRangeType] = useState('All Time');
  const [customDateRange, setCustomDateRange] = useState({ startDate: null, endDate: null });
  const [activeFilters, setActiveFilters] = useState({
    project: [],
    client: [],
    status: [],
    owner: []
  });
  const [expandedFilterSection, setExpandedFilterSection] = useState('project');
  const [selectedEstimation, setSelectedEstimation] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isReviseModalOpen, setIsReviseModalOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showManageColumns, setShowManageColumns] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    'Estimations ID': true,
    'Client': true,
    'Amount': true,
    'Project': true,
    'Date': true,
    'Expiry Date': false,
    'Estimation By': true,
    'Status': true,
    'Action': true
  });
  const [isLoadingEstimations, setIsLoadingEstimations] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [estimations, setEstimations] = useState([]);
  const [draggedEstimation, setDraggedEstimation] = useState(null);
  const draggedItemRef = useRef(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const lastUpdateRef = useRef(0);

  const columns = [
    { id: 'Draft', name: 'Draft', color: '#FDB022' },
    { id: 'Sent', name: 'Sent', color: '#3B82F6' },
    { id: 'Revised', name: 'Revised', color: '#6366F1' },
    { id: 'Accepted', name: 'Accepted', color: '#10B981' },
    { id: 'Declined', name: 'Declined', color: '#EF4444' },
  ];

  const getStatusColor = (status) => {
    const colors = {
      'Draft': '#FDB022',
      'Sent': '#3B82F6',
      'Revised': '#6366F1',
      'Accepted': '#10B981',
      'Declined': '#EF4444',
    };
    return colors[status] || '#6B7280';
  };

  const getCardValue = (item, field) => {
    const fieldMap = {
      company: () => {
        const name = item.company || item.company_name || item.client_name || item.lead_name || item.contact_name;
        return name && name !== 'N/A' ? name : 'N/A';
      },
      type: () => item.type || item.project_name || 'N/A',
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
      status: () => item.status || 'Draft',
      id: () => item.id || 0,
    };
    return fieldMap[field] ? fieldMap[field]() : '';
  };

  useEffect(() => {
    fetchEstimations();

    const interval = setInterval(() => {
      // Only fetch silently if not currently loading, updating, or dragging
      if (!isLoadingEstimations && !draggedEstimation && !draggedItemRef.current && !isUpdating) {
        fetchEstimations(true);
      }
    }, 10000); // Increased to 10s for better stability

    return () => clearInterval(interval);
  }, [isLoadingEstimations, draggedEstimation, isUpdating]);

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

  const fetchEstimations = async (isSilent = false) => {
    // Avoid fetching while an update is in flight
    if (isSilent && isUpdating) return;

    if (!isSilent) setIsLoadingEstimations(true);
    try {
      const data = await estimationsAPI.getAll();

      // Additional safety check for silent updates to prevent race conditions
      // Ignore silent updates during a "grace period" after a manual update
      const timeSinceUpdate = Date.now() - lastUpdateRef.current;
      if (isSilent && (isUpdating || draggedEstimation || draggedItemRef.current || timeSinceUpdate < 3000)) {
        console.log('📋 Skipping silent update to prevent state overwrite (Grace period)');
        return;
      }

      console.log('📋 Estimations fetched:', Array.isArray(data) ? data.length : 0, 'estimations');
      setEstimations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching estimations:', err);
      if (!isSilent) setEstimations([]);
    } finally {
      if (!isSilent) setIsLoadingEstimations(false);
    }
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ChevronsUpDown size={14} className="text-[#1F2020]" />;
    return sortConfig.direction === 'asc' ? <ChevronDown size={14} className="rotate-180 text-red " /> : <ChevronDown size={14} className="text-red " />;
  };

  const filteredEstimations = useMemo(() => {
    // Only show the latest version of each quotation chain
    const parentIds = new Set(estimations.map(q => q.parent_id).filter(id => id !== null && id !== undefined));
    const latestEstimations = estimations.filter(q => !parentIds.has(q.id));

    let result = latestEstimations.filter(est => {
      const searchLower = searchTerm.toLowerCase();
      const clientName = est.company || est.client_name || '';
      const estimateId = est.estimateId || est.estimate_id || est.estimation_number || '';
      const projectName = est.project_name || est.type || '';
      const status = est.status || '';

      const matchesSearch =
        clientName.toLowerCase().includes(searchLower) ||
        estimateId.toLowerCase().includes(searchLower) ||
        projectName.toLowerCase().includes(searchLower) ||
        status.toLowerCase().includes(searchLower);

      const matchesStatus = activeFilters.status.length === 0 || activeFilters.status.includes(status);
      const matchesClient = activeFilters.client.length === 0 || activeFilters.client.includes(clientName);
      const matchesProject = activeFilters.project.length === 0 || activeFilters.project.includes(projectName);
      const matchesDate = isWithinDateRange(est.estimate_date || est.date, dateRangeType);

      return matchesSearch && matchesStatus && matchesClient && matchesProject && matchesDate;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = getCardValue(a, sortConfig.key === 'estimateId' ? 'estimateId' : sortConfig.key === 'Name' ? 'company' : sortConfig.key === 'Amount' ? 'amount_raw' : sortConfig.key === 'Project' ? 'type' : sortConfig.key === 'Estimation By' ? 'owner' : sortConfig.key === 'Status' ? 'status' : 'id');
        let bValue = getCardValue(b, sortConfig.key === 'estimateId' ? 'estimateId' : sortConfig.key === 'Name' ? 'company' : sortConfig.key === 'Amount' ? 'amount_raw' : sortConfig.key === 'Project' ? 'type' : sortConfig.key === 'Estimation By' ? 'owner' : sortConfig.key === 'Status' ? 'status' : 'id');

        if (sortConfig.key === 'Amount') {
          aValue = parseFloat(a.amount || 0);
          bValue = parseFloat(b.amount || 0);
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [estimations, searchTerm, activeFilters, dateRangeType, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleAddEstimation = async (formData) => {
    try {
      const tagsString = formData.tags.length > 0 ? JSON.stringify(formData.tags) : null;
      const isVirtualDeal = formData.deal_id && !isNaN(formData.deal_id) && Number(formData.deal_id) > 1000000;
      const estimationData = {
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

      if (selectedEstimation && isEditModalOpen) {
        await estimationsAPI.update(selectedEstimation.id, estimationData);
        showSuccessToast('Estimation updated successfully');
      } else {
        const response = await estimationsAPI.create(estimationData);

        // Save line items if present
        if (formData.items && formData.items.length > 0 && response.id) {
          const itemPromises = formData.items.map(item => {
            const itemData = {
              item_name: item.productName || item.item_name,
              description: item.description,
              quantity: parseFloat(item.quantity || 1),
              rate: parseFloat(item.rate || 0),
              discount_percent: 0,
              tax_percent: 10,
            };
            return estimationsAPI.createItem(response.id, itemData);
          });
          await Promise.all(itemPromises);
        }

        showSuccessToast('Estimation added successfully');

        // Update deal status if linked and status is Sent
        const dealIdToUpdate = formData.deal_id_original || formData.deal_id;
        if (dealIdToUpdate && formData.status === 'Sent') {
          try {
            await dealsAPI.update(dealIdToUpdate, {
              pipeline: 'Quotation',
              deal_value: parseFloat(formData.amount || 0)
            });
          } catch (err) {
            console.warn('Failed to update deal status:', err);
          }
        }
      }
      await fetchEstimations();
      setIsModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedEstimation(null);
    } catch (err) {
      console.error('Error handling estimation:', err);
      throw err;
    }
  };

  const ViewEstimationModal = ({ isOpen, onClose, estimation }) => {
    if (!isOpen || !estimation) return null;

    // Mock data for extended fields not in current model
    const mockItems = [];

    const subTotal = 5500;
    const discount = 400;
    const extraDiscount = 0;
    const tax = 54;
    const totalAmount = 5775;

    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white h-full w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="flex justify-between items-center p-2 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-4">
              <h2 className="text-xl   text-gray-900">
                Estimation <span className="text-red-500 ml-1">#{getCardValue(estimation, 'estimateId')}</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <button className="flex items-center gap-2 p-2 border border-gray-200 rounded  text-sm  text-gray-700 hover:bg-gray-50 transition-all">
                  Download <ChevronDown size={16} />
                </button>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[#1F2020] hover:bg-gray-100 hover:text-red  transition-all border border-gray-100"
              >
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {/* Status and Summary Header */}
            <div className="bg-gray-50/50 rounded p-2 border border-gray-100 mb-8">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg   text-gray-900">Estimation Details</h3>
                  <span
                    className="px-3 py-1 text-xs   rounded-md inline-block"
                    style={{ backgroundColor: getStatusColor(estimation.status) + '20', color: getStatusColor(estimation.status) }}
                  >
                    {estimation.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-8 mt-6">
                <div>
                  <p className="text-xs   text-[#1F2020]   mb-1">Estimate Date</p>
                  <p className="text-sm  text-gray-900">{getCardValue(estimation, 'date')}</p>
                </div>
                <div>
                  <p className="text-xs   text-[#1F2020]   mb-1">Expiry Date</p>
                  <p className="text-sm  text-gray-900">{getCardValue(estimation, 'expiry')}</p>
                </div>
                <div>
                  <p className="text-xs   text-[#1F2020]   mb-1">Client</p>
                  <p className="text-sm  text-gray-900">{getCardValue(estimation, 'company')}</p>
                </div>
              </div>
            </div>

            {/* Revision Details Section */}
            <div className="bg-white rounded border border-gray-100  mb-8 overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <h4 className="text-sm font-[500] text-gray-800  tracking-wider">Revision Details</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Create Revision</span>
                  <div className="relative inline-block w-10 h-5">
                    <input
                      type="checkbox"
                      onChange={() => setIsReviseModalOpen(true)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Sections */}
            <div className="grid grid-cols-3 gap-8 mb-10 px-2">
              <div className="space-y-3">
                <p className="text-sm   text-gray-900">From</p>
                <div className="space-y-1">
                  <p className="text-xs   text-gray-900  ">CRMS</p>
                  <p className="text-xs text-gray-500 leading-relaxed">3338 Marcus Street Birmingham, AL 35211</p>
                  <p className="text-xs text-gray-500">Phone: +1 98789 78788</p>
                  <p className="text-xs text-gray-500">Email: info@example.com</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm   text-gray-900">Bill To</p>
                <div className="space-y-1">
                  <p className="text-xs   text-gray-900  ">{getCardValue(estimation, 'company')}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">994 Martine Ranch Suite 900 Candacefort New Hampshire</p>
                  <p className="text-xs text-gray-500">Phone: +1 58478 74646</p>
                  <p className="text-xs text-gray-500">Email: info@example.net</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm   text-gray-900">Ship To</p>
                <div className="space-y-1">
                  <p className="text-xs   text-gray-900  ">{getCardValue(estimation, 'company')}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">994 Martine Ranch Suite 900 Candacefort New Hampshire</p>
                  <p className="text-xs text-gray-500">Phone: +1 58478 74646</p>
                  <p className="text-xs text-gray-500">Email: info@example.net</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-gray-100 rounded overflow-hidden mb-8 ">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs   text-[#1F2020]  tracking-wider">Job Description</th>
                    <th className="px-6 py-4 text-xs   text-[#1F2020]  tracking-wider">Qty</th>
                    <th className="px-6 py-4 text-xs   text-[#1F2020]  tracking-wider">Price</th>
                    <th className="px-6 py-4 text-xs   text-[#1F2020]  tracking-wider">Discount</th>
                    <th className="px-6 py-4 text-xs   text-[#1F2020]  tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm  text-gray-900">{item.description}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.qty}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">${item.price}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">${item.discount}</td>
                      <td className="px-6 py-4 text-sm   text-gray-900">${item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end mb-10">
              <div className="w-full max-w-xs space-y-3 px-2">
                <div className="flex justify-between items-center text-sm ">
                  <span className="text-gray-500">Sub Total</span>
                  <span className="text-gray-900">${subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm ">
                  <span className="text-gray-500">Discount(0%)</span>
                  <span className="text-gray-900">${discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm ">
                  <span className="text-gray-500">Extra Discount(0%)</span>
                  <span className="text-gray-900">${extraDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm ">
                  <span className="text-gray-500">Tax</span>
                  <span className="text-gray-900">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <span className="text-base   text-gray-900">Total Amount</span>
                  <span className="text-lg font-black text-gray-900">${totalAmount.toFixed(2)}</span>
                </div>
                <p className="text-xs  text-[#1F2020]  text-right mt-2">Amount in Words : Dollar Five thousand Seven Seventy Five</p>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-3 px-2">
              <h4 className="text-sm   text-gray-900">Terms and Conditions</h4>
              <p className="text-xs text-gray-500 leading-relaxed ">
                The products/services listed in this invoice will be delivered/provided as per the specifications and schedule detailed in the invoice or as agreed upon by both parties in previous communications.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleDragStart = (e, estimation) => {
    setDraggedEstimation(estimation);
    draggedItemRef.current = estimation;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('application/json', JSON.stringify(estimation));
        e.dataTransfer.setData('text/plain', String(estimation.id));
      } catch (err) {
        console.error('Error setting drag data:', err);
      }
      if (e.currentTarget) {
        e.currentTarget.classList.add('opacity-40');
      }
    }
  };

  const handleDragEnd = (e) => {
    if (e.currentTarget) {
      e.currentTarget.classList.remove('opacity-40');
    }
    setDraggedEstimation(null);
    draggedItemRef.current = null;
    setDragOverStatus(null);
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
    let estimationToUpdate = draggedItemRef.current || draggedEstimation;

    if (!estimationToUpdate && e && e.dataTransfer) {
      try {
        const id = e.dataTransfer.getData('text/plain');
        if (id) {
          estimationToUpdate = estimations.find(est => String(est.id) === id);
        }
      } catch (err) {
        console.error('Error retrieving drop data:', err);
      }
    }

    if (!estimationToUpdate) {
      return;
    }

    const currentStatus = (estimationToUpdate.status || '').toLowerCase();
    const targetStatus = (newStatus || '').toLowerCase();

    if (currentStatus === targetStatus) {
      return;
    }

    try {
      await handleStatusChange(estimationToUpdate.id, newStatus);
    } catch (err) {
      console.error('Error handling drop:', err);
    } finally {
      setDraggedEstimation(null);
      draggedItemRef.current = null;
    }
  };

  const handleDelete = async (id) => {
    try {
      await estimationsAPI.delete(id);
      await fetchEstimations();
      setActionMenu(null);
    } catch (err) {
      console.error('Error deleting estimation:', err);
    }
  };

  const handleDownloadPDF = (estimation) => {
    console.log('Downloading PDF for:', estimation.estimateId);
    alert(`PDF download initiated for ${estimation.estimateId}`);
  };

  const handleSendEstimation = async (estimation) => {
    try {
      const estimationNumber = estimation.estimateId || estimation.estimation_number || `EST-${estimation.id}`;

      const result = await Swal.fire({
        title: 'Send Estimation?',
        html: `<p>Send <strong>${estimationNumber}</strong> to client?</p>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Send it!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        console.log(`🔄 Sending estimation ${estimation.id}...`);
        await estimationsAPI.send(estimation.id, { action_by: 1 });

        await Swal.fire({
          title: 'Success!',
          html: `<p>Estimation <strong>${estimationNumber}</strong> sent successfully!</p>`,
          icon: 'success',
          confirmButtonColor: '#3085d6',
          timer: 2000,
          timerProgressBar: true
        });

        setActionMenu(null);
        await fetchEstimations();
      }
    } catch (err) {
      console.error('Error sending estimation:', err);
      await Swal.fire({
        title: 'Error',
        html: `<p>Failed to send estimation: ${err.message}</p>`,
        icon: 'error',
        confirmButtonColor: '#d33'
      });
    }
  };

  const handleConvertToInvoice = async (estimation) => {
    try {
      const estimationNumber = estimation.estimateId || estimation.estimation_number || `EST-${estimation.id}`;

      const result = await Swal.fire({
        title: 'Convert to Invoice?',
        html: `<p>Convert estimation <strong>${estimationNumber}</strong> to an invoice?</p>
               <p style="font-size: 0.9em; color: #666; margin-top: 10px;">Amount: <strong>${estimation.currency || '$'}${parseFloat(estimation.amount || 0).toLocaleString()}</strong></p>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Convert it!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        console.log(`🔄 Converting estimation ${estimation.id} to invoice...`);
        const response = await estimationsAPI.convertToInvoice(estimation.id, { created_by: 1 });

        await Swal.fire({
          title: 'Success!',
          html: `<p>Estimation converted to invoice successfully!</p>
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
        await fetchEstimations();
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

  const handleStatusChange = async (estimationId, newStatus) => {
    try {
      setIsUpdating(true);
      lastUpdateRef.current = Date.now();

      // Get the estimation before update to check links
      const estimation = estimations.find(est => est.id === estimationId);

      // Optimistic update
      const updatedEstimations = estimations.map(est =>
        est.id === estimationId ? { ...est, status: newStatus } : est
      );
      setEstimations(updatedEstimations);

      await estimationsAPI.update(estimationId, { status: newStatus });

      // Sync with Deal and Lead stages
      if (estimation) {
        const dealIdToUpdate = estimation.deal_id || (estimation.lead_id ? Number(estimation.lead_id) + 1000000 : null);
        const leadIdToUpdate = estimation.lead_id;

        // Map estimation status to Deal stage
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
            description: `Quotation ${estimation.estimation_number || estimation.id} status changed to ${newStatus}.`,
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
      fetchEstimations(true);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
    setActionMenu(null);
  };

  const ActionMenu = ({ estimation, onClose, className = "right-0 top-10" }) => (
    <div className={`absolute ${className} bg-white border border-gray-200 rounded  shadow-xl z-[100] w-52 text-left py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setSelectedEstimation(estimation);
          setIsEditModalOpen(true);
          onClose();
        }}
        className="w-full p-2 text-left text-xs  text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors group"
      >
        <Edit2 size={16} className="text-[#1F2020] group-hover:text-white  transition-colors" /> Edit
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(estimation.id);
          onClose();
        }}
        className="w-full p-2 text-left text-xs  text-red  hover:bg-red-50 flex items-center gap-3 transition-colors group border-b border-gray-50"
      >
        <Trash2 size={16} className="text-red-400 group-hover:text-red  transition-colors" /> Delete
      </button>
      <div className="px-4 py-1.5 bg-gray-50/50">
        <span className="text-xs    text-[#1F2020]  ">Actions</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setSelectedEstimation(estimation);
          setIsViewModalOpen(true);
          onClose();
        }}
        className="w-full p-2 text-left text-xs  text-gray-600 hover:bg-gray-50 flex items-center gap-3 transition-colors group"
      >
        <Eye size={16} className="text-[#1F2020] group-hover:text-gray-900 transition-colors" /> View Estimation
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleStatusChange(estimation.id, 'Accepted');
          onClose();
        }}
        className="w-full p-2 text-left text-xs  text-gray-600 hover:bg-gray-50 flex items-center gap-3 transition-colors group"
      >
        <RotateCcw size={16} className="text-[#1F2020] group-hover:text-green-600 transition-colors" /> Mark as Accepted
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleStatusChange(estimation.id, 'Draft');
          onClose();
        }}
        className="w-full p-2 text-left text-xs  text-gray-600 hover:bg-gray-50 flex items-center gap-3 transition-colors group"
      >
        <RotateCcw size={16} className="text-[#1F2020] group-hover:text-yellow-600 transition-colors" /> Mark as Draft
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleStatusChange(estimation.id, 'Declined');
          onClose();
        }}
        className="w-full p-2 text-left text-xs  text-gray-600 hover:bg-gray-50 flex items-center gap-3 transition-colors group border-b border-gray-50"
      >
        <RotateCcw size={16} className="text-[#1F2020] group-hover:text-red  transition-colors" /> Mark as Declined
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handlePrint();
          onClose();
        }}
        className="w-full p-2 text-left text-xs  text-gray-600 hover:bg-gray-50 flex items-center gap-3 transition-colors group"
      >
        <Printer size={16} className="text-[#1F2020] group-hover:text-gray-900 transition-colors" /> Print
      </button>
    </div>
  );

  const SortByDropdown = () => (
    <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded shadow-xl z-50 py-1">
      {['Newest', 'Oldest'].map(option => (
        <button
          key={option}
          onClick={() => {
            setSortConfig({ key: 'date', direction: option === 'Newest' ? 'desc' : 'asc' });
            setShowSortDropdown(false);
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
      { id: 'project', label: 'Project', options: [...new Set(estimations.map(e => e.project_name || e.type).filter(Boolean))] },
      { id: 'client', label: 'Client Name', options: [...new Set(estimations.map(e => e.company || e.client_name).filter(Boolean))] },
      { id: 'date', label: 'Date of Estimation', options: ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days'] },
      { id: 'owner', label: 'Estimated By', options: [...new Set(estimations.map(e => e.owner_name || e.owner).filter(Boolean))] },
      { id: 'expiry', label: 'Expiry Date', options: ['Next 7 Days', 'Next 30 Days'] },
      { id: 'status', label: 'Status', options: ['Draft', 'Sent', 'Accepted', 'Declined'] },
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
      <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded shadow-2xl z-50 flex flex-col max-h-[600px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2  text-gray-900   text-[15px]">
            <Filter size={18} className="text-gray-700" /> Filter
          </div>
          <button onClick={() => setShowFilterDropdown(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#1F2020] hover:bg-red-50 hover:text-red  transition-colors">
            <Plus size={20} className="rotate-45" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 custom-scrollbar py-2">
          {sections.map(section => (
            <div key={section.id} className="px-2">
              <button
                className={`w-full px-4 py-3 flex items-center justify-between text-xs   transition-colors rounded  ${expandedFilterSection === section.id ? 'text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setExpandedFilterSection(expandedFilterSection === section.id ? null : section.id)}
              >
                <div className="flex items-center gap-2 ">
                  <ChevronDown size={14} className={`transition-transform duration-200 ${expandedFilterSection === section.id ? '' : '-rotate-90'}`} />
                  {section.label}
                </div>
              </button>
              {expandedFilterSection === section.id && (
                <div className="p-2  pt-1 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="relative mb-3">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F2020]" />
                    <input type="text" placeholder="Search" className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded  text-xs  focus:outline-none focus:ring-1 focus:ring-red-500 transition-all" />
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {section.options.length > 0 ? section.options.map(opt => (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer group py-0.5">
                        <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all ${activeFilters[section.id]?.includes(opt) ? 'bg-red-600 border-red-600' : 'border-gray-200 group-hover:border-red-400'}`}>
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
        <div className="p-2 border-t border-gray-100 grid grid-cols-2 gap-2  bg-gray-50/50">
          <button onClick={() => setActiveFilters({ project: [], client: [], status: [], owner: [] })} className="py-2.5 border border-gray-200 bg-white rounded  text-xs    text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all ">Reset</button>
          <button onClick={() => setShowFilterDropdown(false)} className="py-2.5 bg-red-600 text-white rounded  text-xs    hover:bg-red-700 transition-all shadow-md active:scale-[0.98]">Filter</button>
        </div>
      </div>
    );
  };

  const ManageColumnsDropdown = () => {
    return (
      <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded shadow-2xl z-50 py-3 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="px-4 pb-2 border-b border-gray-50 mb-2">
          <p className="text-xs   text-[#1F2020]  tracking-wider">Show/Hide Columns</p>
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
                className={`w-10 h-5.5 rounded-full relative transition-all duration-200 p-1 ${visibleColumns[col] ? 'bg-red-600' : 'bg-gray-300'}`}
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


  return (
    <div className="flex-1 flex flex-col bg-[#F9FAFB]  font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-[500] text-gray-900 ">
              Estimations
              <span className="inline-block p-1  bg-red-50 text-red  text-xs  rounded-full border border-red-100">
                {filteredEstimations.length}
              </span>
            </h1>
            <nav className="text-xs  text-gray-500 mt-1 flex items-center gap-1">
              <span>Home</span>
              <span className="text-gray-300 mx-1">›</span>
              <span className="text-gray-900 ">Estimations</span>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="h-9 px-3 bg-red-600 rounded text-xs  text-white flex items-center gap-2 hover:bg-red-700 transition-colors "
              >
                <Download size={16} /> Export <ChevronDown size={14} className={`transition-transform duration-200 ${showExportDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showExportDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded  shadow-xl z-[100] w-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <button className="w-full p-2  text-left text-xs  text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50">
                    <FileText size={14} className="text-[#1F2020]" /> Export as PDF
                  </button>
                  <button className="w-full p-2  text-left text-xs  text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <FileJson size={14} className="text-[#1F2020]" /> Export as Excel
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => fetchEstimations()}
              className="p-2 border border-gray-300 rounded flex items-center justify-center bg-white hover:bg-gray-50"
            >
              <RotateCcw size={16} className="text-gray-600" />
            </button>
            <button className="p-2 border border-gray-300 rounded flex items-center justify-center bg-white hover:bg-gray-50">
              <Maximize size={16} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-2 ">
        {viewMode === 'kanban' ? (
          <div className="flex items-center justify-between gap-2 ">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="h-10 px-4 border border-gray-300 rounded text-xs  text-gray-700 flex items-center gap-2 bg-white hover:bg-gray-50 transition-colors"
                >
                  <Filter size={16} className={showFilterDropdown ? 'text-red ' : 'text-[#1F2020]'} /> <span className="">Filter</span> <ChevronDown size={14} className={`transition-transform duration-200 ${showFilterDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showFilterDropdown && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded shadow-2xl z-[100] w-72 overflow-hidden">
                    <div className="p-2  border-b border-gray-100 flex items-center justify-between">
                      <span className="  text-gray-900 flex items-center gap-2"><Filter size={16} /> Filter</span>
                      <button onClick={() => setShowFilterDropdown(false)} className="text-red-500 hover:bg-red-50 p-1 rounded-full"><Plus size={18} className="rotate-45" /></button>
                    </div>
                    {/* ... (rest of filter content) */}
                  </div>
                )}
              </div>
              <div className="relative w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F2020]" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-9 p-2 border border-gray-300 rounded text-xs  focus:outline-none focus:ring-1 focus:ring-red-500 bg-white text-xs"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-300 rounded bg-white overflow-hidden p-0.5">
                <button
                  onClick={() => setViewMode('list')}
                  className={`w-6 h-6 flex items-center justify-center  rounded ${viewMode === 'list' ? 'bg-[#10B981] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  <List size={15} />
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`w-6 h-6 flex items-center justify-center  rounded ${viewMode === 'kanban' ? 'bg-[#10B981] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  <LayoutGrid size={15} />
                </button>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 bg-red-600 text-white rounded flex items-center gap-1.5 text-xs  hover:bg-red-700 "
              >
                <Plus size={18} /> Add Estimation
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F2020]" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-9 p-2 border border-gray-300 rounded text-xs  focus:outline-none focus:ring-1 focus:ring-red-500 bg-white text-xs"
                />
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-[#F9FAFB] p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="h-9 px-3 border border-gray-300 rounded text-xs  text-gray-700 flex items-center gap-2 bg-white hover:bg-gray-50 transition-colors"
              >
                <ChevronsUpDown size={14} className="text-[#1F2020]" /> Sort By: <span className=" text-gray-900">{sortConfig.direction === 'asc' ? 'Oldest' : 'Newest'}</span> <ChevronDown size={14} />
              </button>
              {showSortDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded  shadow-xl z-[100] w-40 overflow-hidden">
                  <button onClick={() => { setSortConfig({ key: 'id', direction: 'desc' }); setShowSortDropdown(false); }} className="w-full p-2 text-left text-xs  hover:bg-gray-50">Newest</button>
                  <button onClick={() => { setSortConfig({ key: 'id', direction: 'asc' }); setShowSortDropdown(false); }} className="w-full p-2 text-left text-xs  hover:bg-gray-50">Oldest</button>
                </div>
              )}
            </div>
            <div className="relative">
              <DateRangeDropdown
                value={dateRangeType}
                onChange={setDateRangeType}
                options={['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'Custom Range']}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="h-9 px-3 border border-gray-300 rounded text-xs  text-gray-700 flex items-center gap-2 bg-white hover:bg-gray-50"
            >
              <Filter size={16} className="text-[#1F2020]" /> Filter <ChevronDown size={14} />
            </button>
            <button
              onClick={() => setShowManageColumns(!showManageColumns)}
              className="h-9 px-3 border border-gray-300 rounded text-xs  text-gray-700 flex items-center gap-2 bg-[#F0F2FF] text-[#4F46E5] hover:bg-[#E5E7FF] transition-colors border-none "
            >
              Manage Columns
            </button>
            <div className="flex items-center border border-gray-300 rounded bg-white overflow-hidden p-0.5">
              <button onClick={() => setViewMode('list')} className={`w-8 h-8 flex items-center justify-center rounded ${viewMode === 'list' ? 'bg-[#10B981] text-white' : 'text-gray-500 hover:bg-gray-100'}`}><List size={18} /></button>
              <button onClick={() => setViewMode('kanban')} className={`w-8 h-8 flex items-center justify-center rounded ${viewMode === 'kanban' ? 'bg-[#10B981] text-white' : 'text-gray-500 hover:bg-gray-100'}`}><LayoutGrid size={18} /></button>
            </div>
          </div>
        </div>
        {viewMode === 'kanban' ? (
          <div className="flex gap-2 min-w-max h-full pb-8">
            {columns.map((col) => {
              const columnEstimations = filteredEstimations.filter((item) => {
                const status = (item.status || '').toLowerCase();
                const colId = col.id.toLowerCase();
                const isRevision = (item.version || 1) > 1 || item.parent_id;

                if (colId === 'sent') {
                  return status === 'sent' && !isRevision;
                }
                if (colId === 'revised') {
                  return status === 'revised' || (status === 'sent' && isRevision);
                }
                return status === colId;
              });
              return (
                <div
                  key={col.id}
                  className={`w-[300px] flex flex-col h-full rounded border transition-all duration-200 overflow-hidden ${dragOverStatus === col.id
                    ? 'bg-blue-50 border-blue-400 shadow-inner scale-[1.01]'
                    : 'bg-[#F3F4F6] border-gray-200'
                    }`}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  {/* Column Header */}
                  <div className="p-2  flex items-center justify-between sticky top-0 z-10 pointer-events-none group">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }}></div>
                      <h2 className="text-xs   text-gray-800  ">{col.name}</h2>
                    </div>
                    <button className="w-6 h-6 rounded bg-gray-50 flex items-center justify-center border border-gray-200 hover:bg-gray-100 pointer-events-auto">
                      <Plus size={14} className="text-gray-500" />
                    </button>
                  </div>

                  {/* Cards Container */}
                  <div
                    className="flex-1 overflow-y-auto p-2  space-y-4 custom-scrollbar"
                  >
                    {columnEstimations.length > 0 ? (
                      columnEstimations.map((item) => (
                        <div
                          key={item.id}
                          className="border border-gray-200 rounded p-2 mb-4 bg-white  hover:shadow-lg transition-all duration-300 cursor-move relative group/card"
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className="flex items-start justify-between mb-3 pointer-events-none">
                            <div className="flex items-center gap-3 flex-1">
                              {visibleColumns['Client'] && (
                                item.logo ? (
                                  <img
                                    src={item.logo}
                                    alt="company"
                                    draggable="false"
                                    className="w-10 h-10 rounded  object-cover border border-gray-200"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded  bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs">
                                    {getCardValue(item, 'company')[0]}
                                  </div>
                                )
                              )}
                              <div>
                                {visibleColumns['Client'] && (
                                  <h3 className=" text-base  text-gray-900">{getCardValue(item, 'company')}</h3>
                                )}
                                {visibleColumns['Project'] && (
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs text-gray-500 ">{getCardValue(item, 'type')}</p>
                                    {item.status === 'Sent' && ((item.version || 1) > 1 || item.parent_id) && (
                                      <span className="px-1.5 py-0.5 bg-teal-50 text-teal-600 text-xs font-[600] rounded border border-teal-100 flex items-center gap-1">
                                        <Send size={10} /> SENT
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="relative pointer-events-auto">
                              {visibleColumns['Action'] && (
                                <button
                                  onClick={() => setActionMenu(actionMenu === item.id ? null : item.id)}
                                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                  <MoreVertical size={16} className="text-[#1F2020]" />
                                </button>
                              )}
                              {actionMenu === item.id && (
                                <ActionMenu
                                  estimation={item}
                                  onClose={() => setActionMenu(null)}
                                />
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-3 line-clamp-2 leading-relaxed pointer-events-none">{getCardValue(item, 'desc')}</p>
                          <div className="mt-4 space-y-2 text-xs text-gray-700 bg-gray-50 rounded  p-3 border border-gray-100 pointer-events-none">
                            {visibleColumns['Estimations ID'] && (
                              <p className="flex items-center gap-2"><Hash size={14} className="text-[#1F2020]" /> <span className="text-gray-500">Estimate ID :</span> <span className=" text-white ">{getCardValue(item, 'estimateId')}</span></p>
                            )}
                            {visibleColumns['Amount'] && (
                              <p className="flex items-center gap-2"><CircleDollarSign size={14} className="text-[#1F2020]" /> <span className="text-gray-500">Amount :</span> <span className=" text-gray-900">{getCardValue(item, 'amount')}</span></p>
                            )}
                            {visibleColumns['Date'] && (
                              <p className="flex items-center gap-2"><Calendar size={14} className="text-[#1F2020]" /> <span className="text-gray-500">Date :</span> <span className="">{getCardValue(item, 'date')}</span></p>
                            )}
                            {visibleColumns['Expiry Date'] && (
                              <p className="flex items-center gap-2"><Calendar size={14} className="text-[#1F2020]" /> <span className="text-gray-500">Expiry Date :</span> <span className="">{getCardValue(item, 'expiry')}</span></p>
                            )}
                          </div>
                          <div className=" flex items-center gap-3 p-2 border-t border-gray-200 pointer-events-none">
                            {visibleColumns['Estimation By'] && (
                              <>
                                <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-200">
                                  {item.avatar ? (
                                    <img
                                      src={item.avatar}
                                      alt="creator"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs  ">
                                      {(item.creator_first_name?.[0] || 'U')}
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm  text-gray-800">{getCardValue(item, 'owner')}</p>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-40 text-[#1F2020] border-2 border-dashed border-gray-200 rounded bg-white/50">
                        <FileText size={24} className="mb-2 opacity-20" />
                        <p className="text-xs">No estimations</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded  overflow-hidden ">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F9FAFB] border-b border-gray-200">
                <tr>
                  <th className="p-2  w-10 text-center"><input type="checkbox" className="rounded border-gray-300" /></th>
                  <th className="p-2  w-8"></th>
                  {visibleColumns['Estimations ID'] && (
                    <th
                      className="p-2  text-xs   text-gray-700  tracking-wider cursor-pointer hover:bg-gray-100 group transition-colors"
                      onClick={() => handleSort('estimateId')}
                    >
                      <div className="flex items-center gap-2">
                        Estimations ID {getSortIcon('estimateId')}
                      </div>
                    </th>
                  )}
                  {visibleColumns['Client'] && (
                    <th
                      className="p-2  text-xs   text-gray-700  tracking-wider cursor-pointer hover:bg-gray-100 group transition-colors"
                      onClick={() => handleSort('Name')}
                    >
                      <div className="flex items-center gap-2">
                        Client {getSortIcon('Name')}
                      </div>
                    </th>
                  )}
                  {visibleColumns['Amount'] && (
                    <th
                      className="p-2  text-xs   text-gray-700  tracking-wider cursor-pointer hover:bg-gray-100 group transition-colors"
                      onClick={() => handleSort('Amount')}
                    >
                      <div className="flex items-center gap-2">
                        Amount {getSortIcon('Amount')}
                      </div>
                    </th>
                  )}
                  {visibleColumns['Project'] && (
                    <th
                      className="p-2  text-xs   text-gray-700  tracking-wider cursor-pointer hover:bg-gray-100 group transition-colors"
                      onClick={() => handleSort('Project')}
                    >
                      <div className="flex items-center gap-2">
                        Project {getSortIcon('Project')}
                      </div>
                    </th>
                  )}
                  {visibleColumns['Date'] && (
                    <th
                      className="p-2  text-xs   text-gray-700  tracking-wider cursor-pointer hover:bg-gray-100 group transition-colors"
                      onClick={() => handleSort('Date')}
                    >
                      <div className="flex items-center gap-2">
                        Date {getSortIcon('Date')}
                      </div>
                    </th>
                  )}
                  {visibleColumns['Expiry Date'] && (
                    <th
                      className="p-2  text-xs   text-gray-700  tracking-wider cursor-pointer hover:bg-gray-100 group transition-colors"
                      onClick={() => handleSort('Expiry Date')}
                    >
                      <div className="flex items-center gap-2">
                        Expiry Date {getSortIcon('Expiry Date')}
                      </div>
                    </th>
                  )}
                  {visibleColumns['Estimation By'] && (
                    <th
                      className="p-2  text-xs   text-gray-700  tracking-wider cursor-pointer hover:bg-gray-100 group transition-colors"
                      onClick={() => handleSort('Estimation By')}
                    >
                      <div className="flex items-center gap-2">
                        Estimation By {getSortIcon('Estimation By')}
                      </div>
                    </th>
                  )}
                  {visibleColumns['Status'] && (
                    <th
                      className="p-2  text-xs   text-gray-700  tracking-wider cursor-pointer hover:bg-gray-100 group transition-colors"
                      onClick={() => handleSort('Status')}
                    >
                      <div className="flex items-center gap-2">
                        Status {getSortIcon('Status')}
                      </div>
                    </th>
                  )}
                  {visibleColumns['Action'] && (
                    <th className="p-2  text-xs   text-gray-700  tracking-wider text-right">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEstimations.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-2  text-center"><input type="checkbox" className="rounded border-gray-300" /></td>
                    <td className="p-2  text-center"><Star size={16} className="text-gray-300 hover:text-yellow-400 cursor-pointer" /></td>
                    {visibleColumns['Estimations ID'] && (
                      <td className="p-2  text-xs  text-white  ">{getCardValue(item, 'estimateId')}</td>
                    )}
                    {visibleColumns['Client'] && (
                      <td className="p-2 ">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-xs  text-gray-600 border border-gray-200 overflow-hidden">
                            {item.logo ? <img src={item.logo} alt="" className="w-full h-full object-cover" /> : getCardValue(item, 'company')[0]}
                          </div>
                          <span className="text-xs   text-gray-900">{getCardValue(item, 'company')}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns['Amount'] && (
                      <td className="p-2  text-xs   text-gray-700">{getCardValue(item, 'amount')}</td>
                    )}
                    {visibleColumns['Project'] && (
                      <td className="p-2 ">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-xs  text-white  border border-blue-100">
                            {getCardValue(item, 'type')[0]}
                          </div>
                          <span className="text-xs  text-gray-600">{getCardValue(item, 'type')}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns['Date'] && (
                      <td className="p-2  text-xs  text-gray-600">{getCardValue(item, 'date')}</td>
                    )}
                    {visibleColumns['Expiry Date'] && (
                      <td className="p-2  text-xs  text-gray-600">{getCardValue(item, 'expiry')}</td>
                    )}
                    {visibleColumns['Estimation By'] && (
                      <td className="p-2 ">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs  text-gray-600 overflow-hidden border border-gray-200">
                            {item.avatar ? <img src={item.avatar} alt="" className="w-full h-full object-cover" /> : getCardValue(item, 'owner')[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs   text-gray-900">{getCardValue(item, 'owner')}</span>
                            <span className="text-xs text-gray-500">Lead Dev</span>
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleColumns['Status'] && (
                      <td className="p-2 ">
                        <span
                          className="px-2.5 py-1 text-xs  rounded  tracking-wide inline-block"
                          style={{ backgroundColor: getStatusColor(item.status) + '20', color: getStatusColor(item.status) }}
                        >
                          {item.status}
                        </span>
                      </td>
                    )}
                    {visibleColumns['Action'] && (
                      <td className="p-2  text-right relative">
                        <button
                          onClick={() => setActionMenu(actionMenu === item.id ? null : item.id)}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <MoreVertical size={16} className="text-gray-500" />
                        </button>
                        {actionMenu === item.id && (
                          <ActionMenu
                            estimation={item}
                            onClose={() => setActionMenu(null)}
                            className="right-12 top-0"
                          />
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Table Footer / Pagination */}
            <div className="p-2  bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs ">
              <div className="flex items-center gap-2 text-gray-600">
                <span>Row Per Page</span>
                <select className="border border-gray-300 rounded px-1 py-0.5 bg-white outline-none">
                  <option>10</option>
                  <option>20</option>
                  <option>50</option>
                </select>
                <span>Entries</span>
              </div>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-500">‹</button>
                <button className="w-8 h-8 flex items-center justify-center rounded bg-red-600 text-white ">1</button>
                <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-500">›</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Load More (Mainly for Kanban) */}
      {viewMode === 'kanban' && (
        <div className="flex justify-center py-6 bg-white border-t border-gray-100 shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.05)]">
          <button className="h-10 px-8 bg-red-600 text-white rounded flex items-center gap-2 text-[15px]  hover:bg-red-700 transition-colors shadow-md">
            <RotateCcw size={16} /> Load More
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="px-6 py-4 flex items-center justify-between text-[12px] text-gray-500 bg-white border-t border-gray-200">
        <p>Copyright © 2026 <span className="text-red  ">CRMS</span></p>
        <div className="flex items-center gap-2 ">
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
          setSelectedEstimation(null);
        }}
        onSubmit={handleAddEstimation}
        onGeneratePDF={(data) => {
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
          setSelectedEstimation(quotationToView);
          setIsViewModalOpen(true);
        }}
        initialData={selectedEstimation}
      />

      <ViewEstimationModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedEstimation(null);
        }}
        estimation={selectedEstimation}
      />

      <ReviseQuotationModal
        isOpen={isReviseModalOpen}
        onClose={() => setIsReviseModalOpen(false)}
        quotation={selectedEstimation}
        onUpdate={fetchEstimations}
      />
    </div>
  );
};

export default EstimationsPage;
