import React, { useState } from 'react';
import DateRangeDropdown from '../common/DateRangeDropdown';

const RecentLeadsTable = ({ leads, onDateRangeChange }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('Last 15 Days');

  const getStatusColor = (status) => {
    switch (status) {
      case 'Qualified':
        return 'bg-green-100 text-green-800';
      case 'Contacted':
        return 'bg-blue-100 text-blue-800';
      case 'New':
        return 'bg-yellow-100 text-yellow-800';
      case 'Unqualified':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded  border border-border-light">
      <div className="p-2 border-b border-border-light">
        <div className="flex items-center justify-between">
          <h2 className="text-xs  text-gray-900">Recently Created Leads</h2>
          <DateRangeDropdown
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            onDateRangeChange={onDateRangeChange}
            options={['Last 15 Days', 'Last 30 Days']}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-border-light">
            <tr>
              <th className="p-2  text-left text-xs font-[500]   text-gray-900">Lead Name</th>
              <th className="p-2  text-left text-xs font-[500]   text-gray-900">Company Name</th>
              <th className="p-2  text-left text-xs font-[500]   text-gray-900">Phone</th>
              <th className="p-2  text-left text-xs font-[500]   text-gray-900">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {leads.slice(0, 5).map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-3 text-xs   text-gray-900">{lead.name}</td>
                <td className="p-3 text-xs text-gray-600">{lead.company}</td>
                <td className="p-3 text-xs text-gray-600">{lead.phone}</td>
                <td className="p-3 text-xs">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs   ${getStatusColor(lead.status)}`}>
                    {lead.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {leads.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">No leads found</p>
        </div>
      )}
    </div>
  );
};

export default RecentLeadsTable;
