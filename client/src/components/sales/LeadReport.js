import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Download, Filter, ChevronLeft, ChevronRight, Search } from 'lucide-react';
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

const leadReportData = {
  yearBars: [
    { month: 'Jan', value: 400 },
    { month: 'Feb', value: 130 },
    { month: 'Mar', value: 240 },
    { month: 'Apr', value: 450 },
    { month: 'May', value: 250 },
    { month: 'Jun', value: 180 },
    { month: 'Jul', value: 300 },
    { month: 'Aug', value: 240 },
    { month: 'Sep', value: 300 },
    { month: 'Oct', value: 150 },
    { month: 'Nov', value: 250 },
    { month: 'Dec', value: 500 },
  ],
  sourcePie: [
    { name: 'Campaigns', value: 44, color: '#1f93ff' },
    { name: 'Google', value: 55, color: '#6a15ff' },
    { name: 'Referrals', value: 41, color: '#ff3b30' },
    { name: 'Paid Social', value: 17, color: '#ff9800' },
  ],
};

const COLORS = ['#1f93ff', '#6a15ff', '#ff3b30', '#ff9800'];

function StatusBadge({ status }) {
  const map = {
    Closed: 'bg-green-100 text-green-700',
    'Not Closed': 'bg-blue-100 text-blue-700',
    Contacted: 'bg-yellow-100 text-yellow-700',
    Lost: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`p-1  rounded text-xs  ${map[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function LeadsByYearChart({ data }) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#10bdbd" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LeadsBySourceDonut({ data }) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4}>
            {data.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.color || COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Legend verticalAlign="bottom" height={36} />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function LeadsTable({ rows }) {
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    let tmp = rows.filter((r) => {
      const all = `${r.name} ${r.company} ${r.phone} ${r.status}`.toLowerCase();
      return all.includes(q.toLowerCase());
    });
    tmp = tmp.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === 'created') {
        av = a.created;
        bv = b.created;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return tmp;
  }, [rows, q, sortKey, sortDir]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <div className="mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
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
          <button className="bg-red-600 text-white p-2  rounded text-xs  hover:bg-red-700 flex items-center gap-2">
            <Download size={14} /> Download Report
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded ">
        <table className="w-full text-xs ">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-3 px-4 text-left">
                <input type="checkbox" className="w-4 h-4" />
              </th>
              <th className="py-3 px-4 text-left cursor-pointer   text-gray-700" onClick={() => toggleSort('name')}>
                Lead Name {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th className="py-3 px-4 text-left cursor-pointer   text-gray-700" onClick={() => toggleSort('company')}>
                Company Name {sortKey === 'company' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th className="py-3 px-4 text-left   text-gray-700">Phone</th>
              <th className="py-3 px-4 text-left cursor-pointer   text-gray-700" onClick={() => toggleSort('status')}>
                Lead Status {sortKey === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th className="py-3 px-4 text-left cursor-pointer   text-gray-700" onClick={() => toggleSort('created')}>
                Created Date {sortKey === 'created' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th className="py-3 px-4 text-left   text-gray-700">Lead Owner</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <input type="checkbox" className="w-4 h-4" />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <img src={r.avatar} alt={r.name} className="w-8 h-8 rounded-full object-cover" />
                    <span className="  text-gray-900">{r.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs  text-gray-700">
                      {r.company.charAt(0)}
                    </div>
                    <div>
                      <div className="text-gray-900">{r.company}</div>
                      <div className="text-xs text-gray-500">{r.companySub}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-700">{r.phone}</td>
                <td className="py-3 px-4">
                  <StatusBadge status={r.status} />
                </td>
                <td className="py-3 px-4 text-gray-700">{r.created}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <img src={r.owner.avatar} alt={r.owner.name} className="w-7 h-7 rounded-full object-cover" />
                    <span className="text-gray-900">{r.owner.name}</span>
                  </div>
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
          <div className="text-xs  text-gray-600">
            Page {page} of {pages}
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

const LeadReport = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
        const response = await fetch(`${apiUrl}/leads`);
        if (!response.ok) throw new Error('Failed to fetch leads');
        let data = await response.json();

        console.log('✅ LeadReport - API Response:', data);

        if (!Array.isArray(data)) {
          data = data?.data || data?.leads || [];
        }

        console.log('✅ LeadReport - Extracted leads:', data);

        if (Array.isArray(data)) {
          const formattedLeads = data.map((lead, index) => ({
            id: lead.id,
            name: lead.lead_name || 'Unknown Lead',
            avatar: `https://i.pravatar.cc/100?img=${index}`,
            company: lead.company || 'N/A',
            companySub: lead.industry || 'N/A',
            phone: lead.phone || 'N/A',
            status: lead.lead_status || 'New',
            created: lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A',
            owner: {
              name: lead.owner_first_name && lead.owner_last_name
                ? `${lead.owner_first_name} ${lead.owner_last_name}`
                : 'Unassigned',
              avatar: `https://i.pravatar.cc/100?img=${index + 20}`
            },
          }));

          console.log('✅ LeadReport - Formatted leads:', formattedLeads);
          setLeads(formattedLeads);
          setError('');
        } else {
          throw new Error('Invalid data format');
        }
      } catch (err) {
        console.error('❌ Error fetching leads:', err);
        setError(err.message || 'Failed to fetch leads');
        setLeads([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl  text-gray-900">Lead Report</h1>
            <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs ">{leads.length}</span>
          </div>
          <div className="flex items-center gap-2 text-xs ">
            <a href="/" className="text-orange-500 hover:text-orange-600  ">
              Home
            </a>
            <span className="text-gray-300">/</span>
            <span className="text-gray-600">Lead Report</span>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded  border border-gray-200p-3  ">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-md  text-gray-900">Leads By Year</h2>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-[#1F2020]" />
                <select className="border border-gray-200 rounded px-3 py-1 text-xs  bg-white">
                  <option>2025</option>
                </select>
              </div>
            </div>
            <LeadsByYearChart data={leadReportData.yearBars} />
          </div>

          {/* Right Column - Donut Chart */}
          <div className="bg-white rounded  border border-gray-200p-3  ">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-md  text-gray-900">Leads By Source</h2>
              <select className="border border-gray-200 rounded px-3 py-1 text-xs  bg-white">
                <option>2025</option>
              </select>
            </div>
            <LeadsBySourceDonut data={leadReportData.sourcePie} />
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded  border border-gray-200p-3  ">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading leads...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">Error: {error}</div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No leads found</div>
          ) : (
            <LeadsTable rows={leads} />
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

export default LeadReport;
