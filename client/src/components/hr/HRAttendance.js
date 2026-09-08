import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';
import { Clock, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const HRAttendance = () => {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/hr/attendance`);
        setAttendanceData(response.data);
      } catch (err) {
        console.error('Failed to fetch attendance:', err);
        setError('Failed to fetch attendance data from the backend integration.');
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200 flex items-center gap-1 w-max"><CheckCircle size={14} /> Present</span>;
      case 'absent':
        return <span className="px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium border border-red-200 flex items-center gap-1 w-max"><XCircle size={14} /> Absent</span>;
      default:
        return <span className="px-2 py-1 bg-gray-50 text-gray-700 rounded-full text-xs font-medium border border-gray-200 w-max">{status || 'Unknown'}</span>;
    }
  };

  const formatTimeOnly = (timeStr) => {
    if (!timeStr || timeStr === '-') return '-';
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return timeStr;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return timeStr;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl  text-gray-900 tracking-tight">Employee Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor daily check-ins and check-outs across the organization.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-800 flex items-center gap-2">
            <Calendar size={18} className="text-blue-500" /> Today's Roster
          </h2>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              Loading attendance records from Supabase...
            </div>
          ) : attendanceData.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-4 font-medium">Employee</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Check-In</th>
                  <th className="px-6 py-4 font-medium">Check-Out</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.map((record, index) => (
                  <tr key={record.id || index} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center  text-xs uppercase">
                          {record.employee_name ? record.employee_name[0] : 'U'}
                        </div>
                        <span className="font-medium text-gray-900">{record.employee_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{record.role || 'Employee'}</td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{record.date}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        {record.check_in !== '-' && <Clock size={14} className="text-green-500" />}
                        {formatTimeOnly(record.check_in)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        {record.check_out !== '-' && <Clock size={14} className="text-red-400" />}
                        {formatTimeOnly(record.check_out)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(record.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <Calendar size={32} className="text-gray-300 mb-2" />
              <p>No attendance records found for today.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HRAttendance;
