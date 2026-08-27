import React, { useState, useEffect } from 'react';
import { Zap, Plus, Search, MoreVertical, Edit2, Trash2, Power, PowerOff } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AutomationRulesPage = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      // Using existing API for alerts but filtering/mapping for rules
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/automation/alerts`);
      if (response.ok) {
        const data = await response.json();
        setRules(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching rules:', err);
      showErrorToast('Failed to load automation rules');
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (id, isActive) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const endpoint = isActive ? 'disable' : 'enable';
      const response = await fetch(`${apiUrl}/automation/${endpoint}/${id}`, {
        method: 'POST'
      });

      if (response.ok) {
        showSuccessToast(`Rule ${isActive ? 'disabled' : 'enabled'} successfully`);
        fetchRules();
      }
    } catch (err) {
      showErrorToast('Error toggling rule');
    }
  };

  const filteredRules = rules.filter(rule =>
    rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.entity_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-2 bg-[#F7F8F9] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl  text-gray-900">Automation Rules</h1>
            <p className="text-xs text-gray-500 mt-1">Configure automated triggers and alerts across the system</p>
          </div>
          <button className="flex items-center gap-2 bg-red-600 text-white p-2 rounded text-xs hover:bg-red-700 transition-colors">
            <Plus size={16} /> Create Rule
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded   overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F2020]" size={16} />
              <input
                type="text"
                placeholder="Search rules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded  text-xs focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-xs   text-gray-500 ">Rule Name</th>
                  <th className="px-6 py-3 text-xs   text-gray-500 ">Entity</th>
                  <th className="px-6 py-3 text-xs   text-gray-500 ">Trigger</th>
                  <th className="px-6 py-3 text-xs   text-gray-500 ">Status</th>
                  <th className="px-6 py-3 text-xs   text-gray-500  text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500 text-xs">Loading rules...</td>
                  </tr>
                ) : filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500 text-xs">No automation rules configured</td>
                  </tr>
                ) : (
                  filteredRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded flex items-center justify-center ${rule.is_active ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-[#1F2020]'}`}>
                            <Zap size={16} />
                          </div>
                          <span className="text-xs   text-gray-900">{rule.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs  ">{rule.entity_type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-600 truncate max-w-xs block">{rule.trigger_condition}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs   ${rule.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${rule.is_active ? 'bg-green-600' : 'bg-red-600'}`}></span>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleRule(rule.id, rule.is_active)}
                            className={`p-1 transition-colors ${rule.is_active ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}`}
                            title={rule.is_active ? 'Disable' : 'Enable'}
                          >
                            {rule.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                          </button>
                          <button className="p-1 text-[#1F2020] hover:text-white  transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button className="p-1 text-[#1F2020] hover:text-red  transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationRulesPage;
