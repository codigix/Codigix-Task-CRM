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
  Users2,
  ArrowUp,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  PieChart as PieChartIcon,
  Target,
  BarChart2,
  Clock
} from 'lucide-react';
import {
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

const SalesDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
        const response = await fetch(`${apiUrl}/dashboard/sales?userId=${user?.id}&viewType=${user?.role?.includes('Manager') ? 'manager' : 'executive'}`);
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchDashboardData();
    }
  }, [user]);

  const pipelineStages = [
    { name: 'Prospects', color: '#93C5FD', backendStage: 'New' },
    { name: 'Qualified Leads', color: '#BFDBFE', backendStage: 'Qualified' },
    { name: 'Proposal', color: '#A5B4FC', backendStage: 'Proposal Sent' },
    { name: 'Won', color: '#6EE7B7', backendStage: 'Won' },
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
  const totalTarget = dashboardData?.target || 50000;
  const progressPercent = totalTarget > 0 ? Math.round((wonValue / totalTarget) * 100) : 0;

  const targetProgressData = [
    { name: 'Achieved', value: wonValue },
    { name: 'Remaining', value: Math.max(0, totalTarget - wonValue) },
  ];

  const pieColors = ['#F62416', '#F3F4F6'];

  const stats = [
    { title: 'Total Tasks Today', value: dashboardData?.tasks?.pendingTasks || '0', sub: 'Active Tasks', icon: null },
    { title: 'Calls Made', value: dashboardData?.tasks?.callsMade || '0', sub: 'Today', icon: <Phone size={16} className="text-green-500" /> },
    { title: 'Meetings Scheduled', value: dashboardData?.tasks?.meetingsScheduled || '0', sub: 'Upcoming', icon: null },
    { title: 'Active Deals', value: dashboardData?.personal?.activeDeals || '0', sub: 'In Pipeline', icon: null },
    { title: 'Won Revenue', value: `₹${(dashboardData?.personal?.totalRevenue || 0).toLocaleString()}`, sub: 'This Period', icon: null },
  ];

  const targets = [
    { name: 'Overall Target', value: progressPercent, color: '#F62416' },
  ];

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen p-2 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-gray-100 mb-4">
        <div>
          <h1 className="text-xl  text-gray-800">Sales Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs  text-gray-800">{user?.name || 'User'}</p>
              <p className="text-xs text-[#1F2020]">{user?.role || 'Sales Representative'}</p>
            </div>
            <div className="w-5 h-5 rounded overflow-hidden border-2 border-white  bg-gray-200">
              {user?.avatar ? (
                <img src={user.avatar} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <ChevronDown size={15} className="text-[#1F2020] cursor-pointer" />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {stats.map((item, idx) => (
          <div key={idx} className="bg-white p-2 rounded border border-gray-100 ">
            <p className="text-xs text-gray-500 mb-2">{item.title}</p>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl  text-gray-900">{item.value}</span>
              {item.icon}
            </div>
            <p className="text-xs text-[#1F2020]">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Middle Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-6">
        {/* Pipeline Overview */}
        <div className="lg:col-span-2 bg-white p-2 rounded border border-gray-100 ">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-md  text-gray-800">Pipeline Overview</h2>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  interval={0}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip
                  cursor={{ fill: '#F8FAFC' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-around px-10">
            {pipelineData.map((item, idx) => (
              <div key={idx} className="text-center">
                <p className="text-[14px]   text-gray-800">{item.count}</p>
                <p className="text-xs text-gray-400">Deals</p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Total Pipeline Value: <span className=" ">₹{pipelineData.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}</span>
            </p>
          </div>
        </div>

        {/* Sales Targets Progress */}
        <div className="bg-white p-2 rounded border border-gray-100  flex flex-col">
          <h2 className="text-md  text-gray-800 mb-6">Sales Targets Progress</h2>
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="h-[180px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={targetProgressData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={0}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {targetProgressData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                    <Label
                      value={`${progressPercent}%`}
                      position="center"
                      className="text-2xl  fill-gray-900"
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-[65%] left-1/2 -translate-x-1/2 text-center w-full">
                <p className="text-xs  text-[#1F2020]">{wonValue.toLocaleString()} / {totalTarget.toLocaleString()}</p>
                <p className="text-xs  text-[#1F2020]">Revenue</p>
              </div>
            </div>
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                Active Deals: {dashboardData?.personal?.activeDeals || 0}
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {targets.map((target, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">{target.name}</span>
                  <span className=" text-gray-700">{target.value}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${target.value}%`, backgroundColor: target.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <UpcomingEvents />
      </div>

      {/* Bottom Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Small Sales Targets Card */}
        <div className="bg-white p-2 roundedl border border-gray-100 ">
          <h3 className="text-sm text-gray-500 mb-4">Sales Targets</h3>
          <div className="flex items-end gap-3 mb-4">
            <span className="text-2xl  text-gray-900">48%</span>
            <div className="flex items-center gap-0.5 text-green-500 text-xs pb-1">
              <ArrowUp size={12} />
              <span>+2.3%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded  border border-gray-100 text-center">
              <p className="text-xs  text-[#1F2020] mb-1">Total Sales</p>
              <p className="text-sm  text-gray-700">500</p>
            </div>
            <div className="bg-white p-3 rounded  border border-gray-100 text-center">
              <p className="text-xs  text-[#1F2020] mb-1 leading-tight">Unit Target</p>
              <p className="text-sm  text-gray-700">500 Units</p>
            </div>
          </div>
        </div>

        {/* Performance Metrics Small */}
        <div className="bg-white p-2 rounded border border-gray-100 ">
          <h3 className="text-sm text-gray-500 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <div>
                <p className="text-xs  text-[#1F2020] mb-0.5">Win Rate</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm  text-gray-800">48%</span>
                  <span className="text-xs  text-green-500">+2.3%</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs  text-[#1F2020] mb-0.5">Avg. Deal Size</p>
                <p className="text-sm  text-gray-800">500</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs  text-[#1F2020] mb-0.5">Sales</p>
                <p className="text-sm  text-gray-800">20 Days</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[79%]" />
                </div>
                <span className="text-xs  text-gray-700">79%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics List */}
        <div className="bg-white p-2 rounded border border-gray-100 ">
          <h3 className="text-sm text-gray-500 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] text-gray-600">
                <TrendingUp size={14} className="text-[#1F2020]" />
                <span>Win Rate</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm  text-gray-800">48%</span>
                <ArrowUp size={12} className="text-green-500" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] text-gray-600">
                <Clock size={14} className="text-[#1F2020]" />
                <span>Avg. Deal Size</span>
              </div>
              <span className="text-sm  text-gray-800">500</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] text-gray-600">
                <Calendar size={14} className="text-[#1F2020]" />
                <span>Sales Cycle</span>
              </div>
              <span className="text-sm  text-gray-800">20</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] text-gray-600">
                <CheckSquare size={14} className="text-[#1F2020]" />
                <span>Quote Approval</span>
              </div>
              <span className="text-sm  text-gray-800">79%</span>
            </div>
          </div>
        </div>

        {/* Alerts Card */}
        <div className="bg-white p-2 rounded border border-gray-100 ">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm text-gray-500">Alerts</h3>
            <span className="bg-red-500 text-white text-xs  w-4 h-4 flex items-center justify-center rounded-full">1</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
              <p className="text-[12px] text-gray-600 leading-tight">New lead added: <span className=" text-gray-800">Lead #421</span></p>
            </div>
            <div className="flex items-start gap-3">
              <AlertTriangle size={14} className="text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-[12px] text-gray-600 leading-tight">Quote revision request from <span className=" text-gray-800">XYZ Ltd</span></p>
            </div>
            <div className="flex items-start gap-3">
              <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-[12px] text-gray-600 leading-tight">Target achievement below <span className=" text-red   tracking-wider">50%</span></p>
            </div>
            <div className="flex items-start gap-3">
              <AlertTriangle size={14} className="text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-[12px] text-gray-600 leading-tight">Follow-up pending with <span className=" text-gray-800">ABC Pvt Ltd</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
