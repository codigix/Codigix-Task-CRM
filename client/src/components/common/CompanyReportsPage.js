import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
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

const COLORS = ['#4F46E5', '#DC2626', '#059669', '#7C3AED', '#1F2937', '#06B6D4', '#8B5CF6', '#EA580C', '#DB2777', '#3B82F6'];

const generateMonthlyData = (companies) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map((month, idx) => ({
    month,
    value: Math.floor(companies.length / 12 * (idx + 1))
  }));
};

const CompanyLogo = ({ name, color }) => (
  <div
    className="w-8 h-8 rounded flex items-center justify-center text-white text-xs "
    style={{ backgroundColor: color }}
  >
    {name.charAt(0)}
  </div>
);

const Tag = ({ text }) => {
  const tagColors = {
    Active: 'bg-green-50 text-green-700 border-green-200',
    Prospect: 'bg-blue-50 text-blue-700 border-blue-200',
    Inactive: 'bg-red-50 text-red-700 border-red-200',
  };
  const classes = tagColors[text] || 'bg-gray-50 text-gray-700 border-gray-200';
  return <span className={`text-xs  p-1  rounded border ${classes}`}>{text}</span>;
};

const StatusPill = ({ status }) => {
  const map = {
    Active: 'bg-green-500 text-white',
    Inactive: 'bg-red-500 text-white',
    Prospect: 'bg-blue-500 text-white',
  };
  return (
    <span className={`text-xs  p-1  rounded ${map[status] || 'bg-gray-500 text-white'}`}>
      {status}
    </span>
  );
};

const ContactIcon = ({ type, title }) => {
  const icons = {
    email: '✉',
    phone: '☎',
    chat: '💬',
    notes: '📝',
  };
  return (
    <span
      title={title}
      className="inline-flex items-center justify-center w-6 h-6 hover:bg-gray-100 rounded cursor-pointer text-gray-600 text-xs "
    >
      {icons[type] || '○'}
    </span>
  );
};

function CompaniesByYearChart({ data }) {
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} />
          <YAxis tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} tick={{ fontSize: 12, fill: '#6B7280' }} />
          <Tooltip formatter={(v) => new Intl.NumberFormat().format(v)} />
          <Line type="monotone" dataKey="value" stroke="#ff9800" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function CompanyStatusDonut({ data }) {
  const statusCounts = {};
  data.forEach(c => {
    const status = c.status || 'Active';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const chartData = Object.entries(statusCounts).map(([name, value], idx) => ({
    name,
    value,
    color: COLORS[idx % COLORS.length]
  }));

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={chartData} innerRadius={60} outerRadius={95} dataKey="value" paddingAngle={3}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Legend verticalAlign="bottom" height={30} />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function CompaniesTable({ rows }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => `${r.name} ${r.email} ${r.phone} ${r.industry}`.toLowerCase().includes(q));
  }, [rows, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search companies..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="w-full p-2 border border-gray-300 rounded  text-xs "
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs ">
          <thead>
            <tr className="text-xs text-gray-600 bg-gray-50 border-b border-gray-200">
              <th className="py-3 px-4 text-left w-8">
                <input type="checkbox" className="cursor-pointer" />
              </th>
              <th className="py-3 px-4 text-left ">Company Name</th>
              <th className="py-3 px-4 text-left ">Email</th>
              <th className="py-3 px-4 text-left ">Phone</th>
              <th className="py-3 px-4 text-left ">Industry</th>
              <th className="py-3 px-4 text-left ">Contacts</th>
              <th className="py-3 px-4 text-left ">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((r) => (
              <tr key={r.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <input type="checkbox" className="cursor-pointer" />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <CompanyLogo name={r.name} color={r.color} />
                    <span className="text-gray-800  ">{r.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600">{r.email}</td>
                <td className="py-3 px-4 text-gray-600">{r.phone}</td>
                <td className="py-3 px-4 text-gray-600">{r.industry || '-'}</td>
                <td className="py-3 px-4 text-gray-600">{r.contactCount || 0}</td>
                <td className="py-3 px-4">
                  <StatusPill status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageData.length === 0 && (
        <div className="text-center py-8 text-gray-500">No companies found</div>
      )}

      <div className="flex items-center justify-between mt-4 text-xs  text-gray-600">
        <div>
          Showing {pageData.length} of {filtered.length} companies
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ◀
          </button>
          <span className="text-gray-600">
            {page} / {pages}
          </span>
          <button
            className="px-3 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CompanyReportsPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';

        const companiesRes = await fetch(`${apiUrl}/companies`);

        if (!companiesRes.ok) throw new Error('Failed to fetch companies');

        let companiesData = await companiesRes.json();

        if (!Array.isArray(companiesData)) {
          companiesData = companiesData?.data || companiesData?.companies || [];
        }

        if (Array.isArray(companiesData)) {
          const formattedCompanies = companiesData.map((company, index) => ({
            id: company.id,
            name: company.company_name,
            email: company.email,
            phone: company.phone,
            website: company.website,
            industry: company.industry,
            status: company.status || 'Active',
            color: COLORS[index % COLORS.length],
            contactCount: company.contact_count || 0,
          }));

          setCompanies(formattedCompanies);
          setMonthlyData(generateMonthlyData(formattedCompanies));
          setError('');
        } else {
          throw new Error('Invalid data format');
        }
      } catch (err) {
        console.error('❌ Error fetching companies:', err);
        setError(err.message || 'Failed to fetch companies');
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl  text-gray-800">
              Company Reports{' '}
              <span className="text-xs  text-gray-500">({companies.length})</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">Home › Company Reports</p>
          </div>
          <button className="bg-red-600 text-white p-2  rounded  text-xs    hover:bg-red-700 flex items-center gap-2">
            <Download size={16} />
            Download Report
          </button>
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-500">Loading companies...</div>
        )}

        {error && (
          <div className="text-center py-12 text-red-500">Error: {error}</div>
        )}

        {!loading && !error && companies.length > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded   border border-gray-200p-3 ">
                <h3 className="text-base  text-gray-900 mb-4">Companies by Month</h3>
                <CompaniesByYearChart data={monthlyData} />
              </div>

              <div className="bg-white rounded   border border-gray-200p-3 ">
                <h3 className="text-base  text-gray-900 mb-4">Company Status Distribution</h3>
                <CompanyStatusDonut data={companies} />
              </div>
            </div>

            <div className="bg-white rounded   border border-gray-200p-3 ">
              <h3 className="text-base  text-gray-900 mb-4">Company List</h3>
              <CompaniesTable rows={companies} />
            </div>
          </>
        )}

        {!loading && !error && companies.length === 0 && (
          <div className="text-center py-12 text-gray-500">No companies found</div>
        )}
      </div>
    </div>
  );
}
