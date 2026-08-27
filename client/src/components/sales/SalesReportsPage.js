import React, { useState, useEffect } from 'react';
import { FileText, Download, PieChart, BarChart, Calendar, Loader2 } from 'lucide-react';
import { salesAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import DataTable from '../common/DataTable';

const SalesReportsPage = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const columns = [
    {
      key: 'title',
      label: 'Report Name',
      sortable: true,
      render: (value, report) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-50 rounded">
            <FileText size={16} className="text-[#1F2020]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-[500] text-gray-900">{value}</span>
            {report.details && <span className="text-xs text-gray-500">{report.details}</span>}
          </div>
        </div>
      )
    },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'date', label: 'Date Generated', sortable: true },
    {
      key: 'format',
      label: 'Format',
      sortable: true,
      render: (value) => (
        <span className={`p-1  rounded text-xs  ${value === 'PDF' ? 'bg-red-50 text-red  border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'
          }`}>
          {value}
        </span>
      )
    },
    {
      key: 'action',
      label: 'Action',
      render: (_, report) => (
        <button className="flex items-center gap-1 text-[#F62416] hover:text-[#D91E12] text-xs  ">
          <Download size={14} /> Download
        </button>
      )
    }
  ];

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const isManager = user?.role === 'Admin' || user?.role === 'Sales Manager' || user?.role === 'Super Admin';
        const data = await salesAPI.getReports(isManager ? null : user?.id);
        setReports(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError('Failed to load reports.');
        setLoading(false);
      }
    };
    fetchReports();
  }, [user]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-red-500" size={40} />
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50 min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-xl font-[500] text-gray-900 mb-1">Reports</h1>
        <div className="flex items-center gap-1 text-xs  text-gray-500">
          <span>Home</span>
          <span>&gt;</span>
          <span>Sales Reports</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { title: 'Revenue', icon: <BarChart size={24} className="text-blue-500" /> },
          { title: 'Conversion', icon: <PieChart size={24} className="text-purple-500" /> },
          { title: 'Pipeline', icon: <FileText size={24} className="text-orange-500" /> },
          { title: 'Custom', icon: <Calendar size={24} className="text-green-500" /> },
        ].map((item, idx) => (
          <button key={idx} className="bg-white p-6 rounded border border-gray-200  hover:border-[#F62416] transition group text-left">
            <div className="mb-4">{item.icon}</div>
            <h3 className="text-[15px]  text-gray-900 group-hover:text-[#F62416] transition">{item.title} Report</h3>
            <p className="text-[12px] text-gray-500 mt-1">Generate detailed {item.title.toLowerCase()} analytics.</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded border border-gray-200  overflow-hidden">
        <DataTable
          title="Recent Reports"
          columns={columns}
          data={reports}
          searchKeys={['title', 'type']}
        />
      </div>
    </div>
  );
};

export default SalesReportsPage;
