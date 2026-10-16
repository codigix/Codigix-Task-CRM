import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Download, Plus,
  MoreHorizontal, Bug, AlertCircle, CheckCircle, Clock,
  List, Maximize2, X, Paperclip
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
    case 'Critical': colors = 'text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-medium'; break;
    case 'Major': colors = 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs font-medium'; break;
    case 'Minor': colors = 'text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-xs font-medium'; break;
    default: colors = 'text-gray-500';
  }
  return <span className={colors}>{severity}</span>;
};

const StatusBadge = ({ status }) => {
  let colors = '';
  switch (status) {
    case 'Open': colors = 'text-red-500 font-medium border border-red-100 bg-red-50 px-2.5 py-0.5 rounded text-xs'; break;
    case 'In Progress': colors = 'text-blue-500 font-medium border border-blue-100 bg-blue-50 px-2.5 py-0.5 rounded text-xs'; break;
    case 'Resolved': colors = 'text-green-500 font-medium border border-green-100 bg-green-50 px-2.5 py-0.5 rounded text-xs'; break;
    case 'Closed': colors = 'text-gray-500 font-medium border border-gray-200 bg-gray-50 px-2.5 py-0.5 rounded text-xs'; break;
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
  const [sortBy, setSortBy] = useState('updated');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      const asList = (d) => (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.value) ? d.value : []);
      const users = asList(usersData);
      setUsersList([...new Set(users.map(u => `${u.first_name || ''} ${u.last_name || ''}`.trim()).filter(Boolean))]);
      const projects = asList(pData);
      setProjectsData(projects);
      setProjectsList([...new Set(projects.map(p => p.name || p.title).filter(Boolean))]);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleBugCreated = (newBug) => {
    setBugs([newBug, ...bugs]);
    setIsReportModalOpen(false);
  };

  // Everything but the status tab, so each tab's count stays right whichever tab is open.
  const selectedProjectId = selectedProject === 'All Projects' ? null
    : (projectsData.find(p => (p.name || p.title) === selectedProject) || {}).id;
  const baseBugs = bugs.filter((bug) => {
    const q = searchTerm.trim().toLowerCase();
    if (q && !String(bug.title || '').toLowerCase().includes(q) && !`bug-${bug.id}`.includes(q) && !String(bug.description || '').toLowerCase().includes(q)) {
      return false;
    }
    if (selectedProjectId != null && Number(bug.project_id) !== Number(selectedProjectId)) return false;

    // Dropdown filters
    // Note: MOCK_BUGS doesn't have a explicit project field in this mock, we can ignore project for now or mock it
    if (selectedModule !== 'All Modules' && bug.module !== selectedModule) return false;
    if (selectedStatus !== 'All Status' && bug.status !== selectedStatus) return false;
    if (selectedPriority !== 'All Priorities' && bug.priority !== selectedPriority) return false;
    if (selectedSeverity !== 'All Severities' && bug.severity !== selectedSeverity) return false;
    if (selectedAssignee !== 'All Assignees' && bug.assignee !== selectedAssignee) return false;

    return true;
  });
  const RANK = { High: 3, Critical: 3, Major: 2, Medium: 2, Minor: 1, Low: 1 };
  const sorted = [...baseBugs].sort((a, b) => {
    if (sortBy === 'reported') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'priority') return (RANK[b.priority] || 0) - (RANK[a.priority] || 0) || new Date(b.updated_at) - new Date(a.updated_at);
    if (sortBy === 'severity') return (RANK[b.severity] || 0) - (RANK[a.severity] || 0) || new Date(b.updated_at) - new Date(a.updated_at);
    return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
  });
  const filteredBugs = activeTab === 'All Bugs' ? sorted : sorted.filter(b => b.status === activeTab);
  const pageCount = Math.max(1, Math.ceil(filteredBugs.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageBugs = filteredBugs.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Real month-on-month figure: bugs reported this month vs last month.
  const monthKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}`; };
  const nowD = new Date();
  const thisMonth = `${nowD.getFullYear()}-${nowD.getMonth()}`;
  const prevD = new Date(nowD.getFullYear(), nowD.getMonth() - 1, 1);
  const lastMonth = `${prevD.getFullYear()}-${prevD.getMonth()}`;
  const newThisMonth = bugs.filter(b => b.created_at && monthKey(b.created_at) === thisMonth).length;
  const newLastMonth = bugs.filter(b => b.created_at && monthKey(b.created_at) === lastMonth).length;
  const shareOf = (n) => (bugs.length ? `${Math.round((n / bugs.length) * 100)}% of all bugs` : 'No bugs yet');

  const exportCsv = () => {
    const cols = ['Bug ID', 'Title', 'Module', 'Priority', 'Severity', 'Status', 'Assignee', 'Reporter', 'Reported On', 'Updated On'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = filteredBugs.map(b => [`BUG-${b.id}`, b.title, b.module, b.priority, b.severity, b.status, b.assignee, b.reporter,
      b.created_at ? new Date(b.created_at).toLocaleDateString('en-GB') : '', b.updated_at ? new Date(b.updated_at).toLocaleDateString('en-GB') : ''].map(esc).join(','));
    const blob = new Blob([[cols.map(esc).join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bugs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const dynamicModules = ['All Modules', ...new Set(bugs.map(b => b.module).filter(Boolean))];

  const tabs = [
    { name: 'All Bugs', count: baseBugs.length, color: 'text-blue-600' },
    { name: 'Open', count: baseBugs.filter(b => b.status === 'Open').length, color: 'text-gray-500' },
    { name: 'In Progress', count: baseBugs.filter(b => b.status === 'In Progress').length, color: 'text-gray-500' },
    { name: 'Resolved', count: baseBugs.filter(b => b.status === 'Resolved').length, color: 'text-gray-500' },
    { name: 'Closed', count: baseBugs.filter(b => b.status === 'Closed').length, color: 'text-gray-500' },
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
                <h1 className="text-2xl  text-gray-900">Bug Tracking</h1>
                <Bug size={20} className="text-gray-400" />
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <span>Dashboard</span> <span className="text-gray-400">&gt;</span> <span>Bug Tracking</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={exportCsv} disabled={!filteredBugs.length} className="flex items-center gap-2 p-2 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50" title="Download the bugs shown as a CSV file">
                <Download size={14} /> Export
              </button>
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white rounded hover:bg-blue-700 ml-2 "
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
                <div className="text-xs text-gray-500 mt-1">{newThisMonth} new this month · {newLastMonth} last month</div>
              </div>
            </div>

            <div className="border border-gray-100 rounded p-4 bg-white  flex flex-col justify-center relative">
              <div className="absolute top-4 left-4 w-10 h-10 bg-red-50 rounded flex items-center justify-center text-red-500">
                <AlertCircle size={20} />
              </div>
              <div className="pl-14">
                <div className="text-xs text-gray-500 font-medium">Open Bugs</div>
                <div className="text-2xl  text-gray-900 mt-1">{bugs.filter(b => b.status === 'Open').length}</div>
                <div className="text-xs text-gray-500 mt-1">{shareOf(bugs.filter(b => b.status === 'Open').length)}</div>
              </div>
            </div>

            <div className="border border-gray-100 rounded p-4 bg-white  flex flex-col justify-center relative">
              <div className="absolute top-4 left-4 w-10 h-10 bg-orange-50 rounded flex items-center justify-center text-orange-500">
                <Clock size={20} />
              </div>
              <div className="pl-14">
                <div className="text-xs text-gray-500 font-medium">In Progress</div>
                <div className="text-2xl  text-gray-900 mt-1">{bugs.filter(b => b.status === 'In Progress').length}</div>
                <div className="text-xs text-gray-500 mt-1">{shareOf(bugs.filter(b => b.status === 'In Progress').length)}</div>
              </div>
            </div>

            <div className="border border-gray-100 rounded p-4 bg-white  flex flex-col justify-center relative">
              <div className="absolute top-4 left-4 w-10 h-10 bg-green-50 rounded flex items-center justify-center text-green-500">
                <CheckCircle size={20} />
              </div>
              <div className="pl-14">
                <div className="text-xs text-gray-500 font-medium">Resolved</div>
                <div className="text-2xl  text-gray-900 mt-1">{bugs.filter(b => b.status === 'Resolved').length}</div>
                <div className="text-xs text-gray-500 mt-1">{shareOf(bugs.filter(b => b.status === 'Resolved').length)}</div>
              </div>
            </div>

            <div className="border border-gray-100 rounded p-4 bg-white  flex flex-col justify-center relative">
              <div className="absolute top-4 left-4 w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                <List size={20} />
              </div>
              <div className="pl-14">
                <div className="text-xs text-gray-500 font-medium">Closed</div>
                <div className="text-2xl  text-gray-900 mt-1">{bugs.filter(b => b.status === 'Closed').length}</div>
                <div className="text-xs text-gray-500 mt-1">{shareOf(bugs.filter(b => b.status === 'Closed').length)}</div>
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
                  <span className={`text-xs px-1.5 py-0.5 rounded ${activeTab === tab.name ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 pb-3">
              <label className="flex items-center gap-2 text-xs text-gray-500">
                <span>Sort by:</span>
                <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className="font-medium text-gray-700 bg-transparent border border-gray-200 rounded px-1.5 py-1 outline-none cursor-pointer">
                  <option value="updated">Updated (latest)</option>
                  <option value="reported">Reported (latest)</option>
                  <option value="priority">Priority (high first)</option>
                  <option value="severity">Severity (critical first)</option>
                </select>
              </label>
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
                  {pageBugs.length === 0 && (
                    <tr><td colSpan={11} className="p-8 text-center text-gray-400">{bugs.length ? 'No bugs match these filters.' : 'No bugs reported yet. Use “Report New Bug” to add one.'}</td></tr>
                  )}
                  {pageBugs.map((bug) => (
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
                          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(bug.assignee || 'U')}&background=random`} alt={bug.assignee} className="w-6 h-6 rounded bg-gray-200 object-cover" />
                          <span className="text-gray-700 font-medium">{bug.assignee}</span>
                        </div>
                      </td>
                      <td className="p-2 text-gray-500">{bug.created_at ? new Date(bug.created_at).toLocaleDateString('en-GB') : '—'}</td>
                      <td className="p-2 text-gray-500">{bug.updated_at ? new Date(bug.updated_at).toLocaleDateString('en-GB') : '—'}</td>
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
              <div>
                {filteredBugs.length
                  ? `Showing ${(safePage - 1) * pageSize + 1} to ${Math.min(safePage * pageSize, filteredBugs.length)} of ${filteredBugs.length} bugs`
                  : 'Showing 0 bugs'}
              </div>
              <div className="flex items-center gap-1">
                <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40" aria-label="Previous page">&lt;</button>
                {Array.from({ length: pageCount }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === pageCount || Math.abs(n - safePage) <= 1)
                  .map((n, i, arr) => (
                    <React.Fragment key={n}>
                      {i > 0 && n - arr[i - 1] > 1 && <span className="mx-1 text-gray-400">…</span>}
                      <button onClick={() => setPage(n)} className={`w-8 h-8 flex items-center justify-center rounded ${n === safePage ? 'border border-blue-600 bg-blue-50 text-blue-600 font-medium' : 'hover:bg-gray-100'}`}>{n}</button>
                    </React.Fragment>
                  ))}
                <button disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)} className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40" aria-label="Next page">&gt;</button>
              </div>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="p-2 border border-gray-200 rounded text-gray-700 bg-white text-xs" aria-label="Bugs per page">
                {[10, 25, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
              </select>
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
                <h2 className=" text-gray-900">BUG-{selectedBug.id}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Expand"><Maximize2 size={14} /></button>
                <button onClick={() => setIsDrawerOpen(false)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Close"><X size={14} /></button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto text-sm custom-scrollbar bg-white">
              <div className="flex items-start gap-4 mb-8">
                <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <Bug size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl  text-gray-900">{selectedBug.title}</h2>
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
                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedBug.assignee || 'U')}&background=random`} alt="Avatar" className="w-6 h-6 rounded object-cover" />
                    <span className="font-medium text-gray-900">{selectedBug.assignee}</span>
                  </div>
                </div>
                <div className="flex gap-8 mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Reported By</div>
                    <div className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedBug.reporter || 'U')}&background=random`} alt="reporter" className="w-6 h-6 rounded" />
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
                <h4 className=" text-gray-900 mb-2">Description</h4>
                <p className="text-gray-600 leading-relaxed text-[13px]">
                  {selectedBug.description || 'No description provided.'}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-white">
              <button className="px-4 py-1.5 border border-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 flex items-center gap-2  transition">
                Edit Bug
              </button>
              <button className="px-4 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-blue-700 flex items-center gap-2  transition">
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
