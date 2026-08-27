import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Menu, Search, Bell, Mail, ChevronDown, CheckCircle, XCircle, AlertCircle, ShieldAlert,
  PlayCircle, FileText, List, CheckSquare, Bug, UserCheck, Settings, Wrench, BarChart2, Check, ExternalLink, Calendar,
  MoreVertical, Activity, Hexagon
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import NewTestCaseModal from './NewTestCaseModal';
import AdvancedDateRangePicker from '../common/AdvancedDateRangePicker';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


export default function ITTesterDashboard() {
  const { username: name } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isTestCaseModalOpen, setIsTestCaseModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ start: null, end: null, label: 'Last 30 Days' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/tester/dashboard/${name}`, {
          params: { start: dateRange.start, end: dateRange.end }
        });
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [name, dateRange]);

  if (loading || !data) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading Dashboard...</div>;
  }

  const COLORS = {
    passed: '#22c55e',
    failed: '#ef4444',
    blocked: '#f59e0b',
    new: '#3b82f6',
    assigned: '#f59e0b',
    inProgress: '#8b5cf6',
    resolved: '#10b981',
    closed: '#6b7280'
  };

  const statusData = [
    { name: 'Passed', value: data.kpis.passedTests, color: COLORS.passed },
    { name: 'Failed', value: data.kpis.failedTests, color: COLORS.failed },
    { name: 'Blocked', value: data.kpis.blockedTests, color: COLORS.blocked }
  ];

  const bugData = [
    { name: 'New', value: data.bugStatusOverview.new, color: COLORS.new },
    { name: 'Assigned', value: data.bugStatusOverview.assigned, color: COLORS.assigned },
    { name: 'In Progress', value: data.bugStatusOverview.inProgress, color: COLORS.inProgress },
    { name: 'Resolved', value: data.bugStatusOverview.resolved, color: COLORS.resolved },
    { name: 'Closed', value: data.bugStatusOverview.closed, color: COLORS.closed }
  ];

  const coverageData = [
    { name: 'Covered', value: data.testCaseCoverage.coveredPercent, color: '#10b981' },
    { name: 'Not Covered', value: data.testCaseCoverage.notCoveredPercent, color: '#e5e7eb' }
  ];

  const automationData = [
    { name: 'Success', value: data.automationSummary.successRate, color: '#10b981' },
    { name: 'Failed', value: 100 - data.automationSummary.successRate, color: '#e5e7eb' }
  ];

  return (
    <div className="bg-[#f8fafc] min-h-screen p-6 font-sans text-gray-900 custom-scrollbar">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl  text-gray-900 flex items-center gap-2">IT Tester Dashboard <ShieldAlert size={20} className="text-blue-500" /></h1>
          <p className="text-gray-500 mt-1">Welcome back, <span className="capitalize">{name}</span> Patil! Here's what's happening with your testing activities.</p>
        </div>
        <div className="flex items-center gap-3">
          <AdvancedDateRangePicker
            range={dateRange}
            onChange={setDateRange}
            initialRange="Last 30 Days"
          />
          <button
            onClick={() => setIsTestCaseModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded  font-medium flex items-center gap-2 transition-colors"
          >
            + Create Test
          </button>
        </div>
      </div>

      <NewTestCaseModal
        isOpen={isTestCaseModalOpen}
        onClose={() => setIsTestCaseModalOpen(false)}
        onSuccess={() => {
          setIsTestCaseModalOpen(false);
          // Optional: re-fetch dashboard data
          const fetchData = async () => {
            try {
              const res = await axios.get(`${API_BASE_URL}/tester/dashboard/${name}`);
              if (res.data.success) {
                setData(res.data.data);
              }
            } catch (err) { }
          };
          fetchData();
        }}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded p-4  border border-gray-100 flex items-start gap-4">
          <div className="w-10 h-10 rounded bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-600"><FileText size={20} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Total Test Cases</p>
            <h3 className="text-xl  text-gray-900">{data.kpis.totalTestCases}</h3>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><Check size={10} /> 12% vs last month</p>
          </div>
        </div>
        <div className="bg-white rounded p-4  border border-gray-100 flex items-start gap-4">
          <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center shrink-0 text-blue-600"><PlayCircle size={20} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Executed Tests</p>
            <h3 className="text-xl  text-gray-900">{data.kpis.executedTests}</h3>
            <p className="text-xs text-gray-500 mt-1">{Math.round((data.kpis.executedTests / data.kpis.totalTestCases) * 100) || 0}% of total</p>
          </div>
        </div>
        <div className="bg-white rounded p-4  border border-gray-100 flex items-start gap-4">
          <div className="w-10 h-10 rounded bg-green-50 flex items-center justify-center shrink-0 text-green-600"><CheckCircle size={20} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Passed Tests</p>
            <h3 className="text-xl  text-gray-900">{data.kpis.passedTests}</h3>
            <p className="text-xs text-green-600 mt-1">{Math.round((data.kpis.passedTests / data.kpis.executedTests) * 100) || 0}% of executed</p>
          </div>
        </div>
        <div className="bg-white rounded p-4  border border-gray-100 flex items-start gap-4">
          <div className="w-10 h-10 rounded bg-red-50 flex items-center justify-center shrink-0 text-red-600"><XCircle size={20} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Failed Tests</p>
            <h3 className="text-xl  text-gray-900">{data.kpis.failedTests}</h3>
            <p className="text-xs text-gray-500 mt-1">{Math.round((data.kpis.failedTests / data.kpis.executedTests) * 100) || 0}% of executed</p>
          </div>
        </div>
        <div className="bg-white rounded p-4  border border-gray-100 flex items-start gap-4">
          <div className="w-10 h-10 rounded bg-amber-50 flex items-center justify-center shrink-0 text-amber-600"><AlertCircle size={20} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Blocked Tests</p>
            <h3 className="text-xl  text-gray-900">{data.kpis.blockedTests}</h3>
            <p className="text-xs text-gray-500 mt-1">{Math.round((data.kpis.blockedTests / data.kpis.executedTests) * 100) || 0}% of executed</p>
          </div>
        </div>
        <div className="bg-white rounded p-4  border border-gray-100 flex items-start gap-4">
          <div className="w-10 h-10 rounded bg-rose-50 flex items-center justify-center shrink-0 text-rose-600"><Bug size={20} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Open Bugs</p>
            <h3 className="text-xl  text-gray-900">{data.kpis.openBugsCount}</h3>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><Check size={10} /> 8% vs last month</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Line Chart */}
        <div className="bg-white p-2 rounded  border border-gray-100 lg:col-span-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className=" text-gray-900">Test Execution Trend</h3>
            <div className="text-xs text-gray-500 flex items-center gap-1 cursor-pointer border border-gray-200 px-2 py-1 rounded">Last 6 Months <ChevronDown size={12} /></div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                <RechartsTooltip contentStyle={{ fontSize: '12px', borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="total" name="Total" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="passed" name="Passed" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="failed" name="Failed" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Donut */}
        <div className="bg-white p-2 rounded  border border-gray-100">
          <h3 className=" text-gray-900 mb-2">Tests by Status</h3>
          <div className="flex items-center justify-center h-52 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                  {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ fontSize: '12px', borderRadius: '4px', border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl  text-gray-900">{data.kpis.executedTests}</span>
              <span className="text-xs text-gray-500">Executed</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            {statusData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div><span className="text-gray-700">{d.name}</span></div>
                <div className="font-medium">{d.value} <span className="text-gray-400 font-normal">({Math.round((d.value / data.kpis.executedTests) * 100) || 0}%)</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* Bug Donut */}
        <div className="bg-white p-2 rounded  border border-gray-100">
          <h3 className=" text-gray-900 mb-2">Bug Status Overview</h3>
          <div className="flex items-center justify-center h-52 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bugData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                  {bugData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ fontSize: '12px', borderRadius: '4px', border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl  text-gray-900">{data.kpis.openBugsCount}</span>
              <span className="text-xs text-gray-500">Open Bugs</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
            {bugData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div><span className="text-gray-700">{d.name}</span></div>
                <div className="font-medium">{d.value} <span className="text-gray-400 font-normal hidden xl:inline">({Math.round((d.value / bugData.reduce((a, b) => a + b.value, 0)) * 100) || 0}%)</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Recent Test Runs */}
        <div className="bg-white p-2 rounded  border border-gray-100 lg:col-span-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className=" text-gray-900">Recent Test Runs</h3>
            <Link to="#" className="text-indigo-600 text-xs font-medium hover:underline flex items-center gap-1">View All <ExternalLink size={12} /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="pb-3 font-medium">Test Run</th>
                  <th className="pb-3 font-medium">Project</th>
                  <th className="pb-3 font-medium">Environment</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTestRuns.slice(0, 5).map((run, i) => (
                  <tr key={run.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-3 font-medium text-indigo-600">TR-{1250 + run.id}</td>
                    <td className="py-3 text-gray-700">{run.title.split(' ')[0]} {run.module}</td>
                    <td className="py-3 text-gray-500">{run.environment}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border 
                            ${run.status === 'Passed' ? 'bg-green-50 text-green-700 border-green-200' :
                          run.status === 'Failed' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {run.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* My Assigned Tasks */}
        <div className="bg-white p-2 rounded  border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className=" text-gray-900">My Assigned Tasks</h3>
            <Link to="#" className="text-indigo-600 text-xs font-medium hover:underline flex items-center gap-1">View All <ExternalLink size={12} /></Link>
          </div>
          <div className="space-y-3">
            {data.assignedTasks && data.assignedTasks.length > 0 ? data.assignedTasks.map((task, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-100 hover:border-indigo-200 transition-colors cursor-pointer">
                <CheckCircle className="text-indigo-500 shrink-0" size={16} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                  <p className="text-xs text-gray-500 truncate">{task.description}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${task.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{task.priority}</span>
              </div>
            )) : (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-100 hover:border-indigo-200 transition-colors cursor-pointer">
                  <CheckCircle className="text-indigo-500 shrink-0" size={16} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">Execute Test Case {100 + i}</p>
                    <p className="text-xs text-gray-500 truncate">Project Alpha • Due Tomorrow</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Medium</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Open Bugs Assigned To Me */}
        <div className="bg-white p-2 rounded  border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className=" text-gray-900">Open Bugs (Assigned to Me)</h3>
            <Link to="#" className="text-indigo-600 text-xs font-medium hover:underline flex items-center gap-1">View All <ExternalLink size={12} /></Link>
          </div>
          <div className="space-y-3">
            {data.assignedBugs.length > 0 ? data.assignedBugs.map((bug, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-red-100 hover:border-red-300 transition-colors cursor-pointer">
                <Bug className="text-red-500 shrink-0" size={16} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">BUG-{2400 + bug.id}</p>
                  <p className="text-xs text-gray-500 truncate">{bug.title}</p>
                </div>
                <MoreVertical size={14} className="text-gray-400" />
              </div>
            )) : (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-red-100 hover:border-red-300 transition-colors cursor-pointer">
                  <Bug className="text-red-500 shrink-0" size={16} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs  text-red-600">BUG-{2450 + i}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">High</span>
                    </div>
                    <p className="text-xs text-gray-700 truncate mt-0.5">Validation message not showing on submit</p>
                  </div>
                  <MoreVertical size={14} className="text-gray-400" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Widgets Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">

        {/* Test Case Coverage */}
        <div className="bg-white p-2 rounded  border border-gray-100">
          <h3 className=" text-gray-900 mb-4">Test Case Coverage</h3>
          <div className="flex items-center justify-between">
            <div className="w-24 h-24 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={coverageData} innerRadius={35} outerRadius={45} paddingAngle={0} dataKey="value" stroke="none">
                    {coverageData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg  text-gray-900">{data.testCaseCoverage.coveredPercent}%</span>
              </div>
            </div>
            <div className="flex-1 pl-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-emerald-500"></div><span className="text-gray-600">Covered</span></div>
                <span className="font-medium">{data.testCaseCoverage.coveredCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-gray-200"></div><span className="text-gray-600">Not Covered</span></div>
                <span className="font-medium">{data.testCaseCoverage.notCoveredCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tests by Priority */}
        <div className="bg-white p-2 rounded  border border-gray-100">
          <h3 className=" text-gray-900 mb-4">Tests by Priority</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">High</span>
                <span className="font-medium text-gray-900">{data.testsByPriority.high}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${(data.testsByPriority.high / data.kpis.totalTestCases) * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Medium</span>
                <span className="font-medium text-gray-900">{data.testsByPriority.medium}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${(data.testsByPriority.medium / data.kpis.totalTestCases) * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Low</span>
                <span className="font-medium text-gray-900">{data.testsByPriority.low}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(data.testsByPriority.low / data.kpis.totalTestCases) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Environment Status */}
        <div className="bg-white p-2 rounded  border border-gray-100">
          <h3 className=" text-gray-900 mb-4">Environment Status</h3>
          <div className="space-y-3">
            {data.environmentStatus.map((env, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-gray-700">{env.name}</span>
                <span className={`px-2 py-0.5 rounded font-medium border 
                      ${env.status === 'Healthy' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {env.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Automation Summary */}
        <div className="bg-white p-2 rounded  border border-gray-100">
          <h3 className=" text-gray-900 mb-4">Automation Summary</h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
              <Settings size={24} className="text-indigo-600" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Scripts</span>
                <span className=" text-gray-900">{data.automationSummary.totalScripts}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Automated Tests</span>
                <span className=" text-gray-900">{data.automationSummary.automatedTests}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Passed</span>
                <span className=" text-green-600">{data.automationSummary.passedScripts}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Failed</span>
                <span className=" text-red-600">{data.automationSummary.failedScripts}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <footer className="text-center text-xs text-gray-400 mt-8 pb-4 border-t border-gray-200 pt-4">
        &copy; 2026 Codigix Infotech Pvt. Ltd. All rights reserved.
      </footer>
    </div>
  );
}
