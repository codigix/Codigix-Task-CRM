import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Filter, Settings2, ChevronDown, MoreVertical } from 'lucide-react';
import AddNewPaymentModal from './AddNewPaymentModal';
import PaymentActionDropdown from './PaymentActionDropdown';
import { paymentsAPI, invoicesAPI } from '../../services/api';

const PaymentsPage = () => {
  const navigate = useNavigate();
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError('');
        const invoicesData = await invoicesAPI.getAll().catch(() => []);
        setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load payments');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const getStatusStyles = (status) => {
    const statusMap = {
      'Paid': { bg: 'bg-green-100', text: 'text-green-700' },
      'Partially Paid': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      'Unpaid': { bg: 'bg-red-100', text: 'text-red-700' },
      'Overdue': { bg: 'bg-red-200', text: 'text-red-800' },
      'Draft': { bg: 'bg-gray-100', text: 'text-gray-700' },
    };
    return statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  };

  const enrichedInvoices = invoices.map(invoice => ({
    ...invoice,
    client_name: invoice.client_name || 'N/A',
    client_email: invoice.company_email || 'N/A',
    client_phone: invoice.company_phone || 'N/A',
  }));

  const filteredPayments = enrichedInvoices.filter(invoice => {
    const matchesSearch =
      (invoice.invoice_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (invoice.client_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const sortedPayments = [...filteredPayments].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at) - new Date(a.created_at);
    } else {
      return new Date(a.created_at) - new Date(b.created_at);
    }
  });

  const totalPages = Math.ceil(sortedPayments.length / itemsPerPage);
  const paginatedPayments = sortedPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatCurrency = (value, currency = 'INR') => {
    if (!value) return '₹0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
    }).format(num);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleAddPayment = async (formData) => {
    try {
      const paymentData = {
        invoice_ids: formData.invoiceIds,
        payment_date: formData.paymentDate,
        payment_method: formData.paymentMethod,
        amount: formData.amountReceived,
        reference_no: formData.referenceNo,
        status: formData.paymentStatus,
        notes: formData.notes,
      };

      const response = await paymentsAPI.create(paymentData);

      for (const invoiceId of formData.invoiceIds) {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (invoice) {
          const paidAmount = (invoice.paid_amount || 0) + formData.amountReceived;
          const newStatus = paidAmount >= invoice.total ? 'Paid' :
            paidAmount > 0 ? 'Partially Paid' : invoice.status;

          await invoicesAPI.update(invoiceId, {
            paid_amount: paidAmount,
            status: newStatus
          });
        }
      }

      setInvoices(invoices.map(inv => {
        const selectedIds = formData.invoiceIds;
        if (selectedIds.includes(inv.id)) {
          const paidAmount = (inv.paid_amount || 0) + formData.amountReceived;
          const newStatus = paidAmount >= inv.total ? 'Paid' :
            paidAmount > 0 ? 'Partially Paid' : inv.status;
          return { ...inv, paid_amount: paidAmount, status: newStatus };
        }
        return inv;
      }));

      setShowAddPaymentModal(false);
    } catch (err) {
      console.error('Error creating payment:', err);
      throw err;
    }
  };

  const handlePreviewInvoice = (invoice) => {
    navigate(`/payment/${invoice.id}`);
  };

  const handleDeleteInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (selectedInvoice) {
      try {
        await invoicesAPI.delete(selectedInvoice.id);
        setInvoices(invoices.filter(inv => inv.id !== selectedInvoice.id));
        setShowDeleteConfirm(false);
        setSelectedInvoice(null);
      } catch (err) {
        console.error('Error deleting invoice:', err);
        alert('Failed to delete invoice');
      }
    }
  };

  return (
    <div className="p-2 bg-[#F7F8F9] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-xl  text-gray-900">Payments</h1>
              <span className="bg-red-100 text-red  p-2 rounded-full text-xs ">
                {filteredPayments.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs  text-gray-600  ">
              <button className="hover:text-gray-900">Home</button>
              <span className="text-[#1F2020]">›</span>
              <span className="text-gray-600">Payments</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="border border-gray-300 p-2  rounded  bg-white text-xs    flex items-center gap-2  hover:bg-gray-50 transition">
              <Download size={18} />
              Export
            </button>
            <button
              onClick={() => setShowAddPaymentModal(true)}
              className="bg-red-600 text-white p-2  rounded  text-xs    hover:bg-red-700 transition">
              + Record Payment
            </button>
          </div>
        </div>

        {/* Filter & Sort Bar */}
        <div className="mb-3 flex items-center justify-between gap-2 bg-white p-2 rounded  border border-gray-200 ">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full border border-gray-300 p-2  rounded  text-xs    focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 p-2  rounded  bg-white text-xs    appearance-none pr-8"
              >
                <option value="newest">Sort By: Newest</option>
                <option value="oldest">Sort By: Oldest</option>
              </select>
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#1F2020] pointer-events-none">▼</span>
            </div>
            <button className="flex items-center gap-2 p-2  border border-gray-300 rounded  bg-white text-xs    hover:bg-gray-50">
              <Filter size={18} />
              Filter
            </button>
            <button className="flex items-center gap-2 p-2  border border-gray-300 rounded  bg-white text-xs    hover:bg-gray-50">
              <Settings2 size={18} />
              Manage Columns
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-2 bg-red-50 border border-red-200 rounded ">
            <p className="text-xs  text-red-700  ">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              <p className="mt-4 text-gray-600  ">Loading payments...</p>
            </div>
          </div>
        ) : paginatedPayments.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-gray-600   text-lg">No invoices to display</p>
              <p className="text-gray-500 text-xs  mt-2">Click "Record Payment" to process payments</p>
            </div>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="bg-white border border-gray-200 rounded   overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-left">
                        <input type="checkbox" className="w-4 h-4" />
                      </th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-700">Invoice ID</th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-700">Client</th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-700">Amount</th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-700">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-700">Payment Method</th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-700">Transaction ID</th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPayments.map((invoice) => {
                      const statusStyles = getStatusStyles(invoice.status);
                      return (
                        <tr key={invoice.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                          <td className="p-2 ">
                            <input type="checkbox" className="w-4 h-4" />
                          </td>
                          <td className="p-2 ">
                            <span className="text-xs   text-white ">#{invoice.invoice_number || invoice.id}</span>
                          </td>
                          <td className="p-2 ">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs  text-gray-600">
                                {invoice.client_name?.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs    text-gray-900">{invoice.client_name || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="p-2 ">
                            <span className="text-xs   text-gray-900">{formatCurrency(invoice.total)}</span>
                          </td>
                          <td className="p-2 ">
                            <span className="text-xs  text-gray-600">{formatDate(invoice.due_date)}</span>
                          </td>
                          <td className="p-2 ">
                            <span className="text-xs  text-gray-600">{invoice.payment_method || 'N/A'}</span>
                          </td>
                          <td className="p-2 ">
                            <span className="text-xs  font-mono text-gray-600">TXN{String(invoice.id).padStart(10, '0')}</span>
                          </td>
                          <td className="p-2 ">
                            <span className={`px-3 py-1 rounded-full text-xs  ${statusStyles.bg} ${statusStyles.text}`}>
                              {invoice.status}
                            </span>
                          </td>
                          <td className="p-2 ">
                            <div className="relative group">
                              <button className="p-2 hover:bg-gray-100 rounded  transition">
                                <MoreVertical size={18} className="text-gray-600" />
                              </button>
                              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded  shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                <button
                                  onClick={() => handlePreviewInvoice(invoice)}
                                  className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-50 border-b border-gray-100 flex items-center gap-2"
                                >
                                  <span>👁️</span> Preview
                                </button>
                                <button
                                  onClick={() => handleDeleteInvoice(invoice)}
                                  className="w-full text-left p-2  text-xs  text-red  hover:bg-red-50 rounded-b-lg flex items-center gap-2"
                                >
                                  <span>🗑️</span> Delete
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2  border border-gray-300 rounded  hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs   "
                >
                  ← Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                    return pageNumber > 0 && pageNumber <= totalPages ? (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`p-2 rounded  text-xs    transition ${currentPage === pageNumber
                          ? 'bg-red-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {pageNumber}
                      </button>
                    ) : null;
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2  border border-gray-300 rounded  hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs   "
                >
                  Next →
                </button>
                <span className="text-xs  text-gray-600 ml-4">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center text-gray-500 text-xs  border-t border-gray-200 pt-8 pb-6   mt-8">
          Copyright © 2025 <span className="text-red  ">Preadmin</span>
        </div>
      </div>

      {/* Add Payment Modal */}
      <AddNewPaymentModal
        isOpen={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        onSubmit={handleAddPayment}
        invoices={invoices}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded  shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg  text-gray-900">Delete Confirmation</h2>
            </div>

            <div className="p-6">
              <p className="text-gray-700">Are you sure you want to delete invoice <span className="">#{selectedInvoice.invoice_number}</span>?</p>
              <p className="text-xs  text-gray-500 mt-2">This action cannot be undone.</p>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="p-2  border border-gray-300 rounded  text-xs    hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="p-2  bg-red-600 text-white rounded  text-xs    hover:bg-red-700"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsPage;
