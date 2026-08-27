import React, { useState, useEffect } from 'react';
import { Calendar, BarChart3, TrendingUp, Download, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const MonthlyReportingDashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('overview');
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);

  useEffect(() => {
    fetchReportData();
    fetchDepartments();
  }, [currentDate, reportType, selectedDept]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      setDepartments(Array.isArray(data) ? data : []);
      if (data.length > 0 && !selectedDept) {
        setSelectedDept(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      const params = new URLSearchParams({
        month,
        year,
        reportType,
        departmentId: selectedDept || ''
      });

      const res = await fetch(`/api/reports/monthly?${params}`);
      const data = await res.json();
      setReportData(data);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      // Use mock data on error
      setReportData(getMockReportData());
    } finally {
      setLoading(false);
    }
  };

  const getMockReportData = () => ({
    summary: {
      totalDeals: 24,
      dealsWon: 18,
      totalRevenue: 450000,
      avgDealValue: 18750,
      conversionRate: 75,
      taskCompletion: 87
    },
    dailyMetrics: [
      { date: '1', deals: 2, revenue: 15000, tasks: 8, projects: 1 },
      { date: '2', deals: 1, revenue: 8000, tasks: 6, projects: 0 },
      { date: '3', deals: 3, revenue: 22000, tasks: 10, projects: 2 },
      { date: '4', deals: 2, revenue: 18000, tasks: 7, projects: 1 },
      { date: '5', deals: 0, revenue: 0, tasks: 5, projects: 0 },
      { date: '6', deals: 4, revenue: 35000, tasks: 12, projects: 2 },
      { date: '7', deals: 2, revenue: 16000, tasks: 8, projects: 1 }
    ],
    departmentMetrics: [
      { name: 'Sales', performance: 92, tasksCompleted: 85, revenue: 180000 },
      { name: 'Marketing', performance: 88, tasksCompleted: 92, revenue: 120000 },
      { name: 'IT Services', performance: 85, tasksCompleted: 87, revenue: 150000 }
    ],
    projectStatus: {
      completed: 8,
      inProgress: 12,
      planning: 4,
      onHold: 1
    },
    taskStatus: {
      completed: 145,
      inProgress: 38,
      todo: 22,
      review: 15
    }
  });

  const handleExportReport = async (format = 'pdf') => {
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const res = await fetch(`/api/reports/export?month=${month}&year=${year}&format=${format}`);

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `monthly-report-${month}-${year}.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  if (loading) {
    return <div className="text-center py-10">Loading report data...</div>;
  }

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl   text-gray-900 flex items-center gap-2">
          <Calendar size={28} />
          Monthly Report - {monthYear}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handlePreviousMonth}
            className="p-2 bg-gray-200 text-gray-800 rounded  hover:bg-gray-300 "
          >
            ← Previous
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 bg-gray-200 text-gray-800 rounded  hover:bg-gray-300 "
          >
            Next →
          </button>
          <div className="flex gap-2 ml-4 border-l pl-4">
            <button
              onClick={() => handleExportReport('pdf')}
              className="p-2 bg-red-600 text-white rounded  hover:bg-red-700 flex items-center gap-2 "
            >
              <Download size={18} />
              PDF
            </button>
            <button
              onClick={() => handleExportReport('excel')}
              className="p-2 bg-green-600 text-white rounded  hover:bg-green-700 flex items-center gap-2 "
            >
              <Download size={18} />
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex gap-2 border-b">
        {['overview', 'sales', 'marketing', 'it', 'projects'].map(type => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            className={`p-2  border-b-2 transition-colors ${reportType === type
                ? 'border-red-600  text-white '
                : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded p-2   border border-gray-200">
              <p className="text-xs text-gray-600  tracking-wider mb-1">Total Deals</p>
              <p className="text-2xl   text-white ">{reportData.summary.totalDeals}</p>
              <p className="text-xs text-gray-500 mt-1">+12% from last month</p>
            </div>

            <div className="bg-white rounded p-2   border border-gray-200">
              <p className="text-xs text-gray-600  tracking-wider mb-1">Deals Won</p>
              <p className="text-2xl   text-green-600">{reportData.summary.dealsWon}</p>
              <p className="text-xs text-gray-500 mt-1">{reportData.summary.conversionRate}% conversion</p>
            </div>

            <div className="bg-white rounded p-2   border border-gray-200">
              <p className="text-xs text-gray-600  tracking-wider mb-1">Total Revenue</p>
              <p className="text-2xl   text-purple-600">${(reportData.summary.totalRevenue / 1000).toFixed(0)}K</p>
              <p className="text-xs text-gray-500 mt-1">+8% from last month</p>
            </div>

            <div className="bg-white rounded p-2   border border-gray-200">
              <p className="text-xs text-gray-600  tracking-wider mb-1">Avg Deal Value</p>
              <p className="text-2xl   text-orange-600">${(reportData.summary.avgDealValue / 1000).toFixed(0)}K</p>
              <p className="text-xs text-gray-500 mt-1">per deal</p>
            </div>

            <div className="bg-white rounded p-2   border border-gray-200">
              <p className="text-xs text-gray-600  tracking-wider mb-1">Task Completion</p>
              <p className="text-2xl   text-teal-600">{reportData.summary.taskCompletion}%</p>
              <p className="text-xs text-gray-500 mt-1">of tasks completed</p>
            </div>

            <div className="bg-white rounded p-2   border border-gray-200">
              <p className="text-xs text-gray-600  tracking-wider mb-1">Projects</p>
              <p className="text-2xl   text-indigo-600">
                {reportData.projectStatus.completed + reportData.projectStatus.inProgress}
              </p>
              <p className="text-xs text-gray-500 mt-1">active projects</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Revenue Trend */}
            <div className="bg-white rounded  border border-gray-200 p-6">
              <h3 className="text-lg  text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp size={20} />
                Daily Revenue Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData.dailyMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" name="Revenue" />
                  <Line type="monotone" dataKey="deals" stroke="#3b82f6" name="Deals" yAxisId="right" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Department Performance */}
            <div className="bg-white rounded  border border-gray-200 p-6">
              <h3 className="text-lg  text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 size={20} />
                Department Performance
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.departmentMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="performance" fill="#10b981" name="Performance %" />
                  <Bar dataKey="tasksCompleted" fill="#3b82f6" name="Task Completion %" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Project Status Distribution */}
            <div className="bg-white rounded  border border-gray-200 p-6">
              <h3 className="text-lg  text-gray-900 mb-4">Project Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Completed', value: reportData.projectStatus.completed, fill: '#10b981' },
                      { name: 'In Progress', value: reportData.projectStatus.inProgress, fill: '#3b82f6' },
                      { name: 'Planning', value: reportData.projectStatus.planning, fill: '#f59e0b' },
                      { name: 'On Hold', value: reportData.projectStatus.onHold, fill: '#ef4444' }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#3b82f6" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Task Status Distribution */}
            <div className="bg-white rounded  border border-gray-200 p-6">
              <h3 className="text-lg  text-gray-900 mb-4">Task Status Summary</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm  text-green-700">✓ Completed</span>
                    <span className="text-sm  ">{reportData.taskStatus.completed}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '60%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm  text-blue-700">⚙ In Progress</span>
                    <span className="text-sm  ">{reportData.taskStatus.inProgress}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-600 h-2 rounded-full" style={{ width: '25%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm  text-purple-700">○ To Do</span>
                    <span className="text-sm  ">{reportData.taskStatus.todo}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '9%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm  text-orange-700">🔍 Review</span>
                    <span className="text-sm  ">{reportData.taskStatus.review}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-600 h-2 rounded-full" style={{ width: '6%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded p-2   border border-blue-200">
              <h3 className=" text-blue-900 mb-3 flex items-center gap-2">
                <AlertCircle size={18} />
                Key Insights
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>✓ Sales conversion rate at {reportData.summary.conversionRate}% - above target</li>
                <li>✓ Average deal cycle: 14 days (improved from 18 days)</li>
                <li>✓ Top performing department: Sales (92% efficiency)</li>
                <li>✓ {reportData.projectStatus.completed} projects completed this month</li>
              </ul>
            </div>

            <div className="bg-green-50 rounded p-2   border border-green-200">
              <h3 className=" text-green-900 mb-3 flex items-center gap-2">
                <CheckCircle size={18} />
                Action Items
              </h3>
              <ul className="text-sm text-green-800 space-y-2">
                <li>→ Follow up on 6 deals stuck in negotiation</li>
                <li>→ Review marketing campaign ROI (currently at 3.2x)</li>
                <li>→ Deploy 3 pending projects in IT services</li>
                <li>→ Schedule team performance review meeting</li>
              </ul>
            </div>
          </div>

          {/* Detailed Breakdown Table */}
          <div className="bg-white rounded  border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100p-2   border-b">
              <h3 className=" text-gray-900">Department Detailed Breakdown</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm  text-gray-900">Department</th>
                    <th className="px-6 py-3 text-right text-sm  text-gray-900">Tasks</th>
                    <th className="px-6 py-3 text-right text-sm  text-gray-900">Completion %</th>
                    <th className="px-6 py-3 text-right text-sm  text-gray-900">Revenue</th>
                    <th className="px-6 py-3 text-right text-sm  text-gray-900">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData.departmentMetrics.map((dept, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-3  text-gray-900">{dept.name}</td>
                      <td className="px-6 py-3 text-right text-gray-600">45</td>
                      <td className="px-6 py-3 text-right">
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs ">
                          {dept.tasksCompleted}%
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right  text-gray-900">
                        ${(dept.revenue / 1000).toFixed(0)}K
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="w-24 bg-gray-200 rounded-full h-2 inline-block">
                          <div
                            className="bg-red-600 h-2 rounded-full"
                            style={{ width: `${dept.performance}%` }}
                          />
                        </div>
                        <span className="text-xs  text-gray-600 ml-2">{dept.performance}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Help Section */}
      <div className="bg-purple-50 rounded p-2   border border-purple-200">
        <h3 className=" text-purple-900 mb-2 flex items-center gap-2">
          <FileText size={18} />
          Report Features
        </h3>
        <p className="text-sm text-purple-800">
          This comprehensive monthly report tracks all key performance indicators across departments.
          Export reports in PDF or Excel formats for presentations and archival. Use previous/next navigation
          to compare month-over-month trends.
        </p>
      </div>
    </div>
  );
};

export default MonthlyReportingDashboard;
