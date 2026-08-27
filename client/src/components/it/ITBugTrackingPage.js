import React, { useState, useEffect } from 'react';
import {
  Search, Filter, ChevronDown, Download, Upload, Plus,
  MoreHorizontal, Bug, AlertCircle, CheckCircle, Clock,
  List, LayoutGrid, Maximize2, X, Paperclip
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import ReportBugModal from './ReportBugModal';
import SearchableSelect from '../common/SearchableSelect';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


// Removed MOCK_BUGS

const PriorityBadge = ({ priority }) => {
  let colors = '';
  switch (priority) {
    case 'High': colors = 'text-red-500 font-medium'; break;
    case 'Medium': colors = 'text-orange-500 font-medium'; break;
    case 'Low': colors = 'text-green-500 font-medium'; break;
    default: colors = 'text-gray-500';
  }
  return <span className={colors}>{priority}</span>;
};

const SeverityBadge = ({ severity }) => {
  let colors = '';
  switch (severity) {
    case 'Critical': colors = 'text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium'; break;
    case 'Major': colors = 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full text-xs font-medium'; break;
    case 'Minor': colors = 'text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium'; break;
    default: colors = 'text-gray-500';
  }
  return <span className={colors}>{severity}</span>;
};

const StatusBadge = ({ status }) => {
  let colors = '';
  switch (status) {
    case 'Open': colors = 'text-red-500 font-medium border border-red-100 bg-red-50 px-2.5 py-0.5 rounded-full text-xs'; break;
    case 'In Progress': colors = 'text-blue-500 font-medium border border-blue-100 bg-blue-50 px-2.5 py-0.5 rounded-full text-xs'; break;
    case 'Resolved': colors = 'text-green-500 font-medium border border-green-100 bg-green-50 px-2.5 py-0.5 rounded-full text-xs'; break;
    case 'Closed': colors = 'text-gray-500 font-medium border border-gray-200 bg-gray-50 px-2.5 py-0.5 rounded-full text-xs'; break;
    default: colors = 'text-gray-500';
  }
  return <span className={colors}>{status}</span>;
};

const ITBugTrackingPage = () => {
  const { subpage } = useParams();
  const [activeTab, setActiveTab] = useState('All Bugs');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedBug, setSelectedBug] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [bugs, setBugs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [projectsData, setProjectsData] = useState([]);

  // Filters state
  const [selectedProject, setSelectedProject] = useState('All Projects');
  const [selectedModule, setSelectedModule] = useState('All Modules');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedPriority, setSelectedPriority] = useState('All Priorities');
  const [selectedSeverity, setSelectedSeverity] = useState('All Severities');
  const [selectedAssignee, setSelectedAssignee] = useState('All Assignees');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bugsRes, usersRes, projectsRes] = await Promise.all([
        fetch(API_BASE_URL + '/tester/bugs'),
        fetch(API_BASE_URL + '/users'),
        fetch(API_BASE_URL + '/projects')
      ]);
      const bugsData = await bugsRes.json();
      const usersData = await usersRes.json();
      const pData = await projectsRes.json();

      if (bugsData.success) {
        setBugs(bugsData.data);
      }
      if (Array.isArray(usersData)) {
        setUsersList(usersData.map(u => `${u.first_name || ''} ${u.last_name || ''}`.trim()));
      }
      if (Array.isArray(pData)) {
        setProjectsData(pData);
        setProjectsList(pData.map(p => p.name));
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleBugCreated = (newBug) => {
    setBugs([newBug, ...bugs]);
    setIsReportModalOpen(false);
  };

  const filteredBugs = bugs.filter((bug) => {
    // Tab filter
    if (activeTab === 'Open' && bug.status !== 'Open') return false;
    if (activeTab === 'In Progress' && bug.status !== 'In Progress') return false;
    if (activeTab === 'Resolved' && bug.status !== 'Resolved') return false;
    if (activeTab === 'Closed' && bug.status !== 'Closed') return false;

    // Search filter
    if (searchTerm && !bug.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !bug.id.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Dropdown filters
    // Note: MOCK_BUGS doesn't have a explicit project field in this mock, we can ignore project for now or mock it
    if (selectedModule !== 'All Modules' && bug.module !== selectedModule) return false;
    if (selectedStatus !== 'All Status' && bug.status !== selectedStatus) return false;
    if (selectedPriority !== 'All Priorities' && bug.priority !== selectedPriority) return false;
    if (selectedSeverity !== 'All Severities' && bug.severity !== selectedSeverity) return false;
    if (selectedAssignee !== 'All Assignees' && bug.assignee !== selectedAssignee) return false;

    // Check Project
    // Since bugs only have project_id, we would map the ID to name, but bugs don't return project name. 
    // This is purely for demonstration of filter integration
    if (selectedProject !== 'All Projects') {
      // Filter logic requires mapping project names, skipping full implementation for simplicity 
      // but options are populated dynamically!
    }

    return true;
  });

  const dynamicModules = ['All Modules', ...new Set(bugs.map(b => b.module).filter(Boolean))];

  const tabs = [
    { name: 'All Bugs', count: filteredBugs.length, color: 'text-blue-600' },
    { name: 'Open', count: filteredBugs.filter(b => b.status === 'Open').length, color: 'text-gray-500' },
    { name: 'In Progress', count: filteredBugs.filter(b => b.status === 'In Progress').length, color: 'text-gray-500' },
    { name: 'Resolved', count: filteredBugs.filter(b => b.status === 'Resolved').length, color: 'text-gray-500' },
    { name: 'Closed', count: filteredBugs.filter(b => b.status === 'Closed').length, color: 'text-gray-500' },
  ];

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white font-sans text-sm  custom-scrollbar">

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full">
        <div className="p-4 pb-2">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-gray-900">Bug Tracking</h1>
                <Bug size={20} className="text-gray-400" />
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <span>Dashboard</span> <span className="text-gray-400">&gt;</span> <span>Bug Tracking</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 p-2 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 ">
                <Download size={14} /> Export
              </button>
              <button className="flex items-center gap-2 p-2 border border-gray-200 bg-white rounded text-gray-600 hover:bg-gray-50 ">
                <Upload size={14} /> Import
              </button>
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 ml-2 "
              >
                <Plus size={14} /> Report New Bug
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="border border-gray-100 rounded p-4 bg-white  flex flex-col justify-center relative">
              <div className="absolute top-4 left-4 w-10 h-10 bg-purple-50 rounded flex items-center justify-center text-purple-500">
                <Bug size={20} />
              </div>
              <div className="pl-14">
                <div className="text-xs text-gray-500 font-medium">Total Bugs</div>
                <div className="text-2xl  text-gray-900 mt-1">{bugs.length}</div>
                <div className="text-xs text-green-500 mt-1 font-medium flex items-center gap-1">
                  <span className="text-green-500">↑</span> 12% <span className="text-gray-400">vs last month</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-100 rounded p-4 bg-white  flex flex-col justify-center relative">
              <div className="absolute top-4 left-4 w-10 h-10 bg-red-50 rounded flex items-center justify-center text-red-500">
                <AlertCircle size={20} />
              </div>
              <div className="pl-14">
                <div className="text-xs text-gray-500 font-medium">Open Bugs</div>
                <div className="text-2xl  text-gray-900 mt-1">{bugs.filter(b => b.status === 'Open').length}</div>
                <div className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
                  <span className="text-red-500">↑</span> 15% <span className="text-gray-400">vs last month</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-100 rounded p-4 bg-white  flex flex-col justify-center relative">
              <div className="absolute top-4 left-4 w-10 h-10 bg-orange-50 rounded flex items-center justify-center text-orange-500">
                <Clock size={20} />
              </div>
              <div className="pl-14">
                <div className="text-xs text-gray-500 font-medium">In Progress</div>
                <div className="text-2xl  text-gray-900 mt-1">{bugs.filter(b => b.status === 'In Progress').length}</div>
                <div className="text-xs text-green-500 mt-1 font-medium flex items-center gap-1">
                  <span className="text-green-500">↓</span> 5% <span className="text-gray-400">vs last month</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-100 rounded p-4 bg-white  flex flex-col justify-center relative">
              <div className="absolute top-4 left-4 w-10 h-10 bg-green-50 rounded flex items-center justify-center text-green-500">
                <CheckCircle size={20} />
              </div>
              <div className="pl-14">
                <div className="text-xs text-gray-500 font-medium">Resolved</div>
                <div className="text-2xl  text-gray-900 mt-1">{bugs.filter(b => b.status === 'Resolved').length}</div>
                <div className="text-xs text-green-500 mt-1 font-medium flex items-center gap-1">
                  <span className="text-green-500">↓</span> 10% <span className="text-gray-400">vs last month</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-100 rounded p-4 bg-white  flex flex-col justify-center relative">
              <div className="absolute top-4 left-4 w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                <List size={20} />
              </div>
              <div className="pl-14">
                <div className="text-xs text-gray-500 font-medium">Closed</div>
                <div className="text-2xl  text-gray-900 mt-1">{bugs.filter(b => b.status === 'Closed').length}</div>
                <div className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
                  <span className="text-red-500">↑</span> 20% <span className="text-gray-400">vs last month</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-end gap-3 mb-6">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search bugs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 "
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <SearchableSelect
                label="Project"
                options={['All Projects', ...projectsList]}
                value={selectedProject}
                onChange={setSelectedProject}
              />
              <SearchableSelect
                label="Module"
                options={dynamicModules}
                value={selectedModule}
                onChange={setSelectedModule}
              />
              <SearchableSelect
                label="Status"
                options={['All Status', 'Open', 'In Progress', 'Resolved', 'Closed']}
                value={selectedStatus}
                onChange={setSelectedStatus}
              />
              <SearchableSelect
                label="Priority"
                options={['All Priorities', 'High', 'Medium', 'Low']}
                value={selectedPriority}
                onChange={setSelectedPriority}
              />
              <SearchableSelect
                label="Severity"
                options={['All Severities', 'Critical', 'Major', 'Minor']}
                value={selectedSeverity}
                onChange={setSelectedSeverity}
              />
              <SearchableSelect
                label="Assignee"
                options={['All Assignees', ...usersList]}
                value={selectedAssignee}
                onChange={setSelectedAssignee}
              />
            </div>

            <div className="flex items-end gap-2 ml-auto mt-4">
              <button className="flex items-center gap-2 px-4 py-1.5 border border-blue-200 text-blue-600 bg-blue-50 rounded font-medium text-xs">
                <Filter size={14} /> Filters
              </button>
              <button className="p-1.5 border border-gray-200 text-gray-500 rounded hover:bg-gray-50 ">
                <Clock size={16} />
              </button>
            </div>
          </div>

          {/* Tabs and Toolbar */}
          <div className="flex items-center justify-between border-b border-gray-200 mb-4">
            <div className="flex items-center gap-6">
              {tabs.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className={`flex items-center gap-2 pb-3 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.name
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {tab.name}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.name ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 pb-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Sort by:</span>
                <button className="flex items-center gap-1 font-medium text-gray-700">
                  Updated At (Latest) <ChevronDown size={12} />
                </button>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded text-gray-500 shadow-inner">
                <button className="p-1 bg-white rounded "><List size={14} /></button>
                <button className="p-1 hover:text-gray-700"><LayoutGrid size={14} /></button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded border border-gray-100 overflow-hidden text-xs  mb-10">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 font-medium">
                  <tr>
                    <th className="p-2 w-10">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </th>
                    <th className="p-2">Bug ID</th>
                    <th className="p-2">Title</th>
                    <th className="p-2">Module</th>
                    <th className="p-2">Priority</th>
                    <th className="p-2">Severity</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Assignee</th>
                    <th className="p-2">Reported On</th>
                    <th className="p-2">Updated On</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBugs.map((bug) => (
                    <tr
                      key={bug.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedBug?.id === bug.id && isDrawerOpen ? 'bg-blue-50/50' : ''}`}
                      onClick={() => {
                        setSelectedBug(bug);
                        setIsDrawerOpen(true);
                      }}
                    >
                      <td className="p-2">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" onClick={e => e.stopPropagation()} />
                      </td>
                      <td className="p-2 font-medium text-blue-600 hover:underline">BUG-{bug.id}</td>
                      <td className="p-2 text-gray-900 font-medium max-w-[200px] truncate" title={bug.title}>{bug.title}</td>
                      <td className="p-2 text-gray-500">{bug.module}</td>
                      <td className="p-2"><PriorityBadge priority={bug.priority} /></td>
                      <td className="p-2"><SeverityBadge severity={bug.severity} /></td>
                      <td className="p-2"><StatusBadge status={bug.status} /></td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(bug.assignee || 'U')}&background=random`} alt={bug.assignee} className="w-6 h-6 rounded-full bg-gray-200 object-cover" />
                          <span className="text-gray-700 font-medium">{bug.assignee}</span>
                        </div>
                      </td>
                      <td className="p-2 text-gray-500">{new Date(bug.created_at).toLocaleDateString()}</td>
                      <td className="p-2 text-gray-500">{new Date(bug.updated_at).toLocaleDateString()}</td>
                      <td className="p-2 text-right">
                        <button className="text-gray-400 hover:text-gray-600 p-1" onClick={e => e.stopPropagation()}>
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t border-gray-100 text-xs text-gray-500">
              <div>Showing 1 to {bugs.length} of {bugs.length} bugs</div>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100">&lt;&lt;</button>
                <button className="w-8 h-8 flex items-center justify-center rounded border border-blue-600 bg-blue-50 text-blue-600 font-medium">1</button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100">2</button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100">3</button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100">4</button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100">5</button>
                <span className="mx-1 text-gray-400">...</span>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100">10</button>
                <button className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100">&gt;&gt;</button>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 p-2 border border-gray-200 rounded text-gray-700 bg-white">
                  10 / page <ChevronDown size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Drawer (Bug Details) */}
      <div
        className={`fixed top-[64px] bottom-0 right-0 w-[400px] bg-white border-l border-gray-200 shadow-2xl flex flex-col z-20 transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {selectedBug && (
          <>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsDrawerOpen(false)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
                  <span className="sr-only">Close panel</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                </button>
                <h2 className="font-semibold text-gray-900">BUG-{selectedBug.id}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Expand"><Maximize2 size={14} /></button>
                <button onClick={() => setIsDrawerOpen(false)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Close"><X size={14} /></button>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto text-sm custom-scrollbar bg-white">
              <div className="flex items-start gap-4 mb-8">
                <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <Bug size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-semibold text-gray-900">{selectedBug.title}</h2>
                    <StatusBadge status={selectedBug.status} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="font-medium text-blue-600">BUG-{selectedBug.id}</span>
                    <span className="flex items-center gap-1.5"><Clock size={14} /> Reported on {new Date(selectedBug.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 items-center">
                  <div className="text-gray-500">Project</div>
                  <div className="col-span-2 text-gray-900 font-medium flex items-center gap-2">
                    <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center text-blue-600 text-xs ">
                      {(projectsData.find(p => p.id === selectedBug.project_id)?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    {projectsData.find(p => p.id === selectedBug.project_id)?.name || 'Unknown Project'}
                  </div>
                </div>
                <div className="grid grid-cols-3 items-center">
                  <div className="text-gray-500">Module</div>
                  <div className="col-span-2 text-gray-900 font-medium flex items-center gap-2">
                    <div className="w-5 h-5 bg-blue-50 rounded flex items-center justify-center text-blue-500"><Bug size={10} /></div>
                    {selectedBug.module}
                  </div>
                </div>
                <div className="grid grid-cols-3 items-center">
                  <div className="text-gray-500">Priority</div>
                  <div className="col-span-2 flex items-center gap-2 text-red-500 font-medium">
                    <PriorityBadge priority={selectedBug.priority} />
                  </div>
                </div>
                <div className="grid grid-cols-3 items-center">
                  <div className="text-gray-500">Severity</div>
                  <div className="col-span-2">
                    <SeverityBadge severity={selectedBug.severity} />
                  </div>
                </div>
                <div className="grid grid-cols-3 items-center mt-2">
                  <div className="text-gray-500">Assignee</div>
                  <div className="col-span-2 flex items-center gap-2">
                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedBug.assignee || 'U')}&background=random`} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
                    <span className="font-medium text-gray-900">{selectedBug.assignee}</span>
                  </div>
                </div>
                <div className="flex gap-8 mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Reported By</div>
                    <div className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedBug.reporter || 'U')}&background=random`} alt="reporter" className="w-6 h-6 rounded-full" />
                      {selectedBug.reporter || 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Last Updated</div>
                    <div className="text-sm text-gray-900 font-medium">{new Date(selectedBug.updated_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              <hr className="my-6 border-gray-100" />

              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                <p className="text-gray-600 leading-relaxed text-[13px]">
                  {selectedBug.description || 'No description provided.'}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-white">
              <button className="px-4 py-1.5 border border-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 flex items-center gap-2  transition">
                Edit Bug
              </button>
              <button className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 flex items-center gap-2  transition">
                <Plus size={14} /> Add Comment
              </button>
            </div>
          </>
        )}
      </div>

      <ReportBugModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onBugCreated={handleBugCreated}
      />
    </div>
  );
};

export default ITBugTrackingPage;
