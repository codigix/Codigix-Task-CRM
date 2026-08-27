import React from 'react';
import { useNavigate } from 'react-router-dom';
import Chart from 'react-apexcharts';
import { ChevronDown } from 'lucide-react';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();

  const statCards = [
    {
      title: 'Total Companies',
      value: '5468',
      change: '+5.62%',
      trend: 'up',
      from: 'from last month',
      borderClass: 'border-l-[#FF6A59]',
      bgClass: 'bg-[#FFFCFB]',
      icon: '📦',
      circleClass: 'bg-[#FFE5E0]'
    },
    {
      title: 'Active Companies',
      value: '4598',
      change: '+12%',
      trend: 'up',
      from: 'from last month',
      borderClass: 'border-l-[#2ED573]',
      bgClass: 'bg-[#F9FFFC]',
      icon: '✓',
      circleClass: 'bg-[#D4F9E8]'
    },
    {
      title: 'Total Subscribers',
      value: '5468',
      change: '+6%',
      trend: 'up',
      from: 'from last month',
      borderClass: 'border-l-[#FFC107]',
      bgClass: 'bg-[#FFFEF5]',
      icon: '👥',
      circleClass: 'bg-[#FFE8B3]'
    },
    {
      title: 'Total Earnings',
      value: '$89,878.58',
      change: '+16%',
      trend: 'up',
      from: 'from last month',
      borderClass: 'border-l-[#FF6A59]',
      bgClass: 'bg-[#FFFCFB]',
      icon: '💵',
      circleClass: 'bg-[#FFE5E0]'
    }
  ];

  const companiesChartOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      fontFamily: "'Poppins', sans-serif",
      sparkline: { enabled: false }
    },
    colors: ['#FF6A59'],
    plotOptions: {
      bar: {
        columnWidth: '45%',
        borderRadius: 3,
        distributed: false
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          fontSize: '11px',
          fontFamily: "'Poppins', sans-serif",
          color: '#9CA3AF'
        }
      }
    },
    yaxis: {
      show: false,
      labels: { show: false }
    },
    grid: {
      show: true,
      borderColor: '#E5E7EB',
      strokeDashArray: 0,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    },
    tooltip: {
      theme: 'light',
      style: { fontSize: '12px' }
    },
    states: {
      hover: { filter: { type: 'none' } }
    }
  };

  const companiesChartSeries = [
    {
      name: 'Companies',
      data: [30, 40, 20, 50, 60, 40, 50]
    }
  ];

  const revenueChartOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      fontFamily: "'Poppins', sans-serif",
      sparkline: { enabled: false }
    },
    colors: ['#FF6A59'],
    plotOptions: {
      bar: {
        columnWidth: '55%',
        borderRadius: 3,
        distributed: false
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          fontSize: '10px',
          fontFamily: "'Poppins', sans-serif",
          color: '#9CA3AF'
        }
      }
    },
    yaxis: {
      show: true,
      labels: {
        formatter: (val) => `${Math.round(val / 1000)}k`,
        style: {
          fontSize: '10px',
          fontFamily: "'Poppins', sans-serif",
          color: '#9CA3AF'
        }
      }
    },
    grid: {
      show: true,
      borderColor: '#F3F4F6',
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    },
    tooltip: {
      theme: 'light',
      y: { formatter: (val) => `$${Math.round(val / 1000)}k` }
    }
  };

  const revenueChartSeries = [
    {
      name: 'Revenue',
      data: [40000, 20000, 50000, 45000, 80000, 75000, 80000, 78000, 85000, 20000, 75000, 60000]
    }
  ];

  const topPlansOptions = {
    chart: {
      type: 'donut',
      toolbar: { show: false },
      fontFamily: "'Poppins', sans-serif"
    },
    labels: ['Basic', 'Premium', 'Enterprise'],
    colors: ['#0D6EFD', '#FFC107', '#FF6A59'],
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: false
          }
        }
      }
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: {
      enabled: true,
      theme: 'light'
    },
    states: {
      hover: {
        filter: { type: 'none' }
      }
    }
  };

  const topPlansSeries = [60, 20, 20];

  const recentTransactions = [
    { id: 1, company: 'NovaWave LLC', date: '14 Sep 2025', amount: '+$245', plan: 'Basic (Monthly)', avatar: '🌊' },
    { id: 2, company: 'BlueSky', date: '20 Mar 2025', amount: '+$395', plan: 'Enterprise (Yearly)', avatar: '☁️' },
    { id: 3, company: 'Silver Hawk', date: '26 Mar 2025', amount: '+$145', plan: 'Advanced (Monthly)', avatar: '🦅' },
    { id: 4, company: 'Summit Peak', date: '10 Feb 2025', amount: '+$758', plan: 'Enterprise (Monthly)', avatar: '⛰️' },
    { id: 5, company: 'RiverStone Ltd', date: '10 Jan 2025', amount: '+$977', plan: 'Premium (Yearly)', avatar: '🏞️' }
  ];

  const recentlyRegistered = [
    { id: 1, company: 'Bright Bridge Grp', plan: 'Basic (Monthly)', users: '150 Users', email: 'bbg@example.com', avatar: '🌉' },
    { id: 2, company: 'CoastalStar Co.', plan: '2Enterprise (Yearly)', users: '200 Users', email: 'csc@example.com', avatar: '⭐' },
    { id: 3, company: 'HarborView', plan: 'Advanced (Monthly)', users: '129 Users', email: 'hv@example.com', avatar: '🏖️' },
    { id: 4, company: 'Golden Gate Ltd', plan: 'Enterprise (Monthly)', users: '103 Users', email: 'ggl@example.com', avatar: '🚪' },
    { id: 5, company: 'Redwood Inc', plan: 'Premium (Yearly)', users: '109 Users', email: 'rw@example.com', avatar: '🌲' }
  ];

  const recentlyExpired = [
    { id: 1, company: 'VK Pvt Ltd', date: '14 Sep 2025', plan: 'Basic (Monthly)', avatar: '📱' },
    { id: 2, company: 'RiverStone Ltd', date: '20 Mar 2025', plan: 'Enterprise (Yearly)', avatar: '🏞️' },
    { id: 3, company: 'Summit Peak', date: '26 Mar 2025', plan: 'Advanced (Monthly)', avatar: '⛰️' },
    { id: 4, company: 'Redwood Inc', date: '10 Feb 2025', plan: 'Enterprise (Monthly)', avatar: '🌲' },
    { id: 5, company: 'NovaWave LLC', date: '10 Jan 2025', plan: 'Premium (Yearly)', avatar: '🌊' }
  ];

  return (
    <div className="min-h-screen bg-[#F5F6FB]">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-xl  text-gray-800 font-poppins">
                Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">28 Nov 25 - 28 Nov 25</span>
              <button className="p-2 border border-gray-200 rounded  bg-white cursor-pointer text-xs">
                ↻
              </button>
            </div>
          </div>

          {/* Welcome Banner */}
          <div className="bg-gray-800 text-white rounded  p-2 mb-8 relative overflow-hidden">
            <div className="flex items-start justify-between relative z-10">
              <div>
                <h2 className="text-lg  font-poppins">
                  Welcome Back, Adrian
                </h2>
                <p className="text-xs text-gray-300 font-poppins">
                  14 New Companies Subscribed Today !!!
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/super-admin/companies')}
                  className="p-2 bg-[#FF6A59] text-white border-none rounded  cursor-pointer text-xs  font-poppins"
                >
                  Companies
                </button>
                <button
                  onClick={() => navigate('/super-admin/packages')}
                  className="p-2 bg-white text-gray-800 border-none rounded  cursor-pointer text-xs  font-poppins"
                >
                  All Packages
                </button>
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((card, index) => (
              <div
                key={index}
                onClick={() => {
                  if (index === 0 || index === 1 || index === 2) navigate('/super-admin/companies');
                  else if (index === 3) navigate('/super-admin/purchase-transaction');
                }}
                className={`p-3 rounded border border-gray-200 border-l-4 relative  cursor-pointer transition-all duration-200 origin-center hover:-translate-y-1 hover:shadow-lg ${card.bgClass} ${card.borderClass}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1.5 font-poppins ">
                      {card.title}
                    </p>
                    <h3 className="text-xl  text-gray-800 mb-2 font-poppins">
                      {card.value}
                    </h3>
                    <div className="flex  gap-1 text-[12px] text-emerald-500 font-poppins  flex-col">
                      <span>📈</span>
                      <span>{card.change}</span>
                      <span className="text-gray-500 font-normal">{card.from}</span>
                    </div>
                  </div>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${card.circleClass}`}
                  >
                    {card.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Companies Chart */}
            <div
              onClick={() => navigate('/super-admin/companies')}
              className="bg-white border border-gray-200 rounded  p-3   cursor-pointer transition-all duration-200 hover:shadow-lg"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs   text-gray-800 font-poppins">
                  Companies
                </h3>
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  className="text-[12px] text-gray-500 bg-none border-none cursor-pointer flex items-center gap-1 font-poppins "
                >
                  This Week <ChevronDown size={16} />
                </button>
              </div>
              <div className="h-[240px]">
                <Chart
                  options={companiesChartOptions}
                  series={companiesChartSeries}
                  type="bar"
                  height="100%"
                />
              </div>
              <div className="mt-3 text-xs text-emerald-500 font-poppins ">
                📈 <span>12.5%</span> <span className="text-gray-500 font-normal">from last month</span>
              </div>
            </div>

            {/* Revenue Chart */}
            <div
              onClick={() => navigate('/super-admin/purchase-transaction')}
              className="bg-white border border-gray-200 rounded  p-3   cursor-pointer transition-all duration-200 hover:shadow-lg lg:col-span-1"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xs   text-gray-800 mb-2.5 font-poppins">
                    Revenue
                  </h3>
                  <p className="text-[22px]  text-gray-800 mb-1 font-poppins">
                    $89,878.58
                  </p>
                  <div className="text-xs text-emerald-500 font-poppins ">
                    📈 <span>40%</span> <span className="text-gray-500 font-normal">increased from last year</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  className="text-[12px] text-gray-500 bg-none border-none cursor-pointer flex items-center gap-1 font-poppins "
                >
                  2025 <ChevronDown size={16} />
                </button>
              </div>
              <div className="h-[240px]">
                <Chart
                  options={revenueChartOptions}
                  series={revenueChartSeries}
                  type="bar"
                  height="100%"
                />
              </div>
            </div>

            {/* Top Plans Chart */}
            <div
              onClick={() => navigate('/super-admin/packages')}
              className="bg-white border border-gray-200 rounded  p-3   cursor-pointer transition-all duration-200 hover:shadow-lg"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs   text-gray-800 font-poppins">
                  Top Plans
                </h3>
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  className="text-[12px] text-gray-500 bg-none border-none cursor-pointer flex items-center gap-1 font-poppins "
                >
                  Last 30 Days <ChevronDown size={16} />
                </button>
              </div>
              <div className="flex flex-col items-center justify-between min-h-[240px]">
                <div className="h-[180px] w-full max-w-[150px] flex items-center justify-center">
                  <Chart
                    options={topPlansOptions}
                    series={topPlansSeries}
                    type="donut"
                    height="100%"
                  />
                </div>
                <div className="mt-4 w-full">
                  <div className="flex items-center justify-between pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0D6EFD]"></div>
                      <span className="text-[12px] text-gray-600 font-poppins ">Basic</span>
                    </div>
                    <span className="text-xs  text-gray-800 font-poppins">60%</span>
                  </div>
                  <div className="flex items-center justify-between pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FFC107]"></div>
                      <span className="text-[12px] text-gray-600 font-poppins ">Premium</span>
                    </div>
                    <span className="text-xs  text-gray-800 font-poppins">20%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF6A59]"></div>
                      <span className="text-[12px] text-gray-600 font-poppins ">Enterprise</span>
                    </div>
                    <span className="text-xs  text-gray-800 font-poppins">20%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-8">
            {/* Recent Transactions */}
            <div className="bg-white border border-gray-200 rounded  p-3  ">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs   text-gray-800 font-poppins">
                  Recent Transactions
                </h3>
                <button
                  onClick={() => navigate('/super-admin/purchase-transaction')}
                  className="text-xs  text-white bg-[#FF6A59] border-none rounded  p-2 cursor-pointer font-poppins"
                >
                  View All
                </button>
              </div>
              <div className="flex flex-col gap-0">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0 mb-4 last:mb-0 flex gap-3 items-start">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                      {tx.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs  text-gray-800 mb-0.5 font-poppins">
                        {tx.company}
                      </h4>
                      <p className="text-xs text-[#1F2020] mb-0.5 font-poppins">
                        {tx.date}
                      </p>
                      <p className="text-xs text-gray-500 font-poppins">
                        {tx.plan}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs  text-gray-800 font-poppins">
                        {tx.amount}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recently Registered */}
            <div className="bg-white border border-gray-200 rounded  p-3  ">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs   text-gray-800 font-poppins">
                  Recently Registered
                </h3>
                <button
                  onClick={() => navigate('/super-admin/companies')}
                  className="text-xs  text-white bg-[#FF6A59] border-none rounded  p-2 cursor-pointer font-poppins"
                >
                  View All
                </button>
              </div>
              <div className="flex flex-col gap-0">
                {recentlyRegistered.map((reg) => (
                  <div key={reg.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0 mb-4 last:mb-0 flex gap-3 items-start">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                      {reg.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs  text-gray-800 mb-0.5 font-poppins">
                        {reg.company}
                      </h4>
                      <p className="text-xs text-gray-500 mb-0.5 font-poppins">
                        {reg.plan}
                      </p>
                      <p className="text-xs text-gray-500 mb-0.5 font-poppins">
                        {reg.users}
                      </p>
                      <p className="text-xs text-white  font-poppins cursor-pointer truncate">
                        {reg.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recently Plan Expired */}
            <div className="bg-white border border-gray-200 rounded  p-3  ">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs   text-gray-800 font-poppins">
                  Recently Plan Expired
                </h3>
                <button
                  onClick={() => navigate('/super-admin/subscriptions')}
                  className="text-xs  text-white bg-[#FF6A59] border-none rounded  p-2 cursor-pointer font-poppins"
                >
                  View All
                </button>
              </div>
              <div className="flex flex-col gap-0">
                {recentlyExpired.map((exp) => (
                  <div key={exp.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0 mb-4 last:mb-0 flex gap-3 items-start justify-between">
                    <div className="flex gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                        {exp.avatar}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs  text-gray-800 mb-0.5 font-poppins truncate">
                          {exp.company}
                        </h4>
                        <p className="text-xs text-[#1F2020] mb-0.5 font-poppins">
                          {exp.date}
                        </p>
                        <p className="text-xs text-gray-500 font-poppins truncate">
                          {exp.plan}
                        </p>
                      </div>
                    </div>
                    <button className="text-xs  text-white  bg-transparent border-none cursor-pointer font-poppins whitespace-nowrap ml-2">
                      Send Reminder
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-[12px] text-[#1F2020] font-poppins">
            <p>Copyright © 2025 <span className="text-[#FF6A59]">Preadmin</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
