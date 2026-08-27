import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const HRDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl text-gray-900 tracking-tight">HR Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.first_name || user?.name || 'HR Professional'}! Here is an overview of HR activities.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Placeholder cards for HR stats */}
        <div className="bg-white p-4 rounded border border-gray-100 shadow-sm flex flex-col justify-between h-32">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total Employees</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl text-gray-900 tracking-tight">0</h3>
          </div>
        </div>
        <div className="bg-white p-4 rounded border border-gray-100 shadow-sm flex flex-col justify-between h-32">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">On Leave Today</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl text-gray-900 tracking-tight">0</h3>
          </div>
        </div>
        <div className="bg-white p-4 rounded border border-gray-100 shadow-sm flex flex-col justify-between h-32">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Open Positions</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl text-gray-900 tracking-tight">0</h3>
          </div>
        </div>
        <div className="bg-white p-4 rounded border border-gray-100 shadow-sm flex flex-col justify-between h-32">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Pending Approvals</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl text-gray-900 tracking-tight">0</h3>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded border border-gray-100 p-6 shadow-sm min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-2">More HR modules coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
