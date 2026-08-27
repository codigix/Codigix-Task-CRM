import React, { useState, useRef, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { dealsAPI, companiesAPI, leadsAPI, contactsAPI, projectAPI, usersAPI, estimationsAPI } from '../../services/api';
import ReviseQuotationModal from '../sales/ReviseQuotationModal';

const AddNewEstimationModal = ({ isOpen, onClose, onSubmit, initialData, onGeneratePDF }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [clients, setClients] = useState([]);
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [deals, setDeals] = useState([]);
  const [isReviseModalOpen, setIsReviseModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    quotationNumber: `Q-${new Date().getFullYear()}-001`,
    deal_id: '',
    project_id: '',
    project_name: '',
    dealName: '',
    client_id: '',
    lead_id: '',
    quotationDate: new Date().toISOString().split('T')[0],
    validUntil: '',
    status: 'Draft',
    quotationType: 'Draft',
    client: '',
    contactPerson: '',
    businessType: '',
    assignedExecutiveId: '',
    items: [
      { id: Date.now(), productName: '', description: '', duration: '', quantity: 1, rate: 0 }
    ],
    paymentTerms: '50% advance payment. Balance due upon project completion.',
    notes: '',
    currency: 'INR',
    discount: 0,
    taxPercentage: 10,
    tags: [],
    isRevision: false,
    revisionNumber: '',
    revisionReason: '',
    revisionDate: new Date().toISOString().split('T')[0],
    versionHistory: [],
    client_email: '',
    client_phone: '',
    business_description: '',
    referral_name: ''
  });

  const isFetchingDataRef = useRef(false);
  const isFetchingVersionsRef = useRef(false);
  const isFetchingItemsRef = useRef(false);

  // useEffect moved down below to avoid hoisting reference errors

  const fetchVersions = async (dealId, leadId, currentQuotationNumber = '') => {
    if (isFetchingVersionsRef.current) return;
    isFetchingVersionsRef.current = true;
    if (!dealId && !leadId) {
      setFormData(prev => ({ ...prev, versionHistory: [], revisionNumber: '' }));
      isFetchingVersionsRef.current = false;
      return;
    }

    try {
      const filters = {};
      if (dealId) filters.deal_id = dealId;
      if (leadId) filters.lead_id = leadId;

      const estimations = await estimationsAPI.getAll(filters);
      if (Array.isArray(estimations)) {
        const baseNumber = currentQuotationNumber ? currentQuotationNumber.split('-v')[0] : '';
        const filteredEstimations = baseNumber 
          ? estimations.filter(est => {
              const num = est.estimation_number || est.quotation_number || '';
              return num.startsWith(baseNumber);
            })
          : estimations;

        const sortedEstimations = [...filteredEstimations].sort((a, b) =>
          new Date(b.estimate_date || b.created_at || b.date) - new Date(a.estimate_date || a.created_at || a.date)
        );

        const history = sortedEstimations.map((est, index) => {
          const estDate = est.estimate_date || est.created_at || est.date;
          let dateStr = 'N/A';
          if (estDate) {
            const date = new Date(estDate);
            if (date.toDateString() === new Date().toDateString()) {
              dateStr = 'Today';
            } else {
              dateStr = date.toLocaleDateString();
            }
          }

          return {
            version: `v${sortedEstimations.length - index}`,
            status: est.status,
            date: dateStr,
            amount: parseFloat(est.amount || est.total) || 0,
            type: est.quotation_type || (est.status === 'Revised' ? 'Revised Quotation' : (est.status + ' Quotation')),
            current: index === 0,
            id: est.id,
            number: est.estimation_number || est.quotation_number
          };
        });

        const latestVersion = history[0];
        setFormData(prev => ({
          ...prev,
          versionHistory: history,
          revisionNumber: latestVersion ? `${latestVersion.version} ${latestVersion.status} (${latestVersion.number})` : '',
          revisionReason: latestVersion?.notes || prev.revisionReason
        }));
      }
    } catch (err) {
      console.error('Error fetching version history:', err);
    } finally {
      isFetchingVersionsRef.current = false;
    }
  };

  const fetchClientsAndProjects = async () => {
    if (isFetchingDataRef.current) return;
    isFetchingDataRef.current = true;
    setLoadingData(true);
    try {
      const [clientsData, projectsData, usersData, leadsData, dealsData] = await Promise.all([
        companiesAPI.getAll(),
        projectAPI.getAll(),
        usersAPI.getAll(),
        leadsAPI.getAll({ status: 'Qualified' }),
        dealsAPI.getAll()
      ]);

      setClients(Array.isArray(clientsData) ? clientsData : (clientsData?.data || []));
      setProjects(Array.isArray(projectsData) ? projectsData : (projectsData?.data || []));
      setUsers(Array.isArray(usersData) ? usersData : (usersData?.data || []));
      setLeads(Array.isArray(leadsData) ? leadsData : (leadsData?.data || []));
      setDeals(Array.isArray(dealsData) ? dealsData : (dealsData?.data || dealsData?.deals || []));
    } catch (err) {
      console.error('Error fetching data:', err);
      setClients([]);
      setProjects([]);
      setUsers([]);
      setLeads([]);
      setDeals([]);
    } finally {
      isFetchingDataRef.current = false;
      setLoadingData(false);
    }
  };

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

  const handleLeadChange = async (leadId, isExistingQuotation = false, currentQuotationNum = '') => {
    if (!leadId) return;

    setLoadingData(true);
    try {
      const leadData = await leadsAPI.getById(leadId);
      if (leadData) {
        let clientName = leadData.lead_name || leadData.name || leadData.company_name || '';
        let clientEmail = leadData.email || '';
        let clientPhone = leadData.phone || '';
        let businessDescription = leadData.description || '';
        let referralName = leadData.referral_name || '';
        let leadBusinessType = leadData.business_type || '';
        let contactPerson = leadData.lead_name || leadData.name || '';

        // Initialize services from lead data
        const processServices = (data) => {
          let services = [];
          if (data.it_services && data.it_services !== 'None') {
            services.push({
              id: Date.now() + 1 + Math.random(),
              productName: data.it_services === 'Other' ? data.it_services_other : data.it_services,
              description: '',
              duration: '',
              quantity: 1,
              rate: 0
            });
          }

          const marketingServices = parseJson(data.marketing_services);
          if (Array.isArray(marketingServices) && marketingServices.length > 0) {
            marketingServices.forEach((service, index) => {
              services.push({
                id: Date.now() + 100 + index + Math.random(),
                productName: service,
                description: '',
                duration: '',
                quantity: 1,
                rate: 0
              });
            });
          }
          return services;
        };

        const leadServices = processServices(leadData);

        setFormData(prev => ({
          ...prev,
          client: clientName,
          lead_id: leadId,
          contactPerson: contactPerson || prev.contactPerson,
          businessType: leadBusinessType || prev.businessType || '',
          client_email: clientEmail || prev.client_email,
          client_phone: clientPhone || prev.client_phone,
          business_description: businessDescription || prev.business_description,
          referral_name: referralName || prev.referral_name,
          assignedExecutiveId: leadData.owner_id ? leadData.owner_id.toString() : prev.assignedExecutiveId,
          items: (!isExistingQuotation && leadServices.length > 0) ? leadServices : prev.items
        }));

        // Fetch version history
        const qNum = currentQuotationNum || initialData?.quotation_number || initialData?.quotationNumber || formData.quotationNumber;
        fetchVersions(null, leadId, qNum);
      }
    } catch (err) {
      console.error('Error fetching lead details:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleDealChangeById = async (dealId, isExistingQuotation = false, currentQuotationNum = '') => {
    if (!dealId) {
      setFormData(prev => ({
        ...prev,
        deal_id: '',
        dealName: '',
        client: '',
        businessType: '',
        items: [{ id: Date.now(), productName: '', description: '', quantity: 1, rate: 0 }],
        versionHistory: [],
        revisionNumber: ''
      }));
      return;
    }

    if (Number(dealId) > 1000000) {
      // It's a virtual deal (actually a lead)
      setFormData(prev => ({ ...prev, deal_id: dealId }));
      await handleLeadChange((Number(dealId) - 1000000).toString());
      return;
    }

    setLoadingData(true);
    try {
      const dealData = await dealsAPI.getById(dealId);
      console.log('🔍 Fetched dealData:', dealData);
      if (dealData) {
        // Use client name from joined deal data if available
        let clientName = dealData.company_name || dealData.client_name || '';
        let clientEmail = dealData.contact_email || dealData.email || '';
        let clientPhone = dealData.contact_phone || dealData.phone || '';
        let businessDescription = dealData.description || dealData.notes || '';
        let referralName = dealData.referral_name || '';
        let leadBusinessType = dealData.business_type || '';
        let contactPerson = '';

        if (dealData.contact_first_name) {
          contactPerson = `${dealData.contact_first_name} ${dealData.contact_last_name || ''}`.trim();
        }

        // If not available in dealData, try fetching separately (fallback)
        if (dealData.company_id) {
          try {
            const companyData = await companiesAPI.getById(dealData.company_id);
            if (companyData) {
              clientName = clientName || companyData.company_name || companyData.name || '';
              clientEmail = clientEmail || companyData.email || '';
              clientPhone = clientPhone || companyData.phone || '';
            }
          } catch (companyErr) {
            console.error('Error fetching company details:', companyErr);
          }
        }

        // Fetch lead data if lead_id exists to get more details
        if (dealData.lead_id) {
          try {
            const leadData = await leadsAPI.getById(dealData.lead_id);
            if (leadData) {
              clientName = clientName || leadData.lead_name || leadData.name || leadData.company_name || '';
              clientEmail = clientEmail || leadData.email || '';
              clientPhone = clientPhone || leadData.phone || '';
              businessDescription = businessDescription || leadData.description || '';
              referralName = referralName || leadData.referral_name || '';
              leadBusinessType = leadBusinessType || leadData.business_type || '';
              if (!contactPerson) contactPerson = leadData.lead_name || leadData.name || '';
            }
          } catch (leadErr) {
            console.error('Error fetching lead details for details:', leadErr);
          }
        }

        // Initialize services from deal data
        let leadServices = [];

        // Helper to process services
        const processServices = (data) => {
          let services = [];
          if (data.it_services && data.it_services !== 'None') {
            services.push({
              id: Date.now() + 1 + Math.random(),
              productName: data.it_services === 'Other' ? data.it_services_other : data.it_services,
              description: '',
              duration: data.period || data.duration || '',
              quantity: 1,
              rate: 0
            });
          }

          const marketingServices = parseJson(data.marketing_services);
          if (Array.isArray(marketingServices) && marketingServices.length > 0) {
            marketingServices.forEach((service, index) => {
              services.push({
                id: Date.now() + 100 + index + Math.random(),
                productName: service,
                description: '',
                duration: index === 0 && services.length === 0 ? (data.period || data.duration || '') : '',
                quantity: 1,
                rate: 0
              });
            });
          }
          return services;
        };

        // Try services from deal first
        leadServices = processServices(dealData);

        // If no services on deal, check if they were on the lead
        if (leadServices.length === 0 && dealData.lead_id) {
          try {
            const leadData = await leadsAPI.getById(dealData.lead_id);
            if (leadData) {
              leadServices = processServices(leadData);
            }
          } catch (err) {
            console.error('Error fetching services from lead:', err);
          }
        }

        // Get assigned executive
        let assignedExecutiveId = dealData.assignee_id || dealData.assigned_executive_id || '';

        setFormData(prev => ({
          ...prev,
          deal_id: dealId,
          dealName: dealData.deal_name || dealData.name || '',
          project_name: dealData.project_name || dealData.deal_name || dealData.name || '',
          client: clientName || dealData.company_name || dealData.company || '',
          client_id: dealData.company_id || '',
          lead_id: dealData.lead_id || (Number(dealData.id) > 1000000 ? (Number(dealData.id) - 1000000) : ''),
          contactPerson: contactPerson || prev.contactPerson,
          businessType: leadBusinessType || prev.businessType || '',
          assignedExecutiveId: assignedExecutiveId || prev.assignedExecutiveId,
          client_email: clientEmail || prev.client_email || '',
          client_phone: clientPhone || prev.client_phone || '',
          business_description: businessDescription || prev.business_description || '',
          referral_name: referralName || prev.referral_name || '',
          items: leadServices.length > 0 ? leadServices : (
            Array.isArray(dealData.items) && dealData.items.length > 0
              ? dealData.items.map(item => ({
                id: item.id || Date.now() + Math.random(),
                productName: item.product_name || item.name || '',
                description: '',
                duration: item.duration || item.period || '',
                quantity: 1,
                rate: 0
              }))
              : [{
                id: Date.now(),
                productName: dealData.deal_name || dealData.name || '',
                description: '',
                duration: dealData.period || dealData.duration || '',
                quantity: 1,
                rate: 0
              }]
          )
        }));

        // Fetch version history
        const qNum = currentQuotationNum || initialData?.quotation_number || initialData?.quotationNumber || formData.quotationNumber;
        fetchVersions(dealId, dealData.lead_id, qNum);
      }
    } catch (err) {
      console.error('Error fetching deal details:', err);
      setError('Failed to fetch deal details');
    } finally {
      isFetchingDataRef.current = false;
      setLoadingData(false);
    }
  };

  const handleDealChange = (e) => {
    handleDealChangeById(e.target.value);
  };

  useEffect(() => {
    if (isOpen) {
      fetchClientsAndProjects();
      if (initialData) {
        const isQuotation = initialData.estimation_number || initialData.quotation_number;
        const deal_id = initialData.deal_id ? initialData.deal_id.toString() : (initialData.lead_id ? (Number(initialData.lead_id) + 1000000).toString() : (!isQuotation && Number(initialData.id) <= 1000000 ? initialData.id.toString() : ''));
        const lead_id = initialData.lead_id ? initialData.lead_id.toString() : (!isQuotation && Number(initialData.id) > 1000000 ? (Number(initialData.id) - 1000000).toString() : '');

        setFormData(prev => ({
          ...prev,
          quotationNumber: initialData.quotation_number || initialData.quotationNumber || `Q-${new Date().getFullYear()}-001`,
          client: initialData.company_name || initialData.client_name || initialData.client || '',
          client_id: initialData.client_id || initialData.company_id || '',
          lead_id: lead_id,
          deal_id: deal_id,
          project_id: initialData.project_id ? initialData.project_id.toString() : '',
          dealName: initialData.deal_name || initialData.dealName || '',
          project_name: initialData.project_name || initialData.deal_name || initialData.dealName || '',
          contactPerson: initialData.contact_first_name ? `${initialData.contact_first_name} ${initialData.contact_last_name || ''}`.trim() : (initialData.contact_person || initialData.contactPerson || ''),
          assignedExecutiveId: initialData.assignee_id || initialData.assigned_executive_id || initialData.user_id || initialData.estimate_by || '',
          quotationDate: initialData.quotation_date ? new Date(initialData.quotation_date).toISOString().split('T')[0] : (initialData.estimate_date ? new Date(initialData.estimate_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
          validUntil: initialData.valid_until ? new Date(initialData.valid_until).toISOString().split('T')[0] : (initialData.expiry_date ? new Date(initialData.expiry_date).toISOString().split('T')[0] : ''),
          status: initialData.status || 'Draft',
          quotationType: initialData.quotation_type || initialData.quotationType || 'Draft',
          businessType: initialData.business_type || initialData.businessType || '',
          items: Array.isArray(initialData.items) && initialData.items.length > 0
            ? initialData.items.map(item => ({
              ...item,
              productName: item.productName || item.item_name || item.product_name || item.name || '',
              rate: parseFloat(item.rate || item.price) || 0,
              quantity: parseFloat(item.quantity) || 1
            }))
            : (() => {
              const services = [];
              if (initialData.it_services && initialData.it_services !== 'None') {
                services.push({
                  id: Date.now() + 1,
                  productName: initialData.it_services === 'Other' ? initialData.it_services_other : initialData.it_services,
                  description: initialData.description || '',
                  quantity: 1,
                  rate: parseFloat(initialData.value || initialData.deal_value || initialData.amount) || 0
                });
              }
              const marketingServices = parseJson(initialData.marketing_services);
              if (Array.isArray(marketingServices) && marketingServices.length > 0) {
                marketingServices.forEach((service, index) => {
                  services.push({
                    id: Date.now() + 100 + index,
                    productName: service,
                    description: index === 0 && services.length === 0 ? (initialData.description || '') : '',
                    quantity: 1,
                    rate: (index === 0 && services.length === 0) ? (parseFloat(initialData.value || initialData.deal_value || initialData.amount) || 0) : 0
                  });
                });
              }
              return services.length > 0 ? services : (initialData.amount || initialData.deal_value ? [{ id: Date.now(), productName: initialData.project_name || initialData.deal_name || 'Service', description: initialData.description || '', quantity: 1, rate: parseFloat(initialData.amount || initialData.deal_value) }] : [{ id: Date.now(), productName: '', description: '', quantity: 1, rate: 0 }]);
            })(),
          paymentTerms: initialData.payment_terms || initialData.paymentTerms || '50% advance payment. Balance due upon project completion.',
          notes: initialData.notes || '',
          currency: initialData.currency || 'INR',
          discount: Number(initialData.discount || initialData.discount_amount) || 0,
          taxPercentage: initialData.tax_percentage !== undefined ? Number(initialData.tax_percentage) : 10,
          client_email: initialData.client_email || initialData.email || '',
          client_phone: initialData.client_phone || initialData.phone || '',
          business_description: initialData.business_description || initialData.description || '',
          referral_name: initialData.referral_name || '',
        }));

        // Fetch version history
        const qNum = initialData.quotation_number || initialData.quotationNumber || `Q-${new Date().getFullYear()}-001`;
        fetchVersions(deal_id, lead_id, qNum);

        // Always fetch additional details from lead/deal (to populate fields not saved in DB like contactPerson)
        const isVirtual = Number(deal_id) > 1000000;
        const isExisting = !!initialData.id;
        
        if (isVirtual) {
          handleLeadChange((Number(deal_id) - 1000000).toString(), isExisting, qNum);
        } else if (deal_id) {
          handleDealChangeById(deal_id, isExisting, qNum);
        } else if (lead_id) {
          handleLeadChange(lead_id, isExisting, qNum);
        }

        // Fetch items if they are not in initialData and it's a quotation
        if (isQuotation && initialData.id && (!initialData.items || initialData.items.length === 0)) {
          const fetchItems = async () => {
            if (isFetchingItemsRef.current) return;
            isFetchingItemsRef.current = true;
            try {
              const itemsRes = await estimationsAPI.getItems(initialData.id);
              if (Array.isArray(itemsRes) && itemsRes.length > 0) {
                setFormData(prev => ({
                  ...prev,
                  items: itemsRes.map(item => ({
                    id: item.id || Date.now() + Math.random(),
                    productName: item.item_name || item.productName || item.product_name || item.name || '',
                    description: item.description || '',
                    duration: item.duration || '',
                    quantity: parseFloat(item.quantity) || 1,
                    rate: parseFloat(item.rate || item.price) || 0
                  }))
                }));
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
    }
  }, [isOpen, initialData?.id]);

  const calculatePricing = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const discountAmount = Number(formData.discount) || 0;
    const amountAfterDiscount = subtotal - discountAmount;
    const taxRate = Number(formData.taxPercentage) || 0;
    const tax = amountAfterDiscount * (taxRate / 100);
    const total = amountAfterDiscount + tax;
    return { subtotal, discountAmount, tax, total };
  };

  const handleItemChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now(), productName: '', description: '', duration: '', quantity: 1, rate: 0 }]
    }));
  };

  const removeItem = (id) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== id)
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'project_id' && value) {
      const selectedProject = projects.find(p => p.id.toString() === value.toString());
      if (selectedProject) {
        setFormData(prev => ({
          ...prev,
          project_id: value,
          project_name: selectedProject.name || selectedProject.title || ''
        }));
        return;
      }
    }

    if (name === 'client') {
      // Find if selected value matches a client or lead name from our lists
      const selectedClient = clients.find(c => c.company_name === value || c.name === value);
      const selectedLead = leads.find(l => l.lead_name === value || l.name === value);

      if (selectedClient) {
        setFormData(prev => ({
          ...prev,
          client: value,
          client_id: selectedClient.id,
          lead_id: ''
        }));
      } else if (selectedLead) {
        handleLeadChange(selectedLead.id);
      } else {
        setFormData(prev => ({
          ...prev,
          client: value,
          client_id: '',
          lead_id: ''
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e, manualStatus = null, shouldSendEmail = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    // Determine status - use manualStatus if provided, otherwise formData.status
    const currentStatus = manualStatus || formData.status;
    const sendEmail = shouldSendEmail || formData.shouldSendEmail;

    console.log('📝 Submitting form with data:', { ...formData, status: currentStatus, shouldSendEmail: sendEmail });

    // Validation
    if (!formData.quotationNumber) {
      setError('Quotation number is required');
      return;
    }

    if (!formData.quotationDate) {
      setError('Quotation date is required');
      return;
    }

    if (!formData.client_id && !formData.lead_id) {
      console.warn('⚠️ Missing client_id/lead_id', { client_id: formData.client_id, lead_id: formData.lead_id });
      setError('Please select an existing client or lead from the list');
      return;
    }

    if (!formData.assignedExecutiveId) {
      setError('Please select who is estimating (Assigned Executive)');
      return;
    }

    if (!formData.items || formData.items.length === 0) {
      setError('At least one item is required');
      return;
    }

    // Check items for validity
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.productName) {
        setError(`Item #${i + 1} must have a service/product name`);
        return;
      }
      if (item.rate < 0) {
        setError(`Item #${i + 1} must have a valid rate`);
        return;
      }
      if (item.quantity <= 0) {
        setError(`Item #${i + 1} must have a quantity greater than 0`);
        return;
      }
    }

    const { subtotal, tax, total, discountAmount } = calculatePricing();
    if (total < 0) {
      console.warn('⚠️ Total is less than 0:', total);
      setError('Total amount cannot be negative');
      return;
    }

    setIsLoading(true);
    try {
      if (onSubmit) {
        // Ensure all required fields for backend are present
        const isVirtualDeal = formData.deal_id && Number(formData.deal_id) > 1000000;
        const submitData = {
          ...formData,
          status: currentStatus,
          shouldSendEmail: sendEmail,
          // Keep original deal_id for status updates in onSubmit, 
          // but provide null/lead_id for estimation creation if needed
          deal_id_original: formData.deal_id,
          deal_id: isVirtualDeal ? null : formData.deal_id,
          lead_id: formData.lead_id || (isVirtualDeal ? (Number(formData.deal_id) - 1000000) : null),
          tags: formData.tags || [],
          amount: total,
          subtotal: subtotal,
          tax_amount: tax,
          tax_percentage: Number(formData.taxPercentage) || 0,
          discount_amount: discountAmount,
          estimate_date: formData.quotationDate ? (formData.quotationDate.includes('T') ? formData.quotationDate.split('T')[0] : formData.quotationDate) : new Date().toISOString().split('T')[0],
          expiry_date: formData.validUntil ? (formData.validUntil.includes('T') ? formData.validUntil.split('T')[0] : formData.validUntil) : null,
          estimate_by: formData.assignedExecutiveId,
        };

        await onSubmit(submitData);
      }
      handleCancel();
    } catch (err) {
      setError(err.message || 'Failed to create estimation');
      console.error('❌ Form submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      quotationNumber: `Q-${new Date().getFullYear()}-001`,
      deal_id: '',
      project_id: '',
      dealName: '',
      quotationDate: new Date().toISOString().split('T')[0],
      validUntil: '',
      status: 'Draft',
      quotationType: 'Draft',
      client: '',
      contactPerson: '',
      businessType: '',
      assignedExecutiveId: '',
      items: [
        { id: Date.now(), productName: '', description: '', duration: '', quantity: 1, rate: 0 }
      ],
      paymentTerms: '50% advance payment. Balance due upon project completion.',
      notes: '',
      currency: 'INR',
      discount: 0,
      tags: [],
      isRevision: false,
      revisionNumber: '',
      revisionReason: '',
      revisionDate: new Date().toISOString().split('T')[0],
      versionHistory: []
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  const { subtotal, discountAmount, tax, total } = calculatePricing();

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm font-sans text-gray-900">
      <div
        className="h-full w-full md:w-[95%] lg:w-[90%] xl:w-[85%] bg-[#F9FAFB] shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-2 bg-white border-b border-gray-200">
          <div>
            <h2 className="text-xl  text-gray-900">{initialData ? 'Edit Quotation' : 'Create Quotation'}</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <span className="hover:text-red-600 cursor-pointer">Deals</span>
              <span className="text-gray-300">›</span>
              <span className="text-gray-900 ">Create Quotation</span>
            </div>
          </div>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
          >
            <X size={20} className="text-gray-400 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 scroll-smooth">
          {error && (
            <div className="max-w-[1600px] mx-auto mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded text-xs animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}
          <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-3">

            {/* Left Column - Main Form */}
            <div className="col-span-12 lg:col-span-9 space-y-3">

              {/* Quotation Info Card */}
              <div className="bg-white rounded border border-gray-200  overflow-hidden">
                <div className="p-2 bg-orange-50/50 border-b border-gray-200 flex items-center gap-2">
                  <div className="bg-orange-100 p-1.5 rounded border border-orange-200">
                    <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center text-xs text-white font-[500]">Q</div>
                  </div>
                  <h3 className="text-sm  text-gray-800">Quotation Info</h3>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-xs  text-gray-400  mb-1">Quotation Number</label>
                    <input
                      type="text"
                      name="quotationNumber"
                      value={formData.quotationNumber}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs  text-gray-400 ">Deal</label>
                      <button type="button" className="text-xs  text-blue-600 hover:text-blue-700">View Deal</button>
                    </div>
                    <select
                      name="deal_id"
                      value={formData.deal_id?.toString()}
                      onChange={handleDealChange}
                      className="w-full p-2 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-orange-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="">Choose Deal</option>
                      {deals.map(d => (
                        <option key={d.id} value={d.id.toString()}>
                          {d.project_name || d.deal_name || d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs  text-gray-400  mb-1">Client</label>
                    <input
                      type="text"
                      name="client"
                      value={formData.client}
                      onChange={handleInputChange}
                      list="clients-list"
                      className="w-full p-2 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                      placeholder="Search existing client..."
                    />
                    <datalist id="clients-list">
                      {clients.map(c => (
                        <option key={`client-${c.id}`} value={c.company_name || c.name} />
                      ))}
                      {leads.map(l => (
                        <option key={`lead-${l.id}`} value={l.lead_name || l.name} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs  text-gray-400  mb-1">Quotation Date</label>
                    <input
                      type="date"
                      name="quotationDate"
                      value={formData.quotationDate}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs  text-gray-400  mb-1">Valid Until</label>
                    <input
                      type="date"
                      name="validUntil"
                      value={formData.validUntil}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                      placeholder="dd-mm-yyyy"
                    />
                  </div>
                  <div>
                    <label className="block text-xs  text-gray-400  mb-1">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-orange-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Declined">Declined</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs  text-gray-400  mb-1">Type</label>
                    <select
                      name="quotationType"
                      value={formData.quotationType}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-orange-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Final">Final</option>
                      <option value="Revised">Revised</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Client & Deal Details Card */}
              <div className="bg-white rounded border border-gray-200  overflow-hidden mt-2">
                <div className="p-2 bg-blue-50/50 border-b border-gray-200 flex items-center gap-2">
                  <div className="bg-blue-100 p-1.5 rounded border border-blue-200">
                    <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-xs text-white font-[500]">C</div>
                  </div>
                  <h3 className="text-sm  text-gray-800">Client & Deal Details</h3>
                </div>
                <div className="p-4 ">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                    <div>
                      <label className="block text-xs  text-gray-400  mb-1">Contact Person</label>
                      <input
                        type="text"
                        name="contactPerson"
                        value={formData.contactPerson}
                        onChange={handleInputChange}
                        placeholder="e.g. John Doe"
                        className="w-full p-2 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-gray-400  mb-1">Business Type</label>
                      <input
                        type="text"
                        name="businessType"
                        value={formData.businessType}
                        onChange={handleInputChange}
                        placeholder="e.g. Marketing"
                        className="w-full p-2 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-gray-400  mb-1">Assigned Sales Executive</label>
                      <div className="flex items-center gap-2 p-2 border border-gray-200 rounded bg-white focus-within:ring-1 focus-within:ring-blue-500">
                        <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-xs  text-blue-600">
                          {formData.assignedExecutiveId ? users.find(u => u.id === parseInt(formData.assignedExecutiveId))?.first_name?.[0] || 'U' : 'AS'}
                        </div>
                        <select
                          name="assignedExecutiveId"
                          value={formData.assignedExecutiveId}
                          onChange={handleInputChange}
                          className="flex-1 text-xs text-gray-700 outline-none border-none p-0 bg-transparent cursor-pointer"
                        >
                          <option value="">Select Executive</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.first_name} {u.last_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* New fields for related data */}
                    <div>
                      <label className="block text-xs  text-gray-400  mb-1">Client Email</label>
                      <input
                        type="email"
                        name="client_email"
                        value={formData.client_email}
                        onChange={handleInputChange}
                        placeholder="e.g. client@example.com"
                        className="w-full p-2 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-gray-400  mb-1">Client Phone</label>
                      <input
                        type="text"
                        name="client_phone"
                        value={formData.client_phone}
                        onChange={handleInputChange}
                        placeholder="e.g. +1234567890"
                        className="w-full p-2 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-gray-400  mb-1">Referral</label>
                      <input
                        type="text"
                        name="referral_name"
                        value={formData.referral_name}
                        onChange={handleInputChange}
                        placeholder="e.g. LinkedIn"
                        className="w-full p-2 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Business Description */}
                  <div className="mb-4">
                    <label className="block text-xs  text-gray-400  mb-1">Project/Business Description</label>
                    <textarea
                      name="business_description"
                      value={formData.business_description}
                      onChange={handleInputChange}
                      placeholder="Briefly describe the project or business needs..."
                      className="w-full p-2 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all min-h-[60px] resize-none"
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="p-2 text-xs  text-gray-400  w-[25%]">Service</th>
                          <th className="p-2 text-xs  text-gray-400  w-[20%]">Description</th>
                          <th className="p-2 text-xs  text-gray-400  w-[15%]">Duration</th>
                          <th className="p-2 text-xs  text-gray-400  w-[15%] text-right pr-2">Rate</th>
                          <th className="p-2 text-xs  text-gray-400  w-[15%] text-right pr-2">Total</th>
                          <th className="p-2 w-[5%]"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {formData.items.map((item) => (
                          <tr key={item.id} className="group transition-colors hover:bg-gray-50/50">
                            <td className="p-2 ">
                              <input
                                type="text"
                                placeholder="e.g. Website Development"
                                value={item.productName || item.item_name || item.product_name || item.name || ''}
                                onChange={(e) => handleItemChange(item.id, 'productName', e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs transition-all"
                              />
                            </td>
                            <td className="p-2 ">
                              <input
                                type="text"
                                placeholder="Short description..."
                                value={item.description}
                                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs transition-all"
                              />
                            </td>
                            <td className="p-2 ">
                              <input
                                type="text"
                                placeholder="e.g. 1 Month"
                                value={item.duration}
                                onChange={(e) => handleItemChange(item.id, 'duration', e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs transition-all"
                              />
                            </td>
                            <td className="p-2">
                              <div className="flex items-center gap-1.5 p-2 border border-gray-200 rounded focus-within:ring-1 focus-within:ring-blue-500 transition-all justify-end bg-white">
                                <span className="text-gray-400 text-xs">₹</span>
                                <input
                                  type="number"
                                  value={item.rate}
                                  onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                  className="w-24 bg-transparent outline-none text-sm text-right "
                                />
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="flex items-center gap-1.5 p-2 border border-gray-100 rounded bg-gray-50/50 justify-end">
                                <span className="text-gray-400 text-xs">₹</span>
                                <div className="text-sm  text-gray-700 w-24 text-right">
                                  {(item.quantity * item.rate).toLocaleString()}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 pl-2 text-right">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <button
                      type="button"
                      onClick={addItem}
                      className="p-2 border border-dashed border-gray-200 rounded text-xs  text-gray-600 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center gap-2"
                    >
                      <span className="text-sm font-[500]">+</span> Add Item
                    </button>
                    <div className="flex items-baseline gap-3 pr-10">
                      <span className="text-xs  text-gray-400">Subtotal:</span>
                      <span className="text-xl  text-gray-900">₹ {subtotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Terms & Notes in Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Payment Terms Card */}
                <div className="bg-white rounded border border-gray-200  overflow-hidden">
                  <div className="p-2 bg-gray-50/50 border-b border-gray-200 flex items-center gap-2">
                    <div className="bg-green-100 p-1.5 rounded border border-green-200">
                      <div className="w-4 h-4 bg-green-600 rounded flex items-center justify-center text-xs text-white ">P</div>
                    </div>
                    <h3 className="text-sm  text-gray-800">Payment Terms</h3>
                  </div>
                  <div className="p-4">
                    <textarea
                      name="paymentTerms"
                      value={formData.paymentTerms}
                      onChange={handleInputChange}
                      placeholder="Enter payment terms..."
                      className="w-full p-3 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all min-h-[80px] resize-none"
                    />
                  </div>
                </div>

                {/* Notes Card */}
                <div className="bg-white rounded border border-gray-200  overflow-hidden">
                  <div className="p-2 bg-gray-50/50 border-b border-gray-200 flex items-center gap-2">
                    <div className="bg-yellow-100 p-1.5 rounded border border-yellow-200">
                      <div className="w-4 h-4 bg-yellow-600 rounded flex items-center justify-center text-xs text-white ">N</div>
                    </div>
                    <h3 className="text-sm  text-gray-800">Notes</h3>
                  </div>
                  <div className="p-4">
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Additional notes..."
                      className="w-full p-3 border border-gray-200 rounded text-xs bg-white focus:ring-1 focus:ring-yellow-500 outline-none transition-all min-h-[80px] resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Actions */}

            </div>

            {/* Right Column - Sidebar */}
            {/* Right Column - Sidebar */}
            <div className="col-span-12 lg:col-span-3 space-y-3">

              {/* Pricing Summary Card */}
              <div className="bg-white rounded border border-gray-200 overflow-hidden">
                <div className="p-3 bg-gray-50/50 border-b border-gray-200 text-xs  text-gray-800 ">Pricing Summary</div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="text-gray-900 ">₹ {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">Discount</span>
                      <div className="w-3.5 h-3.5 rounded-full border border-gray-200 flex items-center justify-center text-xs text-gray-300 cursor-help">i</div>
                    </div>
                    <input
                      type="number"
                      name="discount"
                      value={formData.discount}
                      onChange={handleInputChange}
                      className="border border-gray-200 p-1.5 text-right w-20 text-gray-900 focus:ring-1 focus:ring-blue-500 rounded outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 flex items-center gap-1">
                      Tax
                      <input
                        type="number"
                        name="taxPercentage"
                        value={formData.taxPercentage}
                        onChange={handleInputChange}
                        className="border border-gray-200 p-1 w-12 text-center text-gray-900 focus:ring-1 focus:ring-blue-500 rounded outline-none ml-1"
                      />
                      %
                    </span>
                    <span className="text-gray-900 ">₹ {tax.toLocaleString()}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-sm  text-gray-900">Total</span>
                    <span className="text-xl font-[500] text-gray-900">₹ {total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Version History Card */}
              <div className="bg-white rounded border border-gray-200 overflow-hidden">
                <div className="p-3 bg-gray-50/50 border-b border-gray-200 text-xs  text-gray-800 ">Version History</div>
                <div className="p-4 space-y-4">
                  {formData.versionHistory.map((v, i) => (
                    <div key={i} className={`flex items-start gap-3 ${i > 0 ? 'opacity-50' : ''}`}>
                      <div className="w-8 h-8 rounded bg-gray-50 border border-gray-100 flex items-center justify-center text-xs font-[500] text-gray-400">{v.version.toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className="text-xs  text-gray-900 truncate">{v.type || v.status}</span>
                          <span className="text-xs  text-gray-900">₹ {Number(v.amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{v.date}</span>
                          {v.current && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revision Details Card */}
              <div className="bg-white rounded border border-gray-200 overflow-hidden">
                <div className="p-3 bg-gray-50/50 border-b border-gray-200 text-xs  text-gray-800 ">Revision Details</div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs  text-gray-600">Create Revision</span>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, isRevision: !prev.isRevision }))}
                      className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${formData.isRevision ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                      <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-all duration-200 ${formData.isRevision ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>
                  {formData.isRevision && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
                      <div>
                        <label className="text-xs  text-gray-400  mb-1 block">Revision Number</label>
                        <div className="flex justify-between items-center text-xs text-gray-700 border-b border-gray-50 pb-1 cursor-pointer">
                          <span>{formData.revisionNumber}</span>
                          <span className="text-gray-300">›</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs  text-gray-400  mb-1 block">Revision Reason</label>
                        <div className="flex justify-between items-center text-xs text-gray-700 border-b border-gray-50 pb-1 cursor-pointer">
                          <span className="truncate">{formData.revisionReason}</span>
                          <span className="text-gray-300">›</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs  text-gray-400  mb-1 block">Revision Date</label>
                        <div className="flex justify-between items-center text-xs text-gray-700 border-b border-gray-50 pb-1 cursor-pointer">
                          <span>{formData.revisionDate && new Date(formData.revisionDate).toDateString() === new Date().toDateString() ? 'Today' : (formData.revisionDate || 'N/A')}</span>
                          <X size={12} className="text-gray-300 hover:text-red-500" onClick={() => setFormData(prev => ({ ...prev, revisionDate: '' }))} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer Actions - Sticky */}
        <div className="p-2 bg-white border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSubmit}
            className="p-2 bg-white border border-gray-200 rounded text-xs  text-gray-600 hover:bg-gray-50 transition-all"
          >
            Save Draft
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              className="p-2 bg-green-600 text-white rounded text-xs  hover:bg-green-700 transition-all "
            >
              Save Quotation
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'Sent', true)}
              className="p-2 bg-blue-500 text-white rounded text-xs  hover:bg-blue-600 transition-all "
            >
              Send to Client
            </button>

            {initialData && initialData.id && initialData.id !== 'NEW' && (
              <button
                type="button"
                onClick={() => setIsReviseModalOpen(true)}
                className="p-2 bg-orange-500 text-white rounded text-xs  hover:bg-orange-600 transition-all "
              >
                Create Revision
              </button>
            )}
            <button
              type="button"
              className="p-2 bg-red-600 text-white rounded text-xs  hover:bg-red-700 shadow-md transition-all disabled:opacity-50"
              onClick={() => onGeneratePDF && onGeneratePDF(formData)}
              disabled={isLoading}
            >
              Generate PDF
            </button>
          </div>
        </div>
      </div>

      <ReviseQuotationModal
        isOpen={isReviseModalOpen}
        onClose={() => setIsReviseModalOpen(false)}
        quotation={{ ...initialData, ...formData }}
        onUpdate={() => {
          setIsReviseModalOpen(false);
          onClose();
          // Just notify parent to refresh data, don't try to submit again
          if (onSubmit) {
            // We call onSubmit with null to signify a refresh is needed 
            // without providing new formData to create
            onSubmit(null);
          }
        }}
      />
    </div>
  );
};

export default AddNewEstimationModal;
