import React from 'react';
import { Filter, Search, ArrowUpRight, DollarSign, Building2, UserCircle2 } from 'lucide-react';

const SalesMockup = () => {
  const deals = [
    { name: 'Acme Corp Enterprise License', company: 'Acme Corp', contact: 'John D.', value: '$45,000', stage: 'Negotiation', prob: 80, owner: 'https://i.pravatar.cc/100?img=12' },
    { name: 'Nexus Inc Q4 Upgrade', company: 'Nexus Inc', contact: 'Sarah M.', value: '$12,500', stage: 'Proposal', prob: 50, owner: 'https://i.pravatar.cc/100?img=47' },
    { name: 'Global Tech New Implementation', company: 'Global Tech', contact: 'Mike R.', value: '$85,000', stage: 'Qualified', prob: 30, owner: 'https://i.pravatar.cc/100?img=33' },
    { name: 'Stark Ind. Annual Renewal', company: 'Stark Industries', contact: 'Tony S.', value: '$120,000', stage: 'Closed Won', prob: 100, owner: 'https://i.pravatar.cc/100?img=12' },
    { name: 'Wayne Ent Beta Program', company: 'Wayne Ent.', contact: 'Bruce W.', value: '$5,000', stage: 'Prospect', prob: 10, owner: 'https://i.pravatar.cc/100?img=47' },
  ];

  const getStageColor = (stage) => {
    switch (stage) {
      case 'Closed Won': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Negotiation': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Proposal': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Qualified': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="w-full h-full bg-slate-50 flex flex-col font-sans select-none overflow-hidden relative">
      {/* Top Header */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             Sales Pipeline <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">Q4</span>
          </h2>
          <span className="text-[10px] text-slate-500 font-medium">124 Active Deals • $2.4M Total Value</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
             <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
             <input type="text" placeholder="Search deals..." className="text-xs bg-slate-50 border border-slate-200 rounded-md pl-8 pr-3 py-1.5 w-48 outline-none focus:border-red-400" disabled />
          </div>
          <button className="text-slate-500 bg-white border border-slate-200 p-1.5 rounded-md hover:bg-slate-50">
            <Filter size={14} />
          </button>
          <button className="bg-red-600 text-white text-xs font-medium px-4 py-1.5 rounded-md hover:bg-red-700">
            Create Deal
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-5 pt-5 pb-3 grid grid-cols-4 gap-4 shrink-0">
         {[
           { l: 'Total Pipeline', v: '$2,450,000', c: 'text-slate-800' },
           { l: 'Weighted Value', v: '$1,120,500', c: 'text-slate-800' },
           { l: 'Win Rate', v: '42.5%', c: 'text-emerald-600' },
           { l: 'Avg Deal Size', v: '$45,200', c: 'text-slate-800' }
         ].map((stat, i) => (
           <div key={i} className="bg-white rounded border border-slate-200 p-3 flex flex-col justify-center">
             <span className="text-[9px] text-slate-500 uppercase font-semibold mb-0.5 tracking-wider">{stat.l}</span>
             <span className={`text-lg font-bold ${stat.c}`}>{stat.v}</span>
           </div>
         ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden px-5 pb-5">
        <div className="bg-white rounded-lg border border-slate-200 h-full flex flex-col shadow-sm">
          <div className="grid grid-cols-12 gap-3 p-3 border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0">
            <div className="col-span-4">Deal Name</div>
            <div className="col-span-2">Company / Contact</div>
            <div className="col-span-2 text-right">Value</div>
            <div className="col-span-2 text-center">Stage</div>
            <div className="col-span-1 text-center">Prob.</div>
            <div className="col-span-1 text-center">Owner</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {deals.map((deal, i) => (
              <div key={i} className="grid grid-cols-12 gap-3 p-3 border-b border-slate-100 items-center hover:bg-slate-50 transition-colors group cursor-pointer text-xs">
                <div className="col-span-4 font-semibold text-slate-800 flex items-center justify-between pr-2">
                   {deal.name}
                   <ArrowUpRight size={12} className="text-slate-300 group-hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="col-span-2 flex flex-col gap-0.5">
                   <div className="flex items-center gap-1.5 text-slate-700">
                     <Building2 size={10} className="text-slate-400" />
                     <span className="truncate">{deal.company}</span>
                   </div>
                   <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                     <UserCircle2 size={10} />
                     <span className="truncate">{deal.contact}</span>
                   </div>
                </div>
                <div className="col-span-2 text-right font-bold text-slate-700 flex items-center justify-end gap-1">
                   {deal.value}
                </div>
                <div className="col-span-2 flex justify-center">
                   <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold ${getStageColor(deal.stage)}`}>
                     {deal.stage}
                   </span>
                </div>
                <div className="col-span-1 flex flex-col items-center justify-center gap-1">
                   <span className="text-[10px] font-bold text-slate-600">{deal.prob}%</span>
                   <div className="w-8 h-1 bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-red-500 rounded-full" style={{width: `${deal.prob}%`}}></div>
                   </div>
                </div>
                <div className="col-span-1 flex justify-center">
                   <img src={deal.owner} alt="Owner" className="w-5 h-5 rounded-full border border-slate-200" />
                </div>
              </div>
            ))}
            
            {/* Empty space filler for realism */}
            {[1,2,3,4].map(i => (
              <div key={`empty-${i}`} className="grid grid-cols-12 gap-3 p-3 border-b border-slate-50 items-center opacity-40">
                <div className="col-span-4 h-3 bg-slate-100 rounded w-3/4"></div>
                <div className="col-span-2 h-3 bg-slate-100 rounded w-1/2"></div>
                <div className="col-span-2 h-3 bg-slate-100 rounded w-1/3 justify-self-end"></div>
                <div className="col-span-2 h-4 bg-slate-100 rounded-full w-16 justify-self-center"></div>
                <div className="col-span-1 h-3 bg-slate-100 rounded w-6 justify-self-center"></div>
                <div className="col-span-1 h-5 w-5 bg-slate-100 rounded-full justify-self-center"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesMockup;
