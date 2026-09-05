import React from 'react';
import { Mail, MousePointerClick, TrendingUp, Users, Target, BarChart2 } from 'lucide-react';

const MarketingMockup = () => {
  return (
    <div className="w-full h-full bg-[#f8f9fa] flex flex-col font-sans select-none overflow-hidden relative">
      {/* Top Header */}
      <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-white  text-[10px]">C</div>
          <span className="font-semibold text-slate-800 text-sm">Codigix CRM</span>
          <div className="h-4 w-px bg-slate-300 mx-2"></div>
          <div className="flex gap-4 text-xs font-medium text-slate-500">
            <span className="text-red-600 border-b-2 border-red-600 pb-[14px] mt-[14px]">Campaigns</span>
            <span className="hover:text-slate-800">Email</span>
            <span className="hover:text-slate-800">Social</span>
            <span className="hover:text-slate-800">Analytics</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded flex items-center gap-1.5 hover:bg-red-700">
            + New Campaign
          </button>
        </div>
      </div>

      <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-end">
          <h1 className="text-xl font-semibold text-slate-800">Marketing Overview</h1>
          <span className="text-xs text-slate-500 font-medium">Last 30 Days</span>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Leads Gen', value: '1,248', sub: '+15.2% vs last month', icon: <Users size={14} className="text-blue-500" /> },
            { label: 'Avg Conversion Rate', value: '3.8%', sub: '+0.4% vs last month', icon: <Target size={14} className="text-red-500" /> },
            { label: 'Email Open Rate', value: '24.5%', sub: '-1.2% vs last month', icon: <Mail size={14} className="text-amber-500" /> },
            { label: 'Cost Per Lead', value: '$12.40', sub: '-$2.10 vs last month', icon: <TrendingUp size={14} className="text-emerald-500" /> }
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded border border-slate-200 p-4 flex flex-col shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] text-slate-500  uppercase tracking-wider">{kpi.label}</span>
                {kpi.icon}
              </div>
              <span className="text-2xl  text-slate-800 mb-1">{kpi.value}</span>
              <span className="text-[10px] text-slate-400 font-medium">{kpi.sub}</span>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-4 flex-1">

          {/* Active Campaigns List */}
          <div className="col-span-2 bg-white rounded border border-slate-200 shadow-sm flex flex-col min-h-[250px]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <BarChart2 size={14} className="text-slate-400" /> Active Campaigns
              </h3>
              <span className="text-[10px] text-red-600 font-medium cursor-pointer">View All</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="grid grid-cols-12 gap-2 p-2 border-b border-slate-100 text-[9px]  text-slate-400 uppercase">
                <div className="col-span-5">Campaign Name</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-2 text-right">Spend</div>
                <div className="col-span-3 text-right">Leads</div>
              </div>
              {[
                { name: 'Q4 Product Launch - Email', type: 'Email', status: 'Active', spend: '$450', leads: 124, progress: 65 },
                { name: 'Retargeting Ads - Social', type: 'Social', status: 'Active', spend: '$1,200', leads: 342, progress: 85 },
                { name: 'Webinar Promo Series', type: 'Email', status: 'Paused', spend: '$150', leads: 45, progress: 100 },
                { name: 'Enterprise Lead Gen', type: 'Search', status: 'Active', spend: '$800', leads: 89, progress: 40 },
              ].map((camp, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 p-2 border-b border-slate-50 items-center hover:bg-slate-50 text-xs">
                  <div className="col-span-5 flex flex-col">
                    <span className="font-semibold text-slate-700 truncate">{camp.name}</span>
                    <span className="text-[9px] text-slate-400">{camp.type}</span>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <span className={`text-[8px]  px-2 py-0.5 rounded-full ${camp.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {camp.status}
                    </span>
                  </div>
                  <div className="col-span-2 text-right font-medium text-slate-600">{camp.spend}</div>
                  <div className="col-span-3 flex flex-col items-end justify-center gap-1">
                    <span className=" text-slate-700">{camp.leads}</span>
                    <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${camp.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Traffic Sources */}
          <div className="col-span-1 bg-white rounded border border-slate-200 shadow-sm flex flex-col p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <MousePointerClick size={14} className="text-slate-400" /> Traffic Sources
            </h3>

            <div className="flex-1 flex flex-col justify-center gap-4">
              {[
                { name: 'Organic Search', val: '45%', color: 'bg-red-600' },
                { name: 'Direct', val: '25%', color: 'bg-red-400' },
                { name: 'Social Media', val: '20%', color: 'bg-red-300' },
                { name: 'Referral', val: '10%', color: 'bg-red-200' },
              ].map((src, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">{src.name}</span>
                    <span className=" text-slate-800">{src.val}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${src.color} rounded-full`} style={{ width: src.val }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MarketingMockup;
