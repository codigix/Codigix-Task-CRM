import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MoreVertical, Download, ChevronDown } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const dummyRolesData = [];

const RolesPermissionsPage = () => {
  const [query, setQuery] = useState('');
  const [roles, setRoles] = useState(dummyRolesData);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/roles`);
      if (!response.ok) throw new Error('Failed to fetch roles');
      const data = await response.json();

      const formattedRoles = data.map(role => ({
        id: role.id,
        name: role.name,
        created: new Date(role.created_at).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }));

      setRoles(formattedRoles.length > 0 ? formattedRoles : dummyRolesData);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles(dummyRolesData);
    }
  };

  const handleEditRole = (role) => {
    setSelectedRole(role);
    setRoleName(role.name);
    setNewRoleName(role.name);
    setShowEditRoleModal(true);
    setOpenMenuId(null);
  };

  const handlePermission = (role) => {
    setSelectedRole(role);
    navigate('/role-permissions-detail', { state: { roleId: role.id, roleName: role.name } });
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) {
      alert('Role name is required');
      return;
    }

    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoleName, description: roleDescription })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      setNewRoleName('');
      setRoleDescription('');
      setShowAddRoleModal(false);
      await fetchRoles();
    } catch (error) {
      alert('Error creating role: ' + error.message);
    }
  };

  const handleUpdateRole = async () => {
    if (!roleName.trim()) {
      alert('Role name is required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roleName, description: roleDescription })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      setShowEditRoleModal(false);
      await fetchRoles();
    } catch (error) {
      alert('Error updating role: ' + error.message);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/roles/${roleId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error);
        }

        await fetchRoles();
      } catch (error) {
        alert('Error deleting role: ' + error.message);
      }
    }
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-2 ">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl  text-gray-900">Roles & Permissions</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs   bg-red-100 text-red-800">
                152
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Home › Roles & Permissions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <button className="bg-white border border-gray-300 text-gray-700 p-2  rounded  text-xs    hover:bg-gray-50 flex items-center gap-2 transition-colors">
                <Download size={16} />
                Export
                <ChevronDown size={16} />
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded  shadow-lg hidden group-hover:block z-10">
                <button className="w-full text-left p-2  hover:bg-gray-50 text-xs  text-gray-700">Export as PDF</button>
                <button className="w-full text-left p-2  hover:bg-gray-50 text-xs  text-gray-700 border-t border-gray-200">Export as Excel</button>
              </div>
            </div>
            <button
              onClick={() => setShowAddRoleModal(true)}
              className="bg-red-600 text-white p-2  rounded  text-xs    hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              + Add New Role
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border-b border-gray-200 p-2 ">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1F2020]" />
            <input
              type="text"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded  focus:outline-none focus:border-gray-400 text-xs  bg-white w-full"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="p-6">
        <div className="bg-white rounded   border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs ">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 text-left w-8">
                    <input type="checkbox" className="cursor-pointer" />
                  </th>
                  <th className="py-3 px-4 text-left  text-gray-700">Role Name</th>
                  <th className="py-3 px-4 text-left  text-gray-700">Created</th>
                  <th className="py-3 px-4 text-left  text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoles.map((role) => (
                  <tr key={role.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <input type="checkbox" className="cursor-pointer" />
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-white  hover:text-blue-700   bg-transparent border-none cursor-pointer">
                        {role.name}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{role.created}</td>
                    <td className="py-3 px-4">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === role.id ? null : role.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          <MoreVertical size={16} className="text-[#1F2020]" />
                        </button>
                        {openMenuId === role.id && (
                          <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded  shadow-lg z-20">
                            <button
                              onClick={() => handleEditRole(role)}
                              className="w-full text-left p-2  hover:bg-gray-50 text-xs  text-gray-700 border-b border-gray-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handlePermission(role)}
                              className="w-full text-left p-2  hover:bg-gray-50 text-xs  text-gray-700 border-b border-gray-100"
                            >
                              Permission
                            </button>
                            <button
                              onClick={() => handleDeleteRole(role.id)}
                              className="w-full text-left p-2  hover:bg-red-50 text-xs  text-red "
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-2  border-t border-gray-200 bg-gray-50">
            <div className="text-xs  text-gray-600">
              Show <select className="border border-gray-300 p-1  rounded text-xs  bg-white">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select> entries
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded text-xs  hover:bg-gray-100 transition-colors">&lt;</button>
              <button className="px-3 py-1 bg-red-600 text-white rounded text-xs ">1</button>
              <button className="px-3 py-1 border border-gray-300 rounded text-xs  hover:bg-gray-100 transition-colors">&gt;</button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 py-6 border-t border-gray-200 bg-white">
        <span>Copyright © 2025 <span className="text-red   ">Preadmin</span></span>
        <div className="flex gap-2 justify-center mt-2">
          <span className="cursor-pointer hover:text-gray-700">About</span>
          <span className="cursor-pointer hover:text-gray-700">Terms</span>
          <span className="cursor-pointer hover:text-gray-700">Contact Us</span>
        </div>
      </div>

      {/* Add Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded  shadow-lgp-3  w-96">
            <h2 className="text-lg  text-gray-900 mb-4">Add Role</h2>
            <div className="mb-4">
              <label className="block text-xs    text-gray-700 mb-2">
                Role Name <span className="text-red ">*</span>
              </label>
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Enter role name"
                className="w-full p-2  border border-gray-300 rounded  focus:outline-none focus:border-red-600 text-xs "
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs    text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="Enter role description"
                className="w-full p-2  border border-gray-300 rounded  focus:outline-none focus:border-red-600 text-xs "
                rows="3"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddRoleModal(false);
                  setNewRoleName('');
                  setRoleDescription('');
                }}
                className="p-2  border border-gray-300 rounded  text-xs    text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRole}
                className="p-2  bg-red-600 text-white rounded  text-xs    hover:bg-red-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded  shadow-lgp-3  w-96">
            <h2 className="text-lg  text-gray-900 mb-4">Edit Role</h2>
            <div className="mb-4">
              <label className="block text-xs    text-gray-700 mb-2">
                Role Name <span className="text-red ">*</span>
              </label>
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="Enter role name"
                className="w-full p-2  border border-gray-300 rounded  focus:outline-none focus:border-red-600 text-xs "
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs    text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="Enter role description"
                className="w-full p-2  border border-gray-300 rounded  focus:outline-none focus:border-red-600 text-xs "
                rows="3"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEditRoleModal(false)}
                className="p-2  border border-gray-300 rounded  text-xs    text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                className="p-2  bg-red-600 text-white rounded  text-xs    hover:bg-red-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default RolesPermissionsPage;
