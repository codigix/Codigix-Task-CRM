import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search, Filter, ChevronDown, Check, AlertCircle, MessageSquare,
  FileText, DollarSign, Calendar, Users, Activity, X, ExternalLink
} from 'lucide-react';
import AdvancedDateRangePicker from '../common/AdvancedDateRangePicker';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';




const TYPE_COLORS = {
  'Task': 'text-blue-600 bg-blue-50',
  'Issue': 'text-orange-600 bg-orange-50',
  'Comment': 'text-purple-600 bg-purple-50',
  'File': 'text-blue-600 bg-blue-50',
  'Deal': 'text-green-600 bg-green-50',
  'Event': 'text-rose-600 bg-rose-50',
  'Team': 'text-purple-600 bg-purple-50'
};

export default function ITActivitiesPage() {
  const [activitiesList, setActivitiesList] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [kpis, setKpis] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All Activities');
  const [selectedModule, setSelectedModule] = useState('All Modules');
  const [selectedUser, setSelectedUser] = useState('All Users');
  const [openFilterDropdown, setOpenFilterDropdown] = useState(null);
  const [dateRange, setDateRange] = useState({ start: null, end: null, label: 'All Time' });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openFilterDropdown && !e.target.closest('.interactive-dropdown')) {
        setOpenFilterDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFilterDropdown]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await axios.get(API_BASE_URL + '/activities');

        // Map raw data to UI format
        const formatted = res.data.map(act => {
          let typeColor = 'text-gray-600 bg-gray-50';
          let icon = <Activity size={16} className="text-gray-500" />;
          let iconBg = 'bg-gray-100';

          if (act.activity_type === 'Task') { icon = <Check size={16} className="text-green-500" />; iconBg = 'bg-green-100'; }
          else if (act.activity_type === 'Issue') { icon = <AlertCircle size={16} className="text-orange-500" />; iconBg = 'bg-orange-100'; }
          else if (act.activity_type === 'Comment') { icon = <MessageSquare size={16} className="text-purple-500" />; iconBg = 'bg-purple-100'; }
          else if (act.activity_type === 'Meeting') { icon = <Users size={16} className="text-blue-500" />; iconBg = 'bg-blue-100'; }

          return {
            id: act.id,
            title: act.title || 'System Activity',
            subtitle: act.description || 'General System Update',
            details: 'Status: ' + (act.status || 'N/A') + ' | Priority: ' + (act.priority || 'N/A'),
            user: {
              name: act.created_by_name || 'System Auto',
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(act.created_by_name || 'System')}&background=random`,
              time: new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              date: new Date(act.created_at).toLocaleDateString()
            },
            type: act.activity_type || 'Update',
            icon: icon,
            iconBg: iconBg,
            metadata: {
              module: act.project_name ? 'Projects' :
                act.deal_name ? 'Deals' :
                  act.lead_name ? 'Leads' :
                    act.task_name ? 'Tasks' :
                      act.contact_name ? 'Contacts' :
                        act.company_name ? 'Companies' : 'General',
              project: act.project_name || 'Global',
              task: act.task_name || null,
              fieldUpdated: 'General Update',
              oldValue: null,
              newValue: null,
              ipAddress: 'System',
              userAgent: 'System Backend',
              taskInfo: null
            }
          };
        });

        setActivitiesList(formatted);

        // Compute dynamic KPIs
        const total = formatted.length;
        const tasks = formatted.filter(a => a.type === 'Task').length;
        const issues = formatted.filter(a => a.type === 'Issue').length;
        const comments = formatted.filter(a => a.type === 'Comment').length;
        const meetings = formatted.filter(a => a.type === 'Meeting').length;

        setKpis([
          { icon: <Activity size={24} className="text-blue-500" />, count: total, label: 'All Activities', trend: '+0%', isPositive: true, bg: 'bg-blue-50' },
          { icon: <Check size={24} className="text-green-500" />, count: tasks, label: 'Tasks Updated', trend: '+0%', isPositive: true, bg: 'bg-green-50' },
          { icon: <AlertCircle size={24} className="text-orange-500" />, count: issues, label: 'Issues Updated', trend: '+0%', isPositive: true, bg: 'bg-orange-50' },
          { icon: <MessageSquare size={24} className="text-purple-500" />, count: comments, label: 'Comments', trend: '+0%', isPositive: true, bg: 'bg-purple-50' },
          { icon: <Users size={24} className="text-blue-500" />, count: meetings, label: 'Meetings', trend: '+0%', isPositive: true, bg: 'bg-blue-50' }
        ]);

      } catch (err) {
        console.error('Failed to fetch activities', err);
      }
    };
    fetchActivities();
  }, []);

  const uniqueTypes = ['All Activities', ...new Set(activitiesList.map(a => a.type).filter(Boolean))];
  const uniqueModules = ['All Modules', ...new Set(activitiesList.map(a => a.metadata.module).filter(Boolean))];
  const uniqueUsers = ['All Users', ...new Set(activitiesList.map(a => a.user.name).filter(Boolean))];

  const filteredActivities = activitiesList.filter(act => {
    const matchesSearch = searchQuery === '' ||
      act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.subtitle.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'All Activities' || act.type === selectedType;
    const matchesModule = selectedModule === 'All Modules' || act.metadata.module === selectedModule;
    const matchesUser = selectedUser === 'All Users' || act.user.name === selectedUser;

    let matchesDate = true;
    if (dateRange.start && dateRange.end) {
      // find the raw date object in activitiesList. Note: currently activitiesList maps raw created_at to strings.
      // we need a real date object to compare. 
      // act.user.date format is 'MM/DD/YYYY' usually based on locale, or we should just use a strict Date parse.
      // But we can parse act.user.date if needed. Wait, let's parse act.user.date for filtering.
      const actDate = new Date(act.user.date);
      if (actDate < dateRange.start || actDate > dateRange.end) {
        matchesDate = false;
      }
    }

    return matchesSearch && matchesType && matchesModule && matchesUser && matchesDate;
  });

  return (
    <div className="bg-[#f8fafc] min-h-screen p-6 font-sans flex flex-col gap-6 text-gray-900">

      {/* Header */}
      <div>
        <h1 className="text-[22px]  text-gray-900 leading-tight">Activity Stream</h1>
        <p className="text-sm text-gray-500 mt-1">Complete timeline of all activities, updates, and interactions across the system.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-2">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-2 rounded  border border-gray-100 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full ${kpi.bg} flex items-center justify-center shrink-0`}>
              {kpi.icon}
            </div>
            <div>
              <span className="text-xs  text-gray-500  tracking-wider block mb-1">{kpi.label}</span>
              <div className="flex items-end gap-2">
                <span className="text-[22px]  text-gray-900 leading-none">{kpi.count}</span>
              </div>
              <span className={`text-xs  ${kpi.isPositive ? 'text-green-500' : 'text-red-500'} flex items-center gap-1 mt-1`}>
                &uarr; {kpi.trend} <span className="text-gray-400 font-medium">vs last week</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="flex gap-6 relative">

        {/* Left Panel - Activity Stream */}
        <div className="flex-1">

          {/* Filters Bar */}
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keyword or activity..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500 "
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px]  text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">⌘ K</span>
            </div>

            {/* Activity Type Dropdown */}
            <div className="relative interactive-dropdown">
              <div
                onClick={() => setOpenFilterDropdown(openFilterDropdown === 'type' ? null : 'type')}
                className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded  cursor-pointer hover:bg-gray-50 text-xs text-gray-700 font-medium"
              >
                <span>{selectedType}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </div>
              {openFilterDropdown === 'type' && (
                <div className="absolute left-0 mt-1 w-44 bg-white border border-gray-200 rounded shadow-lg py-1 z-50 text-xs font-medium">
                  {uniqueTypes.map(t => (
                    <div
                      key={t}
                      onClick={() => { setSelectedType(t); setOpenFilterDropdown(null); }}
                      className="p-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between text-gray-700"
                    >
                      <span>{t}</span>
                      {selectedType === t && <Check size={12} className="text-blue-600" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Module Dropdown */}
            <div className="relative interactive-dropdown">
              <div
                onClick={() => setOpenFilterDropdown(openFilterDropdown === 'module' ? null : 'module')}
                className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded  cursor-pointer hover:bg-gray-50 text-xs text-gray-700 font-medium"
              >
                <span>{selectedModule}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </div>
              {openFilterDropdown === 'module' && (
                <div className="absolute left-0 mt-1 w-44 bg-white border border-gray-200 rounded shadow-lg py-1 z-50 text-xs font-medium">
                  {uniqueModules.map(m => (
                    <div
                      key={m}
                      onClick={() => { setSelectedModule(m); setOpenFilterDropdown(null); }}
                      className="p-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between text-gray-700"
                    >
                      <span>{m}</span>
                      {selectedModule === m && <Check size={12} className="text-blue-600" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className="relative interactive-dropdown">
              <div
                onClick={() => setOpenFilterDropdown(openFilterDropdown === 'user' ? null : 'user')}
                className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded  cursor-pointer hover:bg-gray-50 text-xs text-gray-700 font-medium"
              >
                <span>{selectedUser}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </div>
              {openFilterDropdown === 'user' && (
                <div className="absolute left-0 mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg py-1 z-50 text-xs font-medium max-h-60 overflow-y-auto custom-scrollbar">
                  {uniqueUsers.map(u => (
                    <div
                      key={u}
                      onClick={() => { setSelectedUser(u); setOpenFilterDropdown(null); }}
                      className="p-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between text-gray-700"
                    >
                      <span>{u}</span>
                      {selectedUser === u && <Check size={12} className="text-blue-600" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <AdvancedDateRangePicker
                range={dateRange}
                onChange={setDateRange}
                initialRange="All Time"
              />
            </div>

            <button className="flex items-center gap-1.5 p-2 bg-white border border-gray-200 rounded  text-gray-700 text-xs  hover:bg-gray-50 ml-auto">
              <Filter size={14} /> Filters
            </button>
          </div>

          {/* Activity List */}
          <div className="bg-white rounded  border border-gray-100">
            {filteredActivities.map((activity, index) => {
              const isSelected = selectedActivity?.id === activity.id;
              return (
                <div
                  key={activity.id}
                  onClick={() => { setSelectedActivity(activity); setIsPanelOpen(true); }}
                  className={`flex gap-4 p-2 cursor-pointer transition-colors border-b border-gray-100 last:border-0 
                  ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                >
                  <div className={`w-8 h-8 rounded-full ${activity.iconBg} flex items-center justify-center shrink-0`}>
                    {activity.icon}
                  </div>

                  <div className="flex-1 pt-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-xs text-gray-900 truncate" title={activity.title}>{activity.title}</h4>
                      {activity.titleBadge && (
                        <span className={`px-2 py-0.5 rounded text-xs  border ${activity.titleBadge.color}`}>
                          {activity.titleBadge.text}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-gray-700 mb-1 line-clamp-2" title={activity.subtitle}>{activity.subtitle}</p>
                    <p className="text-[12px] text-gray-500 truncate" title={activity.details}>{activity.details}</p>
                  </div>

                  <div className="flex items-start gap-4 pt-1 w-64 shrink-0 justify-between">
                    <div className="flex items-center gap-2">
                      <img src={activity.user.avatar} alt="Avatar" className="w-6 h-6 rounded-full" />
                      <div>
                        <p className="text-xs  text-gray-900">{activity.user.name}</p>
                        <p className="text-xs font-medium text-gray-500">{activity.user.time}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs  ${TYPE_COLORS[activity.type] || 'text-gray-600 bg-gray-50'}`}>
                      {activity.type}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Pagination Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-b-xl">
              <span className="text-xs  text-gray-500">Showing 1 to {filteredActivities.length} of {filteredActivities.length} activities</span>
              <div className="flex items-center gap-1">
                <button className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700"><ChevronDown size={14} className="rotate-90" /></button>
                <button className="w-6 h-6 flex items-center justify-center bg-red-600 text-white rounded text-xs  ">1</button>
                <button className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded text-xs ">2</button>
                <button className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded text-xs ">3</button>
                <button className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded text-xs ">4</button>
                <button className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded text-xs ">5</button>
                <span className="text-gray-400 mx-1">...</span>
                <button className="w-8 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded text-xs ">125</button>
                <button className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700"><ChevronDown size={14} className="-rotate-90" /></button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Activity Details */}
        {isPanelOpen && selectedActivity && (
          <div className="w-[320px] shrink-0 animate-slide-left">
            <div className="bg-white rounded  border border-gray-100 sticky top-6">

              {/* Details Header */}
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-[14px]  text-gray-900">Activity Details</h3>
                <button onClick={() => setIsPanelOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
              </div>

              <div className="p-2">

                {/* Selected Title */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-5 h-5 rounded-full ${selectedActivity.iconBg} flex items-center justify-center shrink-0`}>
                      {React.cloneElement(selectedActivity.icon, { size: 10 })}
                    </div>
                    <h4 className="text-xs text-gray-900 line-clamp-2 break-words leading-relaxed" title={selectedActivity.title}>{selectedActivity.title}</h4>
                    {selectedActivity.titleBadge && (
                      <span className={`px-2 py-0.5 rounded text-[9px]  border ${selectedActivity.titleBadge.color}`}>
                        {selectedActivity.titleBadge.text}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-gray-500 pl-7">{selectedActivity.user.time} ({selectedActivity.user.date})</p>
                </div>

                {/* Activity Information */}
                <div className="mb-6">
                  <h5 className="text-xs  text-gray-900 mb-3">Activity Information</h5>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[100px_1fr] text-xs">
                      <span className="text-gray-500 font-medium">Module</span>
                      <span className=" text-gray-900">{selectedActivity.metadata.module}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] text-xs">
                      <span className="text-gray-500 font-medium">Project</span>
                      <span className=" text-gray-900">{selectedActivity.metadata.project}</span>
                    </div>
                    {selectedActivity.metadata.task && (
                      <div className="grid grid-cols-[100px_1fr] text-xs">
                        <span className="text-gray-500 font-medium">Task</span>
                        <span className=" text-gray-900">{selectedActivity.metadata.task}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-[100px_1fr] text-xs">
                      <span className="text-gray-500 font-medium">Field Updated</span>
                      <span className=" text-gray-900">{selectedActivity.metadata.fieldUpdated}</span>
                    </div>

                    {selectedActivity.metadata.oldValue && (
                      <div className="grid grid-cols-[100px_1fr] text-xs items-center">
                        <span className="text-gray-500 font-medium">Old Value</span>
                        <div>
                          <span className={`px-2 py-0.5 rounded text-xs  ${selectedActivity.metadata.oldValue.color}`}>
                            {selectedActivity.metadata.oldValue.text}
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedActivity.metadata.newValue && (
                      <div className="grid grid-cols-[100px_1fr] text-xs items-center">
                        <span className="text-gray-500 font-medium">New Value</span>
                        <div>
                          <span className={`px-2 py-0.5 rounded text-xs  ${selectedActivity.metadata.newValue.color}`}>
                            {selectedActivity.metadata.newValue.text}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-[100px_1fr] text-xs items-center">
                      <span className="text-gray-500 font-medium">Updated By</span>
                      <div className="flex items-center gap-1.5">
                        <img src={selectedActivity.user.avatar} alt="Avatar" className="w-4 h-4 rounded-full" />
                        <span className=" text-gray-900">{selectedActivity.user.name}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] text-xs">
                      <span className="text-gray-500 font-medium">IP Address</span>
                      <span className=" text-gray-900">{selectedActivity.metadata.ipAddress}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] text-xs">
                      <span className="text-gray-500 font-medium">User Agent</span>
                      <span className=" text-gray-900">{selectedActivity.metadata.userAgent}</span>
                    </div>
                  </div>
                </div>

                {/* Task Information (if applicable) */}
                {selectedActivity.metadata.taskInfo && (
                  <div className="mb-6 pt-4 border-t border-gray-100">
                    <h5 className="text-xs  text-gray-900 mb-3">Task Information</h5>
                    <div className="space-y-3">
                      <div className="grid grid-cols-[100px_1fr] text-xs items-center">
                        <span className="text-gray-500 font-medium">Priority</span>
                        <div>
                          <span className={`text-xs  ${selectedActivity.metadata.taskInfo.priority.color} px-1.5 py-0.5 rounded`}>
                            {selectedActivity.metadata.taskInfo.priority.text}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-[100px_1fr] text-xs items-center">
                        <span className="text-gray-500 font-medium">Assignee</span>
                        <div className="flex items-center gap-1.5">
                          <img src={selectedActivity.metadata.taskInfo.assignee.avatar} alt="Avatar" className="w-4 h-4 rounded-full" />
                          <span className=" text-gray-900">{selectedActivity.metadata.taskInfo.assignee.name}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-[100px_1fr] text-xs">
                        <span className="text-gray-500 font-medium">Due Date</span>
                        <span className=" text-gray-900">{selectedActivity.metadata.taskInfo.dueDate}</span>
                      </div>
                      {selectedActivity.metadata.taskInfo.sprint && (
                        <div className="grid grid-cols-[100px_1fr] text-xs">
                          <span className="text-gray-500 font-medium">Sprint</span>
                          <span className={` ${selectedActivity.metadata.taskInfo.sprint.color}`}>{selectedActivity.metadata.taskInfo.sprint.text}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-[100px_1fr] text-xs">
                        <span className="text-gray-500 font-medium">Labels</span>
                        <div className="flex gap-1 flex-wrap">
                          {selectedActivity.metadata.taskInfo.labels.map(l => (
                            <span key={l} className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[9px] ">{l}</span>
                          ))}
                          <span className="text-gray-400  ml-1 cursor-pointer">+</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="pt-4 border-t border-gray-100">
                  <h5 className="text-xs  text-gray-900 mb-3">Actions</h5>
                  <button className="w-full flex items-center justify-between p-2 border border-gray-200 rounded text-xs  text-gray-700 hover:bg-gray-50  transition-colors">
                    View Task <ExternalLink size={12} className="text-gray-400" />
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
      <style>{`
        .animate-slide-left { animation: slideLeft 0.3s ease-out forwards; }
        @keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}
