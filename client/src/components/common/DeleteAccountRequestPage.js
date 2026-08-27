import React, { useState, useEffect, useMemo } from 'react';
import { Search, MoreVertical, Download, ChevronDown, Filter, Check, AlertCircle } from 'lucide-react';
import DeleteRequestModal from './DeleteRequestModal';
import ColumnFilterDropdown from './ColumnFilterDropdown';
import DeleteRequestFilterPanel from './DeleteRequestFilterPanel';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const StatusBadge = ({ status }) => {
  if (status === 'Rejected') {
    return <span className="inline-flex items-center px-3 py-1 rounded text-xs  bg-red-100 text-red-800">Rejected</span>;
  }
  if (status === 'Approved') {
    return <span className="inline-flex items-center px-3 py-1 rounded text-xs  bg-green-100 text-green-800">Approved</span>;
  }
  return <span className="inline-flex items-center px-3 py-1 rounded text-xs  bg-yellow-100 text-yellow-800">Pending</span>;
};

const ApprovalModal = ({ isOpen, request, onApprove, onReject, onClose, loading }) => {
  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded  shadow-xlp-3  w-96">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0">
            <Check className="h-6 w-6 text-yellow-600" />
          </div>
          <h3 className="text-md  text-gray-900">Review Delete Request</h3>
        </div>

        <div className="mb-6">
          <p className="text-xs  text-gray-600 mb-4">
            <strong>{request.first_name}</strong> ({request.email}) has requested account deletion.
          </p>
          <p className="text-xs  text-gray-600 mb-2"><strong>Reason:</strong></p>
          <p className="text-xs  text-gray-700 bg-gray-50 p-3 rounded">{request.reason}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 p-2  text-xs    text-gray-700 bg-gray-100 hover:bg-gray-200 rounded  transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onReject(request.id)}
            disabled={loading}
            className="flex-1 p-2  text-xs    text-white bg-red-600 hover:bg-red-700 rounded  transition-colors disabled:opacity-50"
          >
            Reject
          </button>
          <button
            onClick={() => onApprove(request.id)}
            disabled={loading}
            className="flex-1 p-2  text-xs    text-white bg-green-600 hover:bg-green-700 rounded  transition-colors disabled:opacity-50"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

const columnOptions = [
  { key: 'user', label: 'User' },
  { key: 'email', label: 'Email' },
  { key: 'requested_date', label: 'Requested Date' },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status' },
  { key: 'action', label: 'Action' },
];

const DeleteAccountRequestPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false);
  const [userDeleteRequest, setUserDeleteRequest] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(columnOptions.map(col => col.key));
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({
    statuses: [],
    users: [],
  });

  const handleFilterPanelApply = (filters) => {
    setAppliedFilters(filters);
    setPage(1);
  };

  const handleFilterReset = () => {
    setAppliedFilters({
      statuses: [],
      users: [],
    });
    setPage(1);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDeleteRequests(),
        fetchCurrentUser()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      if (data && data.length > 0) {
        setCurrentUser(data[0]);

        const deleteReq = await fetchUserDeleteRequest(data[0].id);
        if (deleteReq) {
          setUserDeleteRequest(deleteReq);
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUserDeleteRequest = async (userId) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/delete-requests`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      return data.find(req => req.user_id === userId);
    } catch (error) {
      return null;
    }
  };

  const fetchDeleteRequests = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/delete-requests`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching delete requests:', error);
      setRequests([]);
    }
  };

  const handleApprove = async (id) => {
    setApprovalLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/delete-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Approved', reviewed_by: 1 })
      });
      if (!response.ok) throw new Error('Failed to approve');
      setSuccessMessage('Request approved successfully');
      setShowApprovalModal(false);
      await fetchDeleteRequests();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleReject = async (id) => {
    setApprovalLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/delete-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected', reviewed_by: 1 })
      });
      if (!response.ok) throw new Error('Failed to reject');
      setSuccessMessage('Request rejected successfully');
      setShowApprovalModal(false);
      await fetchDeleteRequests();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleDeleteRequestSuccess = () => {
    setShowDeleteRequestModal(false);
    setSuccessMessage('Delete request submitted successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
    fetchData();
  };

  const filtered = useMemo(() => {
    let list = requests;

    if (appliedFilters.statuses && appliedFilters.statuses.length > 0) {
      list = list.filter((r) => appliedFilters.statuses.includes(r.status));
    }

    if (appliedFilters.users && appliedFilters.users.length > 0) {
      list = list.filter((r) => appliedFilters.users.includes(r.first_name));
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.first_name?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.reason?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [query, appliedFilters, requests]);

  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <p className="mt-4 text-gray-600">Loading delete requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {successMessage && (
        <div className="fixed top-2 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-40 animate-fadeIn">
          {successMessage}
        </div>
      )}

      {/* Current User Section */}
      {currentUser && (
        <div className="bg-white border-b border-gray-200 px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src={currentUser.avatar || `https://i.pravatar.cc/100?u=${currentUser.email}`}
                alt={currentUser.first_name}
                className="w-16 h-16 rounded-full object-cover"
                onError={(e) => { e.target.src = `https://i.pravatar.cc/100?u=${currentUser.email}` }}
              />
              <div>
                <h2 className="text-md  text-gray-900">{currentUser.first_name}</h2>
                <p className="text-xs  text-gray-600">{currentUser.email}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Member since {new Date(currentUser.created_at).toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>
            {userDeleteRequest ? (
              <div className="text-right">
                <p className="text-xs  text-gray-600 mb-2">Your Delete Request Status:</p>
                <StatusBadge status={userDeleteRequest.status} />
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteRequestModal(true)}
                className="p-2  bg-red-600 text-white   rounded  hover:bg-red-700 transition-colors"
              >
                Request Account Deletion
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-2 ">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl  text-gray-900">Delete Account Requests</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs   bg-red-100 text-red-800">
                {requests.length}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Home › Delete Account Requests</p>
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
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border-b border-gray-200 p-2 ">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1F2020]" />
          <input
            type="text"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded  focus:outline-none focus:border-gray-400 text-xs  bg-white w-full max-w-xs"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 p-2 ">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className="flex items-center gap-2 p-2 border border-gray-300 rounded  text-xs  text-gray-700 bg-white hover:bg-blue-50 hover:border-blue-300 transition-colors  "
            >
              <Filter size={16} />
              Filter
              {(appliedFilters.statuses.length > 0 || appliedFilters.users.length > 0) && (
                <span className="ml-1 p-1  bg-blue-500 text-white text-xs rounded-full ">
                  {appliedFilters.statuses.length + appliedFilters.users.length}
                </span>
              )}
            </button>
            <DeleteRequestFilterPanel
              isOpen={isFilterPanelOpen}
              onClose={() => setIsFilterPanelOpen(false)}
              requests={requests}
              onFilter={handleFilterPanelApply}
              onReset={handleFilterReset}
            />
            <div className="p-2 border border-gray-300 rounded  text-xs  bg-white text-gray-700">
              {new Date().toLocaleDateString('en-GB')}
            </div>
            <ColumnFilterDropdown
              columns={columnOptions}
              visibleColumns={visibleColumns}
              onColumnsChange={setVisibleColumns}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="p-6">
        <div className="bg-white rounded   border border-gray-200 overflow-hidden">
          {requests.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle size={48} className="mx-auto text-[#1F2020] mb-4" />
              <h3 className="text-md  text-gray-900 mb-2">No Delete Requests</h3>
              <p className="text-gray-600">No account deletion requests at the moment.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs ">
                  <thead>
                    <tr className="bg-blue-50 border-b border-gray-200">
                      <th className="py-3 px-4 text-left w-8">
                        <input type="checkbox" className="cursor-pointer" />
                      </th>
                      {visibleColumns.includes('user') && (
                        <th className="py-3 px-4 text-left  text-gray-700">User</th>
                      )}
                      {visibleColumns.includes('email') && (
                        <th className="py-3 px-4 text-left  text-gray-700">Email</th>
                      )}
                      {visibleColumns.includes('requested_date') && (
                        <th className="py-3 px-4 text-left  text-gray-700">Requested Date</th>
                      )}
                      {visibleColumns.includes('reason') && (
                        <th className="py-3 px-4 text-left  text-gray-700">Reason</th>
                      )}
                      {visibleColumns.includes('status') && (
                        <th className="py-3 px-4 text-left  text-gray-700">Status</th>
                      )}
                      {visibleColumns.includes('action') && (
                        <th className="py-3 px-4 text-left  text-gray-700">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map((request) => (
                      <tr key={request.id} className="border-b border-gray-200 hover:bg-blue-50 transition-colors">
                        <td className="py-3 px-4">
                          <input type="checkbox" className="cursor-pointer" />
                        </td>
                        {visibleColumns.includes('user') && (
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={request.avatar || `https://i.pravatar.cc/100?u=${request.email}`}
                                alt={request.first_name}
                                className="w-10 h-10 rounded-full object-cover"
                                onError={(e) => { e.target.src = `https://i.pravatar.cc/100?u=${request.email}` }}
                              />
                              <div>
                                <p className="  text-gray-900">{request.first_name || 'N/A'}</p>
                              </div>
                            </div>
                          </td>
                        )}
                        {visibleColumns.includes('email') && (
                          <td className="py-3 px-4 text-gray-600">{request.email || 'N/A'}</td>
                        )}
                        {visibleColumns.includes('requested_date') && (
                          <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                            {new Date(request.requested_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                        )}
                        {visibleColumns.includes('reason') && (
                          <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={request.reason}>
                            {request.reason}
                          </td>
                        )}
                        {visibleColumns.includes('status') && (
                          <td className="py-3 px-4">
                            <StatusBadge status={request.status} />
                          </td>
                        )}
                        {visibleColumns.includes('action') && (
                          <td className="py-3 px-4">
                            <div className="relative">
                              <button
                                onClick={() => setOpenMenuId(openMenuId === request.id ? null : request.id)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                              >
                                <MoreVertical size={16} className="text-[#1F2020]" />
                              </button>
                              {openMenuId === request.id && (
                                <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded  shadow-lg z-20">
                                  {request.status === 'Pending' && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedRequest(request);
                                          setShowApprovalModal(true);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full text-left p-2  hover:bg-gray-50 text-xs  text-gray-700"
                                      >
                                        Review Request
                                      </button>
                                      <div className="border-t border-gray-200"></div>
                                    </>
                                  )}
                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left p-2  hover:bg-gray-50 text-xs  text-gray-700"
                                  >
                                    View Details
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

              {pageData.length > 0 && (
                <div className="flex items-center justify-between p-2  border-t border-gray-200 bg-gray-50">
                  <div className="text-xs  text-gray-600">
                    Showing {pageData.length} of {filtered.length} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((s) => Math.max(1, s - 1))}
                      className="px-3 py-1 border border-gray-300 rounded text-xs  hover:bg-gray-100 transition-colors disabled:opacity-50"
                      disabled={page === 1}
                    >
                      &lt;
                    </button>
                    <button className="px-3 py-1 bg-red-600 text-white rounded text-xs ">{page}</button>
                    <button
                      onClick={() => setPage((s) => Math.min(pages, s + 1))}
                      className="px-3 py-1 border border-gray-300 rounded text-xs  hover:bg-gray-100 transition-colors disabled:opacity-50"
                      disabled={page === pages}
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ApprovalModal
        isOpen={showApprovalModal}
        request={selectedRequest}
        onApprove={handleApprove}
        onReject={handleReject}
        onClose={() => {
          setShowApprovalModal(false);
          setSelectedRequest(null);
        }}
        loading={approvalLoading}
      />

      {currentUser && (
        <DeleteRequestModal
          isOpen={showDeleteRequestModal}
          onClose={() => setShowDeleteRequestModal(false)}
          userId={currentUser.id}
          onSuccess={handleDeleteRequestSuccess}
        />
      )}

      <div className="text-center text-xs text-gray-500 py-6 border-t border-gray-200 bg-white">
        <span>
          Copyright © 2025{' '}
          <span className="text-red   ">Preadmin</span>
        </span>
        <div className="flex gap-2 justify-center mt-2">
          <span className="cursor-pointer hover:text-gray-700">About</span>
          <span className="cursor-pointer hover:text-gray-700">Terms</span>
          <span className="cursor-pointer hover:text-gray-700">Contact Us</span>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountRequestPage;
