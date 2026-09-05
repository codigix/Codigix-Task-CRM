import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, Upload, FileText, CheckCircle2, AlertCircle, Building2, User, Phone, Mail,
  DollarSign, Calendar, Clock, Tag, Plus, Trash2, Eye, Download, Sparkles,
  Check, ChevronRight, FileCheck, Layers, ShieldCheck, Briefcase, Paperclip,
  ArrowRight, File, HelpCircle, ExternalLink, RefreshCw
} from 'lucide-react';
import { dealsAPI, companiesAPI, usersAPI } from '../../services/api';

const CONTRACT_TYPES = [
  'Service Level Agreement (SLA)',
  'Fixed Price Contract',
  'Master Services Agreement (MSA)',
  'Software License Agreement',
  'Maintenance Contract - Annual (AMC)',
  'Digital Marketing & SEO Agreement',
  'Statement of Work (SOW)',
  'Consulting / Retainer Agreement',
  'Partnership Contract',
  'Non-Disclosure Agreement (NDA)',
  'Other'
];

const CONTRACT_STATUSES = [
  'Draft',
  'Active',
  'Pending Signature',
  'Completed',
  'Terminated'
];

const PAYMENT_TERMS_OPTIONS = [
  '50% Advance, 50% on Delivery',
  '100% Advance',
  '30% Advance, 40% Mid-milestone, 30% Completion',
  'Monthly Retainer (Net 15)',
  'Net 30 Days',
  'Milestone-Based Payments',
  'Custom Payment Terms'
];

const DOCUMENT_CATEGORIES = [
  'Signed Agreement',
  'Contract Draft',
  'Statement of Work (SOW)',
  'Proposal / Quotation',
  'Compliance / KYC / Tax',
  'Technical Specifications',
  'Other Document'
];

const AddNewContractModal = ({ isOpen, onClose, onSubmit, companies: initialCompanies = [] }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Lookups data
  const [deals, setDeals] = useState([]);
  const [companies, setCompanies] = useState(initialCompanies);
  const [users, setUsers] = useState([]);

  // Selected entities
  const [selectedDealId, setSelectedDealId] = useState('');
  const [selectedDeal, setSelectedDeal] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    subject: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    client_id: '',
    contract_type: 'Service Level Agreement (SLA)',
    contract_value: '',
    payment_terms: '50% Advance, 50% on Delivery',
    status: 'Draft',
    description: '',
  });

  // Attached files state
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Load all lookups when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchLookups = async () => {
      setLoadingLookups(true);
      try {
        const [dealsRes, companiesRes, usersRes] = await Promise.allSettled([
          dealsAPI.getAll(),
          companiesAPI.getAll(),
          usersAPI ? usersAPI.getAll() : Promise.resolve([])
        ]);

        if (dealsRes.status === 'fulfilled') {
          const list = Array.isArray(dealsRes.value) ? dealsRes.value : (dealsRes.value?.data || []);
          setDeals(list);
        }

        if (companiesRes.status === 'fulfilled') {
          const list = Array.isArray(companiesRes.value) ? companiesRes.value : (companiesRes.value?.data || []);
          if (list.length > 0) setCompanies(list);
        }

        if (usersRes.status === 'fulfilled') {
          const list = Array.isArray(usersRes.value) ? usersRes.value : (usersRes.value?.data || []);
          setUsers(list);
        }
      } catch (err) {
        console.error('Error loading contract lookups:', err);
      } finally {
        setLoadingLookups(false);
      }
    };

    fetchLookups();
  }, [isOpen]);

  // Handle Deal Selection -> Auto-populate all Deal Info & Pre-fill Contract
  const handleSelectDeal = (dealId) => {
    setSelectedDealId(dealId);
    if (!dealId) {
      setSelectedDeal(null);
      return;
    }

    const foundDeal = deals.find(d => String(d.id) === String(dealId));
    if (foundDeal) {
      setSelectedDeal(foundDeal);

      // Auto-set client
      if (foundDeal.company_id) {
        setFormData(prev => ({
          ...prev,
          client_id: String(foundDeal.company_id)
        }));
      } else if (foundDeal.company_name) {
        const matchedComp = companies.find(c => (c.company_name || c.name || '').toLowerCase() === foundDeal.company_name.toLowerCase());
        if (matchedComp) {
          setFormData(prev => ({
            ...prev,
            client_id: String(matchedComp.id)
          }));
        }
      }

      // Auto-suggest Contract Subject
      const companyLabel = foundDeal.company_name || 'Client';
      const dealLabel = foundDeal.deal_name || foundDeal.project_name || 'Service Agreement';
      const suggestedSubject = `${companyLabel} - ${dealLabel} Contract Agreement`;

      // Auto-suggest Contract Type based on business type / service
      let suggestedType = 'Service Level Agreement (SLA)';
      const bType = (foundDeal.business_type || '').toLowerCase();
      if (bType.includes('marketing') || (foundDeal.marketing_services && foundDeal.marketing_services.length > 0)) {
        suggestedType = 'Digital Marketing & SEO Agreement';
      } else if (bType.includes('it') || bType.includes('software')) {
        suggestedType = 'Software License Agreement';
      }

      // Auto-suggest 1-year duration
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(startDate.getFullYear() + 1);

      // Pre-fill Contract Details
      setFormData(prev => ({
        ...prev,
        subject: prev.subject ? prev.subject : suggestedSubject,
        contract_type: suggestedType,
        contract_value: foundDeal.deal_value || prev.contract_value || '',
        start_date: prev.start_date || startDate.toISOString().split('T')[0],
        end_date: prev.end_date ? prev.end_date : endDate.toISOString().split('T')[0],
        description: prev.description ? prev.description : (foundDeal.description || `Scope of services agreed for ${dealLabel}. All deliverables, milestones, and client assets as outlined during deal conversion.`)
      }));
    }
  };

  // Handle Client Selection
  const handleSelectClient = (clientId) => {
    setFormData(prev => ({ ...prev, client_id: clientId }));

    // If no deal is selected, look for deals belonging to this client
    if (!selectedDealId && clientId) {
      const clientDeals = deals.filter(d => String(d.company_id) === String(clientId));
      if (clientDeals.length === 1) {
        handleSelectDeal(clientDeals[0].id);
      }
    }
  };

  // Filter deals when a client is selected
  const availableDeals = useMemo(() => {
    if (!formData.client_id) return deals;
    const filtered = deals.filter(d => String(d.company_id) === String(formData.client_id));
    return filtered.length > 0 ? filtered : deals;
  }, [deals, formData.client_id]);

  // Quick preset buttons for End Date (+3m, +6m, +1y, +2y)
  const applyDurationPreset = (months) => {
    const base = formData.start_date ? new Date(formData.start_date) : new Date();
    base.setMonth(base.getMonth() + months);
    setFormData(prev => ({
      ...prev,
      end_date: base.toISOString().split('T')[0]
    }));
  };

  // File Upload Handlers
  const handleFilesSelect = (fileList) => {
    if (!fileList || fileList.length === 0) return;

    const filePromises = Array.from(fileList).map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 7),
            name: file.name,
            size: file.size,
            type: file.type,
            category: 'Signed Agreement',
            dataUrl: reader.result,
            uploadedAt: new Date().toLocaleDateString()
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then(processedFiles => {
      setUploadedFiles(prev => [...prev, ...processedFiles]);
    });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelect(e.target.files);
    }
  };

  const handleUpdateFileCategory = (fileId, category) => {
    setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, category } : f));
  };

  const handleRemoveFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  };

  // Form Submit Handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!formData.subject.trim()) {
      setError('Contract Subject is required');
      return;
    }
    if (!formData.client_id) {
      setError('Please select a Client / Company');
      return;
    }
    if (!formData.start_date) {
      setError('Start Date is required');
      return;
    }
    if (!formData.end_date) {
      setError('End Date is required');
      return;
    }
    if (!formData.contract_value || parseFloat(formData.contract_value) <= 0) {
      setError('Contract Value must be greater than 0');
      return;
    }

    setIsLoading(true);
    try {
      const contractPayload = {
        subject: formData.subject.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        client_id: parseInt(formData.client_id, 10),
        deal_id: selectedDealId ? parseInt(selectedDealId, 10) : null,
        contract_type: formData.contract_type,
        contract_value: parseFloat(formData.contract_value) || 0,
        payment_terms: formData.payment_terms,
        description: formData.description,
        status: formData.status || 'Draft',
        files: uploadedFiles
      };

      if (onSubmit) {
        await onSubmit(contractPayload);
      }
      handleCancel();
    } catch (err) {
      setError(err.message || 'Failed to create contract');
      console.error('Contract submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      subject: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      client_id: '',
      contract_type: 'Service Level Agreement (SLA)',
      contract_value: '',
      payment_terms: '50% Advance, 50% on Delivery',
      status: 'Draft',
      description: '',
    });
    setSelectedDealId('');
    setSelectedDeal(null);
    setUploadedFiles([]);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="h-full w-full md:w-[80%] lg:w-[70%] xl:w-[62%] bg-white shadow-2xl overflow-y-auto border-l border-slate-200 flex flex-col">

        {/* ================= MODAL HEADER ================= */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white sticky top-0 z-30 flex items-center justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg  text-slate-900 flex items-center gap-2">
                <FileCheck size={20} className="text-red-600" />
                Add New Contract
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                Deal to Contract Workflow
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select a converted deal or client to review deal intelligence, define contract clauses, and attach legal files.
            </p>
          </div>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ================= ERROR BANNER ================= */}
        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 font-medium">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ================= MODAL BODY ================= */}
        <div className="p-4 sm:p-6 space-y-3 flex-1 bg-slate-50/50 custom-scrollbar">

          {/* ================= STEP 1: SELECT DEAL OR CLIENT ================= */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-red-50 text-red-600 flex items-center justify-center  text-xs">1</div>
                <div>
                  <h3 className=" text-slate-900 text-sm">Select Deal or Client</h3>
                  <p className="text-[11px] text-slate-500">Pick a converted lead or deal to auto-populate all project details.</p>
                </div>
              </div>
              {selectedDeal && (
                <button
                  type="button"
                  onClick={() => handleSelectDeal('')}
                  className="text-xs text-slate-500 hover:text-red-600 font-medium underline"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Select Deal / Converted Lead */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Briefcase size={13} className="text-red-600" />
                  Select Deal / Converted Lead
                </label>
                <select
                  value={selectedDealId}
                  onChange={(e) => handleSelectDeal(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                >
                  <option value="">-- Choose a Deal or Converted Lead --</option>
                  {availableDeals.map(d => {
                    const isConverted = d.record_type === 'Converted Lead' || String(d.id).length > 6;
                    const valueStr = d.deal_value ? `₹${parseFloat(d.deal_value).toLocaleString('en-IN')}` : 'No Budget';
                    return (
                      <option key={d.id} value={d.id}>
                        {isConverted ? '🎯 [Converted Lead] ' : '💼 [Deal] '}
                        {d.deal_name || d.project_name || `Deal #${d.id}`} - {d.company_name || 'Client'} ({valueStr})
                      </option>
                    );
                  })}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Selecting a deal auto-fills client, budget, services, and contact details.
                </span>
              </div>

              {/* Select Client */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Building2 size={13} className="text-slate-600" />
                  Client / Company <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.client_id}
                  onChange={(e) => handleSelectClient(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                >
                  <option value="">-- Select Client / Company --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.company_name || c.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  The primary legal entity entering into this contract.
                </span>
              </div>
            </div>
          </div>

          {/* ================= STEP 2: DEAL & CONVERSION INTELLIGENCE PANEL ================= */}
          {selectedDeal ? (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-4 sm:p-5 shadow-lg border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs  bg-amber-400 text-slate-950 shadow-sm">
                    {selectedDeal.record_type === 'Converted Lead' ? '🎯 Converted Lead' : '💼 Pipeline Deal'}
                  </span>
                  <span className="text-xs font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    Stage: {selectedDeal.deal_stage || selectedDeal.status || selectedDeal.pipeline || 'Active'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    ID #{selectedDeal.id}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Deal Budget / Value</span>
                  <span className="text-base sm:text-lg font-black text-amber-400">
                    ₹{selectedDeal.deal_value ? parseFloat(selectedDeal.deal_value).toLocaleString('en-IN') : '0.00'}
                  </span>
                </div>
              </div>

              {/* Deal Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                {/* Client Company */}
                <div className="bg-slate-800/60 p-2.5 rounded border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Company / Client</span>
                  <div className="font-semibold text-white truncate flex items-center gap-1.5">
                    <Building2 size={13} className="text-blue-400 shrink-0" />
                    <span>{selectedDeal.company_name || 'Aditya Homeopathy'}</span>
                  </div>
                </div>

                {/* Contact Person */}
                <div className="bg-slate-800/60 p-2.5 rounded border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Contact Details</span>
                  <div className="font-semibold text-white truncate flex items-center gap-1.5">
                    <User size={13} className="text-emerald-400 shrink-0" />
                    <span>{selectedDeal.contact_first_name ? `${selectedDeal.contact_first_name} ${selectedDeal.contact_last_name || ''}` : (selectedDeal.deal_name || 'Contact')}</span>
                  </div>
                  {(selectedDeal.contact_email || selectedDeal.contact_phone) && (
                    <div className="text-[10px] text-slate-300 mt-1 space-y-0.5">
                      {selectedDeal.contact_email && <p className="truncate">✉ {selectedDeal.contact_email}</p>}
                      {selectedDeal.contact_phone && <p className="truncate">📞 {selectedDeal.contact_phone}</p>}
                    </div>
                  )}
                </div>

                {/* Services & Business Type */}
                <div className="bg-slate-800/60 p-2.5 rounded border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Service Category</span>
                  <div className="font-semibold text-white truncate flex items-center gap-1.5">
                    <Layers size={13} className="text-indigo-400 shrink-0" />
                    <span>{selectedDeal.business_type || selectedDeal.service_name || 'General Services'}</span>
                  </div>
                  {Array.isArray(selectedDeal.marketing_services) && selectedDeal.marketing_services.length > 0 && (
                    <p className="text-[10px] text-slate-300 mt-1 truncate">
                      {selectedDeal.marketing_services.join(', ')}
                    </p>
                  )}
                </div>

                {/* Owner & Timeline */}
                <div className="bg-slate-800/60 p-2.5 rounded border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Assigned Owner</span>
                  <div className="font-semibold text-white truncate flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-amber-400 shrink-0" />
                    <span>
                      {selectedDeal.assignee_first_name ? `${selectedDeal.assignee_first_name} ${selectedDeal.assignee_last_name || ''}` : 'Sales Executive'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Created: {selectedDeal.created_at ? new Date(selectedDeal.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent'}
                  </span>
                </div>
              </div>

              {/* Original Deal Description */}
              {selectedDeal.description && (
                <div className="mt-3 p-2.5 bg-slate-800/40 rounded border border-slate-700/40 text-xs">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Requirements / Discussion Notes:</span>
                  <p className="text-slate-200 leading-relaxed italic">"{selectedDeal.description}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <Sparkles size={15} className="text-amber-600 shrink-0" />
              <span>Tip: Select a deal above to automatically extract and populate project scope, client details, and pricing!</span>
            </div>
          )}

          {/* ================= STEP 3: DEFINE THE CONTRACT ================= */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <div className="w-7 h-7 rounded bg-red-50 text-red-600 flex items-center justify-center  text-xs">2</div>
              <div>
                <h3 className=" text-slate-900 text-sm">Define Contract Terms</h3>
                <p className="text-[11px] text-slate-500">Specify contract subject, commercial value, dates, and payment clauses.</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Contract Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contract Subject / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g. Acme Corporation - Annual Maintenance Contract 2026"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                />
              </div>

              {/* Contract Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contract Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.contract_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, contract_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                  >
                    {CONTRACT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contract Value (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 ">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={formData.contract_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, contract_value: e.target.value }))}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded text-xs  text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Dates & Duration Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    {/* Duration preset buttons */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">Quick:</span>
                      <button
                        type="button"
                        onClick={() => applyDurationPreset(3)}
                        className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-medium text-slate-700 transition"
                      >
                        3m
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDurationPreset(6)}
                        className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-medium text-slate-700 transition"
                      >
                        6m
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDurationPreset(12)}
                        className="px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 text-[10px]  text-red-700 transition"
                      >
                        1y
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDurationPreset(24)}
                        className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-medium text-slate-700 transition"
                      >
                        2y
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
              </div>

              {/* Status & Payment Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contract Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  >
                    {CONTRACT_STATUSES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={formData.payment_terms}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  >
                    {PAYMENT_TERMS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contract Description & Clauses */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contract Scope, Clauses & Terms
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter detailed contract terms, scope of work, deliverables, and service guarantees..."
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 leading-relaxed custom-scrollbar"
                />
              </div>
            </div>
          </div>

          {/* ================= STEP 4: ADD RELATED FILES & DOCUMENTS ================= */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-red-50 text-red-600 flex items-center justify-center  text-xs">3</div>
                <div>
                  <h3 className=" text-slate-900 text-sm">Add Related Files & Documents</h3>
                  <p className="text-[11px] text-slate-500">Attach signed agreements, statement of work (SOW), proposal PDFs, or client KYC.</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {uploadedFiles.length} {uploadedFiles.length === 1 ? 'file' : 'files'} attached
              </span>
            </div>

            {/* Drag & Drop Upload Box */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dragActive
                ? 'border-red-500 bg-red-50/70 scale-[1.01]'
                : 'border-slate-300 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-400'
                }`}
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-2 shadow-sm">
                <Upload size={22} />
              </div>
              <p className="text-xs  text-slate-800 mb-1">
                Click to browse or drag and drop your contract files here
              </p>
              <p className="text-[11px] text-slate-500">
                Supports PDF, Word (.docx), Excel (.xlsx), scanned images (PNG, JPG) up to 50 MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
              />
            </div>

            {/* Uploaded Files Table */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs  text-slate-700">Attached Documents:</p>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded overflow-hidden bg-white">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded bg-red-50 text-red-600 flex items-center justify-center  text-xs shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 truncate">{file.name}</p>
                          <span className="text-[10px] text-slate-400">{formatFileSize(file.size)}</span>
                        </div>
                      </div>

                      {/* Document Category Dropdown */}
                      <div className="w-48 shrink-0">
                        <select
                          value={file.category}
                          onChange={(e) => handleUpdateFileCategory(file.id, e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-medium text-slate-700 focus:outline-none focus:border-red-500"
                        >
                          {DOCUMENT_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition shrink-0"
                        title="Remove file"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white sticky bottom-0 z-30 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {selectedDeal && (
              <span>Linked Deal: <strong className="text-slate-900">{selectedDeal.deal_name}</strong> (₹{parseFloat(selectedDeal.deal_value || 0).toLocaleString('en-IN')})</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={(e) => {
                setFormData(prev => ({ ...prev, status: 'Draft' }));
                handleSubmit(e);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded text-xs font-semibold transition disabled:opacity-50"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={(e) => {
                setFormData(prev => ({ ...prev, status: 'Active' }));
                handleSubmit(e);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} /> Create Contract
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AddNewContractModal;
