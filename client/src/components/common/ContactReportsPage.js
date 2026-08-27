import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  Mail,
  Phone as PhoneIcon,
  Send,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
    value: Math.floor(Math.random() * 2500 + 1000)
  }));
};

const contactsReportData = {
  yearData: generateMonthlyData(),
  sourceData: [
    { name: 'Campaigns', value: 44, color: '#1f93ff' },
    { name: 'Google', value: 55, color: '#6a15ff' },
    { name: 'Referrals', value: 41, color: '#ff3b30' },
    { name: 'Paid Social', value: 17, color: '#ff9800' },
  ],
};

const COLORS = ['#1f93ff', '#6a15ff', '#ff3b30', '#ff9800'];

function ContactsByYearChart({ data }) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6a15ff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6a15ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#6a15ff"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ContactsBySourceDonut({ data }) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={4}
          >
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

function FilterPanel() {
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (key) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="bg-white rounded  border border-gray-200 p-2  mb-6">
      <div className="space-y-4">
        <div>
          <button
            onClick={() => toggleExpand('name')}
            className="w-full flex items-center justify-between text-xs   text-gray-900 py-2"
          >
            <span>Name</span>
            <ChevronDown
              size={16}
              className={`transition-transform ${expanded.name ? 'rotate-180' : ''}`}
            />
          </button>
          {expanded.name && (
            <div className="pl-4 space-y-2 mt-2">
              {['Elizabeth Morgan', 'Katherine Brooks', 'Sophia Lopez', 'John Michael', 'Natalie Brooks'].map(
                (name) => (
                  <label key={name} className="flex items-center gap-2 text-xs ">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span>{name}</span>
                  </label>
                )
              )}
              <button className="text-xs  text-white  hover:text-blue-700 mt-2">Load More</button>
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => toggleExpand('tags')}
            className="w-full flex items-center justify-between text-xs   text-gray-900 py-2"
          >
            <span>Tags</span>
            <ChevronDown
              size={16}
              className={`transition-transform ${expanded.tags ? 'rotate-180' : ''}`}
            />
          </button>
          {expanded.tags && (
            <div className="pl-4 space-y-2 mt-2">
              {['Collab', 'Promotion', 'VIP'].map((tag) => (
                <label key={tag} className="flex items-center gap-2 text-xs ">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span>{tag}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => toggleExpand('location')}
            className="w-full flex items-center justify-between text-xs   text-gray-900 py-2"
          >
            <span>Location</span>
            <ChevronDown
              size={16}
              className={`transition-transform ${expanded.location ? 'rotate-180' : ''}`}
            />
          </button>
          {expanded.location && (
            <div className="pl-4 space-y-2 mt-2">
              {['USA', 'UAE', 'Germany', 'France', 'India'].map((loc) => (
                <label key={loc} className="flex items-center gap-2 text-xs ">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span>{loc}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => toggleExpand('rating')}
            className="w-full flex items-center justify-between text-xs   text-gray-900 py-2"
          >
            <span>Rating</span>
            <ChevronDown
              size={16}
              className={`transition-transform ${expanded.rating ? 'rotate-180' : ''}`}
            />
          </button>
          {expanded.rating && (
            <div className="pl-4 space-y-2 mt-2">
              {['5.0', '4.0', '3.0', '2.0', '1.0'].map((rate) => (
                <label key={rate} className="flex items-center gap-2 text-xs ">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span>{rate}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => toggleExpand('status')}
            className="w-full flex items-center justify-between text-xs   text-gray-900 py-2"
          >
            <span>Status</span>
            <ChevronDown
              size={16}
              className={`transition-transform ${expanded.status ? 'rotate-180' : ''}`}
            />
          </button>
          {expanded.status && (
            <div className="pl-4 space-y-2 mt-2">
              {['Active', 'Inactive'].map((stat) => (
                <label key={stat} className="flex items-center gap-2 text-xs ">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span>{stat}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button className="flex-1 p-2 border border-gray-200 rounded text-xs  hover:bg-gray-50">
            Reset
          </button>
          <button className="flex-1 p-2 bg-red-600  text-white rounded text-xs  hover:bg-blue-700">
            Filter
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactsTable({ rows }) {
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showFilter, setShowFilter] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    phone: true,
    tag: true,
    location: true,
    rating: true,
    contact: true,
    status: true,
  });

  const filtered = useMemo(() => {
    let tmp = rows.filter((r) => {
      const all = `${r.name} ${r.phone} ${r.tag} ${r.location}`.toLowerCase();
      return all.includes(q.toLowerCase());
    });
    tmp = tmp.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
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

  function toggleColumn(col) {
    setVisibleColumns((prev) => ({
      ...prev,
      [col]: !prev[col],
    }));
  }

  const tagColors = {
    VIP: 'bg-yellow-100 text-yellow-700',
    Collab: 'bg-green-100 text-green-700',
    Promotion: 'bg-red-100 text-red-700',
  };

  const statusColors = {
    Active: 'bg-green-100 text-green-700',
    Inactive: 'bg-red-100 text-red-700',
  };

  return (
    <div className="mt-6">
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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="p-2  border border-gray-200 rounded text-xs  bg-white hover:bg-gray-50 flex items-center gap-2"
          >
            <Filter size={14} /> Filter
          </button>
          <div className="text-xs  text-gray-600 p-2">1 Dec 25 - 1 Dec 25</div>
          <button
            onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
            className="p-2  border border-gray-200 rounded text-xs  bg-white hover:bg-gray-50 flex items-center gap-2"
          >
            <ChevronDown size={14} /> Sort By
          </button>
          <div className="relative group">
            <button className="p-2  border border-gray-200 rounded text-xs  bg-white hover:bg-gray-50 flex items-center gap-2">
              <ChevronDown size={14} /> Manage Columns
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg hidden group-hover:block z-10">
              {Object.keys(visibleColumns).map((col) => (
                <label key={col} className="flex items-center gap-2 p-2  text-xs  hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={visibleColumns[col]}
                    onChange={() => toggleColumn(col)}
                    className="w-4 h-4"
                  />
                  <span className="capitalize">{col}</span>
                </label>
              ))}
            </div>
          </div>
          <button className="bg-red-600 text-white p-2  rounded text-xs  hover:bg-red-700 flex items-center gap-2">
            <Download size={14} /> Download Report
          </button>
        </div>
      </div>

      {showFilter && <FilterPanel />}

      <div className="overflow-x-auto border border-gray-200 rounded ">
        <table className="w-full text-xs ">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-3 px-4 text-left">
                <input type="checkbox" className="w-4 h-4" />
              </th>
              {visibleColumns.name && (
                <th
                  className="py-3 px-4 text-left cursor-pointer   text-gray-700 hover:bg-gray-100"
                  onClick={() => toggleSort('name')}
                >
                  Name {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              )}
              {visibleColumns.phone && (
                <th className="py-3 px-4 text-left   text-gray-700">Phone</th>
              )}
              {visibleColumns.tag && (
                <th className="py-3 px-4 text-left   text-gray-700">Tags</th>
              )}
              {visibleColumns.location && (
                <th className="py-3 px-4 text-left   text-gray-700">Location</th>
              )}
              {visibleColumns.rating && (
                <th className="py-3 px-4 text-left   text-gray-700">Rating</th>
              )}
              {visibleColumns.contact && (
                <th className="py-3 px-4 text-left   text-gray-700">Contact</th>
              )}
              {visibleColumns.status && (
                <th className="py-3 px-4 text-left   text-gray-700">Status</th>
              )}
            </tr>
          </thead>
          <tbody>
            {pageData.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <input type="checkbox" className="w-4 h-4" />
                </td>
                {visibleColumns.name && (
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img src={r.avatar} alt={r.name} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <div className=" text-gray-900">{r.name}</div>
                        <div className="text-xs text-gray-500">{r.role}</div>
                      </div>
                    </div>
                  </td>
                )}
                {visibleColumns.phone && <td className="py-3 px-4 text-gray-700">{r.phone}</td>}
                {visibleColumns.tag && (
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-1 rounded text-xs  ${tagColors[r.tag] || 'bg-blue-100 text-blue-700'
                        }`}
                    >
                      {r.tag}
                    </span>
                  </td>
                )}
                {visibleColumns.location && (
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{r.flag}</span>
                      <span className="text-gray-700">{r.location}</span>
                    </div>
                  </td>
                )}
                {visibleColumns.rating && (
                  <td className="py-3 px-4">
                    <span className="text-gray-700">⭐ {r.rating}</span>
                  </td>
                )}
                {visibleColumns.contact && (
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button className="text-[#1F2020] hover:text-gray-600">
                        <Mail size={16} />
                      </button>
                      <button className="text-[#1F2020] hover:text-gray-600">
                        <PhoneIcon size={16} />
                      </button>
                      <button className="text-[#1F2020] hover:text-gray-600">💬</button>
                      <button className="text-[#1F2020] hover:text-gray-600">
                        <Send size={16} />
                      </button>
                    </div>
                  </td>
                )}
                {visibleColumns.status && (
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1 rounded text-xs  ${statusColors[r.status] || 'bg-gray-100 text-gray-700'
                        }`}
                    >
                      {r.status}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 p-2 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <span>Show</span>
          <select
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
            className="border border-gray-200 rounded p-1 "
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>entries</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="p-2 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            Page {page} of {pages}
          </span>
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

const ContactReportsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
        const response = await fetch(`${apiUrl}/contacts`);
        if (!response.ok) throw new Error('Failed to fetch contacts');
        let data = await response.json();

        if (!Array.isArray(data)) {
          data = data?.data || data?.contacts || [];
        }

        if (Array.isArray(data)) {
          const formattedContacts = data.map((contact, index) => ({
            id: contact.id,
            name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown',
            email: contact.email,
            phone: contact.phone,
            company: contact.company_name || 'N/A',
            position: contact.position,
            department: contact.department,
            source: contact.source,
            status: contact.status || 'Active',
            notes: contact.notes,
            avatar: contact.avatar || `https://i.pravatar.cc/100?img=${index}`,
            rating: contact.rating || 4.0,
            location: contact.location || contact.address || 'N/A',
            tag: contact.tag || 'Contact',
            flag: '🌍',
            role: contact.position || 'Contact',
          }));

          setContacts(formattedContacts);

          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          setMonthlyData(months.map((month, idx) => ({
            month,
            value: Math.floor(formattedContacts.length / 12 * (idx + 1))
          })));

          setError('');
        } else {
          throw new Error('Invalid data format');
        }
      } catch (err) {
        console.error('❌ Error fetching contacts:', err);
        setError(err.message || 'Failed to fetch contacts');
        setContacts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl  text-gray-900">Contact Reports</h1>
            <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs ">{contacts.length}</span>
          </div>
          <div className="flex items-center gap-2 text-xs ">
            <a href="/" className="text-orange-500 hover:text-orange-600  ">
              Home
            </a>
            <span className="text-gray-300">/</span>
            <span className="text-gray-600">Contact Reports</span>
          </div>
        </div>

        {!loading && !error && contacts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded  border border-gray-200p-3  ">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-md  text-gray-900">Contacts By Month</h2>
                <select className="border border-gray-200 rounded px-3 py-1 text-xs  bg-white">
                  <option>2025</option>
                  <option>2024</option>
                  <option>2023</option>
                </select>
              </div>
              <ContactsByYearChart data={monthlyData} />
            </div>

            <div className="bg-white rounded  border border-gray-200p-3  ">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-md  text-gray-900">Contacts By Source</h2>
                <select className="border border-gray-200 rounded px-3 py-1 text-xs  bg-white">
                  <option>2025</option>
                  <option>2024</option>
                  <option>2023</option>
                </select>
              </div>
              <ContactsBySourceDonut data={contactsReportData.sourceData} />
            </div>
          </div>
        )}

        <div className="bg-white rounded  border border-gray-200p-3  ">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading contacts...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">Error: {error}</div>
          ) : (
            <ContactsTable rows={contacts} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactReportsPage;
