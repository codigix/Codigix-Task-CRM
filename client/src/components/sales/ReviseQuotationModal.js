import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Send, Save, ChevronDown, Clock, ArrowRight, CheckCircle2, AlertCircle, FileText, Download, RotateCcw } from 'lucide-react';
import { estimationsAPI, usersAPI, dealsAPI, leadsAPI, taskAPI, projectAPI, activitiesAPI } from '../../services/api';
import { showSuccessToast } from '../../utils/toast';
import Swal from 'sweetalert2';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ReviseQuotationModal = ({ isOpen, onClose, quotation, onUpdate }) => {
  const [formData, setFormData] = useState({
    quotationNumber: '',
    quotationVersion: '',
    deal_id: '',
    project_id: '',
    project_name: '',
    client: '',
    client_id: '',
    lead_id: '',
    quotationDate: new Date().toISOString().split('T')[0],
    validUntil: '',
    status: 'Revised',
    assignedExecutiveId: '',
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    currency: 'INR',
    discount: 0,
    notes: '',
    paymentTerms: '',
    revisionReasons: [],
  });

  const [versions, setVersions] = useState([]);
  const [compareWith, setCompareWith] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isFetchingItemsRef = useRef(false);
  const isFetchingCompareItemsRef = useRef(false);
  const isFetchingVersionsRef = useRef(false);
  const isFetchingUsersRef = useRef(false);

  useEffect(() => {
    if (isOpen && quotation?.id) {
      const nextVersion = (quotation.version || 1) + 1;
      const baseNumber = (quotation.estimation_number || quotation.quotation_number || quotation.quotationNumber || '').split('-v')[0];
      const newQuotationNumber = `${baseNumber}-v${nextVersion}`;

      const taxPct = quotation.taxPercentage !== undefined ? Number(quotation.taxPercentage) : (quotation.tax_percentage !== undefined ? Number(quotation.tax_percentage) : 10);
      const sub = parseFloat(quotation.subtotal || quotation.amount || quotation.total) || 0;
      const taxAmt = quotation.tax !== undefined ? parseFloat(quotation.tax) : (quotation.tax_amount !== undefined ? parseFloat(quotation.tax_amount) : (sub * (taxPct / 100)));
      const tot = quotation.total !== undefined ? parseFloat(quotation.total) : (quotation.amount !== undefined ? parseFloat(quotation.amount) : (sub + taxAmt));

      const initialItems = (quotation.items && quotation.items.length > 0) 
        ? quotation.items.map(item => ({
            ...item,
            productName: item.productName || item.item_name || item.product_name || item.name || '',
            original_rate: item.original_rate || item.rate || 0,
            rate: item.rate || 0,
            adjustment: item.adjustment || 0
          }))
        : [{
            id: Date.now(),
            productName: quotation.project_name || quotation.deal_name || quotation.client || 'Service',
            description: quotation.description || '',
            original_rate: sub,
            rate: sub,
            adjustment: 0,
            quantity: 1
          }];

      setFormData({
        ...quotation,
        quotationNumber: newQuotationNumber,
        quotationVersion: `v${nextVersion} Revised`,
        version: nextVersion,
        quotationDate: new Date().toISOString().split('T')[0],
        validUntil: quotation.expiry_date ? new Date(quotation.expiry_date).toISOString().split('T')[0] : (quotation.validUntil ? new Date(quotation.validUntil).toISOString().split('T')[0] : ''),
        assignedExecutiveId: quotation.estimate_by || quotation.assignedExecutiveId || '',
        status: 'Revised',
        items: initialItems,
        subtotal: sub,
        tax: taxAmt,
        taxPercentage: taxPct,
        total: tot,
        currency: quotation.currency || 'INR',
        discount: quotation.discount_amount || quotation.discount || 0,
        notes: quotation.notes || '',
        paymentTerms: quotation.payment_terms || quotation.paymentTerms || '50% advance payment. Balance due upon project completion.',
        revisionReasons: [],
      });

      setCompareWith(quotation);
      fetchVersions();
      fetchUsers();

      // Fetch items if they are not in quotation object
      if (quotation.id && (!quotation.items || quotation.items.length === 0)) {
        const fetchItems = async () => {
          if (isFetchingItemsRef.current) return;
          isFetchingItemsRef.current = true;
          try {
            const itemsRes = await estimationsAPI.getItems(quotation.id);
            if (Array.isArray(itemsRes) && itemsRes.length > 0) {
              const mappedItems = itemsRes.map(item => ({
                id: item.id || Date.now() + Math.random(),
                productName: item.item_name || item.productName || item.product_name || item.name || '',
                description: item.description || '',
                duration: item.duration || '',
                original_rate: parseFloat(item.rate || item.price) || 0,
                rate: parseFloat(item.rate || item.price) || 0,
                adjustment: 0,
                quantity: parseFloat(item.quantity) || 1
              }));

              setFormData(prev => ({
                ...prev,
                items: mappedItems
              }));

              setCompareWith(prev => ({
                ...prev,
                items: mappedItems
              }));

              calculateTotals(mappedItems, quotation.discount_amount || quotation.discount || 0);
            }
          } catch (err) {
            console.error('Error fetching quotation items:', err);
          } finally {
            isFetchingItemsRef.current = false;
          }
        };
        fetchItems();
      }
    }
  }, [isOpen, quotation?.id]);

  useEffect(() => {
    if (compareWith && compareWith.id && compareWith.id !== 'NEW' && (!compareWith.items || compareWith.items.length === 0)) {
      const fetchCompareItems = async () => {
        if (isFetchingCompareItemsRef.current) return;
        isFetchingCompareItemsRef.current = true;
        try {
          const itemsRes = await estimationsAPI.getItems(compareWith.id);
          if (Array.isArray(itemsRes) && itemsRes.length > 0) {
            const mappedItems = itemsRes.map(item => ({
              id: item.id || Date.now() + Math.random(),
              productName: item.item_name || item.productName || item.product_name || item.name || '',
              description: item.description || '',
              duration: item.duration || '',
              original_rate: parseFloat(item.rate || item.price) || 0,
              rate: parseFloat(item.rate || item.price) || 0,
              adjustment: 0,
              quantity: parseFloat(item.quantity) || 1
            }));

            setCompareWith(prev => ({
              ...prev,
              items: mappedItems
            }));
          }
        } catch (err) {
          console.error('Error fetching comparison items:', err);
        } finally {
          isFetchingCompareItemsRef.current = false;
        }
      };
      fetchCompareItems();
    }
  }, [compareWith?.id]);

  const fetchVersions = async () => {
    if (isFetchingVersionsRef.current) return;
    isFetchingVersionsRef.current = true;
    try {
      const filters = {};
      if (quotation?.deal_id) filters.deal_id = quotation.deal_id;
      if (quotation?.lead_id) filters.lead_id = quotation.lead_id;

      const estimations = await estimationsAPI.getAll(filters);
      if (Array.isArray(estimations)) {
        const qNum = quotation?.estimation_number || quotation?.quotation_number || quotation?.quotationNumber || '';
        const baseNumber = qNum ? qNum.split('-v')[0] : '';
        const filteredEstimations = baseNumber 
          ? estimations.filter(est => {
              const num = est.estimation_number || est.quotation_number || '';
              return num.startsWith(baseNumber);
            })
          : estimations;

        const sorted = [...filteredEstimations].sort((a, b) =>
          new Date(b.created_at || b.date) - new Date(a.created_at || a.date)
        );
        setVersions(sorted);
      }
    } catch (err) {
      console.error('Error fetching versions:', err);
    } finally {
      isFetchingVersionsRef.current = false;
    }
  };

  const fetchUsers = async () => {
    if (isFetchingUsersRef.current) return;
    isFetchingUsersRef.current = true;
    try {
      const data = await usersAPI.getAll();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      isFetchingUsersRef.current = false;
    }
  };

  const comparisonData = useMemo(() => {
    if (!compareWith) return { prevTotal: 0, items: [], totalChange: 0, currTotal: formData.total || 0, reasons: [] };

    const prevTotal = parseFloat(compareWith.amount || compareWith.total) || 0;
    const currTotal = formData.total || 0;
    const totalChange = currTotal - prevTotal;

    // Compare items
    const prevItems = compareWith.items || [];
    const currItems = formData.items;

    const reasons = [];

    // Calculate total discount difference (header level discount)
    const prevDiscount = parseFloat(compareWith.discount_amount || compareWith.discount || 0);
    const currDiscount = parseFloat(formData.discount || 0);
    if (currDiscount > prevDiscount) {
      reasons.push({
        name: 'Additional Discount',
        amount: currDiscount - prevDiscount,
        color: 'bg-emerald-500'
      });
    }

    // Check for scope changes (New items)
    const prevNames = new Set(prevItems.map(i => i.productName || i.item_name));
    const currNames = new Set(currItems.map(i => i.productName || i.item_name));

    let scopeExpansionAmount = 0;
    currItems.forEach(item => {
      const itemName = item.productName || item.item_name;
      if (!prevNames.has(itemName)) {
        scopeExpansionAmount += parseFloat(item.rate || 0);
      }
    });

    if (scopeExpansionAmount > 0) {
      reasons.push({ name: 'Scope Change', amount: scopeExpansionAmount, color: 'bg-[#10B981]' });
    }

    // Price Adjustments for existing items
    let priceIncreaseAmount = 0;
    let priceDecreaseAmount = 0;

    currItems.forEach(item => {
      const itemName = item.productName || item.item_name;
      const prevItem = prevItems.find(i => (i.productName || i.item_name) === itemName);

      if (prevItem) {
        const diff = parseFloat(item.rate || 0) - parseFloat(prevItem.rate || 0);
        if (diff > 0) priceIncreaseAmount += diff;
        if (diff < 0) priceDecreaseAmount += Math.abs(diff);
      }
    });

    if (priceIncreaseAmount > 0) {
      reasons.push({ name: 'Price Increase', amount: priceIncreaseAmount, color: 'bg-blue-500' });
    }
    if (priceDecreaseAmount > 0) {
      reasons.push({ name: 'Price Reduction', amount: priceDecreaseAmount, color: 'bg-orange-500' });
    }

    // Check for removed packages
    prevItems.forEach(item => {
      const itemName = item.productName || item.item_name;
      if (!currNames.has(itemName)) {
        reasons.push({
          name: `Remove ${itemName}`,
          amount: parseFloat(item.rate || 0),
          color: 'bg-gray-300'
        });
      }
    });

    return {
      prevTotal,
      currTotal,
      totalChange,
      reasons,
      prevQuotation: compareWith
    };
  }, [formData, compareWith]);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (id, field, value) => {
    const newItems = formData.items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setFormData(prev => ({ ...prev, items: newItems }));
    calculateTotals(newItems, formData.discount);
  };

  const calculateTotals = (items, discount) => {
    const taxPct = formData.taxPercentage !== undefined ? formData.taxPercentage : 10;
    const sumRates = items.reduce((sum, item) => sum + (parseFloat(item.rate) || 0) - (parseFloat(item.adjustment) || 0), 0);
    const taxableAmount = sumRates - (parseFloat(discount) || 0);
    const tax = taxableAmount * (taxPct / 100);
    const total = taxableAmount + tax;
    setFormData(prev => ({ ...prev, subtotal: taxableAmount, tax, total }));
  };

  const handleSubmit = async (sendToClient = false) => {
    setIsLoading(true);
    setError('');
    try {
      const isVirtualDeal = formData.deal_id && Number(formData.deal_id) > 1000000;
      const submitData = {
        ...formData,
        deal_id: isVirtualDeal ? null : formData.deal_id,
        lead_id: formData.lead_id || (isVirtualDeal ? (Number(formData.deal_id) - 1000000) : null),
        estimation_number: formData.quotationNumber,
        estimate_date: formData.quotationDate ? (formData.quotationDate.includes('T') ? formData.quotationDate.split('T')[0] : formData.quotationDate) : new Date().toISOString().split('T')[0],
        expiry_date: formData.validUntil ? (formData.validUntil.includes('T') ? formData.validUntil.split('T')[0] : formData.validUntil) : null,
        estimate_by: formData.assignedExecutiveId,
        status: sendToClient ? 'Sent' : (formData.status || 'Revised'),
        parent_id: (quotation && quotation.id && quotation.id !== 'NEW') ? quotation.id : null,
        amount: formData.total,
        tax_amount: formData.tax,
        discount_amount: formData.discount,
        payment_terms: formData.paymentTerms,
        notes: formData.notes,
      };

      // Create the new revision
      const result = await estimationsAPI.create(submitData);

      // Update the parent quotation status to 'Revised' if it exists
      if (quotation && quotation.id && quotation.id !== 'NEW') {
        try {
          await estimationsAPI.update(quotation.id, { status: 'Revised' });
        } catch (err) {
          console.warn('Failed to update parent quotation status:', err);
        }
      }

      // Update deal status and value if a deal is linked and being sent
      if (formData.deal_id && (sendToClient || submitData.status === 'Sent')) {
        try {
          await dealsAPI.update(formData.deal_id, {
            pipeline: 'Quotation',
            deal_stage: 'Quotation',
            deal_value: formData.total
          });
        } catch (err) {
          console.warn('Failed to update deal status and value:', err);
        }
      }

      // Update lead status to "Quotation" if a lead is linked and being sent
      const leadId = formData.lead_id || (isVirtualDeal ? (Number(formData.deal_id) - 1000000) : null);
      if (leadId && (sendToClient || submitData.status === 'Sent')) {
        try {
          await leadsAPI.update(leadId, { status: 'Quotation' });
        } catch (err) {
          console.warn('Failed to update lead status:', err);
        }
      }

      // Update project status to "Quotation" if a project is linked and being sent
      if (formData.project_id && (sendToClient || submitData.status === 'Sent')) {
        try {
          await projectAPI.update(formData.project_id, { status: 'Quotation' });
        } catch (err) {
          console.warn('Failed to update project status:', err);
        }
      }

      // Update related tasks
      try {
        const tasks = await taskAPI.getAllGeneral();
        if (Array.isArray(tasks)) {
          const relatedTasks = tasks.filter(t =>
            (t.linked_type === 'Quotation' && parseInt(t.linked_id) === quotation.id) ||
            (t.linked_type === 'Deal' && parseInt(t.linked_id) === parseInt(formData.deal_id)) ||
            (t.linked_type === 'Lead' && parseInt(t.linked_id) === parseInt(leadId)) ||
            (t.linked_type === 'Project' && parseInt(t.linked_id) === parseInt(formData.project_id))
          );

          for (const task of relatedTasks) {
            if (task.status !== 'Completed') {
              await taskAPI.updateGeneral(task.id, { status: 'In Progress' });
            }
          }
        }
      } catch (err) {
        console.warn('Failed to update related tasks:', err);
      }

      // Add items to the new revision
      for (const item of formData.items) {
        await estimationsAPI.createItem(result.id, {
          item_name: item.productName || item.item_name,
          description: item.description,
          quantity: item.quantity || 1,
          rate: item.rate,
          discount_percent: 0,
          tax_percent: 10
        });
      }

      showSuccessToast(`Quotation revision ${sendToClient ? 'sent' : 'saved'} successfully`);

      // Log activity if sent to client
      if (sendToClient) {
        try {
          // Send actual email
          const email = formData.client_email || formData.email;
          console.log('📧 Attempting to send revision email to:', email, 'for result.id:', result.id);
          if (email && result.id) {
            const sendEmailRes = await fetch(`${process.env.REACT_APP_API_URL || API_BASE_URL + ''}/estimations/${result.id}/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            if (sendEmailRes.ok) {
              console.log('✅ Revision email sent automatically');
            } else {
              const errData = await sendEmailRes.json();
              console.error('❌ Failed to send revision email:', errData);
            }
          } else {
            console.warn('⚠️ Cannot send email: email or result.id missing', { email, id: result.id });
          }

          await activitiesAPI.create({
            title: `Quotation Sent: ${formData.quotationNumber}`,
            description: `Quotation revision ${formData.quotationNumber} sent to client. Amount: ${formData.currency} ${formData.total}`,
            activity_type: 'Email',
            lead_id: leadId,
            deal_id: isVirtualDeal ? null : formData.deal_id,
            company_id: formData.client_id || null,
            status: 'Completed',
            priority: 'Medium'
          });
        } catch (activityErr) {
          console.warn('Failed to log quotation sent activity or send email:', activityErr);
        }
      }

      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save revision');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-black/40 backdrop-blur-sm font-sans text-gray-900">
      <div className="h-full w-full lg:w-[95%] xl:w-[90%] bg-[#F9FAFB] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white">
              <FileText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Deals</span>
                <span className="text-gray-300">›</span>
                <span className="text-gray-900 ">Create Revised Quotation</span>
              </div>
              <h2 className="text-xl font-[500] text-gray-900">Revised Quotation Form</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSubmit(false)}
              className="p-2 text-xs  text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSubmit(true)}
              className="p-2 text-xs  text-white bg-red-600 border border-red-600 rounded hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              Send Draft To Client <ArrowRight size={15} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-2">
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Main Form Section (Left) */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">

            {/* Quotation Info */}
            <div className="bg-white rounded border border-gray-200  overflow-hidden">
              <div className="p-2 bg-orange-50/50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded flex items-center justify-center">
                    <FileText size={15} />
                  </div>
                  <h3 className="font-[500] text-gray-800">Quotation Info</h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-600  cursor-pointer">
                  Current SeV: <ChevronDown size={14} />
                </div>
              </div>
              <div className="p-2 grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs  text-gray-400 ">Quotation Number</label>
                  <input
                    type="text"
                    name="quotationNumber"
                    value={formData.quotationNumber}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-gray-400 ">Quotation Version</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.quotationVersion}
                      readOnly
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs text-orange-600 font-[500] outline-none cursor-default"
                    />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs  text-gray-400 ">Deal</label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.project_name}
                      readOnly
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs outline-none cursor-default"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-[500] cursor-pointer">View Deal</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-gray-400 ">Client</label>
                  <input
                    type="text"
                    value={formData.client_name || formData.client}
                    readOnly
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs outline-none cursor-default"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-gray-400 ">Quotation Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      name="quotationDate"
                      value={formData.quotationDate}
                      onChange={handleInputChange}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-gray-400 ">Valid Until</label>
                  <div className="relative">
                    <input
                      type="date"
                      name="validUntil"
                      value={formData.validUntil}
                      onChange={handleInputChange}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-gray-400 ">Assignee</label>
                  <select
                    name="assignedExecutiveId"
                    value={formData.assignedExecutiveId}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    <option value="">Select Assignee</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-gray-400 ">Status</label>
                  <div className="relative">
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700 font-[500] outline-none appearance-none"
                    >
                      <option value="Revised">Revised</option>
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-600" size={15} />
                  </div>
                </div>
              </div>
            </div>

            {/* Service / Item Table */}
            <div className="bg-white rounded border border-gray-200  overflow-hidden">
              <div className="p-2 bg-blue-50/50 border-b border-gray-100 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded flex items-center justify-center">
                  <RotateCcw size={15} />
                </div>
                <h3 className="font-[500] text-sm text-gray-800">Service / Item Table</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="p-2 text-xs  text-gray-500 ">Service / Item</th>
                      <th className="p-2 text-xs  text-gray-500  text-right">Unit Price</th>
                      <th className="p-2 text-xs  text-gray-500  text-right">Revised Value</th>
                      <th className="p-2 text-xs  text-gray-500  text-right pr-10">Disc: Tax</th>
                      <th className="p-2 text-xs  text-gray-500  text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {formData.items.map((item, index) => (
                      <tr key={item.id} className="group hover:bg-gray-50/50">
                        <td className="p-2">
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={item.productName || item.item_name || item.product_name || item.name || ''}
                              onChange={(e) => handleItemChange(item.id, 'productName', e.target.value)}
                              className="w-full bg-transparent border-none p-0 text-sm  text-gray-900 focus:ring-0 outline-none"
                            />

                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <div className="text-xs  text-gray-400 line-through">
                            {formData.currency} {(parseFloat(item.original_rate) || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-1 text-sm  text-gray-900">
                            <span className="text-gray-400 text-xs font-normal">{formData.currency}</span>
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value))}
                              className="w-24 text-right bg-orange-50 border border-orange-200 rounded p-1 text-xs outline-none focus:ring-1 focus:ring-orange-500 transition-all text-orange-700 "
                            />
                          </div>
                        </td>
                        <td className="p-2 text-right pr-10">
                          <div className="flex items-center justify-end gap-1 text-sm font-medium text-gray-900">
                            <span className="text-gray-400 text-xs font-normal">{formData.currency}</span>
                            <input
                              type="number"
                              value={item.adjustment || 0}
                              onChange={(e) => handleItemChange(item.id, 'adjustment', parseFloat(e.target.value))}
                              className="w-16 text-right bg-gray-50 border border-gray-100 rounded p-1 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </div>
                        </td>
                        <td className="p-2 text-right text-xs font-[500] text-gray-900">
                          {formData.currency} {(parseFloat(item.rate) || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="bg-white rounded border border-gray-200  p-2 space-y-4 max-w-md ml-auto">
              <h3 className="font-[500] text-gray-800 mb-4 text-right">Pricing Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 ">Subtotal:</span>
                  <span className="font-[500] text-gray-900">{formData.currency} {formData.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 ">Tax (10%):</span>
                  <span className="font-[500] text-gray-900">{formData.currency} {formData.tax.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-sm font-[500] text-gray-900 ">Grand Total:</span>
                  <span className="text-xl font-[500] text-red-600">{formData.currency} {formData.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Section (Right) */}
          <div className="w-[500px] border-l border-gray-200 bg-white flex flex-col">
            <div className="p-2 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-[500] text-sm text-gray-800">Version History & Comparison</h3>
              <button className="p-2 text-xs font-[500] text-orange-700 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100 transition-colors">
                Save Esitquotation
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {/* Version List */}
              <div className="">
                {/* Current Revision Header (v2) */}
                <div className="p-2 bg-[#FFF9F0] border border-[#FFECD1] rounded mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-[#3B82F6] rounded flex items-center justify-center text-white ">
                        <FileText size={10} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-[500] text-[#1F2937] text-xs flex text-sm">Quotation v{formData.version}</span>
                          <span className="p-1 bg-[#FFEDD5] text-[#9A3412] text-xs font-[500] rounded ">Revised</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <CheckCircle2 size={14} className="text-[#F97316]" />
                          <span>{new Date(formData.quotationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          <span className="text-gray-300">|</span>
                          <span>Long</span>
                        </div>
                      </div>
                    </div>
                    <span className="font-[500] text-[#111827] text-sm">₹ {formData.total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Previous Versions (v1) */}
                {versions.map((v, idx) => (
                  <div
                    key={v.id}
                    onClick={() => setCompareWith(v)}
                    className={`p-2 border rounded cursor-pointer transition-all mb-2 ${compareWith?.id === v.id
                        ? 'bg-blue-50 border-blue-200 '
                        : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded flex items-center justify-center text-white ${compareWith?.id === v.id ? 'bg-blue-600' : 'bg-[#3B82F6]'}`}>
                          <FileText size={10} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-[500] text-[#1F2937] text-xs flex text-sm">Quotation v{versions.length - idx}</span>
                            <span className="p-1 bg-[#DBEAFE] text-[#1D4ED8] text-xs font-[500] rounded ">{v.status || 'Sent'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <CheckCircle2 size={14} className="text-[#F97316]" />
                            <span>{new Date(v.estimate_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                      <span className="font-[500] text-[#111827] text-sm">₹ {parseFloat(v.amount).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comparison Card */}
              <div className="bg-[#F8F9FC] rounded border border-gray-200 overflow-hidden ">
                <div className="p-2 border-b border-dashed border-gray-300 text-center bg-[#F1F5F9]">
                  <span className="text-sm font-[500] text-[#334155]">Compare Quotation v{compareWith?.version || (versions.findIndex(v => v.id === compareWith?.id) !== -1 ? versions.length - versions.findIndex(v => v.id === compareWith?.id) : '1')} → v{formData.version}</span>
                </div>

                {/* Two-Column Comparison Header */}
                <div className="flex bg-white">
                  <div className="w-1/2 p-4 bg-[#F1F5F9]/50 border-r border-gray-200">
                    <div className="text-xs font-[500] text-gray-400  mb-2">Version v{compareWith?.version || (versions.findIndex(v => v.id === compareWith?.id) !== -1 ? versions.length - versions.findIndex(v => v.id === compareWith?.id) : '1')} (₹ {comparisonData.prevTotal.toLocaleString()}) - Sent</div>
                  </div>
                  <div className="w-1/2 p-4 bg-[#FFF9F0]/50 relative">
                    <div className="text-xs font-[500] text-[#F97316]  mb-2">Version v{formData.version} (₹ {formData.total.toLocaleString()}) - Revised</div>
                    <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center z-10">
                      <ChevronDown size={14} className="text-gray-400 -rotate-90" />
                    </div>
                  </div>
                </div>

                {/* Comparison Rows */}
                <div className="bg-white">
                  {formData.items.map((item, idx) => {
                    const prevItems = compareWith?.items || [];
                    // Match by name if possible, otherwise use index
                    const itemName = item.productName || item.item_name;
                    const prevItem = prevItems.find(i => (i.productName || i.item_name) === itemName) || prevItems[idx];

                    return (
                      <div key={item.id} className="flex border-b border-gray-100 text-sm">
                        <div className="w-1/2 p-3 border-r border-gray-100 bg-white">
                          <span className="text-[#475569]  truncate block">{prevItem ? (prevItem.productName || prevItem.item_name) : 'N/A'}</span>
                        </div>
                        <div className="w-1/2 p-3 bg-white flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {prevItem && (
                              <span className="text-gray-400 line-through">₹ {parseFloat(prevItem.rate || prevItem.price || 0).toLocaleString()}</span>
                            )}
                            <ArrowRight size={14} className="text-[#10B981]" />
                            <span className="font-[500] text-[#1F2937] text-xs flex">₹ {parseFloat(item.rate || 0).toLocaleString()}</span>
                          </div>
                          {prevItem && parseFloat(item.rate || 0) !== parseFloat(prevItem.rate || prevItem.price || 0) && (
                            <span className={`text-xs font-[500] ml-2 ${parseFloat(item.rate || 0) > parseFloat(prevItem.rate || prevItem.price || 0) ? 'text-red-500' : 'text-green-500'}`}>
                              {parseFloat(item.rate || 0) > parseFloat(prevItem.rate || prevItem.price || 0) ? '+' : '-'} ₹ {Math.abs(parseFloat(item.rate || 0) - parseFloat(prevItem.rate || prevItem.price || 0)).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex font-[500] text-sm bg-white">
                    <div className="w-1/2 p-3 border-r border-gray-100 flex justify-between text-[#1F2937]">
                      <span>Total:</span>
                      <span>₹ {comparisonData.prevTotal.toLocaleString()}</span>
                    </div>
                    <div className="w-1/2 p-3 flex justify-between text-[#1F2937]">
                      <span>Total:</span>
                      <span>₹ {formData.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Revision Reasons */}
                <div className="p-4 bg-white border-t border-gray-100">
                  <h4 className="text-sm font-[500] text-[#1F2937] text-xs flex mb-4">Revision Reasons</h4>
                  <div className="space-y-4">
                    {comparisonData.reasons.length > 0 ? (
                      comparisonData.reasons.map((reason, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${reason.color}`}></div>
                            <span className="text-sm text-[#475569]">{reason.name}</span>
                          </div>
                          <span className="text-sm font-[500] text-[#1F2937] text-xs flex">₹ {reason.amount.toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-400 italic text-center py-2">No significant changes detected</div>
                    )}
                  </div>
                </div>

                {/* Terms & Notes */}
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-xs font-[500] text-gray-700 mb-1 block">Payment Terms</label>
                    <textarea
                      name="paymentTerms"
                      value={formData.paymentTerms}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all min-h-[60px] resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-[500] text-gray-700 mb-1 block">Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all min-h-[60px] resize-none"
                    />
                  </div>
                </div>

                {/* Total Change Footer */}
                <div className="p-4 bg-white border-t border-dashed border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-[500] text-[#1F2937] text-xs flex">Total Change</span>
                    <div className="flex-1 border-b border-dashed border-gray-300 mx-4"></div>
                    <div className="flex items-center gap-3 font-[500] text-sm">
                      <span className="text-[#10B981] line-through">₹ {Math.abs(comparisonData.totalChange).toLocaleString()}</span>
                      <span className="text-[#1F2937]">₹ {comparisonData.prevTotal.toLocaleString()}</span>
                      <span className="text-[#1F2937]">₹ {comparisonData.currTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white border-t border-gray-100">
                  <button
                    onClick={() => handleSubmit(false)}
                    className="w-full p-2 bg-[#D6684B] text-xs text-white  rounded hover:bg-[#C05A3E] transition-all  flex items-center justify-center gap-2"
                  >
                    Save Revised Quotation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviseQuotationModal;
