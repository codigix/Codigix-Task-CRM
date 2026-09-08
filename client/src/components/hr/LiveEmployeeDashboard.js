import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, Download, AlertTriangle } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CircularProgress = ({ percentage, color, label }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-24 h-24">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-slate-100"
            strokeDasharray="4 4"
          />
          {/* Progress Circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`${color} transition-all duration-1000 ease-in-out`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-xl  text-slate-800">{percentage}%</span>
        </div>
      </div>
      <span className="text-xs font-medium text-slate-500 mt-2 text-center max-w-[80px] leading-tight">{label}</span>
    </div>
  );
};

const KPIBlock = ({ label, value, subtext, borderRight }) => (
  <div className={`p-2 ${borderRight ? 'border-r border-slate-200' : ''}`}>
    <h4 className="text-[10px]  text-slate-500 uppercase tracking-wider mb-2">{label}</h4>
    <div className="text-xl text-[#1a233a] mb-1">{value}</div>
    <div className="text-xs text-slate-500">{subtext}</div>
  </div>
);

const LiveEmployeeDashboard = ({ employeeId, onClose, autoDownload }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const dashboardRef = useRef(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/performance/employee/${employeeId}/live-dashboard`);
        setData(response.data);
      } catch (error) {
        console.error("Error fetching live dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    if (employeeId) fetchDashboard();
  }, [employeeId]);

  useEffect(() => {
    if (data && autoDownload && !isDownloading) {
      setTimeout(() => {
        handleDownloadPDF();
      }, 1000); // Wait for animations to finish
    }
  }, [data, autoDownload]);

  const handleDownloadPDF = async () => {
    if (!dashboardRef.current) return;
    setIsDownloading(true);
    try {
      const element = dashboardRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');

      // Use standard A4 width in mm (210mm)
      const pdfWidth = 210;
      // Calculate proportional height
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // Create a single-page PDF with standard A4 width and proportional height
      const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${data.profile.name.replace(/\\s+/g, '_')}_Performance_Report.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white p-4 rounded-lg shadow-xl flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-[#151B2B] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600 font-medium">Generating Live Performance Dashboard...</p>
        </div>
      </div>,
      document.body
    );
  }

  if (!data) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-white overflow-y-auto">
      <div ref={dashboardRef} className="w-full bg-white pb-16">
        {/* Top Navigation Bar */}
        <div className="bg-red-600 text-white shadow-sm">
          <div className="max-w-[1000px] mx-auto p-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl flex items-center gap-2">
                <span className="">Codigix </span> &bull; Live Performace Analytics Report
              </h1>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm text-white">Management / HR &bull; Monthly + Quarterly</span>
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded border border-white/20 transition-colors text-sm font-medium"
                data-html2canvas-ignore
              >
                {isDownloading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Download size={16} />
                )}
                {isDownloading ? 'Generating...' : 'Download PDF'}
              </button>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-full transition-colors ml-2"
                data-html2canvas-ignore
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-[1000px] mx-auto px-8 py-10 space-y-4">

          {/* Title Header */}
          <div>
            <h2 className="text-xl text-[#151B2B] mb-2">Live Employee Performance Dashboard</h2>
            <p className="text-slate-500 text-xs">A visual monthly report designed to reflect current task progress, active work time, quality, deadlines and ownership.</p>
          </div>

          {/* Info Grid */}
          <div className="bg-white border border-[#E2E8F0] grid grid-cols-5">
            <div className="p-4 border-r border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="text-xs  text-[#151B2B]  mb-1.5">Employee</div>
              <div className="text-sm text-slate-900">{data.profile.name}</div>
            </div>
            <div className="p-4 border-r border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="text-xs  text-[#151B2B]  mb-1.5">Designation</div>
              <div className="text-sm text-slate-900">{data.profile.designation}</div>
            </div>
            <div className="p-4 border-r border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="text-xs  text-[#151B2B]  mb-1.5">Department</div>
              <div className="text-sm text-slate-900">{data.profile.department}</div>
            </div>
            <div className="p-4 border-r border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="text-xs  text-[#151B2B]  mb-1.5">Manager</div>
              <div className="text-sm text-slate-900">{data.profile.manager}</div>
            </div>
            <div className="p-4 bg-[#F8FAFC]">
              <div className="text-xs  text-[#151B2B]  mb-1.5">Reporting Month</div>
              <div className="text-sm text-slate-900">Current Month</div>
            </div>
          </div>

          {/* Top KPIs Row */}
          <div className="bg-white border border-[#E2E8F0] grid grid-cols-6 divide-x divide-[#E2E8F0]">
            <div className="border-t-4 border-t-[#94A3B8]"><KPIBlock label="Tasks Assigned" value={data.overview.tasksAssigned} subtext="Current month" /></div>
            <div className="border-t-4 border-t-[#10B981]"><KPIBlock label="Completed" value={data.overview.tasksCompleted} subtext={`${data.overview.completionRate}% complete`} /></div>
            <div className="border-t-4 border-t-[#0EA5E9]"><KPIBlock label="On-Time" value={data.overview.onTimeRate + '%'} subtext="Deadline adherence" /></div>
            <div className="border-t-4 border-t-[#8B5CF6]"><KPIBlock label="Active Work" value={data.overview.activeWorkHours} subtext="IN PROGRESS only" /></div>
            <div className="border-t-4 border-t-[#14B8A6]"><KPIBlock label="Quality" value={data.overview.qualityRate + '%'} subtext="First-pass approval" /></div>
            <div className="border-t-4 border-t-[#1E293B]"><KPIBlock label="Performance" value={`${data.overview.overallScore} / 100`} subtext="Current score" /></div>
          </div>

          {/* 1. Live Progress Overview */}
          <section>
            <h3 className="text-md  text-[#151B2B] mb-2">1. Live Progress Overview</h3>
            <p className="text-xs text-slate-500 mb-6">Charts are designed to update automatically when the underlying task/time-log data changes. This dashboard is a live snapshot.</p>

            <div className="flex justify-between items-center px-12 bg-white py-12 border border-[#E2E8F0]">
              <CircularProgress percentage={data.gauges.taskCompletion} color="text-[#10B981]" label="Task completion" />
              <CircularProgress percentage={data.gauges.qualityApproval} color="text-[#3B82F6]" label="Quality approval" />
              <CircularProgress percentage={data.gauges.deadlineAdherence} color="text-[#0EA5E9]" label="Deadline adherence" />
              <CircularProgress percentage={data.gauges.effortEfficiency} color="text-[#8B5CF6]" label="Effort efficiency" />
              <CircularProgress percentage={data.gauges.processCompliance} color="text-[#10B981]" label="Process compliance" />
            </div>
          </section>

          {/* 2. Current Status Distribution */}
          <section>
            <h3 className="text-md  text-[#151B2B] mb-4">2. Current Status Distribution</h3>
            <div className="bg-white border border-[#E2E8F0] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#151B2B] ">
                  <tr>
                    <th className="p-4 border-b border-[#E2E8F0]">Status</th>
                    <th className="p-4 border-b border-[#E2E8F0]">Count</th>
                    <th className="p-4 border-b border-[#E2E8F0]">Share</th>
                    <th className="p-4 border-b border-[#E2E8F0]">Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-slate-700">
                  {data.statusDistribution.map(sd => (
                    <tr key={sd.status}>
                      <td className="p-4">{sd.status}</td>
                      <td className="p-4">{sd.count}</td>
                      <td className="p-4">{sd.share}</td>
                      <td className="p-4">{sd.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[13px] text-slate-500 mt-3 ml-1">Live indicator: The dashboard should recalculate immediately when a task changes status.</p>
          </section>

          {/* 3. Live Productivity & Time Analytics */}
          <section>
            <h2 className="text-xl  text-[#151B2B] mb-6 pb-4 border-b-2 border-[#E2E8F0]">Live Productivity & Time Analytics</h2>

            <h3 className="text-md  text-[#151B2B] mb-4">3. Active Time Logic</h3>
            <div className="bg-white border border-[#E2E8F0] overflow-hidden mb-10">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#151B2B] ">
                  <tr>
                    <th className="p-4 border-b border-[#E2E8F0]">Status</th>
                    <th className="p-4 border-b border-[#E2E8F0]">Timer State</th>
                    <th className="p-4 border-b border-[#E2E8F0]">Employee Active Time</th>
                    <th className="p-4 border-b border-[#E2E8F0]">Included in Performance Time?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-slate-700">
                  <tr><td className="p-4">TO DO</td><td className="p-4">Stopped</td><td className="p-4">0</td><td className="p-4">No</td></tr>
                  <tr><td className="p-4">IN PROGRESS</td><td className="p-4  text-[#10B981]">Running</td><td className="p-4">Session duration</td><td className="p-4">Yes</td></tr>
                  <tr><td className="p-4">PENDING REQUIREMENTS</td><td className="p-4">Stopped</td><td className="p-4">0</td><td className="p-4">No</td></tr>
                  <tr><td className="p-4">IN REVIEW</td><td className="p-4">Stopped</td><td className="p-4">0</td><td className="p-4">No</td></tr>
                  <tr><td className="p-4">DONE</td><td className="p-4">Stopped</td><td className="p-4">0</td><td className="p-4">No</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-md  text-[#151B2B] mb-4">4. Live Time KPIs</h3>
            <div className="bg-white border border-[#E2E8F0] grid grid-cols-6 mb-10">
              <div className="border-l-4 border-[#3B82F6]"><KPIBlock label="Estimated" value={data.timeKPIs.estimated} subtext="Planned effort" borderRight /></div>
              <div className="border-l-4 border-[#10B981]"><KPIBlock label="Active Logged" value={data.timeKPIs.activeLogged} subtext="Counted work" borderRight /></div>
              <div className="border-l-4 border-[#F59E0B]"><KPIBlock label="Remaining" value={data.timeKPIs.remaining} subtext="Open estimated effort" borderRight /></div>
              <div className="border-l-4 border-[#EF4444]"><KPIBlock label="Overrun" value={data.timeKPIs.overrun} subtext="Above estimate" borderRight /></div>
              <div className="border-l-4 border-[#8B5CF6]"><KPIBlock label="Waiting" value={data.timeKPIs.waiting} subtext="Excluded from active" borderRight /></div>
              <div className="border-l-4 border-[#14B8A6]"><KPIBlock label="Review" value={data.timeKPIs.review} subtext="Excluded from active" /></div>
            </div>
          </section>

          {/* 5. Weekly Performance */}
          <section>
            <h3 className="text-md  text-[#151B2B] mb-4">5. Weekly Performance Movement</h3>
            <div className="bg-white border border-[#E2E8F0] p-6 h-64 flex items-end relative overflow-hidden">
              <div className="absolute inset-0 p-6 flex items-end">
                <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="20" x2="400" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="0" y1="40" x2="400" y2="40" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="0" y1="60" x2="400" y2="60" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="0" y1="80" x2="400" y2="80" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="0" y1="100" x2="400" y2="100" stroke="#CBD5E1" strokeWidth="2" />

                  {/* Path connecting points */}
                  <path
                    d={`M 0 ${100 - data.weeklyPerformance[0]} L 100 ${100 - data.weeklyPerformance[1]} L 200 ${100 - data.weeklyPerformance[2]} L 300 ${100 - data.weeklyPerformance[3]} L 400 ${100 - data.weeklyPerformance[4]}`}
                    fill="none" stroke="#2563EB" strokeWidth="3"
                  />
                  {/* Data Points */}
                  {data.weeklyPerformance.map((val, idx) => (
                    <circle key={idx} cx={idx * 100} cy={100 - val} r="4" fill="#2563EB" />
                  ))}
                </svg>
              </div>
              {/* Axis labels */}
              <div className="absolute bottom-1 left-6 right-6 flex justify-between text-xs text-slate-400 ">
                <span>W1</span><span>W2</span><span>W3</span><span>W4</span><span>W5</span>
              </div>
              <div className="absolute left-1 top-6 bottom-6 flex flex-col justify-between text-[10px] text-slate-400 ">
                <span>100</span><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span>
              </div>
            </div>
          </section>

          {/* 6. Task Delivery */}
          <section>
            <h2 className="text-xl  text-[#151B2B] mb-6 pb-4 border-b-2 border-[#E2E8F0]">Task Delivery & Quality Analytics</h2>

            <h3 className="text-md  text-[#151B2B] mb-4 mt-8">8. Task-Level Performance</h3>
            <div className="bg-white border border-[#E2E8F0] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#151B2B] ">
                  <tr>
                    <th className="p-4 border-b border-[#E2E8F0]">Task</th>
                    <th className="p-4 border-b border-[#E2E8F0]">Priority</th>
                    <th className="p-4 border-b border-[#E2E8F0]">Estimated</th>
                    <th className="p-4 border-b border-[#E2E8F0]">Active Logged</th>
                    <th className="p-4 border-b border-[#E2E8F0]">Variance</th>
                    <th className="p-4 border-b border-[#E2E8F0]">Status</th>
                    <th className="p-4 border-b border-[#E2E8F0]">Review</th>
                    <th className="p-4 border-b border-[#E2E8F0]">On-Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-slate-700">
                  {data.taskLevelPerformance.length > 0 ? data.taskLevelPerformance.map(t => (
                    <tr key={t.id}>
                      <td className="p-4 font-medium text-[#151B2B]">{t.title}</td>
                      <td className="p-4">{t.priority}</td>
                      <td className="p-4">{t.estimated}</td>
                      <td className="p-4">{t.activeLogged}</td>
                      <td className={`p-4 ${t.variance.startsWith('-') ? 'text-[#10B981]' : t.variance === '0h' ? '' : 'text-[#EF4444]'}`}>{t.variance}</td>
                      <td className="p-4"><span className="bg-[#F1F5F9] px-2.5 py-1 rounded text-xs  text-slate-600">{t.status}</span></td>
                      <td className="p-4">{t.review}</td>
                      <td className="p-4">{t.onTime}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="8" className="p-8 text-center text-slate-400">No task data available for this employee.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </div>
    </div>,
    document.body
  );
};

export default LiveEmployeeDashboard;
