import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Users, Target, TrendingUp, DollarSign, Percent,
  Mail, MousePointer, Eye, FileText, Download,
  MoreHorizontal, Calendar, CheckSquare, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import apiService from '../../services/api';
import AdvancedDateRangePicker from '../common/AdvancedDateRangePicker';

const MarketingDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [checkedTasks, setCheckedTasks] = useState({ 3: true });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const res = await apiService.get('/dashboard/marketing/full');
        setData(res);
      } catch (error) {
        console.error('Error fetching marketing dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [dateRange]);

  if (loading || !data) {
    return <div className="p-8 text-center bg-gray-50 min-h-screen">Loading Marketing Dashboard...</div>;
  }

  const {
    LEAD_GROWTH_DATA, LEADS_BY_SOURCE, PERFORMANCE_TREND, TOP_CAMPAIGNS,
    RECENT_LEADS, FUNNEL_DATA, ENGAGEMENT, ACTIVITIES_DATA, TASKS_DATA, CHANNEL_PERF
  } = data;

  const toggleTask = i => setCheckedTasks(prev => ({ ...prev, [i]: !prev[i] }));

  const KPICard = ({ title, value, change, icon: Icon, iconBg, iconColor }) => (
    <div className="bg-white rounded border border-gray-100 p-5 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
        <div>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{title}</p>
          <p className="text-2xl  text-gray-900 mt-1">{value}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-auto">
        <span className={`text-xs font-semibold ${parseFloat(change) >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center`}>
          {parseFloat(change) >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingUp size={12} className="mr-1 rotate-180" />}
          {change}
        </span>
        <span className="text-xs text-gray-400">vs last 7 days</span>
      </div>
    </div>
  );

  const SectionHeader = ({ title, rightElement }) => (
    <div className="flex items-center justify-between mb-4">
      <h3 className=" text-gray-900 text-[15px]">{title}</h3>
      {rightElement}
    </div>
  );

  const PIE_COLORS = ['#4F46E5', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-6 font-sans">

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl  text-gray-900">Marketing Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Here's what's happening with your marketing activities.</p>
        </div>
        <div className="flex items-center gap-3">
          <AdvancedDateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={(s, e) => setDateRange({ startDate: s, endDate: e })}
          />
          <button className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <MoreHorizontal size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <KPICard title="Total Leads" value="1,248" change="18.6%" icon={Users} iconBg="bg-indigo-50" iconColor="text-indigo-600" />
        <KPICard title="Qualified Leads" value="842" change="12.4%" icon={Target} iconBg="bg-amber-50" iconColor="text-amber-500" />
        <KPICard title="Conversions" value="126" change="14.7%" icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-500" />
        <KPICard title="Revenue Influenced" value="$48,920" change="22.8%" icon={DollarSign} iconBg="bg-blue-50" iconColor="text-blue-500" />
        <KPICard title="ROI" value="312%" change="9.3%" icon={Percent} iconBg="bg-pink-50" iconColor="text-pink-500" />
      </div>

      {/* Row 1: Charts & Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Lead Growth */}
        <div className="bg-white p-5 rounded border border-gray-100 shadow-sm">
          <SectionHeader title="Lead Growth Overview" rightElement={<select className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full outline-none"><option>This Week</option></select>} />
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={LEAD_GROWTH_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <RechartsTooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Line type="monotone" name="Total Leads" dataKey="total" stroke="#4F46E5" strokeWidth={2} dot={false} />
                <Line type="monotone" name="Qualified Leads" dataKey="qualified" stroke="#10B981" strokeWidth={2} dot={false} />
                <Line type="monotone" name="Converted Leads" dataKey="converted" stroke="#F59E0B" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leads by Source */}
        <div className="bg-white p-5 rounded border border-gray-100 shadow-sm flex flex-col">
          <SectionHeader title="Leads by Source" />
          <div className="flex-1 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={LEADS_BY_SOURCE} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                  {LEADS_BY_SOURCE.map((e, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl  text-gray-900">1,248</span>
              <span className="text-xs text-gray-500">Total</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {LEADS_BY_SOURCE.slice(0, 2).map((src, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></div>
                  <span className="text-gray-700">{src.name}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-gray-400">{src.pct}%</span>
                  <span className="font-semibold text-gray-900">({src.value})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Campaigns */}
        <div className="bg-white p-5 rounded border border-gray-100 shadow-sm">
          <SectionHeader title="Top Campaigns" rightElement={<button className="text-indigo-600 text-sm font-semibold hover:underline">View All &gt;</button>} />
          <div className="space-y-4 mt-2">
            {TOP_CAMPAIGNS.slice(0, 4).map((c, i) => (
              <div key={i} className="flex justify-between items-center pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm  text-gray-900">{c.leads}</p>
                  <p className="text-xs text-green-500">{c.convRate}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Complex Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">

        {/* Recent Leads */}
        <div className="bg-white p-5 rounded border border-gray-100 shadow-sm flex flex-col justify-between">
          <SectionHeader title="Recent Leads" rightElement={<button className="text-indigo-600 text-sm font-semibold hover:underline">View All &gt;</button>} />
          <div className="space-y-4 mb-6">
            {RECENT_LEADS.slice(0, 2).map((l, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center  text-sm" style={{ backgroundColor: l.avatarBg || '#EDE9FE', color: l.badgeColor || '#4F46E5' }}>
                    {l.avatar}
                  </div>
                  <div>
                    <p className="text-sm  text-gray-900">{l.name}</p>
                    <p className="text-xs text-gray-500">{l.role}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px]  px-2 py-0.5 rounded-full" style={{ backgroundColor: `${l.badgeColor}20`, color: l.badgeColor }}>{l.badge}</span>
                  <span className="text-[10px] text-gray-400">{l.time}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Conversion Rate</p>
              <p className="text-lg  text-gray-900">10.1%</p>
              <p className="text-[10px] text-green-500 mt-1 flex items-center"><TrendingUp size={10} className="mr-1" /> 1.6% vs last 7 days</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Avg. Deal Size</p>
              <p className="text-lg  text-gray-900">$3,890</p>
              <p className="text-[10px] text-green-500 mt-1 flex items-center"><TrendingUp size={10} className="mr-1" /> 8.4% vs last 7 days</p>
            </div>
          </div>
        </div>

        {/* Lead Status Distribution */}
        <div className="bg-white p-5 rounded border border-gray-100 shadow-sm">
          <SectionHeader title="Lead Status Distribution" />
          <div className="space-y-4 mt-4">
            {FUNNEL_DATA.map((f, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">{f.label}</span>
                  <span className=" text-gray-900">{f.value}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${f.width}%`, backgroundColor: f.color }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Engagement Overview */}
        <div className="bg-white p-5 rounded border border-gray-100 shadow-sm">
          <SectionHeader title="Engagement Overview" rightElement={<select className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full outline-none"><option>This Week</option></select>} />
          <div className="space-y-4">
            {ENGAGEMENT.map((e, i) => {
              const icons = [Mail, MousePointer, Eye, FileText, Download];
              const EIcon = icons[i % icons.length];
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${e.color}15` }}>
                      <EIcon size={14} color={e.color} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{e.label}</p>
                      <p className="text-sm  text-gray-900">{e.value}</p>
                    </div>
                  </div>
                  <span className="text-xs text-green-500 font-semibold flex items-center"><ArrowUpRight size={12} className="mr-1" /> +0%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activities & Tasks */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-5 rounded border border-gray-100 shadow-sm flex-1">
            <SectionHeader title="Activities" rightElement={<button className="text-indigo-600 text-xs font-semibold hover:underline">View Calendar &gt;</button>} />
            <div className="space-y-4 mt-2">
              {ACTIVITIES_DATA.slice(0, 2).map((a, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Users size={12} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 leading-tight">{a.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{a.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-5 rounded border border-gray-100 shadow-sm flex-1">
            <SectionHeader title="Tasks" rightElement={<button className="text-indigo-600 text-xs font-semibold hover:underline">View All &gt;</button>} />
            <div className="space-y-3 mt-1">
              {TASKS_DATA.map((t, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer" onClick={() => toggleTask(i)}>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${checkedTasks[i] ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 group-hover:border-indigo-400'}`}>
                      {checkedTasks[i] && <CheckSquare size={12} className="text-white" />}
                    </div>
                    <span className={`text-sm ${checkedTasks[i] ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{t.label}</span>
                  </div>
                  <span className="text-[10px]  px-2 py-0.5 rounded-full" style={{ backgroundColor: `${t.priorityColor}20`, color: t.priorityColor }}>{t.priority}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Row 3: Marketing Performance Trend & Channel Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Trend Bar Chart */}
        <div className="bg-white p-5 rounded border border-gray-100 shadow-sm col-span-2">
          <SectionHeader title="Marketing Performance Trend" rightElement={<select className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full outline-none"><option>Monthly</option></select>} />
          <div className="h-[250px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PERFORMANCE_TREND}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={v => `$${v / 1000}K`} />
                <RechartsTooltip cursor={{ fill: '#f9fafb' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="leads" name="Leads" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar yAxisId="left" dataKey="conversions" name="Conversions" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel & Campaign */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-5 rounded border border-gray-100 shadow-sm flex-1">
            <SectionHeader title="Channel Performance" rightElement={<select className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full outline-none"><option>This Month</option></select>} />
            <div className="space-y-4 mt-2">
              {CHANNEL_PERF.slice(0, 2).map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{c.channel}</span>
                    <span className=" text-gray-900">${c.revenue} <span className="text-gray-400 font-normal">({c.pct}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: c.color }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#6D28D9] p-6 rounded shadow-lg flex-1 text-center text-white flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5 rounded-full blur-3xl transform -translate-y-1/2 -translate-x-1/2"></div>
            <h3 className=" mb-4 relative z-10 text-[15px]">Campaign Status</h3>
            <div className="w-24 h-24 rounded-full border-4 border-white/20 mx-auto flex items-center justify-center relative z-10 mb-4" style={{ borderTopColor: 'white' }}>
              <div className="text-center">
                <p className="text-2xl ">78%</p>
                <p className="text-[10px] opacity-80 uppercase tracking-widest">Active</p>
              </div>
            </div>
            <p className="text-sm font-semibold relative z-10">Active Campaigns</p>
            <p className="text-xs opacity-80 relative z-10 mb-4">14 / 18 Running</p>
            <button className="w-full py-2 bg-white/20 hover:bg-white/30 transition-colors rounded-lg text-sm  relative z-10">View All Campaigns</button>
          </div>
        </div>

      </div>

    </div>
  );
};

export default MarketingDashboard;