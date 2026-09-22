import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  UserCheck,
  UserX,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Layers,
  Calendar,
  RefreshCw,
  AlertCircle,
  X,
  Check,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const StatusBadge = ({ status }) => {
  if (status === 'Approved') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={13} />
        Approved
      </span>
    );
  }
  if (status === 'Rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle size={13} />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <Clock size={13} />
      Pending Review
    </span>
  );
};

const RegistrationRequestsPage = () => {
  const { user: currentUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`${API_BASE_URL}/hr/registration-requests`);
      if (selectedStatus && selectedStatus !== 'all') {
        url.searchParams.append('status', selectedStatus);
      }
      if (searchQuery.trim()) {
        url.searchParams.append('query', searchQuery.trim());
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to load registration requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
      if (data.counts) {
        setCounts(data.counts);
      }
    } catch (err) {
      console.error('Error fetching registration requests:', err);
      showToast('error', err.message || 'Failed to fetch registration requests');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, searchQuery]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleOpenModal = (req) => {
    setSelectedRequest(req);
    setShowRejectPrompt(false);
    setRejectReason('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
    setShowRejectPrompt(false);
    setRejectReason('');
  };

  const handleApprove = async (requestId) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/hr/registration-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewed_by: currentUser?.id || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve request');
      }

      showToast('success', 'User accepted and registered successfully into the CRM!');
      setIsModalOpen(false);
      fetchRequests();
    } catch (err) {
      console.error('Approval error:', err);
      showToast('error', err.message || 'Error approving user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/hr/registration-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewed_by: currentUser?.id || null,
          reason: rejectReason.trim() || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject request');
      }

      showToast('success', 'Registration request rejected and archived.');
      setIsModalOpen(false);
      fetchRequests();
    } catch (err) {
      console.error('Rejection error:', err);
      showToast('error', err.message || 'Error rejecting request');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-6 bg-gray-50/50 min-h-screen space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm animate-fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="text-emerald-600 flex-shrink-0" size={20} />
          ) : (
            <AlertCircle className="text-rose-600 flex-shrink-0" size={20} />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <UserCheck className="text-red-600" size={26} />
            Registration Requests
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review incoming user registrations, verify requested department/role, and accept or reject accounts.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setSelectedStatus('all')}
          className={`p-5 bg-white rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'all' ? 'border-indigo-500 ring-2 ring-indigo-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Requests</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-gray-900">{counts.total}</div>
          <span className="text-xs text-gray-400 mt-1 block">All registered applicants</span>
        </div>

        <div
          onClick={() => setSelectedStatus('Pending')}
          className={`p-5 bg-white rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'Pending' ? 'border-amber-500 ring-2 ring-amber-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 uppercase tracking-wider">Pending Review</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-600">{counts.pending}</div>
          <span className="text-xs text-amber-600/70 mt-1 block">Requires HR / Admin action</span>
        </div>

        <div
          onClick={() => setSelectedStatus('Approved')}
          className={`p-5 bg-white rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'Approved' ? 'border-emerald-500 ring-2 ring-emerald-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Approved Users</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <UserCheck size={18} />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-600">{counts.approved}</div>
          <span className="text-xs text-emerald-600/70 mt-1 block">Active user accounts created</span>
        </div>

        <div
          onClick={() => setSelectedStatus('Rejected')}
          className={`p-5 bg-white rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'Rejected' ? 'border-rose-500 ring-2 ring-rose-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-700 uppercase tracking-wider">Rejected Requests</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <UserX size={18} />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-rose-600">{counts.rejected}</div>
          <span className="text-xs text-rose-600/70 mt-1 block">Archived, no access granted</span>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-lg self-start">
            {[
              { id: 'all', label: 'All', count: counts.total },
              { id: 'Pending', label: 'Pending', count: counts.pending },
              { id: 'Approved', label: 'Approved', count: counts.approved },
              { id: 'Rejected', label: 'Rejected', count: counts.rejected },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  selectedStatus === tab.id
                    ? 'bg-white text-gray-900 shadow-xs font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                    selectedStatus === tab.id
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, department..."
              className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Applicant</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Requested Department</th>
                <th className="py-3.5 px-4">Designation / Role</th>
                <th className="py-3.5 px-4">Requested Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading registration requests...</span>
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="inline-flex p-3 bg-gray-100 rounded-full text-gray-400">
                        <Users size={24} />
                      </div>
                      <p className="font-medium text-gray-700">No registration requests found</p>
                      <p className="text-xs text-gray-400">
                        {searchQuery
                          ? 'Try adjusting your search criteria.'
                          : `There are currently no ${selectedStatus !== 'all' ? selectedStatus.toLowerCase() : ''} requests.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const fullName = `${req.first_name || ''} ${req.last_name || ''}`.trim() || 'Anonymous';
                  const initials = `${req.first_name?.[0] || ''}${req.last_name?.[0] || ''}`.toUpperCase() || 'U';

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-gray-50/70 transition-colors group cursor-pointer"
                      onClick={() => handleOpenModal(req)}
                    >
                      {/* Applicant */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 font-semibold flex items-center justify-center text-xs flex-shrink-0 shadow-xs">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                              {fullName}
                            </div>
                            <div className="text-[11px] text-gray-400">ID #{req.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="text-gray-900 flex items-center gap-1.5">
                            <Mail size={12} className="text-gray-400" />
                            <span>{req.email}</span>
                          </div>
                          {req.phone && (
                            <div className="text-gray-500 flex items-center gap-1.5 text-[11px]">
                              <Phone size={12} className="text-gray-400" />
                              <span>{req.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                          <Layers size={12} className="text-gray-500" />
                          {req.department || 'Not Assigned'}
                        </span>
                      </td>

                      {/* Role / Designation */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-900 flex items-center gap-1">
                          <Briefcase size={13} className="text-gray-400" />
                          <span>{req.role_type || req.role_name || 'Employee'}</span>
                        </div>
                        {req.role_name && req.role_name !== req.role_type && (
                          <div className="text-[11px] text-gray-400">System: {req.role_name}</div>
                        )}
                      </td>

                      {/* Submission Date */}
                      <td className="py-3.5 px-4 text-gray-500 text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-gray-400" />
                          {formatDate(req.created_at)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={req.status} />
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenModal(req)}
                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                            title="View all filled form details"
                          >
                            <Eye size={16} />
                          </button>

                          {req.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(req.id)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1 shadow-xs disabled:opacity-50"
                                title="Accept and Register this user"
                              >
                                <Check size={13} />
                                <span>Accept</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setShowRejectPrompt(true);
                                  setIsModalOpen(true);
                                }}
                                disabled={actionLoading}
                                className="px-2.5 py-1 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                                title="Reject this request"
                              >
                                <X size={13} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Details Modal */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center text-sm shadow-xs">
                  {selectedRequest.first_name?.[0] || 'U'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {selectedRequest.first_name} {selectedRequest.last_name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Registration Request #{selectedRequest.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge status={selectedRequest.status} />
                <button
                  onClick={handleCloseModal}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Informational Banner */}
              {selectedRequest.status === 'Approved' && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">User Account Approved & Registered</div>
                    <div className="text-emerald-700 mt-0.5">
                      This user has been created and activated in the CRM. They can log in with their email and password.
                    </div>
                  </div>
                </div>
              )}

              {selectedRequest.status === 'Rejected' && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2.5">
                  <XCircle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Request Rejected</div>
                    <div className="text-rose-700 mt-0.5">
                      This registration request was rejected. No user account was created. It is retained strictly as an audit record.
                    </div>
                  </div>
                </div>
              )}

              {/* Form Details Grid */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Submitted Registration Information
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-xs text-gray-500 block">First Name</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedRequest.first_name}</span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-500 block">Last Name</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedRequest.last_name || '-'}</span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-500 block">Email Address</span>
                    <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <Mail size={14} className="text-gray-400" />
                      {selectedRequest.email}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-500 block">Phone Number</span>
                    <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <Phone size={14} className="text-gray-400" />
                      {selectedRequest.phone || 'Not provided'}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-500 block">Requested Department</span>
                    <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <Layers size={14} className="text-gray-400" />
                      {selectedRequest.department || 'Not selected'}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-500 block">Requested Role / Designation</span>
                    <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <Briefcase size={14} className="text-gray-400" />
                      {selectedRequest.role_type || selectedRequest.role_name || 'Employee'}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-500 block">System Role Assigned on Approval</span>
                    <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded inline-block">
                      {selectedRequest.role_name || selectedRequest.role_type || 'Employee'}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-500 block">Submission Date</span>
                    <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <Calendar size={14} className="text-gray-400" />
                      {formatDate(selectedRequest.created_at)}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-500 block">Password Security</span>
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                      Securely Hashed & Ready for Activation
                    </span>
                  </div>
                </div>
              </div>

              {/* Reviewer Audit Trail */}
              {(selectedRequest.reviewed_at || selectedRequest.reviewed_by) && (
                <div className="space-y-2 p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                  <h4 className="font-bold text-gray-700 uppercase tracking-wider">Review Audit Trail</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-600">
                    <div>
                      <span className="text-gray-400 block">Reviewed By:</span>
                      <span className="font-medium text-gray-900">
                        {selectedRequest.reviewer_name || selectedRequest.reviewer_email || `Admin/HR #${selectedRequest.reviewed_by}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Reviewed On:</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedRequest.reviewed_at)}</span>
                    </div>
                  </div>
                  {selectedRequest.review_notes && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <span className="text-gray-400 block">Notes / Reason:</span>
                      <p className="text-gray-800 italic mt-0.5">{selectedRequest.review_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Rejection Prompt Box */}
              {showRejectPrompt && selectedRequest.status === 'Pending' && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs">
                    <ShieldAlert size={16} />
                    <span>Confirm Rejection of Registration Request</span>
                  </div>
                  <p className="text-xs text-rose-700">
                    Are you sure you want to reject this request? The candidate will not be registered, and no user account will be created.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Reason for Rejection (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Incomplete information, unauthorized role request, etc."
                      className="w-full p-2 bg-white border border-gray-300 rounded text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectPrompt(false)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(selectedRequest.id)}
                      disabled={actionLoading}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium flex items-center gap-1.5 shadow-xs"
                    >
                      {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-medium transition-colors"
              >
                Close
              </button>

              {selectedRequest.status === 'Pending' && !showRejectPrompt && (
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowRejectPrompt(true)}
                    disabled={actionLoading}
                    className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <UserX size={15} />
                    <span>Reject Request</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(selectedRequest.id)}
                    disabled={actionLoading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 active:scale-98"
                  >
                    {actionLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <UserCheck size={16} />
                        <span>Accept and Register User</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationRequestsPage;
