import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { contactsAPI, dealsAPI, leadsAPI, companiesAPI, campaignAPI, activitiesAPI, salesAPI, followupsAPI } from '../../services/api';
import DataTable from './DataTable';
import { Zap, TrendingUp, Users, Clock, CheckCircle } from 'lucide-react';

const AnalyticsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [leads, setLeads] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [activities, setActivities] = useState([]);
  const [salesAnalytics, setSalesAnalytics] = useState(null);
  const [effectivenessData, setEffectivenessData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [contactsRes, dealsRes, leadsRes, companiesRes, campaignsRes, activitiesRes, salesRes, effectivenessRes] = await Promise.all([
        contactsAPI.getAll().catch(() => []),
        dealsAPI.getAll().catch(() => []),
        leadsAPI.getAll().catch(() => []),
        companiesAPI.getAll().catch(() => []),
        campaignAPI.getAll().catch(() => []),
        activitiesAPI.getAll().catch(() => []),
        salesAPI.getAnalytics().catch(() => null),
        followupsAPI.getEffectivenessAnalytics().catch(() => []),
      ]);

      setContacts(Array.isArray(contactsRes) ? contactsRes : []);
      setDeals(Array.isArray(dealsRes) ? dealsRes : []);
      setLeads(Array.isArray(leadsRes) ? leadsRes : []);
      setCompanies(Array.isArray(companiesRes) ? companiesRes : []);
      setCampaigns(Array.isArray(campaignsRes) ? campaignsRes : []);
      setActivities(Array.isArray(activitiesRes) ? activitiesRes : []);
      setSalesAnalytics(salesRes);
      setEffectivenessData(effectivenessRes);
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Must tolerate null, not just undefined: a follow-up with no executive comes back as
  // NULL, and a default parameter does not cover that.
  const getInitials = (name) => {
    const clean = String(name ?? '').trim();
    if (!clean) return 'U';
    const parts = clean.split(/\s+/);
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : clean[0].toUpperCase();
  };

  const getAvatarColor = (index) => {
    const colors = ['bg-red-500', 'bg-amber-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
    return colors[index % colors.length];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const Card = ({ title, children, right }) => (
    <div className="bg-white border border-gray-200 rounded   p-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs   text-gray-800">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );

  const SmallSelect = () => (
    <select className="text-xs border border-gray-200 rounded p-1  bg-white focus:outline-none">
      <option>Last 30 Days</option>
    </select>
  );

  const DoubleSelect = () => (
    <div className="flex items-center gap-2">
      <select className="text-xs border border-gray-200 rounded p-1  bg-white focus:outline-none">
        <option>Sales Pipeline</option>
        <option>Marketing Pipeline</option>
      </select>
      <select className="text-xs border border-gray-200 rounded p-1  bg-white focus:outline-none">
        <option>Last 30 Days</option>
      </select>
    </div>
  );

  const recentContactsData = contacts.slice(0, 5).map((c, idx) => {
    const fullName = c.first_name && c.last_name ? `${c.first_name} ${c.last_name}` : c.first_name || 'Unknown';
    return {
      id: c.id,
      name: fullName,
      role: c.position || 'N/A',
      phone: c.phone || c.email || '-',
      date: formatDate(c.created_at),
      initials: getInitials(fullName),
      bg: getAvatarColor(idx),
    };
  });

  const dealsByStageData = salesAnalytics?.dealsByStage || deals.reduce((acc, deal) => {
    const stage = deal.stage || 'Unknown';
    const existing = acc.find(d => d.stage === stage);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ stage, value: 1 });
    }
    return acc;
  }, []).filter(d => d.value > 0);

  const wonDealsData = salesAnalytics?.wonDealsByMonth || deals
    .filter(d => d.status === 'Won')
    .reduce((acc, deal) => {
      const stage = deal.stage || 'Unknown';
      const existing = acc.find(d => d.name === stage);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: stage, value: 1 });
      }
      return acc;
    }, [])
    .slice(0, 3);

  const recentDealsData = salesAnalytics?.recentDeals || deals.slice(0, 5).map(d => ({
    name: d.deal_name || 'Unnamed Deal',
    stage: d.stage || 'Unknown',
    value: `$${(d.deal_value || 0).toLocaleString()}`,
    prob: `${d.probability || 0}%`,
    status: d.status || 'Open',
  }));

  const lostLeadsData = leads
    .filter(l => l.status === 'Unqualified')
    .reduce((acc, lead) => {
      const source = lead.source || 'Unknown';
      const existing = acc.find(d => d.name === source);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: source, value: 1 });
      }
      return acc;
    }, [])
    .slice(0, 3);

  const leadsByStageData = salesAnalytics?.leadsByStage || leads.reduce((acc, lead) => {
    const status = lead.status || 'New';
    const existing = acc.find(d => d.stage === status);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ stage: status, value: 1 });
    }
    return acc;
  }, []);

  const recentLeadsData = leads.slice(0, 5).map(l => ({
    name: l.name || 'Unknown',
    company: l.company || 'N/A',
    phone: l.phone || l.email || '-',
    status: l.status || 'Contacted',
  }));

  const recentCompaniesData = companies.slice(0, 6).map(c => ({
    name: c.company_name || 'Unknown',
    phone: c.phone || c.email || '-',
    date: formatDate(c.created_at),
  }));

  const recentCampaignsData = campaigns.slice(0, 4).map(c => ({
    title: c.name || 'Untitled Campaign',
    type: c.type || 'Marketing',
    status: c.status || 'Pending',
    due: formatDate(c.created_at),
    stats: {
      opened: '0%',
      Qualified: '0%',
      unsub: '0%',
      delivered: '0%',
      conv: '0%',
    },
  }));

  const HProgress = ({ label, value, max = 500, color = '#28C76F' }) => {
    const pct = Math.min(100, (value / max) * 100);
    return (
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <div className="text-xs  text-gray-600">{label}</div>
          <div className="text-xs  text-gray-700  ">{value}</div>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
          <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800p-3 p-2">
      <div className="max-w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl text-gray-900">Analytics</h1>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 p-2 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">
              <Zap size={14} className="animate-pulse" /> AI Analysis Enabled
            </span>
          </div>
        </div>

        {/* AI Meeting Insights Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-2 rounded border border-gray-200  flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded flex items-center justify-center text-blue-600">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500   tracking-wider">Effectiveness</p>
              <h3 className="text-xl  text-gray-900">
                {effectivenessData.length > 0 ?
                  Math.round((effectivenessData.reduce((acc, curr) => acc + curr.successful_meetings, 0) /
                    effectivenessData.reduce((acc, curr) => acc + curr.total_meetings, 0)) * 100) : 0}%
              </h3>
            </div>
          </div>
          <div className="bg-white p-2 rounded border border-gray-200  flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded flex items-center justify-center text-green-600">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500   tracking-wider">Total Meetings</p>
              <h3 className="text-xl  text-gray-900">
                {effectivenessData.reduce((acc, curr) => acc + curr.total_meetings, 0)}
              </h3>
            </div>
          </div>
          <div className="bg-white p-2 rounded border border-gray-200  flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 rounded flex items-center justify-center text-purple-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500   tracking-wider">Avg Duration</p>
              <h3 className="text-xl  text-gray-900">
                {Math.round(effectivenessData.reduce((acc, curr) => acc + curr.avg_duration, 0) / (effectivenessData.length || 1))}m
              </h3>
            </div>
          </div>
          <div className="bg-white p-2 rounded border border-gray-200  flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 rounded flex items-center justify-center text-orange-600">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500   tracking-wider">Conversion Rate</p>
              <h3 className="text-xl  text-gray-900">
                {effectivenessData.length > 0 ?
                  Math.round((effectivenessData.reduce((acc, curr) => acc + curr.conversions, 0) /
                    effectivenessData.reduce((acc, curr) => acc + curr.total_meetings, 0)) * 100) : 0}%
              </h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Executive Performance Table */}
          <div className="col-span-3 mb-6">
            <Card title="Sales Executive Meeting Effectiveness (AI Classified)" right={<SmallSelect />}>
              <DataTable
                columns={[
                  {
                    key: 'executive',
                    label: 'Executive',
                    sortable: true,
                    render: (value) => (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs  text-gray-600">
                          {getInitials(value)}
                        </div>
                        <span className="text-xs font-medium text-gray-900">{value || 'Unassigned'}</span>
                      </div>
                    )
                  },
                  { key: 'total_meetings', label: 'Total Meetings', sortable: true },
                  {
                    key: 'successful_meetings',
                    label: 'Useful Conversations',
                    sortable: true,
                    render: (val, row) => (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-24">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${(val / row.total_meetings) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs  text-gray-700">{val} ({Math.round((val / row.total_meetings) * 100)}%)</span>
                      </div>
                    )
                  },
                  {
                    key: 'conversions',
                    label: 'Deal Conversions',
                    sortable: true,
                    render: (val) => (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs ">
                        {val} Deals
                      </span>
                    )
                  },
                  {
                    key: 'avg_duration',
                    label: 'Avg Call Time',
                    sortable: true,
                    render: (val) => <span className="text-xs text-gray-600">{val} mins</span>
                  }
                ]}
                data={effectivenessData}
                hideSearch={true}
              />
            </Card>
          </div>
          {/* LEFT COLUMN (col-span-2) */}
          <div className="col-span-2 space-y-3">
            {/* Recently Created Contacts */}
            <Card title="Recently Created Contacts" right={<SmallSelect />}>
              <DataTable
                columns={[
                  {
                    key: 'name',
                    label: 'Contact',
                    sortable: true,
                    render: (value, row) => (
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 ${row.bg} rounded-full flex items-center justify-center text-white text-[14px] `}>{row.initials}</div>
                        <div>
                          <div className="text-xs    text-gray-800">{value}</div>
                          <div className="text-xs text-[#1F2020]">{row.role}</div>
                        </div>
                      </div>
                    )
                  },
                  { key: 'phone', label: 'Phone', sortable: true },
                  { key: 'date', label: 'Created At', sortable: true }
                ]}
                data={recentContactsData}
                hideSearch={true}
              />
            </Card>

            {/* Won Deals Stage */}
            <Card title="Won Deals Stage" right={<DoubleSelect />}>
              <div className="p-0">
                {wonDealsData.length > 0 ? (
                  wonDealsData.map((d, i) => (
                    <HProgress key={i} label={d.name} value={d.value} max={Math.max(10, Math.max(...wonDealsData.map(x => x.value)))} color="#28C76F" />
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">No won deals data</div>
                )}
              </div>
            </Card>

            {/* Recently Created Deals */}
            <Card title="Recently Created Deals" right={<SmallSelect />}>
              <DataTable
                columns={[
                  { key: 'name', label: 'Deal Name', sortable: true },
                  { key: 'stage', label: 'Stage', sortable: true },
                  { key: 'value', label: 'Deal Value', sortable: true },
                  { key: 'prob', label: 'Probability', sortable: true },
                  {
                    key: 'status',
                    label: 'Status',
                    sortable: true,
                    render: (value) => (
                      <span className={`inline-block px-2 py-[2px] text-[12px] rounded  ${value === 'Lost' ? 'bg-red-100 text-red ' : value === 'Open' ? 'bg-blue-100 text-white ' : 'bg-green-100 text-green-600'}`}>
                        {value}
                      </span>
                    )
                  }
                ]}
                data={recentDealsData}
                hideSearch={true}
              />
            </Card>

            {/* Lost Leads Stage */}
            <Card title="Lost Leads Stage" right={<DoubleSelect />}>
              <div className="p-0">
                {lostLeadsData.length > 0 ? (
                  lostLeadsData.map((d, i) => (
                    <HProgress key={i} label={d.name} value={d.value} max={Math.max(10, Math.max(...lostLeadsData.map(x => x.value)))} color="#EA5455" />
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">No lost leads data</div>
                )}
              </div>
            </Card>

            {/* Leads By Stage */}
            <Card title="Leads By Stage" right={<DoubleSelect />}>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadsByStageData.length > 0 ? leadsByStageData : [{ stage: 'No Data', value: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0E7EFA" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Recently Added Companies */}
            <Card title="Recently Added Companies" right={<SmallSelect />}>
              <DataTable
                columns={[
                  {
                    key: 'name',
                    label: 'Company Name',
                    sortable: true,
                    render: (value, row, index) => (
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs   ${getAvatarColor(recentCompaniesData.indexOf(row))}`}></div>
                        <div className="text-xs ">{value}</div>
                      </div>
                    )
                  },
                  { key: 'phone', label: 'Phone', sortable: true },
                  { key: 'date', label: 'Created at', sortable: true }
                ]}
                data={recentCompaniesData}
                hideSearch={true}
              />
            </Card>
          </div>

          {/* RIGHT COLUMN (col-span-1) */}
          <div className="col-span-1 space-y-6">
            {/* Deals By Stage */}
            <Card title="Deals By Stage" right={<DoubleSelect />}>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dealsByStageData.length > 0 ? dealsByStageData : [{ stage: 'No Data', value: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0E7EFA" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Activities */}
            <Card title="Activities" right={<SmallSelect />}>
              <DataTable
                columns={[
                  {
                    key: 'title',
                    label: 'Activity',
                    sortable: true,
                    render: (value, row) => (
                      <div>
                        <div className="text-xs  text-gray-800">{row.activity_type}: {value}</div>
                        <div className="text-xs text-gray-500">{formatDate(row.created_at)}</div>
                      </div>
                    )
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    sortable: true,
                    render: (value) => (
                      <span className={`text-xs px-1.5 rounded-full ${value === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                        {value}
                      </span>
                    )
                  }
                ]}
                data={activities.slice(0, 5)}
                hideSearch={true}
              />
            </Card>

            {/* Lost Leads Stage (small) */}
            <Card title="Lost Leads Stage" right={<DoubleSelect />}>
              <div className="p-0">
                {lostLeadsData.length > 0 ? (
                  lostLeadsData.map((d, i) => (
                    <HProgress key={i} label={d.name} value={d.value} max={Math.max(10, Math.max(...lostLeadsData.map(x => x.value)))} color="#EA5455" />
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">No lost leads data</div>
                )}
              </div>
            </Card>

            {/* Recently Created Leads */}
            <Card title="Recently Created Leads" right={<SmallSelect />}>
              <DataTable
                columns={[
                  { key: 'name', label: 'Lead Name', sortable: true },
                  { key: 'company', label: 'Company', sortable: true },
                  { key: 'phone', label: 'Phone', sortable: true },
                  {
                    key: 'status',
                    label: 'Status',
                    sortable: true,
                    render: (value) => (
                      <span className={`inline-block px-2 py-[2px] text-[12px] rounded  ${value === 'Qualified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {value}
                      </span>
                    )
                  }
                ]}
                data={recentLeadsData}
                hideSearch={true}
              />
            </Card>

            {/* Recently Created Campaign */}
            <Card title="Recently Created Campaign" right={<SmallSelect />}>
              <DataTable
                columns={[
                  {
                    key: 'title',
                    label: 'Campaign',
                    sortable: true,
                    render: (value, row) => (
                      <div>
                        <div className="text-xs   ">{value}</div>
                        <div className="text-xs text-gray-500">{row.type}</div>
                      </div>
                    )
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    sortable: true,
                    render: (value) => (
                      <span className={`inline-flex items-center px-2 py-[2px] rounded  text-[12px]  ${value === 'Running' || value === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {value}
                      </span>
                    )
                  },
                  { key: 'due', label: 'Created', sortable: true }
                ]}
                data={recentCampaignsData}
                hideSearch={true}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
