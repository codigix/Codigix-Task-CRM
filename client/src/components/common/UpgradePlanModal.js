import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const UpgradePlanModal = ({ isOpen, onClose, company, onUpgrade }) => {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('English');
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/plans`);
      const data = await response.json();
      
      const uniquePlans = [...new Set(data.map(p => p.plan_name))];
      setPlans(uniquePlans);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPlan || !selectedType) {
      alert('Please select a plan and type');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/companies/${company.id}/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planName: selectedPlan,
          planType: selectedType,
          currency,
          language,
        })
      });

      if (response.ok) {
        onUpgrade();
        handleClose();
      }
    } catch (error) {
      console.error('Failed to upgrade plan:', error);
    }
  };

  const handleClose = () => {
    setSelectedPlan('');
    setSelectedType('');
    setCurrency('USD');
    setLanguage('English');
    onClose();
  };

  if (!isOpen || !company) return null;

  const planTypes = ['Monthly', 'Yearly', 'Lifetime'];
  const currencies = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'];
  const languages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Hindi'];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.2)' }} onClick={handleClose}>
      <div 
        style={{ width: '100%', maxWidth: '420px', backgroundColor: '#FFF', borderRadius: '12px 12px 0 0', boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', fontFamily: "'Poppins', sans-serif", margin: 0 }}>Upgrade Package</h2>
          <button 
            onClick={handleClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: '24px', display: 'flex', alignItems: 'center' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Current Plan Details */}
          <div style={{ backgroundColor: '#FFF3E0', border: '1px solid #FFD9B0', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '24px', height: '24px', backgroundColor: '#FF5B5B', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '12px', fontWeight: '700' }}>
                ℹ️
              </div>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#D97706', fontFamily: "'Poppins', sans-serif" }}>Current Plan Details</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div>
                <p style={{ fontSize: '11px', color: '#6B7280', fontFamily: "'Poppins', sans-serif", margin: '0 0 4px 0' }}>Company Name</p>
                <p style={{ fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", fontWeight: '600', margin: 0 }}>{company.company_name}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#6B7280', fontFamily: "'Poppins', sans-serif", margin: '0 0 4px 0' }}>Plan Name</p>
                <p style={{ fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", fontWeight: '600', margin: 0 }}>{company.plan_name || 'No Plan'}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#6B7280', fontFamily: "'Poppins', sans-serif", margin: '0 0 4px 0' }}>Plan Type</p>
                <p style={{ fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", fontWeight: '600', margin: 0 }}>{company.plan_type || 'N/A'}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#6B7280', fontFamily: "'Poppins', sans-serif", margin: '0 0 4px 0' }}>Register Date</p>
                <p style={{ fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", fontWeight: '600', margin: 0 }}>{company.registered_date ? new Date(company.registered_date).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#6B7280', fontFamily: "'Poppins', sans-serif", margin: '0 0 4px 0' }}>Expiring On</p>
                <p style={{ fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", fontWeight: '600', margin: 0 }}>{company.expiring_on ? new Date(company.expiring_on).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#6B7280', fontFamily: "'Poppins', sans-serif", margin: '0 0 4px 0' }}>Price</p>
                <p style={{ fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", fontWeight: '600', margin: 0 }}>{company.price ? `$${company.price.toFixed(2)}` : 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Change Plan */}
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937', fontFamily: "'Poppins', sans-serif", marginBottom: '16px' }}>Change Plan</h3>
            
            {/* Plan Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475467', fontFamily: "'Poppins', sans-serif", marginBottom: '8px' }}>
                Plan Name <span style={{ color: '#FF5B5B' }}>*</span>
              </label>
              <select 
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', fontFamily: "'Poppins', sans-serif", backgroundColor: '#FFF', cursor: 'pointer' }}
              >
                <option value="">Select a plan</option>
                {plans.map(plan => (
                  <option key={plan} value={plan}>{plan}</option>
                ))}
              </select>
            </div>

            {/* Plan Type */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475467', fontFamily: "'Poppins', sans-serif", marginBottom: '8px' }}>
                Plan Type <span style={{ color: '#FF5B5B' }}>*</span>
              </label>
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', fontFamily: "'Poppins', sans-serif", backgroundColor: '#FFF', cursor: 'pointer' }}
              >
                <option value="">Select type</option>
                {planTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475467', fontFamily: "'Poppins', sans-serif", marginBottom: '8px' }}>
                Currency <span style={{ color: '#FF5B5B' }}>*</span>
              </label>
              <select 
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', fontFamily: "'Poppins', sans-serif", backgroundColor: '#FFF', cursor: 'pointer' }}
              >
                {currencies.map(curr => (
                  <option key={curr} value={curr}>{curr}</option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475467', fontFamily: "'Poppins', sans-serif", marginBottom: '8px' }}>
                Language <span style={{ color: '#FF5B5B' }}>*</span>
              </label>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', fontFamily: "'Poppins', sans-serif", backgroundColor: '#FFF', cursor: 'pointer' }}
              >
                {languages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '12px', justifyContent: 'flex-end', backgroundColor: '#F9FAFB' }}>
          <button 
            onClick={handleClose}
            style={{ padding: '10px 20px', border: '1px solid #E5E7EB', backgroundColor: '#FFF', borderRadius: '6px', fontSize: '13px', fontWeight: '500', color: '#1F2937', fontFamily: "'Poppins', sans-serif", cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#FFF'}
          >
            Cancel
          </button>
          <button 
            onClick={handleUpgrade}
            style={{ padding: '10px 20px', border: 'none', backgroundColor: '#FF5B5B', borderRadius: '6px', fontSize: '13px', fontWeight: '500', color: '#FFF', fontFamily: "'Poppins', sans-serif", cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#FF4242'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#FF5B5B'}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradePlanModal;
