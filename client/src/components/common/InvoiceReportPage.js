import React, { useState, useEffect } from 'react';
import { Download, FileText, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { invoicesAPI, companiesAPI } from '../../services/api';

const InvoiceReportPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [reportType, setReportType] = useState('summary');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [invoicesData, companiesData] = await Promise.all([
        invoicesAPI.getAll(),
        companiesAPI.getAll()
      ]);

      let invoices = invoicesData || [];
      if (!Array.isArray(invoices) && invoices?.data) {
        invoices = invoices.data;
      }

      setInvoices(invoices);
      setCompanies(companiesData || []);
    } catch (err) {
      setError('Failed to load report data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredInvoices = () => {
    let filtered = invoices;

    if (selectedCompany !== 'all') {
      filtered = filtered.filter(inv => inv.client_id == selectedCompany);
    }

    if (dateFrom) {
      filtered = filtered.filter(inv => new Date(inv.invoice_date) >= new Date(dateFrom));
    }

    if (dateTo) {
      filtered = filtered.filter(inv => new Date(inv.invoice_date) <= new Date(dateTo));
    }

    return filtered;
  };

  const calculateReportData = () => {
    const filtered = getFilteredInvoices();
    const data = {
      totalInvoices: filtered.length,
      totalAmount: 0,
      totalPaid: 0,
      totalDue: 0,
      byStatus: {},
      byCompany: {},
      overdue: []
    };

    filtered.forEach(inv => {
      const invoiceTotal = parseFloat(inv.total) || 0;
      const amountPaid = parseFloat(inv.amount_paid) || 0;

      data.totalAmount += invoiceTotal;
      data.totalPaid += amountPaid;

      const dueAmount = invoiceTotal - amountPaid;
      if (dueAmount > 0) {
        data.totalDue += dueAmount;
      }

      if (!data.byStatus[inv.status]) {
        data.byStatus[inv.status] = { count: 0, total: 0 };
      }
      data.byStatus[inv.status].count++;
      data.byStatus[inv.status].total += invoiceTotal;

      const companyName = inv.company_name || 'Unknown Client';
      if (!data.byCompany[companyName]) {
        data.byCompany[companyName] = { count: 0, total: 0, paid: 0 };
      }
      data.byCompany[companyName].count++;
      data.byCompany[companyName].total += invoiceTotal;
      data.byCompany[companyName].paid += amountPaid;

      if (inv.status === 'Overdue' || (inv.status === 'Unpaid' && new Date(inv.open_till) < new Date())) {
        data.overdue.push(inv);
      }
    });

    return data;
  };

  const formatCurrency = (value) => {
    if (!value) return '$0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const exportToCSV = () => {
    const data = calculateReportData();
    const filtered = getFilteredInvoices();

    let csv = 'Invoice Number,Client,Amount,Status,Invoice Date,Due Date,Amount Paid,Amount Due\n';

    filtered.forEach(inv => {
      const invoiceTotal = parseFloat(inv.total) || 0;
      const amountPaid = parseFloat(inv.amount_paid) || 0;
      const due = invoiceTotal - amountPaid;
      csv += `"${inv.invoice_number}","${inv.company_name || 'Unknown'}",${invoiceTotal},"${inv.status}","${new Date(inv.invoice_date).toLocaleDateString()}","${new Date(inv.open_till).toLocaleDateString()}",${amountPaid},${due}\n`;
    });

    csv += '\n\nSummary\n';
    csv += `Total Invoices,${data.totalInvoices}\n`;
    csv += `Total Amount,${data.totalAmount}\n`;
    csv += `Total Paid,${data.totalPaid}\n`;
    csv += `Total Due,${data.totalDue}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="p-2 bg-[#F7F8F9] min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            <p className="mt-4 text-gray-600  ">Loading report data...</p>
          </div>
        </div>
      </div>
    );
  }

  const reportData = calculateReportData();
  const filteredInvoices = getFilteredInvoices();

  return (
    <div className="p-2 bg-[#F7F8F9] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl  text-gray-900">Invoice Reports</h1>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 p-2  bg-red-600 text-white rounded  hover:bg-red-700 transition "
            >
              <Download size={18} />
              Export to CSV
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs  text-gray-600  ">
            <button className="hover:text-gray-900">Home</button>
            <span className="text-[#1F2020]">›</span>
            <span className="text-gray-600">Reports</span>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-2xlp-3  border border-gray-100  mb-8">
          <h3 className="text-md  text-gray-900 mb-4">Report Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs    text-gray-700 mb-2">Client</label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded  text-xs "
              >
                <option value="all">All Clients</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs    text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded  text-xs "
              />
            </div>

            <div>
              <label className="block text-xs    text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded  text-xs "
              />
            </div>

            <div>
              <label className="block text-xs    text-gray-700 mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded  text-xs "
              >
                <option value="summary">Summary</option>
                <option value="detailed">Detailed</option>
                <option value="byStatus">By Status</option>
                <option value="byClient">By Client</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-8">
          <div className="bg-white rounded-2xlp-3  border border-gray-100 ">
            <p className="text-xs    text-gray-600 mb-2">Total Invoices</p>
            <p className="text-xl  text-gray-900">{reportData.totalInvoices}</p>
          </div>
          <div className="bg-white rounded-2xlp-3  border border-gray-100 ">
            <p className="text-xs    text-gray-600 mb-2">Total Amount</p>
            <p className="text-xl  text-gray-900">{formatCurrency(reportData.totalAmount)}</p>
          </div>
          <div className="bg-white rounded-2xlp-3  border border-gray-100 ">
            <p className="text-xs    text-gray-600 mb-2">Total Paid</p>
            <p className="text-3xl  text-green-600">{formatCurrency(reportData.totalPaid)}</p>
          </div>
          <div className="bg-white rounded-2xlp-3  border border-gray-100 ">
            <p className="text-xs    text-gray-600 mb-2">Total Due</p>
            <p className="text-3xl  text-red ">{formatCurrency(reportData.totalDue)}</p>
          </div>
        </div>

        {/* Report Content */}
        {reportType === 'summary' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* By Status */}
            <div className="bg-white rounded-2xlp-3  border border-gray-100 ">
              <h3 className="text-md  text-gray-900 mb-4 flex items-center gap-2">
                <PieChartIcon size={20} /> Invoices by Status
              </h3>
              <div className="space-y-3">
                {Object.entries(reportData.byStatus).map(([status, data]) => (
                  <div key={status} className="flex items-center justify-between p-3 rounded  hover:bg-gray-50">
                    <span className="text-xs    text-gray-700">{status}</span>
                    <div className="text-right">
                      <p className="text-lg  text-gray-900">{data.count}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(data.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Company */}
            <div className="bg-white rounded-2xlp-3  border border-gray-100 ">
              <h3 className="text-md  text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 size={20} /> Invoices by Client
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {Object.entries(reportData.byCompany).sort((a, b) => b[1].total - a[1].total).map(([company, data]) => (
                  <div key={company} className="flex items-center justify-between p-3 rounded  hover:bg-gray-50">
                    <span className="text-xs    text-gray-700">{company}</span>
                    <div className="text-right">
                      <p className="text-lg  text-gray-900">{data.count}</p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(data.total)} | Paid: {formatCurrency(data.paid)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Overdue Invoices */}
        {reportData.overdue.length > 0 && (
          <div className="bg-white rounded-2xlp-3  border border-orange-200 bg-orange-50  mb-8">
            <h3 className="text-lg  text-orange-900 mb-4 flex items-center gap-2">
              ⚠ Overdue Invoices ({reportData.overdue.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs ">
                <thead>
                  <tr className="border-b border-orange-200">
                    <th className="p-2  text-left  text-orange-900">Invoice #</th>
                    <th className="p-2  text-left  text-orange-900">Client</th>
                    <th className="p-2  text-right  text-orange-900">Amount</th>
                    <th className="p-2  text-right  text-orange-900">Due Date</th>
                    <th className="p-2  text-right  text-orange-900">Days Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.overdue.map(inv => {
                    const daysOverdue = Math.floor((new Date() - new Date(inv.open_till)) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={inv.id} className="border-b border-orange-100 hover:bg-orange-100/50">
                        <td className="p-2  font-mono text-orange-900">{inv.invoice_number}</td>
                        <td className="p-2  text-orange-900">{inv.company_name || 'N/A'}</td>
                        <td className="p-2  text-right text-orange-900 ">
                          {formatCurrency(inv.total)}
                        </td>
                        <td className="p-2  text-right text-orange-900">
                          {new Date(inv.open_till).toLocaleDateString()}
                        </td>
                        <td className="p-2  text-right  text-red ">{daysOverdue} days</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detailed Invoice List */}
        {(reportType === 'detailed' || reportType === 'summary') && filteredInvoices.length > 0 && (
          <div className="bg-white rounded-2xlp-3  border border-gray-100 ">
            <h3 className="text-md  text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} /> Invoice Details
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs ">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left  text-gray-900">Invoice #</th>
                    <th className="px-4 py-3 text-left  text-gray-900">Client</th>
                    <th className="px-4 py-3 text-center  text-gray-900">Amount</th>
                    <th className="px-4 py-3 text-center  text-gray-900">Status</th>
                    <th className="px-4 py-3 text-center  text-gray-900">Invoice Date</th>
                    <th className="px-4 py-3 text-right  text-gray-900">Paid</th>
                    <th className="px-4 py-3 text-right  text-gray-900">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.slice(0, 50).map(inv => {
                    const due = parseFloat(inv.total) - parseFloat(inv.amount_paid || 0);
                    return (
                      <tr key={inv.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-white ">{inv.invoice_number}</td>
                        <td className="px-4 py-3 text-gray-900">{inv.company_name || 'N/A'}</td>
                        <td className="px-4 py-3 text-center  text-gray-900">{formatCurrency(inv.total)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="p-1  rounded-full text-xs "
                            style={{
                              backgroundColor: inv.status === 'Paid' ? '#dcfce7' : inv.status === 'Unpaid' ? '#fee2e2' : '#fef3c7',
                              color: inv.status === 'Paid' ? '#15803d' : inv.status === 'Unpaid' ? '#991b1b' : '#92400e'
                            }}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-900">
                          {new Date(inv.invoice_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 ">
                          {formatCurrency(inv.amount_paid)}
                        </td>
                        <td className="px-4 py-3 text-right text-red  ">
                          {formatCurrency(due)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredInvoices.length > 50 && (
                <p className="text-center text-gray-500 text-xs  mt-4">
                  Showing 50 of {filteredInvoices.length} invoices. Export CSV to see all.
                </p>
              )}
            </div>
          </div>
        )}

        {filteredInvoices.length === 0 && (
          <div className="bg-white rounded-2xl p-12 border border-gray-100  text-center">
            <p className="text-gray-600   text-lg">No invoices match your filters</p>
            <p className="text-gray-500 text-xs  mt-2">Try adjusting your search criteria</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-gray-500 text-xs    mt-8">
          © 2025 <span className="text-red  ">Preadmin</span> - Invoice Reporting
        </div>
      </div>
    </div>
  );
};

export default InvoiceReportPage;
