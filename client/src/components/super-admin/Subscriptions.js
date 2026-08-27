import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, MoreVertical, Search, Download, Settings, X } from 'lucide-react';
import subscriptionsData from '../../data/subscriptionsData.json';

const Subscriptions = () => {
  const navigate = useNavigate();
  const [starred, setStarred] = useState({});
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [exportDropOpen, setExportDropOpen] = useState(false);
  const [sortDropOpen, setSortDropOpen] = useState(false);
  const [filterDropOpen, setFilterDropOpen] = useState(false);
  const [dateDropOpen, setDateDropOpen] = useState(false);
  const [manageColsOpen, setManageColsOpen] = useState(false);
  const [selectedDate] = useState('1 Dec 25 - 1 Dec 25');
  const [columnVisibility, setColumnVisibility] = useState({
    subscriber: true,
    plan: true,
    billingCycle: true,
    paymentMethod: true,
    amount: true,
    createdDate: true,
    expiringOn: true,
    status: true,
    action: true
  });

  const toggleStar = (id) => {
    setStarred(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getStatusColor = (status) => {
    if (status === 'Paid') return { bg: '#28C76F', color: '#FFF' };
    return { bg: '#F62416', color: '#FFF' };
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA502', '#6C5CE7', '#A29BFE', '#00B894', '#FDCB6E'];
  const getAvatarColor = (id) => colors[id % colors.length];

  return (
    <div style={{ backgroundColor: '#F5F6FB', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1F2937', fontFamily: "'Poppins', sans-serif", margin: 0 }}>
                Subscription
              </h1>
              <div style={{ backgroundColor: '#FFE5E5', color: '#F62416', borderRadius: '12px', padding: '4px 12px', fontSize: '12px', fontWeight: '700', fontFamily: "'Poppins', sans-serif" }}>
                {subscriptionsData.count}
              </div>
            </div>
            <div style={{ fontSize: '13px', color: '#475467', fontFamily: "'Poppins', sans-serif", display: 'flex', gap: '8px' }}>
              <span style={{ color: '#FF6A59', fontWeight: '500', cursor: 'pointer' }}>Home</span> 
              <span>/</span> 
              <span>Subscription</span>
            </div>
          </div>

          {/* Top Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Export Button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setExportDropOpen(!exportDropOpen)}
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
              style={{ fontSize: '13px', color: '#475467', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '12px 14px', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', height: '44px' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#F3F4F6'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#F9FAFB'}
            >
              <span>Filter</span> <ChevronDown size={16} />
            </button>
            {filterDropOpen && (
              <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: '8px', backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 50, minWidth: '200px' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937' }}>Filters</span>
                  <button onClick={() => setFilterDropOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
                    <X size={16} />
                  </button>
                </div>
                <button style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                  By Status
                </button>
                <button style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", borderTop: '1px solid #E5E7EB', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                  By Plan Type
                </button>
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setDateDropOpen(!dateDropOpen)}
              style={{ fontSize: '13px', color: '#475467', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '12px 14px', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', height: '44px' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#F3F4F6'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#F9FAFB'}
            >
              📅 {selectedDate}
            </button>
            {dateDropOpen && (
              <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: '8px', backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 50, minWidth: '200px', padding: '8px' }}>
                <input type="date" style={{ width: '100%', padding: '8px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12px', fontFamily: "'Poppins', sans-serif" }} />
              </div>
            )}
          </div>

          {/* Sort By Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setSortDropOpen(!sortDropOpen)}
              style={{ fontSize: '13px', color: '#475467', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '12px 14px', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', height: '44px' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#F3F4F6'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#F9FAFB'}
            >
              <span>Sort By</span> <ChevronDown size={16} />
            </button>
            {sortDropOpen && (
              <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: '8px', backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 50, minWidth: '180px' }}>
                <button style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                  Newest First
                </button>
                <button style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", borderTop: '1px solid #E5E7EB', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                  Oldest First
                </button>
                <button style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", borderTop: '1px solid #E5E7EB', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                  Amount: High to Low
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', fontFamily: "'Poppins', sans-serif" }}>
                    <input type="checkbox" style={{ cursor: 'pointer' }} />
                  </th>
                  <th style={{ padding: '16px 8px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', fontFamily: "'Poppins', sans-serif", width: '40px' }}></th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', fontFamily: "'Poppins', sans-serif" }}>Subscriber</th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', fontFamily: "'Poppins', sans-serif" }}>Plan</th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', fontFamily: "'Poppins', sans-serif" }}>Billing Cycle</th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', fontFamily: "'Poppins', sans-serif" }}>Payment Method</th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', fontFamily: "'Poppins', sans-serif" }}>Amount</th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', fontFamily: "'Poppins', sans-serif" }}>Created Date</th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', fontFamily: "'Poppins', sans-serif" }}>Expiring On</th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', fontFamily: "'Poppins', sans-serif" }}>Status</th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', fontFamily: "'Poppins', sans-serif" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {subscriptionsData.subscriptions.map((sub) => {
                  const statusColor = getStatusColor(sub.status);
                  return (
                    <tr key={sub.id} style={{ borderBottom: '1px solid #E5E7EB', transition: 'background-color 0.2s' }}>
                      <td style={{ padding: '16px 12px', textAlign: 'left' }}>
                        <input type="checkbox" style={{ cursor: 'pointer' }} />
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                        <span 
                          onClick={() => toggleStar(sub.id)} 
                          style={{ fontSize: '16px', cursor: 'pointer', display: 'inline-block', color: starred[sub.id] ? '#FFC107' : '#D1D5DB' }}
                        >
                          {starred[sub.id] ? '★' : '☆'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'left', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: getAvatarColor(sub.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>
                          {getInitials(sub.subscriber)}
                        </div>
                        <span>{sub.subscriber}</span>
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'left', fontSize: '13px', color: '#6B7280', fontFamily: "'Poppins', sans-serif" }}>{sub.plan}</td>
                      <td style={{ padding: '16px 12px', textAlign: 'left', fontSize: '13px', color: '#6B7280', fontFamily: "'Poppins', sans-serif" }}>{sub.billingCycle}</td>
                      <td style={{ padding: '16px 12px', textAlign: 'left', fontSize: '13px', color: '#6B7280', fontFamily: "'Poppins', sans-serif" }}>{sub.paymentMethod}</td>
                      <td style={{ padding: '16px 12px', textAlign: 'left', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", fontWeight: '600' }}>{sub.amount}</td>
                      <td style={{ padding: '16px 12px', textAlign: 'left', fontSize: '13px', color: '#6B7280', fontFamily: "'Poppins', sans-serif" }}>{sub.createdDate}</td>
                      <td style={{ padding: '16px 12px', textAlign: 'left', fontSize: '13px', color: '#6B7280', fontFamily: "'Poppins', sans-serif" }}>{sub.expiringOn}</td>
                      <td style={{ padding: '16px 12px', textAlign: 'left' }}>
                        <span style={{ backgroundColor: statusColor.bg, color: statusColor.color, padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', fontFamily: "'Poppins', sans-serif", display: 'inline-block' }}>
                          {sub.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center', position: 'relative' }}>
                        <button onClick={() => setOpenActionMenu(openActionMenu === sub.id ? null : sub.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px', transition: 'color 0.2s' }}>
                          <MoreVertical size={18} />
                        </button>
                        {openActionMenu === sub.id && (
                          <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '8px', backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '180px' }}>
                            <button onClick={() => { navigate('/super-admin/companies'); setOpenActionMenu(null); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                              <span>🏢</span> View Company
                            </button>
                            <button onClick={() => { navigate('/super-admin/packages'); setOpenActionMenu(null); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", borderTop: '1px solid #E5E7EB', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                              <span>📦</span> View Plan
                            </button>
                            <button onClick={() => { navigate('/super-admin/purchase-transaction'); setOpenActionMenu(null); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1F2937', fontFamily: "'Poppins', sans-serif", borderTop: '1px solid #E5E7EB', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                              <span>💳</span> View Invoice
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
        </div>

        {/* Footer */}
        <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '12px', color: '#9CA3AF', fontFamily: "'Poppins', sans-serif", paddingBottom: '24px' }}>
          <p style={{ margin: 0 }}>Copyright © 2025 <span style={{ color: '#FF6A59', fontWeight: '600' }}>Preadmin</span></p>
        </div>
      </div>
    </div>
  );
};

export default Subscriptions;
