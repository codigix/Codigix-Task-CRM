import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { invoicesAPI } from '../../services/api';

const InvoiceDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('month');

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [metricsData, breakdownData] = await Promise.all([
        invoicesAPI.getMetrics(),
        invoicesAPI.getBreakdown()
      ]);

      setMetrics(metricsData);
      setBreakdown(breakdownData || []);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '$0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'bg-green-50 border-green-200';
      case 'Unpaid': return 'bg-red-50 border-red-200';
      case 'Partially Paid': return 'bg-yellow-50 border-yellow-200';
      case 'Overdue': return 'bg-orange-50 border-orange-200';
      case 'Draft': return 'bg-gray-50 border-gray-200';
      case 'Sent': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'Paid': return 'text-green-700';
      case 'Unpaid': return 'text-red-700';
      case 'Partially Paid': return 'text-yellow-700';
      case 'Overdue': return 'text-orange-700';
      case 'Draft': return 'text-gray-700';
      case 'Sent': return 'text-blue-700';
      default: return 'text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Paid': return '✓';
      case 'Unpaid': return '!';
      case 'Overdue': return '⚠';
      default: return '○';
    }
  };

  if (isLoading) {
    return (
      <div className="p-2 bg-[#F7F8F9] min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              <p className="mt-4 text-gray-600  ">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 bg-[#F7F8F9] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl  text-gray-900">Invoice Dashboard</h1>
            <div className="flex gap-2">
              {['week', 'month', 'quarter', 'year'].map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`p-2  rounded  text-xs    transition ${dateRange === range
                    ? 'bg-red-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs  text-gray-600  ">
            <button className="hover:text-gray-900">Home</button>
            <span className="text-[#1F2020]">›</span>
            <span className="text-gray-600">Dashboard</span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-8">
            {/* Total Invoices */}
            <div className="bg-white rounded-2xlp-3  border border-gray-100  hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs    text-gray-600">Total Invoices</h3>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="text-white " size={24} />
                </div>
              </div>
              <p className="text-xl  text-gray-900">{metrics.total_invoices || 0}</p>
              <p className="text-xs text-gray-500 mt-2">All time invoices created</p>
            </div>

            {/* Total Revenue */}
            <div className="bg-white rounded-2xlp-3  border border-gray-100  hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs    text-gray-600">Total Revenue</h3>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="text-green-600" size={24} />
                </div>
              </div>
              <p className="text-xl  text-gray-900">{formatCurrency(metrics.total_amount)}</p>
              <p className="text-xs text-gray-500 mt-2">Total invoice value</p>
            </div>

            {/* Amount Paid */}
            <div className="bg-white rounded-2xlp-3  border border-gray-100  hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs    text-gray-600">Amount Paid</h3>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="text-green-600" size={24} />
                </div>
              </div>
              <p className="text-3xl  text-green-600">{formatCurrency(metrics.total_paid)}</p>
              <p className="text-xs text-gray-500 mt-2">Successfully collected</p>
            </div>

            {/* Amount Due */}
            <div className="bg-white rounded-2xlp-3  border border-gray-100  hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs    text-gray-600">Amount Due</h3>
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="text-red " size={24} />
                </div>
              </div>
              <p className="text-3xl  text-red ">{formatCurrency(metrics.total_due)}</p>
              <p className="text-xs text-gray-500 mt-2">Outstanding amount</p>
            </div>
          </div>
        )}

        {/* Invoice Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-8">
          {/* Status Cards */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xlp-3  border border-gray-100 ">
              <h3 className="text-md  text-gray-900 mb-4">Invoice Status Breakdown</h3>
              <div className="space-y-3">
                {metrics && (
                  <>
                    <div className="flex items-center justify-between p-3 rounded  bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">✓</span>
                        <span className="text-xs    text-green-700">Paid</span>
                      </div>
                      <span className="text-lg  text-green-700">{metrics.paid_invoices || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded  bg-red-50 border border-red-200">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">!</span>
                        <span className="text-xs    text-red-700">Unpaid</span>
                      </div>
                      <span className="text-lg  text-red-700">{metrics.unpaid_invoices || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded  bg-orange-50 border border-orange-200">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">⚠</span>
                        <span className="text-xs    text-orange-700">Overdue</span>
                      </div>
                      <span className="text-lg  text-orange-700">{metrics.overdue_invoices || 0}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xlp-3  border border-gray-100 ">
              <h3 className="text-md  text-gray-900 mb-4">Detailed Status Report</h3>
              <div className="space-y-2">
                {breakdown && breakdown.length > 0 ? (
                  breakdown.map((status, idx) => {
                    const percentage = metrics ? Math.round((status.count / metrics.total_invoices) * 100) : 0;
                    return (
                      <div key={idx} className={`p-2 rounded  border ${getStatusColor(status.status)}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-lg  ${getStatusTextColor(status.status)}`}>
                              {getStatusIcon(status.status)}
                            </span>
                            <span className={`  ${getStatusTextColor(status.status)}`}>
                              {status.status}
                            </span>
                          </div>
                          <span className="text-xs   text-gray-700">{status.count} invoices</span>
                        </div>
                        <div className="space-y-1 text-xs ">
                          <div className="w-full bg-gray-300 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${status.status === 'Paid' ? 'bg-green-500' :
                                status.status === 'Unpaid' ? 'bg-red-500' :
                                  status.status === 'Partially Paid' ? 'bg-yellow-500' :
                                    status.status === 'Overdue' ? 'bg-orange-500' :
                                      'bg-gray-500'
                                }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>{percentage}%</span>
                            <span>{formatCurrency(status.total_amount)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-gray-500 py-8">No invoice data available</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-8">
          {/* Average Invoice Value */}
          <div className="bg-white rounded-2xlp-3  border border-gray-100 ">
            <h3 className="text-md  text-gray-900 mb-4">Average Invoice Value</h3>
            <div className="space-y-3">
              {breakdown && breakdown.length > 0 && (
                breakdown.map((status, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded  hover:bg-gray-50 transition">
                    <span className="text-xs    text-gray-700">{status.status}</span>
                    <span className="text-lg  text-gray-900">
                      {formatCurrency(status.average_amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Collection Rate */}
          <div className="bg-white rounded-2xlp-3  border border-gray-100 ">
            <h3 className="text-md  text-gray-900 mb-4">Collection Performance</h3>
            {metrics && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs    text-gray-700">Collection Rate</span>
                    <span className="text-lg  text-gray-900">
                      {metrics.total_amount > 0 ? Math.round((metrics.total_paid / metrics.total_amount) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all"
                      style={{ width: `${metrics.total_amount > 0 ? (metrics.total_paid / metrics.total_amount) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs ">
                  <div className="p-3 bg-green-50 rounded  border border-green-200">
                    <p className="text-green-600  ">Total Collected</p>
                    <p className="text-xl  text-green-700 mt-1">
                      {formatCurrency(metrics.total_paid)}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded  border border-red-200">
                    <p className="text-red   ">Still Pending</p>
                    <p className="text-xl  text-red-700 mt-1">
                      {formatCurrency(metrics.total_due)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-xs   ">
          © 2025 <span className="text-red  ">Preadmin</span> - Invoice Dashboard
        </div>
      </div>
    </div>
  );
};

export default InvoiceDashboard;
