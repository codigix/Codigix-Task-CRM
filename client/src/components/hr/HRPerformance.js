import React, { useState, useEffect } from 'react';
import { 
  Trophy, Star, CheckCircle, Clock, TrendingUp, Zap, 
  Award, Target, ChevronRight, Activity, ArrowUpRight, Medal
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { useParams } from 'react-router-dom';

const HRPerformance = () => {
  const { username, designation } = useParams();
  const [loading, setLoading] = useState(true);

  // Mock data tailored to the new Effort Points system rather than time-tracking
  const [performanceData, setPerformanceData] = useState(null);

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      setPerformanceData({
        employee: {
          name: username ? username.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Alex Morgan',
          role: designation ? designation.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Senior Developer',
          department: 'Engineering',
          avatar: `https://ui-avatars.com/api/?name=${username || 'AM'}&background=4f46e5&color=fff`,
          tier: 'Gold Achiever',
          currentPoints: 2450,
          nextTierPoints: 3000
        },
        kpis: {
          totalPoints: { value: 2450, trend: '+15%', label: 'Total Effort Points Earned' },
          tasksCompleted: { value: 42, target: 50, label: 'Tasks Completed (MTD)' },
          qualityScore: { value: 4.8, max: 5.0, label: 'Review Quality Score' },
          onTimeDelivery: { value: 94, unit: '%', label: 'On-Time Delivery Rate' }
        },
        pointsHistory: [
          { month: 'Mar', points: 1200 },
          { month: 'Apr', points: 1500 },
          { month: 'May', points: 1800 },
          { month: 'Jun', points: 1750 },
          { month: 'Jul', points: 2100 },
          { month: 'Aug', points: 2450 }
        ],
        taskDistribution: [
          { name: 'Features', value: 45, color: '#4f46e5' }, // Indigo
          { name: 'Bugs', value: 25, color: '#f43f5e' }, // Rose
          { name: 'Epics', value: 15, color: '#10b981' }, // Emerald
          { name: 'Reviews', value: 15, color: '#8b5cf6' } // Violet
        ],
        recentAchievements: [
          { id: 1, type: 'epic', title: 'Payment Gateway Integration', points: 300, date: '2 days ago', icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-50' },
          { id: 2, type: 'feature', title: 'User Profile Redesign', points: 120, date: '5 days ago', icon: Star, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { id: 3, type: 'bug', title: 'Critical Auth Fix', points: 150, date: '1 week ago', icon: Zap, color: 'text-rose-500', bg: 'bg-rose-50' },
          { id: 4, type: 'review', title: 'PR Reviews & Mentoring', points: 80, date: '1 week ago', icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50' }
        ]
      });
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [username, designation]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-sm font-medium text-indigo-600 animate-pulse">Calculating Performance Metrics...</p>
        </div>
      </div>
    );
  }

  const { employee, kpis, pointsHistory, taskDistribution, recentAchievements } = performanceData;

  const progressPercentage = (employee.currentPoints / employee.nextTierPoints) * 100;

  return (
    <div className="min-h-screen bg-slate-50 p-6 pb-20">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Header / Hero Section with Glassmorphism */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 p-8 text-white shadow-xl">
          {/* Abstract background shapes */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="flex items-center gap-5">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white/20 shadow-lg">
                <img src={employee.avatar} alt={employee.name} className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{employee.name}</h1>
                  <span className="flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-400/30">
                    <Medal size={12} />
                    {employee.tier}
                  </span>
                </div>
                <p className="text-indigo-200">{employee.role} • {employee.department}</p>
              </div>
            </div>
            
            {/* Level Progress */}
            <div className="w-full max-w-sm rounded-xl bg-white/10 p-4 backdrop-blur-md border border-white/10">
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <p className="text-xs font-medium text-indigo-200 uppercase tracking-wider mb-1">Current Standing</p>
                  <p className="text-2xl font-bold">{employee.currentPoints.toLocaleString()} <span className="text-sm font-normal text-indigo-300">Pts</span></p>
                </div>
                <p className="text-xs font-medium text-indigo-200">Next Tier: {employee.nextTierPoints.toLocaleString()}</p>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/20">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Points */}
          <div className="group relative overflow-hidden rounded-xl bg-white p-5 shadow-sm border border-slate-200 transition-all hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{kpis.totalPoints.label}</p>
                <h3 className="mt-2 text-3xl font-bold text-slate-800">{kpis.totalPoints.value.toLocaleString()}</h3>
              </div>
              <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                <Trophy size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowUpRight size={16} className="text-emerald-500 mr-1" />
              <span className="font-medium text-emerald-600">{kpis.totalPoints.trend}</span>
              <span className="ml-2 text-slate-400">vs last quarter</span>
            </div>
          </div>

          {/* Card 2: Tasks */}
          <div className="group relative overflow-hidden rounded-xl bg-white p-5 shadow-sm border border-slate-200 transition-all hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{kpis.tasksCompleted.label}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <h3 className="text-3xl font-bold text-slate-800">{kpis.tasksCompleted.value}</h3>
                  <span className="text-sm font-medium text-slate-400">/ {kpis.tasksCompleted.target}</span>
                </div>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <CheckCircle size={20} />
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div 
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${(kpis.tasksCompleted.value / kpis.tasksCompleted.target) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Card 3: Quality */}
          <div className="group relative overflow-hidden rounded-xl bg-white p-5 shadow-sm border border-slate-200 transition-all hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{kpis.qualityScore.label}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <h3 className="text-3xl font-bold text-slate-800">{kpis.qualityScore.value}</h3>
                  <span className="text-sm font-medium text-slate-400">/ {kpis.qualityScore.max}</span>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 p-2 text-amber-500 transition-colors group-hover:bg-amber-500 group-hover:text-white">
                <Star size={20} />
              </div>
            </div>
            <div className="mt-4 flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  size={14} 
                  className={star <= Math.floor(kpis.qualityScore.value) ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'} 
                />
              ))}
            </div>
          </div>

          {/* Card 4: Delivery */}
          <div className="group relative overflow-hidden rounded-xl bg-white p-5 shadow-sm border border-slate-200 transition-all hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{kpis.onTimeDelivery.label}</p>
                <h3 className="mt-2 text-3xl font-bold text-slate-800">{kpis.onTimeDelivery.value}{kpis.onTimeDelivery.unit}</h3>
              </div>
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                <Clock size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Activity size={16} className="text-blue-500 mr-1" />
              <span className="text-slate-500">Consistent performer</span>
            </div>
          </div>
        </div>

        {/* Charts & Details Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* Main Chart: Trajectory */}
          <div className="col-span-1 lg:col-span-2 rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Performance Trajectory</h2>
                <p className="text-sm text-slate-500">Effort points earned over the last 6 months</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1">
                <button className="rounded bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm">6M</button>
                <button className="rounded px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-800">1Y</button>
                <button className="rounded px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-800">ALL</button>
              </div>
            </div>
            
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pointsHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="points" 
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorPoints)" 
                    activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Column: Distribution & Achievements */}
          <div className="space-y-6">
            
            {/* Task Distribution */}
            <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
              <h2 className="mb-4 text-lg font-bold text-slate-800">Effort Distribution</h2>
              <div className="h-48 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {taskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value) => [`${value}%`, 'Share']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-slate-800">42</span>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Tasks</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {taskDistribution.map(item => (
                  <div key={item.name} className="flex items-center text-xs font-medium text-slate-600">
                    <span className="mr-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    {item.name}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Recent Achievements Panel (Spans full width at bottom) */}
          <div className="col-span-1 lg:col-span-3 rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="text-indigo-500" size={20} />
                <h2 className="text-lg font-bold text-slate-800">Recent Point Awards</h2>
              </div>
              <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center">
                View All <ChevronRight size={16} />
              </button>
            </div>
            
            <div className="divide-y divide-slate-100">
              {recentAchievements.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
                      <item.icon size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{item.title}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="capitalize">{item.type}</span>
                        <span>•</span>
                        <span>{item.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-600 border border-emerald-100">
                      +{item.points} Pts
                    </span>
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

export default HRPerformance;
