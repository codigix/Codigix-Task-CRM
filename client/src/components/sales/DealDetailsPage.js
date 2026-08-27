import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Trash2, FileText, User, Building2, Zap,
  Phone, MessageSquare, Calendar, CheckCircle, XCircle, Clock,
  Plus, History, Star, MoreVertical, Lock, Shield, Mail, FileUp,
  ChevronDown, Search, Download, RotateCcw, Maximize, Printer,
  Layout, Target, Layers, Briefcase, MapPin, List, Check,
  FileSpreadsheet, DownloadCloud, Trash, Settings, X, Paperclip,
  Image as ImageIcon, Share2, Filter, Info, ThumbsUp, ChevronLeft, ChevronRight, ExternalLink, Users, Video, CreditCard, DollarSign
} from 'lucide-react';
import { dealsAPI, companiesAPI, activitiesAPI, estimationsAPI, notesAPI, filesAPI, followupsAPI } from '../../services/api';
import DealConversionModal from './DealConversionModal';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const DealDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [editData, setEditData] = useState({});
  const [activities, setActivities] = useState([]);
  const [notes, setNotes] = useState([]);
  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('Activities');

  // New states for modals and dropdowns
  const [isSortByOpen, setIsSortByOpen] = useState(false);
  const [sortBy, setSortBy] = useState('Newest');
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [isNoteMenuOpen, setIsNoteMenuOpen] = useState(null);
  const [isAddCallLogModalOpen, setIsAddCallLogModalOpen] = useState(false);
  const [isCallStatusMenuOpen, setIsCallStatusMenuOpen] = useState(null);
  const [isAddFileModalOpen, setIsAddFileModalOpen] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(null);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);

  const pipelineStages = ['Converted Lead', 'Quotation', 'Revised Quotation', 'Negotiation', 'Finalized Deal'];

  useEffect(() => {
    fetchDealDetails();
    fetchCompanies();
    fetchActivities();
    fetchNotes();
    fetchFiles();
  }, [id]);

  const fetchDealDetails = async () => {
    try {
      setLoading(true);
      const response = await dealsAPI.getById(id);
      setDeal(response);
      setEditData(response);
    } catch (err) {
      setError(err.message || 'Failed to fetch deal');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await companiesAPI.getAll();
      setCompanies(response);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    }
  };

  const fetchActivities = async () => {
    try {
      const data = await activitiesAPI.getUnifiedFeed({ deal_id: id });
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    }
  };

  const fetchNotes = async () => {
    try {
      const data = await notesAPI.getAll({ deal_id: id });
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  };

  const fetchFiles = async () => {
    try {
      const data = await filesAPI.getAll({ deal_id: id });
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch files:', err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await dealsAPI.update(id, { ...deal, deal_stage: newStatus });
      setDeal(prev => ({ ...prev, deal_stage: newStatus }));
      showSuccessToast(`Stage updated to ${newStatus}`);
    } catch (err) {
      showErrorToast('Failed to update stage: ' + err.message);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'D';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getGroupedActivities = () => {
    const groups = {};
    activities.forEach(item => {
      const date = new Date(item.created_at || item.scheduled_date).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (error || !deal) return <div className="flex items-center justify-center min-h-screen text-red-500">{error || 'Deal not found'}</div>;

  return (
    <div className="bg-[#F8F9FA] min-h-screen p-4 font-sans text-[#1F2020]">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span className="text-gray-900 font-[500]">Deals</span>
            <span className="bg-red-50 text-red px-1.5 py-0.5 rounded text-xs">125</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Home</span>
            <ChevronDown size={10} className="-rotate-90" />
            <span className="text-gray-600">Deals</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 p-2 border border-gray-200 rounded bg-white text-xs hover:bg-gray-50">
            <Download size={14} /> Export <ChevronDown size={14} />
          </button>
          <button onClick={() => window.location.reload()} className="p-1.5 border border-gray-200 rounded bg-white hover:bg-gray-50">
            <RotateCcw size={14} />
          </button>
          <button className="p-1.5 border border-gray-200 rounded bg-white hover:bg-gray-50">
            <Maximize size={14} />
          </button>
        </div>
      </div>

      <button
        onClick={() => navigate('/deals-dashboard')}
        className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft size={14} /> Back to Deals
      </button>

      {/* Profile Header Card */}
      <div className="bg-white rounded border border-gray-200 p-6 mb-3 flex items-center justify-between">
        <div className="flex gap-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xl font-[500] border border-amber-200">
            {getInitials(deal.deal_name)}
          </div>
          <div>
            <h1 className="text-xl font-[500] text-gray-900 flex items-center gap-2">
              {deal.deal_name} <Star size={18} className="fill-yellow-400 text-yellow-400" />
            </h1>
            <div className="flex flex-col gap-1 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1"><Building2 size={14} /> {deal.company_name || 'Google Inc'}</span>
              <span className="flex items-center gap-1"><MapPin size={14} /> {deal.location || '22, Ave Street, Newyork, USA'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 p-2 bg-red-50 text-red-600 rounded text-xs  border border-red-100">
            <Lock size={14} /> Private
          </span>
          <div className="relative">
            <button
              onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
              className="flex items-center gap-1 p-2 bg-green-600 text-white rounded text-xs font-[500] hover:bg-green-700 transition-colors"
            >
              <ThumbsUp size={14} /> {deal.status || 'Won'} <ChevronDown size={14} className={`transition-transform ${isStatusMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isStatusMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-gray-100 rounded shadow-xl z-50 py-1">
                {['Open', 'Won', 'Lost'].map((s) => (
                  <button
                    key={s}
                    className="w-full text-left p-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors "
                    onClick={() => {
                      handleStatusChange(s);
                      setIsStatusMenuOpen(false);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="p-2 bg-red-600 text-white rounded hover:bg-red-700">
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {/* Left Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <div className="bg-white rounded border border-gray-200 overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <h3 className="text-sm font-[500] text-gray-900">Deals Information</h3>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: 'Date Created', value: formatDateTime(deal.created_at).split(',')[0] },
                { label: 'Probability - Win', value: `${deal.probability || 80}%` },
                { label: 'Deal Value', value: `${deal.currency || '$'}${deal.deal_value ? deal.deal_value.toLocaleString() : '0'}` },
                { label: 'Due Date', value: formatDateTime(deal.due_date || deal.created_at).split(',')[0] },
                { label: 'Follow Up', value: formatDateTime(deal.follow_up_date || deal.created_at).split(',')[0] },
                { label: 'Source', value: deal.source || 'Google' },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 ">{item.label}</span>
                  <span className="text-gray-900 font-[500]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-[500] text-gray-900">Deal Owner</h3>
              <button className="text-red text-xs font-[500] flex items-center gap-1 hover:underline">
                <Plus size={12} /> Add New
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img src="https://i.pravatar.cc/100?u=steve" alt="" className="w-8 h-8 rounded-full object-cover" />
                <span className="text-xs  text-gray-700">Steve Vaughan</span>
              </div>
              <div className="flex items-center gap-3">
                <img src="https://i.pravatar.cc/100?u=jessica" alt="" className="w-8 h-8 rounded-full object-cover" />
                <span className="text-xs  text-gray-700">Jessica Sen</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-sm font-[500] text-gray-900 mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs font-[500] border border-green-100">Collab</span>
              <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded text-xs font-[500] border border-amber-100">VIP</span>
            </div>
          </div>

          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-sm font-[500] text-gray-900 mb-2">Priority</h3>
            <div className="relative">
              <select
                value={deal.priority || 'High'}
                onChange={(e) => dealsAPI.update(id, { priority: e.target.value })}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs font-[500] focus:ring-1 focus:ring-red-500 outline-none appearance-none"
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-sm font-[500] text-gray-900 mb-4">Projects</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 bg-gray-50 border border-gray-100 rounded text-xs  text-gray-600">Devops Design</span>
              <span className="px-2.5 py-1 bg-gray-50 border border-gray-100 rounded text-xs  text-gray-600">Margrate Design</span>
            </div>
          </div>

          <div className="bg-white rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-[500] text-gray-900">Conracts</h3>
              <button className="text-red text-xs font-[500] flex items-center gap-1 hover:underline">
                <Plus size={12} /> Add New
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img src="https://i.pravatar.cc/100?u=steve" alt="" className="w-8 h-8 rounded-full object-cover" />
                <div className="flex-1">
                  <p className="text-xs font-[500] text-gray-900">Steve Vaughan</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <img src="https://i.pravatar.cc/100?u=jessica" alt="" className="w-8 h-8 rounded-full object-cover" />
                <div className="flex-1">
                  <p className="text-xs font-[500] text-gray-900">Jessica Sen</p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-50 space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>Last Modified</span>
                  <span className="text-gray-900 ">27 Sep 2025, 11:45 PM</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>Modified By</span>
                  <div className="flex items-center gap-1">
                    <img src="https://i.pravatar.cc/100?u=darlee" alt="" className="w-4 h-4 rounded-full" />
                    <span className="text-gray-900 ">Darlee Robertson</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Main Content */}
        <div className="col-span-12 lg:col-span-8 space-y-3">
          {/* Deals Pipeline Status */}
          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-sm font-[500] text-gray-900 mb-6">Deals Pipeline Status</h3>
            <div className="flex items-center w-full">
              {pipelineStages.map((stage, idx) => {
                const currentStage = deal.deal_stage || pipelineStages[0];
                const activeIdx = pipelineStages.indexOf(currentStage);
                const isActive = idx === activeIdx;
                const isPast = idx < activeIdx;

                let bgColor = 'bg-[#F8F9FA] text-[#B8BBBD]';
                if (isActive || isPast) {
                  bgColor = 'bg-blue-600 text-white';
                }

                return (
                  <div
                    key={idx}
                    className={`flex-1 h-10 flex items-center justify-center text-[12px] font-[500] transition-all cursor-pointer ${bgColor}`}
                    style={{
                      clipPath: idx === 0
                        ? 'polygon(0% 0%, calc(100% - 15px) 0%, 100% 50%, calc(100% - 15px) 100%, 0% 100%)'
                        : 'polygon(0% 0%, calc(100% - 15px) 0%, 100% 50%, calc(100% - 15px) 100%, 0% 100%, 15px 50%)',
                      marginLeft: idx === 0 ? '0' : '-12px',
                      paddingLeft: idx === 0 ? '0' : '15px'
                    }}
                    onClick={() => handleStatusChange(stage)}
                  >
                    {stage}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity Tabs */}
          <div className="bg-white rounded border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200">
              {['Activities', 'Notes', 'Calls', 'Files', 'Email'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`p-4  text-xs font-[500] transition-all relative ${activeTab === tab ? 'text-red' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    {tab === 'Activities' && <RotateCcw size={14} />}
                    {tab === 'Notes' && <FileText size={14} />}
                    {tab === 'Calls' && <Phone size={14} />}
                    {tab === 'Files' && <Paperclip size={14} />}
                    {tab === 'Email' && <Mail size={14} />}
                    {tab}
                  </div>
                  {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red"></div>}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'Activities' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-[500] text-gray-900">Activities</h3>
                    <button className="flex items-center gap-1.5 p-2 border border-gray-200 rounded text-xs text-gray-600 font-[500]">
                      <List size={14} /> Sort By <ChevronDown size={14} />
                    </button>
                  </div>

                  {getGroupedActivities().map(([date, items]) => (
                    <div key={date} className="relative">
                      <div className="flex items-center gap-2 mb-6">
                        <Calendar size={14} className="text-blue-600" />
                        <span className="text-xs font-[500] text-blue-600 bg-blue-50 px-2 py-1 rounded">{date}</span>
                      </div>
                      <div className="space-y-6 pl-4 border-l border-gray-100 ml-1.5">
                        {items.map((item, idx) => (
                          <div key={idx} className="flex gap-4 group">
                            <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0  ${item.activity_type === 'Call' ? 'bg-teal-100 text-teal-600' :
                              item.activity_type === 'Email' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
                              }`}>
                              {item.activity_type === 'Call' ? <Phone size={16} /> :
                                item.activity_type === 'Email' ? <Mail size={16} /> : <FileText size={16} />}
                            </div>
                            <div className="flex-1 bg-white border border-gray-100 rounded p-4 group-hover:border-gray-200 transition-all">
                              <div className="flex justify-between mb-1">
                                <h4 className="text-xs font-[500] text-gray-900">{item.title}</h4>
                                <span className="text-xs text-gray-400 ">{formatDateTime(item.created_at).split(',')[1]}</span>
                              </div>
                              <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Sample Activity from Screenshot */}
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded bg-blue-500 text-white flex items-center justify-center shrink-0">
                        <Mail size={20} />
                      </div>
                      <div className="flex-1 border border-gray-100 rounded p-4">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-xs font-[500] text-gray-900">You sent 1 Message to the contact.</h4>
                          <span className="text-xs text-gray-400">10:25 pm</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded bg-teal-500 text-white flex items-center justify-center shrink-0">
                        <Phone size={20} />
                      </div>
                      <div className="flex-1 border border-gray-100 rounded p-4">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-xs font-[500] text-gray-900">Denwar responded to your appointment schedule by call at 09:30pm.</h4>
                          <span className="text-xs text-gray-400">09:25 pm</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded bg-red-500 text-white flex items-center justify-center shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 border border-gray-100 rounded p-4">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-xs font-[500] text-gray-900">Notes added by Antony</h4>
                          <span className="text-xs text-gray-400">10.00 pm</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                          Please accept my apologies for the inconvenience caused. It would be much appreciated if it's possible to reschedule to 6:00 PM, or any other day that week.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Appointment/Meeting Section from Screenshot */}
                  <div className="mt-10 bg-[#FAFAFA] border border-gray-100 rounded p-6 space-y-6">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded bg-amber-400 text-white flex items-center justify-center shrink-0">
                        <Users size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-[500] text-gray-900">Product Meeting</h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          A product team meeting is a gathering of the cross-functional product team — ideally including team members from product, engineering, marketing, and customer support.
                        </p>
                        <p className="text-xs text-gray-400 mt-2">25 Jul 2023, 05:00 pm</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-[500] text-gray-500 block mb-1.5 ">Reminder *</label>
                        <div className="relative">
                          <select className="w-full p-2  bg-white border border-gray-200 rounded text-xs  outline-none appearance-none">
                            <option>1 hr</option>
                            <option>2 hr</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-[500] text-gray-500 block mb-1.5 ">Task Priority *</label>
                        <div className="relative">
                          <select className="w-full p-2  bg-white border border-gray-200 rounded text-xs  outline-none appearance-none">
                            <option>High</option>
                            <option>Medium</option>
                            <option>Low</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-[500] text-gray-500 block mb-1.5 ">Assigned To *</label>
                        <div className="relative">
                          <select className="w-full p-2  bg-white border border-gray-200 rounded text-xs  outline-none appearance-none">
                            <option>Jerald Sen</option>
                            <option>Steve Vaughan</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealDetailsPage;
