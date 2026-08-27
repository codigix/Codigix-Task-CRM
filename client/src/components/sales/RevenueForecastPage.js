import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  ComposedChart,
  Line
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Target,
  BarChart3,
  PieChart as PieIcon,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw,
  Calendar,
  Zap
} from 'lucide-react';
import { dealsAPI, salesAPI } from '../../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const RevenueForecastPage = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('quarter'); // month, quarter, year

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const dealsRes = await dealsAPI.getAll();
      setDeals(Array.isArray(dealsRes) ? dealsRes : []);
    } catch (err) {
      console.error('Error fetching forecast data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const metrics = useMemo(() => {
    const totalPipeline = deals.reduce((sum, d) => sum + (parseFloat(d.deal_value) || 0), 0);
    const weightedForecast = deals.reduce((sum, d) => {
      const prob = (parseFloat(d.probability) || 0) / 100;
      return sum + ((parseFloat(d.deal_value) || 0) * prob);
    }, 0);

    const wonDeals = deals.filter(d => d.status === 'Won');
    const actualRevenue = wonDeals.reduce((sum, d) => sum + (parseFloat(d.deal_value) || 0), 0);

    const avgProbability = deals.length > 0
      ? deals.reduce((sum, d) => sum + (parseFloat(d.probability) || 0), 0) / deals.length
      : 0;

    return {
      totalPipeline,
      weightedForecast,
      actualRevenue,
      avgProbability,
      dealCount: deals.length
    };
  }, [deals]);

  const forecastChartData = useMemo(() => {
    // Group deals by month based on expected close date
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();

    const data = months.map((month, idx) => ({
      name: month,
      projected: 0,
      weighted: 0,
      actual: 0
    }));

    deals.forEach(deal => {
      const closeDate = deal.expected_close_date ? new Date(deal.expected_close_date) : new Date(deal.created_at);
      if (closeDate.getFullYear() === currentYear) {
        const monthIdx = closeDate.getMonth();
        const value = parseFloat(deal.deal_value) || 0;
        const prob = (parseFloat(deal.probability) || 0) / 100;

        data[monthIdx].projected += value;
        data[monthIdx].weighted += value * prob;
        if (deal.status === 'Won') {
          data[monthIdx].actual += value;
        }
      }
    });

    return data;
  }, [deals]);

  const stageData = useMemo(() => {
    const stages = {};
    deals.forEach(deal => {
      const stage = deal.stage || 'Discovery';
      stages[stage] = (stages[stage] || 0) + (parseFloat(deal.deal_value) || 0);
    });

    return Object.keys(stages).map(key => ({
      name: key,
      value: stages[key]
    })).sort((a, b) => b.value - a.value);
  }, [deals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl  text-gray-900">Revenue Forecast</h1>
          <p className="text-gray-500 text-sm mt-1">Projected income and pipeline health analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-gray-200 rounded p-1">
            {['month', 'quarter', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`p-2 text-xs font-medium rounded-md transition-all ${timeRange === range ? 'bg-red-600 text-white ' : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={fetchData} className="p-2 bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-3 rounded border border-gray-200 ">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded">
              <DollarSign size={20} />
            </div>
            <span className="flex items-center gap-1 text-green-600 text-xs ">
              <ArrowUpRight size={14} /> 12%
            </span>
          </div>
          <p className="text-xs text-gray-500    mb-1">Total Pipeline</p>
          <h3 className="text-xl  text-gray-900">${metrics.totalPipeline.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-3 rounded border border-gray-200 ">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded">
              <TrendingUp size={20} />
            </div>
            <span className="flex items-center gap-1 text-green-600 text-xs ">
              <ArrowUpRight size={14} /> 8.4%
            </span>
          </div>
          <p className="text-xs text-gray-500    mb-1">Weighted Forecast</p>
          <h3 className="text-xl  text-gray-900">${Math.round(metrics.weightedForecast).toLocaleString()}</h3>
        </div>

        <div className="bg-white p-3 rounded border border-gray-200 ">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-green-50 text-green-600 rounded">
              <Target size={20} />
            </div>
            <span className="flex items-center gap-1 text-blue-600 text-xs ">
              <Zap size={14} /> AI Score
            </span>
          </div>
          <p className="text-xs text-gray-500    mb-1">Actual Revenue</p>
          <h3 className="text-xl  text-gray-900">${metrics.actualRevenue.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-3 rounded border border-gray-200 ">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-orange-50 text-orange-600 rounded">
              <BarChart3 size={20} />
            </div>
            <span className="text-orange-600 text-xs ">
              Avg {Math.round(metrics.avgProbability)}%
            </span>
          </div>
          <p className="text-xs text-gray-500    mb-1">Forecast Confidence</p>
          <h3 className="text-xl  text-gray-900">Medium</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Forecast Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded border border-gray-200 ">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg  text-gray-900">Revenue Projection</h3>
              <p className="text-xs text-gray-500 mt-0.5">Projected vs Weighted vs Actual revenue</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs text-gray-500  ">Projected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-xs text-gray-500  ">Weighted</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickFormatter={(val) => `$${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val) => `$${val.toLocaleString()}`}
                />
                <Bar dataKey="projected" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                <Line type="monotone" dataKey="weighted" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} />
                <Area type="monotone" dataKey="actual" fill="#10b981" fillOpacity={0.1} stroke="#10b981" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline by Stage */}
        <div className="bg-white p-6 rounded border border-gray-200 ">
          <h3 className="text-lg  text-gray-900 mb-6">Pipeline by Stage</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => `$${val.toLocaleString()}`} />
                <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-4">
            {stageData.slice(0, 3).map((stage, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-gray-700">{stage.name}</span>
                  <span className=" text-gray-900">${stage.value.toLocaleString()}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(stage.value / metrics.totalPipeline) * 100}%`, backgroundColor: COLORS[i] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Opportunities */}
      <div className="bg-white rounded border border-gray-200  overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className=" text-gray-900">Top Revenue Opportunities</h3>
          <button className="text-xs text-blue-600  hover:underline">View All Deals</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3  text-gray-600">Deal Name</th>
                <th className="px-4 py-3  text-gray-600">Stage</th>
                <th className="px-4 py-3  text-gray-600">Value</th>
                <th className="px-4 py-3  text-gray-600">Probability</th>
                <th className="px-4 py-3  text-gray-600">Weighted</th>
                <th className="px-4 py-3  text-gray-600">Expected Close</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deals
                .sort((a, b) => b.deal_value - a.deal_value)
                .slice(0, 5)
                .map((deal, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{deal.deal_name || deal.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs  bg-blue-50 text-blue-700 border border-blue-100">
                        {deal.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3  text-gray-900">${(parseFloat(deal.deal_value) || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-16">
                          <div
                            className="h-full bg-orange-500"
                            style={{ width: `${deal.probability}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{deal.probability}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3  text-purple-600">
                      ${Math.round((parseFloat(deal.deal_value) || 0) * (parseFloat(deal.probability) || 0) / 100).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'TBD'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RevenueForecastPage;
