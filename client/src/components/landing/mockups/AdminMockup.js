import React from 'react';
import { Shield, Activity, Users, Settings, HelpCircle, BarChart2, Bell, Search, Server, Cpu } from 'lucide-react';

const AdminMockup = () => {
  return (
    <div className="w-full h-full bg-[#f8f9fa] flex font-sans select-none overflow-hidden relative">
      {/* Sidebar */}
      <div className="w-48 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 hidden md:flex">
        <div className="h-14 border-b border-slate-200 flex items-center px-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-white text-[10px] font-bold">C</div>
            <span className="font-bold text-slate-800 text-sm tracking-tight">Codigix</span>
          </div>
        </div>
        
        <div className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto no-scrollbar">
          {[
            { name: 'Dashboard', icon: <Activity size={14} />, active: true },
            { name: 'System', icon: <Server size={14} /> },
            { name: 'Analytics', icon: <BarChart2 size={14} /> },
            { name: 'Users', icon: <Users size={14} /> },
            { name: 'Security', icon: <Shield size={14} /> },
            { name: 'Settings', icon: <Settings size={14} /> },
            { name: 'Help', icon: <HelpCircle size={14} /> },
          ].map((item, i) => (
            <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${item.active ? 'bg-red-600 text-white shadow-md shadow-red-600/20' : 'text-slate-500 hover:bg-slate-100'}`}>
              {item.icon}
              {item.name}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8f9fa] relative">
        {/* Header */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 relative z-10">
          <h2 className="font-bold text-slate-800 text-sm truncate">Admin Dashboard</h2>
          <div className="flex items-center gap-4">
            <div className="relative hidden lg:block">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search..." className="bg-slate-50 border border-slate-200 rounded text-xs pl-7 pr-2 py-1.5 w-48 outline-none focus:border-red-400" disabled />
            </div>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="relative">
                <Bell size={14} className="text-slate-400 hover:text-slate-600 cursor-pointer" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex items-center gap-2 cursor-pointer">
                <img src="https://i.pravatar.cc/100?img=11" alt="Admin" className="w-6 h-6 rounded-full border border-slate-200" />
                <div className="hidden lg:block leading-tight">
                  <div className="text-[10px] font-bold text-slate-800">Alex R.</div>
                  <div className="text-[9px] text-slate-400">Super Admin</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6 no-scrollbar">
          
          <div>
             <h3 className="text-sm font-bold text-slate-800 mb-3">System Health</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {/* Status Card */}
               <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-4 text-white shadow-lg shadow-red-600/20 relative overflow-hidden flex flex-col justify-between h-32">
                 <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500 rounded-full blur-2xl opacity-50"></div>
                 <div className="flex justify-between items-start relative z-10">
                   <span className="text-xs font-semibold opacity-90">System Status</span>
                   <span className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full border border-white/20">Active</span>
                 </div>
                 <div className="relative z-10">
                   <div className="text-3xl font-extrabold tracking-tight mb-1">99.98%</div>
                   <div className="text-[9px] opacity-80 flex items-center gap-1">
                     <Activity size={10} /> Last updated: Just now
                   </div>
                 </div>
               </div>

               {/* Response Time Card */}
               <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between h-32">
                 <div className="flex justify-between items-start">
                   <span className="text-xs font-semibold text-slate-600">Server Response</span>
                   <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">+2.1%</span>
                 </div>
                 <div className="text-2xl font-bold text-slate-800">184ms <span className="text-xs font-medium text-slate-400">Avg</span></div>
                 {/* Fake line chart */}
                 <div className="w-full h-8 flex items-end gap-1 opacity-80">
                   {[4,7,5,8,4,9,6,7,3,5,8,10,7,5,4].map((h, i) => (
                     <div key={i} className="flex-1 bg-red-100 rounded-t-sm relative group">
                       <div className="absolute bottom-0 w-full bg-red-500 rounded-t-sm transition-all" style={{ height: `${h * 10}%` }}></div>
                     </div>
                   ))}
                 </div>
               </div>

               {/* API Health Card */}
               <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between h-32">
                 <div className="flex justify-between items-start">
                   <span className="text-xs font-semibold text-slate-600 flex items-center gap-1"><Cpu size={12}/> API Health</span>
                   <span className="w-2 h-2 rounded-full bg-green-500"></span>
                 </div>
                 <div>
                   <div className="text-2xl font-bold text-slate-800">99.99%</div>
                   <div className="text-[10px] font-medium text-slate-400">100% Success Rate</div>
                 </div>
                 {/* Fake bar chart */}
                 <div className="w-full h-8 flex items-end gap-1">
                   {[8,9,7,10,9,8,10,9,9,8,10,9].map((h, i) => (
                     <div key={i} className="w-full bg-slate-100 rounded-sm relative">
                       <div className="absolute bottom-0 w-full bg-slate-800 rounded-sm" style={{ height: `${h * 10}%` }}></div>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
          </div>

          <div className="flex-1 flex flex-col min-h-[200px]">
             <h3 className="text-sm font-bold text-slate-800 mb-3">Global Revenue Analytics</h3>
             <div className="flex-1 bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col">
               <div className="mb-4">
                 <div className="text-xs font-semibold text-slate-600">Monthly Recurring Revenue (MRR)</div>
                 <div className="flex items-end gap-2 mt-1">
                   <div className="text-2xl font-bold text-slate-800">$345,780</div>
                   <div className="text-[10px] font-bold text-green-600 mb-1">+14.5% vs last month</div>
                 </div>
               </div>
               {/* Large Line Chart Visual */}
               <div className="flex-1 relative w-full border-b border-l border-slate-100 mt-2">
                 <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <path d="M0,90 Q10,70 20,80 T40,60 T60,50 T80,30 T100,20" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
                    <path d="M0,80 Q15,60 30,70 T50,40 T70,50 T90,20 L100,10" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
                    <path d="M0,80 Q15,60 30,70 T50,40 T70,50 T90,20 L100,10 L100,100 L0,100 Z" fill="url(#redGradient)" opacity="0.1" />
                    <defs>
                      <linearGradient id="redGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#dc2626" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                 </svg>
                 {/* X Axis Labels */}
                 <div className="absolute -bottom-5 w-full flex justify-between px-2 text-[8px] text-slate-400 font-medium">
                   <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
                 </div>
               </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminMockup;
