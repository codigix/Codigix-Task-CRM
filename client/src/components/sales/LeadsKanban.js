import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, MapPin, Plus, ChevronDown, MoreVertical, RotateCcw, Layout, User, Filter, MessageSquare, FileText } from 'lucide-react';
import { leadsAPI } from '../../services/api';
import ExportDropdown from '../common/ExportDropdown';

const LeadsKanban = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusDropdown, setStatusDropdown] = useState({});
  const [draggedLead, setDraggedLead] = useState(null);
  const draggedItemRef = useRef(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const lastUpdateRef = useRef(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const statusConfig = {
    'Contacted': { color: '#F59E0B', title: 'Contacted' },
    'Not Contacted': { color: '#3B82F6', title: 'Not Contacted' },
    'Qualified': { color: '#10B981', title: 'Qualified' },
    'Lost': { color: '#EF4444', title: 'Lost' }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const leadsRes = await leadsAPI.getAll();

      if (Array.isArray(leadsRes)) {
        setLeads(leadsRes);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  const handleStatusChange = async (leadId, newStatus) => {
    try {
      setIsUpdating(true);
      lastUpdateRef.current = Date.now();

      // Optimistic update
      setLeads(prev =>
        prev.map(lead =>
          lead.id === leadId
            ? { ...lead, status: newStatus, lead_status: newStatus }
            : lead
        )
      );

      await leadsAPI.update(leadId, { status: newStatus, lead_status: newStatus });
      setStatusDropdown(prev => ({ ...prev, [leadId]: false }));
    } catch (err) {
      console.error('Error updating status:', err);
      // Revert on error
      fetchData();
      alert('Failed to update lead status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
    draggedItemRef.current = lead;
    e.dataTransfer.setData('application/json', JSON.stringify(lead));
    e.dataTransfer.effectAllowed = 'move';

    // Use a small timeout to not hide the element immediately while dragging starts
    setTimeout(() => {
      const el = e.target;
      if (el) el.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e) => {
    const el = e.target;
    if (el) el.style.opacity = '1';

    // Note: Don't clear state immediately to allow handleDrop to process it
    // The state will be cleared by handleDrop or after a short delay
    setTimeout(() => {
      setDraggedLead(null);
      draggedItemRef.current = null;
      setDragOverStatus(null);
    }, 100);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStatus !== status) {
      setDragOverStatus(status);
    }
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDragOverStatus(null);

    // Get lead data from multiple possible sources for robustness
    let leadData = draggedLead || draggedItemRef.current;

    if (!leadData) {
      try {
        const json = e.dataTransfer.getData('application/json');
        if (json) leadData = JSON.parse(json);
      } catch (err) {
        console.error('Error parsing drag data:', err);
      }
    }

    if (!leadData) return;

    const currentStatus = leadData.status || leadData.lead_status;
    if (currentStatus === newStatus) return;

    await handleStatusChange(leadData.id, newStatus);

    setDraggedLead(null);
    draggedItemRef.current = null;
  };

  const groupedLeads = {
    'Contacted': leads.filter(l => (l.status || l.lead_status) === 'Contacted'),
    'Not Contacted': leads.filter(l => (l.status || l.lead_status) === 'Not Contacted' || (l.status || l.lead_status) === 'New'),
    'Qualified': leads.filter(l => (l.status || l.lead_status) === 'Qualified' || (l.status || l.lead_status) === 'Qualified'),
    'Lost': leads.filter(l => (l.status || l.lead_status) === 'Lost' || (l.status || l.lead_status) === 'Unqualified')
  };

  const columns = Object.entries(groupedLeads).map(([status, leads]) => {
    const totalValue = leads.reduce((sum, lead) => sum + (parseFloat(lead.value) || 0), 0);
    const formattedValue = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(totalValue);

    return {
      id: status,
      title: status,
      color: statusConfig[status]?.color || '#6B7280',
      count: leads.length,
      totalValue: formattedValue,
      leads: leads
    };
  });

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-600">Loading leads...</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-[28px]  text-gray-900">Leads</h1>
              <span className="bg-[#FFE5E5] text-[#F62416] px-2.5 py-0.5 rounded-full text-[12px] ">{leads.length}</span>
            </div>
            <div className="flex items-center gap-1 text-xs  mt-1">
              <button className="text-[#F97316] hover:text-[#EA580C]   bg-transparent border-none cursor-pointer p-0">Home</button>
              <span className="text-[#D1D5DB]">&gt;</span>
              <span className="text-[#6B7280]">Leads</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ExportDropdown />
            <button onClick={fetchData} className="p-2 bg-white border border-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors ">
              <RotateCcw size={16} />
            </button>
            <button className="p-2 bg-white border border-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors ">
              <Layout size={16} />
            </button>
            <button className="bg-[#F62416] text-white p-2  rounded    flex items-center gap-2 hover:opacity-90 transition text-xs ">
              <Plus size={18} />
              Add Lead
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input type="text" placeholder="Search" className="w-full max-w-xs p-2  border border-[#E5E7EB] rounded  focus:outline-none text-xs  bg-white" />
          <button className="p-2  border border-[#E5E7EB] rounded  hover:bg-gray-50 text-xs    text-gray-700 transition bg-white">Filter</button>
        </div>
      </div>

      <div className="px-6 pb-8">
        <div className="grid grid-cols-4 gap-4">
          {columns.map((column) => (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`flex flex-col h-full min-h-[500px] transition-all duration-200 rounded ${dragOverStatus === column.id ? 'bg-gray-200/50 scale-[1.01]' : ''
                }`}
            >
              <div className="bg-white border border-gray-200 rounded p-2 mb-4 ">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: column.color }}></div>
                      <h2 className="text-[14px] font-[500] text-gray-900">{column.title}</h2>
                    </div>
                    <p className="text-[12px] text-[#6B7280] ">{column.count} Leads - {column.totalValue}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className=" hover:bg-blue-50 p-1 rounded transition-colors"><Plus size={15} /></button>
                    <button className="text-gray-400 hover:bg-gray-100 p-1 border border-gray-200 rounded transition-colors"><MoreVertical size={16} /></button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 flex-1 px-1">
                {column.leads.map((lead) => {
                  return (
                    <div
                      key={lead.id}
                      className="bg-white border border-[#EAECF0] rounded-[12px] shadow-[0_2px_6px_rgba(0,0,0,0.05)] p-4 cursor-move hover:shadow-md transition-shadow"
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3
                            className="text-[16px]  text-gray-900 cursor-pointer hover:text-red-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/lead/${lead.id}`);
                            }}
                          >
                            {lead.project_name || 'No Project Name'}
                          </h3>
                          <p className="text-[14px] text-gray-500 mt-0.5">{lead.name || lead.lead_name}</p>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600"><MoreVertical size={18} /></button>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-3 text-gray-500">
                          <Layout size={16} className="text-gray-400" />
                          <span className="text-xs">{lead.business_type || lead.industry || 'Software Services'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-500">
                          <User size={16} className="text-gray-400" />
                          <span className="text-xs">{lead.owner_name || 'sales executive'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Filter size={16} className="text-gray-400" />
                          <span className="px-3 py-0.5 bg-pink-50 text-pink-600 rounded-full text-[12px] ">
                            {lead.source || lead.lead_source || 'Referral'}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-3 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Generate Date:</span>
                          <span className="text-gray-600 ">
                            {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Mar 4, 2026'}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Next Followup:</span>
                          <span className="text-red-500">-</span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-gray-50 text-gray-400">
                        <button className="hover:text-blue-500" title="Call"><Phone size={18} /></button>
                        <button className="hover:text-blue-500" title="Message"><MessageSquare size={18} /></button>
                        <button className="hover:text-blue-500" title="Documents"><FileText size={18} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeadsKanban;
