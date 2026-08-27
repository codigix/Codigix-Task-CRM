import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ArrowLeft } from 'lucide-react';
import { invoicesAPI, companiesAPI } from '../../services/api';

const PaymentDetailsPage = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError('');

        if (invoiceId) {
          const invoiceData = await invoicesAPI.getById(invoiceId);
          setInvoice(invoiceData);

          if (invoiceData.company_id) {
            const companyData = await companiesAPI.getById(invoiceData.company_id);
            setCompany(companyData);
          }
        }
      } catch (err) {
        console.error('Error loading payment details:', err);
        setError('Failed to load payment details');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [invoiceId]);

  const formatCurrency = (value) => {
    if (!value) return '$0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `$${num.toFixed(2)}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleDownloadPDF = () => {
    alert('PDF download feature coming soon');
  };

  if (isLoading) {
    return (
      <div className="p-2 bg-[#F7F8F9] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <p className="mt-4 text-gray-600  ">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-2 bg-[#F7F8F9] min-h-screen">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/payments')}
            className="mb-6 flex items-center gap-2 text-white  hover:text-blue-700  "
          >
            <ArrowLeft size={20} />
            Back to Payments
          </button>
          <div className="bg-red-50 border border-red-200 rounded p-3  text-center">
            <p className="text-red-700  ">{error || 'Payment details not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const amountDue = (invoice.total || 0) - (invoice.paid_amount || 0);

  return (
    <div className="p-2 bg-[#F7F8F9] min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/payments')}
          className="mb-6 flex items-center gap-2 text-white  hover:text-blue-700  "
        >
          <ArrowLeft size={20} />
          Back to Payments
        </button>

        {/* Main Card */}
        <div className="bg-white  rounded  border border-gray-200p-3 ">

          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
            <h1 className="text-xl  text-gray-900">
              Payment for Invoice <span className="text-red  ">#{invoice.invoice_number}</span>
            </h1>
            <button
              onClick={handleDownloadPDF}
              className="bg-gray-100 border border-gray-300 rounded  p-2  hover:bg-gray-200 text-xs    flex items-center gap-2 transition"
            >
              <Download size={16} />
              Download
            </button>
          </div>

          {/* Proposal From & To */}
          <div className="border border-gray-200 rounded p-3  mb-6">
            <h2 className="text-xs   text-gray-700 mb-4">Proposal From & To</h2>

            <div className="grid grid-cols-2 gap-6">
              {/* From */}
              <div>
                <h3 className=" text-gray-900 mb-2">CRMS</h3>
                <p className="text-xs  text-gray-600 leading-relaxed">
                  3338 Marcus Street Birmingham, AL 35211
                </p>
                <p className="text-xs  text-gray-600 mt-2">
                  Phone: <span className=" ">+1 98789 78788</span>
                </p>
                <p className="text-xs  text-gray-600">Email: info@example.com</p>
              </div>

              {/* To */}
              <div>
                <h3 className=" text-gray-900 mb-2">{company?.name || invoice.client_name || 'N/A'}</h3>
                <p className="text-xs  text-gray-600 leading-relaxed">
                  {invoice.billing_address || 'Address not available'}
                </p>
                <p className="text-xs  text-gray-600 mt-2">
                  Phone: <span className=" ">{company?.phone || invoice.client_phone || 'N/A'}</span>
                </p>
                <p className="text-xs  text-gray-600">Email: {company?.email || invoice.client_email || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="border border-gray-200 rounded p-3  mb-6">
            <h2 className="text-xs   text-gray-700 mb-4">Payment Details</h2>

            <div className="grid grid-cols-3 gap-6 text-xs ">
              <div>
                <p className="text-gray-500 text-xs mb-1">Payment Date</p>
                <p className="  text-gray-800">{formatDate(invoice.created_at)}</p>
              </div>

              <div>
                <p className="text-gray-500 text-xs mb-1">Payment Method</p>
                <p className="  text-gray-800">{invoice.payment_method || 'Not specified'}</p>
              </div>

              <div>
                <p className="text-gray-500 text-xs mb-1">Total Amount</p>
                <p className="  text-gray-800">{formatCurrency(invoice.total)}</p>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="border border-gray-200 rounded p-3 ">
            <h2 className="text-xs   text-gray-700 mb-4">Invoice Details</h2>

            <div className="grid grid-cols-2 gap-6 text-xs ">
              {/* Left Column */}
              <div>
                <p className="text-gray-500 text-xs mb-1">Invoice Number</p>
                <p className="text-red  ">#{invoice.invoice_number}</p>
              </div>

              {/* Right Column - Amount Due */}
              <div className="text-right">
                <p className="text-gray-500 text-xs mb-1">Amount Due:</p>
                <p className="text-red  ">{formatCurrency(amountDue)}</p>
              </div>

              {/* Invoice Date */}
              <div>
                <p className="text-gray-500 text-xs mb-1">Invoice Date</p>
                <p className="  text-gray-800">{formatDate(invoice.invoice_date)}</p>
              </div>

              {/* Payment Amount */}
              <div className="text-right">
                <p className="text-gray-500 text-xs mb-1">Payment Amount</p>
                <p className="  text-gray-800">{formatCurrency(invoice.paid_amount || 0)}</p>
              </div>

              {/* Invoice Amount */}
              <div>
                <p className="text-gray-500 text-xs mb-1">Invoice Amount</p>
                <p className="  text-gray-800">{formatCurrency(invoice.total)}</p>
              </div>

              {/* Status */}
              <div className="text-right">
                <p className="text-gray-500 text-xs mb-1">Status</p>
                <span className={`inline-block p-1  rounded text-xs  ${invoice.status === 'Paid' ? 'bg-green-100 text-green-700' :
                    invoice.status === 'Partially Paid' ? 'bg-yellow-100 text-yellow-700' :
                      invoice.status === 'Unpaid' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                  }`}>
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-xs  mt-8 pt-8 border-t border-gray-200  ">
          Copyright © 2025 <span className="text-red  ">Preadmin</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailsPage;
