import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  MessageSquare,
  FileJson,
  FileText,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Star,
  ChevronDown,
  RotateCcw,
  Layout,
  List,
  Grid,
  Search,
  Filter,
  Plus,
  Briefcase
} from 'lucide-react';
import AdvancedDataTable from '../common/AdvancedDataTable';
import AdvancedFilterDropdown from '../common/AdvancedFilterDropdown';
import AdvancedDateRangePicker from '../common/AdvancedDateRangePicker';
import SortByDropdown from '../common/SortByDropdown';
import ManageColumnsDropdown from '../common/ManageColumnsDropdown';
import ContactActionDropdown from '../common/ContactActionDropdown';
import AddNewDealModal from './AddNewDealModal';
import { dealsAPI, contactsAPI, companiesAPI, projectAPI, pipelineStagesAPI, leadsAPI } from '../../services/api';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { useAuth } from '../../hooks/useAuth';

const PIPELINE_STAGE_ORDER = [
  'Converted Lead',
  'Quotation',
  'Won',
  'Lost'
];

const STAGES = PIPELINE_STAGE_ORDER.map(name => ({ name }));

const CrmDealsPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [stageStats, setStageStats] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [pipelineStages, setPipelineStages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState(location.pathname === '/deals-list' ? 'list' : 'kanban'); // 'kanban' or 'list'
  const [selectedFilters, setSelectedFilters] = useState({});
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [sortBy, setSortBy] = useState('newest');
  const [visibleColumns, setVisibleColumns] = useState(['client_name', 'project_name', 'business_type', 'value', 'stage', 'status', 'progress', 'owner', 'date', 'id']);
  const [activeMenuDealId, setActiveMenuDealId] = useState(null);
  const [draggedDeal, setDraggedDeal] = useState(null);
  const [dealToEdit, setDealToEdit] = useState(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollRef = useRef(null);

  const getProbabilityFromStage = (stageName) => {
    if (!stageName) return 10;
    const stage = pipelineStages.find(s => s.name === stageName);
    return stage ? stage.probability : 10;
  };

  const handleDragStart = (deal, sourceStage) => {
    setDraggedDeal({ ...deal, sourceStage });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (targetStage) => {
    if (!draggedDeal || draggedDeal.sourceStage === targetStage) {
      setDraggedDeal(null);
      return;
    }

    try {
      // Optimistic update
      const now = new Date().toISOString();
      const updatedDeals = deals.map(d =>
        d.id === draggedDeal.id ? { ...d, stage: targetStage, updated_at: now } : d
      ).sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at || 0);
        const dateB = new Date(b.updated_at || b.created_at || 0);
        return dateB - dateA;
      });
      setDeals(updatedDeals);
      updateStageStats(updatedDeals);

      // Special handling: Auto-convert virtual deal if moved out of 'Converted Lead'
      if (Number(draggedDeal.id) > 1000000 && targetStage !== 'Converted Lead') {
        const leadId = Number(draggedDeal.id) - 1000000;
        const conversionData = {
          deal_name: draggedDeal.project_name || draggedDeal.deal_name || 'New Deal',
          deal_value: draggedDeal.value || 0,
          currency: draggedDeal.currency || 'INR',
          description: draggedDeal.description || '',
          company_id: draggedDeal.company_id,
          pipeline: targetStage,
          deal_stage: targetStage
        };

        await leadsAPI.convertToDeal(leadId, conversionData);
        showSuccessToast(`Lead converted and moved to ${targetStage}`);
        fetchData();
        return;
      }

      // Update in backend
      await dealsAPI.update(draggedDeal.id, { pipeline: targetStage });
      showSuccessToast(`Deal moved to ${targetStage}`);
    } catch (err) {
      console.error('Failed to update deal stage:', err);
      showErrorToast('Failed to update deal stage');
      // Revert on error
      const originalDeals = deals.map(d =>
        d.id === draggedDeal.id ? { ...d, stage: draggedDeal.sourceStage } : d
      );
      setDeals(originalDeals);
      updateStageStats(originalDeals);
    } finally {
      setDraggedDeal(null);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const authFilters = {
        department: user?.department || '',
        user_id: user?.id || '',
        role: user?.role || ''
      };

      const [dealsRes, contactsRes, companiesRes, projectsRes, stagesRes, leadsRes] = await Promise.all([
        dealsAPI.getAll(authFilters),
        contactsAPI.getAll(),
        companiesAPI.getAll(),
        projectAPI.getAll(authFilters),
        pipelineStagesAPI.getAll(),
        leadsAPI.getAll(authFilters),
      ]);

      setPipelineStages(stagesRes || []);
      const leads = leadsRes || [];

      // Create virtual deals from leads that are Converted or Qualified
      const getLeadServiceLabel = (lead) => {
        if (lead.business_type === 'Marketing') {
          let services = lead.marketing_services;
          if (typeof services === 'string') {
            try { services = JSON.parse(services); } catch (e) { services = services ? [services] : []; }
          }
          if (Array.isArray(services) && services.length > 0) return services.join(', ');
          return 'No Service';
        }
        return lead.it_services || 'No Service';
      };

      const virtualDeals = leads.filter(l =>
        l.lead_status === 'Converted to Deal' || l.lead_status === 'Qualified' || l.lead_status === 'Quotation' || l.lead_status === 'Revised Quotation'
      ).map(lead => {
        let stage = lead.lead_status === 'Converted to Deal' || lead.lead_status === 'Qualified' ? 'Converted Lead' : lead.lead_status;
        // Consolidate Revised Quotation into Quotation
        if (stage === 'Revised Quotation') stage = 'Quotation';

        return {
          id: (1000000 + lead.id).toString(),
          lead_id: lead.id,
          deal_name: lead.project_name || lead.lead_name,
          project_name: lead.project_name || '',
          client_name: lead.lead_name,
          company_name: lead.company,
          company_id: lead.company_id,
          business_type: lead.business_type,
          deal_value: lead.value || 0,
          currency: lead.currency || 'INR',
          pipeline: stage,
          deal_stage: stage,
          status: 'Open',
          created_at: lead.created_at,
          updated_at: lead.updated_at,
          source: lead.lead_source,
          description: lead.notes,
          service: getLeadServiceLabel(lead),
          contact_email: lead.email,
          contact_phone: lead.phone
        };
      });

      let actualDeals = [];
      if (dealsRes) {
        if (Array.isArray(dealsRes)) {
          actualDeals = dealsRes;
        } else if (dealsRes.data && Array.isArray(dealsRes.data)) {
          actualDeals = dealsRes.data;
        } else if (dealsRes.deals && Array.isArray(dealsRes.deals)) {
          actualDeals = dealsRes.deals;
        }
      }

      // Filter out virtual deals that have already been converted to real deals
      const realDealLeadIds = new Set(actualDeals.map(d => d.lead_id?.toString()).filter(Boolean));
      const filteredVirtualDeals = virtualDeals.filter(vd => !realDealLeadIds.has(vd.lead_id.toString()));

      const allDeals = [...actualDeals, ...filteredVirtualDeals];

      if (allDeals.length > 0) {
        const getStageProb = (stageName) => {
          if (!stageName) return 10;
          const stage = stagesRes?.find(s => s.name === stageName);
          return stage ? stage.probability : 10;
        };

        const formattedDeals = allDeals.map(deal => {
          let stage = deal.pipeline || deal.deal_stage || 'Converted Lead';
          // Consolidate Revised Quotation into Quotation
          if (stage === 'Revised Quotation') stage = 'Quotation';

          const probability = getStageProb(stage);

          // Find linked lead data if available
          const linkedLead = deal.lead_id ? leads.find(l => l.id.toString() === deal.lead_id.toString()) : null;

          // Resolve owner name
          let ownerName = 'Unassigned';
          if (deal.assignee_first_name) {
            ownerName = `${deal.assignee_first_name} ${deal.assignee_last_name || ''}`.trim();
          } else if (linkedLead && linkedLead.owner_first_name) {
            ownerName = `${linkedLead.owner_first_name} ${linkedLead.owner_last_name || ''}`.trim();
          }

          // Resolve service name
          let serviceDisplay = deal.service_name || deal.service || 'No Service';
          if (serviceDisplay === 'No Service' && (deal.it_services || deal.marketing_services)) {
            const it = deal.it_services ? [deal.it_services] : [];
            let mkt = [];
            try {
              if (deal.marketing_services) {
                const parsed = typeof deal.marketing_services === 'string' ? JSON.parse(deal.marketing_services) : deal.marketing_services;
                if (Array.isArray(parsed)) mkt = parsed;
                else if (typeof parsed === 'object') mkt = Object.values(parsed);
              }
            } catch (e) { }
            const allServices = [...it, ...mkt].filter(Boolean);
            if (allServices.length > 0) serviceDisplay = allServices.join(', ');
          }

          return {
            ...deal,
            id: deal.id,
            stage: STAGES.some(s => s.name === stage) ? stage : STAGES[0].name,
            company: deal.company_name || deal.deal_name || 'Unknown Company',
            client_name: deal.client_name || (deal.contact_first_name ? `${deal.contact_first_name} ${deal.contact_last_name || ''}`.trim() : null) || (linkedLead ? (linkedLead.lead_name || linkedLead.name) : null) || deal.company_name || deal.deal_name || 'Unknown Client',
            project_name: deal.project_name || (linkedLead ? linkedLead.project_name : '') || '',
            business_type: deal.business_type || (linkedLead ? linkedLead.business_type : '') || '',
            initials: ((deal.company_name || deal.deal_name || 'UC').substring(0, 2)).toUpperCase(),
            value: parseFloat(deal.deal_value) || 0,
            email: deal.contact_email || deal.email || (linkedLead ? linkedLead.email : 'n/a@example.com'),
            phone: deal.contact_phone || deal.phone || (linkedLead ? linkedLead.phone : '+1 12345-67890'),
            location: deal.contact_position || deal.location || (linkedLead ? linkedLead.location : 'Global'),
            service: serviceDisplay,
            status: deal.status || 'Open',
            owner: ownerName,
            ownerImage: 'avatar-1',
            progress: probability || 85,
            date: deal.follow_up_date
              ? new Date(deal.follow_up_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
              : new Date(deal.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          };
        });

        const sortedDeals = [...formattedDeals].sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at || 0);
          const dateB = new Date(b.updated_at || b.created_at || 0);
          return dateB - dateA;
        });

        setDeals(sortedDeals);
        updateStageStats(sortedDeals);
      } else {
        setDeals([]);
        updateStageStats([]);
      }

      setContacts(contactsRes || []);
      setCompanies(companiesRes || []);
      setProjects(projectsRes && Array.isArray(projectsRes) ? projectsRes : []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setDeals([]);
      updateStageStats([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuDealId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const updateStageStats = (dealsList) => {
    const stats = STAGES.map(stageObj => {
      const stageDeals = dealsList.filter(d => d.stage === stageObj.name);
      return {
        stage: stageObj.name,
        leads: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)
      };
    });
    setStageStats(stats);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 40) return 'bg-red-500';
    return 'bg-blue-500';
  };

  const getInitialsBgColor = (initials) => {
    const colors = ['#10b981', '#ec4899', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444'];
    if (!initials) return colors[0];
    const index = initials.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const handleCreateDeal = async (formData) => {
    try {
      if (dealToEdit) {
        await dealsAPI.update(dealToEdit.id, formData);
        showSuccessToast('Deal updated successfully');
      } else {
        await dealsAPI.create(formData);
        showSuccessToast('Deal created successfully');
      }
      setIsModalOpen(false);
      setDealToEdit(null);
      fetchData();
    } catch (err) {
      showErrorToast(err.message || `Failed to ${dealToEdit ? 'update' : 'create'} deal`);
    }
  };

  const handleDeleteDeal = async (e, dealId) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this deal?')) return;

    try {
      await dealsAPI.delete(dealId);
      showSuccessToast('Deal deleted successfully');
      fetchData();
    } catch (err) {
      showErrorToast(err.message || 'Failed to delete deal');
    }
  };

  const handleEditClick = (e, deal) => {
    if (e) e.stopPropagation();
    setDealToEdit(deal);
    setIsModalOpen(true);
    setActiveMenuDealId(null);
  };

  const toggleMenu = (e, dealId) => {
    if (e) e.stopPropagation();
    setActiveMenuDealId(activeMenuDealId === dealId ? null : dealId);
  };

  const handleConvertToRealDeal = async (deal) => {
    try {
      const leadId = Number(deal.id) - 1000000;
      const conversionData = {
        deal_name: deal.project_name || deal.deal_name || 'New Deal',
        deal_value: deal.value || 0,
        currency: deal.currency || 'INR',
        description: deal.description || '',
        company_id: deal.company_id
      };

      await leadsAPI.convertToDeal(leadId, conversionData);
      showSuccessToast('Lead converted to real deal successfully');
      fetchData();
    } catch (err) {
      console.error('Failed to convert lead:', err);
      showErrorToast('Failed to convert lead: ' + err.message);
    }
  };

  const handleSendToDepartment = async (deal, department) => {
    try {
      if (!window.confirm(`Are you sure you want to send "${deal.project_name || deal.client_name}" to the ${department} department?`)) {
        return;
      }

      // Convert virtual deal to a real deal if it's virtual (ID > 1000000).
      // One client = one deal carrying all their services, so this stays a single conversion.
      let dealIdToConvert = deal.id;
      if (Number(deal.id) > 1000000) {
        const leadId = Number(deal.id) - 1000000;
        const conversionData = {
          deal_name: deal.project_name || deal.deal_name || 'New Deal',
          deal_value: deal.value || 0,
          currency: deal.currency || 'INR',
          description: deal.description || '',
          company_id: deal.company_id
        };
        const newDealRes = await leadsAPI.convertToDeal(leadId, conversionData);
        const createdDeal = newDealRes.deal || newDealRes;
        dealIdToConvert = createdDeal.id || createdDeal.deal_id || newDealRes.data?.id;
      }

      // Now convert that deal to a project with explicit workflow_type
      await projectAPI.convertDealToProject(dealIdToConvert, {
        name: deal.project_name || deal.client_name || 'New Project',
        budget: deal.value || 0,
        workflow_type: department,
      });

      showSuccessToast(`Deal successfully sent to ${department} Department Projects!`);
      fetchData();
    } catch (err) {
      console.error(`Failed to send deal to ${department} department:`, err);
      showErrorToast(`Failed to send to ${department} department: ` + err.message);
    }
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

  const checkScrollLimits = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollWidth - clientWidth - scrollLeft > 10);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollLimits);
      checkScrollLimits();
    }
    window.addEventListener('resize', checkScrollLimits);
    return () => {
      if (el) el.removeEventListener('scroll', checkScrollLimits);
      window.removeEventListener('resize', checkScrollLimits);
    };
  }, [deals, viewMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkScrollLimits();
    }, 300);
    return () => clearTimeout(timer);
  }, [deals, viewMode]);

  const columns = [
    {
      key: 'client_name',
      label: 'Client Name',
      sortable: true,
      render: (value, row) => (
        <div
          className="flex items-center gap-2 cursor-pointer hover:text-red-600 transition-colors"
          onClick={() => navigate(`/deals/deal/${row.id}`)}
        >
          <Star size={14} className="text-gray-300 hover:text-yellow-400 cursor-pointer transition-colors" onClick={(e) => e.stopPropagation()} />
          <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-[500]" style={{ backgroundColor: getInitialsBgColor(row.initials) }}>
            {row.initials}
          </div>
          <span className=" text-red-600 text-xs hover:text-red-700 transition-colors">{value}</span>
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
      key: 'value',
      label: 'Deal Value',
      sortable: true,
      render: (value) => <span className="text-gray-900 text-xs ">{formatCurrency(value)}</span>
    },
    {
      key: 'stage',
      label: 'Stage',
      sortable: true,
      render: (value) => (
        <span className="text-xs text-gray-600">{value}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-[500] ${value === 'Won' ? 'bg-green-50 text-green-700' : value === 'Lost' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
          {value}
        </span>
      )
    },
    {
      key: 'service',
      label: 'Service',
      sortable: true,
      render: (value) => <span className="text-xs text-gray-600">{value || '-'}</span>
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (value) => <span className="text-xs text-gray-500">{value}</span>
    },
    {
      key: 'progress',
      label: 'Probability',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${getProgressColor(value)}`} style={{ width: `${value}%` }}></div>
          </div>
          <span className="text-xs text-gray-500 ">{value}%</span>
        </div>
      )
    },
    {
      key: 'owner',
      label: 'Owner',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <img src={`https://i.pravatar.cc/100?u=${row.id}`} alt={value} className="w-5 h-5 rounded-full border border-white" />
          <span className="text-xs text-gray-600 ">{value}</span>
        </div>
      )
    },
    {
      key: 'date',
      label: 'Expected Close Date',
      sortable: true,
      render: (value) => <span className="text-xs text-gray-500">{value}</span>
    },
    {
      key: 'id',
      label: 'Action',
      render: (value, rowData) => (
        <ContactActionDropdown
          contact={rowData}
          entityName="deal"
          variant="red"
          onEdit={(deal) => {
            setDealToEdit(deal);
            setIsModalOpen(true);
          }}
          onDelete={async (id) => {
            await handleDeleteDeal(null, id);
          }}
          onClone={(deal) => {
            const clonedDeal = { ...deal, id: Date.now(), company: `${deal.company} (Clone)` };
            // In a real app, call API. For now, we rely on fetchData or local state if any.
            showSuccessToast('Deal cloned successfully');
            fetchData();
          }}
          onPreview={(deal) => navigate(`/deals/deal/${deal.id}`)}
          onSendToDepartment={handleSendToDepartment}
        />
      )
    }
  ];

  const filterConfigs = [
    {
      key: 'company',
      label: 'Deals Name',
      options: [
        { label: 'Konopelski', value: 'Konopelski' },
        { label: 'Adams', value: 'Adams' },
        { label: 'Gutkowski', value: 'Gutkowski' },
        { label: 'Walter', value: 'Walter' },
      ]
    },
    {
      key: 'owner',
      label: 'Owner',
      options: [
        { label: 'Darlee Robertson', value: 'Darlee Robertson' },
        { label: 'Sharon Roy', value: 'Sharon Roy' },
      ]
    },
    {
      key: 'stage',
      label: 'Status',
      options: [
        { label: 'Won', value: 'Won' },
        { label: 'Lost', value: 'Lost' },
        { label: 'Open', value: 'open' },
      ]
    },
    {
      key: 'rating',
      label: 'Rating',
      options: [
        { label: 'Rated', value: 'Rated' },
        { label: 'Rejected', value: 'Rejected' },
        { label: 'Collab', value: 'Collab' },
        { label: 'Promotion', value: 'Promotion' },
      ]
    },
    {
      key: 'tags',
      label: 'Tags',
      options: [
        { label: 'Collab', value: 'Collab' },
        { label: 'Rated', value: 'Rated' },
        { label: 'Rejected', value: 'Rejected' },
        { label: 'Promotion', value: 'Promotion' },
      ]
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4 min-h-screen">
      {/* Page Header */}
      <div className=" flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-[500] text-gray-900">Deals</h1>
            <span className="bg-red-100 text-red  text-[12px]  text-black px-2 py-1 rounded-full">
              {deals.length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 ">
            <span>Home</span>
            <ChevronRight size={14} />
            <span className="text-gray-900">Deals</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded text-xs  text-gray-600 hover:bg-gray-50 transition-colors">
            Export
            <ChevronDown size={14} />
          </button>
          <button onClick={fetchData} className="p-2 bg-white border border-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors">
            <RotateCcw size={16} />
          </button>
          <button className="p-2 bg-white border border-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors">
            <Layout size={16} />
          </button>
        </div>
      </div>

      <div className="pt-0">
        {/* Row 1: Search and Add Button */}
        <div className="flex items-center justify-between gap-2 mb-4">
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
              Add Deal
            </button>
          </div>
        </div>

        {/* Row 2: Filters and View Toggle */}
        <div className="flex items-center justify-between gap-2 mb-6">
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
            {showLeftArrow && (
              <button
                onClick={() => handleScroll('left')}
                className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-lg flex items-center justify-center text-[#1F2020] hover:text-red hover:shadow-xl transition-all"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            <div
              ref={scrollRef}
              className="flex gap-2 overflow-x-auto pb-6 no-scrollbar"
            >
              {STAGES.map((stageObj) => {
                // Apply all filters to Kanban too
                const stageDeals = deals.filter(deal => {
                  const matchesStage = deal.stage === stageObj.name;
                  const matchesSearch = !searchTerm ||
                    deal.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (deal.project_name && deal.project_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    deal.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    deal.owner.toLowerCase().includes(searchTerm.toLowerCase());

                  const matchesFilters = Object.keys(selectedFilters).every(key => {
                    const values = selectedFilters[key];
                    return !values || values.length === 0 || values.includes(deal[key]);
                  });

                  return matchesStage && matchesSearch && matchesFilters;
                });

                const stageColorMap = {
                  'Converted Lead': { light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-500' },
                  'Quotation': { light: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-500' },
                  'Finalized Deal': { light: 'bg-green-50', text: 'text-green-700', border: 'border-green-500' },
                  'Won': { light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-500' },
                  'Lost': { light: 'bg-red-50', text: 'text-red-700', border: 'border-red-500' }
                };
                const stageStyle = stageColorMap[stageObj.name] || stageColorMap['Converted Lead'];

                return (
                  <div
                    key={stageObj.name}
                    className="flex-shrink-0 w-[250px] border border-gray-200 p-2 rounded "
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(stageObj.name)}
                  >
                    <div className={`${stageStyle.light} border-b-2 ${stageStyle.border} rounded-t-lg p-3 mb-4`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <div className={`w-2.5 h-2.5 rounded-full ${stageStyle.border.replace('border-', 'bg-')} `}></div>
                            <h3 className={`text-sm font-[500] ${stageStyle.text}`}>{stageObj.name}</h3>
                          </div>
                          <div className="px-1">
                            <p className="text-xs text-gray-600 ">
                              {stageDeals.length} Deals • {formatCurrency(stageDeals.reduce((sum, d) => sum + (d.value || 0), 0))}
                            </p>
                          </div>
                        </div>
                        <button className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors">
                          <MoreVertical size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {stageDeals.map((deal) => (
                        <div
                          key={deal.id}
                          className={`bg-white rounded border-t-2 p-2 hover:shadow-lg transition-all cursor-move group/card relative ${draggedDeal?.id === deal.id ? 'opacity-50 border-red-200' : 'border-gray-200 hover:border-red-100'} ${stageStyle.border}`}
                          draggable
                          onDragStart={() => handleDragStart(deal, stageObj.name)}
                        >
                          <div className="absolute top-2 right-2 z-10">
                            <ContactActionDropdown
                              contact={deal}
                              entityName="deal"
                              variant="red"
                              onEdit={(d) => {
                                setDealToEdit(d);
                                setIsModalOpen(true);
                              }}
                              onDelete={async (id) => {
                                await handleDeleteDeal(null, id);
                              }}
                              onClone={(d) => {
                                showSuccessToast('Deal cloned successfully');
                                fetchData();
                              }}
                              onPreview={(d) => navigate(`/deals/deal/${d.id}`)}
                              onSendToDepartment={handleSendToDepartment}
                            />
                          </div>


                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/deals/deal/${deal.id}`)}>
                            <h4 className="text-sm font-[500] text-black hover:text-red-600 truncate mb-1 transition-colors">{deal.project_name || deal.deal_name}</h4>
                          </div>


                          <div className="space-y-1.5 mt-2">
                            {deal.business_type && (
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Briefcase size={12} className="text-green-500" />
                                <span className="truncate">{deal.business_type}</span>
                              </div>
                            )}
                            {deal.project_name && (
                              <div className="flex items-center gap-2 text-xs text-gray-600 ">
                                <Star size={12} className="text-yellow-500" />
                                <span className="truncate">{deal.client_name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs  text-gray-700">
                              <FileText size={12} className="text-blue-500" />
                              <span>{formatCurrency(deal.value)}</span>
                            </div>


                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <List size={12} className="text-orange-500" />
                              <span className="truncate">{deal.service}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <RotateCcw size={12} className="text-green-500" />
                              <span className={`px-2 py-0.5 rounded-full text-xs font-[500]  ${deal.status === 'Won' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                                {deal.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Mail size={12} className="text-purple-500" />
                              <span className="truncate">{deal.email}</span>
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-gray-100 mt-2">
                              <div className="flex items-center gap-1.5 flex-1">
                                <img src={`https://i.pravatar.cc/100?u=${deal.id}`} alt={deal.owner} className="w-4 h-4 rounded-full" />
                                <span className="text-xs text-gray-500 truncate">{deal.owner}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-10 h-1 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${getProgressColor(deal.progress)}`} style={{ width: `${deal.progress}%` }}></div>
                                </div>
                                <span className="text-[9px] text-gray-400">{deal.progress}%</span>
                              </div>
                            </div>

                            {Number(deal.id) > 1000000 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConvertToRealDeal(deal);
                                }}
                                className="w-full mt-3 py-1.5 bg-red-50 text-red-600 text-xs font-[500] rounded border border-red-100 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-1.5"
                              >
                                <Plus size={12} />
                                Convert to Real Deal
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 ">
                              <Calendar size={12} className="text-orange-400" />
                              {deal.date}
                            </div>
                            <div className="flex items-center gap-3">
                              <Phone size={14} className="text-blue-400 hover:text-blue-600 transition-colors cursor-pointer" />
                              <MessageSquare size={14} className="text-green-400 hover:text-green-600 transition-colors cursor-pointer" />
                              <FileText size={14} className="text-orange-400 hover:text-orange-600 transition-colors cursor-pointer" />
                            </div>
                          </div>
                        </div>
                      ))}

                      {stageDeals.length === 0 && (
                        <div className="h-24 border-2 border-dashed border-gray-100 rounded flex items-center justify-center bg-gray-50/50">
                          <p className="text-xs text-gray-300 font-[500]  ">No Deals</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {showRightArrow && (
              <button
                onClick={() => handleScroll('right')}
                className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-lg flex items-center justify-center text-[#1F2020] hover:text-red hover:shadow-xl transition-all"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        ) : (
          <AdvancedDataTable
            columns={columns}
            data={deals}
            title="Deals"
            entityName="Deal"
            addLabel="Add Deal"
            onAdd={() => setIsModalOpen(true)}
            filterConfigs={filterConfigs}
            searchKeys={['client_name', 'project_name', 'business_type', 'stage', 'owner', 'location']}
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

      <AddNewDealModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setDealToEdit(null);
        }}
        onSubmit={handleCreateDeal}
        contacts={contacts}
        companies={companies}
        projects={projects}
        dealToEdit={dealToEdit}
      />
    </div >
  );
};

export default CrmDealsPage;
