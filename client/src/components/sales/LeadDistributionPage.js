import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Shield, Zap, CheckCircle2,
  Clock, AlertCircle, Search, Filter, ArrowRight,
  BarChart3, RefreshCw, Settings, MoreVertical
} from 'lucide-react';
import { leadsAPI, usersAPI } from '../../services/api';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const LeadDistributionPage = () => {
  const [unassignedLeads, setUnassignedLeads] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchKeys] = useState('');
  const [activeTab, setActiveTab] = useState('manual'); // 'manual', 'rules', 'performance'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadsRes, usersRes] = await Promise.all([
        leadsAPI.getAll(),
        usersAPI.getAll()
      ]);

      // Filter unassigned leads (owner_id is null or 0)
      const leads = Array.isArray(leadsRes) ? leadsRes : [];
      setUnassignedLeads(leads.filter(l => !l.owner_id));

      // Filter sales/leads team members
      const users = Array.isArray(usersRes) ? usersRes : [];
      setTeamMembers(users.filter(u =>
        u.department?.includes('Sales') ||
        u.department?.includes('Leads') ||
        u.role_name?.includes('Manager') ||
        u.role_name?.includes('Executive')
      ));
    } catch (err) {
      console.error('Error fetching distribution data:', err);
      showErrorToast('Failed to load distribution data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignLead = async (leadId, userId) => {
    try {
      await leadsAPI.update(leadId, { owner_id: userId });
      showSuccessToast('Lead assigned successfully');
      setUnassignedLeads(prev => prev.filter(l => l.id !== leadId));
    } catch (err) {
      showErrorToast('Failed to assign lead');
    }
  };

  const stats = [
    { label: 'Unassigned Leads', value: unassignedLeads.length, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Active Team', value: teamMembers.length, icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Avg. Response Time', value: '14m', icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Auto-Rules Active', value: '5', icon: Zap, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl  text-gray-900">Lead Distribution</h1>
          <p className="text-gray-500 text-sm mt-1">Manage lead assignments and routing rules</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors border border-gray-200 bg-white"
          >
            <RefreshCw size={15} />
          </button>
          <button className="flex items-center gap-2 bg-red-600 text-white p-2 rounded text-xs  hover:bg-red-700 transition-colors ">
            <Zap size={15} /> Run Auto-Distribute
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-2 rounded border border-gray-200  flex items-center gap-2">
            <div className={`p-2 rounded ${stat.bg} ${stat.color}`}>
              <stat.icon size={15} />
            </div>
            <div>
              <p className="text-xs text-gray-500   ">{stat.label}</p>
              <p className="text-xl  text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-px">
        {[
          { id: 'manual', label: 'Manual Queue', icon: UserPlus },
          { id: 'rules', label: 'Routing Rules', icon: Settings },
          { id: 'performance', label: 'Team Performance', icon: BarChart3 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 p-2 text-xs  transition-all relative ${activeTab === tab.id
              ? 'text-red-600 border-b-2 border-red-600 mb-[-1px]'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Queue */}
          <div className="lg:col-span-2 space-y-2">
            <div className="bg-white rounded border border-gray-200  overflow-hidden">
              <div className="p-2 border-b border-gray-100 flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search unassigned leads..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
                <button className="flex items-center gap-2 p-2 border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50">
                  <Filter size={15} /> Filter
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="p-2 text-xs  text-gray-600">Lead Details</th>
                      <th className="p-2 text-xs  text-gray-600">Source</th>
                      <th className="p-2 text-xs  text-gray-600">Wait Time</th>
                      <th className="p-2 text-xs  text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {unassignedLeads.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-2 text-center text-gray-500">
                          <CheckCircle2 size={32} className="mx-auto text-green-500 mb-2 opacity-20" />
                          No unassigned leads in queue.
                        </td>
                      </tr>
                    ) : (
                      unassignedLeads.map(lead => (
                        <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-2">
                            <div className=" text-gray-900">{lead.lead_name || lead.name}</div>
                            <div className="text-xs text-gray-500">{lead.email}</div>
                          </td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 rounded text-xs  bg-blue-50 text-blue-700 border border-blue-100">
                              {lead.lead_source || 'Website'}
                            </span>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1.5 text-orange-600 ">
                              <Clock size={14} />
                              {Math.floor(Math.random() * 60)}m
                            </div>
                          </td>
                          <td className="p-2">
                            <select
                              onChange={(e) => handleAssignLead(lead.id, e.target.value)}
                              className="w-full p-1.5 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                              defaultValue=""
                            >
                              <option value="" disabled>Assign To...</option>
                              {teamMembers.map(u => (
                                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Actions / Team Load */}
          <div className="space-y-6">
            <div className="bg-white p-2 rounded border border-gray-200 ">
              <h3 className=" text-gray-900 mb-4 flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                Team Load Balancer
              </h3>
              <div className="space-y-4">
                {teamMembers.slice(0, 5).map(member => (
                  <div key={member.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className=" text-gray-700">{member.first_name} {member.last_name}</span>
                      <span className="text-gray-500">{Math.floor(Math.random() * 10) + 2} active leads</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.random() * 80 + 10}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 py-2 text-xs  text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1">
                View All Team Members <ArrowRight size={14} />
              </button>
            </div>

            <div className="bg-gradient-to-br from-red-600 to-red-700 p-2 rounded text-white shadow-md">
              <h3 className=" mb-2 flex items-center gap-2">
                <Zap size={18} />
                Smart Routing
              </h3>
              <p className="text-red-100 text-xs mb-4 leading-relaxed">
                Currently distributing leads based on <strong>Round Robin</strong> algorithm with <strong>Location</strong> affinity.
              </p>
              <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded text-xs  transition-colors border border-white/20">
                Configure Rules
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="bg-white rounded border border-gray-200  p-8 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-600">
              <Zap size={32} />
            </div>
            <h3 className="text-lg  text-gray-900">Automation Engine</h3>
            <p className="text-gray-500 text-sm">
              Define rules to automatically route leads based on source, location, value, or product interest.
            </p>
            <div className="pt-4">
              <button className="px-6 py-2 bg-red-600 text-white rounded text-sm   hover:bg-red-700 transition-all">
                Create First Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="bg-white rounded border border-gray-200  p-8 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600">
              <BarChart3 size={32} />
            </div>
            <h3 className="text-lg  text-gray-900">Performance Analytics</h3>
            <p className="text-gray-500 text-sm">
              Track conversion rates, response times, and workload distribution across your sales team.
            </p>
            <div className="pt-4 flex gap-2 justify-center">
              <div className="px-4 py-1.5 bg-gray-100 rounded-full text-xs  text-gray-600 ">Available in Pro Plan</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDistributionPage;
