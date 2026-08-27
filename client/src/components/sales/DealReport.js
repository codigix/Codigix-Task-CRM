import React, { useState, useEffect, useMemo } from 'react';
import { Download, Filter, ChevronLeft, ChevronRight, Search, ChevronDown } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const dealReportData = {
  dealsByYear: [
    { month: 'Feb', won: 100, lost: 40 },
    { month: 'Mar', won: 80, lost: 50 },
    { month: 'Apr', won: 100, lost: 40 },
    { month: 'May', won: 80, lost: 45 },
    { month: 'Jun', won: 85, lost: 30 },
    { month: 'Jul', won: 100, lost: 40 },
    { month: 'Aug', won: 90, lost: 35 },
    { month: 'Sep', won: 110, lost: 45 },
    { month: 'Oct', won: 100, lost: 60 },
  ],
  leadsBySource: [
    { name: 'Campaigns', value: 44, color: '#1f93ff' },
    { name: 'Google', value: 55, color: '#6a15ff' },
    { name: 'Referrals', value: 41, color: '#fbbf24' },
    { name: 'Paid Social', value: 17, color: '#ff6b35' },
  ],
};

function DealsByYearChart({ data }) {
  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="won" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="lost" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LeadsBySourceChart({ data }) {
  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
            {data.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.color} />
            ))}
          </Pie>
          <Legend verticalAlign="bottom" height={36} />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function TagBadge({ tag }) {
  const tagColors = {
    Rated: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
    Collab: 'bg-blue-100 text-blue-700 border border-blue-300',
    Rejected: 'bg-red-100 text-red-700 border border-red-300',
    Promotion: 'bg-red-100 text-red-700 border border-red-300',
  };
  return (
    <span className={`p-1  rounded text-xs   ${tagColors[tag] || 'bg-gray-100 text-gray-700'}`}>
      {tag}
    </span>
  );
}

function StatusBadge({ status }) {
  const statusColors = {
    'Proposal': 'bg-blue-500 text-white',
    'Negotiation': 'bg-orange-500 text-white',
    'Approval': 'bg-purple-500 text-white',
    'Won': 'bg-green-500 text-white',
    'Lost': 'bg-red-500 text-white',
    'Project Creation': 'bg-indigo-500 text-white',
  };
  return (
    <span className={`p-1  rounded text-xs  ${statusColors[status] || 'bg-gray-500 text-white'}`}>
      {status}
    </span>
  );
}

function DealsTable({ rows }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    let tmp = rows.filter((r) => {
      const all = `${r.name} ${r.stage} ${r.value} ${r.status} ${r.company} ${r.contact}`.toLowerCase();
      return all.includes(q.toLowerCase());
    });
    return tmp;
  }, [rows, q]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1F2020]" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded text-xs  bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2  border border-gray-200 rounded text-xs  bg-white hover:bg-gray-50 flex items-center gap-2">
            <Filter size={14} /> Filter
          </button>
          <div className="p-2  border border-gray-200 rounded text-xs  bg-white text-gray-700">
            1 Dec 25 - 1 Dec 25
          </div>
          <button className="p-2  border border-gray-200 rounded text-xs  bg-white hover:bg-gray-50 flex items-center gap-2">
            <ChevronDown size={14} /> Sort By
          </button>
          <button className="p-2  border border-gray-200 rounded text-xs  bg-white hover:bg-gray-50 flex items-center gap-2">
            <ChevronDown size={14} /> Manage Columns
          </button>
          <button className="bg-red-600 text-white p-2  rounded text-xs  hover:bg-red-700 flex items-center gap-2">
            <Download size={14} /> Download Report
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded ">
        <table className="w-full text-xs ">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-3 px-4 text-left w-12">
                <input type="checkbox" className="w-4 h-4" />
              </th>
              <th className="py-3 px-4 text-left   text-gray-700">Deal Name</th>
              <th className="py-3 px-4 text-left   text-gray-700">Company</th>
              <th className="py-3 px-4 text-left   text-gray-700">Contact</th>
              <th className="py-3 px-4 text-left   text-gray-700">Stage</th>
              <th className="py-3 px-4 text-left   text-gray-700">Deal Value</th>
              <th className="py-3 px-4 text-left   text-gray-700">Probability</th>
              <th className="py-3 px-4 text-left   text-gray-700">Expected Close Date</th>
              <th className="py-3 px-4 text-left   text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <input type="checkbox" className="w-4 h-4" />
                </td>
                <td className="py-3 px-4 text-gray-900  ">{r.name}</td>
                <td className="py-3 px-4 text-gray-700">{r.company}</td>
                <td className="py-3 px-4 text-gray-700">{r.contact}</td>
                <td className="py-3 px-4 text-gray-700">{r.stage}</td>
                <td className="py-3 px-4 text-gray-900  ">{r.currency} {r.value.toFixed(2)}</td>
                <td className="py-3 px-4 text-gray-900  ">{r.probability}%</td>
                <td className="py-3 px-4 text-gray-700">{r.expectedClose}</td>
                <td className="py-3 px-4">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs  text-gray-600">Show</span>
          <select className="border border-gray-200 rounded p-1  text-xs ">
            <option>10</option>
            <option>25</option>
            <option>50</option>
          </select>
          <span className="text-xs  text-gray-600">entries</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="p-2 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="text-xs  text-gray-600 bg-red-600 text-white px-3 py-1 rounded ">
            {page}
          </div>
          <button
            disabled={page === pages}
            onClick={() => setPage(page + 1)}
            className="p-2 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

const DealReport = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
        const response = await fetch(`${apiUrl}/deals`);
        if (!response.ok) throw new Error('Failed to fetch deals');
        let data = await response.json();

        if (!Array.isArray(data)) {
          data = data?.data || data?.deals || [];
        }

        if (Array.isArray(data)) {
          const formattedDeals = data.map((deal) => ({
            id: deal.id,
            name: deal.deal_name || 'Untitled Deal',
            stage: deal.deal_stage || deal.stage || 'Prospecting',
            value: parseFloat(deal.deal_value) || 0,
            currency: deal.currency || 'USD',
            contact: deal.contact_first_name && deal.contact_last_name ? `${deal.contact_first_name} ${deal.contact_last_name}` : 'N/A',
            company: deal.company_name || 'N/A',
            assignee: deal.assignee_first_name && deal.assignee_last_name ? `${deal.assignee_first_name} ${deal.assignee_last_name}` : 'N/A',
            tags: deal.tags ? (typeof deal.tags === 'string' ? [deal.tags] : deal.tags) : [],
            expectedClose: deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'N/A',
            probability: deal.probability || 50,
            status: deal.deal_stage || deal.status || 'open',
          }));

          setDeals(formattedDeals);
          setError('');
        } else {
          throw new Error('Invalid data format');
        }
      } catch (err) {
        console.error('❌ Error fetching deals:', err);
        setError(err.message || 'Failed to fetch deals');
        setDeals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, []);

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl  text-gray-900">Deal Report</h1>
            <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs ">{deals.length}</span>
          </div>
          <div className="flex items-center gap-2 text-xs ">
            <a href="/" className="text-orange-500 hover:text-orange-600  ">
              Home
            </a>
            <span className="text-gray-300">/</span>
            <span className="text-gray-600">Deal Report</span>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded  border border-gray-200p-3  ">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-md  text-gray-900">Deals By Year</h2>
              <select className="border border-gray-200 rounded px-3 py-1 text-xs  bg-white text-gray-700">
                <option>2025</option>
              </select>
            </div>
            <DealsByYearChart data={dealReportData.dealsByYear} />
          </div>

          {/* Right Column - Donut Chart */}
          <div className="bg-white rounded  border border-gray-200p-3  ">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-md  text-gray-900">Leads By Source</h2>
              <select className="border border-gray-200 rounded px-3 py-1 text-xs  bg-white text-gray-700">
                <option>2025</option>
              </select>
            </div>
            <LeadsBySourceChart data={dealReportData.leadsBySource} />
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded  border border-gray-200p-3  ">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading deals...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">Error: {error}</div>
          ) : deals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No deals found</div>
          ) : (
            <DealsTable rows={deals} />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white py-4 text-center">
        <p className="text-xs text-gray-500">
          Copyright © 2025 <span className=" text-red ">Preadmin</span>
        </p>
      </div>
    </div>
  );
};

export default DealReport;
