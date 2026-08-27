import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Trash2, FileText, User, Building2, Zap,
  Phone, MessageSquare, Calendar, CheckCircle, XCircle, Clock,
  Plus, History, Star, MoreVertical, Lock, Shield, Mail, FileUp,
  ChevronDown, Search, Download, RotateCcw, Maximize, Printer,
  Layout, Target, Layers, Briefcase, MapPin, List, Check,
  FileSpreadsheet, DownloadCloud, Trash, Settings, X, Paperclip,
  Image as ImageIcon, Share2, Filter, Info, ThumbsUp, ChevronLeft, ChevronRight, AlertCircle, ExternalLink
} from 'lucide-react';
import { taskAPI, activitiesAPI, notesAPI, filesAPI, contactsAPI, leadsAPI, dealsAPI } from '../../services/api';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const TaskDetailsPage = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [linkedEntity, setLinkedEntity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [followups, setFollowups] = useState([]);
  const [notes, setNotes] = useState([]);
  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('Activities');

  // New states for modals and dropdowns
  const [isSortByOpen, setIsSortByOpen] = useState(false);
  const [sortBy, setSortBy] = useState('Newest');
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [isAddCallLogModalOpen, setIsAddCallLogModalOpen] = useState(false);
  const [isAddFileModalOpen, setIsAddFileModalOpen] = useState(false);
  const [isNoteMenuOpen, setIsNoteMenuOpen] = useState(null);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isCallStatusMenuOpen, setIsCallStatusMenuOpen] = useState(null);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(null);
  const [isConnectAccountModalOpen, setIsConnectAccountModalOpen] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date(2026, 0, 1));
  const [fileModalTab, setFileModalTab] = useState('Basic Info');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [accountForm, setAccountForm] = useState({ type: 'Gmail', syncFrom: 'Now' });

  // Form states
  const [noteForm, setNoteForm] = useState({ title: '', note: '', attachments: [] });
  const [callLogForm, setCallLogForm] = useState({ status: 'Busy', followUpDate: '23 Jan, 2026', note: '', createFollowupTask: false });
  const [fileForm, setFileForm] = useState({
    title: '', documentType: 'Document', status: 'Draft'
  });

  const statusOptions = ['To Do', 'In Progress', 'Completed', 'On Hold', 'Cancelled'];

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails();
      fetchFollowups();
      fetchNotes();
      fetchFiles();
    }
  }, [taskId]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const response = await taskAPI.getById(taskId);
      setTask(response);
      setEditData(response);

      if (response.linked_type === 'Lead' && response.linked_id) {
        try {
          const lead = await leadsAPI.getById(response.linked_id);
          setLinkedEntity(lead);
        } catch (e) { console.error('Failed to fetch lead:', e); }
      } else if (response.linked_type === 'Deal' && response.linked_id) {
        try {
          const deal = await dealsAPI.getById(response.linked_id);
          setLinkedEntity(deal);
        } catch (e) { console.error('Failed to fetch deal:', e); }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch task');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    try {
      const data = await notesAPI.getAll({ task_id: taskId });
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  };

  const fetchFiles = async () => {
    try {
      const data = await filesAPI.getAll({ task_id: taskId });
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch files:', err);
    }
  };

  const fetchFollowups = async () => {
    try {
      const data = await activitiesAPI.getUnifiedFeed({ task_id: taskId });
      setFollowups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await taskAPI.updateGeneral(taskId, { ...task, status: newStatus });
      setTask(prev => ({ ...prev, status: newStatus }));
      showSuccessToast(`Status updated to ${newStatus}`);
      fetchFollowups();
    } catch (err) {
      showErrorToast('Failed to update status: ' + err.message);
    }
  };

  const handleEditSave = async () => {
    try {
      await taskAPI.updateGeneral(taskId, editData);
      setTask(editData);
      setIsEditing(false);
      showSuccessToast('Task updated successfully');
      fetchFollowups();
    } catch (err) {
      showErrorToast('Failed to update task: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await taskAPI.deleteGeneral(taskId);
      showSuccessToast('Task deleted successfully');
      navigate('/tasks');
    } catch (err) {
      showErrorToast('Failed to delete task: ' + err.message);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteForm.title || !noteForm.note) return;

    try {
      await notesAPI.create({
        title: noteForm.title,
        description: noteForm.note,
        task_id: taskId,
        priority: 'Medium',
        is_important: false
      });
      showSuccessToast('Note added successfully');
      setNoteForm({ title: '', note: '', attachments: [] });
      setIsAddNoteModalOpen(false);
      fetchNotes();
      fetchFollowups();
    } catch (err) {
      showErrorToast('Failed to add note: ' + err.message);
    }
  };

  const handleAddCallLog = async (e) => {
    e.preventDefault();
    if (!callLogForm.note) return;

    try {
      await activitiesAPI.create({
        title: `Call Log: ${callLogForm.status}`,
        description: callLogForm.note,
        activity_type: 'Call',
        task_id: taskId,
        status: 'Completed',
        priority: 'Medium'
      });
      showSuccessToast('Call log added successfully');
      setCallLogForm({ status: 'Busy', followUpDate: '23 Jan, 2026', note: '', createFollowupTask: false });
      setIsAddCallLogModalOpen(false);
      fetchFollowups();
    } catch (err) {
      showErrorToast('Failed to add call log: ' + err.message);
    }
  };

  const handleCreateFile = async (e) => {
    e.preventDefault();
    if (!fileForm.title) return;

    try {
      await filesAPI.create({
        name: fileForm.title,
        file_type: fileForm.documentType || 'Document',
        task_id: taskId,
        status: 'Draft'
      });
      showSuccessToast('File created successfully');
      setFileForm({ title: '', documentType: 'Document', status: 'Draft' });
      setIsAddFileModalOpen(false);
      fetchFiles();
    } catch (err) {
      showErrorToast('Failed to create file: ' + err.message);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await notesAPI.delete(noteId);
      showSuccessToast('Note deleted successfully');
      fetchNotes();
      fetchFollowups();
    } catch (err) {
      showErrorToast('Failed to delete note: ' + err.message);
    }
  };

  const parseJsonSafe = (data, defaultValue = []) => {
    if (!data) return defaultValue;
    if (typeof data !== 'string') return Array.isArray(data) ? data : defaultValue;
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const groupFollowupsByDate = (items) => {
    const groups = {};
    const sortedItems = [...items].sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortBy === 'Newest' ? dateB - dateA : dateA - dateB;
    });

    sortedItems.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  };

  const getIcon = (item) => {
    switch (item.activity_source) {
      case 'Note': return <FileText size={15} />;
      case 'Activity':
        if (item.type === 'Meeting') return <Calendar size={15} />;
        if (item.type === 'Call') return <Phone size={15} />;
        return <CheckCircle size={15} />;
      case 'Task': return <Star size={15} />;
      default: return <Clock size={15} />;
    }
  };

  const getColor = (item) => {
    switch (item.activity_source) {
      case 'Note': return 'bg-red-500';
      case 'Activity':
        if (item.type === 'Meeting') return 'bg-blue-500';
        if (item.type === 'Call') return 'bg-teal-500';
        return 'bg-green-500';
      case 'Task': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const generateCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const days = [];

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, isCurrentMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, isCurrentMonth: false });
    }

    return days;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const pipelineStages = ['Not Contacted', 'Contacted', 'Qualified', 'Lost'];

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-50"><Clock className="animate-spin text-red mr-2" /> Loading...</div>;

  if (error || !task) return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <button onClick={() => navigate('/tasks')} className="inline-flex items-center gap-2 text-red-600 mb-4"><ArrowLeft size={18} /> Back to Tasks</button>
      <div className="bg-red-50 border border-red-200 p-4 rounded text-red-700">{error || 'Task not found'}</div>
    </div>
  );

  return (
    <div className="bg-[#F8F9FA] min-h-screen p-4 font-sans text-[#1F2020]">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span className="text-gray-900 ">Tasks</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Home</span>
            <ChevronDown size={10} className="-rotate-90" />
            <span className="text-gray-600">Task Details</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.location.reload()} className="p-1.5 border border-gray-200 rounded bg-white hover:bg-gray-50">
            <RotateCcw size={14} />
          </button>
          <button className="p-1.5 border border-gray-200 rounded bg-white hover:bg-gray-50">
            <Maximize size={14} />
          </button>
        </div>
      </div>

      <button
        onClick={() => navigate('/tasks')}
        className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft size={14} /> Back to Tasks
      </button>

      {/* Profile Header Card */}
      <div className="bg-white rounded border border-gray-200 p-2 mb-3 flex items-center justify-between">
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm border border-blue-200">
            {getInitials(task.title)}
          </div>
          <div>
            <h1 className="text-md text-gray-900 flex items-center gap-2 font-[500]">
              {task.title}
            </h1>
            <div className="flex flex-col gap-2 text-xs text-gray-500 mt-1">
              {linkedEntity && (
                <span className="flex items-center gap-1  text-gray-700">
                  <Building2 size={14} /> {linkedEntity.lead_name || linkedEntity.deal_name || linkedEntity.company_name || linkedEntity.company || 'Client Info'}
                </span>
              )}
              <span className="flex items-center gap-1"><Layers size={14} /> {task.linked_type || 'General'} Task</span>
              <span className="flex items-center gap-1"><Clock size={14} /> Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded border border-gray-100"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded border border-gray-100"
          >
            <Trash2 size={16} />
          </button>

          <div className="relative">
            <button
              onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
              className="flex items-center gap-1 p-2 bg-red-600 text-white rounded text-xs  hover:bg-red-700 transition-colors"
            >
              <CheckCircle size={14} /> {task.status || 'To Do'} <ChevronDown size={14} className={`transition-transform ${isStatusMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isStatusMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-gray-100 rounded shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                {statusOptions.map(status => (
                  <button
                    key={status}
                    className="w-full text-left p-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors "
                    onClick={() => {
                      handleStatusChange(status);
                      setIsStatusMenuOpen(false);
                    }}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {/* Left Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <div className="bg-white rounded border border-gray-200 overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <h3 className="text-sm font-[500] text-gray-900">Task Information</h3>
            </div>
            <div className="p-4 space-y-2">
              {[
                { label: 'Date Created', value: task.created_at ? new Date(task.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A' },
                { label: 'Priority', value: task.priority || 'Medium' },
                { label: 'Linked To', value: task.linked_type || 'General' },
                { label: 'Due Date', value: task.due_date ? new Date(task.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A' },
                { label: 'Due Time', value: task.due_time || 'N/A' },
                { label: 'Follow-Up Type', value: task.task_type || 'General' },
                { label: 'Next Follow-Up', value: task.next_followup_date ? new Date(task.next_followup_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A' },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="text-gray-900 ">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-sm font-[500] text-gray-900 mb-4">Assigned To</h3>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-600 overflow-hidden">
                <User size={16} />
              </div>
              <span className="text-xs  text-gray-700">
                {task.assigned_to ? parseJsonSafe(task.assigned_to).map(u => u.label || u.name || u).join(', ') : (task.assigned_to_name || 'Unassigned')}
              </span>
            </div>
          </div>

          <div className="bg-white rounded border border-gray-200 p-2">
            <h3 className="text-sm font-[500] text-gray-900 mb-4">Description</h3>
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
              {task.description || 'No description provided.'}
            </p>
          </div>

          {task.tags && (
            <div className="bg-white rounded border border-gray-200 p-2">
              <h3 className="text-sm font-[500] text-gray-900 mb-4">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {parseJsonSafe(task.tags).map((tag, idx) => (
                  <span key={idx} className="px-2 py-1 bg-gray-50 text-gray-600 rounded text-xs border border-gray-100">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Main Content */}
        <div className="col-span-12 lg:col-span-8 space-y-3">
          {/* Lead Pipeline Status */}
          <div className="bg-white rounded border border-[#EAECF0] p-6  mb-6">
            <h3 className="text-xl  text-gray-900 mb-6">Lead Pipeline Status</h3>
            <div className="flex items-center w-full">
              {pipelineStages.map((stage, idx) => {
                const currentStatus = task.linked_type === 'Lead'
                  ? (linkedEntity?.lead_status || linkedEntity?.status || 'Not Contacted')
                  : 'Not Contacted';

                const normalizedStatus = currentStatus === 'New' ? 'Not Contacted' : currentStatus;
                const activeIdx = pipelineStages.indexOf(normalizedStatus);
                const isActive = idx === activeIdx;
                const isPast = idx < activeIdx;

                let bgColor = 'bg-[#F2F4F7] text-[#667085]';

                if (isActive) {
                  bgColor = 'bg-[#2D30D1] text-white';
                } else if (isPast) {
                  bgColor = 'bg-[#2D30D1] opacity-70 text-white';
                }

                return (
                  <div
                    key={idx}
                    className={`flex-1 h-10 flex items-center justify-center text-xs  transition-all relative ${bgColor}`}
                    style={{
                      clipPath: idx === 0
                        ? 'polygon(0% 0%, calc(100% - 20px) 0%, 100% 50%, calc(100% - 20px) 100%, 0% 100%)'
                        : idx === pipelineStages.length - 1
                          ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 20px 50%)'
                          : 'polygon(0% 0%, calc(100% - 20px) 0%, 100% 50%, calc(100% - 20px) 100%, 0% 100%, 20px 50%)',
                      marginLeft: idx === 0 ? '0' : '-15px',
                      zIndex: pipelineStages.length - idx
                    }}
                  >
                    {stage}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-6 border-b border-gray-100 overflow-x-auto scrollbar-hide">
              {['Activities', 'Notes', 'Calls', 'Files', 'Email'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={` text-[12px]  text-gray-900 font-[500] p-2 whitespace-nowrap transition-all border-b-2 relative ${activeTab === tab ? 'text-red border-red-600 ' : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    {tab === 'Activities' && <History size={14} />}
                    {tab === 'Notes' && <FileText size={14} />}
                    {tab === 'Calls' && <Phone size={14} />}
                    {tab === 'Files' && <FileUp size={14} />}
                    {tab === 'Email' && <Mail size={14} />}
                    {tab}
                  </div>
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'Activities' ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base text-gray-900 font-[500]">Activities</h3>
                    <div className="flex items-center gap-2 relative">
                      <button
                        onClick={() => setIsSortByOpen(!isSortByOpen)}
                        className="flex items-center gap-1.5 p-2   rounded text-xs font-[500] hover:bg-red-600 transition-all  border border-gray-200  hover:text-white"
                      >
                        <List size={14} /> Sort By <ChevronDown size={14} className={`transition-transform ${isSortByOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isSortByOpen && (
                        <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-gray-200 rounded  z-50 py-1">
                          {['Newest', 'Oldest'].map((option) => (
                            <button
                              key={option}
                              className={`w-full text-left p-2 text-xs hover:bg-gray-50 ${sortBy === option ? 'text-red font-[500]' : 'text-gray-700'}`}
                              onClick={() => {
                                setSortBy(option);
                                setIsSortByOpen(false);
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity List */}
                  <div className="space-y-8">
                    {Object.entries(groupFollowupsByDate(followups)).map(([date, items]) => (
                      <div key={date}>
                        <div className="flex items-center gap-2 text-xs text-blue-500 bg-blue-50 w-fit px-2 py-1 rounded mb-4">
                          <Calendar size={12} /> {date}
                        </div>
                        <div className="space-y-4">
                          {items.map((item, idx) => (
                            <div key={idx} className="p-3 bg-white border border-gray-200 rounded flex gap-4 ">
                              <div className={`w-8 h-8 rounded ${getColor(item)} text-white flex items-center justify-center shrink-0`}>
                                {getIcon(item)}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <p className="text-[12px] text-gray-900 font-[500]">
                                    {item.title || item.type}
                                    {item.lead_name && <span className="text-gray-400 font-normal ml-2">({item.lead_name})</span>}
                                  </p>
                                  {item.meeting_link && (
                                    <a
                                      href={item.meeting_link.startsWith('http') ? item.meeting_link : `https://${item.meeting_link}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                      Join Meeting <ExternalLink size={10} />
                                    </a>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    {item.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                                  <div className="flex items-center gap-1">
                                    <Clock size={12} className="text-gray-400" />
                                    <span className="text-xs text-gray-400">
                                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  {(item.scheduled_date || item.scheduled_time) && (
                                    <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                      <Calendar size={10} />
                                      <span className="text-xs ">
                                        Scheduled: {item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString() : ''} {item.scheduled_time || ''}
                                      </span>
                                    </div>
                                  )}
                                  {item.created_by_name && (
                                    <span className="text-xs text-gray-400 ml-auto">by {item.created_by_name}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {followups.length === 0 && (
                      <div className="text-center py-10 text-gray-500 text-sm">
                        No activities found for this task.
                      </div>
                    )}
                  </div>
                </>
              ) : activeTab === 'Notes' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-[500] text-gray-900">Notes</h3>
                    <div className="flex items-center gap-4 relative">
                      <button
                        onClick={() => setIsSortByOpen(!isSortByOpen)}
                        className="flex items-center gap-1.5 p-2 border border-gray-200 rounded bg-white text-xs text-gray-600  hover:bg-gray-50 transition-colors"
                      >
                        <List size={14} /> Sort By: {sortBy} <ChevronDown size={14} className={`transition-transform ${isSortByOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isSortByOpen && activeTab === 'Notes' && (
                        <div className="absolute top-full right-24 mt-1 w-32 bg-white border border-gray-200 rounded  z-50 py-1">
                          {['Newest', 'Oldest'].map((option) => (
                            <button
                              key={option}
                              className={`w-full text-left p-2 text-xs hover:bg-gray-50 ${sortBy === option ? 'text-red font-[500]' : 'text-gray-700'}`}
                              onClick={() => {
                                setSortBy(option);
                                setIsSortByOpen(false);
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => setIsAddNoteModalOpen(true)}
                        className="text-red text-xs font-[500] flex items-center gap-1 hover:underline"
                      >
                        <Plus size={16} /> Add New
                      </button>
                    </div>
                  </div>

                  {/* Notes List */}
                  {notes.map((note) => (
                    <div key={note.id} className="bg-white border border-gray-100 rounded p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-red-50 text-red flex items-center justify-center font-[500]">
                            {getInitials(note.created_by_name || 'U')}
                          </div>
                          <div>
                            <h4 className="text-xs font-[500] text-gray-900">{note.created_by_name || 'System User'}</h4>
                            <p className="text-xs text-gray-400">
                              {new Date(note.created_at).toLocaleString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setIsNoteMenuOpen(isNoteMenuOpen === note.id ? null : note.id)}
                            className="text-gray-400 hover:text-gray-600 p-1  rounded-full transition-colors"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {isNoteMenuOpen === note.id && (
                            <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-gray-100 rounded shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="w-full text-left p-2 text-xs text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="pl-[52px]">
                        <h5 className="text-xs font-[500] text-gray-900">{note.title}</h5>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {note.description}
                        </p>
                      </div>
                    </div>
                  ))}

                  {notes.length === 0 && (
                    <div className="text-center py-10 text-gray-500 text-sm">
                      No notes found for this task.
                    </div>
                  )}
                </div>
              ) : activeTab === 'Calls' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-[500] text-gray-900">Calls</h3>
                    <button
                      onClick={() => setIsAddCallLogModalOpen(true)}
                      className="text-red text-xs font-[500] flex items-center gap-1 hover:underline"
                    >
                      <Plus size={16} /> Add New
                    </button>
                  </div>

                  {followups.filter(f => f.activity_type === 'Call' || f.type === 'Call').length > 0 ? (
                    followups.filter(f => f.activity_type === 'Call' || f.type === 'Call').map((call) => (
                      <div key={call.id} className="bg-white border border-gray-100 rounded p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-red-50 text-red flex items-center justify-center font-[500]">
                              {getInitials(call.created_by_name || 'U')}
                            </div>
                            <div>
                              <h4 className="text-xs text-gray-900">
                                <span className="font-[500]">{call.created_by_name || 'System User'}</span> <span className="text-gray-400">logged a call on {new Date(call.created_at).toLocaleString()}</span>
                              </h4>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <button
                                onClick={() => setIsCallStatusMenuOpen(isCallStatusMenuOpen === call.id ? null : call.id)}
                                className="  border border-red rounded p-2 flex items-center gap-2 text-xs font-[500]  transition-all  shadow-red-500/10"
                              >
                                {call.status || 'Busy'} <ChevronDown size={12} className={`transition-transform ${isCallStatusMenuOpen === call.id ? 'rotate-180' : ''}`} />
                              </button>

                              {isCallStatusMenuOpen === call.id && (
                                <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-gray-100 rounded shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                                  {['Busy', 'No Answer', 'Unavailable', 'Wrong Number', 'Left Voice Message', 'Moving Forward'].map((status) => (
                                    <button
                                      key={status}
                                      className="w-full text-left p-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-red transition-colors "
                                      onClick={() => setIsCallStatusMenuOpen(null)}
                                    >
                                      {status}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button className="p-1.5 border border-gray-200 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            {call.description}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-gray-500 text-sm  border border-dashed border-gray-200 rounded bg-gray-50/50">
                      <Phone size={40} className="mx-auto text-gray-200 mb-3" />
                      <p>No call logs found for this task.</p>
                    </div>
                  )}
                </div>
              ) : activeTab === 'Files' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-[500] text-gray-900">Files</h3>
                    <button
                      onClick={() => setIsAddFileModalOpen(true)}
                      className="text-red text-xs font-[500] flex items-center gap-1 hover:underline"
                    >
                      <Plus size={16} /> Add New
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {files.map((file) => (
                      <div key={file.id} className="bg-white border border-gray-100 rounded p-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-gray-50 flex items-center justify-center text-gray-400">
                              <FileSpreadsheet size={20} />
                            </div>
                            <div>
                              <h4 className="text-xs font-[500] text-gray-900">{file.name}</h4>
                              <p className="text-xs text-gray-400">{file.file_type} - {file.size || '0 KB'}</p>
                            </div>
                          </div>
                          <div className="relative">
                            <button
                              onClick={() => setIsFileMenuOpen(isFileMenuOpen === file.id ? null : file.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {isFileMenuOpen === file.id && (
                              <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-gray-100 rounded shadow-xl z-50 py-1">
                                <button className="w-full text-left p-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                                  <Download size={14} /> Download
                                </button>
                                <button className="w-full text-left p-2 text-xs text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 ">Owned By</span>
                            <span className="text-gray-900 ">{file.owner_name || 'System User'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {files.length === 0 && (
                    <div className="text-center py-10 text-gray-500 text-sm  border border-dashed border-gray-200 rounded bg-gray-50/50">
                      <FileUp size={40} className="mx-auto text-gray-200 mb-3" />
                      <p>No files found for this task.</p>
                    </div>
                  )}
                </div>
              ) : activeTab === 'Email' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-[500] text-gray-900">Email</h3>
                    <button
                      onClick={() => setIsConnectAccountModalOpen(true)}
                      className="text-red text-xs font-[500] flex items-center gap-1 hover:underline"
                    >
                      <Plus size={16} /> Add New
                    </button>
                  </div>

                  <div className="text-center py-12 border border-dashed border-gray-200 rounded bg-gray-50/50">
                    <Mail size={40} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-sm text-gray-500 ">Email integration coming soon...</p>
                    <button
                      onClick={() => setIsConnectAccountModalOpen(true)}
                      className="mt-4 p-2 bg-red-600 text-white rounded text-xs  hover:bg-red-700 transition-colors"
                    >
                      Connect Account
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isAddNoteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded  w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-2 border-b border-gray-100">
              <h3 className="text-base font-[500] text-gray-900">Add New Note</h3>
              <button onClick={() => setIsAddNoteModalOpen(false)} className="p-1  rounded-full text-gray-400">
                <X size={15} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-[500] text-gray-700 mb-1.5  ">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                  placeholder="Enter title"
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-[500] text-gray-700 mb-1.5">Note <span className="text-red-500">*</span></label>
                <textarea
                  className="w-full p-2 border border-gray-200 rounded text-xs min-h-[100px] focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                  placeholder="Enter note details"
                  value={noteForm.note}
                  onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-[500] text-gray-700 mb-1.5">Attachment <span className="text-red-500">*</span></label>
                <div className="border border-dashed border-gray-200 rounded p-4 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FileUp size={15} className="text-red" />
                  </div>
                  <p className="text-xs text-black-600">Drop your files here or <span className="text-red font-[500]">browse</span></p>
                  <p className="text-xs text-gray-400 mt-1">Maximum size : 50 MB</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 bg-gray-50/50 border-t border-gray-100">
              <button
                onClick={() => setIsAddNoteModalOpen(false)}
                className="p-2 text-xs font-[500] text-gray-700  rounded transition-colors bg-gray-200"
              >
                Cancel
              </button>
              <button
                className="p-2 text-xs font-[500] text-white bg-red-600 rounded  transition-colors  "
                onClick={handleAddNote}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddCallLogModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded  w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-2 border-b border-gray-100">
              <h3 className="text-base font-[500] text-gray-900">Create Call Log</h3>
              <button onClick={() => setIsAddCallLogModalOpen(false)} className="p-1  rounded-full text-gray-400">
                <X size={15} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-[500] text-gray-700 mb-1.5  ">Status <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select
                    className="w-full p-2 bg-white border border-gray-200 rounded text-xs  focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none appearance-none cursor-pointer"
                    value={callLogForm.status}
                    onChange={(e) => setCallLogForm({ ...callLogForm, status: e.target.value })}
                  >
                    <option>Busy</option>
                    <option>Unavailable</option>
                    <option>No Answer</option>
                    <option>Wrong Number</option>
                    <option>Left Voice Message</option>
                    <option>Moving Forward</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="relative">
                <label className="block text-xs font-[500] text-gray-700 mb-1.5  ">Follow Up Date <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all pr-10 cursor-pointer"
                    placeholder="23 Jan, 2026"
                    value={callLogForm.followUpDate}
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    readOnly
                  />
                  <Calendar
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                  />
                </div>

                {isDatePickerOpen && (
                  <div className="absolute top-full left-0 mt-1 w-[280px] bg-white border border-gray-100 rounded shadow-2xl z-[110] p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={handlePrevMonth}
                        className="p-1 hover:bg-gray-50 rounded text-gray-400 transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="relative">
                        <div
                          className="flex items-center gap-1 text-sm font-[500] text-gray-700 cursor-pointer hover:text-red transition-colors"
                        >
                          {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()} <ChevronDown size={14} />
                        </div>
                      </div>
                      <button
                        onClick={handleNextMonth}
                        className="p-1 hover:bg-gray-50 rounded text-gray-400 transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="text-xs font-[500] text-gray-400 text-center py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {generateCalendarDays().map((dateObj, idx) => {
                        const { day, isCurrentMonth } = dateObj;
                        const isSelected = isCurrentMonth && day === 23 && calendarDate.getMonth() === 0 && calendarDate.getFullYear() === 2026;

                        return (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isCurrentMonth) {
                                const formattedDate = `${day} ${monthNames[calendarDate.getMonth()].substring(0, 3)}, ${calendarDate.getFullYear()}`;
                                setCallLogForm({ ...callLogForm, followUpDate: formattedDate });
                                setIsDatePickerOpen(false);
                              }
                            }}
                            className={`
                              h-8 w-8 flex items-center justify-center text-xs  rounded-full transition-all
                              ${!isCurrentMonth ? 'text-gray-300 pointer-events-none' : 'text-gray-600 hover:bg-red-50 hover:text-red'}
                              ${isSelected ? 'bg-red text-white hover:bg-red-700' : ''}
                            `}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-[500] text-gray-700 mb-1.5  ">Note <span className="text-red-500">*</span></label>
                <textarea
                  className="w-full p-2 border border-gray-200 rounded text-xs min-h-[100px] focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                  placeholder="Enter call notes"
                  value={callLogForm.note}
                  onChange={(e) => setCallLogForm({ ...callLogForm, note: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setCallLogForm({ ...callLogForm, createFollowupTask: !callLogForm.createFollowupTask })}>
                <div className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${callLogForm.createFollowupTask ? 'bg-red-600 border-red text-white' : 'border-gray-300 bg-white group-hover:border-red'}`}>
                  {callLogForm.createFollowupTask && <Check size={12} strokeWidth={3} />}
                </div>
                <span className="text-xs  text-gray-600 group-hover:text-gray-900 transition-colors">Create a follow up task</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 bg-gray-50/50 border-t border-gray-100">
              <button
                onClick={() => setIsAddCallLogModalOpen(false)}
                className="p-2 text-xs font-[500] text-gray-700  rounded transition-colors bg-gray-200"
              >
                Cancel
              </button>
              <button
                className="p-2 text-xs font-[500] text-white bg-red-600 rounded  transition-colors  "
                onClick={handleAddCallLog}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddFileModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded  w-full max-w-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-2 border-b border-gray-100">
              <h3 className="text-base font-[500] text-gray-900">Create New File</h3>
              <button onClick={() => setIsAddFileModalOpen(false)} className="p-1  rounded-full text-gray-400">
                <X size={15} />
              </button>
            </div>
            <div className="bg-gray-50/50 p-4 flex gap-2 border-b border-gray-100">
              <button
                onClick={() => setFileModalTab('Basic Info')}
                className={`flex items-center gap-2 p-2 rounded text-xs font-[500] transition-all ${fileModalTab === 'Basic Info' ? 'bg-red-600 text-white shadow-md shadow-red-500/10' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                <FileText size={14} /> Basic Info
              </button>
              <button
                onClick={() => setFileModalTab('Add Recipient')}
                className={`flex items-center gap-2 p-2 rounded text-xs font-[500] transition-all ${fileModalTab === 'Add Recipient' ? 'bg-red-600 text-white shadow-md shadow-red-500/10' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                <Plus size={14} /> Add Recipient
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {fileModalTab === 'Basic Info' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-[500] text-gray-700 mb-1.5  ">Document Type <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select className="w-full p-2 bg-white border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 outline-none appearance-none cursor-pointer">
                          <option>Select</option>
                          <option>Contract</option>
                          <option>Proposal</option>
                          <option>Quote</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-[500] text-gray-700 mb-1.5  ">Owner <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select className="w-full p-2 bg-white border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 outline-none appearance-none cursor-pointer">
                          <option>Select</option>
                          <option>Steve Vaughan</option>
                          <option>Jessica Louise</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-[500] text-gray-700 mb-1.5  ">Title <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 outline-none"
                        placeholder="Enter title"
                        value={fileForm.title}
                        onChange={(e) => setFileForm({ ...fileForm, title: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="text-center py-10 text-gray-500 text-sm">
                    Recipient management coming soon...
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-4 bg-gray-50/50 border-t border-gray-100">
              <button
                onClick={() => setIsAddFileModalOpen(false)}
                className="p-2 text-xs font-[500] text-gray-700  rounded transition-colors bg-gray-200"
              >
                Cancel
              </button>
              <button
                className="p-2 text-xs font-[500] text-white bg-red-600 rounded  transition-colors  "
                onClick={handleCreateFile}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {isConnectAccountModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded  w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-2 border-b border-gray-100">
              <h3 className="text-base font-[500] text-gray-900">Connect Account</h3>
              <button onClick={() => setIsConnectAccountModalOpen(false)} className="p-1  rounded-full text-gray-400">
                <X size={15} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {['Gmail', 'Outlook', 'Other'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setAccountForm({ ...accountForm, type })}
                    className={`p-4 border rounded flex flex-col items-center gap-2 transition-all ${accountForm.type === type ? 'border-red bg-red-50 text-red' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <Mail size={24} />
                    <span className="text-xs ">{type}</span>
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-[500] text-gray-700 mb-1.5">Sync From</label>
                <select
                  className="w-full p-2 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 outline-none"
                  value={accountForm.syncFrom}
                  onChange={(e) => setAccountForm({ ...accountForm, syncFrom: e.target.value })}
                >
                  <option>Now</option>
                  <option>1 Month Ago</option>
                  <option>3 Months Ago</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 bg-gray-50/50 border-t border-gray-100">
              <button onClick={() => setIsConnectAccountModalOpen(false)} className="p-2 text-xs font-[500] text-gray-700 bg-gray-200 rounded">Cancel</button>
              <button onClick={() => setIsConnectAccountModalOpen(false)} className="p-2 text-xs font-[500] text-white bg-red-600 rounded">Connect</button>
            </div>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-sm font-[500] text-gray-900 flex items-center gap-2">
                <Edit2 size={18} className="text-red-600" /> Edit Task
              </h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
              <div className="col-span-2">
                <label className="block text-xs font-[500] text-gray-700 mb-1.5  tracking-wider">Task Title</label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-[500] text-gray-700 mb-1.5  tracking-wider">Description</label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all h-24 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-[500] text-gray-700 mb-1.5  tracking-wider">Status</label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                >
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-[500] text-gray-700 mb-1.5  tracking-wider">Priority</label>
                <select
                  value={editData.priority}
                  onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-[500] text-gray-700 mb-1.5  tracking-wider">Due Date</label>
                <input
                  type="date"
                  value={editData.due_date ? new Date(editData.due_date).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-[500] text-gray-700 mb-1.5  tracking-wider">Due Time</label>
                <input
                  type="time"
                  value={editData.due_time || ''}
                  onChange={(e) => setEditData({ ...editData, due_time: e.target.value })}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex items-center gap-3 bg-gray-50">
              <button onClick={() => setIsEditing(false)} className="flex-1 p-2.5 border border-gray-200 text-gray-600 rounded text-xs font-[500] hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={handleEditSave} className="flex-1 p-2.5 bg-red-600 text-white rounded text-xs font-[500] hover:bg-red-700 transition-all shadow-lg shadow-red-500/20">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetailsPage;
