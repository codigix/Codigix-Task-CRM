import React, { useState, useEffect } from 'react';
import {
  Users, TrendingUp, Target, Clock, CheckCircle, FileText, ChevronDown, ChevronRight, Download,
  BarChart2, Shield, Settings, AlertCircle, Search, Eye, X, Filter, MoreVertical,
  Activity, Award, Star, List, Trophy
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Legend,
} from 'recharts';
import Swal from 'sweetalert2';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const PerformanceContext = React.createContext();

// --- HELPERS ---
const getStatusColor = (status) => {
  if (status === 'Excellent') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  if (status === 'Good') return 'bg-blue-50 text-blue-600 border-blue-100';
  if (status === 'Needs Improvement') return 'bg-orange-50 text-orange-600 border-orange-100';
  return 'bg-gray-50 text-gray-600 border-gray-100';
};

const getStatusBadge = (score) => {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  return 'Needs Improvement';
};

// --- SUB-COMPONENTS ---

const KpiCard = ({ title, value, subtitle, subtitleType, icon: Icon, iconColor, iconBg }) => (
  <div className="bg-white rounded border border-gray-200 p-2 shadow-sm flex items-start gap-2">
    <div className={`p-3 rounded ${iconBg} ${iconColor} shrink-0`}>
      <Icon size={15} />
    </div>
    <div className="flex-1">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <h3 className="text-xl  text-gray-800 mt-1">{value}</h3>
      <p className={`text-xs font-medium mt-1 ${subtitleType === 'positive' ? 'text-emerald-500' :
        subtitleType === 'warning' ? 'text-red-500' : 'text-gray-400'
        }`}>
        {subtitle}
      </p>
    </div>
  </div>
);

const Drawer = ({ isOpen, onClose, employee }) => {
  const { fetchEmployeeDetails, submitReview } = React.useContext(PerformanceContext);
  const [empDetails, setEmpDetails] = React.useState(null);

  React.useEffect(() => {
    if (isOpen && employee) {
      setEmpDetails(null);
      fetchEmployeeDetails(employee.id).then(setEmpDetails);
    }
  }, [isOpen, employee]);

  const [activeTab, setActiveTab] = useState('Overview');
  const mockTasks = empDetails?.tasks || [];
  const mockTimeLogs = empDetails?.timeLogs || [];
  const mockPastReviews = empDetails?.reviews || [];
  const qualityMetrics = empDetails?.qualityMetrics || { avgQuality: 0, avgOnTime: 0, avgEfficiency: 0 };
  const { overview } = React.useContext(PerformanceContext);
  const { trendData = [], scoreBreakdown = [] } = overview || {};
  const [activeOverviewTab, setActiveOverviewTab] = useState('Recent Contributions');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    taskCompletion: 90,
    quality: 92,
    onTime: 88,
    efficiency: 90,
    reviewGatePoints: 85,
    pointsDistribution: 95,
    feedback: ''
  });

  if (!isOpen || !employee) return null;

  const overallScore = Math.round(
    (Number(reviewForm.taskCompletion) +
      Number(reviewForm.quality) +
      Number(reviewForm.onTime) +
      Number(reviewForm.efficiency) +
      Number(reviewForm.reviewGatePoints) +
      Number(reviewForm.pointsDistribution)) / 6
  ) || 0;

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    const success = await submitReview(employee.id, reviewForm);
    if (success) {
      setIsReviewModalOpen(false);
      // optionally refetch emp details
      fetchEmployeeDetails(employee.id).then(setEmpDetails);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-l border-gray-200 overflow-hidden">

        {/* Drawer Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <h2 className="text-lg  text-gray-800">Employee Performance Details</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50">

          {/* Profile Header */}
          <div className="bg-white p-2 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <img src={employee.avatar} alt={employee.name} className="w-8 h-8 rounded-full shadow-sm" />
                <div>
                  <h1 className="text-xl  text-gray-800">{employee.name}</h1>
                  <p className="text-gray-500 text-sm mt-1">{employee.role}</p>
                  <p className="text-gray-400 text-xs">{employee.department} Department</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-xs  transition-colors flex items-center gap-2 shadow-sm"
                >
                  <FileText size={15} /> Start Review
                </button>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 mt-8 border-b border-gray-100">
              {['Overview', 'Contributions', 'Tasks', 'Time Logs', 'Quality', 'Reviews'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 space-y-3">

            {activeTab === 'Overview' && (
              <>
                {/* Context Filters */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <select className="border border-gray-200 rounded text-sm px-3 py-1.5 bg-white text-gray-700 outline-none focus:border-blue-500">
                      <option>This Month (August 2026)</option>
                      <option>Last Month (July 2026)</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-1.5 border border-gray-200 rounded bg-white text-gray-400 hover:text-gray-600"><ChevronDown className="rotate-90" size={15} /></button>
                    <button className="p-1.5 border border-gray-200 rounded bg-white text-gray-400 hover:text-gray-600"><ChevronDown className="-rotate-90" size={15} /></button>
                  </div>
                </div>

                {/* Micro KPIs */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white rounded border border-gray-200 p-4 shadow-sm flex items-start gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded"><TrendingUp size={20} /></div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Overall Performance</p>
                      <h3 className="text-xl  text-gray-800">{employee.overall}%</h3>
                      <p className="text-xs text-emerald-500 font-medium mt-1">↑ 5% from last month</p>
                      <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs  border ${getStatusColor(getStatusBadge(employee.overall))}`}>
                        {getStatusBadge(employee.overall)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-4 shadow-sm flex items-start gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded"><Trophy size={20} /></div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Points Earned</p>
                      <h3 className="text-xl  text-gray-800">{employee.earned} / {employee.assigned}</h3>
                      <p className="text-xs text-gray-400 font-medium mt-1">{Math.round((employee.earned / employee.assigned) * 100)}% delivery rate</p>
                    </div>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-4 shadow-sm flex items-start gap-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded"><Clock size={20} /></div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Approved Hours</p>
                      <h3 className="text-xl  text-gray-800">22.5h</h3>
                      <p className="text-xs text-gray-400 font-medium mt-1">Efficiency: {employee.efficiency} pts/hr</p>
                    </div>
                  </div>
                </div>

                {/* Secondary KPIs */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white rounded border border-gray-200 p-4 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-500 rounded-full"><Clock size={15} /></div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">On-Time Delivery</p>
                      <h3 className="text-lg  text-gray-800">{employee.onTime}%</h3>
                      <p className="text-xs text-gray-400">31 on time / 3 late</p>
                    </div>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-4 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-500 rounded-full"><Shield size={15} /></div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Quality Score</p>
                      <h3 className="text-lg  text-gray-800">{employee.quality}%</h3>
                      <p className="text-xs text-gray-400">42 passed / 3 failed</p>
                    </div>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-4 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-red-50 text-red-500 rounded-full"><AlertCircle size={15} /></div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Rework Rate</p>
                      <h3 className="text-lg  text-gray-800">4%</h3>
                      <p className="text-xs text-gray-400">2 rework items</p>
                    </div>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded border border-gray-200 p-5 shadow-sm">
                    <h3 className="text-sm  text-gray-800 mb-4">Performance Trend <span className="font-normal text-gray-400">(Last 6 Months)</span></h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                          <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#0f172a', fontWeight: 600, fontSize: 12 }}
                          />
                          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-5 shadow-sm">
                    <h3 className="text-sm  text-gray-800 mb-4">Score Breakdown</h3>
                    <div className="space-y-4">
                      {scoreBreakdown.map((item, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600 font-medium">{item.name}</span>
                            <span className="text-gray-800 ">{Math.round((item.value / 30) * 100 - (i * 2))}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="h-2 rounded-full" style={{ width: `${Math.round((item.value / 30) * 100 - (i * 2))}%`, backgroundColor: item.color }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dynamic Table inside Drawer Overview */}
                <div className="">
                  <div className="flex items-center gap-2 px-5 pt-4 border-b border-gray-100">
                    {['Recent Contributions', 'Assigned Tasks', 'Time Logs', 'Quality', 'History'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveOverviewTab(tab)}
                        className={`pb-3 text-xs  ${activeOverviewTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {activeOverviewTab === 'Recent Contributions' && (
                    <table className="w-full bg-white text-left border-collapse">
                      <thead>
                        <tr className=" border-b border-slate-100 text-xs  text-gray-500  tracking-wider">
                          <th className="p-2 font-semibold">#</th>
                          <th className="p-2 font-semibold">Task / Subtask</th>
                          <th className="p-2 font-semibold">Type</th>
                          <th className="p-2 font-semibold">Points</th>
                          <th className="p-2 font-semibold text-center">Status</th>
                          <th className="p-2 font-semibold text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-gray-700 divide-y divide-gray-50">
                        <tr className="hover:bg-slate-50">
                          <td className="p-2 text-gray-400">1</td>
                          <td className="p-2 font-medium text-gray-800">Payment Gateway API</td>
                          <td className="p-2"><span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs  border border-emerald-100">TASK</span></td>
                          <td className="p-2 font-medium">25</td>
                          <td className="p-2 text-center"><span className="text-emerald-500">Approved</span></td>
                          <td className="p-2 text-center"><button className="text-blue-600 font-medium hover:underline">View</button></td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="p-2 text-gray-400">2</td>
                          <td className="p-2 font-medium text-gray-800">Authentication Service</td>
                          <td className="p-2"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs  border border-blue-100">SUBTASK</span></td>
                          <td className="p-2 font-medium">15</td>
                          <td className="p-2 text-center"><span className="text-emerald-500">Approved</span></td>
                          <td className="p-2 text-center"><button className="text-blue-600 font-medium hover:underline">View</button></td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="p-2 text-gray-400">3</td>
                          <td className="p-2 font-medium text-gray-800">Payment UI</td>
                          <td className="p-2"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs  border border-blue-100">SUBTASK</span></td>
                          <td className="p-2 font-medium">12</td>
                          <td className="p-2 text-center"><span className="text-emerald-500">Approved</span></td>
                          <td className="p-2 text-center"><button className="text-blue-600 font-medium hover:underline">View</button></td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="p-2 text-gray-400">4</td>
                          <td className="p-2 font-medium text-gray-800">Bug Fix #102</td>
                          <td className="p-2"><span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-xs  border border-red-100">REWORK</span></td>
                          <td className="p-2 font-medium">5</td>
                          <td className="p-2 text-center"><span className="text-emerald-500">Approved</span></td>
                          <td className="p-2 text-center"><button className="text-blue-600 font-medium hover:underline">View</button></td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                  {activeOverviewTab === 'Assigned Tasks' && (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs  text-gray-500 ">
                          <th className="p-2">Task ID</th>
                          <th className="p-2">Name</th>
                          <th className="p-2">Status</th>
                          <th className="p-2 text-center">Time Spent</th>
                          <th className="p-2 text-right">Points</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-gray-50">
                        {mockTasks.map(task => (
                          <tr key={task.id} className="hover:bg-slate-50">
                            <td className="p-2 text-xs font-medium text-gray-500">{task.id}</td>
                            <td className="p-2 font-semibold text-gray-800">{task.name}</td>
                            <td className="p-2">
                              <span className={`text-xs  px-2 py-0.5 rounded border ${task.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                task.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                  'bg-gray-100 text-gray-600 border-gray-200'
                                }`}>
                                {task.status}
                              </span>
                            </td>
                            <td className="p-2 text-center text-gray-600 text-xs font-medium">{task.time}</td>
                            <td className="p-2 text-right  text-gray-800">{task.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeOverviewTab === 'Time Logs' && (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs  text-gray-500 ">
                          <th className="p-2">Date</th>
                          <th className="p-2">Task</th>
                          <th className="p-2">Type</th>
                          <th className="p-2 text-right">Hours</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-gray-50">
                        {mockTimeLogs.map((log, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 text-xs font-medium text-gray-500">{log.date}</td>
                            <td className="p-2 font-semibold text-gray-800">{log.task}</td>
                            <td className="p-2 text-xs text-gray-500">{log.type}</td>
                            <td className="p-2 text-right  text-gray-800">{log.hours}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeOverviewTab === 'Quality' && (
                    <div className="p-4">
                      <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">First-pass Acceptance</span><span className=" text-gray-800">92%</span></div>
                      <div className="w-full bg-gray-100 h-2 rounded-full mb-4"><div className="bg-emerald-500 h-2 rounded-full w-[92%]"></div></div>
                      <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">Peer Review Score</span><span className=" text-gray-800">96%</span></div>
                      <div className="w-full bg-gray-100 h-2 rounded-full mb-4"><div className="bg-blue-500 h-2 rounded-full w-[96%]"></div></div>
                      <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">Bug Free Release Rate</span><span className=" text-gray-800">88%</span></div>
                      <div className="w-full bg-gray-100 h-2 rounded-full mb-4"><div className="bg-purple-500 h-2 rounded-full w-[88%]"></div></div>
                    </div>
                  )}

                  {activeOverviewTab === 'History' && (
                    <div className=" space-y-2">
                      {mockPastReviews.map((rev, i) => (
                        <div key={i} className="flex justify-between items-start border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                          <div>
                            <h4 className=" text-gray-800">{rev.date} Review</h4>
                            <p className="text-xs text-gray-500 mt-0.5">By {rev.reviewer}</p>
                          </div>
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600  rounded border border-emerald-100 text-xs">
                            {rev.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-3 text-center border-t border-gray-100 bg-slate-50">
                    <button className="text-xs  text-blue-600 hover:text-blue-700">View All &rarr;</button>
                  </div>
                </div>

                {/* Bottom Split Row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded border border-gray-200 p-5 shadow-sm">
                    <h3 className="text-sm  text-gray-800 mb-4">Time Log Summary</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 w-24">Development</span>
                        <div className="flex-1 mx-2 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-[60%]"></div></div>
                        <span className=" text-gray-800 w-10 text-right">12.5h</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 w-24">Testing</span>
                        <div className="flex-1 mx-2 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-[20%]"></div></div>
                        <span className=" text-gray-800 w-10 text-right">4.0h</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 w-24">Code Review</span>
                        <div className="flex-1 mx-2 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-[10%]"></div></div>
                        <span className=" text-gray-800 w-10 text-right">2.0h</span>
                      </div>
                      <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between text-xs  text-gray-800">
                        <span>Total</span>
                        <span>22.5h</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded border border-gray-200 p-5 shadow-sm">
                    <h3 className="text-sm  text-gray-800 mb-4">Quality Details</h3>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">QA Passed</span>
                        <span className=" text-gray-800">42</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">QA Failed</span>
                        <span className=" text-gray-800">3</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Rework Items</span>
                        <span className=" text-gray-800">2</span>
                      </div>
                    </div>
                    <div className="bg-emerald-50 rounded p-3 text-center border border-emerald-100">
                      <p className="text-xs  text-emerald-600 uppercase tracking-wide">Quality Score</p>
                      <p className="text-2xl  text-emerald-700 mt-0.5">{employee.quality}%</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'Contributions' && (
              <div className="">
                <div className=" border-b border-gray-100 bg-slate-50 flex items-center justify-between">
                  <h3 className=" text-gray-800">Recent Contributions</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {recentReviews.map(review => (
                    <div key={review.id} className="p-2 flex gap-2 bg-white hover:bg-white transition-colors">
                      <div className="mt-1 p-2 bg-blue-50 text-blue-600 rounded shrink-0">
                        <FileText size={15} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm text-gray-800">{review.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <span className="font-medium text-gray-700">{review.project}</span>
                          <span>•</span>
                          <span>{review.time}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className=" text-gray-800 block">+{review.points} pts</span>
                        <span className={`text-xs  px-1.5 py-0.5 rounded border mt-1 inline-block ${review.status === 'Pending Review' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                          review.status === 'Under Review' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                          {review.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'Tasks' && (
              <div className="">
                <div className="p-2 border-b border-gray-100 bg-slate-50">
                  <h3 className=" text-gray-800">Assigned Tasks</h3>
                </div>
                <table className="w-full bg-white text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-100 text-xs  text-gray-500 uppercase">
                      <th className="p-2">Task ID</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Status</th>
                      <th className="p-2 text-center">Time Spent</th>
                      <th className="p-2 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-50">
                    {mockTasks.map(task => (
                      <tr key={task.id} className="hover:bg-slate-50">
                        <td className="p-2 text-xs font-medium text-gray-500">{task.id}</td>
                        <td className="p-2 font-semibold text-gray-800">{task.name}</td>
                        <td className="p-2">
                          <span className={`text-xs  px-2 py-0.5 rounded border ${task.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            task.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="p-2 text-center text-gray-600 text-xs font-medium">{task.time}</td>
                        <td className="p-2 text-right  text-gray-800">{task.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'Time Logs' && (
              <div className="">
                <div className="p-2 border-b border-gray-100 bg-slate-50">
                  <h3 className=" text-gray-800">Time Logs (Last 7 Days)</h3>
                </div>
                <table className="w-full text-left bg-white border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-100 text-xs  text-gray-500 uppercase">
                      <th className="p-2">Date</th>
                      <th className="p-2">Task</th>
                      <th className="p-2">Type</th>
                      <th className="p-2 text-right">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-50">
                    {mockTimeLogs.map((log, i) => (
                      <tr key={i} className="bg-white hover:bg-slate-50">
                        <td className="p-2 text-xs font-medium text-gray-500">{log.date}</td>
                        <td className="p-2 font-semibold text-gray-800">{log.task}</td>
                        <td className="p-2 text-xs text-gray-500">{log.type}</td>
                        <td className="p-2 text-right  text-gray-800">{log.hours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'Quality' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded border border-gray-200 p-6 shadow-sm flex flex-col items-center justify-center text-center col-span-2 md:col-span-1">
                  <Shield size={40} className="text-emerald-500 mb-3" />
                  <h3 className="text-3xl  text-gray-800">{employee.quality}%</h3>
                  <p className="text-xs font-medium text-gray-500 mt-1">Average Quality Score</p>
                  <p className="text-xs text-emerald-500 mt-2">↑ Top 10% of department</p>
                </div>
                <div className="bg-white rounded border border-gray-200 p-6 shadow-sm flex flex-col justify-center col-span-2 md:col-span-1 space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">First-pass Acceptance</span><span className=" text-gray-800">92%</span></div>
                    <div className="w-full bg-gray-100 h-2 rounded-full"><div className="bg-emerald-500 h-2 rounded-full w-[92%]"></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">Peer Review Score</span><span className=" text-gray-800">96%</span></div>
                    <div className="w-full bg-gray-100 h-2 rounded-full"><div className="bg-blue-500 h-2 rounded-full w-[96%]"></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">Bug Free Release Rate</span><span className=" text-gray-800">88%</span></div>
                    <div className="w-full bg-gray-100 h-2 rounded-full"><div className="bg-purple-500 h-2 rounded-full w-[88%]"></div></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Reviews' && (
              <div className="space-y-4">
                {mockPastReviews.map((rev, i) => (
                  <div key={i} className="bg-white rounded border border-gray-200 p-2 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className=" text-gray-800">{rev.date} Review</h4>
                        <p className="text-xs text-gray-500 mt-0.5">By {rev.reviewer}</p>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600  rounded border border-emerald-100 text-sm">
                        {rev.score}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-100">{rev.notes}</p>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Review Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsReviewModalOpen(false)}></div>
          <div className="relative bg-white rounded shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg  text-gray-800">Submit Performance Review</h2>
              <button onClick={() => setIsReviewModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleReviewSubmit} className="p-6 flex-1 overflow-y-auto">

              <div className="bg-slate-50 p-4 rounded border border-gray-100 mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-gray-800 font-bold">Calculated Overall Score</h3>
                  <p className="text-xs text-gray-500 mt-1">Average of all performance metrics below</p>
                </div>
                <div className={`px-4 py-2 rounded font-bold text-lg border ${overallScore >= 90 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  overallScore >= 80 ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    'bg-orange-50 text-orange-600 border-orange-100'
                  }`}>
                  {overallScore}%
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm text-gray-700 font-bold mb-3 border-b border-gray-100 pb-2">Performance Metrics</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Task Completion (%)</label>
                    <input
                      type="number"
                      value={reviewForm.taskCompletion}
                      onChange={e => setReviewForm({ ...reviewForm, taskCompletion: e.target.value })}
                      className="w-full border border-gray-200 rounded p-2 text-sm text-gray-800 outline-none focus:border-blue-500"
                      min="0" max="100" required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Quality of Work (%)</label>
                    <input
                      type="number"
                      value={reviewForm.quality}
                      onChange={e => setReviewForm({ ...reviewForm, quality: e.target.value })}
                      className="w-full border border-gray-200 rounded p-2 text-sm text-gray-800 outline-none focus:border-blue-500"
                      min="0" max="100" required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">On-Time Delivery (%)</label>
                    <input
                      type="number"
                      value={reviewForm.onTime}
                      onChange={e => setReviewForm({ ...reviewForm, onTime: e.target.value })}
                      className="w-full border border-gray-200 rounded p-2 text-sm text-gray-800 outline-none focus:border-blue-500"
                      min="0" max="100" required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Efficiency (%)</label>
                    <input
                      type="number"
                      value={reviewForm.efficiency}
                      onChange={e => setReviewForm({ ...reviewForm, efficiency: e.target.value })}
                      className="w-full border border-gray-200 rounded p-2 text-sm text-gray-800 outline-none focus:border-blue-500"
                      min="0" max="100" required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Review Gate Points (%)</label>
                    <input
                      type="number"
                      value={reviewForm.reviewGatePoints}
                      onChange={e => setReviewForm({ ...reviewForm, reviewGatePoints: e.target.value })}
                      className="w-full border border-gray-200 rounded p-2 text-sm text-gray-800 outline-none focus:border-blue-500"
                      min="0" max="100" required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Points Distribution (%)</label>
                    <input
                      type="number"
                      value={reviewForm.pointsDistribution}
                      onChange={e => setReviewForm({ ...reviewForm, pointsDistribution: e.target.value })}
                      className="w-full border border-gray-200 rounded p-2 text-sm text-gray-800 outline-none focus:border-blue-500"
                      min="0" max="100" required
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-gray-700 font-bold mb-2">Manager Notes & Feedback</label>
                <textarea
                  value={reviewForm.feedback}
                  onChange={e => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                  className="w-full border border-gray-200 rounded p-3 text-sm text-gray-800 outline-none focus:border-blue-500 h-28 resize-none"
                  placeholder="Enter detailed feedback, justification for scores, and areas of improvement..." required
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsReviewModalOpen(false)} className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 rounded border border-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition-colors flex items-center gap-2">
                  <CheckCircle size={15} /> Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};


// --- MAIN PAGE TABS ---

const OverviewTab = ({ handleGenerateReport }) => {
  const { overview, employees } = React.useContext(PerformanceContext);
  const { trendData = [], deptData = [], scoreBreakdown = [], perfDistribution = [], averageScore = 0, totalReviews = 0 } = overview || {};
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const topEmployees = safeEmployees.filter(e => e.score).sort((a,b)=>b.score-a.score).slice(0,5);
  const recentReviews = []; // Handled separately or mocked
  
  return (
  <div className="space-y-6">
    {/* Charts Row */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      {/* Performance Trend */}
      <div className="bg-white rounded border border-gray-200 p-5 shadow-sm col-span-1">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm  text-gray-800">Performance Trend</h3>
          <select className="text-xs bg-transparent border border-gray-200 rounded px-2 py-1 outline-none text-gray-500 font-medium">
            <option>Overall Performance</option>
          </select>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#0f172a', fontWeight: 600, fontSize: 12 }}
                formatter={(value) => [`${value}%`, 'Performance']}
              />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Performance */}
      <div className="bg-white rounded border border-gray-200 p-5 shadow-sm col-span-1">
        <h3 className="text-sm  text-gray-800 mb-4">Department Performance</h3>
        <div className="space-y-3">
          {deptData.map(dept => (
            <div key={dept.name} className="flex items-center text-xs">
              <span className="w-24 text-gray-600 truncate">{dept.name}</span>
              <div className="flex-1 mx-2 h-3 bg-gray-100 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm" style={{ width: `${dept.value}%`, backgroundColor: dept.color }}></div>
              </div>
              <span className="w-12 text-right  text-gray-700">{dept.value}% <span className="text-emerald-500 font-normal ml-0.5">↑</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="bg-white rounded border border-gray-200 p-5 shadow-sm col-span-1">
        <h3 className="text-sm  text-gray-800 mb-2">Performance Score Breakdown</h3>
        <div className="flex items-center h-48">
          <div className="w-1/2 h-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={scoreBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                  {scoreBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Share']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl  text-gray-800">92%</span>
              <span className="text-xs text-gray-400">Overall</span>
            </div>
          </div>
          <div className="w-1/2 space-y-2">
            {scoreBreakdown.map(item => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: item.color }}></span>
                  <span className="text-gray-600 truncate">{item.name}</span>
                </div>
                <span className=" text-gray-800 shrink-0 ml-1">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Top Employees Table */}
    <div className="">
      <div className="py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-base  text-gray-800">Top Performing Employees</h3>
        <button className="text-sm font-semibold text-blue-600 flex items-center hover:underline">
          View All Employees <ChevronRight size={15} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left bg-white border-collapse min-w-max">
          <thead>
            <tr className=" border-b border-slate-100 text-xs  text-gray-500 ">
              <th className="p-2 w-10">#</th>
              <th className="p-2">Employee</th>
              <th className="p-2">Department</th>
              <th className="p-2 text-center">Assigned</th>
              <th className="p-2 text-center">Points Earned</th>
              <th className="p-2 text-center">On-Time</th>
              <th className="p-2 text-center">Quality</th>
              <th className="p-2 text-center">Efficiency</th>
              <th className="p-2 text-center">Overall</th>
              <th className="p-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100">
            {topEmployees.map((emp, idx) => (
              <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-2 text-gray-400 text-xs font-semibold">{idx + 1}</td>
                <td className="p-2">
                  <div className="flex items-center gap-3">
                    <img src={emp.avatar} alt={emp.name} className="w-8 h-8 rounded-full border border-gray-200" />
                    <span className=" text-gray-800">{emp.name}</span>
                  </div>
                </td>
                <td className="p-2 text-gray-500 text-xs">{emp.department}</td>
                <td className="p-2 text-center text-gray-600 font-medium">{emp.assigned}</td>
                <td className="p-2 text-center  text-gray-800">{emp.earned}</td>
                <td className="p-2 text-center text-gray-600 font-medium">{emp.onTime}%</td>
                <td className="p-2 text-center text-gray-600 font-medium">{emp.quality}%</td>
                <td className="p-2 text-center text-gray-600 font-medium">{emp.efficiency}</td>
                <td className="p-2 text-center">
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600  rounded text-xs border border-emerald-100">
                    {emp.overall}%
                  </span>
                </td>
                <td className="p-2 text-center">
                  <button className="px-3 py-1.5 border border-blue-200 text-blue-600 font-semibold rounded text-xs hover:bg-blue-50 transition-colors flex items-center gap-1.5 mx-auto">
                    <Eye size={14} /> View Performance
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Bottom Widgets Row */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">

      {/* Recent Contribution Reviews */}
      <div className=" flex flex-col">
        <div className="p-2 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
          <h3 className="text-sm  text-gray-800">Recent Contribution Reviews</h3>
          <button className="text-xs font-semibold text-blue-600 flex items-center hover:underline">
            View All <ChevronRight size={14} />
          </button>
        </div>
        <div className="divide-y divide-gray-50 flex-1 overflow-y-auto max-h-[500px]">
          {recentReviews.map(review => (
            <div key={review.id} className="p-2 bg-white mb-2 flex gap-3 hover:bg-slate-50">
              <div className="mt-0.5 p-1.5 bg-gray-100 rounded text-gray-500 shrink-0 self-start">
                <FileText size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm  text-gray-800 truncate pr-2">{review.title}</h4>
                  <span className={`text-xs  px-1.5 py-0.5 rounded  whitespace-nowrap ${review.status === 'Pending Review' ? 'text-orange-600' :
                    review.status === 'Under Review' ? 'text-blue-600' :
                      'text-emerald-600'
                    }`}>
                    {review.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-1.5">{review.project}</p>
                <div className="flex justify-between items-center text-xs text-gray-500 font-medium">
                  <span>{review.contributors} contributors</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-800">{review.points} pts</span>
                    <span className="text-gray-300">•</span>
                    <span>{review.time}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Distribution */}
      <div className="bg-white rounded border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm  text-gray-800 mb-4">Performance Distribution</h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perfDistribution} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {perfDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm  text-gray-800 mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <button className="w-full flex items-center justify-between p-3 rounded border border-gray-100 bg-slate-50 hover:bg-slate-100 hover:border-gray-200 transition-colors text-left group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded"><Users size={18} /></div>
              <div>
                <p className="text-xs  text-gray-800">View All Employees</p>
                <p className="text-xs text-gray-500">Browse and analyze employee performance</p>
              </div>
            </div>
          </button>
          <button className="w-full flex items-center justify-between p-3 rounded border border-gray-100 bg-slate-50 hover:bg-slate-100 hover:border-gray-200 transition-colors text-left group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded"><Target size={18} /></div>
              <div>
                <p className="text-xs  text-gray-800">Pending Reviews</p>
                <p className="text-xs text-gray-500">Review and approve contributions</p>
              </div>
            </div>
            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs  flex items-center justify-center">6</span>
          </button>
          <button
            onClick={handleGenerateReport}
            className="w-full flex items-center justify-between p-3 rounded border border-gray-100 bg-slate-50 hover:bg-slate-100 hover:border-gray-200 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded"><FileText size={18} /></div>
              <div>
                <p className="text-xs  text-gray-800">Generate Report</p>
                <p className="text-xs text-gray-500">Export performance data</p>
              </div>
            </div>
          </button>
          <button className="w-full flex items-center justify-between p-3 rounded border border-gray-100 bg-slate-50 hover:bg-slate-100 hover:border-gray-200 transition-colors text-left group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded"><Award size={18} /></div>
              <div>
                <p className="text-xs  text-gray-800">Manage Goals & KPIs</p>
                <p className="text-xs text-gray-500">Configure employee goals</p>
              </div>
            </div>
          </button>
          <button className="w-full flex items-center justify-between p-3 rounded border border-gray-100 bg-slate-50 hover:bg-slate-100 hover:border-gray-200 transition-colors text-left group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded"><Settings size={18} /></div>
              <div>
                <p className="text-xs  text-gray-800">Performance Settings</p>
                <p className="text-xs text-gray-500">Adjust scoring weights and criteria</p>
              </div>
            </div>
          </button>
        </div>
      </div>

    </div>
  </div>
  );
};

const AllEmployeesTab = ({ onSelectEmployee, handleGenerateReport }) => {
  const { employees, overview } = React.useContext(PerformanceContext);
  const { deptData = [], perfDistribution = [] } = overview || {};
  const allEmployees = Array.isArray(employees) ? employees : [];

  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <select className="border border-gray-200 rounded text-xs p-2 bg-white text-gray-700 outline-none focus:border-blue-500 shadow-sm min-w-[140px]">
            <option>This Month</option>
            <option>Last Month</option>
          </select>
          <select className="border border-gray-200 rounded text-xs p-2 bg-white text-gray-700 outline-none focus:border-blue-500 shadow-sm min-w-[140px]">
            <option>All Departments</option>
            <option>Development</option>
            <option>QA</option>
          </select>
          <select className="border border-gray-200 rounded text-xs p-2 bg-white text-gray-700 outline-none focus:border-blue-500 shadow-sm min-w-[140px]">
            <option>All Roles</option>
          </select>
          <select className="border border-gray-200 rounded text-xs p-2 bg-white text-gray-700 outline-none focus:border-blue-500 shadow-sm min-w-[140px]">
            <option>All Status</option>
            <option>Excellent</option>
            <option>Good</option>
          </select>
          <button className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-semibold hover:bg-blue-700 shadow-sm">
            Apply
          </button>
          <button className="text-gray-5xs p-2 rounded text-sm font-semibold hover:bg-gray-100">
            Reset
          </button>
        </div>
        <button
          onClick={handleGenerateReport}
          className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 shadow-sm"
        >
          <Download size={15} /> Export
        </button>
      </div>

      {/* Large Table */}
      <div className="">
        <div className="py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <h2 className="text-lg  text-gray-800">All Employees (42)</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 border border-gray-200 rounded text-sm w-full sm:w-64 focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full bg-white text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs  text-gray-500  tracking-wider">
                <th className="p-2 w-10 text-center">#</th>
                <th className="p-2">Employee</th>
                <th className="p-2">Department</th>
                <th className="p-2 text-center">Assigned<br /><span className="text-xs font-normal">(Points)</span></th>
                <th className="p-2 text-center">Earned<br /><span className="text-xs font-normal">(Points)</span></th>
                <th className="p-2 text-center">On-Time</th>
                <th className="p-2 text-center">Quality</th>
                <th className="p-2 text-center">Efficiency<br /><span className="text-xs font-normal">(pts/hr)</span></th>
                <th className="p-2 text-center">Overall<br />Score</th>
                <th className="p-2 text-center">Status</th>
                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {allEmployees.map((emp, idx) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-2 text-gray-400 text-xs font-semibold text-center">{idx + 1}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-3">
                      <img src={emp.avatar} alt={emp.name} className="w-9 h-9 rounded-full border border-gray-200 shadow-sm" />
                      <div>
                        <div className=" text-gray-800 text-sm leading-tight">{emp.name}</div>
                        <div className="text-[11px] text-gray-400 font-medium mt-0.5">{emp.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 text-gray-500 text-xs font-medium">{emp.department}</td>
                  <td className="p-2 text-center text-gray-600 font-medium">{emp.assigned}</td>
                  <td className="p-2 text-center  text-gray-800">{emp.earned}</td>
                  <td className="p-2 text-center text-gray-600 font-medium">{emp.onTime}%</td>
                  <td className="p-2 text-center text-gray-600 font-medium">{emp.quality}%</td>
                  <td className="p-2 text-center text-gray-600 font-medium">{emp.efficiency}</td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-1 bg-gray-50  rounded text-xs border ${emp.overall >= 90 ? 'text-emerald-600 border-emerald-100 bg-emerald-50' :
                      emp.overall >= 80 ? 'text-blue-600 border-blue-100 bg-blue-50' :
                        'text-orange-600 border-orange-100 bg-orange-50'
                      }`}>
                      {emp.overall}%
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <span className={`inline-block px-2.5 py-1 text-xs  rounded-full border ${getStatusColor(getStatusBadge(emp.overall))}`}>
                      {getStatusBadge(emp.overall)}
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onSelectEmployee(emp)}
                        className="px-3 py-1.5 border border-blue-200 text-blue-600 font-semibold rounded text-xs hover:bg-blue-50 transition-colors flex items-center gap-1.5 bg-white"
                      >
                        <Eye size={14} /> Review
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100 transition-colors">
                        <MoreVertical size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination mock */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-slate-50">
          <span>Showing 1 to 10 of 42 employees</span>
          <div className="flex items-center gap-1">
            <button className="px-2 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50 text-gray-400">&lt;</button>
            <button className="px-2.5 py-1 border border-blue-600 bg-blue-600 text-white rounded font-medium">1</button>
            <button className="px-2.5 py-1 border border-gray-200 bg-white hover:bg-gray-50 rounded">2</button>
            <button className="px-2.5 py-1 border border-gray-200 bg-white hover:bg-gray-50 rounded">3</button>
            <span className="px-1">...</span>
            <button className="px-2 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50 text-gray-400">&gt;</button>
            <select className="ml-2 border border-gray-200 rounded px-2 py-1 bg-white outline-none">
              <option>10 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bottom Charts for All Employees View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="bg-white rounded border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm  text-gray-800 mb-4">Department Performance</h3>
          <p className="text-xs text-gray-500 mb-4">Average Performance by Department</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 20, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `${v}%`} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
                  {deptData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded border border-gray-200 p-5 shadow-sm flex flex-col">
          <h3 className="text-sm  text-gray-800 mb-4">Performance Distribution</h3>
          <div className="flex-1 flex items-center">
            <div className="w-1/2 h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[
                    { name: 'Excellent', value: 12, color: '#22c55e' },
                    { name: 'Good', value: 20, color: '#3b82f6' },
                    { name: 'Needs Impr', value: 7, color: '#eab308' },
                    { name: 'Poor', value: 3, color: '#ef4444' }
                  ]} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                    {[
                      { name: 'Excellent', value: 12, color: '#22c55e' },
                      { name: 'Good', value: 20, color: '#3b82f6' },
                      { name: 'Needs Impr', value: 7, color: '#eab308' },
                      { name: 'Poor', value: 3, color: '#ef4444' }
                    ].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl  text-gray-800">87.4%</span>
                <span className="text-xs text-gray-400">Average</span>
              </div>
            </div>
            <div className="w-1/2 space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-gray-600 font-medium">Excellent (≥ 90%)</span>
                  <span className="ml-auto  text-gray-800">12</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span className="text-gray-600 font-medium">Good (75% - 89%)</span>
                  <span className="ml-auto  text-gray-800">20</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span className="text-gray-600 font-medium">Needs Improvement<br /><span className="text-xs font-normal text-gray-400 leading-tight">(60% - 74%)</span></span>
                  <span className="ml-auto  text-gray-800">7</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="text-gray-600 font-medium">Poor (&lt; 60%)</span>
                  <span className="ml-auto  text-gray-800">3</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};


// --- MAIN PAGE COMPONENT ---

const HRPerformance = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [overview, setOverview] = useState({
    averageScore: 0,
    totalReviews: 0,
    trendData: [],
    deptData: [],
    scoreBreakdown: [],
    perfDistribution: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, employeesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/hr/performance/overview`),
        fetch(`${API_BASE_URL}/api/hr/performance/employees`)
      ]);
      const overviewData = await overviewRes.json();
      const employeesData = await employeesRes.json();

      setOverview(overviewData);
      setEmployees(employeesData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchEmployeeDetails = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/hr/performance/employees/${id}`);
      return await res.json();
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const submitReview = async (id, reviewData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/hr/performance/employees/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
      });
      if (res.ok) {
        Swal.fire('Success', 'Review submitted successfully', 'success');
        fetchData(); // refresh overview
        return true;
      }
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Failed to submit review', 'error');
      return false;
    }
  };



  const handleGenerateReport = () => {
    // Mock downloading a report file
    const content = "Employee Name,Department,Points,Quality,Overall Score\nAmit Sharma,Development,108,96%,93%\n";
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Performance_Report_Codigix.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Close drawer handler
  const closeDrawer = () => setSelectedEmployee(null);

  return (
    <PerformanceContext.Provider value={{ employees, overview, fetchEmployeeDetails, submitReview }}>
      <div className="min-h-screen bg-slate-100 p-4 md:p-6 pb-20 font-sans">
        <div className="max-w-[1600px] mx-auto space-y-5">

          {/* Dynamic Header based on active tab */}
          {activeTab === 'Overview' ? (
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
              <div className="flex gap-2 items-start">
                <div className="p-2 bg-blue-600 text-white rounded shadow-sm"><BarChart2 size={15} /></div>
                <div>
                  <h1 className="text-xl  text-gray-800">Performance Management</h1>
                  <p className="text-xs text-gray-500 mt-1 max-w-lg leading-relaxed">
                    Monitor employee contribution, productivity, quality, timeliness and performance trends.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <select className="border border-gray-200 rounded text-xs p-2 bg-white text-gray-700 outline-none focus:border-blue-500 shadow-sm">
                  <option>This Month</option>
                  <option>Last Month</option>
                </select>
                <select className="border border-gray-200 rounded text-xs p-2 bg-white text-gray-700 outline-none focus:border-blue-500 shadow-sm hidden sm:block">
                  <option>All Departments</option>
                </select>
                <select className="border border-gray-200 rounded text-xs p-2 bg-white text-gray-700 outline-none focus:border-blue-500 shadow-sm hidden sm:block">
                  <option>All Roles</option>
                </select>
                <button
                  onClick={handleGenerateReport}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold flex items-center gap-2 hover:bg-blue-700 shadow-sm"
                >
                  <Download size={15} /> Export Report
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
              <div className="flex gap-2 items-start">
                <div className="p-3 bg-blue-600 text-white rounded shadow-sm"><Users size={15} /></div>
                <div>
                  <h1 className="text-2xl  text-gray-800">Employee Performance</h1>
                  <p className="text-sm text-gray-500 mt-1 max-w-lg leading-relaxed">
                    Review, analyze and manage employee performance across the organization.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Top KPI Cards (Shared across both tabs) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <KpiCard title="Total Employees" value="42" subtitle="↑ +4 this month" subtitleType="positive" icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" />
            <KpiCard title="Avg Performance" value="87.4%" subtitle="↑ 3.2%" subtitleType="positive" icon={Target} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
            <KpiCard title="Points Delivered" value="8,420" subtitle="↑ 8.6%" subtitleType="positive" icon={Award} iconColor="text-purple-600" iconBg="bg-purple-50" />
            <KpiCard title="On-Time Delivery" value="91.2%" subtitle="↑ 2.4%" subtitleType="positive" icon={Clock} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
            <KpiCard title="Quality Score" value="94.1%" subtitle="↑ 1.8%" subtitleType="positive" icon={Shield} iconColor="text-blue-600" iconBg="bg-blue-50" />
            <KpiCard title="Review Pending" value="6" subtitle="Need attention" subtitleType="warning" icon={FileText} iconColor="text-red-600" iconBg="bg-red-50" />
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('Overview')}
              className={`px-5 py-2 rounded text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'Overview' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              <Activity size={15} /> Overview
            </button>
            <button
              onClick={() => setActiveTab('All Employees')}
              className={`px-5 py-2 rounded text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'All Employees' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              <Users size={15} /> All Employees
            </button>
          </div>

          {/* Tab Content */}
          <div className="mt-4">
            {activeTab === 'Overview' && <OverviewTab handleGenerateReport={handleGenerateReport} />}
            {activeTab === 'All Employees' && <AllEmployeesTab onSelectEmployee={setSelectedEmployee} handleGenerateReport={handleGenerateReport} />}
          </div>

        </div>

        {/* Slide-out Drawer for Employee Details */}
        <Drawer isOpen={!!selectedEmployee} onClose={closeDrawer} employee={selectedEmployee} />
      </div>
    </PerformanceContext.Provider>
  );
};

export default HRPerformance;
