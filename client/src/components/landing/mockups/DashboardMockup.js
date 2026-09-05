import React from 'react';
import { Phone, Calendar, CheckCircle2, TrendingUp, AlertCircle, CircleUser } from 'lucide-react';

const DashboardMockup = () => {
  return (
    <div className="w-full h-full bg-[#f8f9fa] flex flex-col font-sans select-none overflow-hidden relative">
      {/* Top Header */}
      <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-white  text-[10px]">C</div>
          <span className="font-semibold text-slate-800 text-sm">Codigix CRM</span>
          <div className="h-4 w-px bg-slate-300 mx-2"></div>
          <div className="flex gap-4 text-xs font-medium text-slate-500">
            <span className="text-red-600 border-b-2 border-red-600 pb-[14px] mt-[14px]">Dashboard</span>
            <span className="hover:text-slate-800">Leads</span>
            <span className="hover:text-slate-800">Opportunities</span>
            <span className="hover:text-slate-800">Tasks</span>
            <span className="hover:text-slate-800">Reports</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 rounded-md px-3 py-1.5 text-xs text-slate-400 flex items-center gap-2 border border-slate-200 w-48">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            Search...
          </div>
          <div className="relative">
            <AlertCircle size={14} className="text-slate-500" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
          </div>
          <div className="flex items-center gap-2 ml-2 pl-3 border-l border-slate-200">
            <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden">
              <img src="https://i.pravatar.cc/100?img=47" alt="User" />
            </div>
            <span className="text-xs font-medium text-slate-700">Sarah J.</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto no-scrollbar">
        <h1 className="text-xl font-semibold text-slate-800">Sales Dashboard</h1>

        {/* KPI Row */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'Total Tasks Today', value: '42', sub: '12 Active Tasks' },
            { label: 'Calls Made', value: '156', sub: '+12% Today', icon: <Phone size={12} className="inline ml-1 text-green-500" /> },
            { label: 'Meetings Scheduled', value: '8', sub: 'Upcoming' },
            { label: 'Active Deals', value: '24', sub: 'In Pipeline' },
            { label: 'Won Revenue', value: '₹12.5M', sub: 'This Period' }
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded border border-slate-200 p-4 flex flex-col shadow-sm">
              <span className="text-[10px] text-slate-500 font-medium mb-1">{kpi.label}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl  text-slate-800">{kpi.value}</span>
                {kpi.icon && <span>{kpi.icon}</span>}
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-1">{kpi.sub}</span>
            </div>
          ))}
        </div>

        {/* Middle Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Main Chart */}
          <div className="col-span-2 bg-white rounded border border-slate-200 shadow-sm p-5 flex flex-col relative overflow-hidden min-h-[220px]">
            <h3 className="text-sm font-semibold text-slate-800 mb-6">Pipeline Overview</h3>
            <div className="flex-1 relative border-l border-b border-slate-100 flex items-end pt-4 pr-2">
              {/* Y Axis */}
              <div className="absolute left-0 bottom-0 h-full w-full flex flex-col justify-between pointer-events-none pb-5">
                {['₹4', '₹3', '₹2', '₹1', '₹0'].map(val => (
                  <div key={val} className="w-full border-t border-slate-50 border-dashed relative">
                    <span className="absolute -left-4 -top-2 text-[9px] text-slate-400">{val}</span>
                  </div>
                ))}
              </div>
              {/* X Axis & Data */}
              <div className="w-full flex justify-around absolute bottom-2 left-0 px-8">
                {[
                  { stage: 'Prospects', deals: 45 },
                  { stage: 'Qualified Leads', deals: 28 },
                  { stage: 'Proposal', deals: 16 },
                  { stage: 'Won', deals: 8 }
                ].map(data => (
                  <div key={data.stage} className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-400 mb-2">{data.stage}</span>
                    <span className="text-xs  text-slate-800">{data.deals}</span>
                    <span className="text-[9px] text-slate-400">Deals</span>
                  </div>
                ))}
              </div>

              {/* Fake Line Chart SVG */}
              <svg className="absolute inset-0 w-full h-full preserve-3d ml-4 mb-4 z-10" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d="M 12 80 L 37 50 L 62 70 L 87 30" fill="none" stroke="#dc2626" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <path d="M 12 80 L 37 50 L 62 70 L 87 30 L 87 100 L 12 100 Z" fill="url(#red-grad)" opacity="0.1" />
                <defs>
                  <linearGradient id="red-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <circle cx="12" cy="80" r="1.5" fill="#dc2626" stroke="#fff" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                <circle cx="37" cy="50" r="1.5" fill="#dc2626" stroke="#fff" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                <circle cx="62" cy="70" r="1.5" fill="#dc2626" stroke="#fff" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                <circle cx="87" cy="30" r="1.5" fill="#dc2626" stroke="#fff" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
            <div className="text-center mt-2 text-[10px]  text-slate-600">Total Pipeline Value: ₹4.8M</div>
          </div>

          {/* Side Panels */}
          <div className="col-span-1 flex flex-col gap-4">
            <div className="bg-white rounded border border-slate-200 shadow-sm p-4 flex-1 flex flex-col relative min-h-[140px]">
              <h3 className="text-sm font-semibold text-slate-800 absolute top-4 left-4">Sales Targets Progress</h3>

              <div className="flex-1 flex flex-col items-center justify-center mt-4">
                <div className="relative w-24 h-24 mb-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#dc2626" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="50.2" className="transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl  text-slate-800">80%</span>
                    <span className="text-[8px] text-slate-500 text-center leading-tight mt-1">40k / 50k<br />Revenue</span>
                  </div>
                </div>
                <span className="text-[9px] text-slate-500 font-medium">Active Deals: 24</span>
              </div>
              <div className="flex justify-between items-center w-full mt-2 border-t border-slate-100 pt-2">
                <span className="text-[9px] text-slate-400">Overall Target</span>
                <span className="text-[9px]  text-slate-700">80%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Added 3rd column box for 'Upcoming Event' to match screenshot structure exactly */}
        <div className="absolute top-[162px] right-5 w-[24%] bg-white rounded border border-slate-200 shadow-sm p-4 min-h-[220px]">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Upcoming Event</h3>
          <div className="flex flex-col gap-3">
            <div className="p-2 border border-slate-100 rounded-md bg-slate-50 flex flex-col gap-1">
              <span className="text-[10px]  text-slate-700">Client Sync: Acme Corp</span>
              <span className="text-[9px] text-slate-500">Today, 2:30 PM (Zoom)</span>
            </div>
            <div className="p-2 border border-slate-100 rounded-md bg-slate-50 flex flex-col gap-1">
              <span className="text-[10px]  text-slate-700">Q4 Strategy Review</span>
              <span className="text-[9px] text-slate-500">Tomorrow, 10:00 AM (HQ)</span>
            </div>
            <div className="p-2 border border-slate-100 rounded-md bg-slate-50 flex flex-col gap-1">
              <span className="text-[10px]  text-slate-700">Demo with Nexus Inc</span>
              <span className="text-[9px] text-slate-500">Oct 30, 4:00 PM (Meet)</span>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-3 gap-4 pb-4">
          {/* Sales Targets */}
          <div className="bg-white rounded border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Sales Targets</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl  text-slate-800">48%</span>
              <span className="text-xs text-green-500 font-medium">↑ +2.3%</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-50 rounded p-2 text-center border border-slate-100">
                <div className="text-[9px] text-slate-500 mb-1">Total Sales</div>
                <div className="text-sm  text-slate-800">500</div>
              </div>
              <div className="flex-1 bg-slate-50 rounded p-2 text-center border border-slate-100">
                <div className="text-[9px] text-slate-500 mb-1">Unit Target</div>
                <div className="text-sm  text-slate-800">500 Units</div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Performance Metrics</h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 flex items-center gap-1"><TrendingUp size={10} /> Win Rate</span>
                <span className=" text-slate-800">48% <span className="text-green-500 font-normal">↑</span></span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 flex items-center gap-1"><CircleUser size={10} /> Avg. Deal Size</span>
                <span className=" text-slate-800">500</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 flex items-center gap-1"><Calendar size={10} /> Sales Cycle</span>
                <span className=" text-slate-800">20</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 flex items-center gap-1"><CheckCircle2 size={10} /> Quote Approval</span>
                <span className=" text-slate-800">79%</span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white rounded border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              Alerts <span className="bg-red-500 text-white text-[8px] px-1.5 rounded-full">1</span>
            </h3>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-start gap-2 text-[10px]">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1"></div>
                <span className="text-slate-600">New lead added: Lead #421</span>
              </div>
              <div className="flex items-start gap-2 text-[10px]">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1"></div>
                <span className="text-slate-600">Quote revision request from XYZ Ltd</span>
              </div>
              <div className="flex items-start gap-2 text-[10px]">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 cursor-pointer hover:underline"></div>
                <span className="text-slate-600">Target achievement below 50%</span>
              </div>
              <div className="flex items-start gap-2 text-[10px]">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1"></div>
                <span className="text-slate-600">Follow-up pending with ABC Pvt Ltd</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardMockup;
