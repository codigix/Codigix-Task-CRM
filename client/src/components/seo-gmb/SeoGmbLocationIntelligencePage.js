import React, { useState } from 'react';
import {
  MapPin, Eye, Activity, ShoppingCart, Trophy, Target, 
  ChevronDown, RefreshCw, Download, Info, Plus, Minus, Globe,
  CheckCircle, AlertTriangle, Settings, FileText, Bell, Search, Layout,
  BarChart2, PieChart as PieChartIcon, TrendingUp, Filter,
  CheckCircle2, XCircle, Mail, Map, Smartphone, Check, X
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar, AreaChart, Area, ComposedChart
} from 'recharts';
import AdvancedDateRangePicker from '../common/AdvancedDateRangePicker';
import SeoGmbProjectSelector from './SeoGmbProjectSelector';
import { useAuth } from '../../hooks/useAuth';

const SeoGmbLocationIntelligencePage = () => {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState(null);
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [activeTab, setActiveTab] = useState('Overview');

  const tabs = [
    'Overview', 'Geo Performance', 'Local Rankings', 'Local Competitors', 
    'Search Intent', 'Multi-Location', 'Heatmap', 'Reports', 'Settings'
  ];

  // Helper for KPI Cards
  const KPICard = ({ title, value, change, changeLabel, icon: Icon, colorClass }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col justify-center h-full relative overflow-hidden group">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg bg-opacity-10 ${colorClass.replace('text', 'bg')}`}>
          <Icon size={18} className={colorClass} />
        </div>
        <span className="text-gray-900 text-[11px] font-semibold">{title}</span>
      </div>
      <div>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-gray-900 leading-none">{value}</span>
        </div>
        {change && (
          <span className={`text-[9px] font-bold ${change.toString().startsWith('-') ? 'text-red-500' : 'text-green-500'} block mt-1.5`}>
            {change.toString().startsWith('-') ? '↓' : '↑'} {change.toString().replace('-', '')} <span className="text-gray-400 font-medium">{changeLabel}</span>
          </span>
        )}
        {!change && changeLabel && (
          <span className="text-[9px] font-semibold text-gray-500 block mt-1.5">{changeLabel}</span>
        )}
      </div>
    </div>
  );

  // Tab Renderers
  const renderOverviewTab = () => {
    const trendData = [
      { date: 'May 24', india: 80, us: 70, uk: 65, canada: 60 },
      { date: 'May 25', india: 82, us: 71, uk: 66, canada: 62 },
      { date: 'May 26', india: 81, us: 72, uk: 68, canada: 63 },
      { date: 'May 27', india: 85, us: 75, uk: 67, canada: 65 },
      { date: 'May 28', india: 84, us: 74, uk: 69, canada: 66 },
      { date: 'May 29', india: 88, us: 78, uk: 70, canada: 68 },
    ];
    
    const trafficDist = [
      { name: 'Asia', value: 45, color: '#3B82F6' },
      { name: 'North America', value: 25, color: '#10B981' },
      { name: 'Europe', value: 20, color: '#F59E0B' },
      { name: 'Australia', value: 10, color: '#8B5CF6' }
    ];

    return (
      <div className="space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <KPICard title="Total Locations" value="24" changeLabel="Active Locations" icon={MapPin} colorClass="text-purple-600" />
          <KPICard title="Avg. Visibility Score" value={<span>78 <span className="text-sm font-medium text-gray-400">/100</span></span>} change="8.4%" changeLabel="vs last 7 days" icon={Eye} colorClass="text-blue-600" />
          <KPICard title="Total Local Traffic" value="48,756" change="15.6%" changeLabel="vs last 7 days" icon={Activity} colorClass="text-green-600" />
          <KPICard title="Local Conversions" value="2,184" change="12.3%" changeLabel="vs last 7 days" icon={ShoppingCart} colorClass="text-orange-500" />
          <KPICard title="Top Performing Region" value="Maharashtra" changeLabel="Visibility: 88/100" icon={Trophy} colorClass="text-indigo-600" />
          <KPICard title="Opportunity Score" value={<span>87 <span className="text-sm font-medium text-gray-400">/100</span></span>} changeLabel="High Opportunity" icon={Target} colorClass="text-teal-600" />
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Performance by Country (from previous design, adapted) */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-gray-900">Performance by Country</h3>
            </div>
            <div className="flex-1 flex items-center justify-between gap-6">
              <div className="w-[45%] h-[200px] bg-indigo-50/50 rounded flex items-center justify-center relative border border-indigo-100/50">
                <Globe size={48} className="text-indigo-200 opacity-50" />
              </div>
              <div className="flex-1">
                <table className="w-full text-left text-[11px] whitespace-nowrap">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-100 text-[9px] uppercase tracking-wider">
                      <th className="pb-2 font-semibold">Country</th>
                      <th className="pb-2 font-semibold text-center">Visibility</th>
                      <th className="pb-2 font-semibold text-center">Traffic</th>
                      <th className="pb-2 font-semibold text-center">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[
                      { c: 'India', v: '85/100', t: 32456, ch: '+ 18.6%' },
                      { c: 'United States', v: '72/100', t: 8745, ch: '+ 10.2%' },
                      { c: 'United Kingdom', v: '68/100', t: 3245, ch: '+ 6.8%' },
                      { c: 'Canada', v: '65/100', t: 2156, ch: '+ 7.1%' },
                    ].map((row, i) => (
                      <tr key={i} className="text-gray-700">
                        <td className="py-2.5 font-medium">{row.c}</td>
                        <td className="py-2.5 text-center text-gray-500">{row.v}</td>
                        <td className="py-2.5 text-center">{row.t.toLocaleString()}</td>
                        <td className="py-2.5 text-center text-green-500 font-semibold">↑ {row.ch.replace('+ ', '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Visibility Score Trend & Traffic Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col">
              <h3 className="font-semibold text-gray-900 mb-4 text-xs">Visibility Score Trend</h3>
              <div className="flex-1 min-h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 8 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8 }} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="india" stroke="#3B82F6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="us" stroke="#10B981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="uk" stroke="#F59E0B" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col">
              <h3 className="font-semibold text-gray-900 mb-4 text-xs">Traffic Distribution</h3>
              <div className="flex-1 flex items-center justify-center relative min-h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={trafficDist} innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                      {trafficDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-bold text-gray-900">32,756</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLocalRankingsTab = () => {
    return (
      <div className="space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <KPICard title="Total Ranked Locations" value="24" changeLabel="Active" icon={MapPin} colorClass="text-purple-600" />
          <KPICard title="In Top 3" value="186" change="14.5%" changeLabel="vs last 7 days" icon={Trophy} colorClass="text-green-600" />
          <KPICard title="In Top 10" value="456" change="10.2%" changeLabel="vs last 7 days" icon={Target} colorClass="text-blue-600" />
          <KPICard title="Avg. Position" value="5.6" change="-0.4" changeLabel="vs last 7 days" icon={Activity} colorClass="text-indigo-600" />
          <KPICard title="Impressions" value="128,456" change="12.6%" changeLabel="vs last 7 days" icon={Eye} colorClass="text-orange-500" />
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Rankings by Location</h3>
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100 text-[9px] uppercase tracking-wider">
                  <th className="pb-2 font-semibold">Location</th>
                  <th className="pb-2 font-semibold text-center">Visibility</th>
                  <th className="pb-2 font-semibold text-center">Top 3</th>
                  <th className="pb-2 font-semibold text-center">Top 10</th>
                  <th className="pb-2 font-semibold text-center">Avg Pos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { l: 'Mumbai, India', v: '92/100', t3: 50, t10: 128, p: 3.2 },
                  { l: 'Bengaluru, India', v: '89/100', t3: 42, t10: 112, p: 4.1 },
                  { l: 'Pune, India', v: '85/100', t3: 38, t10: 96, p: 5.6 },
                  { l: 'Hyderabad, India', v: '81/100', t3: 32, t10: 84, p: 6.2 },
                  { l: 'Delhi, India', v: '78/100', t3: 30, t10: 76, p: 7.4 },
                ].map((row, i) => (
                  <tr key={i} className="text-gray-700">
                    <td className="py-2.5 font-medium">{row.l}</td>
                    <td className="py-2.5 text-center text-gray-500">{row.v}</td>
                    <td className="py-2.5 text-center text-green-600 font-semibold">{row.t3}</td>
                    <td className="py-2.5 text-center text-blue-600 font-semibold">{row.t10}</td>
                    <td className="py-2.5 text-center font-bold">{row.p}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="text-indigo-600 text-[10px] font-semibold mt-4 hover:underline text-center w-full">View All Locations &rarr;</button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Top Ranking Keywords</h3>
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100 text-[9px] uppercase tracking-wider">
                  <th className="pb-2 font-semibold">Keyword</th>
                  <th className="pb-2 font-semibold">Location</th>
                  <th className="pb-2 font-semibold text-center">Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { k: 'cloud erp software', l: 'Mumbai', p: 1 },
                  { k: 'manufacturing erp', l: 'Bengaluru', p: 2 },
                  { k: 'inventory management', l: 'Pune', p: 1 },
                  { k: 'production planning', l: 'Hyderabad', p: 3 },
                  { k: 'supply chain management', l: 'Delhi', p: 2 },
                ].map((row, i) => (
                  <tr key={i} className="text-gray-700">
                    <td className="py-2.5 font-medium text-indigo-600">{row.k}</td>
                    <td className="py-2.5 text-gray-500">{row.l}</td>
                    <td className="py-2.5 text-center text-green-600 font-bold">#{row.p}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="text-indigo-600 text-[10px] font-semibold mt-4 hover:underline text-center w-full">View All Keywords &rarr;</button>
          </div>
        </div>
      </div>
    );
  };

  const renderLocalCompetitorsTab = () => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Market Share by Visibility</h3>
            <div className="space-y-3">
              {[
                { name: 'Your Business', val: 24.6, color: 'bg-indigo-600' },
                { name: 'Competitor A', val: 21.3, color: 'bg-blue-500' },
                { name: 'Competitor B', val: 18.2, color: 'bg-green-500' },
                { name: 'Competitor C', val: 15.7, color: 'bg-yellow-500' },
                { name: 'Others', val: 20.2, color: 'bg-gray-400' },
              ].map((c, i) => (
                <div key={i} className="flex items-center text-xs">
                  <span className={`w-28 font-medium ${c.name === 'Your Business' ? 'text-indigo-600' : 'text-gray-700'}`}>{c.name}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full mx-3 overflow-hidden">
                    <div className={`h-full ${c.color}`} style={{ width: `${c.val}%` }}></div>
                  </div>
                  <span className="w-10 text-right font-semibold text-gray-900">{c.val}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Competitor Visibility Comparison</h3>
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100 text-[9px] uppercase tracking-wider">
                  <th className="pb-2 font-semibold">Competitor</th>
                  <th className="pb-2 font-semibold text-center">Mumbai</th>
                  <th className="pb-2 font-semibold text-center">Bengaluru</th>
                  <th className="pb-2 font-semibold text-center">Pune</th>
                  <th className="pb-2 font-semibold text-center">Hyderabad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { c: 'Your Business', m: 92, b: 89, p: 85, h: 81 },
                  { c: 'Competitor A', m: 88, b: 84, p: 80, h: 75 },
                  { c: 'Competitor B', m: 76, b: 72, p: 70, h: 68 },
                  { c: 'Competitor C', m: 64, b: 60, p: 58, h: 54 },
                  { c: 'Competitor D', m: 52, b: 48, p: 45, h: 42 },
                ].map((row, i) => (
                  <tr key={i} className={`text-gray-700 ${row.c === 'Your Business' ? 'bg-indigo-50/50' : ''}`}>
                    <td className={`py-2.5 font-medium ${row.c === 'Your Business' ? 'text-indigo-600' : ''}`}>{row.c}</td>
                    <td className="py-2.5 text-center font-bold">{row.m}</td>
                    <td className="py-2.5 text-center font-bold">{row.b}</td>
                    <td className="py-2.5 text-center font-bold">{row.p}</td>
                    <td className="py-2.5 text-center font-bold">{row.h}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderSearchIntentTab = () => {
    const intentData = [
      { name: 'Informational', value: 40.2, color: '#3B82F6' },
      { name: 'Navigational', value: 24.8, color: '#6366F1' },
      { name: 'Commercial', value: 20.1, color: '#F59E0B' },
      { name: 'Transactional', value: 14.9, color: '#EF4444' }
    ];

    const intentTrendData = [
      { date: 'May 24', i: 40, n: 25, c: 20, t: 15 },
      { date: 'May 25', i: 42, n: 24, c: 19, t: 15 },
      { date: 'May 26', i: 39, n: 26, c: 21, t: 14 },
      { date: 'May 27', i: 41, n: 23, c: 20, t: 16 },
      { date: 'May 28', i: 38, n: 25, c: 22, t: 15 },
    ];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Search Intent Distribution</h3>
            <div className="flex-1 flex items-center justify-between">
              <div className="relative w-[150px] h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={intentData} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                      {intentData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-gray-900">32,456</span>
                </div>
              </div>
              <div className="flex-1 pl-6 space-y-3">
                {intentData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs font-medium">
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

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Top Search Intents by Location</h3>
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100 text-[9px] uppercase tracking-wider">
                  <th className="pb-2 font-semibold">Location</th>
                  <th className="pb-2 font-semibold text-center">Informational</th>
                  <th className="pb-2 font-semibold text-center">Navigational</th>
                  <th className="pb-2 font-semibold text-center">Commercial</th>
                  <th className="pb-2 font-semibold text-center">Transactional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { l: 'Mumbai', i: 41.2, n: 24.8, c: 21.8, t: 12.2 },
                  { l: 'Bengaluru', i: 38.6, n: 26.7, c: 19.5, t: 15.2 },
                  { l: 'Pune', i: 42.4, n: 22.8, c: 20.3, t: 14.5 },
                  { l: 'Hyderabad', i: 39.5, n: 25.4, c: 22.1, t: 13.0 },
                  { l: 'Delhi', i: 41.8, n: 24.0, c: 20.8, t: 13.4 },
                ].map((row, idx) => (
                  <tr key={idx} className="text-gray-700">
                    <td className="py-2.5 font-medium">{row.l}</td>
                    <td className="py-2.5 text-center">{row.i}%</td>
                    <td className="py-2.5 text-center">{row.n}%</td>
                    <td className="py-2.5 text-center">{row.c}%</td>
                    <td className="py-2.5 text-center">{row.t}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Top Queries by Intent</h3>
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100 text-[9px] uppercase tracking-wider">
                  <th className="pb-2 font-semibold">Query</th>
                  <th className="pb-2 font-semibold text-center">Intent</th>
                  <th className="pb-2 font-semibold text-center">Search Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { q: 'what is cloud erp', i: 'Informational', s: 2340 },
                  { q: 'benefits of erp software', i: 'Informational', s: 1876 },
                  { q: 'buy erp software online', i: 'Transactional', s: 1245 },
                  { q: 'erp implementation guide', i: 'Informational', s: 987 },
                  { q: 'best erp vendors', i: 'Commercial', s: 764 },
                ].map((row, idx) => (
                  <tr key={idx} className="text-gray-700">
                    <td className="py-2.5 font-medium">{row.q}</td>
                    <td className="py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600">{row.i}</span>
                    </td>
                    <td className="py-2.5 text-center font-bold">{row.s.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Intent Trend</h3>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={intentTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="i" name="Informational" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="n" name="Navigational" stroke="#6366F1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="c" name="Commercial" stroke="#F59E0B" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="t" name="Transactional" stroke="#EF4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMultiLocationTab = () => {
    return (
      <div className="space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <KPICard title="Total Locations" value="24" icon={MapPin} colorClass="text-purple-600" />
          <KPICard title="Active Locations" value="22" icon={CheckCircle} colorClass="text-green-600" />
          <KPICard title="Locations in Top 10" value="18" icon={Trophy} colorClass="text-blue-600" />
          <KPICard title="Total Local Traffic" value="48,756" icon={Activity} colorClass="text-indigo-600" />
          <KPICard title="Total Conversions" value="2,184" icon={ShoppingCart} colorClass="text-orange-500" />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900 text-sm">Location Performance</h3>
            <button className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700 transition flex items-center gap-1">
              <Plus size={14} /> Add Location
            </button>
          </div>
          <table className="w-full text-left text-[11px] whitespace-nowrap">
            <thead>
              <tr className="text-gray-500 border-b border-gray-100 text-[9px] uppercase tracking-wider">
                <th className="pb-2 font-semibold">Location</th>
                <th className="pb-2 font-semibold text-center">Visibility Score</th>
                <th className="pb-2 font-semibold text-center">Local Traffic</th>
                <th className="pb-2 font-semibold text-center">Conversions</th>
                <th className="pb-2 font-semibold text-center">Revenue</th>
                <th className="pb-2 font-semibold text-center">Status</th>
                <th className="pb-2 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { l: 'Mumbai Office', v: '92/100', t: 4567, c: 245, r: '₹12,45,300', s: 'Active' },
                { l: 'Bengaluru Office', v: '89/100', t: 3987, c: 198, r: '₹9,87,600', s: 'Active' },
                { l: 'Pune Office', v: '85/100', t: 2987, c: 156, r: '₹7,45,200', s: 'Active' },
                { l: 'Hyderabad Office', v: '81/100', t: 2345, c: 128, r: '₹6,12,400', s: 'Active' },
                { l: 'Chennai Office', v: '78/100', t: 1987, c: 104, r: '₹5,20,800', s: 'Inactive' },
              ].map((row, idx) => (
                <tr key={idx} className="text-gray-700 hover:bg-gray-50/50 transition">
                  <td className="py-2.5 font-medium">{row.l}</td>
                  <td className="py-2.5 text-center">{row.v}</td>
                  <td className="py-2.5 text-center">{row.t.toLocaleString()}</td>
                  <td className="py-2.5 text-center">{row.c}</td>
                  <td className="py-2.5 text-center font-bold text-gray-900">{row.r}</td>
                  <td className="py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${row.s === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{row.s}</span>
                  </td>
                  <td className="py-2.5 text-right flex justify-end gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-indigo-600"><Eye size={14} /></button>
                    <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600"><Settings size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderHeatmapTab = () => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[600px]">
          {/* Sidebar */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col gap-6 col-span-1">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Select Metric</label>
              <select className="w-full bg-white border border-gray-200 text-gray-700 text-xs rounded px-2 py-1.5 outline-none">
                <option>Visibility Score</option>
                <option>Traffic</option>
                <option>Conversions</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Select Layer</label>
              <select className="w-full bg-white border border-gray-200 text-gray-700 text-xs rounded px-2 py-1.5 outline-none">
                <option>Competitor Analysis</option>
                <option>Heatmap Density</option>
              </select>
            </div>
            
            <div className="mt-auto space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-600"><div className="w-3 h-3 bg-green-500 rounded-sm"></div> High (80-100)</div>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-600"><div className="w-3 h-3 bg-yellow-500 rounded-sm"></div> Medium (50-80)</div>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-600"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> Low (0-50)</div>
            </div>
          </div>
          
          {/* Main Map Area */}
          <div className="bg-green-50/30 rounded-xl border border-green-100/50 shadow-sm col-span-2 relative flex items-center justify-center overflow-hidden">
             {/* Map Placeholder */}
             <Map size={120} className="text-green-200 opacity-40" />
             <div className="absolute bottom-4 right-4 flex flex-col bg-white border border-gray-200 rounded shadow-sm">
                <button className="p-2 hover:bg-gray-50 border-b border-gray-200"><Plus size={16} className="text-gray-600" /></button>
                <button className="p-2 hover:bg-gray-50"><Minus size={16} className="text-gray-600" /></button>
             </div>
             {/* Heatmap Blobs Simulation */}
             <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-red-500 rounded-full blur-3xl opacity-40"></div>
             <div className="absolute bottom-1/3 right-1/3 w-40 h-40 bg-green-500 rounded-full blur-3xl opacity-40"></div>
             <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-yellow-500 rounded-full blur-2xl opacity-50"></div>
          </div>

          {/* Right Info Panel */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1 flex flex-col gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Top Performing Areas</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs border-b border-gray-50 pb-2">
                  <span className="text-gray-700">1. South Mumbai</span>
                  <span className="font-bold text-green-600">92/100</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-gray-50 pb-2">
                  <span className="text-gray-700">2. Koramangala, Bengaluru</span>
                  <span className="font-bold text-green-600">89/100</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-gray-50 pb-2">
                  <span className="text-gray-700">3. Hinjewadi, Pune</span>
                  <span className="font-bold text-green-600">85/100</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Low Performing Areas</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs border-b border-gray-50 pb-2">
                  <span className="text-gray-700">1. North Zone, Delhi</span>
                  <span className="font-bold text-red-600">32/100</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-gray-50 pb-2">
                  <span className="text-gray-700">2. Industrial Area, Kolkata</span>
                  <span className="font-bold text-red-600">35/100</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-gray-50 pb-2">
                  <span className="text-gray-700">3. Old City, Hyderabad</span>
                  <span className="font-bold text-red-600">38/100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReportsTab = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-1">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Report Types</h3>
          <div className="space-y-2">
            {[
              { n: 'Location Performance Report', d: 'Complete location analysis report', active: true },
              { n: 'Geo Performance Report', d: 'Country & state level performance', active: false },
              { n: 'Local Rankings Report', d: 'Location-wise ranking report', active: false },
              { n: 'Competitor Analysis Report', d: 'Local competitor insights', active: false },
              { n: 'Search Intent Report', d: 'Search intent by location', active: false },
              { n: 'Multi-Location Summary', d: 'All locations summary report', active: false },
            ].map((r, i) => (
              <div key={i} className={`p-3 rounded-lg border cursor-pointer transition flex items-start gap-3 ${r.active ? 'border-indigo-600 bg-indigo-50/50' : 'border-transparent hover:border-gray-200'}`}>
                <FileText size={16} className={r.active ? 'text-indigo-600' : 'text-gray-400'} />
                <div>
                  <h4 className={`text-xs font-semibold ${r.active ? 'text-indigo-900' : 'text-gray-700'}`}>{r.n}</h4>
                  <p className="text-[9px] text-gray-500 mt-0.5">{r.d}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition">
            Generate Custom Report
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm col-span-3">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Recent Reports</h3>
          <table className="w-full text-left text-[11px] whitespace-nowrap">
            <thead>
              <tr className="text-gray-500 border-b border-gray-100 text-[9px] uppercase tracking-wider">
                <th className="pb-3 font-semibold">Report Name</th>
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold text-center">Status</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { n: 'Location Performance Report', d: 'May 30, 2026', t: 'Performance', s: 'Completed' },
                { n: 'Geo Performance Report', d: 'May 29, 2026', t: 'Geo Performance', s: 'Completed' },
                { n: 'Local Rankings Report', d: 'May 28, 2026', t: 'Rankings', s: 'Completed' },
                { n: 'Competitor Analysis Report', d: 'May 27, 2026', t: 'Competitor', s: 'Completed' },
                { n: 'Search Intent Report', d: 'May 26, 2026', t: 'Search Intent', s: 'Completed' },
                { n: 'Multi-Location Summary', d: 'May 25, 2026', t: 'Summary', s: 'Completed' },
              ].map((row, i) => (
                <tr key={i} className="text-gray-700 hover:bg-gray-50/50 transition">
                  <td className="py-3 font-medium text-indigo-600">{row.n}</td>
                  <td className="py-3 text-gray-500">{row.d}</td>
                  <td className="py-3">{row.t}</td>
                  <td className="py-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-600">{row.s}</span>
                  </td>
                  <td className="py-3 text-right">
                    <button className="text-gray-400 hover:text-indigo-600 p-1"><Download size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSettingsTab = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-5">
          <h3 className="font-semibold text-gray-900 text-sm border-b border-gray-100 pb-2">Location Settings</h3>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">Enable Location Tracking</span>
            <div className="w-8 h-4 bg-green-500 rounded-full relative cursor-pointer">
              <div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">Auto Detect New Locations</span>
            <div className="w-8 h-4 bg-green-500 rounded-full relative cursor-pointer">
              <div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Update Location Data</label>
            <select className="w-full bg-white border border-gray-200 text-gray-700 text-xs rounded px-3 py-2 outline-none">
              <option>Daily</option>
              <option>Weekly</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Default Country</label>
            <select className="w-full bg-white border border-gray-200 text-gray-700 text-xs rounded px-3 py-2 outline-none">
              <option>India</option>
              <option>United States</option>
            </select>
          </div>

          <button className="w-full py-2 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700 transition">
            Save Settings
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-5">
          <h3 className="font-semibold text-gray-900 text-sm border-b border-gray-100 pb-2">Tracking & Notifications</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs text-gray-700">Notify for ranking changes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs text-gray-700">Notify for visibility drops</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs text-gray-700">Notify for new opportunities</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs text-gray-700">Weekly summary reports</span>
            </label>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email Notifications</label>
            <input type="text" defaultValue="rahul.patil@codigix.com" className="w-full bg-white border border-gray-200 text-gray-700 text-xs rounded px-3 py-2 outline-none" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm border-b border-gray-100 pb-2">Connected Integrations</h3>
          
          {[
            { n: 'Google Search Console', s: 'Connected' },
            { n: 'Google Analytics', s: 'Connected' },
            { n: 'Google Business Profile', s: 'Connected' },
            { n: 'Google Ads', s: 'Connect' },
            { n: 'Bing Webmaster Tools', s: 'Connect' },
          ].map((int, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                <Globe size={14} className="text-gray-400" /> {int.n}
              </div>
              {int.s === 'Connected' ? (
                <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">Connected</span>
              ) : (
                <button className="text-[9px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition">Connect</button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 border border-gray-200 rounded-lg">
            <MapPin className="text-gray-600" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Location Intelligence</h1>
            <p className="text-xs text-gray-500">Discover location-based opportunities and track performance across regions</p>
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
        <div className="flex items-center gap-6 overflow-x-auto">
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
        {activeTab === 'Overview' && renderOverviewTab()}
        {activeTab === 'Geo Performance' && renderOverviewTab() /* Design 1 looks identical to overview but named geo performance in collage, will alias for now */}
        {activeTab === 'Local Rankings' && renderLocalRankingsTab()}
        {activeTab === 'Local Competitors' && renderLocalCompetitorsTab()}
        {activeTab === 'Search Intent' && renderSearchIntentTab()}
        {activeTab === 'Multi-Location' && renderMultiLocationTab()}
        {activeTab === 'Heatmap' && renderHeatmapTab()}
        {activeTab === 'Reports' && renderReportsTab()}
        {activeTab === 'Settings' && renderSettingsTab()}
      </div>
    </div>
  );
};

export default SeoGmbLocationIntelligencePage;
