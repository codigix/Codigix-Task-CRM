import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ClipboardList, Activity, CheckCircle, Trophy, BarChart3, Clock, Download } from 'lucide-react';
import LiveEmployeeDashboard from '../hr/LiveEmployeeDashboard';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const EmployeeMonthlyReport = () => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [autoDownload, setAutoDownload] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/performance/monthly-report`, {
        params: { month: selectedMonth, year: selectedYear }
      });
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching monthly report:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadEmployeeReport = async (employee) => {
    setSelectedEmployeeId(employee.id);
    setAutoDownload(true);
  };

  const handleCloseDashboard = () => {
    setSelectedEmployeeId(null);
    setAutoDownload(false);
  };

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, selectedYear]);

  const getScoreColorClass = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBgClass = (score) => {
    if (score >= 90) return 'bg-green-100 text-green-700 border-green-200';
    if (score >= 70) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const getProgressBarClass = (efficiency) => {
    if (efficiency >= 100) return 'bg-green-500';
    if (efficiency >= 80) return 'bg-orange-400';
    return 'bg-red-500';
  };

  const topPerformers = reportData.slice(0, 3);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-2">
        <div>
          <h1 className="text-xl  text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-blue-600" />
            Monthly Performance Report
          </h1>
          <p className="text-slate-500 text-sm mt-1">Track employee velocity, efficiency, and overall scores.</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border border-slate-200">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="border-none bg-transparent text-slate-700 focus:ring-0 outline-none text-sm font-medium"
          >
            {months.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <div className="w-px h-6 bg-slate-200"></div>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border-none bg-transparent text-slate-700 focus:ring-0 outline-none w-20 text-sm font-medium"
          />
        </div>
      </div>

      {/* Top Performers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {topPerformers.map((emp, idx) => (
          <div key={emp.id} className="bg-white/80 backdrop-blur-xl rounded p-2 border border-white shadow-lg shadow-slate-200/50 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 ${getProgressBarClass(emp.overallScore)}`}></div>

            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center  text-lg border-2 ${getScoreBgClass(emp.overallScore)}`}>
                #{idx + 1}
              </div>
              <Trophy className={idx === 0 ? "text-yellow-500" : idx === 1 ? "text-slate-400" : "text-amber-700"} size={30} />
            </div>

            <h3 className="text-lg  text-slate-800 mb-1">{emp.name}</h3>

            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-xl  ${getScoreColorClass(emp.overallScore)}`}>
                {emp.overallScore}
              </span>
              <span className="text-slate-500 text-sm font-medium">/ 100 pts</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Velocity</p>
                <p className=" text-slate-700 flex items-center gap-1">
                  <Activity size={14} className="text-blue-500" />
                  {emp.totalEffortPoints} pts
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Tasks</p>
                <p className=" text-slate-700 flex items-center gap-1">
                  <CheckCircle size={14} className="text-green-500" />
                  {emp.tasksCompleted}
                </p>
              </div>
            </div>
          </div>
        ))}
        {topPerformers.length === 0 && !loading && (
          <div className="col-span-3 text-center py-12 bg-white rounded border border-dashed border-slate-300 text-slate-500">
            No performers found for this month yet.
          </div>
        )}
      </div>

      {/* Detailed Data Table */}
      <div className="">
        <div className="mb-3">
          <h3 className=" text-slate-800 flex items-center gap-2">
            <ClipboardList size={18} className="text-slate-500" />
            Detailed Breakdown
          </h3>
        </div>

        <div className="overflow-x-auto bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs">
                <th className="p-2  border-b border-slate-200">Employee Name</th>
                <th className="p-2  border-b border-slate-200 text-center">Tasks</th>
                <th className="p-2  border-b border-slate-200 text-center">Effort Points</th>
                <th className="p-2  border-b border-slate-200 text-center">Est. Hrs</th>
                <th className="p-2  border-b border-slate-200 text-center">Actual Hrs</th>
                <th className="p-2  border-b border-slate-200">Time Efficiency</th>
                <th className="p-2  border-b border-slate-200 text-center">Overall Score</th>
                <th className="p-2  border-b border-slate-200 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-4 text-center text-slate-500">
                    <div className="flex justify-center items-center gap-3">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      Loading report data...
                    </div>
                  </td>
                </tr>
              ) : reportData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors text-xs">
                  <td className="p-2">
                    <div className=" text-slate-800">{row.name}</div>
                  </td>
                  <td className="p-2 text-center">
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-sm font-medium">
                      <CheckCircle size={14} className="text-slate-400" />
                      {row.tasksCompleted}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <span className=" text-slate-700">{row.totalEffortPoints}</span>
                  </td>
                  <td className="p-2 text-center text-slate-500">{row.totalEstimatedHours.toFixed(1)}</td>
                  <td className="p-2 text-center font-medium">{row.totalActualHours.toFixed(1)}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-3">
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex-1 max-w-[120px]">
                        <div
                          className={`h-full rounded-full ${getProgressBarClass(row.timeEfficiency)}`}
                          style={{ width: `${Math.min(row.timeEfficiency, 100)}%` }}
                        ></div>
                      </div>
                      <span className={`text-sm  ${row.timeEfficiency >= 100 ? 'text-green-600' : 'text-slate-600'}`}>
                        {Math.round(row.timeEfficiency)}%
                      </span>
                    </div>
                  </td>
                  <td className="p-2 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm  border ${getScoreBgClass(row.overallScore)}`}>
                      {row.overallScore}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => { setSelectedEmployeeId(row.id); setAutoDownload(false); }}
                        className="text-blue-500 hover:text-blue-700 font-medium text-sm transition-colors flex items-center gap-1"
                      >
                        View
                      </button>
                      <button
                        onClick={() => downloadEmployeeReport(row)}
                        className="transition-colors text-slate-500 hover:text-slate-700"
                        title="Download detailed report (PDF)"
                      >
                        <Download size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && reportData.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-4 text-center text-slate-500">
                    No data available for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEmployeeId && (
        <LiveEmployeeDashboard
          employeeId={selectedEmployeeId}
          onClose={handleCloseDashboard}
          autoDownload={autoDownload}
        />
      )}
    </div>
  );
};

export default EmployeeMonthlyReport;
