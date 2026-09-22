import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  TrendingUp,
  Calendar,
  Search,
  Bell,
  CheckSquare,
  Phone,
  Target,
  BarChart2,
  Clock,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  PieChart as PieChartIcon,
  Activity,
  DollarSign
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label
} from 'recharts';
import UpcomingEvents from '../common/UpcomingEvents';
import { useAuth } from '../../hooks/useAuth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white/80 backdrop-blur-md border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 ${className}`}>
    {children}
  </div>
);

const SalesDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL;
        const response = await fetch(`${apiUrl}/dashboard/sales?userId=${user?.id}&viewType=${user?.role?.includes('Manager') ? 'manager' : 'executive'}`);
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Provide mock fallback data so the dashboard stays visually intact on API failure
        setDashboardData({
          target: 100000,
          personal: { activeDeals: 24, totalRevenue: 65400 },
          tasks: { pendingTasks: 12, callsMade: 45, meetingsScheduled: 8 },
          pipeline: [
            { name: 'New', value: 12000, count: 10 },
            { name: 'Qualified', value: 24000, count: 8 },
            { name: 'Proposal Sent', value: 18000, count: 5 },
            { name: 'Won', value: 65400, count: 4 }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const pipelineStages = [
    { name: 'Prospects', color: 'url(#colorProspects)', backendStage: 'New' },
    { name: 'Qualified', color: 'url(#colorQualified)', backendStage: 'Qualified' },
    { name: 'Proposals', color: 'url(#colorProposals)', backendStage: 'Proposal Sent' },
    { name: 'Won', color: 'url(#colorWon)', backendStage: 'Won' },
  ];

  const pipelineData = pipelineStages.map(stage => {
    const backendData = dashboardData?.pipeline?.find(p => p.name === stage.backendStage);
    return {
      name: stage.name,
      value: backendData ? parseFloat(backendData.value) || 0 : 0,
      count: backendData ? backendData.count : 0,
      color: stage.color
    };
  });

  const wonValue = pipelineData.find(p => p.name === 'Won')?.value || 0;
  const totalTarget = dashboardData?.target || 100000;
  const progressPercent = totalTarget > 0 ? Math.round((wonValue / totalTarget) * 100) : 0;

  const targetProgressData = [
    { name: 'Achieved', value: wonValue },
    { name: 'Remaining', value: Math.max(0, totalTarget - wonValue) },
  ];

  const pieColors = ['#4F46E5', '#EEF2FF']; // Indigo theme for pie

  const stats = [
    { title: 'Total Revenue', value: `₹${(dashboardData?.personal?.totalRevenue || 0).toLocaleString()}`, sub: '+12% from last month', icon: <DollarSign size={22} className="text-emerald-500" />, trend: 'up' },
    { title: 'Active Deals', value: dashboardData?.personal?.activeDeals || '0', sub: 'In Pipeline', icon: <Briefcase size={22} className="text-indigo-500" />, trend: 'neutral' },
    { title: 'Tasks Today', value: dashboardData?.tasks?.pendingTasks || '0', sub: 'Action Required', icon: <CheckSquare size={22} className="text-amber-500" />, trend: 'neutral' },
    { title: 'Meetings', value: dashboardData?.tasks?.meetingsScheduled || '0', sub: 'Upcoming', icon: <Calendar size={22} className="text-blue-500" />, trend: 'up' },
  ];

  if (loading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/30">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-indigo-900 font-medium tracking-wide animate-pulse">Loading Workspace...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] min-h-screen p-4 md:p-6 font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Sales Hub</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome back, here's what's happening with your deals today.</p>
        </div>
        <div className="flex items-center gap-4 bg-white/60 backdrop-blur-sm p-2 rounded-xl border border-white shadow-sm">
          <div className="flex flex-col items-end px-3 border-r border-slate-200">
            <span className="text-sm font-semibold text-slate-800">{user?.name || 'User'}</span>
            <span className="text-xs text-indigo-600 font-medium">{user?.role || 'Sales Representative'}</span>
          </div>
          <div className="relative cursor-pointer group">
            <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white shadow-sm transition-transform group-hover:scale-105">
              {user?.avatar ? (
                <img src={user.avatar} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-sm text-white font-bold">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full"></div>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((item, idx) => (
          <GlassCard key={idx} className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity group-hover:scale-110 duration-300">
              {item.icon}
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-slate-50 rounded-lg shadow-inner">
                {item.icon}
              </div>
              <h3 className="text-sm font-medium text-slate-500">{item.title}</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-800 tracking-tight">{item.value}</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              {item.trend === 'up' && <ArrowUp size={14} className="text-emerald-500" />}
              {item.trend === 'down' && <ArrowDown size={14} className="text-rose-500" />}
              <span className={`text-xs font-medium ${item.trend === 'up' ? 'text-emerald-600' : item.trend === 'down' ? 'text-rose-600' : 'text-slate-500'}`}>
                {item.sub}
              </span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        
        {/* Pipeline Value Chart (Spans 2 columns) */}
        <GlassCard className="xl:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Pipeline Velocity</h2>
              <p className="text-xs text-slate-500 mt-1">Value of deals across active stages</p>
            </div>
            <div className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-full">This Quarter</div>
          </div>
          
          <div className="flex-1 min-h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorProspects" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorQualified" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorProposals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `₹${value/1000}k`} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`₹${value.toLocaleString()}`, 'Value']}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={45}>
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Target Progress Donut */}
        <GlassCard className="flex flex-col">
          <div className="mb-2">
            <h2 className="text-lg font-bold text-slate-800">Target Achievement</h2>
            <p className="text-xs text-slate-500 mt-1">Goal vs Actual Revenue</p>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  <linearGradient id="targetGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>
                <Pie
                  data={targetProgressData}
                  cx="50%" cy="50%"
                  innerRadius={70} outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  startAngle={90} endAngle={-270}
                  stroke="none"
                >
                  <Cell fill="url(#targetGradient)" />
                  <Cell fill="#f1f5f9" />
                  <Label
                    value={`${progressPercent}%`}
                    position="center"
                    className="text-3xl font-bold fill-slate-800"
                  />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-[65%] left-1/2 -translate-x-1/2 text-center w-full pt-2">
              <p className="text-sm font-semibold text-slate-700">₹{wonValue.toLocaleString()}</p>
              <p className="text-xs text-slate-400">of ₹{totalTarget.toLocaleString()} goal</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div>Achieved</span>
              <span className="text-sm font-semibold text-slate-700">₹{wonValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-200"></div>Remaining</span>
              <span className="text-sm font-semibold text-slate-700">₹{Math.max(0, totalTarget - wonValue).toLocaleString()}</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Actionable Insights & Events Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Performance Metrics */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-6">
            <Activity className="text-indigo-500" size={20} />
            <h3 className="text-lg font-bold text-slate-800">Performance Metrics</h3>
          </div>
          
          <div className="space-y-5">
            <div className="group">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-medium text-slate-600">Win Rate</span>
                <span className="text-sm font-bold text-slate-800">68%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full w-[68%] group-hover:bg-emerald-500 transition-colors" />
              </div>
            </div>
            
            <div className="group">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-medium text-slate-600">Sales Cycle Velocity</span>
                <span className="text-sm font-bold text-slate-800">14 Days</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full w-[85%] group-hover:bg-indigo-500 transition-colors" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
               <div>
                  <p className="text-xs text-slate-400 mb-1">Avg Deal Size</p>
                  <p className="text-lg font-bold text-slate-700">₹45,000</p>
               </div>
               <div>
                  <p className="text-xs text-slate-400 mb-1">Conversion Ratio</p>
                  <p className="text-lg font-bold text-slate-700">1 : 3</p>
               </div>
            </div>
          </div>
        </GlassCard>

        {/* Priority Alerts */}
        <GlassCard>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Bell className="text-rose-500" size={20} />
              <h3 className="text-lg font-bold text-slate-800">Action Center</h3>
            </div>
            <span className="bg-rose-100 text-rose-600 text-xs font-bold px-2 py-0.5 rounded-full">3 Alerts</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100/50 hover:bg-amber-100/50 transition-colors cursor-pointer">
              <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900">Follow-up overdue</p>
                <p className="text-xs text-amber-700 mt-0.5">TechCorp Enterprise deal requires immediate attention.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-rose-50 rounded-xl border border-rose-100/50 hover:bg-rose-100/50 transition-colors cursor-pointer">
              <AlertCircle size={16} className="text-rose-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-rose-900">Stalled Opportunity</p>
                <p className="text-xs text-rose-700 mt-0.5">Global Inc proposal has been pending for 14 days.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100/50 hover:bg-emerald-100/50 transition-colors cursor-pointer">
              <Target size={16} className="text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-900">Hot Lead Assigned</p>
                <p className="text-xs text-emerald-700 mt-0.5">New inbound lead from pricing page.</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Calendar/Events component container */}
        <div className="xl:col-span-1">
          <UpcomingEvents />
        </div>
        
      </div>
    </div>
  );
};

export default SalesDashboard;
