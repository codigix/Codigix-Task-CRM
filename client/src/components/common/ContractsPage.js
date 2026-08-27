import React, { useState, useEffect } from 'react';
import { MoreVertical, Plus, Download, Grid3x3, List, Eye, Trash2, X, Filter, Search, FileText } from 'lucide-react';
import Swal from 'sweetalert2';
import AddNewContractModal from './AddNewContractModal';
import ContractDetailsPage from './ContractDetailsPage';
import { contractsAPI, createContract } from '../../services/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ContractsPage = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedContract, setSelectedContract] = useState(null);
  const [showDetailsPage, setShowDetailsPage] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    company: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const contractStatuses = ['Draft', 'Sent', 'Active', 'Expired', 'Cancelled'];

  useEffect(() => {
    fetchCompanies();
    fetchContracts();

    const interval = setInterval(() => {
      fetchContracts();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchCompanies = async () => {
    setIsLoadingCompanies(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/companies`);
      if (response.ok) {
        const data = await response.json();
        setCompanies(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      setCompanies([]);
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const fetchContracts = async () => {
    setIsLoading(true);
    try {
      const data = await contractsAPI.getAll();
      console.log('📋 Contracts fetched:', Array.isArray(data) ? data.length : 0, 'contracts');
      setContracts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ Error fetching contracts:', err);
      setContracts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateContract = async (formData) => {
    try {
      const contractData = {
        subject: formData.subject,
        start_date: formData.start_date,
        end_date: formData.end_date,
        client_id: formData.client,
        contract_type: formData.contract_type,
        contract_value: formData.contract_value,
        description: formData.description,
        status: 'Draft',
      };

      await createContract(contractData);
      setIsModalOpen(false);
      fetchContracts();
    } catch (err) {
      console.error('Error creating contract:', err);
      throw err;
    }
  };

  const handleDeleteContract = async (id) => {
    try {
      await contractsAPI.delete(id);
      fetchContracts();
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting contract:', err);
    }
  };

  const handleConvertToEstimation = async (contract) => {
    try {
      const result = await Swal.fire({
        title: 'Convert to Estimation?',
        html: `<p>Convert <strong>${contract.subject || 'Unnamed Contract'}</strong> to estimation?</p>
               <p style="font-size: 0.85em; color: #666; margin-top: 10px;">Amount: ₹{contract.contract_value || 0}</p>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Convert!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        await contractsAPI.convertToEstimation(contract.id, {});

        await Swal.fire({
          title: 'Success!',
          html: `<p>Contract <strong>${contract.subject || 'Unnamed Contract'}</strong> converted to estimation!</p>
                 <p style="font-size: 0.85em; color: #666; margin-top: 10px;">will appear in Estimations page in a few seconds</p>`,
          icon: 'success',
          confirmButtonColor: '#3085d6',
          timer: 2000,
          timerProgressBar: true
        });

        setShowActionMenu(null);
        await fetchContracts();
      }
    } catch (err) {
      console.error('Error converting contract to estimation:', err);
      await Swal.fire({
        title: 'Error',
        html: `<p>Failed to convert contract: ${err.message}</p>`,
        icon: 'error',
        confirmButtonColor: '#d33'
      });
    }
  };

  const handleDownloadContract = (contract) => {
    const element = document.createElement('a');
    const file = new Blob([`Contract: ${contract.subject}\n\nDetails:\n${JSON.stringify(contract, null, 2)}`], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `contract-${contract.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getFilteredContracts = () => {
    let filtered = contracts;

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contract_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(c => c.status === filters.status);
    }

    if (filters.company) {
      filtered = filtered.filter(c => c.client_id === parseInt(filters.company));
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(c => new Date(c.start_date) >= new Date(filters.dateFrom));
    }

    if (filters.dateTo) {
      filtered = filtered.filter(c => new Date(c.end_date) <= new Date(filters.dateTo));
    }

    return filtered;
  };

  const filteredContracts = getFilteredContracts();

  const getStatusColor = (status) => {
    const colors = {
      'Draft': 'bg-gray-100 text-gray-700',
      'Sent': 'bg-blue-100 text-blue-700',
      'Active': 'bg-green-100 text-green-700',
      'Expired': 'bg-yellow-100 text-yellow-700',
      'Cancelled': 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getCompanyName = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    return company ? (company.company_name || company.name) : 'Unknown';
  };

  const formatContractValue = (value) => {
    if (value === null || value === undefined) return '0.00';
    if (typeof value === 'number') return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return String(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const ContractCard = ({ contract }) => (
    <div className="bg-white border border-gray-200 rounded  p-2 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs p-1  rounded   ${getStatusColor(contract.status || 'Draft')}`}>
          {contract.status || 'Draft'}
        </span>
        <div className="relative z-30">
          <button
            onClick={() => setShowActionMenu(showActionMenu === contract.id ? null : contract.id)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="More actions"
          >
            <MoreVertical size={18} className="text-[#1F2020]" />
          </button>
          {showActionMenu === contract.id && (
            <div className="absolute -right-2 top-full mt-2 bg-white border border-gray-200 rounded  shadow-xl z-50 w-56">
              <button
                onClick={() => {
                  setSelectedContract(contract);
                  setShowDetailsPage(true);
                  setShowActionMenu(null);
                }}
                className="w-full text-left p-2  hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
              >
                <Eye size={16} className="text-gray-600" />
                <span className="text-xs ">View Details</span>
              </button>
              <button
                onClick={() => {
                  handleConvertToEstimation(contract);
                }}
                className="w-full text-left p-2  hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
              >
                <FileText size={16} className="text-gray-600" />
                <span className="text-xs ">Convert to Estimation</span>
              </button>
              <button
                onClick={() => {
                  handleDownloadContract(contract);
                  setShowActionMenu(null);
                }}
                className="w-full text-left p-2  hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
              >
                <Download size={16} className="text-gray-600" />
                <span className="text-xs ">Download</span>
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(contract.id);
                  setShowActionMenu(null);
                }}
                className="w-full text-left p-2  hover:bg-red-50 flex items-center gap-2 text-red "
              >
                <Trash2 size={16} />
                <span className="text-xs ">Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <h3 className=" text-gray-900 mb-1 truncate">{contract.subject || 'Unnamed Contract'}</h3>
      <p className="text-xs text-gray-500 mb-3 truncate">{contract.contract_type || 'N/A'}</p>

      <div className="space-y-1 mb-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span>{formatDate(contract.start_date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>📆</span>
          <span>Till {formatDate(contract.end_date)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100 text-xs">
        <span>🏢</span>
        <span className="  text-gray-900 truncate">{getCompanyName(contract.client_id)}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs bg-blue-100 text-white  p-1  rounded  ">
          💰 ${formatContractValue(contract.contract_value)}
        </span>
      </div>
    </div>
  );

  const ContractRow = ({ contract }) => (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
      <td className="p-2  text-xs    text-gray-900">{contract.subject || 'Unnamed Contract'}</td>
      <td className="p-2  text-xs  text-gray-600">{getCompanyName(contract.client_id)}</td>
      <td className="p-2  text-xs  text-gray-600">{contract.contract_type || 'N/A'}</td>
      <td className="p-2  text-xs  text-gray-600">₹{formatContractValue(contract.contract_value)}</td>
      <td className="p-2  text-xs  text-gray-600">{formatDate(contract.start_date)}</td>
      <td className="p-2  text-xs ">
        <span className={`text-xs p-1  rounded   ${getStatusColor(contract.status || 'Draft')}`}>
          {contract.status || 'Draft'}
        </span>
      </td>
      <td className="p-2  text-xs ">
        <div className="relative z-30">
          <button
            onClick={() => setShowActionMenu(showActionMenu === contract.id ? null : contract.id)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="More actions"
          >
            <MoreVertical size={16} className="text-[#1F2020]" />
          </button>
          {showActionMenu === contract.id && (
            <div className="absolute -right-2 top-full mt-2 bg-white border border-gray-200 rounded  shadow-xl z-50 w-56">
              <button
                onClick={() => {
                  setSelectedContract(contract);
                  setShowDetailsPage(true);
                  setShowActionMenu(null);
                }}
                className="w-full text-left p-2  hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
              >
                <Eye size={16} className="text-gray-600" />
                <span className="text-xs ">View Details</span>
              </button>
              <button
                onClick={() => {
                  handleConvertToEstimation(contract);
                }}
                className="w-full text-left p-2  hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
              >
                <FileText size={16} className="text-gray-600" />
                <span className="text-xs ">Convert to Estimation</span>
              </button>
              <button
                onClick={() => {
                  handleDownloadContract(contract);
                  setShowActionMenu(null);
                }}
                className="w-full text-left p-2  hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
              >
                <Download size={16} className="text-gray-600" />
                <span className="text-xs ">Download</span>
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(contract.id);
                  setShowActionMenu(null);
                }}
                className="w-full text-left p-2  hover:bg-red-50 flex items-center gap-2 text-red "
              >
                <Trash2 size={16} />
                <span className="text-xs ">Delete</span>
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );

  if (showDetailsPage && selectedContract) {
    return (
      <ContractDetailsPage
        contract={selectedContract}
        onBack={() => setShowDetailsPage(false)}
        onUpdate={() => {
          fetchContracts();
          setShowDetailsPage(false);
        }}
      />
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b p-2  flex items-center justify-between">
        <div>
          <h1 className="text-2xl  text-gray-900">Contracts <span className="text-red  text-xs  bg-red-100 p-1  rounded ml-2">{filteredContracts.length}</span></h1>
          <p className="text-xs  text-gray-500 mt-1">Home / Contracts</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border border-gray-300 rounded  bg-white p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-red-100 text-red ' : 'hover:bg-gray-100'}`}
            >
              <Grid3x3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-red-100 text-red ' : 'hover:bg-gray-100'}`}
            >
              <List size={18} />
            </button>
          </div>
          <button
            onClick={() => fetchContracts()}
            title="Refresh contracts"
            className="border border-gray-300 p-2 rounded  text-xs  bg-white hover:bg-gray-50 transition-colors text-gray-600">
            ⟳
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-red-600 text-white p-2  rounded  text-xs    hover:bg-red-700 transition-colors flex items-center gap-2">
            <Plus size={18} />
            Add New Contract
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-2  border-b">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1F2020]" />
            <input
              type="text"
              placeholder="Search contracts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 p-2  pl-10 rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="border border-gray-300 p-2 rounded  text-xs  bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Filter size={16} />
            Filter
          </button>
        </div>

        {filterOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 p-2 bg-gray-50 rounded ">
            <div>
              <label className="block text-xs   text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">All Status</option>
                {contractStatuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs   text-gray-700 mb-2">Company</label>
              <select
                value={filters.company}
                onChange={(e) => setFilters({ ...filters, company: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">All Companies</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs   text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs   text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded  text-xs  focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading contracts...</p>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded  border border-gray-200">
            <p className="text-gray-600">No contracts found</p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {filteredContracts.map((contract) => (
                  <ContractCard key={contract.id} contract={contract} />
                ))}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="bg-white rounded  border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs  text-gray-900">Subject</th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-900">Company</th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-900">Type</th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-900">Value</th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-900">Start Date</th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-900">Status</th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map((contract) => (
                      <ContractRow key={contract.id} contract={contract} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded  shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-md  text-gray-900 mb-4">Delete Contract?</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to delete this contract? This action cannot be undone.</p>
            </div>
            <div className="flex gap-3p-3  border-t border-gray-200">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 p-2  border border-gray-300 rounded  text-xs    text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteContract(showDeleteConfirm)}
                className="flex-1 p-2  bg-red-600 text-white rounded  text-xs    hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs  text-[#1F2020] py-6 border-t mt-8">
        Copyright © 2025 <span className="text-red   ">Preadmin</span>
      </div>

      <AddNewContractModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateContract}
        companies={companies}
      />
    </div>
  );
};

export default ContractsPage;
