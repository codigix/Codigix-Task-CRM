import React, { useState, useEffect } from 'react';
import {
  Globe, Zap, Target, Search, CheckCircle, ChevronDown, Plus, Minus,
  MessageSquare, Settings, Activity, FileText, Database, Shield,
  TrendingUp, RefreshCw, Eye, Cpu, Link, Focus, BarChart2, AlertTriangle,
  Download, Clock, MessageCircle, Share2, Check, X, MapPin, SearchCheck,
  AlignLeft, ArrowUpRight, CheckCircle2, Trophy, XCircle
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend, ComposedChart, ReferenceLine, PieChart, Pie, Cell
} from 'recharts';
import AdvancedDateRangePicker from '../common/AdvancedDateRangePicker';
import SeoGmbProjectSelector from './SeoGmbProjectSelector';
import { useAuth } from '../../hooks/useAuth';

const SeoGmbGeoOptimizationPage = () => {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState(null);
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [activeTab, setActiveTab] = useState('Overview');
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tabs = [
    'Overview', 'AI Engines', 'Content Optimization', 'Entity & Schema', 
    'Citations', 'Recommendations', 'Audit Report', 'Settings'
  ];

  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        setLoading(true);
        let url = '/api/seo-gmb/geo-optimization';
        const params = new URLSearchParams();
        if (projectId) params.append('projectId', projectId);
        if (dateRange.startDate) params.append('startDate', dateRange.startDate.toISOString());
        if (dateRange.endDate) params.append('endDate', dateRange.endDate.toISOString());
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch GEO optimization data');
        }
        
        const result = await response.json();
        setData(result.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching GEO Data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGeoData();
  }, [projectId, dateRange]);

  const KPICard = ({ title, value, change, changeLabel, icon: Icon, colorClass, sparklineColor }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col justify-center h-full relative overflow-hidden group">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg bg-opacity-10 ${colorClass.replace('text', 'bg')}`}>
          <Icon size={18} className={colorClass} />
        </div>
        <span className="text-gray-900 text-[11px] font-semibold">{title}</span>
      </div>
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-gray-900 leading-none">{value}</span>
          </div>
          {change && (
            <span className={`text-[9px] font-bold ${change.toString().startsWith('-') ? 'text-red-500' : 'text-green-500'} block mt-1.5`}>
              {change.toString().startsWith('-') ? '↓' : '↑'} {change.toString().replace('-', '')} {changeLabel && <span className="text-gray-400 font-medium">{changeLabel}</span>}
            </span>
          )}
        </div>
        {sparklineColor && data?.sparklineData && (
          <div className="w-16 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.sparklineData}>
                <Line type="monotone" dataKey="v" stroke={sparklineColor} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );

  const renderOverviewTab = () => {
    if (!data) return null;
    const ov = data.overview;
    return (
      <div className="space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <KPICard title="GEO Score" value={<span>{ov.geoScore.value} <span className="text-sm font-medium text-gray-400">/100</span></span>} change={`${ov.geoScore.change}%`} changeLabel={ov.geoScore.changeLabel} icon={Globe} colorClass="text-green-600" sparklineColor="#10B981" />
          <KPICard title="AI Visibility Score" value={<span>{ov.aiVisibilityScore.value} <span className="text-sm font-medium text-gray-400">/100</span></span>} change={`${ov.aiVisibilityScore.change}%`} changeLabel={ov.aiVisibilityScore.changeLabel} icon={Eye} colorClass="text-blue-600" sparklineColor="#3B82F6" />
          <KPICard title="AI Mentions" value={ov.aiMentions.value.toLocaleString()} change={`${ov.aiMentions.change}%`} changeLabel={ov.aiMentions.changeLabel} icon={MessageSquare} colorClass="text-purple-600" sparklineColor="#8B5CF6" />
          <KPICard title="AI Citations" value={ov.aiCitations.value.toLocaleString()} change={`${ov.aiCitations.change}%`} changeLabel={ov.aiCitations.changeLabel} icon={Link} colorClass="text-orange-500" sparklineColor="#F59E0B" />
          <KPICard title="Indexed Pages" value={ov.indexedPages.value.toLocaleString()} change={`${ov.indexedPages.change}%`} changeLabel={ov.indexedPages.changeLabel} icon={FileText} colorClass="text-indigo-600" sparklineColor="#6366F1" />
          <KPICard title="Structured Data Score" value={<span>{ov.structuredDataScore.value} <span className="text-sm font-medium text-gray-400">/100</span></span>} change={`${ov.structuredDataScore.change}%`} changeLabel={ov.structuredDataScore.changeLabel} icon={Database} colorClass="text-teal-600" sparklineColor="#14B8A6" />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-gray-900 text-sm">AI Engine Visibility</h3>
              <select className="bg-white border border-gray-200 text-gray-700 text-[10px] px-2 py-1 rounded outline-none">
                <option>Last 7 Days ▾</option>
              </select>
            </div>
            <div className="space-y-4">
               {data.aiEngineVisibility.map((eng, i) => (
                 <div key={i} className="flex items-center text-xs">
                    <span className="w-32 font-medium flex items-center gap-2 text-gray-700"><Cpu size={12} className="text-gray-400"/> {eng.p}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full mx-3 overflow-hidden">
                      <div className={`h-full ${eng.color}`} style={{ width: `${eng.s}%` }}></div>
                    </div>
                    <span className="w-8 font-semibold text-gray-900">{eng.s}%</span>
                    <span className="w-10 text-right font-semibold text-green-500">{eng.c}</span>
                 </div>
               ))}
            </div>
            <button className="text-indigo-600 text-[10px] font-semibold mt-4 hover:underline text-center w-full">View All AI Engines &rarr;</button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
             <h3 className="font-semibold text-gray-900 text-sm mb-4">AI Visibility Trend</h3>
             <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={data.trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF' }} domain={[20, 100]} />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="chatgpt" name="ChatGPT" stroke="#10B981" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="google" name="Google AI" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="gemini" name="Gemini" stroke="#6366F1" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="perplexity" name="Perplexity" stroke="#06B6D4" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="claude" name="Claude" stroke="#F97316" strokeWidth={2} dot={{ r: 2 }} />
                   </LineChart>
                </ResponsiveContainer>
             </div>
             <div className="flex flex-wrap justify-center gap-3 mt-4">
                {[{n:'ChatGPT',c:'#10B981'},{n:'Google AI',c:'#3B82F6'},{n:'Gemini',c:'#6366F1'},{n:'Perplexity',c:'#06B6D4'},{n:'Claude',c:'#F97316'}].map((l,i) => (
                   <div key={i} className="flex items-center gap-1 text-[9px] text-gray-600">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.c }}></div> {l.n}
                   </div>
                ))}
             </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col">
             <h3 className="font-semibold text-gray-900 text-sm mb-4">GEO Score Breakdown</h3>
             <div className="flex-1 flex items-center justify-between">
                <div className="relative w-[140px] h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.geoScoreDist} innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value">
                        {data.geoScoreDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-gray-900">{ov.geoScore.value}</span>
                    <span className="text-[10px] text-gray-500 font-semibold">/100</span>
                  </div>
                </div>
                <div className="flex-1 pl-4 space-y-3">
                  {data.geoScoreDist.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] font-medium">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }}></div>
                        {item.name}
                      </div>
                      <span className="text-gray-900 font-bold">{item.value}<span className="text-gray-400 font-normal">/100</span></span>
                    </div>
                  ))}
                </div>
             </div>
             <button className="text-indigo-600 text-[10px] font-semibold mt-4 hover:underline text-center w-full">View Full Breakdown &rarr;</button>
          </div>
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
           <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">Top AI Citations (Sources)</h3>
              <table className="w-full text-left text-[11px] whitespace-nowrap">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                    <th className="pb-2 font-semibold">Source</th>
                    <th className="pb-2 font-semibold text-center">Mentions</th>
                    <th className="pb-2 font-semibold text-center">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                   {data.topCitations.map((row, i) => (
                      <tr key={i} className="text-gray-700">
                         <td className="py-2.5 font-medium">{row.s}</td>
                         <td className="py-2.5 text-center font-bold">{row.m}</td>
                         <td className="py-2.5 text-center font-bold text-green-600">↑ {row.t.replace('+ ', '')}</td>
                      </tr>
                   ))}
                </tbody>
              </table>
              <button className="text-indigo-600 text-[10px] font-semibold mt-4 hover:underline text-center w-full">View All Citations &rarr;</button>
           </div>

           <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">Top Optimization Opportunities</h3>
              <div className="space-y-4">
                 {data.optimizationOpportunities.map((opp, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                       <div className="flex items-center gap-2 text-gray-700">
                          <CheckCircle2 size={14} className="text-indigo-500" />
                          {opp.t}
                       </div>
                       <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${opp.p === 'High' ? 'bg-red-50 text-red-600' : opp.p === 'Medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>{opp.p}</span>
                    </div>
                 ))}
              </div>
              <button className="text-indigo-600 text-[10px] font-semibold mt-4 hover:underline text-center w-full">View All Opportunities &rarr;</button>
           </div>

           <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">Recent GEO Audits</h3>
              <table className="w-full text-left text-[11px] whitespace-nowrap">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                    <th className="pb-2 font-semibold">Audit Name</th>
                    <th className="pb-2 font-semibold">Date</th>
                    <th className="pb-2 font-semibold text-center">GEO Score</th>
                    <th className="pb-2 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                   {data.recentAudits.map((row, i) => (
                      <tr key={i} className="text-gray-700">
                         <td className="py-2.5 font-medium">{row.n}</td>
                         <td className="py-2.5 text-gray-500">{row.d}</td>
                         <td className="py-2.5 text-center font-bold">{row.s}</td>
                         <td className="py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-600">{row.st}</span>
                         </td>
                      </tr>
                   ))}
                </tbody>
              </table>
              <button className="text-indigo-600 text-[10px] font-semibold mt-4 hover:underline text-center w-full">View All Audits &rarr;</button>
           </div>
        </div>
      </div>
    );
  };

  const renderAIEnginesTab = () => {
    if (!data) return null;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-gray-900 text-sm">AI Engine Visibility Overview</h3>
              <select className="bg-white border border-gray-200 text-gray-700 text-[10px] px-2 py-1 rounded outline-none">
                <option>Last 7 Days ▾</option>
              </select>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left text-[11px] whitespace-nowrap">
                 <thead>
                   <tr className="text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                     <th className="pb-3 font-semibold">AI Platform</th>
                     <th className="pb-3 font-semibold text-center">Visibility Score</th>
                     <th className="pb-3 font-semibold text-center">Change</th>
                     <th className="pb-3 font-semibold text-center">Mentions</th>
                     <th className="pb-3 font-semibold text-center">Citations</th>
                     <th className="pb-3 font-semibold text-center">Trend</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {data.aiEngineOverview.map((row, i) => (
                       <tr key={i} className="text-gray-700">
                          <td className="py-3 font-medium flex items-center gap-2"><Cpu size={14} className="text-indigo-500" /> {row.p}</td>
                          <td className="py-3 text-center font-bold text-gray-900">{row.v}</td>
                          <td className="py-3 text-center font-bold text-green-600">↑ {row.c.replace('+ ', '')}</td>
                          <td className="py-3 text-center font-bold text-gray-900">{row.m}</td>
                          <td className="py-3 text-center font-bold text-gray-900">{row.ci}</td>
                          <td className="py-3 text-center">
                             <div className="w-16 h-6 mx-auto">
                               <ResponsiveContainer width="100%" height="100%">
                                 <LineChart data={data.sparklineData}>
                                   <Line type="monotone" dataKey="v" stroke={row.tCol} strokeWidth={2} dot={false} />
                                 </LineChart>
                               </ResponsiveContainer>
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
               </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
             <h3 className="font-semibold text-gray-900 text-sm mb-4">AI Engine Share of Mentions</h3>
             <div className="flex-1 flex flex-col items-center">
                <div className="relative w-[180px] h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.aiEngineShare} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                        {data.aiEngineShare.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-gray-900">2,042</span>
                    <span className="text-[10px] text-gray-500 font-semibold">Total Mentions</span>
                  </div>
                </div>
                <div className="w-full mt-4 space-y-2 px-2">
                  {data.aiEngineShare.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] font-medium">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }}></div>
                        {item.name}
                      </div>
                      <span className="text-gray-900 font-bold">{item.value}%</span>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900 text-sm">AI Engine Insights</h3>
            <button className="text-indigo-600 text-[10px] font-semibold hover:underline">View All Insights &rarr;</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             {data.aiEngineInsights.map((card, i) => {
                const icons = { 'ChatGPT': MessageSquare, 'Google AI Overview': Search, 'Gemini': Zap, 'Perplexity': Target };
                const colors = { 'ChatGPT': 'text-green-500', 'Google AI Overview': 'text-blue-500', 'Gemini': 'text-indigo-500', 'Perplexity': 'text-cyan-500' };
                const bgs = { 'ChatGPT': 'bg-green-50', 'Google AI Overview': 'bg-blue-50', 'Gemini': 'bg-indigo-50', 'Perplexity': 'bg-cyan-50' };
                const Icon = icons[card.p] || Zap;
                return (
                  <div key={i} className="border border-gray-100 rounded-lg p-4 bg-gray-50/30 hover:bg-gray-50 transition">
                     <div className="flex items-center gap-2 mb-3">
                        <div className={`p-1.5 rounded ${bgs[card.p]}`}><Icon size={14} className={colors[card.p]} /></div>
                        <span className="font-semibold text-gray-900 text-[11px]">{card.p}</span>
                     </div>
                     <h4 className="font-medium text-gray-800 text-[11px] mb-2">{card.h}</h4>
                     <div className="text-[10px] font-bold text-green-600 mb-3">{card.st}</div>
                     <div className="text-[10px] text-gray-500 border-t border-gray-200 pt-2">{card.q}</div>
                  </div>
                )
             })}
          </div>
        </div>
      </div>
    );
  };

  const renderCitationsTab = () => {
    if (!data) return null;
    const cKpi = data.citationsKpi;
    return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
         <KPICard title="Total Citations" value={cKpi.total.value} change={`${cKpi.total.change}%`} changeLabel="vs last 7 days" icon={Link} colorClass="text-purple-600" />
         <KPICard title="High Authority Citations" value={cKpi.highAuthority.value} change={`${cKpi.highAuthority.change}%`} changeLabel="vs last 7 days" icon={Trophy} colorClass="text-green-600" />
         <KPICard title="New Citations" value={cKpi.new.value} change={`${cKpi.new.change}%`} changeLabel="vs last 7 days" icon={Plus} colorClass="text-blue-600" />
         <KPICard title="Lost Citations" value={cKpi.lost.value} change={`${cKpi.lost.change}%`} changeLabel="vs last 7 days" icon={Minus} colorClass="text-red-500" />
         <KPICard title="Citation Score" value={<span>{cKpi.score.value} <span className="text-sm font-medium text-gray-400">/100</span></span>} change={`${cKpi.score.change}%`} changeLabel="vs last 7 days" icon={Activity} colorClass="text-indigo-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm lg:col-span-2">
           <h3 className="font-semibold text-gray-900 text-sm mb-4">Content Trend</h3>
           <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={data.sparklineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="v" axisLine={false} tickLine={false} tick={false} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF' }} />
                    <RechartsTooltip />
                    <Area type="monotone" dataKey="v" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorTrend)" strokeWidth={2} dot={{ r: 4, fill: '#8B5CF6', strokeWidth: 2, stroke: '#fff' }} />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
           <h3 className="font-semibold text-gray-900 text-sm mb-4">Citations by Source Type</h3>
           <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative w-[150px] h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.citationsBySource} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                      {data.citationsBySource.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-gray-900">{cKpi.total.value}</span>
                  <span className="text-[9px] text-gray-500 font-semibold">Total</span>
                </div>
              </div>
              <div className="w-full mt-2 grid grid-cols-2 gap-2 px-2">
                 {data.citationsBySource.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-[9px] font-medium">
                       <div className="flex items-center gap-1 text-gray-700">
                         <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }}></div> {item.name}
                       </div>
                       <span className="text-gray-900 font-bold">{item.value}%</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
         <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Top Citation Sources</h3>
            <table className="w-full text-left text-[11px] whitespace-nowrap">
               <thead>
                 <tr className="text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                   <th className="pb-3 font-semibold">Source</th>
                   <th className="pb-3 font-semibold text-center">Type</th>
                   <th className="pb-3 font-semibold text-center">Citations</th>
                   <th className="pb-3 font-semibold text-center">Authority</th>
                   <th className="pb-3 font-semibold text-center">Trend</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {data.topCitationSources.map((row, i) => (
                     <tr key={i} className="text-gray-700">
                        <td className="py-3 font-medium text-indigo-600">{row.s}</td>
                        <td className="py-3 text-center text-gray-500">{row.ty}</td>
                        <td className="py-3 text-center font-bold text-gray-900">{row.c}</td>
                        <td className="py-3 text-center"><span className={`font-bold ${row.a === 'High' ? 'text-green-600' : 'text-yellow-600'}`}>{row.a}</span></td>
                        <td className="py-3 text-center font-bold text-green-600">↑ {row.t.replace('+ ', '')}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
            <button className="text-indigo-600 text-[10px] font-semibold mt-4 hover:underline text-center w-full">View All Sources &rarr;</button>
         </div>
         
         <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Citation Opportunities</h3>
            <div className="space-y-4 mt-4">
               {[
                  { icon: Target, t: 'Get featured on industry blogs' },
                  { icon: AlignLeft, t: 'Submit to AI directories' },
                  { icon: Link, t: 'Build links from high authority sites' },
                  { icon: MessageCircle, t: 'Engage in relevant forums' },
                  { icon: Share2, t: 'Create shareable content' },
               ].map((opp, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                     <div className="p-2 rounded bg-indigo-50 text-indigo-600"><opp.icon size={14} /></div>
                     <span className="font-medium text-gray-700">{opp.t}</span>
                     <ArrowUpRight size={14} className="ml-auto text-gray-400" />
                  </div>
               ))}
            </div>
            <button className="text-indigo-600 text-[10px] font-semibold mt-6 hover:underline text-center w-full">View All Opportunities &rarr;</button>
         </div>
      </div>
    </div>
  )};

  const renderEntitySchemaTab = () => {
    if (!data) return null;
    const es = data.entitySchema;
    return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex items-center justify-between col-span-1">
            <div className="w-full">
               <h3 className="font-semibold text-gray-900 text-[11px] mb-2">Schema Coverage</h3>
               <div className="flex items-end gap-2">
                 <span className="text-3xl font-bold text-green-600">{es.coverage.value}<span className="text-lg text-gray-400">/100</span></span>
               </div>
               <span className="text-[10px] font-bold text-green-600 block mt-1">{es.coverage.status}</span>
               <span className="text-[9px] font-semibold text-green-600 block mt-2">↑ {es.coverage.trend}% <span className="text-gray-400">vs last 7 days</span></span>
               <div className="mt-4 space-y-1 w-full">
                  <div className="flex justify-between text-[10px] font-medium"><span className="text-gray-500">Valid Schemas</span><span className="text-gray-900 font-bold">{es.coverage.valid}</span></div>
                  <div className="flex justify-between text-[10px] font-medium"><span className="text-gray-500">Warnings</span><span className="text-gray-900 font-bold">{es.coverage.warnings}</span></div>
                  <div className="flex justify-between text-[10px] font-medium"><span className="text-gray-500">Errors</span><span className="text-gray-900 font-bold">{es.coverage.errors}</span></div>
               </div>
            </div>
         </div>

         <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1">
            <h3 className="font-semibold text-gray-900 text-[11px] mb-4">Schema Types</h3>
            <table className="w-full text-left text-[9px] whitespace-nowrap">
               <thead>
                 <tr className="text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                   <th className="pb-2 font-semibold">Schema Type</th>
                   <th className="pb-2 font-semibold text-center">Valid</th>
                   <th className="pb-2 font-semibold text-center">Warnings</th>
                   <th className="pb-2 font-semibold text-center">Errors</th>
                   <th className="pb-2 font-semibold text-center">Coverage</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {es.schemaTypes.map((row, i) => (
                     <tr key={i} className="text-gray-700">
                        <td className="py-2 font-medium">{row.t}</td>
                        <td className="py-2 text-center font-bold text-green-600">{row.v}</td>
                        <td className="py-2 text-center font-bold text-yellow-600">{row.w}</td>
                        <td className="py-2 text-center font-bold text-red-600">{row.e}</td>
                        <td className="py-2 text-center font-bold text-green-600">{row.c}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
            <button className="text-indigo-600 text-[10px] font-semibold mt-2 hover:underline text-center w-full">View All Schemas &rarr;</button>
         </div>

         <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1">
            <h3 className="font-semibold text-gray-900 text-[11px] mb-2">Entity Recognition</h3>
            <span className="text-[10px] text-gray-500">Total Entities</span>
            <div className="text-3xl font-bold text-gray-900 mb-4">{es.recognition.total}</div>
            <div className="space-y-2">
               <div className="flex justify-between text-[10px] font-medium border-b border-gray-50 pb-1"><span className="text-gray-600">People</span><span className="text-gray-900 font-bold">{es.recognition.people}</span></div>
               <div className="flex justify-between text-[10px] font-medium border-b border-gray-50 pb-1"><span className="text-gray-600">Organizations</span><span className="text-gray-900 font-bold">{es.recognition.organizations}</span></div>
               <div className="flex justify-between text-[10px] font-medium border-b border-gray-50 pb-1"><span className="text-gray-600">Locations</span><span className="text-gray-900 font-bold">{es.recognition.locations}</span></div>
               <div className="flex justify-between text-[10px] font-medium border-b border-gray-50 pb-1"><span className="text-gray-600">Products</span><span className="text-gray-900 font-bold">{es.recognition.products}</span></div>
               <div className="flex justify-between text-[10px] font-medium border-b border-gray-50 pb-1"><span className="text-gray-600">Services</span><span className="text-gray-900 font-bold">{es.recognition.services}</span></div>
            </div>
            <button className="text-indigo-600 text-[10px] font-semibold mt-3 hover:underline text-center w-full">View All Entities &rarr;</button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
         <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Top Entities</h3>
            <table className="w-full text-left text-[11px] whitespace-nowrap">
               <thead>
                 <tr className="text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                   <th className="pb-3 font-semibold">Entity</th>
                   <th className="pb-3 font-semibold text-center">Type</th>
                   <th className="pb-3 font-semibold text-center">Mentions</th>
                   <th className="pb-3 font-semibold text-center">Trend</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {es.topEntities.map((row, i) => (
                     <tr key={i} className="text-gray-700">
                        <td className="py-3 font-medium">{row.e}</td>
                        <td className="py-3 text-center text-gray-500">{row.t}</td>
                        <td className="py-3 text-center font-bold text-gray-900">{row.m}</td>
                        <td className="py-3 text-center font-bold text-green-600">↑ {row.tr.replace('+ ', '')}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
            <button className="text-indigo-600 text-[10px] font-semibold mt-4 hover:underline text-center w-full">View All Entities &rarr;</button>
         </div>

         <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Schema Issues</h3>
            <table className="w-full text-left text-[11px]">
               <thead>
                 <tr className="text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                   <th className="pb-3 font-semibold">Issue</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {es.schemaIssues.map((row, i) => (
                     <tr key={i} className="text-gray-700">
                        <td className="py-3 font-medium flex items-center gap-2">
                           {row.type === 'error' ? <XCircle size={14} className="text-red-500" /> : <AlertTriangle size={14} className="text-yellow-500" />}
                           {row.i}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
            <button className="text-indigo-600 text-[10px] font-semibold mt-4 hover:underline text-center w-full">View All Issues &rarr;</button>
         </div>
      </div>
    </div>
  )};

  const renderRecommendationsTab = () => {
    if (!data) return null;
    const rec = data.recommendationsOverview;
    return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <KPICard title="High Priority" value={rec.high} icon={AlertTriangle} colorClass="text-red-600" />
         <KPICard title="Medium Priority" value={rec.medium} icon={AlertTriangle} colorClass="text-yellow-600" />
         <KPICard title="Low Priority" value={rec.low} icon={CheckCircle} colorClass="text-green-600" />
         <KPICard title="Implemented" value={rec.implemented} icon={CheckCircle2} colorClass="text-indigo-600" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
         <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900">Recommendations</h3>
            <button className="text-indigo-600 text-[10px] font-semibold hover:underline">View All Recommendations &rarr;</button>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
               <thead>
                 <tr className="text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                   <th className="pb-3 font-semibold">Recommendation</th>
                   <th className="pb-3 font-semibold text-center">Priority</th>
                   <th className="pb-3 font-semibold text-center">Impact</th>
                   <th className="pb-3 font-semibold text-center">Effort</th>
                   <th className="pb-3 font-semibold text-center">Status</th>
                   <th className="pb-3 font-semibold text-center">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {rec.items.map((row, i) => (
                     <tr key={i} className="text-gray-700">
                        <td className="py-3 font-medium">{row.r}</td>
                        <td className="py-3 text-center"><span className={`px-2 py-0.5 rounded font-bold ${row.p === 'High' ? 'text-red-600 bg-red-50' : row.p === 'Medium' ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50'}`}>{row.p}</span></td>
                        <td className="py-3 text-center"><span className={`px-2 py-0.5 rounded font-bold ${row.i === 'High' ? 'text-red-600 bg-red-50' : row.i === 'Medium' ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50'}`}>{row.i}</span></td>
                        <td className="py-3 text-center"><span className={`px-2 py-0.5 rounded font-bold ${row.e === 'High' ? 'text-red-600 bg-red-50' : row.e === 'Medium' ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50'}`}>{row.e}</span></td>
                        <td className="py-3 text-center"><span className={`font-semibold ${row.s === 'Completed' ? 'text-green-600' : row.s === 'In Progress' ? 'text-indigo-600' : 'text-gray-500'}`}>{row.s}</span></td>
                        <td className="py-3 text-center">
                           <button className={`px-3 py-1 rounded text-[10px] font-bold transition flex items-center justify-center mx-auto ${row.a === 'Done' ? 'text-green-600' : (row.a === 'Fix Now' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200')}`}>
                             {row.a === 'Done' ? <Check size={14}/> : row.a}
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         <button className="mt-6 flex items-center justify-center gap-1 text-indigo-600 text-[10px] font-semibold hover:underline w-full">
            View Implementation Plan &rarr;
         </button>
      </div>
    </div>
  )};

  const renderAuditReportTab = () => {
    if (!data) return null;
    const ar = data.auditReport;
    return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
         <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 flex flex-col items-center text-center">
            <h3 className="font-semibold text-gray-900 text-sm mb-6 w-full text-left">Audit Summary</h3>
            <div className="relative w-[120px] h-[120px] mb-4">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={[{value:ar.summary.score, color:'#10B981'}, {value:100-ar.summary.score, color:'#F3F4F6'}]} innerRadius={45} outerRadius={60} dataKey="value" startAngle={90} endAngle={-270}>
                     {[{c:'#10B981'},{c:'#F3F4F6'}].map((e, i) => <Cell key={i} fill={e.c} />)}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-3xl font-bold text-gray-900">{ar.summary.score}</span>
               </div>
            </div>
            <div className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded mb-2">{ar.summary.status}</div>
            <div className="text-[9px] text-gray-400 mb-6">{ar.summary.date}</div>
            <button className="flex items-center gap-2 text-indigo-600 text-[10px] font-semibold hover:underline">
               <Download size={14} /> Download PDF
            </button>
         </div>
         
         <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1">
            <h3 className="font-semibold text-gray-900 text-sm mb-6">Audit Details</h3>
            <div className="space-y-4">
               <div className="flex justify-between text-[11px] font-medium border-b border-gray-50 pb-2"><span className="text-gray-600">Pages Crawled</span><span className="text-gray-900 font-bold">{ar.details.pagesCrawled}</span></div>
               <div className="flex justify-between text-[11px] font-medium border-b border-gray-50 pb-2"><span className="text-gray-600">Indexable Pages</span><span className="text-gray-900 font-bold">{ar.details.indexablePages}</span></div>
               <div className="flex justify-between text-[11px] font-medium border-b border-gray-50 pb-2"><span className="text-gray-600">Issues Found</span><span className="text-red-600 font-bold">{ar.details.issuesFound}</span></div>
               <div className="flex justify-between text-[11px] font-medium border-b border-gray-50 pb-2"><span className="text-gray-600">Warnings</span><span className="text-yellow-600 font-bold">{ar.details.warnings}</span></div>
               <div className="flex justify-between text-[11px] font-medium border-b border-gray-50 pb-2"><span className="text-gray-600">Passed Checks</span><span className="text-green-600 font-bold">{ar.details.passedChecks}</span></div>
            </div>
         </div>

         <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1">
            <h3 className="font-semibold text-gray-900 text-sm mb-6">Score Breakdown</h3>
            <div className="space-y-4">
               {ar.scoreBreakdown.map((item, i) => (
                  <div key={i} className="text-[10px]">
                     <div className="flex justify-between mb-1">
                        <span className="font-medium text-gray-700">{item.n}</span>
                        <span className="font-bold text-gray-900">{item.v}/100</span>
                     </div>
                     <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-indigo-600`} style={{ width: `${item.v}%` }}></div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
         <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm lg:col-span-2">
            <h3 className="font-semibold text-gray-900 text-sm mb-6">Audit Sections</h3>
            <table className="w-full text-left text-[11px] whitespace-nowrap">
               <thead>
                 <tr className="text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                   <th className="pb-3 font-semibold">Section</th>
                   <th className="pb-3 font-semibold text-center">Score</th>
                   <th className="pb-3 font-semibold text-center">Issues</th>
                   <th className="pb-3 font-semibold text-center">Status</th>
                   <th className="pb-3 font-semibold text-center">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {ar.sections.map((row, idx) => (
                     <tr key={idx} className="text-gray-700">
                        <td className="py-3 font-medium">{row.s}</td>
                        <td className="py-3 text-center font-bold text-gray-900">{row.sc}</td>
                        <td className="py-3 text-center font-bold text-red-600">{row.i}</td>
                        <td className="py-3 text-center">
                           <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-600">{row.st}</span>
                        </td>
                        <td className="py-3 text-center">
                           <button className="text-indigo-600 text-[10px] font-semibold hover:underline">View Details</button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         
         <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Top Issues</h3>
            <div className="space-y-4 mt-2">
               {ar.topIssues.map((issue, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                     <AlertTriangle size={14} className="text-yellow-500" />
                     {issue}
                  </div>
               ))}
            </div>
            <button className="text-indigo-600 text-[10px] font-semibold mt-6 hover:underline text-center w-full">View All Issues &rarr;</button>
         </div>
      </div>
    </div>
  )};

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 border border-gray-200 rounded-lg bg-indigo-600">
            <Globe className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">GEO Optimization</h1>
            <p className="text-xs text-gray-500">Optimize your presence across AI search engines and generative platforms</p>
          </div>
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Project:</span>
            <SeoGmbProjectSelector selectedProjectId={projectId} onSelectProject={setProjectId} />
          </div>
          <AdvancedDateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={(start, end) => setDateRange({ startDate: start, endDate: end })}
          />
          <button className="w-8 h-8 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <RefreshCw size={14} />
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition shadow-sm flex items-center gap-2">
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex-shrink-0">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-[11px] font-bold border-b-[3px] transition-colors whitespace-nowrap ${
                activeTab === tab 
                  ? 'border-indigo-600 text-indigo-700' 
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 mx-auto w-full max-w-[1900px] flex-1 overflow-y-auto">
        {loading ? (
           <div className="flex flex-col items-center justify-center h-64 text-indigo-600">
              <RefreshCw size={32} className="animate-spin mb-4" />
              <p className="font-semibold text-sm">Loading GEO Optimization Data...</p>
           </div>
        ) : error ? (
           <div className="flex flex-col items-center justify-center h-64 text-red-500">
              <AlertTriangle size={32} className="mb-4" />
              <p className="font-semibold text-sm">{error}</p>
           </div>
        ) : (
          <>
            {activeTab === 'Overview' && renderOverviewTab()}
            {activeTab === 'AI Engines' && renderAIEnginesTab()}
            {activeTab === 'Content Optimization' && renderCitationsTab() /* Matching previous logic */}
            {activeTab === 'Entity & Schema' && renderEntitySchemaTab()}
            {activeTab === 'Citations' && renderCitationsTab()}
            {activeTab === 'Recommendations' && renderRecommendationsTab()}
            {activeTab === 'Audit Report' && renderAuditReportTab()}
            {activeTab === 'Settings' && renderOverviewTab() /* Settings placeholder */}
          </>
        )}
      </div>
    </div>
  );
};

export default SeoGmbGeoOptimizationPage;
