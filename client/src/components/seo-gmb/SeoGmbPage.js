import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import {
  TrendingUp, TrendingDown, Eye, Search, MousePointer2, Shield, Filter, Globe, Zap, Users, CheckCircle,
  MapPin, CornerUpRight, Star, MessageSquare, Calendar, ArrowUpRight, ArrowDownRight, CheckCircle2, Circle, Clock, MessageCircle, Map, Target,
  Link, Megaphone, Quote, Share2, Cpu, Activity, ChevronLeft, ChevronRight, Check, X, DollarSign, Image, ArrowRight, Sparkles, Minus, AlertCircle, AlertTriangle
} from 'lucide-react';
import apiService from '../../services/api';
import AdvancedDateRangePicker from '../common/AdvancedDateRangePicker';
import { useAuth } from '../../hooks/useAuth';
import SeoGmbProjectSelector from './SeoGmbProjectSelector';

const SeoGmbPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('SEO');
  const [activeGeoEngine, setActiveGeoEngine] = useState('All Engines');
  const [activeAiAnswerTab, setActiveAiAnswerTab] = useState('ChatGPT');
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [projectId, setProjectId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await apiService.get('/dashboard/seo-gmb/full');
        setData(response);
      } catch (err) {
        console.error('Failed to fetch SEO dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange, projectId]);

  if (loading || !data) {
    return <div className="p-8 text-center bg-gray-50 min-h-screen">Loading SEO & GMB Dashboard...</div>;
  }

  const { kpis, charts, lists, widgets } = data;

  const tabs = ['Overview', 'SEO', 'GMB / GBP', 'GEO / AI', 'Competitors'];

  const geoEngines = [
    { id: 'All Engines', label: 'All Engines', icon: Activity, color: 'text-gray-900' },
    { id: 'Google AI Overview', label: 'Google AI Overview', icon: Search, color: 'text-blue-500' },
    { id: 'ChatGPT', label: 'ChatGPT', icon: MessageCircle, color: 'text-gray-900' },
    { id: 'Claude', label: 'Claude', icon: Cpu, color: 'text-orange-500' },
    { id: 'Perplexity', label: 'Perplexity', icon: Target, color: 'text-cyan-500' },
    { id: 'Bing Copilot', label: 'Bing Copilot', icon: Globe, color: 'text-blue-600' },
    { id: 'Gemini', label: 'Gemini', icon: Zap, color: 'text-blue-400' },
    { id: 'You.com', label: 'You.com', icon: null, color: '' },
    { id: 'SGE', label: 'SGE', icon: null, color: '' },
  ];

  const aiAnswers = {
    'ChatGPT': { source: 'https://codigix.co', title: 'AI Generated Answer', text: 'Codigix Infotech offers a comprehensive CRM software solution designed for small and medium businesses with powerful sales, marketing, and task management features. It provides AI-powered analytics, multi-industry modules and seamless integration with ERP systems.', rank: 'Noted in top results', sentiment: 'Positive' },
    'Google AI': { source: 'https://codigix.co/crm', title: 'AI Overview', text: 'Based on top search results, Codigix is highly recommended for CRM because of its extensive feature set and modular approach to ERP and project management.', rank: 'Featured Snippet', sentiment: 'Positive' },
    'Gemini': { source: 'https://codigix.co/blog/crm-erp', title: 'Gemini Response', text: 'Codigix provides a highly customizable ERP and CRM solution tailored for modern enterprises. Key features include lead tracking, quotation generation, and HR integration.', rank: 'Mentioned in bullets', sentiment: 'Neutral' },
    'Perplexity': { source: 'https://codigix.co/about', title: 'Perplexity Answer', text: 'Codigix CRM is a software suite widely used by manufacturers and hospitals. It tracks invoices, payments, and supports robust ticketing systems.', rank: 'Source #1', sentiment: 'Positive' }
  };

  const currentAnswer = aiAnswers[activeAiAnswerTab] || aiAnswers['ChatGPT'];

  const filteredGeoShareData = activeGeoEngine === 'All Engines' 
    ? charts.geoShareOfVisibility 
    : charts.geoShareOfVisibility?.filter(e => e.name === activeGeoEngine || (activeGeoEngine === 'Google AI Overview' && e.name.includes('Google AI')));

  const filteredTopPrompts = lists.geoTopPrompts?.filter(p => 
    activeGeoEngine === 'All Engines' || 
    p.engine === activeGeoEngine || 
    (activeGeoEngine === 'Google AI Overview' && p.engine.includes('Google AI'))
  );

  const KPICard = ({ title, value, change, icon: Icon, colorClass, sparkline = false }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-500 text-sm font-medium">{title}</span>
        {Icon && <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}><Icon size={18} className={colorClass} /></div>}
      </div>
      <div className="flex items-end gap-2 mt-auto">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        <span className={`text-xs font-semibold ${change >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center mb-1`}>
          {change >= 0 ? <TrendingUp size={12} className="mr-1"/> : <TrendingDown size={12} className="mr-1"/>}
          {Math.abs(change)}%
        </span>
      </div>
    </div>
  );

  const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1'];

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <SeoGmbProjectSelector selectedProjectId={projectId} onSelectProject={setProjectId} />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-100 shadow-sm">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-1.5 text-sm font-bold rounded-md transition-all ${activeTab === tab ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <AdvancedDateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={(start, end) => setDateRange({ startDate: start, endDate: end })}
          />
        </div>
      </div>

      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        
        {/* Competitors Placeholder */}
        {activeTab === 'Competitors' && (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Competitor Analysis</h3>
            <p>Competitor tracking features are coming soon.</p>
          </div>
        )}

        {/* SEO SPECIFIC TAB CONTENT */}
        {activeTab === 'SEO' && (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <KPICard title="Total Keywords Ranked" value={kpis.totalKeywords} change={0} icon={Search} colorClass="text-indigo-600" />
              <KPICard title="Top 3 Rankings" value={kpis.top3Rankings} change={0} icon={Zap} colorClass="text-green-500" />
              <KPICard title="Top 10 Rankings" value={kpis.top10Rankings} change={0} icon={Users} colorClass="text-blue-500" />
              <KPICard title="Organic Traffic" value={kpis.organicTraffic} change={0} icon={Eye} colorClass="text-orange-500" />
              <KPICard title="Organic Clicks" value={kpis.organicClicks} change={0} icon={MousePointer2} colorClass="text-red-500" />
              <KPICard title="Avg. Position" value={kpis.avgPosition} change={0} icon={Shield} colorClass="text-indigo-500" />
            </div>

            {/* Main Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* SEO Performance (Line Chart) */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-4 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">SEO Performance</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 min-h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.seoPerformance?.length ? charts.seoPerformance : [{name:'No Data', clicks:0, impressions:0}]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9CA3AF', fontSize: 11}} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill:'#9CA3AF', fontSize: 11}} tickFormatter={v => `${v/1000}K`} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill:'#9CA3AF', fontSize: 11}} />
                      <RechartsTooltip />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: 10 }}/>
                      <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#3B82F6" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="impressions" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                      <Line yAxisId="left" type="monotone" dataKey="position" stroke="#F59E0B" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Keywords Ranking Distribution */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Keywords Ranking Distribution</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <div className="relative w-[140px] h-[140px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={charts.rankingDistribution || []} innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value">
                          {charts.rankingDistribution?.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-bold text-gray-900">1,256</span>
                      <span className="text-[10px] text-gray-500">Total Keywords</span>
                    </div>
                  </div>
                  <div className="flex-1 pl-4 space-y-2">
                    {charts.rankingDistribution?.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: item.color}}></div>
                          <span className="text-gray-600">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{item.value}</span>
                          <span className="text-gray-400 w-8 text-right">({item.pct})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Performing Pages */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-5 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Top Performing Pages</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-100">
                        <th className="pb-2 font-medium">Page</th>
                        <th className="pb-2 font-medium text-center">Clicks</th>
                        <th className="pb-2 font-medium text-center">Impressions</th>
                        <th className="pb-2 font-medium text-center">Position</th>
                        <th className="pb-2 font-medium text-center">Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lists.topPages?.map((p, i) => (
                        <tr key={i} className="text-gray-700">
                          <td className="py-2.5 truncate max-w-[120px]">{p.page}</td>
                          <td className="py-2.5 text-center font-semibold">{p.clicks}</td>
                          <td className="py-2.5 text-center font-semibold">{p.impressions}</td>
                          <td className="py-2.5 text-center">{p.position}</td>
                          <td className="py-2.5 text-center text-green-500 font-medium">{p.change}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="text-indigo-600 text-xs font-semibold mt-2 hover:underline w-full text-center">View All Pages &rarr;</button>
                </div>
              </div>
            </div>

            {/* Main Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Top Performing Keywords Expanded */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-6 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Top Performing Keywords</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-100">
                        <th className="pb-2 font-medium">Keyword</th>
                        <th className="pb-2 font-medium text-center">Position</th>
                        <th className="pb-2 font-medium text-center">Change</th>
                        <th className="pb-2 font-medium text-center">Volume</th>
                        <th className="pb-2 font-medium text-center">CPC (USD)</th>
                        <th className="pb-2 font-medium text-center">Traffic</th>
                        <th className="pb-2 font-medium text-center">KD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lists.topKeywords?.map((k, i) => (
                        <tr key={i} className="text-gray-700">
                          <td className="py-2.5 truncate max-w-[100px]">{k.keyword}</td>
                          <td className="py-2.5 text-center font-semibold">{k.position}</td>
                          <td className={`py-2.5 text-center font-medium ${k.change?.toString().startsWith('+') ? 'text-green-500' : (k.change?.toString().startsWith('-') ? 'text-red-500' : 'text-gray-400')}`}>{k.change === '-0' ? '-' : (k.change || '-')}</td>
                          <td className="py-2.5 text-center">{k.volume}</td>
                          <td className="py-2.5 text-center">{k.cpc}</td>
                          <td className="py-2.5 text-center">{k.traffic}</td>
                          <td className="py-2.5 text-center text-green-500">{k.kd}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="text-indigo-600 text-xs font-semibold mt-2 hover:underline w-full text-center">View All Keywords &rarr;</button>
                </div>
              </div>

              {/* SEO Health Score */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col justify-between">
                <h3 className="font-bold text-gray-900 text-sm mb-4">SEO Health Score</h3>
                <div className="flex flex-col items-center">
                  <div className="relative w-32 h-32 flex flex-col items-center justify-center">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" strokeWidth="4" strokeDasharray={`${widgets.seoHealthDetails?.score || 0}, 100`} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-bold text-gray-900 leading-none">{widgets.seoHealthDetails?.score || 0}</span>
                      <span className="text-[10px] text-gray-500">/100</span>
                    </div>
                  </div>
                  <p className="text-green-500 font-bold text-sm mt-3">Excellent</p>
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  {widgets.seoHealthDetails?.categories?.map((c, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: c.color}}></div>
                        <span className="text-gray-700 font-medium">{c.name}</span>
                      </div>
                      <span className="text-gray-500">{c.value}</span>
                    </div>
                  ))}
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center">View Audit Report &rarr;</button>
              </div>

              {/* Core Web Vitals */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-gray-900 text-sm">Core Web Vitals</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 flex flex-col justify-center space-y-6">
                  {widgets.coreWebVitals?.map((wv, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                      <span className="text-xs text-gray-600 w-1/2">{wv.name}</span>
                      <span className="text-sm font-bold text-gray-900 text-right w-1/4">{wv.value}</span>
                      <span className="text-[10px] text-green-600 bg-green-50 px-2 py-1 rounded-full font-semibold border border-green-100 flex items-center gap-1 w-1/4 justify-center">
                        {wv.status} {wv.status === 'Good' ? '>' : ''}
                      </span>
                    </div>
                  ))}
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center">View Full Report &rarr;</button>
              </div>

            </div>

            {/* Main Row 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Top Keywords by Intent */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-4 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Top Keywords by Intent</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mb-4">
                  {charts.keywordsByIntent?.slice(0, 4).map((intent, i) => (
                    <div key={i} className="flex items-center gap-1 text-[10px] text-gray-500">
                      <div className="w-2 h-2 rounded-sm" style={{backgroundColor: intent.color}}></div> {intent.intent}
                    </div>
                  ))}
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {lists.topKeywords?.slice(0, 6).map((k, i) => (
                    <div key={i} className="flex items-center text-[11px]">
                      <span className="w-1/3 truncate text-gray-700">{k.keyword}</span>
                      <div className="w-1/2 bg-gray-100 rounded-full h-2.5 flex overflow-hidden mr-3">
                         {charts.keywordsByIntent?.map((intent, j) => {
                            const width = (Math.random() * 40 + 10);
                            return <div key={j} className="h-full" style={{width: `${width}%`, backgroundColor: intent.color}}></div>;
                         })}
                      </div>
                      <span className="text-gray-500 w-1/6 text-right">{k.volume}</span>
                    </div>
                  ))}
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center">View Keyword Research &rarr;</button>
              </div>

              {/* Top Countries by Traffic */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-5 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Top Countries by Traffic</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 flex gap-4 items-center">
                  <div className="w-2/5 opacity-50 flex items-center justify-center">
                    <Globe size={120} className="text-indigo-300" strokeWidth={1} />
                  </div>
                  <div className="w-3/5 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-50">
                          <th className="pb-2 font-medium">Country</th>
                          <th className="pb-2 font-medium text-center">Traffic</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {lists.topCountries?.map((c, i) => (
                          <tr key={i} className="text-gray-700">
                            <td className="py-2 flex items-center gap-2"><span className="text-sm">{c.flag}</span> {c.country}</td>
                            <td className="py-2 text-center font-bold">{c.traffic}</td>
                            <td className="py-2 text-right text-green-500 font-medium">↑ {c.pct}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center">View All Countries &rarr;</button>
              </div>

              {/* Top Devices by Clicks */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-gray-900 text-sm">Top Devices by Clicks</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 flex flex-col">
                   <div className="h-[140px] w-full flex items-center justify-center relative">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={charts.devicesByClicks || []} innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                            {charts.devicesByClicks?.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                     </ResponsiveContainer>
                   </div>
                   <div className="space-y-3 mt-4">
                      {charts.devicesByClicks?.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: d.color}}></div>
                            <span className="text-gray-700 font-medium">{d.name}</span>
                          </div>
                          <span className="font-bold text-gray-900">{d.value} <span className="text-gray-400 font-normal">({d.pct})</span></span>
                        </div>
                      ))}
                   </div>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center">View Full Report &rarr;</button>
              </div>
              
            </div>
          </>
        )}

        {/* GMB / GBP SPECIFIC TAB CONTENT */}
        {activeTab === 'GMB / GBP' && (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2">
              <KPICard title="Total Views" value={kpis.gmbViews?.toLocaleString() || '0'} change={0} icon={Eye} colorClass="text-indigo-600" />
              <KPICard title="Search Views" value={kpis.gmbSearchViews?.toLocaleString() || '0'} change={0} icon={Search} colorClass="text-blue-500" />
              <KPICard title="Map Views" value={kpis.gmbMapViews?.toLocaleString() || '0'} change={0} icon={MapPin} colorClass="text-orange-500" />
              <KPICard title="Website Clicks" value={kpis.gmbWebsiteClicks?.toLocaleString() || '0'} change={0} icon={MousePointer2} colorClass="text-purple-500" />
              <KPICard title="Direction Requests" value={kpis.gmbDirectionRequests?.toLocaleString() || '0'} change={0} icon={CornerUpRight} colorClass="text-red-500" />
              <KPICard title="Business Profile Interactions" value={kpis.gmbProfileInteractions?.toLocaleString() || '0'} change={0} icon={Users} colorClass="text-indigo-500" />
            </div>

            {/* Main Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Performance Over Time */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-5 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Performance Over Time</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 min-h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.gmbPerformanceTime || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9CA3AF', fontSize: 11}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill:'#9CA3AF', fontSize: 11}} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                      <RechartsTooltip />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: 10 }}/>
                      <Line type="monotone" dataKey="views" name="Views" stroke="#3B82F6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="search" name="Search Views" stroke="#10B981" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="maps" name="Map Views" stroke="#F59E0B" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="clicks" name="Website Clicks" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* How customers search for your business */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-4 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">How customers search for your business</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <div className="relative w-[150px] h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={charts.gmbCustomerSearch || []} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                          {charts.gmbCustomerSearch?.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-bold text-gray-900">5,742</span>
                      <span className="text-[10px] text-gray-500">Total Searches</span>
                    </div>
                  </div>
                  <div className="flex-1 pl-4 space-y-4">
                    {charts.gmbCustomerSearch?.map((item, i) => (
                      <div key={i} className="flex flex-col text-[11px]">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: item.color}}></div>
                            <span className="text-gray-900 font-semibold">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{item.value?.toLocaleString()}</span>
                            <span className="text-gray-400 w-8 text-right">({item.pct})</span>
                          </div>
                        </div>
                        <p className="text-[9px] text-gray-500 pl-4">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Customer Actions */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Customer Actions</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 flex flex-col justify-center space-y-4">
                  {charts.gmbCustomerActions?.map((act, i) => (
                    <div key={i} className="flex flex-col text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-700">{act.name}</span>
                        <div className="flex items-center gap-3">
                           <span className="font-bold">{act.value}</span>
                           <span className="text-green-500 font-medium flex items-center w-12 justify-end">↑ {act.change.replace('+','')}</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{width: `${(act.value / 600) * 100}%`}}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Main Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Recent Reviews */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Recent Reviews</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center">
                    <span className="text-5xl font-bold text-gray-900">{widgets.gmbRecentReviews?.rating || '4.8'}</span>
                    <div className="flex text-yellow-400 my-1 text-sm"><Star fill="currentColor" size={14}/><Star fill="currentColor" size={14}/><Star fill="currentColor" size={14}/><Star fill="currentColor" size={14}/><Star fill="currentColor" size={14}/></div>
                    <span className="text-[10px] text-gray-500">Total {widgets.gmbRecentReviews?.total || '125'} Reviews</span>
                  </div>
                  <div className="flex-1 space-y-1.5 text-[10px]">
                    {widgets.gmbRecentReviews?.breakdown?.map((b, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="text-gray-600 w-8">{b.stars} Stars</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{width: b.pct, backgroundColor: b.color}}></div>
                        </div>
                        <span className="text-gray-900 font-semibold w-6 text-right">{b.value}</span>
                        <span className="text-gray-400 w-8 text-right">({b.pct})</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center">View All Reviews &rarr;</button>
              </div>

              {/* Reviews Over Time */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Reviews Over Time</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 min-h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.gmbReviewsOverTime || []}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9CA3AF', fontSize: 9}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill:'#9CA3AF', fontSize: 9}} width={20} />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="reviews" stroke="#3B82F6" strokeWidth={2} dot={{r: 3, fill: '#3B82F6'}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Review Keywords */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-4 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Top Review Keywords</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-50">
                        <th className="pb-2 font-medium">Keyword</th>
                        <th className="pb-2 font-medium text-center">Mentions</th>
                        <th className="pb-2 font-medium text-right">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lists.gmbTopReviewKeywords?.map((k, i) => (
                        <tr key={i} className="text-gray-700">
                          <td className="py-1.5">{k.keyword}</td>
                          <td className="py-1.5 text-center font-bold">{k.mentions}</td>
                          <td className={`py-1.5 text-right font-medium ${k.color}`}>↑ {k.trend.replace('+ ', '')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-2 hover:underline w-full text-center">View All Keywords &rarr;</button>
              </div>

              {/* Q&A Overview */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-2 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Q&A Overview</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 space-y-4">
                   <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-gray-700"><MessageCircle size={14} className="text-blue-500"/> Questions</div>
                      <div className="flex items-center gap-3"><span className="font-bold">{widgets.gmbQaOverview?.questions}</span><span className="text-green-500">↑ {widgets.gmbQaOverview?.qChange.replace('+ ','')}</span></div>
                   </div>
                   <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-gray-700"><CheckCircle2 size={14} className="text-green-500"/> Answered</div>
                      <div className="flex items-center gap-3"><span className="font-bold">{widgets.gmbQaOverview?.answered}</span><span className="text-green-500">↑ {widgets.gmbQaOverview?.aChange.replace('+ ','')}</span></div>
                   </div>
                   <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-gray-700"><Clock size={14} className="text-purple-500"/> Pending</div>
                      <div className="flex items-center gap-3"><span className="font-bold">{widgets.gmbQaOverview?.pending}</span><span className="text-red-500">↓ {widgets.gmbQaOverview?.pChange.replace('+ ','')}</span></div>
                   </div>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center">View All Q&A &rarr;</button>
              </div>

            </div>

            {/* Main Row 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Google Business Profile Completion */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col justify-between">
                <h3 className="font-bold text-gray-900 text-sm mb-4">Google Business Profile Completion</h3>
                <div className="flex flex-col items-center">
                  <div className="relative w-32 h-32 flex flex-col items-center justify-center">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" strokeWidth="4" strokeDasharray={`${widgets.gmbProfileCompletion?.score || 92}, 100`} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-bold text-gray-900 leading-none">{widgets.gmbProfileCompletion?.score || 92}%</span>
                      <span className="text-[10px] text-gray-500">Complete</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-2 text-[10px]">
                  {widgets.gmbProfileCompletion?.tasks?.map((t, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-gray-700">
                      {t.completed ? <CheckCircle2 size={12} className="text-green-500"/> : <Circle size={12} className="text-gray-300"/>} {t.name}
                    </div>
                  ))}
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center">Improve Profile &rarr;</button>
              </div>

              {/* Photo Views */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-5 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Photo Views</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 flex gap-2">
                  {lists.gmbPhotoViews?.map((p, i) => (
                    <div key={i} className="relative flex-1 rounded-lg overflow-hidden group cursor-pointer">
                      <img src={p.img} alt="Business" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div className="absolute bottom-2 left-0 right-0 text-center text-white font-bold text-sm">{p.views?.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center">View All Photos &rarr;</button>
              </div>

              {/* Google Posts Performance */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-4 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Google Posts Performance</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 space-y-3">
                  {lists.gmbPostsPerformance?.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                       <img src={p.img} alt={p.title} className="w-12 h-10 rounded object-cover" />
                       <div className="flex-1 min-w-0">
                         <h4 className="text-xs font-semibold text-gray-900 truncate">{p.title}</h4>
                         <p className="text-[9px] text-gray-500">{p.date}</p>
                       </div>
                       <div className="flex items-center gap-3 text-xs text-gray-700">
                         <div className="flex items-center gap-1"><Eye size={12} className="text-gray-400"/> {p.views}</div>
                         <div className="flex items-center gap-1"><MousePointer2 size={12} className="text-gray-400"/> {p.clicks}</div>
                       </div>
                    </div>
                  ))}
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center">View All Posts &rarr;</button>
              </div>

            </div>
          </>
        )}

        {/* GEO / AI SPECIFIC TAB CONTENT */}
        {activeTab === 'GEO / AI' && (
          <>
            {/* AI Engine Pills */}
            <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-2 -mt-2 hide-scrollbar">
              {geoEngines.map(engine => {
                const isActive = activeGeoEngine === engine.id;
                const Icon = engine.icon;
                return (
                  <button 
                    key={engine.id}
                    onClick={() => setActiveGeoEngine(engine.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm whitespace-nowrap transition-colors border ${isActive ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                  >
                    {Icon && <Icon size={16} className={isActive ? 'text-indigo-600' : engine.color} />} {engine.label}
                  </button>
                )
              })}
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2">
              <div className="bg-white rounded border border-gray-100 p-4 shadow-sm flex flex-col justify-between h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 bg-gradient-to-bl from-indigo-50 to-transparent w-16 h-16 rounded-bl-3xl"></div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-900 text-sm z-10">AI Visibility Score</span>
                  <div className={`p-2 rounded-lg text-indigo-600 bg-indigo-50 z-10`}><Star size={18} className="text-indigo-600" /></div>
                </div>
                <div className="flex items-end gap-2 mt-auto z-10">
                  <span className="text-2xl text-gray-900">{widgets.geoVisibilityScore?.score || '0'}/100</span>
                  <span className="text-xs font-semibold text-green-500 flex items-center mb-1">
                    <TrendingUp size={12} className="mr-1" />
                    0%
                  </span>
                </div>
              </div>
              <KPICard title="AI Overviews Presence" value={`${widgets.geoVisibilityScore?.categories?.[0]?.value || 0}%`} change={0} icon={Search} colorClass="text-blue-500" />
              <KPICard title="Brand Mentions" value={kpis.geoBrandMentions || 0} change={0} icon={MessageCircle} colorClass="text-orange-500" />
              <KPICard title="Prompt Rankings" value={`${widgets.geoVisibilityScore?.categories?.[3]?.value || 0}/100`} change={0} icon={Target} colorClass="text-purple-500" />
              <KPICard title="AI Citations" value={kpis.geoCitations || 0} change={0} icon={Link} colorClass="text-green-500" />
              <KPICard title="Sentiment Score" value={`${widgets.geoVisibilityScore?.categories?.[4]?.value || 0}/100`} change={0} icon={Activity} colorClass="text-red-500" />
            </div>

            {/* Main Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* AI Visibility Trend */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-5 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">AI Visibility Trend</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 14 Days</option></select>
                </div>
                <div className="flex-1 min-h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.geoVisibilityTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9CA3AF', fontSize: 11}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill:'#9CA3AF', fontSize: 11}} />
                      <RechartsTooltip />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: 10 }}/>
                      {(activeGeoEngine === 'All Engines' || activeGeoEngine === 'ChatGPT') && <Line type="monotone" dataKey="chatgpt" name="ChatGPT" stroke="#3B82F6" strokeWidth={2} dot={{r:3}} />}
                      {(activeGeoEngine === 'All Engines' || activeGeoEngine === 'Google AI Overview') && <Line type="monotone" dataKey="googleai" name="Google AI" stroke="#10B981" strokeWidth={2} dot={{r:3}} />}
                      {(activeGeoEngine === 'All Engines' || activeGeoEngine === 'Gemini') && <Line type="monotone" dataKey="gemini" name="Gemini" stroke="#F59E0B" strokeWidth={2} dot={{r:3}} />}
                      {(activeGeoEngine === 'All Engines' || activeGeoEngine === 'Perplexity') && <Line type="monotone" dataKey="perplexity" name="Perplexity" stroke="#8B5CF6" strokeWidth={2} dot={{r:3}} />}
                      {(activeGeoEngine === 'All Engines' || activeGeoEngine === 'Claude') && <Line type="monotone" dataKey="claude" name="Claude" stroke="#EF4444" strokeWidth={2} dot={{r:3}} />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Share of Visibility by AI Engine */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-4 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Share of Visibility by AI Engine</h3>
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <div className="relative w-[150px] h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={filteredGeoShareData || []} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                          {filteredGeoShareData?.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-gray-500 font-semibold mb-0.5">Total</span>
                      <span className="text-xl font-bold text-gray-900 leading-tight">1,842</span>
                      <span className="text-[9px] text-gray-500 mt-0.5">AI Mentions</span>
                    </div>
                  </div>
                  <div className="flex-1 pl-4 space-y-3">
                    {filteredGeoShareData?.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: item.color}}></div>
                          <span className="text-gray-700 font-medium">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-gray-900">{item.pct}</span>
                          <span className="text-gray-400 w-8 text-right text-[9px]">({item.value})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Overview Presence */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">AI Overview Presence</h3>
                  <div className="flex gap-2">
                     <button className="text-[10px] bg-gray-50 border border-gray-200 px-2 py-1 rounded text-gray-700 font-semibold">Top Queries</button>
                     <button className="text-[10px] text-gray-500 hover:text-gray-700 px-2 py-1">Top Pages</button>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-center space-y-4">
                  {charts.geoOverviewPresence?.map((q, i) => (
                    <div key={i} className="flex flex-col text-[11px]">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-700 truncate w-3/5">{q.query}</span>
                        <div className="flex items-center gap-2">
                           <span className="font-bold text-gray-900">{q.value}%</span>
                           <span className="text-green-500 font-medium text-[9px] flex items-center justify-end">↑ {q.change.replace('+ ','')}</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{width: `${q.value}%`}}></div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center">View All Queries &rarr;</button>
              </div>

            </div>

            {/* Main Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Top Prompts Tracking */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-4 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Top Prompts Tracking</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-50">
                        <th className="pb-2 font-medium">Prompt / AI Query</th>
                        <th className="pb-2 font-medium">Engine</th>
                        <th className="pb-2 font-medium text-center">Position</th>
                        <th className="pb-2 font-medium text-center">Visibility</th>
                        <th className="pb-2 font-medium text-center">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredTopPrompts?.map((p, i) => {
                        const EngineIcon = p.engineIcon === 'MessageCircle' ? MessageCircle : (p.engineIcon === 'Search' ? Search : (p.engineIcon === 'Target' ? Target : (p.engineIcon === 'Zap' ? Zap : (p.engineIcon === 'Cpu' ? Cpu : Globe))));
                        const visColor = p.visibility.includes('High') ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50';
                        const trendColor = p.trend.startsWith('+') ? 'text-green-500' : 'text-red-500';
                        const trendIcon = p.trend.startsWith('+') ? '↑' : '↓';
                        return (
                        <tr key={i} className="text-gray-700">
                          <td className="py-2.5 font-medium truncate max-w-[120px]">{p.prompt}</td>
                          <td className="py-2.5 flex items-center gap-1.5"><EngineIcon size={12} className="text-gray-400"/> {p.engine}</td>
                          <td className="py-2.5 text-center font-bold text-gray-900">{p.position}</td>
                          <td className="py-2.5 text-center"><span className={`px-2 py-0.5 rounded font-semibold text-[9px] ${visColor}`}>{p.visibility}</span></td>
                          <td className={`py-2.5 text-center font-bold ${trendColor}`}>{trendIcon} {p.trend.replace(/[-+]\s/,'')}</td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-2 hover:underline w-full text-center">View All Prompts &rarr;</button>
              </div>

              {/* Brand Mentions & Citations */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-4 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Brand Mentions & Citations</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 min-h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.geoMentionsCitations || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9CA3AF', fontSize: 10}} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill:'#9CA3AF', fontSize: 10}} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill:'#9CA3AF', fontSize: 10}} />
                      <RechartsTooltip />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: 10 }}/>
                      {/* Using Bar inside LineChart visually mimics Combo if we used ComposedChart, but we'll stick to LineChart with different strokes for simplicity or use actual Bar chart logic. 
                          Since we only imported LineChart, we'll render both as lines but styled uniquely. (The image shows bars for Citations and line for mentions) */}
                      <Line yAxisId="left" type="monotone" dataKey="mentions" name="Mentions" stroke="#3B82F6" strokeWidth={2} dot={{r: 3, fill: '#3B82F6'}} />
                      <Line yAxisId="right" type="monotone" dataKey="citations" name="Citations" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Answer Examples */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-4 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">AI Answer Examples</h3>
                </div>
                <div className="flex gap-2 mb-4">
                  {['ChatGPT', 'Google AI', 'Gemini', 'Perplexity'].map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setActiveAiAnswerTab(tab)}
                      className={`px-3 py-1 rounded text-xs font-semibold ${activeAiAnswerTab === tab ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 font-medium hover:bg-gray-50'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col relative">
                   <div className="absolute top-1/2 -translate-y-1/2 -left-3 bg-white border border-gray-200 rounded-full p-1 shadow-sm cursor-pointer hover:bg-gray-50"><ChevronLeft size={16} className="text-gray-400"/></div>
                   <div className="absolute top-1/2 -translate-y-1/2 -right-3 bg-white border border-gray-200 rounded-full p-1 shadow-sm cursor-pointer hover:bg-gray-50"><ChevronRight size={16} className="text-gray-400"/></div>
                   
                   <div className="flex items-center justify-between mb-3">
                     <div className="flex items-center gap-2"><MessageCircle size={16} className="text-gray-900"/><span className="font-bold text-gray-900 text-sm">{activeAiAnswerTab}</span></div>
                     <span className="text-[10px] text-gray-500 font-medium bg-gray-200 px-2 py-0.5 rounded">{currentAnswer.title}</span>
                   </div>
                   <div className="bg-white p-3 rounded-lg border border-gray-100 mb-3 shadow-sm flex-1">
                      <p className="text-gray-800 text-xs font-medium italic mb-2">"What is the best CRM software for small and medium businesses?"</p>
                      <p className="text-gray-600 text-[11px] leading-relaxed">
                         {currentAnswer.text}
                      </p>
                   </div>
                   <div className="flex items-center justify-between text-[10px]">
                      <div className="text-gray-500">Source: <a href="#" className="text-blue-500 hover:underline">{currentAnswer.source}</a></div>
                      <div className="flex items-center gap-3 text-gray-600">
                         <span className="font-semibold text-gray-900">Rank: <span className="font-normal text-gray-600">{currentAnswer.rank}</span></span>
                         <span className={`flex items-center gap-1 bg-opacity-10 px-2 py-0.5 rounded border font-semibold ${currentAnswer.sentiment === 'Positive' ? 'text-green-600 bg-green-50 border-green-100' : 'text-gray-600 bg-gray-50 border-gray-100'}`}><Check size={10}/> {currentAnswer.sentiment}</span>
                      </div>
                   </div>
                </div>
              </div>

            </div>

            {/* Main Row 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Competitor Compare */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-4 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Competitor Compare</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-[10px] px-2 py-1 rounded outline-none font-semibold"><option>AI Visibility Score ▾</option></select>
                </div>
                <div className="flex-1">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-50">
                        <th className="pb-2 font-medium">Company</th>
                        <th className="pb-2 font-medium text-center">AI Visibility</th>
                        <th className="pb-2 font-medium text-center">Mentions</th>
                        <th className="pb-2 font-medium text-center">Citations</th>
                        <th className="pb-2 font-medium text-center">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lists.geoCompetitorCompare?.map((c, i) => (
                        <tr key={i} className={c.isUs ? "bg-indigo-50/50 text-indigo-900 font-semibold" : "text-gray-700"}>
                          <td className="py-2.5 flex items-center gap-2">
                             {c.isUs ? <div className="p-1 bg-indigo-600 text-white rounded"><Target size={10}/></div> : <div className="p-1 text-gray-400"><Circle size={10}/></div>}
                             {c.company}
                          </td>
                          <td className="py-2.5 text-center font-bold">{c.visibility}</td>
                          <td className="py-2.5 text-center">{c.mentions}</td>
                          <td className="py-2.5 text-center">{c.citations}</td>
                          <td className="py-2.5 text-center text-green-500 font-semibold flex justify-center items-center gap-1">↑ {c.trend.replace('+ ','')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* AI Content Opportunities */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-5 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2"><Zap size={16} className="text-purple-500 fill-purple-100"/> AI Content Opportunities</h3>
                </div>
                <div className="flex-1">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-50 text-[10px]">
                        <th className="pb-2 font-medium">Idea</th>
                        <th className="pb-2 font-medium text-center">Score</th>
                        <th className="pb-2 font-medium text-center">V-Search</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lists.geoContentOpportunities?.map((o, i) => (
                        <tr key={i} className="text-gray-700">
                          <td className="py-2.5 font-medium">{o.idea}</td>
                          <td className="py-2.5 text-center font-bold text-gray-900">{o.score}</td>
                          <td className="py-2.5 flex justify-center">
                             <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${o.vsearch === 'High' ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'}`}>{o.vsearch}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center">View All Recommendations &rarr;</button>
              </div>

              {/* GEO Health Score */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col justify-between">
                <h3 className="font-bold text-gray-900 text-sm mb-4">GEO Health Score</h3>
                <div className="flex items-center justify-between h-full gap-4">
                   <div className="flex flex-col items-center">
                     <div className="relative w-28 h-28 flex flex-col items-center justify-center">
                       <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                         <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                         <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" strokeWidth="4" strokeDasharray={`${widgets.geoHealthScoreDetails?.score || 86}, 100`} />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                         <span className="text-2xl font-bold text-gray-900 leading-none">{widgets.geoHealthScoreDetails?.score || 86}</span>
                         <span className="text-[10px] text-gray-500">/100</span>
                       </div>
                     </div>
                     <span className="text-green-600 font-bold text-xs mt-2">Excellent</span>
                   </div>
                   
                   <div className="flex-1 space-y-2 text-[9px] font-medium">
                     {widgets.geoHealthScoreDetails?.categories?.map((c, i) => (
                       <div key={i} className="flex items-center justify-between">
                         <div className="flex items-center gap-1.5 text-gray-600">
                           <CheckCircle2 size={10} className="text-green-500"/> {c.name}
                         </div>
                         <span className={`${c.color}`}>{c.status}</span>
                       </div>
                     ))}
                   </div>
                </div>
                <button className="text-indigo-600 text-[11px] font-semibold mt-4 hover:underline w-full text-center flex items-center justify-center gap-1">View Full GEO Report <ArrowDownRight size={12}/></button>
              </div>

            </div>
          </>
        )}

        {/* COMPETITORS SPECIFIC TAB CONTENT */}
        {activeTab === 'Competitors' && (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <KPICard title="Organic Traffic" value={kpis.compOrganicTraffic?.toLocaleString() || '12,842'} change={15.3} icon={Activity} colorClass="text-blue-500" />
              <KPICard title="Organic Keywords" value={kpis.compOrganicKeywords?.toLocaleString() || '5,421'} change={12.6} icon={CheckCircle} colorClass="text-green-500" />
              <KPICard title="Backlinks" value={kpis.compBacklinks?.toLocaleString() || '18,356'} change={9.8} icon={Link} colorClass="text-orange-500" />
              <KPICard title="Referring Domains" value={kpis.compReferringDomains?.toLocaleString() || '2,354'} change={10.9} icon={Users} colorClass="text-purple-500" />
              <KPICard title="Domain Authority" value={kpis.compDomainAuthority || '42'} change={6.7} icon={Shield} colorClass="text-pink-500" />
              <KPICard title="Visibility Score" value={`${kpis.compVisibilityScore || 78}/100`} change={8.4} icon={Star} colorClass="text-indigo-500" />
            </div>

            {/* Main Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Visibility Score Comparison */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-5 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Visibility Score Comparison</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 14 Days</option></select>
                </div>
                <div className="flex-1 min-h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.compVisibilityComparison || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9CA3AF', fontSize: 11}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill:'#9CA3AF', fontSize: 11}} />
                      <RechartsTooltip />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: 10 }}/>
                      <Line type="monotone" dataKey="us" name="codigix.co" stroke="#3B82F6" strokeWidth={2} dot={{r:3}} />
                      <Line type="monotone" dataKey="comp1" name="competitor1.com" stroke="#10B981" strokeWidth={2} dot={{r:3}} />
                      <Line type="monotone" dataKey="comp2" name="competitor2.com" stroke="#F59E0B" strokeWidth={2} dot={{r:3}} />
                      <Line type="monotone" dataKey="comp3" name="competitor3.com" stroke="#6366F1" strokeWidth={2} dot={{r:3}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Traffic Share */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Traffic Share</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 30 Days</option></select>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="relative w-[180px] h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={charts.compTrafficShare || []} innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value">
                          {charts.compTrafficShare?.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-gray-500 font-semibold mb-0.5">Total</span>
                      <span className="text-xl font-bold text-gray-900 leading-tight">48,521</span>
                      <span className="text-[10px] text-gray-500 mt-0.5">Sessions</span>
                    </div>
                  </div>
                  <div className="w-full mt-4 space-y-2">
                    {charts.compTrafficShare?.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: item.color}}></div>
                          <span className="text-gray-700 font-medium">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-gray-900">{item.pct}</span>
                          <span className="text-gray-400 text-[10px]">({item.value.toLocaleString()})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Competitors Table */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-4 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Top Competitors</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 30 Days</option></select>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left text-[11px] whitespace-nowrap">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-50">
                        <th className="pb-2 font-medium">Domain</th>
                        <th className="pb-2 font-medium text-center">Visibility Score</th>
                        <th className="pb-2 font-medium text-center">Keywords</th>
                        <th className="pb-2 font-medium text-center">Backlinks</th>
                        <th className="pb-2 font-medium text-center">Traffic</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lists.compTopCompetitors?.map((c, i) => (
                        <tr key={i} className="text-gray-700">
                          <td className="py-2.5 flex items-center gap-1.5 font-semibold text-gray-900">
                             <div className="w-2 h-2 rounded-full" style={{backgroundColor: c.color}}></div>
                             {c.domain}
                          </td>
                          <td className="py-2.5 text-center font-bold text-indigo-600">{c.visibility}</td>
                          <td className="py-2.5 text-center">{c.keywords.toLocaleString()}</td>
                          <td className="py-2.5 text-center">{c.backlinks.toLocaleString()}</td>
                          <td className="py-2.5 text-center">{c.traffic.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-right flex items-center justify-end gap-1">View All Competitors <ArrowRight size={12}/></button>
              </div>

            </div>

            {/* Main Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Keyword Gap */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-5 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Keyword Gap</h3>
                  <div className="flex gap-2">
                     <button className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-1 rounded">Missing</button>
                     <button className="text-[10px] text-gray-500 hover:bg-gray-50 px-2 py-1 rounded">Weak</button>
                     <button className="text-[10px] text-gray-500 hover:bg-gray-50 px-2 py-1 rounded">Strong</button>
                     <button className="text-[10px] text-gray-500 hover:bg-gray-50 px-2 py-1 rounded">All Keywords</button>
                  </div>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left text-[11px] whitespace-nowrap">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-50">
                        <th className="pb-2 font-medium">Keyword</th>
                        <th className="pb-2 font-medium">Volume</th>
                        <th className="pb-2 font-medium text-center">codigix.co</th>
                        <th className="pb-2 font-medium text-center">competitor1.com</th>
                        <th className="pb-2 font-medium text-center">competitor2.com</th>
                        <th className="pb-2 font-medium text-center">competitor3.com</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lists.compKeywordGap?.map((k, i) => (
                        <tr key={i} className="text-gray-700">
                          <td className="py-2.5 font-medium">{k.keyword}</td>
                          <td className="py-2.5 font-semibold">{k.volume.toLocaleString()}</td>
                          <td className="py-2.5"><div className="flex justify-center">{k.us ? <Check size={14} className="text-green-500"/> : <X size={14} className="text-red-500"/>}</div></td>
                          <td className="py-2.5"><div className="flex justify-center">{k.comp1 ? <Check size={14} className="text-green-500"/> : <X size={14} className="text-red-500"/>}</div></td>
                          <td className="py-2.5"><div className="flex justify-center">{k.comp2 ? <Check size={14} className="text-green-500"/> : <X size={14} className="text-red-500"/>}</div></td>
                          <td className="py-2.5"><div className="flex justify-center">{k.comp3 ? <Check size={14} className="text-green-500"/> : <X size={14} className="text-red-500"/>}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center flex items-center justify-center gap-1">View Full Keyword Gap <ArrowRight size={12}/></button>
              </div>

              {/* Backlink Gap */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Backlink Gap</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 30 Days</option></select>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left text-[11px] whitespace-nowrap">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-50">
                        <th className="pb-2 font-medium">Domain</th>
                        <th className="pb-2 font-medium text-center">Missing Backlinks</th>
                        <th className="pb-2 font-medium text-center">Weak Backlinks</th>
                        <th className="pb-2 font-medium text-center">Strong Backlinks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lists.compBacklinkGap?.map((b, i) => (
                        <tr key={i} className="text-gray-700">
                          <td className="py-3 font-semibold text-gray-900">{b.domain}</td>
                          <td className="py-3 text-center">{b.missing.toLocaleString()}</td>
                          <td className="py-3 text-center">{b.weak.toLocaleString()}</td>
                          <td className="py-3 text-center font-bold text-gray-900">{b.strong.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center flex items-center justify-center gap-1">View Backlink Gap <ArrowRight size={12}/></button>
              </div>

              {/* Top Pages by Traffic */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-4 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Top Pages by Traffic</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 30 Days</option></select>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left text-[11px] whitespace-nowrap">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-50">
                        <th className="pb-2 font-medium">Page</th>
                        <th className="pb-2 font-medium text-center">codigix.co</th>
                        <th className="pb-2 font-medium text-center">competitor1.com</th>
                        <th className="pb-2 font-medium text-center">competitor2.com</th>
                        <th className="pb-2 font-medium text-center">competitor3.com</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lists.compTopPages?.map((p, i) => (
                        <tr key={i} className="text-gray-700">
                          <td className="py-2.5 font-medium">{p.page}</td>
                          <td className="py-2.5 text-center font-bold text-gray-900">{p.us.toLocaleString()}</td>
                          <td className="py-2.5 text-center">{p.comp1.toLocaleString()}</td>
                          <td className="py-2.5 text-center">{p.comp2.toLocaleString()}</td>
                          <td className="py-2.5 text-center">{p.comp3.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-right flex items-center justify-end gap-1">View All Top Pages <ArrowRight size={12}/></button>
              </div>

            </div>

            {/* Main Row 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Content Gap */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-4 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Content Gap</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 30 Days</option></select>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left text-[11px] whitespace-nowrap">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-50">
                        <th className="pb-2 font-medium">Topic</th>
                        <th className="pb-2 font-medium text-center">Relevance</th>
                        <th className="pb-2 font-medium text-center">codigix.co</th>
                        <th className="pb-2 font-medium text-center">comp1.com</th>
                        <th className="pb-2 font-medium text-center">comp2.com</th>
                        <th className="pb-2 font-medium text-center">comp3.com</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lists.compContentGap?.map((c, i) => (
                        <tr key={i} className="text-gray-700">
                          <td className="py-2.5 font-medium">{c.topic}</td>
                          <td className="py-2.5 text-center">
                            <span className={`text-[9px] font-semibold ${c.relevance === 'High' ? 'text-red-500' : (c.relevance === 'Medium' ? 'text-yellow-500' : 'text-blue-500')}`}>{c.relevance}</span>
                          </td>
                          <td className="py-2.5"><div className="flex justify-center">{c.us ? <Check size={14} className="text-green-500"/> : <X size={14} className="text-red-500"/>}</div></td>
                          <td className="py-2.5"><div className="flex justify-center">{c.comp1 ? <Check size={14} className="text-green-500"/> : <X size={14} className="text-red-500"/>}</div></td>
                          <td className="py-2.5"><div className="flex justify-center">{c.comp2 ? <Check size={14} className="text-green-500"/> : <X size={14} className="text-red-500"/>}</div></td>
                          <td className="py-2.5"><div className="flex justify-center">{c.comp3 ? <Check size={14} className="text-green-500"/> : <X size={14} className="text-red-500"/>}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center flex items-center justify-center gap-1">View Content Gap <ArrowRight size={12}/></button>
              </div>

              {/* Top Competitors by Channel */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-5 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Top Competitors by Channel</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 30 Days</option></select>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left text-[11px] whitespace-nowrap">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-50">
                        <th className="pb-2 font-medium">Domain</th>
                        <th className="pb-2 font-medium text-center"><div className="flex items-center justify-center gap-1"><Search size={12} className="text-blue-500"/> Organic Search</div></th>
                        <th className="pb-2 font-medium text-center"><div className="flex items-center justify-center gap-1"><CheckCircle2 size={12} className="text-green-500"/> Direct</div></th>
                        <th className="pb-2 font-medium text-center"><div className="flex items-center justify-center gap-1"><Link size={12} className="text-orange-500"/> Referrals</div></th>
                        <th className="pb-2 font-medium text-center"><div className="flex items-center justify-center gap-1"><Share2 size={12} className="text-pink-500"/> Social</div></th>
                        <th className="pb-2 font-medium text-center"><div className="flex items-center justify-center gap-1"><DollarSign size={12} className="text-blue-400"/> Paid Search</div></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lists.compChannelShare?.map((c, i) => (
                        <tr key={i} className="text-gray-700">
                          <td className="py-3 font-semibold text-gray-900">{c.domain}</td>
                          <td className="py-3 text-center font-bold text-gray-900">{c.organic}</td>
                          <td className="py-3 text-center font-semibold">{c.direct}</td>
                          <td className="py-3 text-center font-semibold">{c.referrals}</td>
                          <td className="py-3 text-center font-semibold">{c.social}</td>
                          <td className="py-3 text-center font-semibold">{c.paid}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center flex items-center justify-center gap-1">View Full Channel Report <ArrowRight size={12}/></button>
              </div>

              {/* Top Competitors by Region */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Top Competitors by Region</h3>
                </div>
                <div className="flex-1 flex flex-col">
                   <div className="flex-1 min-h-[120px] bg-indigo-50/50 rounded-lg flex items-center justify-center relative overflow-hidden mb-4">
                      {/* Abstract map representation */}
                      <Globe size={180} strokeWidth={0.5} className="text-indigo-200 absolute -right-10 -top-10 opacity-60" />
                      <Map size={180} strokeWidth={0.5} className="text-indigo-200 absolute -left-10 -bottom-10 opacity-60" />
                      <div className="z-10 bg-white/80 px-4 py-2 rounded-lg border border-indigo-100 backdrop-blur-sm text-center">
                         <span className="block text-indigo-900 font-bold text-lg">Global</span>
                         <span className="block text-indigo-600 font-medium text-xs">Reach Tracking</span>
                      </div>
                   </div>
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-[11px] whitespace-nowrap">
                       <thead>
                         <tr className="text-gray-500 border-b border-gray-50">
                           <th className="pb-2 font-medium">Country</th>
                           <th className="pb-2 font-medium text-right">Top Competitor</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                         {lists.compRegion?.map((r, i) => (
                           <tr key={i} className="text-gray-700">
                             <td className="py-2 font-medium flex items-center gap-2">
                               <img src={`https://flagcdn.com/w20/${r.flag}.png`} alt={r.country} className="w-3.5 h-auto rounded-sm shadow-sm" />
                               {r.country}
                             </td>
                             <td className="py-2 text-right font-semibold text-gray-900">{r.topComp}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center flex items-center justify-center gap-1">View Region Report <ArrowRight size={12}/></button>
              </div>

            </div>
          </>
        )}

        {/* OVERVIEW SPECIFIC TAB CONTENT */}
        {activeTab === 'Overview' && (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <KPICard title="Total Keywords Ranked" value={kpis.totalKeywords} change={8.6} icon={Search} colorClass="text-indigo-600" />
              <KPICard title="Top 3 Rankings" value={kpis.top3Rankings} change={12.4} icon={Zap} colorClass="text-green-500" />
              <KPICard title="Organic Traffic" value={kpis.organicTraffic} change={15.3} icon={Users} colorClass="text-blue-500" />
              <KPICard title="GMB Views" value={(kpis.gmbSearchViews + kpis.gmbMapViews).toLocaleString()} change={18.7} icon={Eye} colorClass="text-orange-500" />
              <KPICard title="GMB Actions" value={(kpis.gmbWebsiteClicks + kpis.gmbDirectionRequests + 196 + 142).toLocaleString()} change={16.2} icon={MousePointer2} colorClass="text-red-500" />
              <KPICard title="AI Visibility Score (GEO)" value={`${kpis.aiVisibilityScore || 78}/100`} change={10.1} icon={Sparkles} colorClass="text-purple-500" />
            </div>

            {/* Main Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* SEO Performance (Line Chart) */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-5 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">SEO Performance</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 min-h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.seoPerformance?.length ? charts.seoPerformance : [{name:'No Data', clicks:0, impressions:0}]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9CA3AF', fontSize: 11}} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill:'#9CA3AF', fontSize: 11}} tickFormatter={v => `${v/1000}K`} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill:'#9CA3AF', fontSize: 11}} />
                      <RechartsTooltip />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: 10 }}/>
                      <Line yAxisId="left" type="monotone" dataKey="clicks" name="Clicks" stroke="#3B82F6" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="impressions" name="Impressions" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                      <Line yAxisId="left" type="monotone" dataKey="position" name="Avg. Position" stroke="#F59E0B" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* GMB Performance (Donut) */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-4 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">GMB Performance</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 flex flex-col md:flex-row items-center justify-center">
                  <div className="relative w-[180px] h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={[
                          { name: 'Search Views', value: 5302, color: '#3B82F6' },
                          { name: 'Maps Views', value: 2481, color: '#10B981' },
                          { name: 'Direct Views', value: 1108, color: '#F59E0B' },
                          { name: 'Website Views', value: 547, color: '#6366F1' }
                        ]} innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value">
                          { [
                              { name: 'Search Views', value: 5302, color: '#3B82F6' },
                              { name: 'Maps Views', value: 2481, color: '#10B981' },
                              { name: 'Direct Views', value: 1108, color: '#F59E0B' },
                              { name: 'Website Views', value: 547, color: '#6366F1' }
                            ].map((e, i) => <Cell key={i} fill={e.color} />) }
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-bold text-gray-900 leading-tight">9,438</span>
                      <span className="text-[10px] text-gray-500 mt-0.5">Total Views</span>
                    </div>
                  </div>
                  <div className="w-full md:w-auto md:flex-1 pl-4 space-y-3 mt-4 md:mt-0">
                    {[
                      { name: 'Search Views', value: 5302, pct: '56.1%', color: '#3B82F6' },
                      { name: 'Maps Views', value: 2481, pct: '26.3%', color: '#10B981' },
                      { name: 'Direct Views', value: 1108, pct: '11.7%', color: '#F59E0B' },
                      { name: 'Website Views', value: 547, pct: '5.9%', color: '#6366F1' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: item.color}}></div>
                          <span className="text-gray-700 font-medium">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <span className="font-bold text-gray-900">{item.value.toLocaleString()}</span>
                          <span className="text-gray-400 text-[10px]">({item.pct})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top GMB Actions */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Top GMB Actions</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 space-y-4 flex flex-col justify-center">
                  {[
                    { label: 'Website clicks', value: 532, change: '+ 14.3%', color: 'text-green-500', icon: MousePointer2 },
                    { label: 'Direction requests', value: 284, change: '+ 18.6%', color: 'text-green-500', icon: MapPin },
                    { label: 'Call clicks', value: 196, change: '+ 12.8%', color: 'text-green-500', icon: CheckCircle2 },
                    { label: 'Message clicks', value: 142, change: '+ 9.7%', color: 'text-green-500', icon: MessageSquare },
                    { label: 'Book clicks', value: 122, change: '+ 22.1%', color: 'text-green-500', icon: Calendar }
                  ].map((a, i) => (
                    <div key={i} className="flex items-center justify-between">
                       <div className="flex items-center gap-2 text-[11px] font-medium text-gray-700">
                         <div className="p-1.5 bg-gray-50 text-gray-400 rounded"><a.icon size={12}/></div>
                         {a.label}
                       </div>
                       <div className="flex items-center gap-4 text-[11px]">
                         <span className="font-bold text-gray-900">{a.value}</span>
                         <span className={`${a.color} font-semibold w-12 text-right`}>↑ {a.change.replace('+ ','')}</span>
                       </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Main Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Top Performing Keywords */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-5 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Top Performing Keywords</h3>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left text-[11px] whitespace-nowrap">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-50">
                        <th className="pb-2 font-medium">Keyword</th>
                        <th className="pb-2 font-medium text-center">Position</th>
                        <th className="pb-2 font-medium text-center">Change</th>
                        <th className="pb-2 font-medium text-center">Volume</th>
                        <th className="pb-2 font-medium text-center">Traffic</th>
                        <th className="pb-2 font-medium text-center">KD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[
                        { keyword: 'crm software development', pos: 1, change: '-', vol: '1,600', traffic: 856, kd: 32 },
                        { keyword: 'best crm for small business', pos: 2, change: '+ 1', vol: '880', traffic: 512, kd: 28 },
                        { keyword: 'custom crm development', pos: 3, change: '+ 2', vol: '720', traffic: 401, kd: 31 },
                        { keyword: 'crm software company', pos: 4, change: '+ 3', vol: '590', traffic: 332, kd: 33 },
                        { keyword: 'crm development services', pos: 5, change: '+ 1', vol: '590', traffic: 301, kd: 30 }
                      ].map((k, i) => (
                        <tr key={i} className="text-gray-700">
                          <td className="py-2.5 font-semibold text-gray-900">{k.keyword}</td>
                          <td className="py-2.5 text-center font-bold">{k.pos}</td>
                          <td className="py-2.5 text-center">
                            {k.change === '-' ? <span className="text-gray-400"><Minus size={12} className="mx-auto"/></span> : <span className="text-green-500 font-semibold flex items-center justify-center gap-1"><ArrowUpRight size={10}/> {k.change.replace('+ ','')}</span>}
                          </td>
                          <td className="py-2.5 text-center font-medium">{k.vol}</td>
                          <td className="py-2.5 text-center">{k.traffic}</td>
                          <td className="py-2.5 text-center"><span className="text-green-600 font-semibold">{k.kd}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center flex items-center justify-center gap-1">View All Keywords <ArrowRight size={12}/></button>
              </div>

              {/* AI Visibility (GEO) */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">AI Visibility (GEO)</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 flex flex-col justify-center gap-6">
                   <div className="flex flex-col items-center">
                     <div className="relative w-28 h-28 flex flex-col items-center justify-center">
                       <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                         <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                         <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" strokeWidth="4" strokeDasharray={`78, 100`} />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                         <span className="text-3xl font-bold text-gray-900 leading-none">78</span>
                         <span className="text-[10px] text-gray-500 font-medium">/100</span>
                       </div>
                     </div>
                     <span className="text-green-600 font-bold text-[11px] mt-2">Good</span>
                   </div>
                   
                   <div className="space-y-3 text-[11px] font-medium w-full px-4">
                     {[
                       { name: 'AI Overviews Presence', score: '85/100' },
                       { name: 'AI Citations', score: '74/100' },
                       { name: 'Brand Mentions', score: '72/100' },
                       { name: 'Prompt Rankings', score: '78/100' },
                       { name: 'Sentiment Score', score: '80/100' }
                     ].map((c, i) => (
                       <div key={i} className="flex items-center justify-between">
                         <div className="flex items-center gap-1.5 text-gray-600">
                           <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> {c.name}
                         </div>
                         <span className="font-bold text-gray-900">{c.score}</span>
                       </div>
                     ))}
                   </div>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center flex items-center justify-center gap-1">View GEO Report <ArrowRight size={12}/></button>
              </div>

              {/* AI Prompt Rankings */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-4 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">AI Prompt Rankings</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left text-[11px] whitespace-nowrap">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-50">
                        <th className="pb-2 font-medium">Prompt / Query</th>
                        <th className="pb-2 font-medium text-center">Your Position</th>
                        <th className="pb-2 font-medium text-center">Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[
                        { prompt: 'best crm software for business', pos: 2, change: '+ 1' },
                        { prompt: 'crm software for small business', pos: 3, change: '-' },
                        { prompt: 'top crm development company', pos: 1, change: '-' },
                        { prompt: 'what is the best crm in 2026', pos: 4, change: '+ 2' },
                        { prompt: 'crm vs erp which is better', pos: 5, change: '+ 1' }
                      ].map((p, i) => (
                        <tr key={i} className="text-gray-700">
                          <td className="py-3.5 font-medium truncate max-w-[200px] text-gray-800">{p.prompt}</td>
                          <td className="py-3.5 text-center font-bold text-gray-900">{p.pos}</td>
                          <td className="py-3.5 text-center">
                            {p.change === '-' ? <span className="text-gray-400"><Minus size={12} className="mx-auto"/></span> : <span className="text-green-500 font-semibold flex items-center justify-center gap-1"><ArrowUpRight size={10}/> {p.change.replace('+ ','')}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center flex items-center justify-center gap-1">View All Prompts <ArrowRight size={12}/></button>
              </div>

            </div>

            {/* Main Row 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* GMB Reviews Overview */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">GMB Reviews Overview</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 flex items-center justify-center gap-6">
                  <div className="flex flex-col items-center">
                    <span className="text-4xl font-black text-gray-900 mb-1">4.8</span>
                    <div className="flex gap-0.5 text-yellow-400 mb-1">
                      <Star size={12} fill="currentColor"/>
                      <Star size={12} fill="currentColor"/>
                      <Star size={12} fill="currentColor"/>
                      <Star size={12} fill="currentColor"/>
                      <Star size={12} fill="currentColor"/>
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">Total 125 Reviews</span>
                  </div>
                  
                  <div className="flex-1 space-y-2 text-[10px]">
                    <div className="flex items-center justify-between text-gray-600">
                      <span>New Reviews</span>
                      <span className="font-bold text-gray-900 flex items-center gap-1">8 <span className="text-green-500 text-[9px] font-semibold">↑ 33.3%</span></span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Positive</span>
                      <span className="font-semibold text-gray-800">7 (87.5%)</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Neutral</span>
                      <span className="font-semibold text-gray-800">1 (12.5%)</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Negative</span>
                      <span className="font-semibold text-gray-800">0 (0%)</span>
                    </div>
                  </div>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center flex items-center justify-center gap-1">View Reviews <ArrowRight size={12}/></button>
              </div>

              {/* GMB Posts Performance */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">GMB Posts Performance</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center justify-center border-r border-gray-100 pr-2">
                    <span className="text-[10px] text-gray-500 font-medium mb-1">Total Posts</span>
                    <span className="text-2xl font-bold text-gray-900">12</span>
                  </div>
                  <div className="flex flex-col items-center justify-center border-r border-gray-100 px-2">
                    <span className="text-[10px] text-gray-500 font-medium mb-1">Total Views</span>
                    <span className="text-xl font-bold text-gray-900">1,942</span>
                    <span className="text-green-500 text-[9px] font-semibold flex items-center mt-0.5"><ArrowUpRight size={10}/> 19.5%</span>
                  </div>
                  <div className="flex flex-col items-center justify-center pl-2">
                    <span className="text-[10px] text-gray-500 font-medium mb-1">Engagements</span>
                    <span className="text-xl font-bold text-gray-900">342</span>
                    <span className="text-green-500 text-[9px] font-semibold flex items-center mt-0.5"><ArrowUpRight size={10}/> 15.2%</span>
                  </div>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center flex items-center justify-center gap-1">View All Posts <ArrowRight size={12}/></button>
              </div>

              {/* Local Pack Rankings */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Local Pack Rankings</h3>
                  <select className="bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded outline-none"><option>Last 7 Days</option></select>
                </div>
                <div className="flex-1 flex flex-col justify-center space-y-4 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Keywords in Local Pack</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900 text-sm">24</span>
                      <span className="text-green-500 font-semibold w-8 text-right">↑ 9.1%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Local Pack Avg. Position</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900 text-sm">2.6</span>
                      <span className="text-green-500 font-semibold w-8 text-right">↑ 0.4</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Total Locations Ranked</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900 text-sm">18</span>
                      <span className="w-8"></span>
                    </div>
                  </div>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center flex items-center justify-center gap-1">View Local Pack Report <ArrowRight size={12}/></button>
              </div>

              {/* Technical SEO Health */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 lg:col-span-3 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Technical SEO Health</h3>
                </div>
                <div className="flex-1 flex items-center justify-between">
                   <div className="flex flex-col items-center">
                     <span className="text-[10px] text-gray-600 font-medium mb-1">Site Health Score</span>
                     <div className="relative w-20 h-20 flex flex-col items-center justify-center">
                       <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                         <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                         <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" strokeWidth="4" strokeDasharray={`92, 100`} />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-1">
                         <span className="text-xl font-bold text-gray-900 leading-none">92</span>
                         <span className="text-[9px] text-gray-500 font-medium">/100</span>
                       </div>
                     </div>
                     <span className="text-green-600 font-bold text-[10px] mt-1">Excellent</span>
                   </div>
                   
                   <div className="flex-1 pl-4 space-y-2 text-[10px]">
                     <div className="flex items-center justify-between text-gray-600">
                       <span className="font-medium">Crawled Pages</span>
                       <span className="font-bold text-gray-900">1,256</span>
                     </div>
                     <div className="flex items-center justify-between text-gray-600">
                       <span className="font-medium">Issues Found</span>
                       <span className="font-bold text-gray-900">24</span>
                     </div>
                     <div className="flex items-center justify-between text-red-500 font-medium">
                       <span className="flex items-center gap-1"><AlertCircle size={10}/> Critical Issues</span>
                       <span className="font-bold">3</span>
                     </div>
                     <div className="flex items-center justify-between text-orange-500 font-medium">
                       <span className="flex items-center gap-1"><AlertTriangle size={10}/> Warnings</span>
                       <span className="font-bold">21</span>
                     </div>
                   </div>
                </div>
                <button className="text-indigo-600 text-xs font-semibold mt-4 hover:underline w-full text-center flex items-center justify-center gap-1">View Audit Report <ArrowRight size={12}/></button>
              </div>

            </div>
          </>
        )}

        {/* NON-SEO/GMB/GEO/COMPETITORS TABS FALLBACK */}
        {activeTab !== 'SEO' && activeTab !== 'GMB / GBP' && activeTab !== 'GEO / AI' && activeTab !== 'Competitors' && activeTab !== 'Overview' && (
           <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm border border-gray-100">
             <h3 className="text-xl font-bold text-gray-900 mb-2">{activeTab} Metrics</h3>
             <p>This tab is functioning but the detailed metrics are hidden while viewing the core SEO dashboard. Switch back to the SEO, GMB / GBP, GEO / AI, or Competitors tab to view the main dashboard.</p>
           </div>
        )}

      </div>
    </div>
  );
};

export default SeoGmbPage;