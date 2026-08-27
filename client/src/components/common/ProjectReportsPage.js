import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
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

const generateMonthlyData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map((month) => ({
    month,
    value: Math.floor(Math.random() * 50000 + 15000)
  }));
};

const stageColors = {
  'Plan': '#6366f1',
  'Develop': '#0ea5e9',
  'Completed': '#22c55e',
  'Design': '#ff9800',
};

const projectReportData = {
  yearLine: generateMonthlyData(),
  stageData: [
    { name: 'Plan', value: 34, color: '#6366f1' },
    { name: 'Completed', value: 55, color: '#22c55e' },
    { name: 'Develop', value: 50, color: '#0ea5e9' },
    { name: 'Design', value: 17, color: '#ff9800' },
  ],
};

const ProjectIcon = ({ name, index }) => {
  const colors = ['#6366f1', '#0ea5e9', '#22c55e', '#ff9800', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6'];
  const firstLetter = name ? name.charAt(0).toUpperCase() : 'P';
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs " style={{ backgroundColor: colors[index % colors.length] }}>
      {firstLetter}
    </div>
  );
};

const PriorityBadge = ({ priority }) => {
  const map = {
    High: 'bg-red-100 text-red ',
    Medium: 'bg-yellow-100 text-yellow-600',
    Low: 'bg-green-100 text-green-600',
  };
  return (
    <span className={`text-xs  p-1  rounded ${map[priority] || 'bg-gray-100 text-gray-600'}`}>
      {priority}
    </span>
  );
};

const StatusPill = ({ status }) => {
  const map = {
    Active: 'bg-green-500 text-white',
    Inactive: 'bg-red-500 text-white',
  };
  return (
    <span className={`text-xs  p-1  rounded ${map[status] || 'bg-gray-500 text-white'}`}>
      {status}
    </span>
  );
};

function ProjectsByYearChart({ data }) {
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} />
          <YAxis tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} tick={{ fontSize: 12, fill: '#6B7280' }} />
          <Tooltip formatter={(v) => new Intl.NumberFormat().format(v)} />
          <Line type="monotone" dataKey="value" stroke="#ff1744" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProjectsByStageChart({ data }) {
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} innerRadius={60} outerRadius={95} dataKey="value" paddingAngle={3}>
            {data.map((d, i) => (
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

function ProjectsTable({ rows }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => `${r.name} ${r.client}`.toLowerCase().includes(q));
  }, [rows, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1F2020]" />
            <input
              type="text"
              placeholder="Search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded  focus:outline-none focus:border-gray-400 text-xs  bg-white"
            />
          </div>
          <button className="p-2 border border-gray-300 rounded  text-gray-600 text-xs    hover:bg-gray-50 flex items-center gap-2">
            <Filter size={16} /> Filter
          </button>
          <div className="text-xs  text-gray-600">
            <span>1 Dec 25 - 1 Dec 25</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 border border-gray-300 rounded  text-gray-600 text-xs    hover:bg-gray-50 flex items-center gap-2">
            Sort By <ChevronDown size={14} />
          </button>
          <button className="p-2 border border-gray-300 rounded  text-gray-600 text-xs    hover:bg-gray-50">
            Manage Columns
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs ">
          <thead>
            <tr className="text-xs text-gray-600 bg-gray-50 border-b border-gray-200">
              <th className="py-3 px-4 text-left w-8">
                <input type="checkbox" className="cursor-pointer" />
              </th>
              <th className="py-3 px-4 text-left ">Name</th>
              <th className="py-3 px-4 text-left ">Client</th>
              <th className="py-3 px-4 text-left ">Priority</th>
              <th className="py-3 px-4 text-left ">Start Date</th>
              <th className="py-3 px-4 text-left ">End Date</th>
              <th className="py-3 px-4 text-left ">Pipeline Stage</th>
              <th className="py-3 px-4 text-left ">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((r, i) => (
              <tr key={r.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <input type="checkbox" className="cursor-pointer" />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <ProjectIcon name={r.name} index={i} />
                    <span className="text-gray-800  ">{r.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <img src={r.clientLogo} alt={r.client} className="w-6 h-6 rounded-full object-cover" />
                    <span className="text-gray-600">{r.client}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <PriorityBadge priority={r.priority} />
                </td>
                <td className="py-3 px-4 text-gray-600">{r.startDate}</td>
                <td className="py-3 px-4 text-gray-600">{r.endDate}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.stageColor }}></div>
                    <span className="text-gray-700">{r.stage}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <StatusPill status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-xs  text-gray-600">
        <div>
          Show{' '}
          <select className="border border-gray-300 rounded p-1  text-xs  inline-block" defaultValue="10">
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>{' '}
          entries
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <button className="px-3 py-1 bg-red-600 text-white rounded   text-xs ">{page}</button>
          <button
            onClick={() => setPage(Math.min(pages, page + 1))}
            disabled={page === pages}
            className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div>About · Terms · Contact Us</div>
      </div>
    </div>
  );
}

export default function ProjectReportsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
        const response = await fetch(`${apiUrl}/projects`);
        if (!response.ok) throw new Error('Failed to fetch projects');
        let data = await response.json();

        if (!Array.isArray(data)) {
          data = data?.data || data?.projects || [];
        }

        if (Array.isArray(data)) {
          const formattedProjects = data.map((project, index) => ({
            id: project.id,
            name: project.name || project.title || 'Untitled Project',
            client: project.company_name || 'No Company',
            clientLogo: `https://i.pravatar.cc/40?img=${index}`,
            priority: project.priority || 'Medium',
            startDate: project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A',
            endDate: project.end_date ? new Date(project.end_date).toLocaleDateString() : 'N/A',
            stage: project.status || 'Plan',
            stageColor: stageColors[project.status] || '#6366f1',
            status: project.status === 'Completed' ? 'Active' : 'Inactive',
          }));

          setProjects(formattedProjects);
          setError('');
        } else {
          throw new Error('Invalid data format');
        }
      } catch (err) {
        console.error('❌ Error fetching projects:', err);
        setError(err.message || 'Failed to fetch projects');
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl  text-gray-900">Project Reports</h1>
              <span className="bg-red-100 text-red  px-3 py-1 rounded text-xs  ">{projects.length}</span>
            </div>
            <div className="flex items-center gap-1 text-xs  mt-1">
              <button className="text-orange-500 hover:text-orange-600   bg-transparent border-none cursor-pointer p-0">
                Home
              </button>
              <span className="text-gray-300">/</span>
              <span className="text-gray-600">Project Reports</span>
            </div>
          </div>
          <button className="bg-red-600 text-white p-2  rounded   flex items-center gap-2 hover:bg-red-700 transition text-xs ">
            <Download size={16} /> Download Report
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded  border border-gray-200 p-3 ">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-md  text-gray-900">Projects By Year</h2>
              <button className="text-[#1F2020] hover:text-gray-600 p-1 rounded hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            </div>
            <div className="mb-4">
              <select className="px-3 py-1 border border-gray-300 rounded text-xs  bg-white">
                <option>2025</option>
                <option>2024</option>
                <option>2023</option>
              </select>
            </div>
            <ProjectsByYearChart data={projectReportData.yearLine} />
          </div>

          <div className="bg-white rounded  border border-gray-200 p-3 ">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs  text-gray-900">Projects By Stage</h2>
              <div className="relative">
                <button className="text-red  bg-red-50 p-2 rounded-full hover:bg-red-100">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                    <circle cx="5" cy="12" r="2" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="mb-4">
              <select className="px-3 py-1 border border-gray-300 rounded text-xs  bg-white">
                <option>2025</option>
                <option>2024</option>
                <option>2023</option>
              </select>
            </div>
            <ProjectsByStageChart data={projectReportData.stageData} />
          </div>
        </div>

        <div className="bg-white rounded  border border-gray-200 p-3 ">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading projects...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">Error: {error}</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No projects found</div>
          ) : (
            <ProjectsTable rows={projects} />
          )}
        </div>
      </div>

      <footer className="p-2  text-xs text-gray-500 text-center border-t border-gray-200 bg-white mt-6">
        <p>
          Copyright © 2025 <span className="text-red  ">Preadmin</span>
        </p>
      </footer>
    </div>
  );
}
