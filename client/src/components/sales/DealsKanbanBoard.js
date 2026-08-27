import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Download, Plus, GripVertical, MoreVertical } from 'lucide-react';
import { dealsAPI, contactsAPI, companiesAPI, projectAPI } from '../../services/api';
import AddNewDealModal from './AddNewDealModal';

const DealsKanbanBoard = ({ onDealClick, onDealUpdate }) => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [draggedDeal, setDraggedDeal] = useState(null);
  const draggedItemRef = useRef(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const PIPELINE_STAGES = ['Converted Lead', 'Quotation', 'Won', 'Lost'];

  const STAGE_COLORS = {
    'Converted Lead': { bg: 'bg-blue-50', border: 'border-blue-200', header: 'bg-blue-100', text: 'text-blue-700' },
    'Quotation': { bg: 'bg-indigo-50', border: 'border-indigo-200', header: 'bg-indigo-100', text: 'text-indigo-700' },
    'Won': { bg: 'bg-green-50', border: 'border-green-200', header: 'bg-green-100', text: 'text-green-700' },
    'Lost': { bg: 'bg-red-50', border: 'border-red-200', header: 'bg-red-100', text: 'text-red-700' }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dealsRes, contactsRes, companiesRes] = await Promise.all([
        dealsAPI.getAll(),
        contactsAPI.getAll(),
        companiesAPI.getAll()
      ]);

      if (Array.isArray(dealsRes)) {
        const formattedDeals = dealsRes.map(deal => ({
          id: deal.id,
          name: deal.deal_name || 'Untitled Deal',
          value: parseFloat(deal.deal_value) || 0,
          stage: deal.pipeline || deal.stage || 'Converted Lead',
          probability: deal.probability || 0,
          expectedCloseDate: deal.expected_close_date,
          contact: deal.contact_id,
          company: deal.company_id,
          service: deal.service_name || 'No Service',
          status: deal.status || 'Open',
          description: deal.description || '',
          priority: deal.priority || 'Medium',
          ...deal
        })).sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at || 0);
          const dateB = new Date(b.updated_at || b.created_at || 0);
          return dateB - dateA;
        });
        setDeals(formattedDeals);
      }

      setContacts(contactsRes || []);
      setCompanies(companiesRes || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeal = async (formData) => {
    try {
      const response = await dealsAPI.create(formData);
      if (response.id) {
        const newDeal = {
          id: response.id,
          name: formData.deal_name,
          value: parseFloat(formData.deal_value),
          stage: formData.pipeline || 'Converted Lead',
          probability: 0,
          priority: formData.priority,
          ...formData
        };
        setDeals(prev => [newDeal, ...prev]);
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Error creating deal:', err);
    }
  };

  const handleDragStart = (e, deal) => {
    setDraggedDeal(deal);
    draggedItemRef.current = deal;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('application/json', JSON.stringify(deal));
        e.dataTransfer.setData('text/plain', String(deal.id));
      } catch (err) {
        console.error('Error setting drag data:', err);
      }
    }
  };

  const handleDragEnd = (e) => {
    setDraggedDeal(null);
    draggedItemRef.current = null;
    setDragOverStatus(null);
  };

  const handleDragOver = (e, stage) => {
    if (e) {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
    }
    if (dragOverStatus !== stage) {
      setDragOverStatus(stage);
    }
  };

  const handleDrop = async (e, newStage) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setDragOverStatus(null);
    let dealToUpdate = draggedItemRef.current || draggedDeal;

    if (!dealToUpdate && e && e.dataTransfer) {
      try {
        const id = e.dataTransfer.getData('text/plain');
        if (id) {
          dealToUpdate = deals.find(d => String(d.id) === id);
        }
      } catch (err) {
        console.error('Error retrieving drop data:', err);
      }
    }

    if (!dealToUpdate) return;
    if ((dealToUpdate.pipeline || dealToUpdate.stage) === newStage) return;

    try {
      await dealsAPI.update(dealToUpdate.id, {
        ...dealToUpdate,
        pipeline: newStage,
        stage: newStage
      });

      const now = new Date().toISOString();
      setDeals(prev =>
        prev.map(deal =>
          deal.id === dealToUpdate.id
            ? { ...deal, stage: newStage, pipeline: newStage, updated_at: now }
            : deal
        ).sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at || 0);
          const dateB = new Date(b.updated_at || b.created_at || 0);
          return dateB - dateA;
        })
      );

      if (onDealUpdate) {
        onDealUpdate({ ...dealToUpdate, stage: newStage });
      }
    } catch (err) {
      console.error('Error updating deal stage:', err);
    } finally {
      setDraggedDeal(null);
      draggedItemRef.current = null;
    }
  };

  const handleConvertToProject = async (e, deal) => {
    e.stopPropagation();
    if (!window.confirm(`Convert deal "${deal.name}" to a project?`)) return;

    try {
      const response = await projectAPI.convertDealToProject(deal.id, {
        name: deal.name,
        budget: deal.value,
        workflow_type: 'Standard'
      });

      if (response && response.projectId) {
        alert('Deal converted to project successfully!');
        fetchData(); // Refresh to show updated status
      } else {
        alert('Failed to convert deal to project');
      }
    } catch (err) {
      console.error('Error converting to project:', err);
      alert(`Error converting deal to project: ${err.message || err}`);
    }
  };

  const getStageDeals = (stage) => {
    return deals.filter(deal => {
      let dealStage = deal.pipeline || deal.stage || 'Converted Lead';
      if (dealStage === 'Revised Quotation') dealStage = 'Quotation';
      if (dealStage === 'Finalized Deal') dealStage = 'Won';
      return dealStage === stage;
    });
  };

  const getCompanyName = (companyId) => {
    const company = companies.find(c => c.id === parseInt(companyId));
    return company?.name || 'Unknown';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'High': 'bg-red-100 text-red-700',
      'Medium': 'bg-yellow-100 text-yellow-700',
      'Low': 'bg-green-100 text-green-700'
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  const formatCurrency = (value) => `$${(value / 1000).toFixed(0)}K`;

  const filteredDeals = deals.filter(deal =>
    deal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCompanyName(deal.company_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading pipeline...</div>;
  }

  return (
    <div className="w-full bg-gray-50 min-h-screen flex flex-col">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-[28px]  text-gray-900">Deal Pipeline</h1>
              <span className="bg-red-100 text-red  px-2.5 py-0.5 rounded-full text-[12px] ">{deals.length}</span>
            </div>
            <div className="flex items-center gap-1 text-xs  mt-1">
              <button className="text-orange-500 hover:text-orange-600   bg-transparent border-none cursor-pointer p-0">Home</button>
              <span className="text-gray-300">/</span>
              <span className="text-gray-600">Pipeline</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2  border border-gray-300 rounded  hover:bg-gray-50 text-xs    text-gray-700 transition bg-white flex items-center gap-2">
              <Download size={16} /> Export
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-red-600 text-white p-2  rounded    flex items-center gap-2 hover:bg-red-700 transition text-xs ">
              <Plus size={16} /> Add Deal
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1F2020]" />
            <input
              type="text"
              placeholder="Search deals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded  focus:outline-none focus:border-gray-400 text-xs  bg-white"
            />
          </div>
          <button className="p-2  border border-gray-300 rounded  hover:bg-gray-50 text-xs    text-gray-700 transition bg-white flex items-center gap-2">
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-x-auto">
        <div className="flex gap-6 h-full">
          {PIPELINE_STAGES.map((stage) => {
            const stageDeals = getStageDeals(stage);
            const colors = STAGE_COLORS[stage];

            return (
              <div
                key={stage}
                className={`flex-shrink-0 w-80 ${colors.bg} border ${colors.border} rounded  flex flex-col transition-all duration-200 ${dragOverStatus === stage ? 'ring-2 ring-blue-400 bg-blue-50/50 scale-[1.01]' : ''}`}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDrop={(e) => handleDrop(e, stage)}
              >
                <div className={`${colors.header} px-4 py-3 rounded-t-lg flex items-center justify-between`}>
                  <div>
                    <h3 className={` text-xs  ${colors.text}`}>{stage}</h3>
                    <p className="text-xs text-gray-600 mt-1">{stageDeals.length} deals</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-3">
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, deal.stage || deal.pipeline)}
                      onClick={() => {
                        navigate(`/deals/deal/${deal.id}`);
                      }}
                      className={`bg-white rounded border border-gray-200 p-3 cursor-move hover:shadow-md transition-all duration-200 group relative ${draggedDeal?.id === deal.id ? 'opacity-40 scale-95 ring-2 ring-blue-100' : ''}`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <GripVertical size={14} className="text-[#1F2020] flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs text-black hover:text-red-600  truncate mb-1  transition-colors">{deal.name}</h4>
                          <p className="text-xs text-gray-500 truncate">{getCompanyName(deal.company_id)}</p>
                          <p className="text-xs text-blue-600  truncate mt-0.5">{deal.service}</p>
                          <p className={`text-[9px] font-[500] mt-1 px-1.5 py-0.5 rounded-full inline-block ${deal.status === 'Qualified' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {deal.status}
                          </p>
                        </div>
                        <button className="text-[#1F2020] hover:text-gray-600 flex-shrink-0">
                          <MoreVertical size={14} />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs   text-gray-900">{formatCurrency(deal.value)}</span>
                          <span className={`text-xs p-1  rounded-full ${getPriorityColor(deal.priority)}`}>
                            {deal.priority}
                          </span>
                        </div>

                        {stage === 'Won' && deal.status !== 'Project Created' && (
                          <button
                            onClick={(e) => handleConvertToProject(e, deal)}
                            className="w-full mt-2 bg-green-600 text-white py-1 px-2 rounded text-xs  hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                          >
                            <Plus size={12} /> Convert to Project
                          </button>
                        )}
                        {deal.status === 'Project Created' && (
                          <div className="mt-2 text-center text-xs  text-green-600 bg-green-50 py-1 rounded border border-green-100">
                            ✓ Project Created
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Probability:</span>
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{ width: `${deal.probability}%` }}
                              ></div>
                            </div>
                            <span className="text-gray-600  ">{deal.probability}%</span>
                          </div>
                        </div>

                        {deal.expectedCloseDate && (
                          <p className="text-xs text-gray-600">
                            📅 {new Date(deal.expectedCloseDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {stageDeals.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-[#1F2020]">
                      <p className="text-xs ">No deals in this stage</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AddNewDealModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateDeal}
        contacts={contacts}
        companies={companies}
      />
    </div>
  );
};

export default DealsKanbanBoard;
