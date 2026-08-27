import React, { useState, useEffect } from 'react';
import { Shield, Users, Lock, Eye, Edit, Trash2, Plus, CheckCircle, Circle } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const RoleBasedAccessControl = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [filterDept, setFilterDept] = useState('all');

  const [roleFormData, setRoleFormData] = useState({
    name: '',
    description: ''
  });

  const modules = ['Dashboard', 'Leads', 'Deals', 'Projects', 'Tasks', 'Invoices', 'Reports', 'Users', 'Settings'];
  const actions = ['Read', 'Create', 'Update', 'Delete'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permissionsRes, usersRes] = await Promise.all([
        fetch('/api/roles'),
        fetch('/api/roles/permissions/all'),
        fetch('/api/users')
      ]);

      const rolesData = await rolesRes.json();
      const permissionsData = await permissionsRes.json();
      const usersData = await usersRes.json();

      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setPermissions(Array.isArray(permissionsData) ? permissionsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);

      if (rolesData.length > 0 && !selectedRole) {
        setSelectedRole(rolesData[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch RBAC data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!roleFormData.name.trim()) {
      showErrorToast('Role name is required');
      return;
    }

    try {
      const url = editingRoleId
        ? `/api/roles/${editingRoleId}`
        : '/api/roles';

      const method = editingRoleId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleFormData)
      });

      if (res.ok) {
        showSuccessToast(editingRoleId ? 'Role updated' : 'Role created');
        setShowRoleForm(false);
        setEditingRoleId(null);
        setRoleFormData({ name: '', description: '' });
        fetchData();
      }
    } catch (error) {
      showErrorToast('Failed to save role');
    }
  };

  const handleDeleteRole = async (id) => {
    if (!window.confirm('Are you sure? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/roles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccessToast('Role deleted');
        fetchData();
      }
    } catch (error) {
      showErrorToast('Failed to delete role');
    }
  };

  const handlePermissionChange = async (roleId, module, action, hasPermission) => {
    try {
      const res = await fetch(`/api/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_name: module,
          action,
          has_permission: !hasPermission
        })
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      showErrorToast('Failed to update permission');
    }
  };

  const getModulePermissions = (roleId, module) => {
    return permissions.filter(p => p.role_id === roleId && p.module_name === module);
  };

  const hasPermission = (roleId, module, action) => {
    const perm = permissions.find(p =>
      p.role_id === roleId &&
      p.module_name === module &&
      p[`can_${action.toLowerCase()}`] === true
    );
    return !!perm;
  };

  const getUsersByRole = (roleId) => {
    return users.filter(u => u.role_id === roleId);
  };

  const getRoleColor = (roleId) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-300',
      'bg-purple-100 text-purple-800 border-purple-300',
      'bg-green-100 text-green-800 border-green-300',
      'bg-orange-100 text-orange-800 border-orange-300',
      'bg-red-100 text-red-800 border-red-300',
    ];
    return colors[roleId % colors.length];
  };

  if (loading) {
    return <div className="text-center py-10">Loading RBAC configuration...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl   text-gray-900 flex items-center gap-2">
          <Shield size={28} />
          Role-Based Access Control
        </h2>
        <button
          onClick={() => {
            setShowRoleForm(!showRoleForm);
            setEditingRoleId(null);
            setRoleFormData({ name: '', description: '' });
          }}
          className="bg-red-600 text-white p-2 rounded   hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Create Role
        </button>
      </div>

      {/* Create/Edit Role Form */}
      {showRoleForm && (
        <div className="bg-white rounded  border border-gray-200 p-6">
          <h3 className="text-lg  text-gray-900 mb-4">
            {editingRoleId ? 'Edit Role' : 'Create New Role'}
          </h3>

          <form onSubmit={handleCreateRole} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm  text-gray-700 mb-1">Role Name</label>
                <input
                  type="text"
                  value={roleFormData.name}
                  onChange={(e) => setRoleFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Sales Manager"
                  className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm  text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Role description"
                  className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-red-600  text-white p-2 rounded   hover:bg-blue-700"
              >
                {editingRoleId ? 'Update Role' : 'Create Role'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRoleForm(false);
                  setEditingRoleId(null);
                  setRoleFormData({ name: '', description: '' });
                }}
                className="flex-1 bg-gray-300 text-gray-800 p-2 rounded  "
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded p-2   border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Roles</p>
          <p className="text-3xl   text-white ">{roles.length}</p>
        </div>
        <div className="bg-white rounded p-2   border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Users</p>
          <p className="text-3xl   text-purple-600">{users.length}</p>
        </div>
        <div className="bg-white rounded p-2   border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Permissions Set</p>
          <p className="text-3xl   text-green-600">{permissions.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="bg-white rounded  border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100p-2   border-b">
            <h3 className=" text-gray-900 flex items-center gap-2">
              <Lock size={20} />
              Roles
            </h3>
          </div>

          <div className="divide-y max-h-96 overflow-y-auto">
            {roles.length > 0 ? (
              roles.map(role => (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`p-3 cursor-pointer transition-colors ${selectedRole === role.id
                    ? 'bg-blue-50 border-l-4 border-red-600 '
                    : 'hover:bg-gray-50'
                    }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className=" text-gray-900">{role.name}</h4>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRoleId(role.id);
                          setRoleFormData({ name: role.name, description: role.description });
                          setShowRoleForm(true);
                        }}
                        className="text-white  hover:text-blue-800"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRole(role.id);
                        }}
                        className="text-red  hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">{role.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {getUsersByRole(role.id).length} users
                  </p>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">No roles found</div>
            )}
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="lg:col-span-2">
          {selectedRole && (
            <div className="bg-white rounded  border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100p-2   border-b">
                <h3 className=" text-gray-900 flex items-center gap-2">
                  <Eye size={20} />
                  Permissions: {roles.find(r => r.id === selectedRole)?.name}
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-2 text-left text-sm  text-gray-900">Module</th>
                      {actions.map(action => (
                        <th key={action} className="p-2 text-center text-sm  text-gray-900">
                          {action}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map(module => (
                      <tr key={module} className="border-b hover:bg-gray-50">
                        <td className="p-2  text-gray-900">{module}</td>
                        {actions.map(action => {
                          const actionKey = `can_${action.toLowerCase()}`;
                          const hasPerms = hasPermission(selectedRole, module, action);
                          return (
                            <td key={action} className="p-2 text-center">
                              <button
                                onClick={() => handlePermissionChange(selectedRole, module, actionKey, hasPerms)}
                                className={`inline-flex items-center justify-center w-6 h-6 rounded transition-colors ${hasPerms
                                  ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                  : 'bg-gray-100 text-[#1F2020] hover:bg-gray-200'
                                  }`}
                              >
                                {hasPerms ? (
                                  <CheckCircle size={18} />
                                ) : (
                                  <Circle size={18} />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Users with this role */}
              <div className="border-tp-2  ">
                <h4 className=" text-gray-900 mb-3 flex items-center gap-2">
                  <Users size={18} />
                  Users with this role ({getUsersByRole(selectedRole).length})
                </h4>
                <div className="space-y-2">
                  {getUsersByRole(selectedRole).length > 0 ? (
                    getUsersByRole(selectedRole).map(user => (
                      <div key={user.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <div className="w-8 h-8 bg-red-600  text-white rounded-full flex items-center justify-center text-sm  ">
                          {user.first_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm  text-gray-900">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-gray-600">{user.email}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No users assigned to this role</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Access Control Legend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded p-2   border border-blue-200">
          <h3 className=" text-blue-900 mb-2">📋 Available Modules</h3>
          <div className="text-sm text-blue-800 space-y-1">
            {modules.map(module => (
              <p key={module}>✓ {module}</p>
            ))}
          </div>
        </div>

        <div className="bg-green-50 rounded p-2   border border-green-200">
          <h3 className=" text-green-900 mb-2">⚙️ Permission Actions</h3>
          <div className="text-sm text-green-800 space-y-1">
            <p>✓ <strong>Read</strong> - View and access module data</p>
            <p>✓ <strong>Create</strong> - Add new records</p>
            <p>✓ <strong>Update</strong> - Modify existing records</p>
            <p>✓ <strong>Delete</strong> - Remove records</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleBasedAccessControl;
