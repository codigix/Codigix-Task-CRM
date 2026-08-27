import React from 'react';
import { Award, Zap, BarChart2, PieChart, TrendingUp, User } from 'lucide-react';

const PerformancePage = () => {
  const stats = [
    { title: 'Conversion Rate', value: '24.8%', icon: <Zap className="text-yellow-500" />, trend: '+2.4%' },
    { title: 'Avg. Deal Size', value: '$12,400', icon: <Award className="text-purple-500" />, trend: '+5.1%' },
    { title: 'Sales Cycle', value: '18 Days', icon: <BarChart2 className="text-blue-500" />, trend: '-2 Days' },
  ];

  return (
    <div className="w-full bg-gray-50 min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-xl font-[500] text-gray-900 mb-1">Performance</h1>
        <div className="flex items-center gap-1 text-xs  text-gray-500">
          <span>Home</span>
          <span>&gt;</span>
          <span>Performance Metrics</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded border border-gray-200 ">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-xs ">{stat.title}</span>
              <div className="p-2 bg-gray-50 rounded">{stat.icon}</div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl   text-gray-900">{stat.value}</span>
              <span className={`text-[12px]  ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-white '}`}>
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded border border-gray-200 ">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[16px]  text-gray-900">Leaderboard</h2>
            <select className="text-[12px] border-gray-200 rounded px-2 py-1 outline-none">
              <option>This Month</option>
              <option>Last Month</option>
            </select>
          </div>
          <div className="space-y-4">
            {[
              { name: 'Darlee Robertson', deals: 24, revenue: '$145,000', rank: 1 },
              { name: 'Sharon Roy', deals: 21, revenue: '$132,500', rank: 2 },
              { name: 'Vaughan Lewis', deals: 18, revenue: '$118,000', rank: 3 },
              { name: 'Jessica Louise', deals: 15, revenue: '$95,000', rank: 4 },
            ].map((user) => (
              <div key={user.rank} className="flex items-center justify-between p-3 rounded hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs   ${user.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                    user.rank === 2 ? 'bg-gray-100 text-gray-700' :
                      user.rank === 3 ? 'bg-orange-100 text-orange-700' : 'text-[#1F2020]'
                    }`}>
                    {user.rank}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <User size={16} className="text-blue-500" />
                  </div>
                  <div>
                    <div className="text-xs   text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.deals} Deals Closed</div>
                  </div>
                </div>
                <div className="text-xs    text-gray-900">{user.revenue}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded border border-gray-200 ">
          <h2 className="text-[16px]  text-gray-900 mb-6">Performance Trend</h2>
          <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded  bg-gray-50">
            <TrendingUp size={48} className="text-gray-300 mb-2" />
            <p className="text-xs  text-[#1F2020]">Interactive performance chart visualization</p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded border border-blue-100">
              <div className="text-xs text-white    mb-1">Total Revenue</div>
              <div className="text-lg   text-blue-900">$490,500</div>
            </div>
            <div className="p-3 bg-green-50 rounded border border-green-100">
              <div className="text-xs text-green-600   mb-1">Goal Completion</div>
              <div className="text-lg   text-green-900">92%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformancePage;
