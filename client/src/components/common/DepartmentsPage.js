import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/entities/departments`);
      if (response.ok) {
        const data = await response.json();
        setDepartments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
      showErrorToast('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-2 bg-[#F7F8F9] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl  text-gray-900">Departments</h1>
            <p className="text-xs text-gray-500 mt-1">Manage system-wide departments and teams</p>
          </div>
          <button className="flex items-center gap-2 bg-red-600 text-white p-2 rounded text-xs hover:bg-red-700 transition-colors">
            <Plus size={16} /> Add Department
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded   overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F2020]" size={16} />
              <input
                type="text"
                placeholder="Search departments..."
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
                  <th className="px-6 py-3 text-xs   text-gray-500 ">Department Name</th>
                  <th className="px-6 py-3 text-xs   text-gray-500 ">Description</th>
                  <th className="px-6 py-3 text-xs   text-gray-500  text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-10 text-center text-gray-500 text-xs">Loading departments...</td>
                  </tr>
                ) : filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-10 text-center text-gray-500 text-xs">No departments found</td>
                  </tr>
                ) : (
                  filteredDepartments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center text-red ">
                            <Building2 size={16} />
                          </div>
                          <span className="text-xs   text-gray-900">{dept.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-600">{dept.description || 'No description provided'}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
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

export default DepartmentsPage;
