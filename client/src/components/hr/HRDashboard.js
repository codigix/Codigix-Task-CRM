import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Users, UserX, Briefcase, FileText, ChevronRight, Clock, Calendar, TrendingUp } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const HRDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/hr/dashboard`);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching HR dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl  text-gray-900 tracking-tight">HR Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.first_name || user?.name || 'HR Professional'}! Here is an overview of HR activities.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-between  hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total Employees</p>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={18} /></div>
          </div>
          <h3 className="text-xl  text-gray-900">{loading ? '...' : data?.total_employees || 0}</h3>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-between  hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">On Leave Today</p>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><UserX size={18} /></div>
          </div>
          <h3 className="text-xl  text-gray-900">{loading ? '...' : data?.on_leave_today || 0}</h3>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-between  hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Open Positions</p>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Briefcase size={18} /></div>
          </div>
          <h3 className="text-xl  text-gray-900">{loading ? '...' : data?.open_positions || 0}</h3>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-between  hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Pending Approvals</p>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><FileText size={18} /></div>
          </div>
          <h3 className="text-xl  text-gray-900">{loading ? '...' : data?.pending_approvals || 0}</h3>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Widget */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              <h2 className="text-base font-medium text-gray-800">Today's Attendance</h2>
            </div>
            <Link to={`/hr/${user?.designation || 'hr'}/${user?.username || 'admin'}/attendance`} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center">
              Show All <ChevronRight size={16} />
            </Link>
          </div>
          <div className="p-0 flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : data?.recent_attendance?.length > 0 ? (
              <ul className="divide-y divide-gray-50">
                {data.recent_attendance.map((record, i) => (
                  <li key={i} className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{record.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Checked in at {record.time}</p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      {record.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">No attendance records today.</div>
            )}
          </div>
        </div>

        {/* Leaves Widget */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-orange-600" />
              <h2 className="text-base font-medium text-gray-800">Leave Requests</h2>
            </div>
            <Link to={`/hr/${user?.designation || 'hr'}/${user?.username || 'admin'}/leave-requests`} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center">
              Show All <ChevronRight size={16} />
            </Link>
          </div>
          <div className="p-0 flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : data?.recent_leaves?.length > 0 ? (
              <ul className="divide-y divide-gray-50">
                {data.recent_leaves.map((leave, i) => (
                  <li key={i} className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{leave.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{leave.type} ({leave.dates})</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${leave.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {leave.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">No recent leave requests.</div>
            )}
          </div>
        </div>

        {/* Performance Widget */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-purple-600" />
              <h2 className="text-base font-medium text-gray-800">Performance</h2>
            </div>
            <Link to={`/hr/${user?.designation || 'hr'}/${user?.username || 'admin'}/performance`} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center">
              Show All <ChevronRight size={16} />
            </Link>
          </div>
          <div className="p-0 flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : data?.recent_performance?.length > 0 ? (
              <ul className="divide-y divide-gray-50">
                {data.recent_performance.map((perf, i) => (
                  <li key={i} className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{perf.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{perf.department}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${perf.rating === 'Excellent' ? 'bg-green-100 text-green-800' : perf.rating === 'Good' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                      {perf.rating}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">No recent performance reviews.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
