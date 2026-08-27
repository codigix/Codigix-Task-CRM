import React, { useState, useEffect } from 'react';
import { Download, Layout as LayoutIcon, Grid3x3 } from 'lucide-react';
import AddNewInvoiceModal from './AddNewInvoiceModal';
import EditInvoiceModal from './EditInvoiceModal';
import InvoiceDetailPage from './InvoiceDetailPage';
import InvoiceActionDropdown from './InvoiceActionDropdown';
import { invoicesAPI, companiesAPI, projectAPI } from '../../services/api';
import { formatINR } from '../../utils/currencyUtils';

const InvoicesPage = () => {
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState(false);
  const [showEditInvoiceModal, setShowEditInvoiceModal] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError('');
        const [invoicesData, companiesData, projectsData] = await Promise.all([
          invoicesAPI.getAll(),
          companiesAPI.getAll(),
          projectAPI.getAll()
        ]);
        console.log('📊 Invoices loaded from API:', invoicesData);
        console.log('📊 Sample invoice:', invoicesData?.[0]);
        if (invoicesData?.[0]) {
          console.log('   - amount:', invoicesData[0].amount);
          console.log('   - total:', invoicesData[0].total);
          console.log('   - open_till:', invoicesData[0].open_till);
        }
        setInvoices(invoicesData || []);
        setCompanies(companiesData || []);
        setProjects(projectsData || []);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load invoices');
        setInvoices([]);
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
      'Overdue': { bg: 'bg-blue-100', text: 'text-blue-700' },
      'Draft': { bg: 'bg-gray-100', text: 'text-gray-700' },
      'Sent': { bg: 'bg-purple-100', text: 'text-purple-700' },
    };
    return statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  };

  const getCompanyLogo = (companyName) => {
    const logoMap = {
      'Truelyselli': '🎨',
      'Dreamschat': '💬',
      'DreamGigs': '🎭',
      'Servbook': '📖',
      'DreamPOS': '🛒',
      'Kafejob': '☕',
      'SmartHR': '👥',
      'Docure': '📋',
      'Best@laundry': '🧺',
      'Dreamsports': '⚽',
    };
    return logoMap[companyName] || '🏢';
  };

  const getAvatarBg = (index) => {
    const colors = [
      'bg-orange-400', 'bg-red-400', 'bg-black', 'bg-purple-400',
      'bg-green-400', 'bg-cyan-400', 'bg-yellow-400', 'bg-purple-500',
      'bg-orange-500', 'bg-green-500'
    ];
    return colors[index % colors.length];
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      (invoice.invoice_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (invoice.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (invoice.bill_to || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'All' || invoice.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleAddInvoice = async (formData) => {
    try {
      const response = await invoicesAPI.create(formData);

      const newInvoice = {
        id: response.id,
        invoice_number: response.invoiceNumber,
        client_id: formData.client,
        company_name: companies.find(c => c.id === formData.client)?.company_name || 'Unknown',
        bill_to: formData.billTo,
        ship_to: formData.shipTo,
        amount: formData.amount,
        currency: formData.currency,
        invoice_date: formData.date,
        open_till: formData.openTill,
        payment_method: formData.paymentMethod,
        status: formData.status || 'Draft',
        total: formData.total || formData.amount,
      };

      setInvoices([newInvoice, ...invoices]);
      setShowAddInvoiceModal(false);
    } catch (err) {
      console.error('Error creating invoice:', err);
      throw err;
    }
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoiceId(invoice.id);
    setShowEditInvoiceModal(true);
  };

  const handleEditInvoiceSubmit = async (formData) => {
    try {
      const updateData = {
        client_id: formData.client,
        bill_to: formData.billTo,
        ship_to: formData.shipTo,
        project_id: formData.project,
        currency: formData.currency,
        invoice_date: formData.date,
        open_till: formData.openTill,
        payment_method: formData.paymentMethod,
        status: formData.status,
        notes: formData.notes,
        terms_conditions: formData.termsConditions,
        bank_details: formData.bankDetails,
        company_details: formData.companyDetails,
        amount: formData.total,
        total: formData.total,
        items: formData.items || formData.lineItems
      };

      const response = await invoicesAPI.update(editingInvoiceId, updateData);

      const updatedInvoice = {
        ...response,
        client_id: formData.client,
        company_name: companies.find(c => c.id === formData.client)?.company_name || 'Unknown',
        bill_to: formData.billTo,
        ship_to: formData.shipTo,
        amount: formData.total,
        currency: formData.currency,
        invoice_date: formData.date,
        open_till: formData.openTill,
        payment_method: formData.paymentMethod,
        status: formData.status,
        total: formData.total,
      };

      setInvoices(invoices.map(inv => inv.id === editingInvoiceId ? updatedInvoice : inv));
      setShowEditInvoiceModal(false);
      setEditingInvoiceId(null);
    } catch (err) {
      console.error('Error updating invoice:', err);
      throw err;
    }
  };

  const handleDeleteInvoice = (invoiceId) => {
    invoicesAPI.delete(invoiceId).then(() => {
      setInvoices(invoices.filter(inv => inv.id !== invoiceId));
    }).catch(err => {
      console.error('Error deleting invoice:', err);
      alert('Failed to delete invoice');
    });
  };

  const handlePreviewInvoice = (invoice) => {
    setSelectedInvoiceId(invoice.id);
  };

  const handleStatusChange = (invoiceId, status) => {
    const updatedInvoices = invoices.map(inv =>
      inv.id === invoiceId ? { ...inv, status } : inv
    );
    setInvoices(updatedInvoices);
    invoicesAPI.update(invoiceId, { status }).catch(err => {
      console.error('Error updating invoice status:', err);
      setInvoices(invoices);
    });
  };

  const handlePrintInvoice = (invoice) => {
    window.print();
  };

  const handleSendInvoice = (invoice) => {
    alert(`Send invoice ${invoice.invoice_number} to client`);
  };

  return (
    <div className="p-2 bg-[#F7F8F9] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-xl  text-gray-900">Invoices</h1>
              <span className="bg-red-100 text-red  p-2 rounded-full text-xs ">
                {filteredInvoices.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs  text-gray-600  ">
              <button className="hover:text-gray-900">Home</button>
              <span className="text-[#1F2020]">›</span>
              <span className="text-gray-600">Invoices</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="border border-gray-300 p-2  rounded  bg-white text-xs    flex items-center gap-2  hover:bg-gray-50 transition">
              <Download size={18} />
              Export
            </button>
            <div className="flex items-center gap-1 border border-gray-300 rounded  p-1 bg-white ">
              <button className="p-2 hover:bg-gray-100 rounded transition">
                <LayoutIcon size={18} className="text-gray-600" />
              </button>
              <button className="p-2 bg-gray-100 rounded transition">
                <Grid3x3 size={18} className="text-gray-700" />
              </button>
            </div>
            <button
              onClick={() => setShowAddInvoiceModal(true)}
              className="bg-red-600 text-white p-2  rounded  text-xs    hover:bg-red-700 transition">
              + Add New Invoice
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-2 bg-red-50 border border-red-200 rounded ">
            <p className="text-xs  text-red-700  ">{error}</p>
          </div>
        )}

        {/* Filter Bar */}
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 p-2  rounded  bg-white text-xs    hover:bg-gray-50 transition  appearance-none pr-8"
            >
              <option value="All">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Overdue">Overdue</option>
            </select>
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#1F2020] pointer-events-none">▼</span>
          </div>
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by invoice #, client, or bill to..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border border-gray-300 p-2  rounded  text-xs    focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#1F2020] hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              <p className="mt-4 text-gray-600  ">Loading invoices...</p>
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-gray-600   text-lg">No invoices yet</p>
              <p className="text-gray-500 text-xs  mt-2">Click "Add New Invoice" to create your first invoice</p>
            </div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-gray-600   text-lg">No invoices match your search</p>
              <p className="text-gray-500 text-xs  mt-2">Try adjusting your filters or search criteria</p>
            </div>
          </div>
        ) : (
          <>
            {/* Invoice Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-8">
              {paginatedInvoices.map((invoice, idx) => {
                const statusStyles = getStatusStyles(invoice.status);
                const companyName = invoice.company_name || 'Unknown';
                const companyLogo = getCompanyLogo(companyName);
                const avatarBg = getAvatarBg(idx);

                return (
                  <div
                    key={invoice.id}
                    className="bg-white rounded-2xl p-2 shadow border border-gray-100 hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer"
                    onClick={() => setSelectedInvoiceId(invoice.id)}
                  >
                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs  text-white  hover:text-blue-700">
                        {invoice.invoice_number || `#${invoice.id}`}
                      </span>
                      <div onClick={(e) => e.stopPropagation()}>
                        <InvoiceActionDropdown
                          invoice={invoice}
                          onEdit={handleEditInvoice}
                          onDelete={handleDeleteInvoice}
                          onPreview={handlePreviewInvoice}
                          onStatusChange={handleStatusChange}
                          onPrint={handlePrintInvoice}
                          onSend={handleSendInvoice}
                        />
                      </div>
                    </div>

                    {/* Company Info */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-14 h-14 ${avatarBg} rounded-full flex items-center justify-center  text-xl  text-white `}>
                        {companyLogo}
                      </div>
                      <div>
                        <h4 className=" text-base text-gray-900">{companyName}</h4>
                        <p className="text-xs text-gray-600  ">Invoice</p>
                      </div>
                    </div>

                    {/* Invoice Details */}
                    <div className="space-y-3 mb-5 text-xs text-gray-700 flex-grow bg-gray-50 rounded  p-2">
                      <div className="flex items-center gap-2">
                        <span>📄</span>
                        <span className="text-gray-600  ">Total Value :</span>
                        <span className=" text-gray-900 text-xs ">
                          {formatINR(invoice.total !== null && invoice.total !== undefined ? invoice.total : invoice.amount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📅</span>
                        <span className="text-gray-600  ">Due Date :</span>
                        <span className=" text-gray-900">
                          {invoice.open_till ? new Date(invoice.open_till).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>💰</span>
                        <span className="text-gray-600  ">Amount :</span>
                        <span className=" text-gray-900">
                          {formatINR(invoice.amount || 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>💵</span>
                        <span className="text-gray-600  ">Balance :</span>
                        <span className=" text-gray-900">
                          {formatINR((invoice.total !== null && invoice.total !== undefined ? invoice.total : invoice.amount || 0) - (invoice.amount_paid || 0))}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs  ${statusStyles.bg} ${statusStyles.text}`}>
                          {invoice.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{invoice.payment_method ? '💳' : '📋'}</span>
                        <p className="text-xs text-gray-600  ">
                          {invoice.payment_method || invoice.bill_to || 'No details'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mb-10">
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
                    return pageNumber >= 1 && pageNumber <= totalPages ? (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`p-2 rounded  text-xs    ${currentPage === pageNumber
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
        <div className="text-center text-gray-500 text-xs  border-t border-gray-200 pt-8 pb-6  ">
          Copyright © 2025 <span className="text-red  ">Preadmin</span>
        </div>
      </div>

      {/* Add New Invoice Modal */}
      <AddNewInvoiceModal
        isOpen={showAddInvoiceModal}
        onClose={() => setShowAddInvoiceModal(false)}
        onSubmit={handleAddInvoice}
        companies={companies}
        projects={projects}
      />

      {/* Edit Invoice Modal */}
      <EditInvoiceModal
        isOpen={showEditInvoiceModal}
        invoiceId={editingInvoiceId}
        onClose={() => {
          setShowEditInvoiceModal(false);
          setEditingInvoiceId(null);
        }}
        onSubmit={handleEditInvoiceSubmit}
        companies={companies}
        projects={projects}
      />

      {/* Invoice Detail Modal */}
      {selectedInvoiceId && (
        <InvoiceDetailPage
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          onEdit={(id) => console.log('Edit invoice', id)}
          onDelete={(id) => {
            if (window.confirm('Are you sure you want to delete this invoice?')) {
              invoicesAPI.delete(id).then(() => {
                setInvoices(invoices.filter(inv => inv.id !== id));
                setSelectedInvoiceId(null);
              });
            }
          }}
        />
      )}
    </div>
  );
};

export default InvoicesPage;
