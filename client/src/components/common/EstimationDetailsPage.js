import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Edit2, Download, Send, CheckCircle, XCircle, 
  Calendar, CircleDollarSign, FileText, User, Building2, 
  Briefcase, History, AlertTriangle, Layers, ArrowRight,
  Sparkles, RefreshCw, Copy, Check, Clock, ShieldAlert, Tag
} from 'lucide-react';
import Swal from 'sweetalert2';
import { estimationsAPI } from '../../services/api';
import { generateQuotationPDF } from '../../utils/generateQuotationPDF';
import { showSuccessToast } from '../../utils/toast';

const EstimationDetailsPage = ({ estimationId, onBack, onEdit }) => {
  const [estimation, setEstimation] = useState(null);
  const [items, setItems] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (estimationId) {
      loadEstimationData(estimationId);
    }
  }, [estimationId]);

  const loadEstimationData = async (targetId) => {
    setIsLoading(true);
    setError('');
    try {
      const [estData, itemsData] = await Promise.all([
        estimationsAPI.getById(targetId),
        estimationsAPI.getItems(targetId).catch(() => [])
      ]);

      setEstimation(estData);
      setItems(Array.isArray(itemsData) ? itemsData : []);

      // Load optional revisions and activities
      try {
        const revs = await estimationsAPI.getRevisions(targetId);
        setRevisions(Array.isArray(revs) ? revs : []);
      } catch (e) {
        setRevisions([]);
      }

      try {
        const acts = await estimationsAPI.getActivities(targetId);
        setActivities(Array.isArray(acts) ? acts : []);
      } catch (e) {
        setActivities([]);
      }
    } catch (err) {
      console.error('Failed to load estimation details:', err);
      setError(err.message || 'Failed to load estimation details');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Draft': 'bg-amber-100 text-amber-800 border-amber-300',
      'Sent': 'bg-blue-100 text-blue-800 border-blue-300',
      'Revised': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'Accepted': 'bg-emerald-100 text-emerald-800 border-emerald-300',
      'Declined': 'bg-rose-100 text-rose-800 border-rose-300',
      'Rejected': 'bg-rose-100 text-rose-800 border-rose-300',
      'Expired': 'bg-slate-100 text-slate-700 border-slate-300',
      'Cancelled': 'bg-gray-100 text-gray-600 border-gray-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const handleStatusChange = async (newStatus) => {
    if (!estimation) return;
    setIsProcessing(true);
    try {
      await estimationsAPI.update(estimation.id, { status: newStatus });
      showSuccessToast(`Estimation marked as ${newStatus}`);
      await loadEstimationData(estimation.id);
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to update status', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConvertToProposal = async () => {
    if (!estimation) return;
    const result = await Swal.fire({
      title: 'Convert to Proposal?',
      text: `Create a formal sales proposal from Estimation #${estimation.estimation_number}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Convert to Proposal'
    });

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        const response = await estimationsAPI.convertToProposal(estimation.id, {
          title: `Proposal for ${estimation.estimation_number}`
        });
        await Swal.fire({
          title: 'Proposal Created!',
          html: `<p>Proposal <strong>${response.proposalNumber}</strong> created successfully.</p>`,
          icon: 'success'
        });
        await loadEstimationData(estimation.id);
      } catch (err) {
        Swal.fire('Error', err.message || 'Failed to convert to proposal', 'error');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleDuplicate = async () => {
    if (!estimation) return;
    setIsProcessing(true);
    try {
      const response = await estimationsAPI.duplicate(estimation.id);
      showSuccessToast('Estimation duplicated as new Draft');
      if (response.estimation?.id) {
        loadEstimationData(response.estimation.id);
      }
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to duplicate estimation', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevise = async () => {
    if (!estimation) return;
    const result = await Swal.fire({
      title: 'Create Revision?',
      text: `Create Revision v${(estimation.version || 1) + 1} for Estimation #${estimation.estimation_number}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#6366f1',
      confirmButtonText: 'Create Revision'
    });

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        const response = await estimationsAPI.revise(estimation.id, {
          description: `Revision v${(estimation.version || 1) + 1}`
        });
        showSuccessToast(`Revision v${(estimation.version || 1) + 1} created`);
        if (response.estimation?.id) {
          loadEstimationData(response.estimation.id);
        }
      } catch (err) {
        Swal.fire('Error', err.message || 'Failed to create revision', 'error');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleDownloadPDF = async () => {
    if (!estimation) return;
    try {
      const pdfData = {
        estimation_number: estimation.estimation_number,
        quotationNumber: estimation.estimation_number,
        estimate_date: estimation.estimate_date || estimation.created_at,
        expiry_date: estimation.expiry_date,
        client: estimation.client_name || estimation.company_name || 'Client',
        contactPerson: estimation.contact_name || estimation.lead_name || 'Valued Client',
        amount: estimation.amount || estimation.total || 0,
        currency: estimation.currency || 'INR',
        discount: estimation.discount_amount || 0,
        tax_percentage: estimation.tax_percentage || 0,
        items: items.length > 0 ? items.map(it => ({
          productName: it.item_name,
          description: it.description,
          quantity: it.quantity,
          rate: it.rate
        })) : []
      };
      await generateQuotationPDF(pdfData);
      showSuccessToast('PDF Downloaded successfully');
    } catch (err) {
      Swal.fire('Error', 'Failed to generate PDF: ' + err.message, 'error');
    }
  };

  const calculateExpiryStatus = () => {
    if (!estimation?.expiry_date) return null;
    const expiry = new Date(estimation.expiry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'Expired', badgeClass: 'bg-rose-100 text-rose-700 border-rose-300', isExpired: true };
    } else if (diffDays <= 3) {
      return { label: `Expiring in ${diffDays} day${diffDays === 1 ? '' : 's'}`, badgeClass: 'bg-amber-100 text-amber-800 border-amber-300', isWarning: true };
    }
    return { label: `Valid until ${expiry.toLocaleDateString()}`, badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center p-8">
          <RefreshCw size={32} className="animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading estimation details...</p>
        </div>
      </div>
    );
  }

  if (error || !estimation) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 font-medium">
          <ArrowLeft size={18} /> Back to Estimations
        </button>
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
          {error || 'Estimation not found'}
        </div>
      </div>
    );
  }

  const currency = estimation.currency || 'INR';
  const subtotal = parseFloat(estimation.subtotal || estimation.amount || 0);
  const discountAmount = parseFloat(estimation.discount_amount || 0);
  const taxAmount = parseFloat(estimation.tax_amount || 0);
  const grandTotal = parseFloat(estimation.total || estimation.amount || 0);
  const expiryStatus = calculateExpiryStatus();

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">
                  {estimation.estimation_number}
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  v{estimation.version || 1}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getStatusColor(estimation.status)}`}>
                  {estimation.status}
                </span>
                {expiryStatus && (
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${expiryStatus.badgeClass}`}>
                    {expiryStatus.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Client: <span className="font-semibold text-slate-700">{estimation.client_name || 'Client Unassigned'}</span>
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadPDF}
              className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download size={14} className="text-slate-500" /> Export PDF
            </button>
            
            <button
              onClick={handleDuplicate}
              disabled={isProcessing}
              className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Copy size={14} className="text-slate-500" /> Duplicate
            </button>

            <button
              onClick={handleRevise}
              disabled={isProcessing}
              className="px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={14} className="text-indigo-600" /> Create Revision
            </button>

            {onEdit && (
              <button
                onClick={() => onEdit(estimation)}
                className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Edit2 size={14} className="text-slate-500" /> Edit
              </button>
            )}

            {estimation.status !== 'Accepted' && (
              <button
                onClick={() => handleStatusChange('Accepted')}
                disabled={isProcessing}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <CheckCircle size={14} /> Mark Accepted
              </button>
            )}

            <button
              onClick={handleConvertToProposal}
              disabled={isProcessing}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Sparkles size={14} /> Convert to Proposal
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-6 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'overview' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview & Scope
          </button>
          <button
            onClick={() => setActiveTab('revisions')}
            className={`py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'revisions' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History size={14} /> Revision History ({revisions.length || 1})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'timeline' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock size={14} /> Activity Timeline
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        
        {/* Conversion Workflow Banner for Accepted Estimations */}
        {estimation.status === 'Accepted' && (
          <div className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <CheckCircle size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-900">Estimation Accepted by Client!</h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Continue the sales lifecycle by generating a formal proposal or converting directly to an invoice.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleConvertToProposal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
              >
                Generate Proposal <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Overview & Scope */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Columns: Items Table & Scope details */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Itemized Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Layers size={16} className="text-blue-600" /> Estimate Line Items
                  </h3>
                  <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="p-3">Item / Service</th>
                        <th className="p-3 text-center">Qty / Unit</th>
                        <th className="p-3 text-right">Unit Rate</th>
                        <th className="p-3 text-right">Discount</th>
                        <th className="p-3 text-right">Tax</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-6 text-center text-slate-400">
                            No specific line items recorded. Base estimate amount: {currency} {grandTotal.toLocaleString()}
                          </td>
                        </tr>
                      ) : (
                        items.map((item, idx) => {
                          const itemQty = parseFloat(item.quantity || 1);
                          const itemRate = parseFloat(item.rate || 0);
                          const lineSubtotal = itemQty * itemRate;
                          const discAmt = parseFloat(item.discount_amount || (lineSubtotal * (item.discount_percent || 0) / 100));
                          const lineTax = parseFloat(item.tax_amount || 0);
                          const lineTotal = item.total ? parseFloat(item.total) : (lineSubtotal - discAmt + lineTax);

                          return (
                            <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3">
                                <p className="font-semibold text-slate-800">{item.item_name}</p>
                                {item.description && (
                                  <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                                )}
                              </td>
                              <td className="p-3 text-center text-slate-700 font-medium">
                                {itemQty} {item.unit || 'units'}
                              </td>
                              <td className="p-3 text-right text-slate-700">
                                {currency} {itemRate.toLocaleString()}
                              </td>
                              <td className="p-3 text-right text-slate-500">
                                {discAmt > 0 ? `-${currency} ${discAmt.toLocaleString()}` : '-'}
                              </td>
                              <td className="p-3 text-right text-slate-500">
                                {lineTax > 0 ? `${currency} ${lineTax.toLocaleString()}` : '-'}
                              </td>
                              <td className="p-3 text-right font-bold text-slate-900">
                                {currency} {lineTotal.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary Calculation Card */}
                <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col items-end space-y-2 text-xs">
                  <div className="flex justify-between w-full max-w-xs text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-800">{currency} {subtotal.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between w-full max-w-xs text-amber-600">
                      <span>Discount ({estimation.discount_percentage || 0}%):</span>
                      <span className="font-semibold">-{currency} {discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {taxAmount > 0 && (
                    <div className="flex justify-between w-full max-w-xs text-slate-600">
                      <span>Tax ({estimation.tax_percentage || 0}% GST/VAT):</span>
                      <span className="font-semibold">{currency} {taxAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between w-full max-w-xs pt-2 border-t border-slate-300 text-sm font-bold text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-blue-700">{currency} {grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Notes & Scope Description */}
              {estimation.description && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <FileText size={16} className="text-blue-600" /> Scope & Description
                  </h3>
                  <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                    {estimation.description}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Client & Deal Cards */}
            <div className="space-y-6">
              
              {/* Client Info Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Building2 size={16} className="text-blue-600" /> Client Information
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <p className="text-slate-400 font-medium">Company Name</p>
                    <p className="font-semibold text-slate-800 text-sm mt-0.5">{estimation.client_name || 'N/A'}</p>
                  </div>
                  {estimation.contact_name && (
                    <div>
                      <p className="text-slate-400 font-medium">Contact Person</p>
                      <p className="font-medium text-slate-700 mt-0.5">{estimation.contact_name}</p>
                    </div>
                  )}
                  {estimation.bill_to && (
                    <div>
                      <p className="text-slate-400 font-medium">Billing Address</p>
                      <p className="text-slate-600 mt-0.5">{estimation.bill_to}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Deal Info Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Briefcase size={16} className="text-blue-600" /> Deal Information
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <p className="text-slate-400 font-medium">Linked Deal ID</p>
                    <p className="font-semibold text-slate-800 text-sm mt-0.5">
                      {estimation.deal_id ? `#DEAL-${estimation.deal_id}` : 'Unassigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Project Name</p>
                    <p className="font-medium text-slate-700 mt-0.5">{estimation.project_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Sales Owner / Estimator</p>
                    <p className="font-medium text-slate-700 mt-0.5">
                      {estimation.creator_first_name ? `${estimation.creator_first_name} ${estimation.creator_last_name || ''}` : 'Sales Rep'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Validity & Expiry Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Calendar size={16} className="text-blue-600" /> Estimation Dates
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-slate-500">Estimate Date:</span>
                    <span className="font-semibold text-slate-800">
                      {estimation.estimate_date ? new Date(estimation.estimate_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-slate-500">Valid Until:</span>
                    <span className="font-semibold text-slate-800">
                      {estimation.expiry_date ? new Date(estimation.expiry_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Revision History Inspector */}
        {activeTab === 'revisions' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <History size={18} className="text-blue-600" /> Revision Audit Log ({revisions.length})
            </h3>
            
            <div className="space-y-4">
              {revisions.map((rev) => (
                <div 
                  key={rev.id}
                  className={`p-4 rounded-xl border transition-all ${
                    rev.id === estimation.id ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                        v{rev.version || 1}
                      </span>
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{rev.estimation_number}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Created: {new Date(rev.created_at).toLocaleDateString()} by {rev.creator_first_name || 'Estimator'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getStatusColor(rev.status)}`}>
                        {rev.status}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {rev.currency || 'INR'} {(rev.amount || rev.total || 0).toLocaleString()}
                      </span>

                      {rev.id !== estimation.id && (
                        <button
                          onClick={() => loadEstimationData(rev.id)}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                        >
                          View Revision
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Activity Timeline */}
        {activeTab === 'timeline' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-blue-600" /> Lifecycle Activity Timeline
            </h3>

            <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
              {activities.map((act) => (
                <div key={act.id} className="relative flex items-start gap-4 pl-8">
                  <div className="absolute left-0 top-1 w-7 h-7 rounded-full bg-blue-100 text-blue-600 border border-blue-300 flex items-center justify-center text-xs font-bold">
                    ✓
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex-1">
                    <p className="font-semibold text-slate-900 text-xs">{act.title}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {new Date(act.created_at).toLocaleString()} • {act.user_name || 'System User'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EstimationDetailsPage;
