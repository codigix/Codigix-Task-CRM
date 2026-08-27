import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, DollarSign, Calendar, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { salesAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import DataTable from '../common/DataTable';

const SalesTargetsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    mainTargets: [],
    teamBreakdown: []
  });

  const columns = [
    { key: 'name', label: 'Sales Member', sortable: true },
    { key: 'target', label: 'Target', sortable: true },
    { key: 'achieved', label: 'Achieved', sortable: true },
    { key: 'leads', label: 'Leads', sortable: true },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs ${value === 'Completed' ? 'bg-green-100 text-green-600' :
          value === 'On Track' ? 'bg-blue-100 text-blue-600' :
            'bg-red-100 text-red-600'
          }`}>
          {value}
        </span>
      )
    },
    {
      key: 'deadline',
      label: 'Deadline',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2 text-gray-500">
          <Calendar size={14} /> {value || '31 Mar 2026'}
        </div>
      )
    }
  ];

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        setLoading(true);
        // Only pass userId if it's NOT an admin/manager who should see everything
        const isManager = user?.role === 'Admin' || user?.role === 'Sales Manager' || user?.role === 'Super Admin';
        const response = await salesAPI.getTargets(isManager ? null : user?.id);

        // Transform the API response into the format needed for the UI
        const mainTargets = [
          {
            id: 1,
            title: 'Monthly Revenue',
            current: response.revenue.current,
            target: response.revenue.target,
            color: 'bg-blue-500',
            icon: <DollarSign size={20} className="text-blue-500" />,
            percentChange: response.revenue.percentChange || 0
          },
          {
            id: 2,
            title: 'New Customers',
            current: response.customers.current,
            target: response.customers.target,
            color: 'bg-green-500',
            icon: <Target size={20} className="text-green-500" />,
            percentChange: response.customers.percentChange || 0
          },
          {
            id: 3,
            title: 'Deals Closed',
            current: response.deals.current,
            target: response.deals.target,
            color: 'bg-orange-500',
            icon: <TrendingUp size={20} className="text-orange-500" />,
            percentChange: response.deals.percentChange || 0
          },
          {
            id: 4,
            title: 'Leads Generated',
            current: response.leads?.current || 0,
            target: response.leads?.target || 100,
            color: 'bg-purple-500',
            icon: <Target size={20} className="text-purple-500" />,
            percentChange: response.leads?.percentChange || 0
          },
          {
            id: 5,
            title: 'Activities Completed',
            current: response.activities?.current || 0,
            target: response.activities?.target || 200,
            color: 'bg-teal-500',
            icon: <Calendar size={20} className="text-teal-500" />,
            percentChange: response.activities?.percentChange || 0
          },
        ];

        setData({
          mainTargets,
          teamBreakdown: response.teamBreakdown || []
        });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching sales targets:', err);
        setError('Failed to load sales targets. Please try again later.');
        setLoading(false);
      }
    };

    fetchTargets();
  }, [user]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-red-500" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded  border border-gray-200">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50 min-h-screen p-6">
      <div className="mb-3">
        <h1 className="text-xl font-[500] text-gray-900 mb-1">Sales Targets</h1>
        <div className="flex items-center gap-1 text-xs  text-gray-500">
          <span>Home</span>
          <span>&gt;</span>
          <span>Sales Targets</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        {data.mainTargets.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded border border-gray-200 ">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gray-50 rounded">{item.icon}</div>
              <span className={`text-[12px] p-1 rounded flex items-center gap-1 ${item.percentChange >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                }`}>
                {item.percentChange >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(item.percentChange).toFixed(1)}%
              </span>
            </div>
            <h3 className="text-gray-500 text-xs  mb-1">{item.title}</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl   text-gray-900">
                {typeof item.current === 'number' && item.title.includes('Revenue') ? `$${item.current.toLocaleString()}` : item.current}
              </span>
              <span className="text-[#1F2020] text-xs ">/ {typeof item.target === 'number' && item.title.includes('Revenue') ? `$${item.target.toLocaleString()}` : item.target}</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className={`${item.color} h-full transition-all duration-500`}
                style={{ width: `${Math.min(100, (item.current / item.target) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Progress</span>
              <span>{Math.round((item.current / item.target) * 100)}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded border border-gray-200  overflow-hidden">
        <DataTable
          title="Team Targets Breakdown"
          columns={columns}
          data={data.teamBreakdown}
          searchKeys={['name', 'status']}
        />
      </div>
    </div>
  );
};

export default SalesTargetsPage;
