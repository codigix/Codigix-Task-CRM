import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const RolePermissionsDetailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const roleId = location.state?.roleId;
  const roleName = location.state?.roleName || location.state?.role?.name;

  const fetchRolePermissions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/permissions/role/${roleId}`);
      if (!response.ok) throw new Error('Failed to fetch permissions');
      const data = await response.json();

      const permMap = {};
      data.forEach(perm => {
        permMap[perm.module_name] = {
          id: perm.id,
          can_create: perm.can_create,
          can_read: perm.can_read,
          can_update: perm.can_update,
          can_delete: perm.can_delete
        };
      });
      setPermissions(permMap);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const fetchModules = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/modules`);
      if (!response.ok) throw new Error('Failed to fetch modules');
      const data = await response.json();
      setModules(data);

      const initialPerms = {};
      data.forEach(module => {
        initialPerms[module.name] = {
          can_create: false,
          can_read: true,
          can_update: false,
          can_delete: false
        };
      });

      setPermissions(prev => ({ ...initialPerms, ...prev }));
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching modules:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (roleId) {
      fetchModules();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      fetchRolePermissions();
    }
  }, [roleId]);

  const handlePermissionChange = (moduleName, permission) => {
    setPermissions(prev => {
      const modulePerms = prev[moduleName] || { can_create: false, can_read: true, can_update: false, can_delete: false };
      return {
        ...prev,
        [moduleName]: {
          ...modulePerms,
          [permission]: !modulePerms[permission]
        }
      };
    });
  };

  const handleAllowAll = (moduleName) => {
    setPermissions(prev => ({
      ...prev,
      [moduleName]: {
        can_create: true,
        can_read: true,
        can_update: true,
        can_delete: true
      }
    }));
  };

  const handleResetModule = (moduleName) => {
    setPermissions(prev => ({
      ...prev,
      [moduleName]: {
        can_create: false,
        can_read: true,
        can_update: false,
        can_delete: false
      }
    }));
  };

  const handleSavePermissions = async () => {
    try {
      setIsSaving(true);
      const permissionsArray = modules.map(module => ({
        module_name: module.name,
        can_create: permissions[module.name]?.can_create || false,
        can_read: permissions[module.name]?.can_read || false,
        can_update: permissions[module.name]?.can_update || false,
        can_delete: permissions[module.name]?.can_delete || false
      }));

      const response = await fetch(`${API_BASE_URL}/permissions/role/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions: permissionsArray })
      });

      if (!response.ok) throw new Error('Failed to save permissions');

      alert('Permissions saved successfully!');
      navigate('/roles-permissions');
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('Failed to save permissions: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 p-2 ">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => navigate('/roles-permissions')}
            className="p-2 hover:bg-gray-100 rounded  transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl  text-gray-900">Role Permissions</h1>
            <p className="text-xs text-gray-500 mt-1">Home › Roles & Permissions › {roleName}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded   border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 p-2  border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs    text-gray-700">Role Name: <span className=" text-red ">{roleName}</span></p>
                </div>
                <button
                  onClick={() => alert('Allow all modules to this role')}
                  className="text-xs    text-white  hover:text-blue-700 transition-colors"
                >
                  Allow All Modules
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs ">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left  text-gray-700 w-40">Modules</th>
                    <th className="px-6 py-3 text-center  text-gray-700 w-24">Create</th>
                    <th className="px-6 py-3 text-center  text-gray-700 w-24">Edit</th>
                    <th className="px-6 py-3 text-center  text-gray-700 w-24">View</th>
                    <th className="px-6 py-3 text-center  text-gray-700 w-24">Delete</th>
                    <th className="px-6 py-3 text-center  text-gray-700 w-32">Allow All</th>
                    <th className="px-6 py-3 text-center  text-gray-700 w-20">Reset</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map(module => (
                    <tr key={module.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="p-2 ">
                        <p className="  text-gray-900">{module.name}</p>
                        <p className="text-xs text-gray-500">{module.name}</p>
                      </td>
                      <td className="p-2  text-center">
                        <input
                          type="checkbox"
                          checked={permissions[module.name]?.can_create || false}
                          onChange={() => handlePermissionChange(module.name, 'can_create')}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="p-2  text-center">
                        <input
                          type="checkbox"
                          checked={permissions[module.name]?.can_update || false}
                          onChange={() => handlePermissionChange(module.name, 'can_update')}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="p-2  text-center">
                        <input
                          type="checkbox"
                          checked={permissions[module.name]?.can_read || false}
                          onChange={() => handlePermissionChange(module.name, 'can_read')}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="p-2  text-center">
                        <input
                          type="checkbox"
                          checked={permissions[module.name]?.can_delete || false}
                          onChange={() => handlePermissionChange(module.name, 'can_delete')}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="p-2  text-center">
                        <button
                          onClick={() => handleAllowAll(module.name)}
                          className="text-xs   text-white  hover:text-blue-700 transition-colors"
                        >
                          Allow All
                        </button>
                      </td>
                      <td className="p-2  text-center">
                        <button
                          onClick={() => handleResetModule(module.name)}
                          className="text-xs   text-gray-600 hover:text-gray-700 transition-colors"
                        >
                          Reset
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-2  border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => navigate('/roles-permissions')}
                className="p-2  border border-gray-300 rounded  text-xs    text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={isSaving}
                className="p-2  bg-red-600 text-white rounded  text-xs    hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-gray-500 py-6 border-t border-gray-200 bg-white mt-6">
        <span>Copyright © 2025 <span className="text-red   ">Preadmin</span></span>
        <div className="flex gap-2 justify-center mt-2 text-xs">
          <span className="cursor-pointer hover:text-gray-700">About</span>
          <span className="cursor-pointer hover:text-gray-700">Terms</span>
          <span className="cursor-pointer hover:text-gray-700">Contact Us</span>
        </div>
      </div>
    </div>
  );
};

export default RolePermissionsDetailPage;
