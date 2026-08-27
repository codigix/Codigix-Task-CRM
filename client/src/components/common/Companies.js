import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, MoreVertical, Search, Download, ArrowUpDown, Settings, ChevronRight, X } from 'lucide-react';
import AddNewCompanyForm from './AddNewCompanyForm';
import UpgradePlanModal from './UpgradePlanModal';
import { companiesAPI } from '../../services/api';
import mockCompaniesData from '../../data/companiesListData.json';

const Companies = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [mockCompanies, setMockCompanies] = useState([]);
  const [starred, setStarred] = useState({});
  const [toast, setToast] = useState({ message: '', type: '', show: false });
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedCompanyForUpgrade, setSelectedCompanyForUpgrade] = useState(null);
  const [exportDropOpen, setExportDropOpen] = useState(false);
  const [sortDropOpen, setSortDropOpen] = useState(false);
  const [filterDropOpen, setFilterDropOpen] = useState(false);
  const [dateDropOpen, setDateDropOpen] = useState(false);
  const [manageColsOpen, setManageColsOpen] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState({});
  const [selectedDate, setSelectedDate] = useState('1 Dec 25 - 1 Dec 25');
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    email: true,
    accountUrl: true,
    plan: true,
    createdDate: true,
    status: true,
    action: true
  });
  
  useEffect(() => {
    initializeCompanies();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const transformMockToApiFormat = (mockData) => {
    return mockData.map((item, idx) => ({
      id: item.id,
      company_name: item.name,
      email: item.email,
      phone: item.phone,
      account_url: `${item.name.toLowerCase().replace(/\s+/g, '-')}.com`,
      status: 'Active',
      created_at: new Date(2025, 0, idx + 1).toISOString(),
      plan_name: 'Premium',
      plan_type: 'Monthly'
    }));
  };
  
  const initializeCompanies = async () => {
    setLoading(true);
    try {
      const transformedMock = transformMockToApiFormat(mockCompaniesData.companies);
      setMockCompanies(transformedMock);
      setCompanies(transformedMock);
      
      let data = await companiesAPI.getAll();
      
      if (!Array.isArray(data)) {
        data = data?.data || data?.companies || [];
      }
      
      if (Array.isArray(data) && data.length > 0) {
        setCompanies(data);
        console.log('✅ Fetched companies from API:', data);
      } else {
        console.log('ℹ️ Using mock data (API returned empty)');
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch from API, using mock data:', error.message);
      const transformedMock = transformMockToApiFormat(mockCompaniesData.companies);
      setCompanies(transformedMock);
      setMockCompanies(transformedMock);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCompanies = async () => {
    try {
      let data = await companiesAPI.getAll();
      
      if (!Array.isArray(data)) {
        data = data?.data || data?.companies || [];
      }
      
      if (Array.isArray(data) && data.length > 0) {
        setCompanies(data);
        console.log('✅ Companies refreshed from API');
      } else {
        setCompanies(mockCompanies);
        console.log('ℹ️ Showing mock data');
      }
    } catch (error) {
      console.error('❌ Failed to fetch companies:', error);
      setCompanies(mockCompanies);
      showToast('Using local data (API unavailable)', 'info');
    }
  };
  
  const exportRef = useRef(null);
  const sortRef = useRef(null);
  const filterRef = useRef(null);
  const dateRef = useRef(null);

  const toggleStar = (id) => {
    setStarred(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleUpgradeClick = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setSelectedCompanyForUpgrade(company);
      setIsUpgradeModalOpen(true);
    }
  };

  const handleUpgradeComplete = () => {
    fetchCompanies();
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type, show: true });
    setTimeout(() => setToast({ message: '', type: '', show: false }), 3000);
  };

  const handleAddCompanySubmit = async (formData) => {
    try {
      const submitData = {
        company_name: formData.companyName,
        email: formData.emailAddress,
        email_opt_out: formData.emailOptOut,
        phone: formData.phoneNumber,
        phone2: formData.phone2,
        fax: formData.fax,
        website: formData.website,
        address: formData.address,
        account_url: formData.accountUrl,
        status: formData.status || 'Active',
        industry: formData.industryType,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        reviews: formData.reviews,
        owner: formData.owner,
        tags: Array.isArray(formData.tags) ? formData.tags.join(',') : formData.tags || '',
        source: formData.source,
        currency: formData.currency,
        language: formData.language,
        description: formData.description,
        planName: formData.planName,
        planType: formData.planType,
      };

      const newLocalCompany = {
        id: Math.max(...companies.map(c => c.id || 0), 0) + 1,
        company_name: submitData.company_name,
        email: submitData.email,
        phone: submitData.phone,
        account_url: submitData.account_url || `${submitData.company_name.toLowerCase().replace(/\s+/g, '-')}.com`,
        status: submitData.status,
        created_at: new Date().toISOString(),
        plan_name: submitData.planName || 'Basic',
        plan_type: submitData.planType || 'Monthly'
      };

      try {
        const response = await companiesAPI.create(submitData);
        console.log('✅ Company created in API:', response);
        if (response.id) {
          newLocalCompany.id = response.id;
        }
      } catch (apiError) {
        console.warn('⚠️ API create failed, saving to local storage:', apiError.message);
      }

      setCompanies(prev => [...prev, newLocalCompany]);
      setMockCompanies(prev => [...prev, newLocalCompany]);
      
      setIsAddCompanyOpen(false);
      showToast(`Company "${formData.companyName}" created successfully!`, 'success');
      
    } catch (error) {
      console.error('❌ Failed to create company:', error);
      showToast('Failed to create company. Please try again.', 'error');
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Active') return { bg: '#28C76F', color: '#FFF' };
    return { bg: '#EA5455', color: '#FFF' };
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA502', '#6C5CE7', '#A29BFE', '#00B894', '#FDCB6E'];
  const getAvatarColor = (id) => colors[id % colors.length];

  return (
    <div style={{ backgroundColor: '#F5F6FB', minHeight: '100vh', padding: '24px' }}>
      {toast.show && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : '#3B82F6',
            color: '#FFF',
            padding: '16px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          {toast.message}
        </div>
      )}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1F2937', fontFamily: "'Poppins', sans-serif", margin: 0 }}>
                Companies
              </h1>
              <div style={{ backgroundColor: '#FFE5E5', color: '#F62416', borderRadius: '12px', padding: '4px 12px', fontSize: '12px', fontWeight: '700', fontFamily: "'Poppins', sans-serif" }}>
                {companies.length}
              </div>
            </div>
            <div style={{ fontSize: '13px', color: '#475467', fontFamily: "'Poppins', sans-serif", display: 'flex', gap: '8px' }}>
              <span style={{ color: '#FF6A59', fontWeight: '500', cursor: 'pointer' }}>Home</span> 
              <span>/</span> 
              <span>Companies</span>
            </div>
          </div>

          {/* Top Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Export Button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setExportDropOpen(!exportDropOpen)}
                ref={exportRef}
                style={{ fontSize: '13px', color: '#475467', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 16px', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#F3F4F6'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#F9FAFB'}
              >
                <Download size={16} />
                Export <ChevronDown size={16} />
              </button>
              {exportDropOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 50, minWidth: '200px' }}>
                  <button style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                    <Download size={14} /> Export as PDF
                  </button>
                  <button style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", borderTop: '1px solid #E5E7EB', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                    <Download size={14} /> Export as Excel
                  </button>
                </div>
              )}
            </div>

            <button style={{ fontSize: '13px', color: '#475467', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px 16px', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F3F4F6'} onMouseLeave={(e) => e.target.style.backgroundColor = '#F9FAFB'}>
              🔄
            </button>

            {/* Manage Columns Button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setManageColsOpen(!manageColsOpen)}
                style={{ fontSize: '13px', color: '#475467', backgroundColor: '#EEF5FF', border: '1px solid #D1E0FF', borderRadius: '6px', padding: '10px 16px', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#E0EBFF'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#EEF5FF'}
              >
                <Settings size={16} />
                Manage Columns
              </button>
              {manageColsOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 50, minWidth: '240px', padding: '12px 0' }}>
                  {Object.keys(columnVisibility).map((col) => (
                    <button
                      key={col}
                      onClick={() => setColumnVisibility(prev => ({ ...prev, [col]: !prev[col] }))}
                      style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>≡</span>
                        {col.charAt(0).toUpperCase() + col.slice(1).replace(/([A-Z])/g, ' $1')}
                      </span>
                      <div style={{ width: '32px', height: '18px', borderRadius: '9px', backgroundColor: columnVisibility[col] ? '#FF5B5B' : '#D1D5DB', transition: 'all 0.2s', display: 'flex', alignItems: 'center', padding: '2px' }}>
                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#FFF', marginLeft: columnVisibility[col] ? '14px' : '0px', transition: 'margin-left 0.2s' }} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div style={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ position: 'relative', maxWidth: '360px', flex: '0 0 auto' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input 
              type="text" 
              placeholder="Search" 
              style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid #E5E7EB', borderRadius: '24px', fontSize: '13px', fontFamily: "'Poppins', sans-serif", color: '#1F2937', height: '44px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Filter Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setFilterDropOpen(!filterDropOpen)}
              ref={filterRef}
              style={{ fontSize: '13px', color: '#475467', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '12px 14px', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', height: '44px' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#F3F4F6'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#F9FAFB'}
            >
              <span>Filter</span> <ChevronDown size={16} />
            </button>
            {filterDropOpen && (
              <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: '8px', backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 50, minWidth: '280px', padding: '12px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #E5E7EB' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937', fontFamily: "'Poppins', sans-serif" }}>Filter</span>
                  <button onClick={() => setFilterDropOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
                    <X size={16} />
                  </button>
                </div>

                {/* Country Filter */}
                <div style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <button
                    onClick={() => setFilterExpanded(prev => ({ ...prev, country: !prev.country }))}
                    style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <span>Country</span>
                    <ChevronRight size={16} style={{ transform: filterExpanded.country ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                  </button>
                </div>

                {/* Owner Filter */}
                <div style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <button
                    onClick={() => setFilterExpanded(prev => ({ ...prev, owner: !prev.owner }))}
                    style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <span>Owner</span>
                    <ChevronRight size={16} style={{ transform: filterExpanded.owner ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                  </button>
                </div>

                {/* Tags Filter */}
                <div style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <button
                    onClick={() => setFilterExpanded(prev => ({ ...prev, tags: !prev.tags }))}
                    style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <span>Tags</span>
                    <ChevronRight size={16} style={{ transform: filterExpanded.tags ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                  </button>
                </div>

                {/* Rating Filter */}
                <div style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <button
                    onClick={() => setFilterExpanded(prev => ({ ...prev, rating: !prev.rating }))}
                    style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <span>Rating</span>
                    <ChevronRight size={16} style={{ transform: filterExpanded.rating ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                  </button>
                </div>

                {/* Status Filter - Expanded */}
                <div>
                  <button
                    onClick={() => setFilterExpanded(prev => ({ ...prev, status: !prev.status }))}
                    style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background-color 0.2s', borderBottom: filterExpanded.status ? '1px solid #E5E7EB' : 'none' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <span>Status</span>
                    <ChevronDown size={16} style={{ transform: filterExpanded.status ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                  </button>
                  {filterExpanded.status && (
                    <>
                      <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #E5E7EB' }}>
                        <input type="checkbox" style={{ cursor: 'pointer' }} />
                        <span style={{ fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif" }}>Active</span>
                      </div>
                      <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" style={{ cursor: 'pointer' }} />
                        <span style={{ fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif" }}>Inactive</span>
                      </div>
                    </>
                  )}
                </div>

                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #E5E7EB', marginTop: '12px' }}>
                  <button style={{ flex: 1, padding: '8px 12px', border: '1px solid #E5E7EB', background: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: "'Poppins', sans-serif", color: '#1F2937', fontWeight: '500', transition: 'all 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                    Reset
                  </button>
                  <button style={{ flex: 1, padding: '8px 12px', border: 'none', background: '#FF5B5B', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: "'Poppins', sans-serif", color: '#FFF', fontWeight: '500', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#FF4242'} onMouseLeave={(e) => e.target.style.backgroundColor = '#FF5B5B'}>
                    Filter
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Date Range Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setDateDropOpen(!dateDropOpen)}
              ref={dateRef}
              style={{ fontSize: '13px', color: '#475467', fontFamily: "'Poppins', sans-serif", fontWeight: '500', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '12px 16px', height: '44px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', cursor: 'pointer', gap: '8px', transition: 'all 0.2s' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#F3F4F6'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#F9FAFB'}
            >
              📅 {selectedDate}
            </button>
            {dateDropOpen && (
              <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: '8px', backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 50, minWidth: '220px' }}>
                <button onClick={() => { setSelectedDate('Today'); setDateDropOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>Today</button>
                <button onClick={() => { setSelectedDate('Yesterday'); setDateDropOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", borderTop: '1px solid #E5E7EB', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>Yesterday</button>
                <button onClick={() => { setSelectedDate('Last 7 Days'); setDateDropOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", borderTop: '1px solid #E5E7EB', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>Last 7 Days</button>
                <button onClick={() => { setSelectedDate('Last 30 Days'); setDateDropOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#FFF', fontFamily: "'Poppins', sans-serif", borderTop: '1px solid #E5E7EB', backgroundColor: '#FF5B5B', fontWeight: '500', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#FF4242'} onMouseLeave={(e) => e.target.style.backgroundColor = '#FF5B5B'}>Last 30 Days</button>
                <button onClick={() => { setSelectedDate('This Month'); setDateDropOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", borderTop: '1px solid #E5E7EB', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>This Month</button>
                <button onClick={() => { setSelectedDate('Last Month'); setDateDropOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", borderTop: '1px solid #E5E7EB', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>Last Month</button>
                <button onClick={() => { setSelectedDate('Custom Range'); setDateDropOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", borderTop: '1px solid #E5E7EB', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>Custom Range</button>
              </div>
            )}
          </div>

          {/* Sort By Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setSortDropOpen(!sortDropOpen)}
              ref={sortRef}
              style={{ fontSize: '13px', color: '#475467', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '12px 14px', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', height: '44px' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#F3F4F6'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#F9FAFB'}
            >
              <ArrowUpDown size={16} />
              Sort By <ChevronDown size={16} />
            </button>
            {sortDropOpen && (
              <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: '8px', backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 50, minWidth: '200px' }}>
                <button style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>Recently Viewed</button>
                <button style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", borderTop: '1px solid #E5E7EB', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>Recently Added</button>
                <button style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", borderTop: '1px solid #E5E7EB', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>Ascending</button>
                <button style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", borderTop: '1px solid #E5E7EB', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>Descending</button>
              </div>
            )}
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <button onClick={() => setIsAddCompanyOpen(true)} style={{ fontSize: '13px', color: '#FFF', backgroundColor: '#FF5B5B', border: 'none', borderRadius: '8px', padding: '12px 24px', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", fontWeight: '600', height: '44px', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#FF4242'} onMouseLeave={(e) => e.target.style.backgroundColor = '#FF5B5B'}>
              + Add New Page
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9CA3AF', fontFamily: "'Poppins', sans-serif" }}>
              <p style={{ fontSize: '14px' }}>⏳ Loading companies...</p>
            </div>
          ) : companies && companies.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <th style={{ padding: '16px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: '#475467', fontFamily: "'Poppins', sans-serif", width: '50px' }}>
                      <input type="checkbox" style={{ cursor: 'pointer' }} />
                    </th>
                    <th style={{ padding: '16px 8px', textAlign: 'center', fontSize: '13px', fontWeight: '500', color: '#475467', fontFamily: "'Poppins', sans-serif", width: '50px' }}></th>
                    <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: '#475467', fontFamily: "'Poppins', sans-serif", width: '260px' }}>Name</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: '#475467', fontFamily: "'Poppins', sans-serif", width: '220px' }}>Email</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: '#475467', fontFamily: "'Poppins', sans-serif", width: '200px' }}>Account URL</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: '#475467', fontFamily: "'Poppins', sans-serif", width: '240px' }}>Plan</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: '#475467', fontFamily: "'Poppins', sans-serif", width: '200px' }}>Created Dated</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '13px', fontWeight: '500', color: '#475467', fontFamily: "'Poppins', sans-serif", width: '120px' }}>Status</th>
                    <th style={{ padding: '16px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '500', color: '#475467', fontFamily: "'Poppins', sans-serif", width: '60px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => {
                    const statusColor = getStatusColor(company.status);
                    const planDisplay = company.plan_name ? `${company.plan_name} (${company.plan_type})` : 'No Plan';
                    const createdDate = company.created_at ? new Date(company.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                    return (
                      <tr key={company.id} style={{ borderBottom: '1px solid #E5E7EB', transition: 'background-color 0.2s', height: '72px' }} onMouseEnter={(e) => e.target.parentElement.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.parentElement.style.backgroundColor = 'transparent'}>
                        <td style={{ padding: '16px 16px', textAlign: 'left', verticalAlign: 'middle' }}>
                          <input type="checkbox" style={{ cursor: 'pointer' }} />
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <span 
                            onClick={() => toggleStar(company.id)} 
                            style={{ fontSize: '18px', cursor: 'pointer', display: 'inline-block', color: starred[company.id] ? '#FFC107' : '#D1D5DB', marginLeft: '3px' }}
                          >
                            {starred[company.id] ? '★' : '☆'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'left', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", fontWeight: '600', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: getAvatarColor(company.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>
                              {getInitials(company.company_name)}
                            </div>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.company_name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'left', fontSize: '13px', color: '#6B7280', fontFamily: "'Poppins', sans-serif", verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.email}</td>
                        <td style={{ padding: '16px 12px', textAlign: 'left', fontSize: '13px', color: '#6B7280', fontFamily: "'Poppins', sans-serif", verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.account_url}</td>
                        <td style={{ padding: '16px 12px', textAlign: 'left', fontSize: '13px', fontFamily: "'Poppins', sans-serif", verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#6B7280' }}>{planDisplay}</span>
                            <button onClick={() => handleUpgradeClick(company.id)} style={{ background: 'none', border: 'none', padding: '2px 8px', fontSize: '12px', color: '#2771FF', fontFamily: "'Poppins', sans-serif", fontWeight: '600', cursor: 'pointer', backgroundColor: '#EEF5FF', borderRadius: '4px', transition: 'all 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#E0EBFF'} onMouseLeave={(e) => e.target.style.backgroundColor = '#EEF5FF'}>
                              Upgrade
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'left', fontSize: '13px', color: '#6B7280', fontFamily: "'Poppins', sans-serif", verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{createdDate}</td>
                        <td style={{ padding: '16px 12px', textAlign: 'left', verticalAlign: 'middle' }}>
                          <span style={{ backgroundColor: statusColor.bg, color: statusColor.color, padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', fontFamily: "'Poppins', sans-serif", display: 'inline-block' }}>
                            {company.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 16px', textAlign: 'center', verticalAlign: 'middle', position: 'relative' }}>
                          <button onClick={() => setOpenActionMenu(openActionMenu === company.id ? null : company.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px', transition: 'color 0.2s', fontSize: '16px' }} onMouseEnter={(e) => e.target.style.color = '#1F2937'} onMouseLeave={(e) => e.target.style.color = '#6B7280'}>
                            <MoreVertical size={16} />
                          </button>
                          {openActionMenu === company.id && (
                            <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '8px', backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '180px' }}>
                              <button onClick={() => { navigate('/super-admin/subscriptions'); setOpenActionMenu(null); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                                <span>📋</span> Subscriptions
                              </button>
                              <button onClick={() => { navigate('/super-admin/domain'); setOpenActionMenu(null); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", borderTop: '1px solid #E5E7EB', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                                <span>🌐</span> Domains
                              </button>
                              <button onClick={() => { navigate('/super-admin/purchase-transaction'); setOpenActionMenu(null); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", borderTop: '1px solid #E5E7EB', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                                <span>💳</span> Transactions
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9CA3AF', fontFamily: "'Poppins', sans-serif" }}>
              <p style={{ fontSize: '14px' }}>📭 No companies found. Add one to get started!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '12px', color: '#9CA3AF', fontFamily: "'Poppins', sans-serif", paddingBottom: '24px' }}>
          <p style={{ margin: 0 }}>Copyright © 2025 <span style={{ color: '#FF6A59', fontWeight: '600' }}>Preadmin</span></p>
        </div>
      </div>

      <AddNewCompanyForm 
        isOpen={isAddCompanyOpen}
        onClose={() => setIsAddCompanyOpen(false)}
        onSubmit={handleAddCompanySubmit}
      />

      <UpgradePlanModal 
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        company={selectedCompanyForUpgrade}
        onUpgrade={handleUpgradeComplete}
      />
    </div>
  );
};

export default Companies;
