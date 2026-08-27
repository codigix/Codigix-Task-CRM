import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DateRangeDropdown from '../common/DateRangeDropdown';

const RecentDealsTable = ({ deals, onDateRangeChange }) => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('Last 15 Days');

  const getStatusColor = (status) => {
    switch (status) {
      case 'Won':
        return 'bg-green-100 text-green-800';
      case 'Lost':
        return 'bg-red-100 text-red-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-white rounded  border border-gray-100 ">
      <div className="p-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-sm   text-gray-900">Recently Created Deals</h2>
          <DateRangeDropdown
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            onDateRangeChange={onDateRangeChange}
            options={['Last 30 Days', 'Last 60 Days']}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-gray-100">
              <th className="p-2 text-xs  text-[#1F2020] ">Deal Name</th>
              <th className="p-2 text-xs text-[#1F2020] ">Stage</th>
              <th className="p-2 text-xs text-[#1F2020] ">Deal Value</th>
              <th className="p-2 text-xs text-[#1F2020] ">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {deals.slice(0, 5).map((deal) => (
              <tr key={deal.id} className="hover:bg-gray-50 transition-colors">
                <td 
                  className="p-2 text-xs text-gray-900 cursor-pointer hover:text-red-600 transition-colors"
                  onClick={() => navigate(`/deals/deal/${deal.id}`)}
                >
                  {deal.name || 'N/A'}
                </td>
                <td className="p-2  text-xs text-gray-500">{deal.stage || 'N/A'}</td>
                <td className="p-2  text-xs  text-gray-900">{formatCurrency(deal.value)}</td>
                <td className="p-2  text-xs">
                  <span className={`inline-flex items-center p-1  rounded text-xs      ${
                    deal.status === 'Won' ? 'bg-green-500 text-white' : 
                    deal.status === 'Lost' ? 'bg-red-500 text-white' : 
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {deal.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deals.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">No deals found</p>
        </div>
      )}
    </div>
  );
};

export default RecentDealsTable;
