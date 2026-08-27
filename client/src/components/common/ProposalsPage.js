import React, { useState, useEffect } from 'react';
import { MoreVertical, Plus, Grid3x3, List, Download, Send, CheckCircle, XCircle, Edit2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { proposalsAPI, companiesAPI, contactsAPI, dealsAPI } from '../../services/api';
import AddNewProposalModal from './AddNewProposalModal';

const ProposalsPage = ({ onViewDetails }) => {
  const [viewMode, setViewMode] = useState('grid');
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchText, setSearchText] = useState('');
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [showActionMenu, setShowActionMenu] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, [filterStatus, searchText]);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const filters = {};
      if (filterStatus) filters.status = filterStatus;
      if (searchText) filters.search = searchText;

      console.log('🚀 Starting API calls...');

      let proposalsData = [];
      let companiesData = [];
      let contactsData = [];
      let dealsData = [];

      try {
        proposalsData = await proposalsAPI.getAll(filters);
        console.log('✅ Proposals loaded:', proposalsData?.length);
      } catch (err) {
        console.warn('⚠️ Proposals fetch failed (non-critical):', err.message);
        proposalsData = [];
      }

      try {
        companiesData = await companiesAPI.getAll();
        console.log('✅ Companies loaded:', companiesData?.length);
      } catch (err) {
        console.error('❌ Companies failed:', err.message);
        companiesData = [];
      }

      try {
        contactsData = await contactsAPI.getAll();
        console.log('✅ Contacts loaded:', contactsData?.length);
      } catch (err) {
        console.error('❌ Contacts failed:', err.message);
        contactsData = [];
      }

      try {
        dealsData = await dealsAPI.getAll();
        console.log('✅ Deals loaded:', dealsData?.length);
      } catch (err) {
        console.error('❌ Deals failed:', err.message);
        dealsData = [];
      }

      console.log('📊 Final data summary:', {
        proposals: proposalsData?.length,
        companies: companiesData?.length,
        contacts: contactsData?.length,
        deals: dealsData?.length
      });

      setProposals(proposalsData);
      setCompanies(companiesData);
      setContacts(contactsData);
      setDeals(dealsData);
    } catch (err) {
      const errorMsg = err.message || 'Unknown error';
      setError('Failed to load proposals: ' + errorMsg);
      console.error('❌ Load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProposal = async (formData) => {
    try {
      console.log('📝 Creating proposal in ProposalsPage:', formData);
      const proposal_number = `PROP-${Date.now()}`;
      const response = await proposalsAPI.create({
        ...formData,
        proposal_number,
        created_by: 1,
      });
      console.log('✅ Proposal created:', response);
      setShowCreateModal(false);
      await loadInitialData();
    } catch (err) {
      const errorMsg = err.message || 'Unknown error';
      console.error('❌ Failed to create proposal:', err);
      alert('Failed to create proposal: ' + errorMsg);
    }
  };

  const handleStatusChange = async (proposalId, newStatus) => {
    try {
      await proposalsAPI.updateStatus(proposalId, {
        status: newStatus,
        action_by: 1
      });
      setShowActionMenu(null);
      await loadInitialData();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleDeleteProposal = async (proposalId) => {
    if (window.confirm('Are you sure you want to delete this proposal?')) {
      try {
        await proposalsAPI.delete(proposalId);
        await loadInitialData();
      } catch (err) {
        alert('Failed to delete proposal: ' + err.message);
      }
    }
  };

  const handleConvertToInvoice = async (proposalId) => {
    try {
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) return;

      const result = await Swal.fire({
        title: 'Convert to Invoice?',
        html: `<p>Convert <strong>${proposal.proposal_number}</strong> to invoice?</p>
               <p style="font-size: 0.9em; color: #666; margin-top: 10px;">Amount: <strong>${proposal.currency || 'INR'} ${(proposal.total_amount || 0).toLocaleString()}</strong></p>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Convert!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        await proposalsAPI.convertToInvoice(proposalId, { total_amount: proposal.total_amount });

        await Swal.fire({
          title: 'Success!',
          html: `<p>Proposal <strong>${proposal.proposal_number}</strong> converted to invoice!</p>
                 <p style="font-size: 0.85em; color: #666; margin-top: 10px;">Invoice will appear in Invoices page in a few seconds</p>`,
          icon: 'success',
          confirmButtonColor: '#3085d6',
          timer: 2000,
          timerProgressBar: true
        });

        setShowActionMenu(null);
        await loadInitialData();
      }
    } catch (err) {
      await Swal.fire({
        title: 'Error',
        html: `<p>Failed to convert to invoice: ${err.message}</p>`,
        icon: 'error',
        confirmButtonColor: '#d33'
      });
    }
  };

  const handleSendProposal = async (proposalId) => {
    try {
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) return;

      const result = await Swal.fire({
        title: 'Send Proposal?',
        html: `<p>Send <strong>${proposal.proposal_number}</strong> to client?</p>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Send it!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        await proposalsAPI.send(proposalId, { action_by: 1, client_email: proposal.client_email });

        await Swal.fire({
          title: 'Success!',
          html: `<p>Proposal <strong>${proposal.proposal_number}</strong> sent successfully!</p>`,
          icon: 'success',
          confirmButtonColor: '#3085d6',
          timer: 2000,
          timerProgressBar: true
        });

        setShowActionMenu(null);
        await loadInitialData();
      }
    } catch (err) {
      await Swal.fire({
        title: 'Error',
        html: `<p>Failed to send proposal: ${err.message}</p>`,
        icon: 'error',
        confirmButtonColor: '#d33'
      });
    }
  };

  const handleConvertToContract = async (proposalId) => {
    try {
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) return;

      const result = await Swal.fire({
        title: 'Convert to Contract?',
        html: `<p>Convert proposal <strong>${proposal.proposal_number}</strong> to a contract?</p>
               <p style="font-size: 0.9em; color: #666; margin-top: 10px;">Amount: <strong>${proposal.currency || 'INR'} ${(proposal.total_amount || 0).toLocaleString()}</strong></p>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Convert it!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        console.log(`🔄 Calling convertToContract API for proposal ${proposalId}...`);
        const response = await proposalsAPI.convertToContract(proposalId, {});
        console.log(`✅ API Response:`, response);

        await Swal.fire({
          title: 'Success!',
          html: `<p>Contract created successfully!</p>
                 <p style="font-size: 0.9em; color: #666; margin-top: 10px;"><strong>${response.contractSubject}</strong></p>
                 <p style="font-size: 0.85em; color: #666; margin-top: 15px; padding: 8px; background: #f0f9ff; border-left: 3px solid #3b82f6; border-radius: 4px;">
                   ✅ New contract will appear in Contracts page in a few seconds
                 </p>`,
          icon: 'success',
          confirmButtonColor: '#16a34a',
          confirmButtonText: 'OK',
          allowOutsideClick: false,
          allowEscapeKey: false
        });

        setShowActionMenu(null);
        console.log(`🔄 Reloading proposals after conversion...`);
        await loadInitialData();
      }
    } catch (err) {
      await Swal.fire({
        title: 'Error',
        html: `<p>Failed to convert to contract: ${err.message}</p>`,
        icon: 'error',
        confirmButtonColor: '#d33'
      });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Accepted': 'bg-green-100 text-green-700',
      'Draft': 'bg-blue-100 text-blue-700',
      'Submitted': 'bg-purple-100 text-purple-700',
      'Approved': 'bg-orange-100 text-orange-700',
      'Sent': 'bg-teal-100 text-teal-700',
      'Declined': 'bg-red-100 text-red-700',
      'Rejected': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const ProposalCard = ({ proposal }) => {
    const company = companies.find(c => c.id === proposal.client_id);
    const currency = proposal.currency || 'INR';

    const getCompanyInitials = (name) => {
      return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'CP';
    };

    const getCompanyColor = (companyId) => {
      const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
      return colors[(companyId || 0) % colors.length];
    };

    return (
      <div className="bg-white border border-gray-200 rounded  overflow-hidden hover:shadow-xl transition-all duration-200">
        <div className="p-2 pb-3">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs   text-white ">{proposal.proposal_number}</span>
            <div className="relative">
              <button
                onClick={() => setShowActionMenu(showActionMenu === proposal.id ? null : proposal.id)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <MoreVertical size={16} className="text-[#1F2020]" />
              </button>
              {showActionMenu === proposal.id && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 rounded shadow-lg z-10">
                  {proposal.status === 'Approved' && (
                    <button
                      onClick={() => handleSendProposal(proposal.id)}
                      className="w-full text-left p-2  text-xs  hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Send size={14} /> Send
                    </button>
                  )}
                  <button
                    onClick={() => handleStatusChange(proposal.id, 'Approved')}
                    className="w-full text-left p-2  text-xs  hover:bg-gray-100 flex items-center gap-2"
                  >
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button
                    onClick={() => handleStatusChange(proposal.id, 'Rejected')}
                    className="w-full text-left p-2  text-xs  hover:bg-gray-100 flex items-center gap-2"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                  {proposal.status === 'Accepted' && (
                    <button
                      onClick={() => handleConvertToInvoice(proposal.id)}
                      className="w-full text-left p-2  text-xs  hover:bg-gray-100 flex items-center gap-2 border-t"
                    >
                      <Download size={14} /> Convert to Invoice
                    </button>
                  )}
                  {proposal.status === 'Sent' && (
                    <button
                      onClick={() => handleConvertToContract(proposal.id)}
                      className="w-full text-left p-2  text-xs  hover:bg-green-50 text-green-700 flex items-center gap-2 border-t"
                    >
                      📋 Convert to Contract
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteProposal(proposal.id)}
                    className="w-full text-left p-2  text-xs  hover:bg-red-100 text-red-700 flex items-center gap-2 border-t"
                  >
                    <XCircle size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <h3 className=" text-gray-900 text-xs  mb-2">{proposal.title}</h3>
          <p className="text-xs text-gray-500 mb-3">{proposal.description || 'Proposal'}</p>

          <div className="space-y-1 mb-4 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <span>📅</span>
              <span>Date: {new Date(proposal.proposal_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>⏳</span>
              <span>Valid Till: {proposal.validity_date ? new Date(proposal.validity_date).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="border-t pt-3 p-2 ">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-full ${getCompanyColor(company?.id)} text-white flex items-center justify-center  text-xs  flex-shrink-0`}>
              {company ? getCompanyInitials(company.company_name) : 'N/A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className=" text-gray-900 text-xs  truncate">
                {company?.company_name || 'Unknown Company'}
              </p>
              <p className="text-xs text-gray-500">Client</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-xs px-2.5 py-1 rounded-full  ${getStatusColor(proposal.status)}`}>
              {proposal.status}
            </span>
            <span className="text-xs   text-gray-900">
              💰 {currency} {(proposal.total_amount || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const ProposalRow = ({ proposal }) => {
    const company = companies.find(c => c.id === proposal.client_id);
    const currency = proposal.currency || 'INR';

    return (
      <tr className="border-b hover:bg-gray-50">
        <td className="p-2 text-xs">
          <div className="  text-gray-900">{proposal.proposal_number}</div>
          <div className="text-xs text-gray-500">{proposal.title}</div>
        </td>
        <td className="p-2 text-xs text-gray-700">{company?.company_name || 'Unknown'}</td>
        <td className="p-2 text-xs   text-gray-900">
          {currency} {proposal.total_amount || 0}
        </td>
        <td className="p-2 text-xs text-gray-600">
          {new Date(proposal.proposal_date).toLocaleDateString()}
        </td>
        <td className="p-2 text-xs text-gray-600">
          {proposal.validity_date ? new Date(proposal.validity_date).toLocaleDateString() : 'N/A'}
        </td>
        <td className="p-2 text-xs">
          <span className={`text-xs p-1  rounded-full  ${getStatusColor(proposal.status)}`}>
            {proposal.status}
          </span>
        </td>
        <td className="p-2 text-xs text-right relative">
          <div className="relative">
            <button
              onClick={() => setShowActionMenu(showActionMenu === proposal.id ? null : proposal.id)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <MoreVertical size={18} className="text-[#1F2020]" />
            </button>
            {showActionMenu === proposal.id && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-300 rounded shadow-lg z-10">
                {proposal.status === 'Approved' && (
                  <button
                    onClick={() => handleSendProposal(proposal.id)}
                    className="w-full text-left p-2  text-xs  hover:bg-gray-100"
                  >
                    Send
                  </button>
                )}
                <button
                  onClick={() => handleStatusChange(proposal.id, 'Approved')}
                  className="w-full text-left p-2  text-xs  hover:bg-gray-100"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleStatusChange(proposal.id, 'Rejected')}
                  className="w-full text-left p-2  text-xs  hover:bg-gray-100"
                >
                  Reject
                </button>
                {proposal.status === 'Accepted' && (
                  <button
                    onClick={() => handleConvertToInvoice(proposal.id)}
                    className="w-full text-left p-2  text-xs  hover:bg-gray-100 border-t"
                  >
                    Convert to Invoice
                  </button>
                )}
                {proposal.status === 'Sent' && (
                  <button
                    onClick={() => handleConvertToContract(proposal.id)}
                    className="w-full text-left p-2  text-xs  hover:bg-green-50 text-green-700 border-t"
                  >
                    Convert to Contract
                  </button>
                )}
                <button
                  onClick={() => handleDeleteProposal(proposal.id)}
                  className="w-full text-left p-2  text-xs  hover:bg-red-100 text-red-700 border-t"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <AddNewProposalModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateProposal}
        companies={companies}
        contacts={contacts}
        deals={deals}
      />

      {/* Header */}
      <div className="bg-white border-b p-2  flex items-center justify-between">
        <div>
          <h1 className="text-2xl  text-gray-900">
            Proposals
            <span className="text-red  text-xs  bg-red-100 p-1  rounded ml-2">
              {proposals.length}
            </span>
          </h1>
          <p className="text-xs  text-gray-500 mt-1">Home / Proposals</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 p-2 rounded  text-xs  bg-white hover:bg-gray-50"
          >
            <option value="">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Approved">Approved</option>
            <option value="Sent">Sent</option>
            <option value="Accepted">Accepted</option>
            <option value="Declined">Declined</option>
            <option value="Rejected">Rejected</option>
          </select>

          <div className="flex items-center gap-2 border border-gray-300 rounded  bg-white p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            >
              <Grid3x3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            >
              <List size={18} />
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-red-600 text-white p-2  rounded  text-xs    hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add New Proposal
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-2  border-b">
        <div className="max-w-md">
          <input
            type="text"
            placeholder="Search proposals..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full border border-gray-300 p-2  rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading proposals...</p>
          </div>
        ) : proposals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No proposals found</p>
            <p className="text-[#1F2020] text-xs  mt-2">Create your first proposal to get started</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {proposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded  shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3  text-gray-900">Proposal</th>
                  <th className="text-left px-4 py-3  text-gray-900">Client</th>
                  <th className="text-right px-4 py-3  text-gray-900">Amount</th>
                  <th className="text-left px-4 py-3  text-gray-900">Date</th>
                  <th className="text-left px-4 py-3  text-gray-900">Valid Till</th>
                  <th className="text-left px-4 py-3  text-gray-900">Status</th>
                  <th className="text-center px-4 py-3  text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((proposal) => (
                  <ProposalRow key={proposal.id} proposal={proposal} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs  text-[#1F2020] py-6 border-t mt-8">
        Copyright © 2025 <span className="text-white   ">CRM System</span>
      </div>
    </div>
  );
};

export default ProposalsPage;
