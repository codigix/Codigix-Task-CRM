import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Filter, ChevronDown, Download, Upload, Plus,
  MoreHorizontal, CheckCircle, Clock, Check, Edit3, XCircle, FileText,
  List, LayoutGrid, AlertCircle
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import NewTestCaseModal from './NewTestCaseModal';
import SearchableSelect from '../common/SearchableSelect';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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

const TypeBadge = ({ type }) => {
  let colors = 'text-blue-600 bg-blue-50 border-blue-100';
  return <span className={`text-[11px] font-semibold tracking-wide  px-2 py-1 rounded-sm border ${colors}`}>{type}</span>;
};

const StatusBadge = ({ status }) => {
  let colors = '';
  switch (status) {
    case 'Approved': colors = 'text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium border border-green-100'; break;
    case 'In Review': colors = 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full text-xs font-medium border border-orange-100'; break;
    case 'Ready for Test': colors = 'text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-xs font-medium border border-blue-100'; break;
    case 'Rejected': colors = 'text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium border border-red-100'; break;
    case 'Draft': colors = 'text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full text-xs font-medium border border-gray-200'; break;
    default: colors = 'text-gray-500';
  }
  return <span className={colors}>{status}</span>;
};

const ITTestCasesPage = () => {
  const [activeTab, setActiveTab] = useState('All Test Cases');
  const [testCases, setTestCases] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [projectsData, setProjectsData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filters state
  const [selectedProject, setSelectedProject] = useState('All Projects');
  const [selectedModule, setSelectedModule] = useState('All Modules');
  const [selectedSuite, setSelectedSuite] = useState('All Suites');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedPriority, setSelectedPriority] = useState('All Priorities');
  const [selectedType, setSelectedType] = useState('All Types');

  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchTestCases();
  }, []);

  const fetchTestCases = async () => {
    try {
      const [tcRes, projRes] = await Promise.all([
        fetch(API_BASE_URL + '/tester/test-cases'),
        fetch(API_BASE_URL + '/projects')
      ]);
      const tcData = await tcRes.json();
      const pData = await projRes.json();

      if (tcData.success) {
        setTestCases(tcData.data);
      }
      if (Array.isArray(pData)) {
        setProjectsData(pData);
        setProjectsList(pData.map(p => p.name));
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleTestCreated = (newCase) => {
    setTestCases([newCase, ...testCases]);
    setIsModalOpen(false);
  };

  const handleExport = () => {
    if (filteredTestCases.length === 0) {
      alert('No test cases to export.');
      return;
    }

    const headers = ['TC ID', 'Title', 'Test Suite', 'Module', 'Priority', 'Type', 'Status', 'Created On'];
    const csvContent = [
      headers.join(','),
      ...filteredTestCases.map(tc => {
        return [
          `TC-${tc.id}`,
          `"${(tc.title || '').replace(/"/g, '""')}"`,
          `"${(tc.suite || '').replace(/"/g, '""')}"`,
          `"${(tc.module || '').replace(/"/g, '""')}"`,
          tc.priority,
          tc.type,
          tc.status,
          new Date(tc.created_at).toLocaleDateString()
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'test_cases_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim().length > 0);

      // Assume CSV has headers and we skip the first line
      if (lines.length > 1) {
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          // Basic mapping assuming format: TC ID, Title, Suite, Module, Priority, Type, Status, CreatedOn
          // Or just Title, Module, Priority, Type, Status

          let title = cols[1] || cols[0];
          let module = cols[3] || cols[1] || 'Authentication';
          let priority = cols[4] || cols[2] || 'Medium';
          let type = cols[5] || cols[3] || 'Functional';
          let status = cols[6] || cols[4] || 'Draft';

          await fetch(API_BASE_URL + '/tester/test-cases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: 1,
              title,
              module,
              priority,
              type,
              isAutomated: false,
              status
            })
          });
        }
        await fetchTestCases();
        alert('Import successful!');
      }
    } catch (err) {
      console.error('Import error:', err);
      alert('Failed to import test cases.');

    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const filteredTestCases = testCases.filter((tc) => {
    // Tab filter
    if (activeTab === 'Approved' && tc.status !== 'Approved') return false;
    if (activeTab === 'In Review' && tc.status !== 'In Review') return false;
    if (activeTab === 'Ready for Test' && tc.status !== 'Ready for Test') return false;
    if (activeTab === 'Rejected' && tc.status !== 'Rejected') return false;
    if (activeTab === 'Draft' && tc.status !== 'Draft') return false;

    // Search filter
    if (searchTerm && !tc.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !(`TC-${tc.id}`).toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Dropdown filters
    if (selectedModule !== 'All Modules' && tc.module !== selectedModule) return false;
    if (selectedSuite !== 'All Suites' && tc.suite !== selectedSuite) return false;
    if (selectedStatus !== 'All Status' && tc.status !== selectedStatus) return false;
    if (selectedPriority !== 'All Priorities' && tc.priority !== selectedPriority) return false;
    if (selectedType !== 'All Types' && tc.type !== selectedType) return false;

    return true;
  });

  const tabs = [
    { name: 'All Test Cases', count: testCases.length, color: 'text-blue-600' },
    { name: 'Approved', count: testCases.filter(t => t.status === 'Approved').length, color: 'text-gray-500' },
    { name: 'In Review', count: testCases.filter(t => t.status === 'In Review').length, color: 'text-gray-500' },
    { name: 'Ready for Test', count: testCases.filter(t => t.status === 'Ready for Test').length, color: 'text-gray-500' },
    { name: 'Rejected', count: testCases.filter(t => t.status === 'Rejected').length, color: 'text-gray-500' },
    { name: 'Draft', count: testCases.filter(t => t.status === 'Draft').length, color: 'text-gray-500' },
  ];

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50/30 font-sans text-sm">

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full">
        <div className="p-4 pb-2 w-full mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-gray-900">Test Cases</h1>
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <span>Dashboard</span> <span className="text-gray-400">&gt;</span> <span>Test Cases</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleExport} className="flex items-center gap-2 p-2 border border-gray-200 bg-white rounded text-gray-600 hover:bg-gray-50 ">
                <Download size={14} /> Export
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex items-center gap-2 p-2 border border-gray-200 bg-white rounded text-gray-600 hover:bg-gray-50  disabled:opacity-50"
              >
                <Upload size={14} /> {isImporting ? 'Importing...' : 'Import'}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleImport}
                className="hidden"
              />
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 ml-2 "
              >
                <Plus size={14} /> New Test Case
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-6 gap-3 mb-6">
            <div className="border border-gray-100 rounded p-3 bg-white  flex flex-col justify-center relative">
              <div className="absolute top-3 left-3 w-8 h-8 bg-purple-50 rounded flex items-center justify-center text-purple-600">
                <FileText size={16} />
              </div>
              <div className="pl-11">
                <div className="text-sm text-gray-500 font-medium">Total Test Cases</div>
                <div className="text-xl  text-gray-900 mt-0.5">{testCases.length}</div>
                <div className="text-xs text-gray-400 mt-0.5 font-medium flex items-center gap-0.5">
                  Currently in system
                </div>
              </div>
            </div>

            <div className="border border-gray-100 rounded p-3 bg-white  flex flex-col justify-center relative">
              <div className="absolute top-3 left-3 w-8 h-8 bg-green-50 rounded flex items-center justify-center text-green-600">
                <CheckCircle size={16} />
              </div>
              <div className="pl-11">
                <div className="text-sm text-gray-500 font-medium">Approved</div>
                <div className="text-xl  text-gray-900 mt-0.5">{testCases.filter(t => t.status === 'Approved').length}</div>
                <div className="text-xs text-gray-400 mt-0.5 font-medium flex items-center gap-0.5">
                  {testCases.length ? Math.round((testCases.filter(t => t.status === 'Approved').length / testCases.length) * 100) : 0}% of total
                </div>
              </div>
            </div>

            <div className="border border-gray-100 rounded p-3 bg-white  flex flex-col justify-center relative">
              <div className="absolute top-3 left-3 w-8 h-8 bg-orange-50 rounded flex items-center justify-center text-orange-600">
                <Clock size={16} />
              </div>
              <div className="pl-11">
                <div className="text-sm text-gray-500 font-medium">In Review</div>
                <div className="text-xl  text-gray-900 mt-0.5">{testCases.filter(t => t.status === 'In Review').length}</div>
                <div className="text-xs text-gray-400 mt-0.5 font-medium flex items-center gap-0.5">
                  {testCases.length ? Math.round((testCases.filter(t => t.status === 'In Review').length / testCases.length) * 100) : 0}% of total
                </div>
              </div>
            </div>

            <div className="border border-gray-100 rounded p-3 bg-white  flex flex-col justify-center relative">
              <div className="absolute top-3 left-3 w-8 h-8 bg-blue-50 rounded flex items-center justify-center text-blue-600">
                <Check size={16} />
              </div>
              <div className="pl-11">
                <div className="text-sm text-gray-500 font-medium">Ready for Test</div>
                <div className="text-xl  text-gray-900 mt-0.5">{testCases.filter(t => t.status === 'Ready for Test').length}</div>
                <div className="text-xs text-gray-400 mt-0.5 font-medium flex items-center gap-0.5">
                  {testCases.length ? Math.round((testCases.filter(t => t.status === 'Ready for Test').length / testCases.length) * 100) : 0}% of total
                </div>
              </div>
            </div>

            <div className="border border-gray-100 rounded p-3 bg-white  flex flex-col justify-center relative">
              <div className="absolute top-3 left-3 w-8 h-8 bg-red-50 rounded flex items-center justify-center text-red-600">
                <XCircle size={16} />
              </div>
              <div className="pl-11">
                <div className="text-sm text-gray-500 font-medium">Rejected</div>
                <div className="text-xl  text-gray-900 mt-0.5">{testCases.filter(t => t.status === 'Rejected').length}</div>
                <div className="text-xs text-gray-400 mt-0.5 font-medium flex items-center gap-0.5">
                  {testCases.length ? Math.round((testCases.filter(t => t.status === 'Rejected').length / testCases.length) * 100) : 0}% of total
                </div>
              </div>
            </div>

            <div className="border border-gray-100 rounded p-3 bg-white  flex flex-col justify-center relative">
              <div className="absolute top-3 left-3 w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                <Edit3 size={16} />
              </div>
              <div className="pl-11">
                <div className="text-sm text-gray-500 font-medium">Draft</div>
                <div className="text-xl  text-gray-900 mt-0.5">{testCases.filter(t => t.status === 'Draft').length}</div>
                <div className="text-xs text-gray-400 mt-0.5 font-medium flex items-center gap-0.5">
                  {testCases.length ? Math.round((testCases.filter(t => t.status === 'Draft').length / testCases.length) * 100) : 0}% of total
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
                placeholder="Search projects, tests, bugs, modules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500  bg-white"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">Ctrl + K</div>
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
                options={['All Modules', ...new Set(testCases.map(tc => tc.module).filter(Boolean))]}
                value={selectedModule}
                onChange={setSelectedModule}
              />
              <SearchableSelect
                label="Test Suite"
                options={['All Suites', ...new Set(testCases.map(tc => tc.suite).filter(Boolean))]}
                value={selectedSuite}
                onChange={setSelectedSuite}
              />
              <SearchableSelect
                label="Status"
                options={['All Status', 'Draft', 'Active', 'Obsolete', 'Approved', 'In Review', 'Ready for Test', 'Rejected']}
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
                label="Type"
                options={['All Types', 'Functional', 'Performance', 'Security', 'Integration']}
                value={selectedType}
                onChange={setSelectedType}
              />
            </div>

            <div className="flex items-end gap-2 ml-auto mt-4">
              <button className="flex items-center gap-2 px-4 py-1.5 border border-blue-200 text-blue-600 bg-blue-50 rounded font-medium text-xs ">
                <Filter size={14} /> Filters
              </button>
              <button className="p-1.5 border border-gray-200 bg-white text-gray-500 rounded hover:bg-gray-50 ">
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
                  className={`flex items-center gap-2 pb-3 border-b-2 font-medium text-[13px] transition-colors ${activeTab === tab.name
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {tab.name}
                  <span className={`text-sm px-1.5 py-0.5 rounded-full ${activeTab === tab.name ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
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
                  Created At (Latest) <ChevronDown size={12} />
                </button>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded text-gray-500 shadow-inner">
                <button className="p-1 bg-white rounded "><List size={14} /></button>
                <button className="p-1 hover:text-gray-700"><LayoutGrid size={14} /></button>
              </div>
            </div>
          </div>

          {/* Table Area */}
          <div className="flex flex-col xl:flex-row gap-2 mb-10 items-start">
            <div className="flex-1 w-full min-w-0">
              <div className="bg-white rounded border border-gray-100 overflow-hidden text-[13px] ">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/50 text-gray-500 border-b border-gray-100 font-medium text-xs">
                      <tr>
                        <th className="p-2 w-10">
                          <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        </th>
                        <th className="p-2">TC ID</th>
                        <th className="p-2">Test Case Title</th>
                        <th className="p-2">Test Suite</th>
                        <th className="p-2">Module</th>
                        <th className="p-2">Priority</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Created By</th>
                        <th className="p-2">Created On</th>
                        <th className="p-2 w-10">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredTestCases.map((tc) => (
                        <tr key={tc.id} className="hover:bg-gray-50 cursor-pointer transition-colors group">
                          <td className="p-2">
                            <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" onClick={e => e.stopPropagation()} />
                          </td>
                          <td className="p-2 font-medium text-blue-600 hover:underline">TC-{tc.id}</td>
                          <td className="p-2 text-gray-900 font-medium max-w-[200px] truncate" title={tc.title}>{tc.title}</td>
                          <td className="p-2 text-gray-600">{tc.suite || '-'}</td>
                          <td className="p-2 text-gray-600">{tc.module || '-'}</td>
                          <td className="p-2"><PriorityBadge priority={tc.priority} /></td>
                          <td className="p-2"><TypeBadge type={tc.type} /></td>
                          <td className="p-2"><StatusBadge status={tc.status} /></td>
                          <td className="p-2">
                            <div className="flex items-center gap-1.5">
                              <img src="https://i.pravatar.cc/150?u=1" alt="Creator" className="w-5 h-5 rounded-full bg-gray-200 object-cover" />
                              <span className="text-gray-700 font-medium text-xs">User</span>
                            </div>
                          </td>
                          <td className="p-2 text-gray-500 text-xs whitespace-nowrap">{new Date(tc.created_at).toLocaleDateString()}</td>
                          <td className="p-2 text-center">
                            <button className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200" onClick={e => e.stopPropagation()}>
                              <MoreHorizontal size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between p-4 border-t border-gray-100 text-sm text-gray-500">
                  <div>Showing 1 to {filteredTestCases.length} of {filteredTestCases.length} test cases</div>
                  <div className="flex items-center gap-1">
                    <button className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100">&lt;&lt;</button>
                    <button className="w-7 h-7 flex items-center justify-center rounded border border-blue-600 bg-blue-50 text-blue-600 font-medium">1</button>
                    <button className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100">&gt;&gt;</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 p-2 border border-gray-200 rounded text-gray-700 bg-white">
                      10 / page <ChevronDown size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side Dashboard Panel */}
            <div className="w-full xl:w-[300px] flex flex-col gap-6 shrink-0">

              {/* Test Case Summary (Chart) */}
              <div className="bg-white rounded border border-gray-100  p-2">
                <h3 className="text-[13px]  text-gray-900 mb-4">Test Case Summary</h3>
                <div className="flex items-center gap-4">
                  {/* Mock CSS Donut Chart */}
                  <div className="relative w-28 h-28 shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="16" />
                      {/* Approved: 60.16% (Green) */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="16" strokeDasharray="151.2 251.2" />
                      {/* In Review: 17.58% (Orange) */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" strokeWidth="16" strokeDasharray="44.2 251.2" strokeDashoffset="-151.2" />
                      {/* Ready for Test: 13.60% (Blue) */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="16" strokeDasharray="34.2 251.2" strokeDashoffset="-195.4" />
                      {/* Rejected: 5.36% (Red) */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ef4444" strokeWidth="16" strokeDasharray="13.5 251.2" strokeDashoffset="-229.6" />
                      {/* Draft: 3.30% (Gray) */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#9ca3af" strokeWidth="16" strokeDasharray="8.3 251.2" strokeDashoffset="-243.1" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center mt-0.5">
                      <span className="text-lg  text-gray-900">{testCases.length}</span>
                      <span className="text-[9px] text-gray-500  tracking-wide">Total</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span><span className="text-gray-700 font-medium">Approved</span></div>
                      <div className="text-gray-500">{testCases.filter(t => t.status === 'Approved').length}</div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500"></span><span className="text-gray-700 font-medium">In Review</span></div>
                      <div className="text-gray-500">{testCases.filter(t => t.status === 'In Review').length}</div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span><span className="text-gray-700 font-medium">Ready for Test</span></div>
                      <div className="text-gray-500">{testCases.filter(t => t.status === 'Ready for Test').length}</div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-gray-700 font-medium">Rejected</span></div>
                      <div className="text-gray-500">{testCases.filter(t => t.status === 'Rejected').length}</div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400"></span><span className="text-gray-700 font-medium">Draft</span></div>
                      <div className="text-gray-500">{testCases.filter(t => t.status === 'Draft').length}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Type Distribution */}
              <div className="bg-white rounded border border-gray-100  p-2">
                <h3 className="text-[13px]  text-gray-900 mb-4">Type Distribution</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span><span className="text-gray-700 font-medium">Functional</span></div>
                      <div className="text-gray-500">1,102 <span className="text-gray-400">(75.69%)</span></div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1">
                      <div className="bg-indigo-500 h-1 rounded-full" style={{ width: '75.69%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span><span className="text-gray-700 font-medium">Regression</span></div>
                      <div className="text-gray-500">198 <span className="text-gray-400">(13.60%)</span></div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1">
                      <div className="bg-blue-500 h-1 rounded-full" style={{ width: '13.60%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span><span className="text-gray-700 font-medium">Integration</span></div>
                      <div className="text-gray-500">98 <span className="text-gray-400">(6.73%)</span></div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1">
                      <div className="bg-orange-500 h-1 rounded-full" style={{ width: '6.73%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span><span className="text-gray-700 font-medium">Performance</span></div>
                      <div className="text-gray-500">38 <span className="text-gray-400">(2.61%)</span></div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1">
                      <div className="bg-green-500 h-1 rounded-full" style={{ width: '2.61%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span><span className="text-gray-700 font-medium">Security</span></div>
                      <div className="text-gray-500">20 <span className="text-gray-400">(1.37%)</span></div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1">
                      <div className="bg-red-500 h-1 rounded-full" style={{ width: '1.37%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recently Created */}
              <div className="bg-white rounded border border-gray-100  p-2 flex-1">
                <h3 className="text-[13px]  text-gray-900 mb-4">Recently Created</h3>
                <div className="space-y-4">
                  {testCases.slice(0, 5).map(tc => (
                    <div key={tc.id} className="flex gap-3">
                      <div className="text-[10px] font-medium text-blue-600 shrink-0 w-[50px]">TC-{tc.id}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-gray-800 font-medium leading-tight mb-1 truncate" title={tc.title}>
                          {tc.title}
                        </div>
                      </div>
                      <div className="text-[9px] text-gray-400 shrink-0">{new Date(tc.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-6 py-2 text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1">
                  View All Test Cases &rarr;
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      <NewTestCaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleTestCreated}
      />
    </div>
  );
};

export default ITTestCasesPage;
