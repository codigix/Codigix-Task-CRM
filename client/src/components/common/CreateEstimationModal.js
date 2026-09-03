import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Plus, Trash2, Shield, Lock, Calculator, DollarSign, 
  Calendar, Building2, User, Layers, Clock, AlertTriangle, 
  FileText, CheckCircle2, Sparkles, HelpCircle, ArrowRight
} from 'lucide-react';
import { companiesAPI, leadsAPI, usersAPI, proposalsAPI, estimationsAPI } from '../../services/api';

const RESOURCE_ROLES = [
  'UI/UX Designer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'QA / Tester',
  'Project Manager',
  'DevOps Engineer',
  'Solution Architect',
  'Mobile Developer',
  'Content / SEO Specialist',
  'Other'
];

const ADDITIONAL_COST_TYPES = [
  'Server / Hosting',
  'Domain',
  'Third-party API',
  'Software License',
  'Cloud Services',
  'External Consultant',
  'Other Expenses'
];

const DURATION_UNITS = ['Days', 'Weeks', 'Months'];

const CreateEstimationModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  // Loading & Reference Lists
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [clients, setClients] = useState([]);
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // 1. Basic Information
  const [estimationNumber, setEstimationNumber] = useState(`EST-${new Date().getFullYear()}-001`);
  const [title, setTitle] = useState('');
  const [estimateDate, setEstimateDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('Draft');
  const [assignedExecutiveId, setAssignedExecutiveId] = useState('');

  // 2. Related Information
  const [clientId, setClientId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [proposalId, setProposalId] = useState('');
  const [quotationId, setQuotationId] = useState('');

  // 3. Requirement Summary
  const [requirementSummary, setRequirementSummary] = useState('');

  // 4. Work / Task Estimation
  const [tasks, setTasks] = useState([
    { id: 1, moduleName: 'UI/UX Design', description: 'Wireframing, prototypes, UI kit', resourceRole: 'UI/UX Designer', estimatedHours: 30, hourlyRate: 500 },
    { id: 2, moduleName: 'Frontend Development', description: 'Responsive layouts, state management, API integration', resourceRole: 'Frontend Developer', estimatedHours: 70, hourlyRate: 600 },
    { id: 3, moduleName: 'Backend Development', description: 'Database schema, REST APIs, authentication, business logic', resourceRole: 'Backend Developer', estimatedHours: 80, hourlyRate: 700 },
    { id: 4, moduleName: 'Testing & QA', description: 'Manual testing, bug verification, end-to-end user flows', resourceRole: 'QA / Tester', estimatedHours: 25, hourlyRate: 400 }
  ]);

  // 5. Additional / External Costs
  const [additionalCosts, setAdditionalCosts] = useState([
    { id: 1, costType: 'Server / Hosting', description: 'Cloud Infrastructure / AWS hosting setup', amount: 15000 },
    { id: 2, costType: 'Third-party API', description: 'Payment gateway & SMS API charges', amount: 5000 }
  ]);

  // 6. Cost Summary (Internal)
  const [otherInternalCosts, setOtherInternalCosts] = useState(0);

  // 7. Pricing & Profit Strategy (Internal)
  const [profitMargin, setProfitMargin] = useState(30);
  const [discountBuffer, setDiscountBuffer] = useState(10);
  const [manualMinPrice, setManualMinPrice] = useState('');

  // 8. Timeline Estimation
  const [totalDuration, setTotalDuration] = useState(12);
  const [durationUnit, setDurationUnit] = useState('Weeks');
  const [phases, setPhases] = useState([
    { id: 1, phaseName: 'Requirement Analysis', description: 'Scope signoff, functional specs', duration: 1, durationUnit: 'Weeks' },
    { id: 2, phaseName: 'UI/UX Design', description: 'Figma mockups and user journeys', duration: 2, durationUnit: 'Weeks' },
    { id: 3, phaseName: 'Development', description: 'Core sprint implementation', duration: 6, durationUnit: 'Weeks' },
    { id: 4, phaseName: 'Testing & QA', description: 'Bug fixing and acceptance testing', duration: 2, durationUnit: 'Weeks' },
    { id: 5, phaseName: 'Deployment', description: 'Production rollout & handover', duration: 1, durationUnit: 'Weeks' }
  ]);

  // 9. Assumptions
  const [assumptions, setAssumptions] = useState(
    '• Client will provide all brand assets, API credentials, and content on time.\n• Client feedback will be provided within 2-3 business days per milestone.\n• Scope remains unchanged during active development sprints.\n• Third-party APIs and SMS gateways will be supported without major breaking changes.'
  );

  // 10. Risks
  const [risks, setRisks] = useState(
    '• Scope changes or new feature additions may increase internal effort and delay delivery.\n• Delayed client feedback during user testing may extend the milestone schedule.\n• Third-party API rate limits or approval delays may require architectural adjustments.'
  );

  // 11. Internal Notes
  const [internalNotes, setInternalNotes] = useState('');

  // Auto-calculated fields
  const totalEstimatedHours = useMemo(() => {
    return tasks.reduce((sum, t) => sum + (parseFloat(t.estimatedHours) || 0), 0);
  }, [tasks]);

  const totalResourceCost = useMemo(() => {
    return tasks.reduce((sum, t) => {
      const h = parseFloat(t.estimatedHours) || 0;
      const r = parseFloat(t.hourlyRate) || 0;
      return sum + (h * r);
    }, 0);
  }, [tasks]);

  const totalAdditionalCost = useMemo(() => {
    return additionalCosts.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  }, [additionalCosts]);

  const totalInternalCost = useMemo(() => {
    return totalResourceCost + totalAdditionalCost + (parseFloat(otherInternalCosts) || 0);
  }, [totalResourceCost, totalAdditionalCost, otherInternalCosts]);

  const expectedProfit = useMemo(() => {
    const margin = parseFloat(profitMargin) || 0;
    return Math.round((totalInternalCost * margin) / 100);
  }, [totalInternalCost, profitMargin]);

  const recommendedSellingPrice = useMemo(() => {
    return Math.round(totalInternalCost + expectedProfit);
  }, [totalInternalCost, expectedProfit]);

  const minAcceptablePrice = useMemo(() => {
    if (manualMinPrice !== '' && manualMinPrice !== null && !isNaN(manualMinPrice)) {
      return parseFloat(manualMinPrice);
    }
    const buffer = parseFloat(discountBuffer) || 0;
    return Math.round(recommendedSellingPrice * (1 - buffer / 100));
  }, [recommendedSellingPrice, discountBuffer, manualMinPrice]);

  // Load lookup data
  useEffect(() => {
    if (!isOpen) return;

    const fetchAllLookups = async () => {
      setLoadingLookups(true);
      try {
        const currentUserData = (() => {
          try {
            return JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user'));
          } catch (e) { return null; }
        })();

        const authFilters = currentUserData?.id ? {
          user_id: currentUserData.id,
          role: currentUserData.role_name || currentUserData.role,
          department: currentUserData.department
        } : {};

        const [clientsRes, leadsRes, usersRes, proposalsRes, quotationsRes] = await Promise.allSettled([
          companiesAPI.getAll(),
          leadsAPI.getAll(authFilters),
          usersAPI.getAll(),
          proposalsAPI ? proposalsAPI.getAll(authFilters) : Promise.resolve([]),
          estimationsAPI.getAll(authFilters)
        ]);

        if (clientsRes.status === 'fulfilled') {
          const list = Array.isArray(clientsRes.value) ? clientsRes.value : (clientsRes.value?.data || []);
          setClients(list);
        }
        if (leadsRes.status === 'fulfilled') {
          const list = Array.isArray(leadsRes.value) ? leadsRes.value : (leadsRes.value?.data || []);
          setLeads(list);
        }
        if (usersRes.status === 'fulfilled') {
          const list = Array.isArray(usersRes.value) ? usersRes.value : (usersRes.value?.data || []);
          setUsers(list);
        }
        if (proposalsRes.status === 'fulfilled') {
          const list = Array.isArray(proposalsRes.value) ? proposalsRes.value : (proposalsRes.value?.data || []);
          setProposals(list);
        }
        if (quotationsRes.status === 'fulfilled') {
          const list = Array.isArray(quotationsRes.value) ? quotationsRes.value : (quotationsRes.value?.data || []);
          setQuotations(list);
        }

        // Set default executive
        if (!initialData && currentUserData?.id) {
          setAssignedExecutiveId(currentUserData.id.toString());
        }

        // Generate next EST number if new
        if (!initialData) {
          const allEst = quotationsRes.status === 'fulfilled' && Array.isArray(quotationsRes.value) ? quotationsRes.value : [];
          const estNums = allEst
            .map(e => e.estimation_number || '')
            .filter(n => n.startsWith('EST-'))
            .map(n => {
              const m = n.match(/EST-\d+-(\d+)/);
              return m ? parseInt(m[1], 10) : 0;
            });
          const maxNum = estNums.length > 0 ? Math.max(...estNums) : 0;
          setEstimationNumber(`EST-${new Date().getFullYear()}-${String(maxNum + 1).padStart(3, '0')}`);
        }
      } catch (err) {
        console.error('Error fetching estimation lookups:', err);
      } finally {
        setLoadingLookups(false);
      }
    };

    fetchAllLookups();
  }, [isOpen, initialData]);

  // Handle lead change to auto-fill linked client
  const handleLeadSelect = (selectedLeadId) => {
    setLeadId(selectedLeadId);
    if (!selectedLeadId) return;

    const matchedLead = leads.find(l => l.id.toString() === selectedLeadId.toString());
    if (matchedLead) {
      if (matchedLead.company_id || matchedLead.client_id) {
        setClientId((matchedLead.company_id || matchedLead.client_id).toString());
      } else if (matchedLead.company_name) {
        const matchedClient = clients.find(c => (c.company_name || c.name || '').toLowerCase() === matchedLead.company_name.toLowerCase());
        if (matchedClient) {
          setClientId(matchedClient.id.toString());
        }
      }
      if (!title && matchedLead.project_name) {
        setTitle(`${matchedLead.project_name} - Cost Estimation`);
      } else if (!title && matchedLead.name) {
        setTitle(`${matchedLead.name} - Project Estimation`);
      }
      if (!requirementSummary && matchedLead.notes) {
        setRequirementSummary(matchedLead.notes);
      }
    }
  };

  // Populate when initialData is provided (editing)
  useEffect(() => {
    if (!initialData) return;

    if (initialData.estimation_number) {
      setEstimationNumber(initialData.estimation_number);
    }
    if (initialData.status) {
      setStatus(initialData.status);
    }
    if (initialData.estimate_date) {
      setEstimateDate(new Date(initialData.estimate_date).toISOString().split('T')[0]);
    }
    if (initialData.estimate_by) {
      setAssignedExecutiveId(initialData.estimate_by.toString());
    }
    if (initialData.client_id) {
      setClientId(initialData.client_id.toString());
    }
    if (initialData.lead_id) {
      setLeadId(initialData.lead_id.toString());
    }

    // Attempt to parse rich structured JSON from description
    if (initialData.description) {
      try {
        const parsed = JSON.parse(initialData.description);
        if (parsed && typeof parsed === 'object') {
          if (parsed.title) setTitle(parsed.title);
          if (parsed.requirementSummary) setRequirementSummary(parsed.requirementSummary);
          if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) setTasks(parsed.tasks);
          if (Array.isArray(parsed.additionalCosts)) setAdditionalCosts(parsed.additionalCosts);
          if (parsed.costSummary?.otherInternalCosts !== undefined) setOtherInternalCosts(parsed.costSummary.otherInternalCosts);
          if (parsed.pricingStrategy?.profitMargin !== undefined) setProfitMargin(parsed.pricingStrategy.profitMargin);
          if (parsed.pricingStrategy?.discountBuffer !== undefined) setDiscountBuffer(parsed.pricingStrategy.discountBuffer);
          if (parsed.pricingStrategy?.minAcceptablePrice !== undefined) setManualMinPrice(parsed.pricingStrategy.minAcceptablePrice);
          if (parsed.timeline?.totalDuration !== undefined) setTotalDuration(parsed.timeline.totalDuration);
          if (parsed.timeline?.durationUnit) setDurationUnit(parsed.timeline.durationUnit);
          if (Array.isArray(parsed.timeline?.phases)) setPhases(parsed.timeline.phases);
          if (parsed.assumptions) setAssumptions(parsed.assumptions);
          if (parsed.risks) setRisks(parsed.risks);
          if (parsed.internalNotes) setInternalNotes(parsed.internalNotes);
          return;
        }
      } catch (e) {
        // Plain text description fallback
        setRequirementSummary(initialData.description);
      }
    }

    // Fallback title from client/project
    if (!title) {
      setTitle(initialData.project_name || initialData.client_name ? `${initialData.project_name || initialData.client_name} Cost Estimation` : 'Project Cost Estimation');
    }
  }, [initialData]);

  // Tasks Operations
  const handleAddTask = () => {
    setTasks(prev => [
      ...prev,
      { id: Date.now(), moduleName: '', description: '', resourceRole: 'Frontend Developer', estimatedHours: 20, hourlyRate: 500 }
    ]);
  };

  const handleUpdateTask = (id, field, value) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleRemoveTask = (id) => {
    if (tasks.length <= 1) return;
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Additional Costs Operations
  const handleAddCost = () => {
    setAdditionalCosts(prev => [
      ...prev,
      { id: Date.now(), costType: 'Software License', description: '', amount: 5000 }
    ]);
  };

  const handleUpdateCost = (id, field, value) => {
    setAdditionalCosts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleRemoveCost = (id) => {
    setAdditionalCosts(prev => prev.filter(c => c.id !== id));
  };

  // Phases Operations
  const handleAddPhase = () => {
    setPhases(prev => [
      ...prev,
      { id: Date.now(), phaseName: 'New Phase', description: '', duration: 2, durationUnit: 'Weeks' }
    ]);
  };

  const handleUpdatePhase = (id, field, value) => {
    setPhases(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleRemovePhase = (id) => {
    if (phases.length <= 1) return;
    setPhases(prev => prev.filter(p => p.id !== id));
  };

  // Form Submit Handler
  const handleFormSubmit = async (targetStatus) => {
    const errs = {};
    if (!title.trim()) errs.title = 'Estimation Title is required';
    if (!clientId) errs.clientId = 'Client selection is required';
    if (!leadId) errs.leadId = 'Related Lead is required';
    if (!estimateDate) errs.estimateDate = 'Estimation Date is required';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      const finalStatus = targetStatus || status;

      const structuredDescription = JSON.stringify({
        title: title.trim(),
        requirementSummary: requirementSummary.trim(),
        tasks,
        additionalCosts,
        costSummary: {
          resourceCost: totalResourceCost,
          additionalCost: totalAdditionalCost,
          otherInternalCosts: parseFloat(otherInternalCosts) || 0,
          totalInternalCost
        },
        pricingStrategy: {
          totalInternalCost,
          profitMargin: parseFloat(profitMargin) || 0,
          expectedProfit,
          recommendedSellingPrice,
          discountBuffer: parseFloat(discountBuffer) || 0,
          minAcceptablePrice
        },
        timeline: {
          totalDuration: parseFloat(totalDuration) || 0,
          durationUnit,
          phases
        },
        assumptions: assumptions.trim(),
        risks: risks.trim(),
        internalNotes: internalNotes.trim()
      });

      const payload = {
        estimation_number: estimationNumber,
        title: title.trim(),
        client_id: parseInt(clientId),
        lead_id: parseInt(leadId),
        proposal_id: proposalId ? parseInt(proposalId) : null,
        quotation_id: quotationId ? parseInt(quotationId) : null,
        estimate_date: estimateDate,
        status: finalStatus,
        estimate_by: assignedExecutiveId ? parseInt(assignedExecutiveId) : null,
        amount: recommendedSellingPrice,
        subtotal: totalInternalCost,
        total: recommendedSellingPrice,
        currency: 'INR',
        description: structuredDescription,
        tags: ['Internal Estimation'],
        items: tasks.map(t => ({
          productName: t.moduleName || 'Task',
          description: `[${t.resourceRole || 'Resource'}] ${t.description || ''}`.trim(),
          quantity: parseFloat(t.estimatedHours) || 1,
          rate: parseFloat(t.hourlyRate) || 0,
          total: (parseFloat(t.estimatedHours) || 1) * (parseFloat(t.hourlyRate) || 0)
        }))
      };

      await onSubmit(payload);
    } catch (err) {
      console.error('Error in estimation submission:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200 font-sans">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        
        {/* ================= MODAL HEADER ================= */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white sticky top-0 z-20 flex items-start justify-between">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                {initialData ? 'Edit Internal Estimation' : 'Create Internal Estimation'}
              </h2>
              {/* Internal Badge */}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-sm">
                <Lock size={12} className="text-amber-700" />
                INTERNAL DOCUMENT
              </span>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {estimationNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Shield size={13} className="text-amber-600 shrink-0" />
              <span>This estimation contains internal cost, resource, effort, and pricing calculations. <strong>It is not intended for direct client sharing.</strong></span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* ================= MODAL BODY ================= */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar bg-slate-50/50">

          {/* ================= SECTION 1: BASIC INFORMATION ================= */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">1</div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Basic Information</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Estimation Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Estimation Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={estimationNumber}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 cursor-not-allowed"
                  />
                  <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Estimation Title */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Estimation Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. CRM Development Cost Estimation"
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.title ? 'border-red-500' : 'border-slate-300'}`}
                />
                {errors.title && <p className="text-[11px] text-red-500 mt-1">{errors.title}</p>}
              </div>

              {/* Estimation Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Estimation Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={estimateDate}
                    onChange={(e) => setEstimateDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Draft">Draft</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Approved Internally">Approved Internally</option>
                  <option value="Revised">Revised</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              {/* Prepared By / Assigned To */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Prepared By / Assigned To</label>
                <select
                  value={assignedExecutiveId}
                  onChange={(e) => setAssignedExecutiveId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select User / Executive</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.first_name || u.name} {u.last_name || ''} ({u.role_name || u.role || 'Team Member'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ================= SECTION 2: RELATED INFORMATION ================= */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">2</div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Related Information</h3>
                  <p className="text-[11px] text-slate-500">Primary link is Client + Lead (usually created during Lead Follow-up).</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Client */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.clientId ? 'border-red-500' : 'border-slate-300'}`}
                >
                  <option value="">Select Client / Company</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
                  ))}
                </select>
                {errors.clientId && <p className="text-[11px] text-red-500 mt-1">{errors.clientId}</p>}
              </div>

              {/* Related Lead */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Related Lead <span className="text-red-500">*</span>
                </label>
                <select
                  value={leadId}
                  onChange={(e) => handleLeadSelect(e.target.value)}
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.leadId ? 'border-red-500' : 'border-slate-300'}`}
                >
                  <option value="">Select Related Lead</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.lead_name || l.name || `Lead #${l.id}`} {l.project_name ? `(${l.project_name})` : ''}
                    </option>
                  ))}
                </select>
                {errors.leadId && <p className="text-[11px] text-red-500 mt-1">{errors.leadId}</p>}
              </div>

              {/* Related Proposal (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Related Proposal <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
                </label>
                <select
                  value={proposalId}
                  onChange={(e) => setProposalId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">None / Not linked</option>
                  {proposals.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.proposal_number || `PROP-${p.id}`} - {p.title || p.client_name || 'Proposal'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Related Quotation (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Related Quotation <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
                </label>
                <select
                  value={quotationId}
                  onChange={(e) => setQuotationId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">None / Not linked</option>
                  {quotations.map(q => (
                    <option key={q.id} value={q.id}>
                      {q.estimation_number || `QUO-${q.id}`} - {q.client_name || q.company || 'Quotation'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ================= SECTION 3: REQUIREMENT SUMMARY ================= */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">3</div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Client Requirement Summary</h3>
              </div>
              <span className="text-[11px] text-slate-400">Internal scope description</span>
            </div>

            <textarea
              rows={4}
              value={requirementSummary}
              onChange={(e) => setRequirementSummary(e.target.value)}
              placeholder="Describe the client's requirements and requested features (e.g. Client requires a web-based CRM system with Lead Management, Follow-ups, Deal Management, User Management, Dashboard, and Reports)..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed custom-scrollbar"
            />
          </div>

          {/* ================= SECTION 4: WORK / TASK ESTIMATION ================= */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">4</div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Work / Task Estimation</h3>
                  <p className="text-[11px] text-slate-500">Calculate resource effort and labor costs by module or task.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddTask}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                <Plus size={14} /> Add Task
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="p-2.5 pl-3 w-44">Module / Task</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 w-44">Resource / Role</th>
                    <th className="p-2.5 w-24 text-right">Hours</th>
                    <th className="p-2.5 w-28 text-right">Rate (₹)</th>
                    <th className="p-2.5 w-32 text-right">Total (₹)</th>
                    <th className="p-2.5 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {tasks.map((task) => {
                    const lineTotal = (parseFloat(task.estimatedHours) || 0) * (parseFloat(task.hourlyRate) || 0);
                    return (
                      <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-2 pl-3">
                          <input
                            type="text"
                            value={task.moduleName}
                            onChange={(e) => handleUpdateTask(task.id, 'moduleName', e.target.value)}
                            placeholder="Task / Module name"
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={task.description}
                            onChange={(e) => handleUpdateTask(task.id, 'description', e.target.value)}
                            placeholder="Brief task scope or deliverables"
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={task.resourceRole}
                            onChange={(e) => handleUpdateTask(task.id, 'resourceRole', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                          >
                            {RESOURCE_ROLES.map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={task.estimatedHours}
                            onChange={(e) => handleUpdateTask(task.id, 'estimatedHours', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs text-right font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={task.hourlyRate}
                            onChange={(e) => handleUpdateTask(task.id, 'hourlyRate', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs text-right font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="p-2 text-right font-bold text-slate-900">
                          ₹{lineTotal.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveTask(task.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                            title="Remove Task"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Task Summary Bar */}
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
              <div className="flex items-center gap-4 text-slate-700">
                <span>Tasks Count: <strong className="text-slate-900">{tasks.length}</strong></span>
                <span>Total Estimated Hours: <strong className="text-blue-600 font-bold">{totalEstimatedHours} hrs</strong></span>
              </div>
              <div className="text-slate-800">
                Total Resource Cost: <strong className="text-sm font-bold text-slate-950 ml-1">₹{totalResourceCost.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>

          {/* ================= SECTION 5: ADDITIONAL / EXTERNAL COSTS ================= */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">5</div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Additional / External Costs</h3>
                  <p className="text-[11px] text-slate-500">Servers, APIs, domain, licenses, and external expenses.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddCost}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors border border-slate-300"
              >
                <Plus size={14} /> Add Cost
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="p-2.5 pl-3 w-52">Cost Type</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 w-36 text-right">Amount (₹)</th>
                    <th className="p-2.5 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {additionalCosts.map((cost) => (
                    <tr key={cost.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-2 pl-3">
                        <select
                          value={cost.costType}
                          onChange={(e) => handleUpdateCost(cost.id, 'costType', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        >
                          {ADDITIONAL_COST_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={cost.description}
                          onChange={(e) => handleUpdateCost(cost.id, 'description', e.target.value)}
                          placeholder="e.g. AWS Cloud hosting (12 months)"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={cost.amount}
                          onChange={(e) => handleUpdateCost(cost.id, 'amount', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs text-right font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveCost(cost.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                          title="Remove Cost"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {additionalCosts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-xs text-slate-400 italic">
                        No additional external costs added. Click "+ Add Cost" above if applicable.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Additional Cost Summary Bar */}
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600">Additional Expenses: {additionalCosts.length} items</span>
              <span className="text-slate-800">
                Total Additional Cost: <strong className="text-sm font-bold text-slate-950 ml-1">₹{totalAdditionalCost.toLocaleString('en-IN')}</strong>
              </span>
            </div>
          </div>

          {/* ================= SECTION 6 & 7: COST SUMMARY & PRICING STRATEGY (INTERNAL) ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* SECTION 6: COST SUMMARY */}
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-md flex flex-col justify-between border border-slate-800">
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">6</div>
                    <h3 className="font-bold text-white text-sm sm:text-base">Cost Summary</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Lock size={10} /> INTERNAL ONLY
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Resource Cost (Labor):</span>
                    <span className="font-semibold text-white">₹{totalResourceCost.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Additional / External Costs:</span>
                    <span className="font-semibold text-white">₹{totalAdditionalCost.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Other Internal Overheads:</span>
                    <div className="w-28">
                      <input
                        type="number"
                        min="0"
                        value={otherInternalCosts}
                        onChange={(e) => setOtherInternalCosts(e.target.value)}
                        placeholder="0"
                        className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-right font-medium text-white focus:outline-none focus:border-blue-400 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-700/70 flex justify-between items-end">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Total Internal Cost</p>
                  <p className="text-[10px] text-slate-400">Resource + External + Overheads</p>
                </div>
                <p className="text-xl sm:text-2xl font-black text-amber-400">
                  ₹{totalInternalCost.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* SECTION 7: PRICING & PROFIT STRATEGY */}
            <div className="lg:col-span-7 bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">7</div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">Pricing & Profit Strategy</h3>
                      <p className="text-[11px] text-slate-500">Internal pricing model (strictly confidential).</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <Shield size={10} /> NEVER SHARE EXTERNALLY
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Profit Margin (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={profitMargin}
                        onChange={(e) => setProfitMargin(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Discount Buffer (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={discountBuffer}
                        onChange={(e) => setDiscountBuffer(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Expected Profit</label>
                    <div className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800">
                      ₹{expectedProfit.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* KPI Highlight Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-300">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Recommended Selling Price</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-200/60 text-emerald-900">Recommended</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-emerald-950">
                      ₹{recommendedSellingPrice.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-emerald-700 mt-0.5">Cost + {profitMargin}% margin</p>
                  </div>

                  <div className="p-3.5 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border border-amber-300">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Minimum Acceptable Price</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200/60 text-amber-950">Negotiation Floor</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-amber-950">
                      ₹{minAcceptablePrice.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-amber-800 mt-0.5">Allowing {discountBuffer}% negotiation buffer</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-500 flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                <span>These figures are internal guidelines for proposal creation. Client quotes must only show commercial totals.</span>
              </div>
            </div>

          </div>

          {/* ================= SECTION 8: TIMELINE ESTIMATION ================= */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">8</div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Timeline Estimation</h3>
                  <p className="text-[11px] text-slate-500">Estimated delivery schedule broken down into project phases.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddPhase}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors border border-slate-300"
              >
                <Plus size={14} /> Add Phase
              </button>
            </div>

            {/* Total Duration Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4 text-xs items-center">
              <span className="font-semibold text-slate-700">Estimated Total Project Duration:</span>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="number"
                  min="1"
                  value={totalDuration}
                  onChange={(e) => setTotalDuration(e.target.value)}
                  className="w-24 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                />
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  {DURATION_UNITS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Project Phases Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="p-2.5 pl-3 w-52">Phase Name</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 w-44">Duration</th>
                    <th className="p-2.5 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {phases.map((phase) => (
                    <tr key={phase.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-2 pl-3">
                        <input
                          type="text"
                          value={phase.phaseName}
                          onChange={(e) => handleUpdatePhase(phase.id, 'phaseName', e.target.value)}
                          placeholder="e.g. UI/UX Design"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={phase.description}
                          onChange={(e) => handleUpdatePhase(phase.id, 'description', e.target.value)}
                          placeholder="Milestone deliverables"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            value={phase.duration}
                            onChange={(e) => handleUpdatePhase(phase.id, 'duration', e.target.value)}
                            className="w-16 px-2 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-900 text-right focus:outline-none focus:border-blue-500"
                          />
                          <select
                            value={phase.durationUnit}
                            onChange={(e) => handleUpdatePhase(phase.id, 'durationUnit', e.target.value)}
                            className="px-2 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                          >
                            {DURATION_UNITS.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemovePhase(phase.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                          title="Remove Phase"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================= SECTION 9 & 10: ASSUMPTIONS & RISKS ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* SECTION 9: ASSUMPTIONS */}
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">9</div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Assumptions</h3>
                  <p className="text-[10px] text-slate-500">Document assumptions made while preparing this estimation.</p>
                </div>
              </div>
              <textarea
                rows={5}
                value={assumptions}
                onChange={(e) => setAssumptions(e.target.value)}
                placeholder="• Complete requirements provided by client&#10;• Feedback within 2-3 business days&#10;• Scope remains unchanged"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed custom-scrollbar"
              />
            </div>

            {/* SECTION 10: RISKS */}
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">10</div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Potential Risks</h3>
                  <p className="text-[10px] text-slate-500">Document potential risks that could impact timeline or budget.</p>
                </div>
              </div>
              <textarea
                rows={5}
                value={risks}
                onChange={(e) => setRisks(e.target.value)}
                placeholder="• Scope changes during development&#10;• Delayed client feedback affecting delivery&#10;• Third-party API limitations"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 leading-relaxed custom-scrollbar"
              />
            </div>

          </div>

          {/* ================= SECTION 11: INTERNAL NOTES ================= */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">11</div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Internal Team Notes</h3>
                  <p className="text-[10px] text-slate-500">Only visible to internal team members. Never shown on proposals.</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                TEAM ONLY
              </span>
            </div>

            <textarea
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Internal discussions, resource allocations, developer constraints, special approvals..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/20 leading-relaxed custom-scrollbar"
            />
          </div>

        </div>

        {/* ================= MODAL FOOTER & ACTIONS ================= */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Total Rec. Price: <strong className="text-slate-900 font-bold">₹{recommendedSellingPrice.toLocaleString('en-IN')}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Est. Cost: <strong className="text-slate-700">₹{totalInternalCost.toLocaleString('en-IN')}</strong></span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleFormSubmit('Draft')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleFormSubmit('Under Review')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <Clock size={14} /> Submit for Internal Review
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleFormSubmit('Approved Internally')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} /> Approve Estimation
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CreateEstimationModal;
