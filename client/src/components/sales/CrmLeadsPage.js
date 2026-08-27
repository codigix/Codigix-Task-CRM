import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  MoreVertical,
  Star,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Layout,
  ChevronDown,
  List,
  Grid,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  FileJson,
  FileText,
  Briefcase,
  Search,
  Filter,
  User
} from 'lucide-react';
import AdvancedDataTable from '../common/AdvancedDataTable';
import AdvancedFilterDropdown from '../common/AdvancedFilterDropdown';
import AdvancedDateRangePicker from '../common/AdvancedDateRangePicker';
import SortByDropdown from '../common/SortByDropdown';
import ManageColumnsDropdown from '../common/ManageColumnsDropdown';
import ContactActionDropdown from '../common/ContactActionDropdown';
import ExportDropdown from '../common/ExportDropdown';
import leadsData from '../../data/crmLeadsData.json';
import AddNewLeadModal from './AddNewLeadModal';
import { leadsAPI, companiesAPI } from '../../services/api';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { formatINR } from '../../utils/currencyUtils';
import { useAuth } from '../../hooks/useAuth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CrmLeadsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState(leadsData.leads);
  const [statusStats, setStatusStats] = useState(leadsData.statusStats);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('kanban');
  const [selectedFilters, setSelectedFilters] = useState({});
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [sortBy, setSortBy] = useState('newest');
  const [visibleColumns, setVisibleColumns] = useState(['name', 'project_name', 'business_type', 'industry', 'created_at', 'owner_name', 'follow_up_date', 'status', 'source', 'id']);
  const [companies, setCompanies] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [draggedLead, setDraggedLead] = useState(null);
  const [leadToEdit, setLeadToEdit] = useState(null);
  const [columnMenuOpen, setColumnMenuOpen] = useState(null);
  const scrollRef = useRef(null);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
      setColumnMenuOpen(null);
    };
    if (openMenuId || columnMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId, columnMenuOpen]);

  const handleDragStart = (lead) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (newStatus) => {
    if (!draggedLead || draggedLead.status === newStatus) return;

    try {
      await leadsAPI.update(draggedLead.id, {
        ...draggedLead,
        status: newStatus,
        lead_status: newStatus
      });

      setLeads(prev =>
        prev.map(lead =>
          lead.id === draggedLead.id
            ? { ...lead, status: newStatus, lead_status: newStatus }
            : lead
        )
      );

      // Update status stats
      const oldStatus = draggedLead.status;
      setStatusStats(prev => {
        const updated = [...prev];
        const oldIndex = updated.findIndex(s => s.status === oldStatus);
        const newIndex = updated.findIndex(s => s.status === newStatus);

        if (oldIndex >= 0) {
          updated[oldIndex].leads = Math.max(0, updated[oldIndex].leads - 1);
          updated[oldIndex].value = Math.max(0, updated[oldIndex].value - (draggedLead.value || 0));
        }

        if (newIndex >= 0) {
          updated[newIndex].leads += 1;
          updated[newIndex].value += (draggedLead.value || 0);
        } else {
          updated.push({
            status: newStatus,
            leads: 1,
            value: draggedLead.value || 0
          });
        }
        return updated;
      });

      showSuccessToast(`Lead status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating lead status:', err);
      showErrorToast('Failed to update lead status');
    } finally {
      setDraggedLead(null);
    }
  };

  const fetchData = async () => {
    try {
      const authFilters = {
        department: user?.department || '',
        user_id: user?.id || '',
        role: user?.role || ''
      };

      const [leadsRes, companiesRes] = await Promise.all([
        leadsAPI.getAll(authFilters),
        companiesAPI.getAll(),
      ]);

      if (leadsRes && Array.isArray(leadsRes)) {
        const formattedLeads = leadsRes.map(lead => {
          const displayName = lead.lead_name || lead.name || (lead.first_name && lead.last_name
            ? `${lead.first_name} ${lead.last_name}`
            : 'Unknown');
          const initials = displayName
            .split(' ')
            .slice(0, 2)
            .map(n => n[0])
            .join('')
            .toUpperCase() || 'N/A';

          return {
            id: lead.id,
            name: displayName,
            email: lead.email || '',
            phone: lead.phone || '',
            company: lead.company || lead.company_name || '',
            source: lead.lead_source || lead.source || 'Website',
            status: lead.lead_status || lead.status || 'Not Contacted',
            rating: lead.rating || 5,
            initials: initials,
            value: lead.value || 0,
            location: lead.location || '',
            currency: lead.currency || 'USD',
            industry: lead.industry || '',
            owner_id: lead.owner_id || null,
            owner_name: lead.owner_first_name ? `${lead.owner_first_name} ${lead.owner_last_name || ''}`.trim() : (lead.owner_name || ''),
            created_at: lead.created_at || null,
            follow_up_date: lead.follow_up_date || null,
            ...lead
          };
        });
        setLeads(formattedLeads);

        const targetStatuses = ['Not Contacted', 'Contacted', 'Qualified', 'Lost'];
        const newStatusStats = targetStatuses.map(status => {
          const statusLeads = formattedLeads.filter(l => {
            if (status === 'Not Contacted') return l.status === 'Not Contacted' || l.status === 'New';
            if (status === 'Qualified') return l.status === 'Qualified' || l.status === 'Converted to Deal';
            if (status === 'Lost') return l.status === 'Lost' || l.status === 'Unqualified';
            return l.status === status;
          });
          return {
            status,
            leads: statusLeads.length,
            value: statusLeads.reduce((sum, l) => sum + (l.value || 0), 0)
          };
        });
        setStatusStats(newStatusStats);
      }

      if (companiesRes && Array.isArray(companiesRes)) {
        setCompanies(companiesRes);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setLeads(leadsData.leads);
      setStatusStats(leadsData.statusStats);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateLead = async (formData) => {
    try {
      let response;
      if (leadToEdit) {
        response = await leadsAPI.update(leadToEdit.id, formData);
        showSuccessToast(`Lead updated successfully!`);
      } else {
        response = await leadsAPI.create(formData);
        showSuccessToast(`Lead created successfully!`);

        // Create a task for the owner if assigned
        if (response && response.owner_id) {
          const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
          await fetch(`${apiUrl}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `Follow up with new lead: ${response.lead_name || response.name}`,
              description: `Initial contact for lead ${response.id}. ${response.notes || ''}`,
              priority: 'High',
              status: 'In Progress',
              assigned_to: response.owner_id,
              linked_type: 'Lead',
              linked_id: response.id
            }),
          });
        }
      }

      if (response) {
        fetchData();
        setIsModalOpen(false);
        setLeadToEdit(null);
        return response;
      }
    } catch (err) {
      const errorMessage = err.message || `Failed to ${leadToEdit ? 'update' : 'create'} lead`;
      showErrorToast(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const handleDeleteLead = async (id) => {
    try {
      await leadsAPI.delete(id);
      showSuccessToast('Lead deleted successfully');
      fetchData();
    } catch (err) {
      showErrorToast('Failed to delete lead');
    }
  };

  const handleCloneLead = async (lead) => {
    try {
      const { id, ...cloneData } = lead;
      cloneData.name = `${lead.name} (Clone)`;
      await leadsAPI.create(cloneData);
      showSuccessToast('Lead cloned successfully');
      fetchData();
    } catch (err) {
      showErrorToast('Failed to clone lead');
    }
  };

  const statusColors = {
    'New': { dot: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700' },
    'Not Contacted': { dot: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700' },

    'Contacted': { dot: '', light: 'bg-yellow-50', text: 'text-yellow-700' },
    'Qualified': { dot: 'bg-green-500', light: 'bg-green-50', text: 'text-green-700' },
    'Lost': { dot: 'bg-red-500', light: 'bg-red-50', text: 'text-red-700' }
  };

  const sourceColors = {
    'Website': { light: 'bg-indigo-50', text: 'text-indigo-700' },
    'Referral': { light: 'bg-pink-50', text: 'text-pink-700' },
    'Social Media': { light: 'bg-blue-50', text: 'text-blue-700' },
    'Google Ads': { light: 'bg-orange-50', text: 'text-orange-700' },
    'LinkedIn': { light: 'bg-cyan-50', text: 'text-cyan-700' },
    'Email': { light: 'bg-teal-50', text: 'text-teal-700' },
    'Direct': { light: 'bg-slate-50', text: 'text-slate-700' },
    'Other': { light: 'bg-gray-50', text: 'text-gray-700' }
  };

  const columns = [
    {
      key: 'name',
      label: 'Client Name',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <Star size={14} className="text-gray-300 hover:text-yellow-400 cursor-pointer transition-colors" />
          {/* <div className="w-6 h-6 rounded flex items-center justify-center bg-red-100 text-red  text-xs font-[500]">
            {row.initials}
          </div> */}
          <button
            onClick={() => navigate(`/lead/${row.id}`)}
            className="text-gray-900 hover:text-red  transition  text-xs text-left"
          >
            {value}
          </button>
        </div>
      )
    },
    {
      key: 'project_name',
      label: 'Project Name',
      sortable: true,
      render: (value) => <span className="text-xs text-gray-700 ">{value || '-'}</span>
    },
    {
      key: 'business_type',
      label: 'Business Type',
      sortable: true,
      render: (value) => <span className="text-xs text-gray-600">{value || '-'}</span>
    },
    {
      key: 'industry',
      label: 'Services Name',
      sortable: true,
      render: (value) => <span className="text-xs text-gray-600">{value || '-'}</span>
    },
    {
      key: 'created_at',
      label: 'Leads Generate Date',
      sortable: true,
      render: (value) => <span className="text-xs text-gray-500">{formatDate(value)}</span>
    },
    {
      key: 'owner_name',
      label: 'Assignee',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[8px]  text-gray-600">
            {value ? value.split(' ').map(n => n[0]).join('') : 'U'}
          </div>
          <span className="text-xs text-gray-600 ">{value || 'Unassigned'}</span>
        </div>
      )
    },
    {
      key: 'follow_up_date',
      label: 'Next Followup',
      sortable: true,
      render: (value) => <span className="text-xs text-gray-500">{formatDate(value)}</span>
    },
    {
      key: 'status',
      label: 'Current Status',
      sortable: true,
      render: (value) => {
        const colors = statusColors[value] || statusColors['New'];
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs  ${colors.light} ${colors.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${colors.dot}`}></span>
            {value}
          </span>
        );
      }
    },
    {
      key: 'source',
      label: 'Sources',
      sortable: true,
      render: (value) => {
        const colors = sourceColors[value] || sourceColors['Other'];
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs  ${colors.light} ${colors.text}`}>
            {value}
          </span>
        );
      }
    },
    {
      key: 'id',
      label: 'Action',
      render: (value, rowData) => (
        <ContactActionDropdown
          contact={rowData}
          entityName="lead"
          variant="red"
          onEdit={(lead) => {
            setLeadToEdit(lead);
            setIsModalOpen(true);
          }}
          onDelete={handleDeleteLead}
          onClone={handleCloneLead}
          onPreview={(lead) => navigate(`/lead/${lead.id}`)}
        />
      )
    }
  ];

  const filterConfigs = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { label: 'Contacted', value: 'Contacted' },
        { label: 'Not Contacted', value: 'Not Contacted' },

        { label: 'Qualified', value: 'Qualified' },
        { label: 'Lost', value: 'Lost' },
      ]
    },
    {
      key: 'source',
      label: 'Source',
      options: [
        { label: 'Website', value: 'Website' },
        { label: 'Referral', value: 'Referral' },
        { label: 'Social Media', value: 'Social Media' },
      ]
    }
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-[500] text-gray-900">Leads</h1>
            <span className="bg-red-100 text-red  text-[12px]  text-black px-2 py-1 rounded-full">
              {leads.length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 ">
            <span>Home</span>
            <ChevronRight size={14} />
            <span className="text-gray-900">Leads</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ExportDropdown />
          <button onClick={fetchData} className="p-2 bg-white border border-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors">
            <RotateCcw size={16} />
          </button>
          <button className="p-2 bg-white border border-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors">
            <Layout size={16} />
          </button>
        </div>
      </div>

      <div className="p-4 pt-0">
        {/* Row 1: Search and Add Button */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded text-xs focus:outline-none focus:border-red-500 transition-colors "
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 p-2 bg-red-600 text-white rounded text-xs  hover:bg-red-700 transition-colors "
            >
              <Plus size={15} />
              Add Lead
            </button>
          </div>
        </div>

        {/* Row 2: Filters and View Toggle */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <SortByDropdown
              onSelect={setSortBy}
              currentSort={sortBy}
            />
            <AdvancedDateRangePicker
              onChange={setDateRange}
              currentRange={dateRange}
            />
            <AdvancedFilterDropdown
              filterConfigs={filterConfigs}
              selectedFilters={selectedFilters}
              onFilterChange={setSelectedFilters}
            />
            <ManageColumnsDropdown
              columns={columns}
              visibleColumns={visibleColumns}
              onChange={setVisibleColumns}
            />
          </div>

          <div className="flex items-center bg-gray-50 border border-gray-100 rounded p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white  text-red  ' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white  text-red  ' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid size={18} />
            </button>
          </div>
        </div>

        {viewMode === 'kanban' ? (
          <div className="relative group">
            <button
              onClick={() => handleScroll('left')}
              className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-lg flex items-center justify-center text-[#1F2020] hover:text-red  opacity-0 group-hover:opacity-100 transition-all"
            >
              <ChevronLeft size={20} />
            </button>

            <div
              ref={scrollRef}
              className="flex gap-2 overflow-x-auto pb-6 no-scrollbar"
            >
              {statusStats.map((statusObj) => {
                const stageLeads = leads.filter(lead => {
                  let matchesStatus = lead.status === statusObj.status;
                  if (statusObj.status === 'Not Contacted') matchesStatus = lead.status === 'Not Contacted' || lead.status === 'New';
                  if (statusObj.status === 'Qualified') matchesStatus = lead.status === 'Qualified' || lead.status === 'Qualified' || lead.status === 'Converted to Deal';
                  if (statusObj.status === 'Lost') matchesStatus = lead.status === 'Lost' || lead.status === 'Unqualified';

                  const matchesSearch = !searchTerm ||
                    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (lead.project_name && lead.project_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (lead.business_type && lead.business_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    lead.email.toLowerCase().includes(searchTerm.toLowerCase());

                  const matchesFilters = Object.keys(selectedFilters).every(key => {
                    const values = selectedFilters[key];
                    return !values || values.length === 0 || values.includes(lead[key]);
                  });

                  return matchesStatus && matchesSearch && matchesFilters;
                });

                return (
                  <div
                    key={statusObj.status}
                    className="flex-shrink-0 w-[250px] border border-gray-200 p-2 rounded "
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(statusObj.status)}
                  >
                    <div className={`${statusColors[statusObj.status]?.light || 'bg-blue-50'} border-b-2 ${statusColors[statusObj.status]?.dot.replace('bg-', 'border-') || 'border-blue-500'} rounded-t-lg p-3 mb-4`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <div className={`w-2.5 h-2.5 rounded-full ${statusColors[statusObj.status]?.dot || 'bg-blue-500'} `}></div>
                            <h3 className={`text-sm font-[500] ${statusColors[statusObj.status]?.text || 'text-blue-700'}`}>{statusObj.status}</h3>
                          </div>
                          <div className="px-1">
                            <p className="text-xs text-gray-600 ">
                              {stageLeads.length} Leads
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 relative">
                          <button className=" hover:bg-blue-50 p-1 rounded transition-colors">
                            <Plus size={15} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setColumnMenuOpen(columnMenuOpen === statusObj.status ? null : statusObj.status);
                            }}
                            className="hover:bg-red-600  p-1 rounded transition-colors  hover:opacity-90 hover:text-white"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {columnMenuOpen === statusObj.status && (
                            <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-gray-100 rounded shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                              <button className="w-full text-left p-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors ">
                                Edit
                              </button>
                              <button className="w-full text-left p-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors ">
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 min-h-[100px] px-1">
                      {stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className={`bg-white rounded border-t-2 p-3 border border-gray-200 hover:shadow-lg transition-all cursor-move group/card relative ${draggedLead?.id === lead.id ? 'opacity-50 border-red-200' : 'border-gray-200 hover:border-red-100'} ${statusColors[lead.status]?.dot || 'border-blue-500'}`}
                          draggable
                          onDragStart={() => handleDragStart(lead)}
                        >
                          <div className="absolute top-2 right-2 z-10">
                            <ContactActionDropdown
                              contact={lead}
                              entityName="lead"
                              variant="red"
                              onEdit={(l) => {
                                setLeadToEdit(l);
                                setIsModalOpen(true);
                              }}
                              onDelete={handleDeleteLead}
                              onClone={handleCloneLead}
                              onPreview={(l) => navigate(`/lead/${l.id}`)}
                            />
                          </div>

                          <div className="flex items-start gap-3 mb-3 pr-6">
                            {/* <div className="w-6 h-6 rounded flex items-center justify-center bg-red-100 text-red  text-xs font-[500]">
                              {lead.initials}
                            </div> */}
                            <div className="flex-1 min-w-0">
                              <h4
                                className="text-sm font-[500] text-black truncate mb-1 cursor-pointer hover:text-red-600 transition-colors hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/lead/${lead.id}`);
                                }}
                              >
                                {lead.name}
                              </h4>
                              <div className="space-y-1.5 mt-2">
                                {lead.project_name && (
                                  <div className="flex items-center gap-2 text-xs  text-gray-700">
                                    <FileText size={12} className="text-blue-500" />
                                    <span className="truncate">{lead.project_name}</span>
                                  </div>
                                )}
                                {lead.business_type && (
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Briefcase size={12} className="text-green-500" />
                                    <span className="truncate">{lead.business_type}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <Layout size={12} className="text-orange-500" />
                                  <span className="truncate">{lead.industry || 'No Service'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <User size={12} className="text-purple-500" />
                                  <span className="truncate">{lead.owner_name || 'Unassigned'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <Filter size={12} className="text-indigo-500" />
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-[500]  ${sourceColors[lead.source]?.light || 'bg-gray-50'} ${sourceColors[lead.source]?.text || 'text-gray-600'}`}>
                                    {lead.source || 'No Source'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5 mb-3 p-2 bg-gray-50/50 rounded-md border border-gray-100/50">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Generate Date:</span>
                              <span className="text-gray-900 ">{formatDate(lead.created_at)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Next Followup:</span>
                              <span className="text-red-600 font-[500]">{formatDate(lead.follow_up_date)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-50">
                            <div className="flex items-center gap-3">
                              <Phone size={14} className="text-blue-400 hover:text-blue-600 transition-colors cursor-pointer" />
                              <MessageSquare size={14} className="text-green-400 hover:text-green-600 transition-colors cursor-pointer" />
                              <FileText size={14} className="text-orange-400 hover:text-orange-600 transition-colors cursor-pointer" />
                            </div>
                          </div>
                        </div>
                      ))}

                      {stageLeads.length === 0 && (
                        <div className="h-24 border-2 border-dashed border-gray-100 rounded flex items-center justify-center bg-gray-50/50">
                          <p className="text-xs text-gray-300 font-[500]  ">No Leads</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => handleScroll('right')}
              className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-lg flex items-center justify-center text-[#1F2020] hover:text-red  opacity-0 group-hover:opacity-100 transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        ) : (
          <AdvancedDataTable
            columns={columns}
            data={leads}
            title="Leads"
            entityName="Lead"
            addLabel="Add Lead"
            onAdd={() => setIsModalOpen(true)}
            filterConfigs={filterConfigs}
            searchKeys={['name', 'project_name', 'business_type', 'industry', 'owner_name', 'source', 'status']}
            hideInternalHeader={true}
            externalSearchTerm={searchTerm}
            externalFilters={selectedFilters}
            externalVisibleColumns={visibleColumns}
            onVisibleColumnsChange={setVisibleColumns}
            externalSortBy={sortBy}
            onSortByChange={setSortBy}
            externalDateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        )}
      </div>

      <AddNewLeadModal
        isOpen={isModalOpen}
        currentUser={user}
        onClose={() => {
          setIsModalOpen(false);
          setLeadToEdit(null);
        }}
        onSubmit={handleCreateLead}
        companies={companies}
        leadToEdit={leadToEdit}
      />
    </div>
  );
};

export default CrmLeadsPage;
