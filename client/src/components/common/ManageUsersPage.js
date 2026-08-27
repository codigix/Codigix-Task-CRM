import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Star,
  X,
  CheckCircle,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import AddNewUserModal from './AddNewUserModal';
import EditUserModal from './EditUserModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import FilterPanel from './FilterPanel';
import DateRangePicker from './DateRangePicker';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const dummyUsersData = [];

const ManageUsersPage = () => {
  const [users, setUsers] = useState(dummyUsersData);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDelete, setIsBulkDelete] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({
    names: [],
    phones: [],
    emails: [],
    statuses: [],
  });
  const [sortBy, setSortBy] = useState('newest');
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isColumnsDropdownOpen, setIsColumnsDropdownOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    phone: true,
    email: true,
    created: true,
    lastActivity: true,
    status: true,
    action: true,
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
    label: '1 Dec 25 - 1 Dec 25'
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/roles`);
      if (!response.ok) throw new Error('Failed to fetch roles');
      const data = await response.json();
      setRoles(data);
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();

      console.log('API Users Data:', data);

      if (!data || data.length === 0) {
        setUsers(dummyUsersData);
        return;
      }

      const formattedUsers = data.map(user => ({
        id: user.id,
        name: user.first_name || user.username || 'Unknown',
        role: user.role_name || 'Viewer',
        avatar: user.avatar || `https://i.pravatar.cc/40?img=${user.id}`,
        phone: user.phone1 || '',
        email: user.email || '',
        created: user.created_at ? new Date(user.created_at).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'Unknown',
        lastActivity: '2 mins ago',
        status: user.status || 'Active'
      }));

      console.log('Formatted Users:', formattedUsers);
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers(dummyUsersData);
    }
  };

  const filteredUsers = useMemo(() => {
    let result = users;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q)
      );
    }

    if (appliedFilters.names.length > 0) {
      result = result.filter(u => appliedFilters.names.includes(u.name));
    }

    if (appliedFilters.phones.length > 0) {
      result = result.filter(u => appliedFilters.phones.includes(u.phone));
    }

    if (appliedFilters.emails.length > 0) {
      result = result.filter(u => appliedFilters.emails.includes(u.email));
    }

    if (appliedFilters.statuses.length > 0) {
      result = result.filter(u => appliedFilters.statuses.includes(u.status));
    }

    if (sortBy === 'newest') {
      result = [...result].reverse();
    }

    return result;
  }, [searchQuery, users, appliedFilters, sortBy]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const toggleUserSelection = (userId) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleAllUsers = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map(u => u.id)));
    }
  };

  const handleManagePermissions = (user) => {
    navigate('/roles-permissions', { state: { userId: user.id, userName: user.name } });
  };

  const handleEditUser = (user) => {
    const userWithFullData = {
      id: user.id,
      first_name: user.name,
      username: user.name?.split(' ')[0].toLowerCase() || '',
      email: user.email,
      phone1: user.phone,
      phone1_country: 'US',
      phone2: '',
      phone2_country: 'US',
      location: '',
      avatar: user.avatar,
      role_name: user.role,
      role_id: 1,
      email_opt_out: false,
      status: user.status,
      created_at: user.created
    };
    setSelectedUser(userWithFullData);
    setIsEditModalOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedUsers.size === 0) return;
    setIsBulkDelete(true);
    setUserToDelete(null);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteUser = (user) => {
    setIsBulkDelete(false);
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!isBulkDelete && !userToDelete) return;
    if (isBulkDelete && selectedUsers.size === 0) return;

    setIsDeleting(true);
    try {
      if (isBulkDelete) {
        const userIds = Array.from(selectedUsers);
        // Assuming the API supports multiple delete or we loop
        for (const userId of userIds) {
          const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });
          if (!response.ok) throw new Error(`Failed to delete user ${userId}`);
        }
        setUsers(prev => prev.filter(u => !selectedUsers.has(u.id)));
        showMessage('success', `${selectedUsers.size} users deleted successfully!`);
        setSelectedUsers(new Set());
      } else {
        const response = await fetch(`${API_BASE_URL}/users/${userToDelete.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete user');
        }

        setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
        showMessage('success', `User "${userToDelete.name}" deleted successfully!`);
      }
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      setIsBulkDelete(false);
    } catch (err) {
      showMessage('error', err.message || 'Failed to delete user(s)');
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setUserToDelete(null);
    setIsBulkDelete(false);
  };

  const handleEditSuccess = (updatedUser) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    showMessage('success', 'User updated successfully!');
    setIsEditModalOpen(false);
  };

  const handleAddUserSuccess = (newUser) => {
    setUsers(prev => [newUser, ...prev]);
    fetchUsers();
    showMessage('success', 'User created successfully!');
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 5000);
  };

  const handleApplyFilter = (filters) => {
    setAppliedFilters(filters);
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setAppliedFilters({
      names: [],
      phones: [],
      emails: [],
      statuses: [],
    });
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    fetchUsers();
    showMessage('success', 'Users list refreshed');
  };

  const handleExportPDF = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Role', 'Status', 'Created'],
      ...paginatedUsers.map(u => [u.name, u.email, u.phone, u.role, u.status, u.created])
    ].map(row => row.join(',')).join('\n');

    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    link.download = 'users-list.csv';
    link.click();
    setIsExportDropdownOpen(false);
  };

  const handleExportExcel = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Role', 'Status', 'Created'],
      ...paginatedUsers.map(u => [u.name, u.email, u.phone, u.role, u.status, u.created])
    ].map(row => row.join(',')).join('\n');

    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    link.download = 'users-list.xlsx';
    link.click();
    setIsExportDropdownOpen(false);
  };

  const toggleColumnVisibility = (column) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const handleDateRangeChange = (range) => {
    setSelectedDateRange(range);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Message Toast */}
      {message.text && (
        <div className={`fixed top-2 right-4 flex items-center gap-3 px-4 py-3 rounded  shadow-lg z-40 ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
          {message.type === 'success' ? (
            <CheckCircle size={20} className="text-green-600" />
          ) : (
            <AlertCircle size={20} className="text-red " />
          )}
          <span className={`text-xs    ${message.type === 'success' ? 'text-green-700' : 'text-red-700'
            }`}>
            {message.text}
          </span>
          <button
            onClick={() => setMessage({ type: '', text: '' })}
            className={`ml-2 ${message.type === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red  hover:text-red-800'}`}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-2 ">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl  text-gray-900">Manage Users</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs   bg-red-100 text-red-800">
                152
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Home › Manage Users</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-red-600 text-white p-2  rounded  text-xs    hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <span className="text-lg">⊕</span>
            Add User
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Filter Bar */}
          <div className="bg-white rounded   border border-gray-200 p-2 mb-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap relative">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1F2020]" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded  focus:outline-none focus:border-gray-400 text-xs  bg-white w-64"
                  />
                </div>
                <div className="relative">
                  <button
                    onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                    className={`p-2 rounded  text-xs    flex items-center gap-2 transition-colors ${Object.values(appliedFilters).some(arr => arr.length > 0)
                      ? 'bg-red-600 text-white hover:bg-red-700 border border-red-600'
                      : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    <Filter size={16} /> Filter
                  </button>
                  {isFilterPanelOpen && (
                    <FilterPanel
                      isOpen={isFilterPanelOpen}
                      onClose={() => setIsFilterPanelOpen(false)}
                      users={users}
                      onFilter={handleApplyFilter}
                      onReset={handleResetFilter}
                    />
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    className="flex items-center gap-2 text-xs  text-gray-600 hover:bg-gray-50 p-1  rounded transition-colors"
                  >
                    <span>📅</span>
                    <span>{selectedDateRange.label}</span>
                  </button>
                  {isDatePickerOpen && (
                    <DateRangePicker
                      isOpen={isDatePickerOpen}
                      onClose={() => setIsDatePickerOpen(false)}
                      onDateRangeChange={handleDateRangeChange}
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedUsers.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="p-2 bg-red-50 text-red  border border-red-200 rounded  text-xs    hover:bg-red-100 flex items-center gap-2"
                  >
                    <Trash2 size={16} /> Delete Selected ({selectedUsers.size})
                  </button>
                )}
                <div className="relative">
                  <button
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    className="p-2 border border-gray-300 rounded  text-gray-600 text-xs    hover:bg-gray-50 flex items-center gap-2"
                  >
                    Sort By <ChevronDown size={14} />
                  </button>
                  {isSortDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded  shadow-lg z-20">
                      <button
                        onClick={() => { setSortBy('newest'); setIsSortDropdownOpen(false); }}
                        className={`w-full text-left p-2  text-xs  ${sortBy === 'newest' ? 'bg-red-50 text-red   ' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        Newest
                      </button>
                      <button
                        onClick={() => { setSortBy('oldest'); setIsSortDropdownOpen(false); }}
                        className={`w-full text-left p-2  text-xs  border-t border-gray-100 ${sortBy === 'oldest' ? 'bg-red-50 text-red   ' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        Oldest
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                    className="p-2 border border-gray-300 rounded  text-gray-600 text-xs    hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Download size={16} /> Export <ChevronDown size={14} />
                  </button>
                  {isExportDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded  shadow-lg z-20">
                      <button
                        onClick={handleExportPDF}
                        className="w-full text-left p-2  hover:bg-gray-50 text-xs  text-gray-700 border-b border-gray-100"
                      >
                        Export as PDF
                      </button>
                      <button
                        onClick={handleExportExcel}
                        className="w-full text-left p-2  hover:bg-gray-50 text-xs  text-gray-700"
                      >
                        Export as Excel
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleRefresh}
                  className="p-2 border border-gray-300 rounded  text-gray-600 text-xs    hover:bg-gray-50"
                >
                  ↻
                </button>
                <div className="relative">
                  <button
                    onClick={() => setIsColumnsDropdownOpen(!isColumnsDropdownOpen)}
                    className="p-2 border border-gray-300 rounded  text-gray-600 text-xs    hover:bg-gray-50"
                  >
                    ≡
                  </button>
                  {isColumnsDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded  shadow-lg z-20 p-3">
                      <div className="text-xs   text-gray-900 mb-3 px-2">Manage Columns</div>
                      <div className="space-y-2">
                        {Object.entries(visibleColumns).map(([column, visible]) => (
                          <label key={column} className="flex items-center gap-2 cursor-pointer px-2 hover:bg-gray-50 py-1 rounded">
                            <input
                              type="checkbox"
                              checked={visible}
                              onChange={() => toggleColumnVisibility(column)}
                              className="w-4 h-4 cursor-pointer"
                            />
                            <span className="text-xs  text-gray-700 capitalize">{column === 'lastActivity' ? 'Last Activity' : column}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded   border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs ">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === paginatedUsers.length && paginatedUsers.length > 0}
                        onChange={toggleAllUsers}
                        className="cursor-pointer w-4 h-4"
                      />
                    </th>
                    <th className="px-6 py-3 text-left">
                      <Star size={16} className="text-[#1F2020]" />
                    </th>
                    {visibleColumns.name && <th className="px-6 py-3 text-left  text-gray-700">Name</th>}
                    {visibleColumns.phone && <th className="px-6 py-3 text-left  text-gray-700">Phone</th>}
                    {visibleColumns.email && <th className="px-6 py-3 text-left  text-gray-700">Email</th>}
                    {visibleColumns.created && <th className="px-6 py-3 text-left  text-gray-700">Created</th>}
                    {visibleColumns.lastActivity && <th className="px-6 py-3 text-left  text-gray-700">Last Activity</th>}
                    {visibleColumns.status && <th className="px-6 py-3 text-left  text-gray-700">Status</th>}
                    {visibleColumns.action && <th className="px-6 py-3 text-left  text-gray-700">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="p-2 ">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="cursor-pointer w-4 h-4"
                        />
                      </td>
                      <td className="p-2 ">
                        <button className="text-[#1F2020] hover:text-yellow-500 transition-colors">
                          <Star size={16} />
                        </button>
                      </td>
                      {visibleColumns.name && (
                        <td className="p-2 ">
                          <div className="flex items-center gap-3">
                            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                            <div>
                              <p className="  text-gray-900">{user.name}</p>
                              <p className="text-xs text-gray-500">{user.role}</p>
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.phone && <td className="p-2  text-gray-700">{user.phone}</td>}
                      {visibleColumns.email && <td className="p-2  text-gray-700">{user.email}</td>}
                      {visibleColumns.created && <td className="p-2  text-gray-700 text-xs ">{user.created}</td>}
                      {visibleColumns.lastActivity && <td className="p-2  text-gray-700 text-xs ">{user.lastActivity}</td>}
                      {visibleColumns.status && (
                        <td className="p-2 ">
                          <span className={`px-3 py-1 rounded-full text-xs  text-white ${user.status === 'Active' ? 'bg-green-500' : 'bg-red-500'
                            }`}>
                            {user.status}
                          </span>
                        </td>
                      )}
                      {visibleColumns.action && (<td className="p-2 ">
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                            className="p-2 hover:bg-gray-200 rounded transition-colors"
                          >
                            <MoreVertical size={16} className="text-gray-600" />
                          </button>
                          {openMenuId === user.id && (
                            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded  shadow-lg z-20">
                              <button
                                onClick={() => {
                                  handleEditUser(user);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left p-2  hover:bg-gray-50 text-xs  text-gray-700 border-b border-gray-100"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  handleManagePermissions(user);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left p-2  hover:bg-gray-50 text-xs  text-gray-700 border-b border-gray-100"
                              >
                                Manage Permissions
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteUser(user);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left p-2  hover:bg-gray-50 text-xs  text-red "
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-2  border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs  text-gray-600">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded p-1  bg-white"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>entries</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-2 border border-gray-300 rounded  text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`p-2 rounded  text-xs    transition-colors ${currentPage === i + 1
                      ? 'bg-red-600 text-white'
                      : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-2 border border-gray-300 rounded  text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 py-6 border-t border-gray-200 bg-white mt-6">
        <span>Copyright © 2025 <span className="text-red   ">Preadmin</span></span>
        <div className="flex gap-2 justify-center mt-2 text-xs">
          <span className="cursor-pointer hover:text-gray-700">About</span>
          <span className="cursor-pointer hover:text-gray-700">Terms</span>
          <span className="cursor-pointer hover:text-gray-700">Contact Us</span>
        </div>
      </div>

      <AddNewUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAddUserSuccess}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        user={selectedUser}
        roles={roles}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        userName={userToDelete?.name}
        isDeleting={isDeleting}
        count={isBulkDelete ? selectedUsers.size : (userToDelete ? 1 : 0)}
      />
    </div>
  );
};

export default ManageUsersPage;
