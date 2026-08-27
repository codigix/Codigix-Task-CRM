import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, RefreshCw, Eye, ArrowUpRight, Cpu, 
  MapPin, Link, Focus, BarChart2, AlertTriangle, Shield, CheckCircle,
  Clock, Download, ChevronRight, Activity, Search, Target, DollarSign,
  PieChart as PieChartIcon, Globe, ArrowLeft, Sparkles, Sliders, Hash,
  FileText, Info, Database, Check
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend, ComposedChart, ReferenceLine, PieChart, Pie, Cell
} from 'recharts';
import AdvancedDateRangePicker from '../common/AdvancedDateRangePicker';
import SeoGmbProjectSelector from './SeoGmbProjectSelector';
import { useAuth } from '../../hooks/useAuth';

const SeoGmbPredictiveAnalysisPage = () => {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState(null);
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [activeTab, setActiveTab] = useState('Overview');
  const [isGeneratingForecast, setIsGeneratingForecast] = useState(false);
  const [forecastType, setForecastType] = useState('Traffic Forecast');

  const tabs = [
    'Overview', 'Traffic Forecast', 'Keyword Forecast', 'AI Visibility Forecast', 
    'Conversions Forecast', 'Competitor Forecast', 'Opportunities', 'Risk Analysis', 'Reports'
  ];

  const trafficData = [
    { name: 'Mar 1', hist: 22000, pred: null, lower: null, upper: null },
    { name: 'Mar 15', hist: 24000, pred: null, lower: null, upper: null },
    { name: 'Mar 29', hist: 26000, pred: null, lower: null, upper: null },
    { name: 'Apr 12', hist: 29000, pred: null, lower: null, upper: null },
    { name: 'Apr 26', hist: 31000, pred: null, lower: null, upper: null },
    { name: 'May 10', hist: 35000, pred: null, lower: null, upper: null },
    { name: 'May 24', hist: 39000, pred: 39000, lower: 39000, upper: 39000 },
    { name: 'Jun 7', hist: null, pred: 42000, lower: 38000, upper: 45000 },
    { name: 'Jun 21', hist: null, pred: 46000, lower: 41000, upper: 51000 },
    { name: 'Jul 5', hist: null, pred: 51000, lower: 44000, upper: 57000 },
    { name: 'Jul 19', hist: null, pred: 56000, lower: 48000, upper: 64000 },
    { name: 'Aug 2', hist: null, pred: 62000, lower: 52000, upper: 72000 },
    { name: 'Aug 16', hist: null, pred: 68000, lower: 56000, upper: 80000 },
  ];

  const convData = [
    { name: 'Jun 7', pred: 850 },
    { name: 'Jun 21', pred: 920 },
    { name: 'Jul 5', pred: 1050 },
    { name: 'Jul 19', pred: 1180 },
    { name: 'Aug 2', pred: 1250 },
    { name: 'Aug 16', pred: 1400 },
  ];

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
              {change.toString().startsWith('-') ? '↓' : '↑'} {change.toString().replace('-', '')} <span className="text-gray-400 font-medium">{changeLabel}</span>
            </span>
          )}
        </div>
        {sparklineColor && (
          <div className="w-16 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trafficData.slice(0, 6)}>
                <Line type="monotone" dataKey="hist" stroke={sparklineColor} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );

  const renderOverviewTab = () => (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
        <KPICard title="Predicted Organic Traffic" value="48,756" change="18.6%" changeLabel="vs next 30 days" icon={TrendingUp} colorClass="text-blue-600" sparklineColor="#3B82F6" />
        <KPICard title="Predicted Ranking Keywords" value="3,842" change="12.4%" changeLabel="vs next 30 days" icon={Eye} colorClass="text-indigo-600" sparklineColor="#6366F1" />
        <KPICard title="AI Visibility Score" value={<span>79 <span className="text-sm font-medium text-gray-400">/100</span></span>} change="14.2%" changeLabel="vs next 30 days" icon={Cpu} colorClass="text-green-600" sparklineColor="#10B981" />
        <KPICard title="Predicted Conversions" value="1,245" change="21.7%" changeLabel="vs next 30 days" icon={Link} colorClass="text-orange-500" sparklineColor="#F97316" />
        <KPICard title="Revenue Forecast" value="₹12,48,300" change="23.8%" changeLabel="vs next 30 days" icon={DollarSign} colorClass="text-teal-600" sparklineColor="#14B8A6" />
        <KPICard title="Opportunity Score" value={<span>87 <span className="text-sm font-medium text-gray-400">/100</span></span>} changeLabel="High Opportunity" icon={Target} colorClass="text-purple-600" sparklineColor="#A855F7" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900">Traffic Forecast</h3>
            <select className="bg-white border border-gray-200 text-gray-700 text-[10px] px-2 py-1 rounded outline-none">
              <option>Next 90 Days ▾</option>
            </select>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(val) => `${val / 1000}k`} />
                <RechartsTooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                <ReferenceLine x="May 24" stroke="#9CA3AF" strokeDasharray="3 3" label={{ position: 'top', value: 'Today', fill: '#9CA3AF', fontSize: 10 }} />
                <Line type="monotone" dataKey="hist" name="Historical Traffic" stroke="#1E1B4B" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pred" name="Predicted Traffic" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: '#8B5CF6' }} />
                <Area type="monotone" dataKey="upper" fill="none" stroke="#C4B5FD" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="lower" fill="url(#colorPred)" stroke="#C4B5FD" strokeDasharray="3 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900">Top Opportunities</h3>
            <button className="text-indigo-600 text-[10px] font-semibold hover:underline">View All Opportunities &rarr;</button>
          </div>
          <table className="w-full text-left text-[10px] whitespace-nowrap">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                <th className="pb-2 font-semibold">Opportunity</th>
                <th className="pb-2 font-semibold text-center">Impact</th>
                <th className="pb-2 font-semibold text-center">Effort</th>
                <th className="pb-2 font-semibold text-center">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { o: 'Target Low Competition Keywords', i: 'High', e: 'Low', s: 95 },
                { o: 'Improve AI Answer Visibility', i: 'High', e: 'Medium', s: 92 },
                { o: 'Optimize Existing Content', i: 'Medium', e: 'Low', s: 88 },
                { o: 'Build Quality Backlinks', i: 'High', e: 'High', s: 82 },
                { o: 'Expand Content Clusters', i: 'Medium', e: 'Medium', s: 78 },
              ].map((row, i) => (
                <tr key={i} className="text-gray-700">
                  <td className="py-3 font-medium flex items-center gap-2"><Target size={12} className="text-indigo-500"/> {row.o}</td>
                  <td className="py-3 text-center"><span className={`px-2 py-0.5 rounded font-bold ${row.i === 'High' ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'}`}>{row.i}</span></td>
                  <td className="py-3 text-center"><span className={`px-2 py-0.5 rounded font-bold ${row.e === 'Low' ? 'text-green-600 bg-green-50' : row.e === 'Medium' ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'}`}>{row.e}</span></td>
                  <td className="py-3 text-center">
                    <div className="w-6 h-6 rounded-full border-2 border-green-500 flex items-center justify-center text-[9px] font-bold text-green-700 mx-auto">{row.s}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Shortened versions of the other forecasts for Overview */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
           <h3 className="font-semibold text-gray-900 mb-4 text-xs">Keyword Forecast</h3>
           <table className="w-full text-left text-[10px] whitespace-nowrap">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                  <th className="pb-2 font-semibold">Keyword</th>
                  <th className="pb-2 font-semibold text-center">Cur</th>
                  <th className="pb-2 font-semibold text-center">Pred</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 <tr><td className="py-2 text-indigo-600">cloud erp software</td><td className="py-2 text-center text-gray-500">8</td><td className="py-2 text-center text-green-600 font-bold">3</td></tr>
                 <tr><td className="py-2 text-indigo-600">manufacturing erp</td><td className="py-2 text-center text-gray-500">12</td><td className="py-2 text-center text-green-600 font-bold">6</td></tr>
                 <tr><td className="py-2 text-indigo-600">erp for sme</td><td className="py-2 text-center text-gray-500">15</td><td className="py-2 text-center text-green-600 font-bold">7</td></tr>
              </tbody>
           </table>
           <button className="text-indigo-600 text-[10px] font-semibold mt-3 hover:underline w-full text-center" onClick={() => setActiveTab('Keyword Forecast')}>View Full Forecast &rarr;</button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
           <h3 className="font-semibold text-gray-900 mb-4 text-xs">AI Visibility Forecast</h3>
           <table className="w-full text-left text-[10px] whitespace-nowrap">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                  <th className="pb-2 font-semibold">Platform</th>
                  <th className="pb-2 font-semibold text-center">Cur Score</th>
                  <th className="pb-2 font-semibold text-center">Pred Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 <tr><td className="py-2">ChatGPT</td><td className="py-2 text-center text-gray-500">68/100</td><td className="py-2 text-center text-green-600 font-bold">82/100</td></tr>
                 <tr><td className="py-2">Google AI Overview</td><td className="py-2 text-center text-gray-500">72/100</td><td className="py-2 text-center text-green-600 font-bold">86/100</td></tr>
                 <tr><td className="py-2">Gemini</td><td className="py-2 text-center text-gray-500">65/100</td><td className="py-2 text-center text-green-600 font-bold">78/100</td></tr>
              </tbody>
           </table>
           <button className="text-indigo-600 text-[10px] font-semibold mt-3 hover:underline w-full text-center" onClick={() => setActiveTab('AI Visibility Forecast')}>View Full AI Visibility &rarr;</button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
           <h3 className="font-semibold text-gray-900 mb-4 text-xs">Conversions Forecast</h3>
           <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={convData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#9CA3AF' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#9CA3AF' }} />
                    <Bar dataKey="pred" fill="#8B5CF6" radius={[2, 2, 0, 0]} barSize={15} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
           <button className="text-indigo-600 text-[10px] font-semibold mt-3 hover:underline w-full text-center" onClick={() => setActiveTab('Conversions Forecast')}>View Full Conversions &rarr;</button>
        </div>
      </div>
    </div>
  );

  const renderTrafficForecastTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900">Traffic Forecast</h3>
            <select className="bg-white border border-gray-200 text-gray-700 text-[10px] px-2 py-1 rounded outline-none">
              <option>Next 90 Days ▾</option>
            </select>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(val) => `${val / 1000}k`} />
                <RechartsTooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                <ReferenceLine x="May 24" stroke="#9CA3AF" strokeDasharray="3 3" label={{ position: 'top', value: 'Today', fill: '#9CA3AF', fontSize: 10 }} />
                <Line type="monotone" dataKey="hist" name="Historical Traffic" stroke="#1E1B4B" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pred" name="Predicted Traffic" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: '#8B5CF6' }} />
                <Area type="monotone" dataKey="upper" fill="none" stroke="#C4B5FD" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="lower" fill="url(#colorPred)" stroke="#C4B5FD" strokeDasharray="3 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <button className="mt-4 flex items-center gap-1 text-indigo-600 text-[10px] font-semibold hover:underline">
             <Download size={12} /> Download Forecast Report
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-6">Forecast Summary</h3>
          <div className="space-y-4">
             <div className="flex justify-between border-b border-gray-100 pb-2 text-[11px]">
                <span className="text-gray-500">Predicted Traffic (Next 90 Days)</span>
                <span className="font-bold text-gray-900">48,756</span>
             </div>
             <div className="flex justify-between border-b border-gray-100 pb-2 text-[11px]">
                <span className="text-gray-500">Upper Range</span>
                <span className="font-bold text-gray-900">64,240</span>
             </div>
             <div className="flex justify-between border-b border-gray-100 pb-2 text-[11px]">
                <span className="text-gray-500">Lower Range</span>
                <span className="font-bold text-gray-900">45,120</span>
             </div>
             <div className="flex justify-between border-b border-gray-100 pb-2 text-[11px]">
                <span className="text-gray-500">Avg. Daily Traffic</span>
                <span className="font-bold text-gray-900">1,625</span>
             </div>
             <div className="flex justify-between border-b border-gray-100 pb-2 text-[11px]">
                <span className="text-gray-500">Growth Rate</span>
                <span className="font-bold text-green-600">18.6%</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderKeywordForecastTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <KPICard title="Total Keywords Tracked" value="342" icon={Target} colorClass="text-purple-600" />
         <KPICard title="Improving Keywords" value="186" change="15" changeLabel="up" icon={TrendingUp} colorClass="text-green-600" />
         <KPICard title="Declining Keywords" value="42" change="-5" changeLabel="down" icon={TrendingDown} colorClass="text-red-500" />
         <KPICard title="New Opportunities" value="114" icon={Eye} colorClass="text-blue-600" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
         <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900">Keyword Forecast</h3>
            <select className="bg-white border border-gray-200 text-gray-700 text-[10px] px-2 py-1 rounded outline-none">
              <option>Next 90 Days ▾</option>
            </select>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
               <thead>
                 <tr className="text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                   <th className="pb-3 font-semibold">Keyword</th>
                   <th className="pb-3 font-semibold text-center">Current Rank</th>
                   <th className="pb-3 font-semibold text-center">Predicted Rank</th>
                   <th className="pb-3 font-semibold text-center">Change</th>
                   <th className="pb-3 font-semibold text-center">Probability</th>
                   <th className="pb-3 font-semibold text-center">Search Volume</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {[
                     { k: 'cloud erp software', c: 8, p: 3, ch: '+ 5', pr: '85%', s: 1400 },
                     { k: 'manufacturing erp', c: 12, p: 6, ch: '+ 6', pr: '78%', s: 1200 },
                     { k: 'erp for sme', c: 15, p: 7, ch: '+ 8', pr: '72%', s: 980 },
                     { k: 'inventory management software', c: 9, p: 4, ch: '+ 5', pr: '81%', s: 880 },
                     { k: 'production management system', c: 18, p: 9, ch: '+ 9', pr: '68%', s: 720 },
                     { k: 'supply chain management', c: 11, p: 6, ch: '+ 5', pr: '74%', s: 650 },
                     { k: 'business automation software', c: 23, p: 12, ch: '+ 11', pr: '62%', s: 480 },
                     { k: 'quality management system', c: 20, p: 11, ch: '+ 9', pr: '69%', s: 420 },
                  ].map((row, i) => (
                     <tr key={i} className="text-gray-700">
                        <td className="py-3 font-medium text-indigo-600">{row.k}</td>
                        <td className="py-3 text-center text-gray-500">{row.c}</td>
                        <td className="py-3 text-center font-bold text-gray-900">{row.p}</td>
                        <td className="py-3 text-center font-bold text-green-600">↑ {row.ch.replace('+ ', '')}</td>
                        <td className="py-3 text-center text-green-600">{row.pr}</td>
                        <td className="py-3 text-center">{row.s.toLocaleString()}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         <button className="mt-4 flex items-center gap-1 text-indigo-600 text-[10px] font-semibold hover:underline">
             <Download size={12} /> Download Keyword Report
         </button>
      </div>
    </div>
  );

  const renderAIVisibilityTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <KPICard title="Average AI Visibility Score" value={<span>79 <span className="text-sm font-medium text-gray-400">/100</span></span>} icon={Cpu} colorClass="text-purple-600" />
         <KPICard title="Improved Platforms" value={<span>5 <span className="text-sm font-medium text-gray-400">/6</span></span>} icon={TrendingUp} colorClass="text-green-600" />
         <KPICard title="Total Citations (Predicted)" value="12,850" icon={Link} colorClass="text-blue-600" />
         <KPICard title="Growth (Next 30 Days)" value="14.2%" icon={Activity} colorClass="text-indigo-600" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
         <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900">AI Visibility Forecast</h3>
            <select className="bg-white border border-gray-200 text-gray-700 text-[10px] px-2 py-1 rounded outline-none">
              <option>Next 90 Days ▾</option>
            </select>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
               <thead>
                 <tr className="text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                   <th className="pb-3 font-semibold">AI Platform</th>
                   <th className="pb-3 font-semibold text-center">Current Score</th>
                   <th className="pb-3 font-semibold text-center">Predicted Score</th>
                   <th className="pb-3 font-semibold text-center">Change</th>
                   <th className="pb-3 font-semibold text-center">Predicted Mentions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {[
                     { p: 'ChatGPT', c: '68/100', pr: '82/100', ch: '+ 14', m: 3450 },
                     { p: 'Google AI Overview', c: '72/100', pr: '86/100', ch: '+ 14', m: 3880 },
                     { p: 'Gemini', c: '65/100', pr: '78/100', ch: '+ 13', m: 2750 },
                     { p: 'Perplexity', c: '60/100', pr: '74/100', ch: '+ 14', m: 1820 },
                     { p: 'Claude', c: '58/100', pr: '72/100', ch: '+ 14', m: 1650 },
                     { p: 'Microsoft Copilot', c: '55/100', pr: '70/100', ch: '+ 15', m: 800 },
                  ].map((row, i) => (
                     <tr key={i} className="text-gray-700">
                        <td className="py-3 font-medium flex items-center gap-2"><Cpu size={14} className="text-indigo-500" /> {row.p}</td>
                        <td className="py-3 text-center text-gray-500">{row.c}</td>
                        <td className="py-3 text-center font-bold text-gray-900">{row.pr}</td>
                        <td className="py-3 text-center font-bold text-green-600">↑ {row.ch.replace('+ ', '')}</td>
                        <td className="py-3 text-center">{row.m.toLocaleString()}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         <button className="mt-4 flex items-center gap-1 text-indigo-600 text-[10px] font-semibold hover:underline">
             <Download size={12} /> Download AI Visibility Report
         </button>
      </div>
    </div>
  );

  const renderConversionsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <KPICard title="Predicted Conversions (Next 90 Days)" value="1,245" change="21.7%" changeLabel="vs prev" icon={Link} colorClass="text-purple-600" />
         <KPICard title="Conversion Rate (Predicted)" value="2.85%" change="13.5%" changeLabel="vs prev" icon={TrendingUp} colorClass="text-green-600" />
         <KPICard title="Avg. Order Value (Predicted)" value="₹6,240" change="4.2%" changeLabel="vs prev" icon={DollarSign} colorClass="text-blue-600" />
         <KPICard title="Revenue (Predicted)" value="₹12,48,300" change="23.8%" changeLabel="vs prev" icon={Activity} colorClass="text-teal-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900">Conversions Forecast</h3>
            <select className="bg-white border border-gray-200 text-gray-700 text-[10px] px-2 py-1 rounded outline-none">
              <option>Next 90 Days ▾</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={convData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <RechartsTooltip />
                  <Bar dataKey="pred" name="Predicted Conversions" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={25} />
               </BarChart>
            </ResponsiveContainer>
          </div>
          <button className="mt-4 flex items-center gap-1 text-indigo-600 text-[10px] font-semibold hover:underline">
             <Download size={12} /> Download Conversions Report
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-6">Forecast Breakdown</h3>
          <div className="space-y-4">
             <div className="flex justify-between border-b border-gray-100 pb-2 text-[11px]">
                <span className="text-gray-500">Conversions (Next 90 Days)</span>
                <span className="font-bold text-gray-900">1,245</span>
             </div>
             <div className="flex justify-between border-b border-gray-100 pb-2 text-[11px]">
                <span className="text-gray-500">Upper Range</span>
                <span className="font-bold text-gray-900">1,450</span>
             </div>
             <div className="flex justify-between border-b border-gray-100 pb-2 text-[11px]">
                <span className="text-gray-500">Lower Range</span>
                <span className="font-bold text-gray-900">980</span>
             </div>
             <div className="flex justify-between border-b border-gray-100 pb-2 text-[11px]">
                <span className="text-gray-500">Avg. Daily Conversions</span>
                <span className="font-bold text-gray-900">14.2</span>
             </div>
             <div className="flex justify-between border-b border-gray-100 pb-2 text-[11px]">
                <span className="text-gray-500">Conversion Rate</span>
                <span className="font-bold text-green-600">2.85%</span>
             </div>
             <div className="flex justify-between border-b border-gray-100 pb-2 text-[11px] pt-4">
                <span className="font-semibold text-gray-900">Revenue (Predicted)</span>
                <span className="font-bold text-indigo-600">₹12,48,300</span>
             </div>
             <div className="flex justify-between border-b border-gray-100 pb-2 text-[11px]">
                <span className="text-gray-500">Revenue Range</span>
                <span className="font-bold text-gray-500">₹10,50,000 - ₹14,80,000</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCompetitorTab = () => {
    const marketShareData = [
       { name: 'Your Website', value: 34.2, color: '#3B82F6' },
       { name: 'Competitor A', value: 28.5, color: '#10B981' },
       { name: 'Competitor B', value: 21.1, color: '#F59E0B' },
       { name: 'Competitor C', value: 12.6, color: '#EF4444' },
       { name: 'Competitor D', value: 3.6, color: '#8B5CF6' }
    ];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <KPICard title="Total Competitors" value="5" icon={Target} colorClass="text-purple-600" />
           <KPICard title="Market Share (Predicted)" value="34.2%" icon={PieChartIcon} colorClass="text-blue-600" />
           <KPICard title="Your Growth (Next 30 Days)" value="18.6%" icon={TrendingUp} colorClass="text-green-600" />
           <KPICard title="Top Competitor Growth" value="14.4%" icon={Activity} colorClass="text-indigo-600" />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-gray-900">Competitor Forecast</h3>
              <select className="bg-white border border-gray-200 text-gray-700 text-[10px] px-2 py-1 rounded outline-none">
                <option>Next 90 Days ▾</option>
              </select>
           </div>
           <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 overflow-x-auto">
                 <table className="w-full text-left text-[11px] whitespace-nowrap">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Competitor</th>
                        <th className="pb-3 font-semibold text-center">Current Traffic</th>
                        <th className="pb-3 font-semibold text-center">Predicted Traffic (90 Days)</th>
                        <th className="pb-3 font-semibold text-center">Change</th>
                        <th className="pb-3 font-semibold text-center">Market Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {[
                          { c: 'Your Website', ct: 39000, pt: 48756, ch: '+ 18.6%', m: '34.2%' },
                          { c: 'Competitor A', ct: 35000, pt: 40612, ch: '+ 14.4%', m: '28.5%' },
                          { c: 'Competitor B', ct: 28000, pt: 30105, ch: '+ 8.2%', m: '21.1%' },
                          { c: 'Competitor C', ct: 16000, pt: 17905, ch: '+ 11.1%', m: '12.6%' },
                          { c: 'Competitor D', ct: 12000, pt: 12824, ch: '+ 3.6%', m: '3.6%' },
                       ].map((row, i) => (
                          <tr key={i} className={`text-gray-700 ${row.c === 'Your Website' ? 'bg-indigo-50/30' : ''}`}>
                             <td className={`py-3 font-medium flex items-center gap-2 ${row.c === 'Your Website' ? 'text-indigo-600' : ''}`}><Globe size={14} className={row.c === 'Your Website' ? 'text-indigo-600' : 'text-gray-400'} /> {row.c}</td>
                             <td className="py-3 text-center text-gray-500">{row.ct.toLocaleString()}</td>
                             <td className="py-3 text-center font-bold text-gray-900">{row.pt.toLocaleString()}</td>
                             <td className="py-3 text-center font-bold text-green-600">↑ {row.ch.replace('+ ', '')}</td>
                             <td className="py-3 text-center font-bold text-gray-900">{row.m}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
                 <button className="mt-4 flex items-center gap-1 text-indigo-600 text-[10px] font-semibold hover:underline">
                     <Download size={12} /> Download Competitor Report
                 </button>
              </div>
              
              <div className="w-full lg:w-[250px] flex flex-col items-center border-l border-gray-100 pl-8">
                 <h4 className="text-xs font-semibold text-gray-700 mb-4 w-full text-center">Predicted Market Share</h4>
                 <div className="relative w-[180px] h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={marketShareData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                          {marketShareData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="w-full mt-4 space-y-2">
                    {marketShareData.map((d, i) => (
                       <div key={i} className="flex justify-between items-center text-[10px]">
                          <div className="flex items-center gap-1.5 text-gray-600">
                             <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }}></div>
                             {d.name}
                          </div>
                          <span className="font-bold text-gray-900">{d.value}%</span>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderRiskAnalysisTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <KPICard title="High Risk Areas" value="2" icon={AlertTriangle} colorClass="text-red-600" />
         <KPICard title="Medium Risk Areas" value="3" icon={AlertTriangle} colorClass="text-yellow-600" />
         <KPICard title="Low Risk Areas" value="2" icon={CheckCircle} colorClass="text-green-600" />
         <KPICard title="Overall Risk Score" value={<span>62 <span className="text-sm font-medium text-gray-400">/100</span> <span className="text-[10px] font-semibold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded ml-1">Medium</span></span>} icon={Shield} colorClass="text-orange-500" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
         <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900">Risk Analysis</h3>
            <select className="bg-white border border-gray-200 text-gray-700 text-[10px] px-2 py-1 rounded outline-none">
              <option>Next 90 Days ▾</option>
            </select>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
               <thead>
                 <tr className="text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                   <th className="pb-3 font-semibold">Risk Factor</th>
                   <th className="pb-3 font-semibold text-center">Impact</th>
                   <th className="pb-3 font-semibold text-center">Probability</th>
                   <th className="pb-3 font-semibold text-center">Risk Score</th>
                   <th className="pb-3 font-semibold">Recommendation</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {[
                     { r: 'Algorithm Update', i: 'High', p: 'Medium', s: 75, rc: 'Monitor updates & optimize content' },
                     { r: 'Top Competitor Ranking', i: 'High', p: 'High', s: 82, rc: 'Improve content & build backlinks' },
                     { r: 'Content Decay', i: 'Medium', p: 'High', s: 68, rc: 'Update old, refresh old content' },
                     { r: 'Backlink Loss', i: 'Medium', p: 'Medium', s: 55, rc: 'Rebuild lost backlinks' },
                     { r: 'Low Search Demand', i: 'Low', p: 'Low', s: 24, rc: 'Target long-tail keywords' },
                     { r: 'Technical Issues', i: 'Low', p: 'Low', s: 18, rc: 'Fix minor crawl/index errors' },
                     { r: 'Seasonality Impact', i: 'Low', p: 'Medium', s: 35, rc: 'Plan seasonal content strategy' },
                  ].map((row, i) => (
                     <tr key={i} className="text-gray-700">
                        <td className="py-3 font-medium flex items-center gap-2">
                           {row.s > 70 ? <AlertTriangle size={14} className="text-red-500" /> : row.s > 40 ? <AlertTriangle size={14} className="text-yellow-500" /> : <CheckCircle size={14} className="text-green-500" />}
                           {row.r}
                        </td>
                        <td className="py-3 text-center"><span className={`px-2 py-0.5 rounded font-bold ${row.i === 'High' ? 'text-red-600 bg-red-50' : row.i === 'Medium' ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50'}`}>{row.i}</span></td>
                        <td className="py-3 text-center"><span className={`px-2 py-0.5 rounded font-bold ${row.p === 'High' ? 'text-red-600 bg-red-50' : row.p === 'Medium' ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50'}`}>{row.p}</span></td>
                        <td className="py-3 text-center font-bold text-gray-900">{row.s}/100</td>
                        <td className="py-3 text-gray-600">{row.rc}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         <button className="mt-4 flex items-center gap-1 text-indigo-600 text-[10px] font-semibold hover:underline">
             <Download size={12} /> Download Risk Report
         </button>
      </div>
    </div>
  );

  const renderGenerateForecastForm = () => (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Forecast Type */}
        <div className="lg:col-span-3 space-y-4">
          <h3 className="font-bold text-gray-900 text-sm">1. Forecast Type</h3>
          <p className="text-xs text-gray-500 mb-4">Select what you want to forecast</p>
          <div className="space-y-3">
            {[
              { id: 'Traffic Forecast', label: 'Traffic Forecast', desc: 'Predict website traffic for the future', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { id: 'Keyword Forecast', label: 'Keyword Forecast', desc: 'Predict keyword rankings and performance', icon: Search, color: 'text-blue-600', bg: 'bg-blue-50' },
              { id: 'AI Visibility Forecast', label: 'AI Visibility Forecast', desc: 'Predict visibility in AI search engines', icon: Cpu, color: 'text-green-600', bg: 'bg-green-50' },
              { id: 'Conversions Forecast', label: 'Conversions Forecast', desc: 'Predict conversions and leads', icon: Link, color: 'text-orange-500', bg: 'bg-orange-50' },
              { id: 'Revenue Forecast', label: 'Revenue Forecast', desc: 'Predict revenue and business growth', icon: FileText, color: 'text-teal-600', bg: 'bg-teal-50' },
              { id: 'Opportunity Forecast', label: 'Opportunity Forecast', desc: 'Predict potential opportunities', icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map(type => (
              <div
                key={type.id}
                onClick={() => setForecastType(type.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${forecastType === type.id ? 'border-indigo-600 bg-indigo-50/20' : 'border-gray-100 bg-white hover:border-gray-200'}`}
              >
                <div className={`p-2 rounded-lg ${type.bg}`}><type.icon size={16} className={type.color} /></div>
                <div className="flex-1">
                  <h4 className={`text-xs font-bold ${forecastType === type.id ? 'text-indigo-900' : 'text-gray-900'}`}>{type.label}</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">{type.desc}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${forecastType === type.id ? 'border-indigo-600' : 'border-gray-300'}`}>
                  {forecastType === type.id && <div className="w-2 h-2 rounded-full bg-indigo-600"></div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Column: Configuration */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm">2. Forecast Configuration</h3>
            <p className="text-xs text-gray-500 mb-6">Set the parameters for your forecast</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Project / Domain <span className="text-red-500">*</span></label>
                <select className="w-full text-xs border border-gray-200 rounded px-3 py-2 outline-none">
                  <option>codigixinfotech.com</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Search Engine</label>
                  <select className="w-full text-xs border border-gray-200 rounded px-3 py-2 outline-none">
                    <option>Google</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Forecast Period <span className="text-red-500">*</span></label>
                  <select className="w-full text-xs border border-gray-200 rounded px-3 py-2 outline-none">
                    <option>90 Days</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                <div className="w-full text-xs border border-gray-200 rounded px-3 py-2 flex items-center gap-2">
                  <Clock size={14} className="text-gray-400"/> May 24, 2026
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
                <div className="w-full text-xs border border-gray-200 rounded px-3 py-2 flex items-center gap-2">
                  <Clock size={14} className="text-gray-400"/> Aug 21, 2026
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Granularity</label>
                <select className="w-full text-xs border border-gray-200 rounded px-3 py-2 outline-none">
                  <option>Weekly</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Location</label>
              <select className="w-full text-xs border border-gray-200 rounded px-3 py-2 outline-none">
                <option>India (All)</option>
              </select>
              <p className="text-[10px] text-gray-500 mt-1">Select the location for which you want to generate forecast</p>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-700 mb-3">Include in Forecast</label>
              <div className="flex flex-wrap items-center gap-4">
                {['Organic Traffic', 'Branded Traffic', 'Non-Branded Traffic', 'Keywords', 'Conversions'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg">
                    <input type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs font-medium text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-3">Historical Data Source <Info size={12} className="text-gray-400"/></label>
              <div className="grid grid-cols-2 gap-4">
                <label className="border border-indigo-600 bg-indigo-50/30 p-3 rounded-lg flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="dataSource" defaultChecked className="mt-1" />
                  <div>
                    <div className="text-xs font-bold text-gray-900">Use data from Codigix CRM</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Use historical data from your CRM database</div>
                  </div>
                </label>
                <label className="border border-gray-200 p-3 rounded-lg flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition">
                  <input type="radio" name="dataSource" className="mt-1" />
                  <div>
                    <div className="text-xs font-bold text-gray-900">Connect External Source</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Connect Google Analytics / Search Console</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm">3. Advanced Settings <span className="text-gray-400 font-normal">(Optional)</span></h3>
            <p className="text-xs text-gray-500 mb-6">Fine-tune your forecast with advanced options</p>

            <div className="grid grid-cols-4 gap-6 items-center">
              <div className="col-span-1">
                <label className="block text-[10px] font-semibold text-gray-700 mb-1">Seasonality</label>
                <select className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none">
                  <option>Auto Detect</option>
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-semibold text-gray-700 mb-1">Growth Trend</label>
                <select className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none">
                  <option>Auto Detect</option>
                </select>
              </div>
              <div className="col-span-1">
                <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-700 mb-2">Model Sensitivity <Info size={10} className="text-gray-400"/></label>
                <input type="range" className="w-full accent-indigo-600" />
                <div className="flex justify-between text-[9px] text-gray-500 mt-1"><span>Low</span><span>Medium</span><span>High</span></div>
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-semibold text-gray-700 mb-2">Exclude Outliers</label>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-4 bg-indigo-600 rounded-full relative cursor-pointer">
                    <div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                  </div>
                  <span className="text-[9px] text-gray-500">Remove abnormal data points</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm">4. Forecast Name & Description</h3>
            <p className="text-xs text-gray-500 mb-6">Give a name to your forecast (Optional)</p>
            
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-3">
                <label className="block text-[10px] font-semibold text-gray-700 mb-1">Forecast Name</label>
                <input type="text" defaultValue="Q3 Traffic Forecast 2026" className="w-full text-xs border border-gray-200 rounded px-3 py-2 outline-none" />
              </div>
              <div className="col-span-6">
                <label className="block text-[10px] font-semibold text-gray-700 mb-1">Description</label>
                <input type="text" defaultValue="Traffic forecast for Q3 2026 based on current trends and historical data" className="w-full text-xs border border-gray-200 rounded px-3 py-2 outline-none" />
              </div>
              <div className="col-span-3">
                <label className="block text-[10px] font-semibold text-gray-700 mb-1">Tags (Optional)</label>
                <input type="text" placeholder="Add tags (e.g., traffic, q3, 2026)" className="w-full text-xs border border-gray-200 rounded px-3 py-2 outline-none bg-gray-50" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 pt-6 mt-6">
            <div className="flex items-start gap-2">
              <div className="p-1 rounded bg-indigo-50"><Clock size={14} className="text-indigo-600" /></div>
              <div>
                <div className="text-[11px] font-bold text-indigo-900">AI Processing Time</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Forecast generation typically takes <span className="font-bold text-gray-700">2-5 minutes</span> depending on data volume and complexity.</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsGeneratingForecast(false)} className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={() => setIsGeneratingForecast(false)} className="px-6 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition shadow-sm flex items-center gap-2">
                <Sparkles size={14} /> Generate Forecast
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Info */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-indigo-600" />
              <h3 className="font-bold text-indigo-900 text-xs">Forecast Details</h3>
            </div>
            <p className="text-[10px] text-indigo-900/70 mb-6">AI model will analyze your historical data and market trends to generate accurate predictions.</p>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded bg-white shadow-sm"><Hash size={12} className="text-indigo-500" /></div>
                <div>
                  <div className="text-[10px] font-medium text-gray-500">Model</div>
                  <div className="text-[11px] font-bold text-indigo-900">Machine Learning (Prophet + XGBoost)</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded bg-white shadow-sm"><Target size={12} className="text-indigo-500" /></div>
                <div>
                  <div className="text-[10px] font-medium text-gray-500">Confidence Level</div>
                  <div className="text-[11px] font-bold text-indigo-900">90%</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded bg-white shadow-sm"><Clock size={12} className="text-indigo-500" /></div>
                <div>
                  <div className="text-[10px] font-medium text-gray-500">Last Updated</div>
                  <div className="text-[11px] font-bold text-indigo-900">May 23, 2026 10:30 AM</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded bg-white shadow-sm"><Database size={12} className="text-indigo-500" /></div>
                <div>
                  <div className="text-[10px] font-medium text-gray-500">Data Points</div>
                  <div className="text-[11px] font-bold text-indigo-900">1,248 (Last 12 Months)</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-indigo-100 p-4">
              <h4 className="font-bold text-indigo-900 text-xs mb-3">What you'll get?</h4>
              <div className="space-y-2">
                {['Prediction charts and trends', 'Confidence intervals', 'Growth opportunities', 'Risk analysis', 'Actionable recommendations'].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] font-medium text-gray-700">
                    <Check size={12} className="text-green-500 shrink-0 mt-0.5" /> {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans flex flex-col">
      {/* Header */}
      {isGeneratingForecast ? (
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsGeneratingForecast(false)} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Generate New Forecast</h1>
              <p className="text-xs text-gray-500">Configure your settings and generate AI-powered predictions</p>
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
            <button onClick={() => setIsGeneratingForecast(false)} className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
            <button onClick={() => setIsGeneratingForecast(false)} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition shadow-sm flex items-center gap-2">
              <Sparkles size={14} /> Generate Forecast
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-2 border border-gray-200 rounded-lg bg-indigo-600">
              <TrendingUp className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Predictive Analysis</h1>
              <p className="text-xs text-gray-500">AI-powered predictions and insights for future performance</p>
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
            <button onClick={() => setIsGeneratingForecast(true)} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition shadow-sm">
              Generate New Forecast
            </button>
          </div>
        </div>
      )}

      {/* Tabs - Only show if not generating forecast */}
      {!isGeneratingForecast && (
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
      )}

      {/* Main Content Area */}
      <div className="p-4 mx-auto w-full max-w-[1900px] flex-1 overflow-y-auto">
        {isGeneratingForecast ? (
          renderGenerateForecastForm()
        ) : (
          <>
            {activeTab === 'Overview' && renderOverviewTab()}
            {activeTab === 'Traffic Forecast' && renderTrafficForecastTab()}
            {activeTab === 'Keyword Forecast' && renderKeywordForecastTab()}
            {activeTab === 'AI Visibility Forecast' && renderAIVisibilityTab()}
            {activeTab === 'Conversions Forecast' && renderConversionsTab()}
            {activeTab === 'Competitor Forecast' && renderCompetitorTab()}
            {activeTab === 'Opportunities' && renderOverviewTab()}
            {activeTab === 'Risk Analysis' && renderRiskAnalysisTab()}
            {activeTab === 'Reports' && renderOverviewTab()}
          </>
        )}
      </div>
    </div>
  );
};

export default SeoGmbPredictiveAnalysisPage;
