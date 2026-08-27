import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Phone, MapPin, Plus, MessageCircle, Users, ChevronDown, X, Search, MoreVertical, Edit, Trash2, Eye, Star, LayoutGrid, List, RotateCcw, Maximize, Download, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { contactsAPI } from '../../services/api';
import AddContactModal from './AddContactModal';

const CustomersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [showFilter, setShowFilter] = useState(false);
  const [expandedFilters, setExpandedFilters] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    name: '',
    industry: [],
    owner: '',
    location: [],
    status: []
  });
  const [filterOptions, setFilterOptions] = useState({
    industries: [],
    owners: [],
    locations: [],
    statuses: []
  });

  const transformCustomerData = (apiContacts) => {
    if (!Array.isArray(apiContacts)) return [];

    return apiContacts.map((contact) => {
      const initials = `${contact.first_name?.charAt(0) || ''}${contact.last_name?.charAt(0) || ''}`.toUpperCase();
      return {
        id: contact.id,
        name: `${contact.first_name} ${contact.last_name}`,
        company: contact.company_name || 'N/A',
        email: contact.email || '',
        phone: contact.phone || '',
        position: contact.position || '',
        location: contact.location || contact.country || contact.city || 'N/A',
        industry: contact.industry || 'Technology',
        owner: contact.owner_first_name ? `${contact.owner_first_name} ${contact.owner_last_name}` : 'Darlee Robertson',
        avatar: initials,
        status: contact.status || 'Active',
        rating: contact.rating || 5
      };
    });
  };

  const applyFilters = useCallback((customersList, filterObj, searchTermValue) => {
    return customersList.filter(customer => {
      const searchLower = searchTermValue.toLowerCase();
      const matchSearch =
        customer.name.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        customer.company.toLowerCase().includes(searchLower);

      if (!matchSearch) return false;

      if (filterObj.name && !customer.name.toLowerCase().includes(filterObj.name.toLowerCase())) return false;
      if (filterObj.industry.length > 0 && !filterObj.industry.includes(customer.industry)) return false;
      if (filterObj.owner && customer.owner !== filterObj.owner) return false;
      if (filterObj.location.length > 0 && !filterObj.location.includes(customer.location)) return false;
      if (filterObj.status.length > 0 && !filterObj.status.includes(customer.status)) return false;

      return true;
    });
  }, []);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = {};
      if (user && (user.role === 'Sales' || user.role === 'Sales Executive')) {
        queryParams.assignedTo = user.id;
      }
      const data = await contactsAPI.getAll(queryParams);
      const transformedData = transformCustomerData(data);
      setCustomers(transformedData);
      setFilteredCustomers(transformedData);

      // Generate filter options
      const industries = [...new Set(transformedData.map(c => c.industry))].filter(Boolean);
      const locations = [...new Set(transformedData.map(c => c.location))].filter(Boolean);
      const owners = [...new Set(transformedData.map(c => c.owner))].filter(Boolean);
      const statuses = [...new Set(transformedData.map(c => c.status))].filter(Boolean);

      setFilterOptions({
        industries,
        locations,
        owners,
        statuses
      });
    } catch (error) {
      console.error('Error fetching customers:', error);
      showErrorToast('Failed to fetch customers');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    const filtered = applyFilters(customers, filters, term);
    setFilteredCustomers(filtered);
  };

  const handleFilterChange = (filterType, value, isCheckbox = false) => {
    setFilters(prev => {
      let updated = { ...prev };
      if (isCheckbox) {
        updated[filterType] = updated[filterType].includes(value)
          ? updated[filterType].filter(item => item !== value)
          : [...updated[filterType], value];
      } else {
        updated[filterType] = value;
      }
      const filtered = applyFilters(customers, updated, searchTerm);
      setFilteredCustomers(filtered);
      return updated;
    });
  };

  const handleResetFilters = () => {
    const resetFilters = {
      name: '',
      industry: [],
      owner: '',
      location: [],
      status: []
    };
    setFilters(resetFilters);
    setFilteredCustomers(applyFilters(customers, resetFilters, searchTerm));
  };

  const toggleFilterSection = (section) => {
    setExpandedFilters(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleAddCustomer = async (formData) => {
    try {
      await contactsAPI.create(formData);
      showSuccessToast('Customer added successfully');
      setIsModalOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error adding customer:', error);
      showErrorToast('Failed to add customer');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F9FAFB] p-2 font-sans">
      {/* Header */}
      <div className=" border-b border-gray-200 p-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-[500] text-gray-900 ">
              Customers
              <span className="inline-block p-1  bg-red-50 text-red  text-xs  rounded-full border border-red-100">
                {filteredCustomers.length}
              </span>
            </h1>
            <nav className="text-xs  text-gray-500 mt-1 flex items-center gap-1">
              <span>Home</span>
              <span className="text-gray-300 mx-1">›</span>
              <span className="text-gray-900 ">Customers</span>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 border border-gray-300 rounded text-xs  text-gray-700 flex items-center gap-2 hover:bg-gray-50 bg-white ">
              <Download size={15} /> Export <ChevronDown size={14} />
            </button>
            <button
              onClick={() => fetchCustomers()}
              className="p-2 border border-gray-300 rounded flex items-center justify-center bg-white hover:bg-gray-50 "
            >
              <RotateCcw size={15} className="text-gray-600" />
            </button>
            <button className="p-2 border border-gray-300 rounded flex items-center justify-center bg-white hover:bg-gray-50 ">
              <Maximize size={15} className="text-gray-600" />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="h-9 px-3 bg-red-600 text-white rounded flex items-center gap-1.5 text-sm  hover:bg-red-700  transition-colors"
            >
              <Plus size={18} /> Add Customer
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className=" border-b border-gray-200 p-2  flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F2020]" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full h-9 pl-9 pr-3 border border-gray-300 rounded text-xs  focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`h-9 px-3 border border-gray-300 rounded text-xs  flex items-center gap-2 hover:bg-gray-50 transition-colors ${showFilter ? 'bg-gray-100 text-gray-900 border-gray-400' : 'bg-white text-gray-700'}`}
          >
            <Filter size={15} /> Filter <ChevronDown size={14} />
          </button>
          <div className="flex items-center border border-gray-300 rounded bg-white overflow-hidden p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`w-8 h-8 flex items-center justify-center rounded ${viewMode === 'list' ? 'bg-[#10B981] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`w-8 h-8 flex items-center justify-center rounded ${viewMode === 'kanban' ? 'bg-[#10B981] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-[#F9FAFB] p-2 relative">
        {showFilter && (
          <div className="absolute top-0 right-0 w-80 h-full bg-white border-l border-gray-200 shadow-xl z-30 p-2 overflow-y-auto slide-in">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <h3 className="text-gray-900 text-sm ">Filters</h3>
              <button onClick={() => setShowFilter(false)} className="text-[#1F2020] hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status Filter */}
              <div className="border-b border-gray-100 pb-3">
                <button onClick={() => toggleFilterSection('status')} className="w-full flex items-center justify-between py-2 text-xs   text-gray-700">
                  Status
                  <ChevronDown size={14} className={`transition-transform duration-200 ${expandedFilters.status ? '' : '-rotate-90'}`} />
                </button>
                {expandedFilters.status && (
                  <div className="pt-2 space-y-2">
                    {filterOptions.statuses.map(status => (
                      <label key={status} className="flex items-center gap-2 text-xs  text-gray-600 cursor-pointer hover:text-gray-900 transition-colors">
                        <input
                          type="checkbox"
                          checked={filters.status.includes(status)}
                          onChange={() => handleFilterChange('status', status, true)}
                          className="rounded border-gray-300 text-red  focus:ring-red-500"
                        />
                        {status}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Industry Filter */}
              <div className="border-b border-gray-100 pb-3">
                <button onClick={() => toggleFilterSection('industry')} className="w-full flex items-center justify-between py-2 text-xs   text-gray-700">
                  Industry
                  <ChevronDown size={14} className={`transition-transform duration-200 ${expandedFilters.industry ? '' : '-rotate-90'}`} />
                </button>
                {expandedFilters.industry && (
                  <div className="pt-2 space-y-2">
                    {filterOptions.industries.map(industry => (
                      <label key={industry} className="flex items-center gap-2 text-xs  text-gray-600 cursor-pointer hover:text-gray-900 transition-colors">
                        <input
                          type="checkbox"
                          checked={filters.industry.includes(industry)}
                          onChange={() => handleFilterChange('industry', industry, true)}
                          className="rounded border-gray-300 text-red  focus:ring-red-500"
                        />
                        {industry}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={handleResetFilters} className="flex-1 py-2 text-xs   border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition-colors">Reset</button>
              <button onClick={() => setShowFilter(false)} className="flex-1 py-2 text-xs   bg-red-600 text-white rounded hover:bg-red-700 transition-colors ">Apply</button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-[#1F2020]">
            <RotateCcw size={32} className="animate-spin mb-4" />
            <p className="text-sm ">Loading customers...</p>
          </div>
        ) : filteredCustomers.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded  overflow-hidden ">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F9FAFB] border-b border-gray-200">
                <tr>
                  <th className="p-2   text-center  text-gray-500">
                    <input type="checkbox" className="rounded border-gray-300 text-red  focus:ring-red-500" />
                  </th>
                  <th className="p-4 w-8"></th>
                  <th className="p-2  text-xs   text-gray-700  tracking-wider">Customer Name</th>
                  <th className="p-2  text-xs   text-gray-700  tracking-wider">Company</th>
                  <th className="p-2  text-xs   text-gray-700  tracking-wider">Industry</th>
                  <th className="p-2  text-xs   text-gray-700  tracking-wider">Location</th>
                  <th className="p-2  text-xs   text-gray-700  tracking-wider">Owner</th>
                  <th className="p-2  text-xs   text-gray-700  tracking-wider">Status</th>
                  <th className="p-2  text-xs   text-gray-700  tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-4 text-center">
                      <input type="checkbox" className="rounded border-gray-300 text-red  focus:ring-red-500" />
                    </td>
                    <td className="p-4 text-center">
                      <Star size={15} className="text-gray-300 hover:text-yellow-400 cursor-pointer transition-colors" />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs    text-white border border-white  overflow-hidden">
                          {customer.avatarImage ? <img src={customer.avatarImage} alt="" className="w-full h-full object-cover" /> : customer.avatar}
                        </div>
                        <div>
                          <div className="text-xs   text-gray-900 group-hover:text-red  transition-colors">{customer.name}</div>
                          <div className="text-xs text-gray-500">{customer.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2  text-xs  text-gray-700 ">{customer.company}</td>
                    <td className="p-4">
                      <span className="p-1  bg-blue-50 text-white  text-xs  rounded-full border border-blue-100">
                        {customer.industry}
                      </span>
                    </td>
                    <td className="p-2  text-xs  text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-[#1F2020]" />
                        {customer.location}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-xs    text-purple-600 border border-purple-200">
                          {customer.owner[0]}
                        </div>
                        <span className="text-xs  text-gray-700">{customer.owner}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs  rounded  tracking-wide inline-block ${customer.status === 'Active' ? 'bg-[#E4F8ED] text-[#28C76F] border border-[#BFF1D7]' : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-[#1F2020] hover:text-red  hover:bg-red-50 rounded transition-colors" title="View">
                          <Eye size={15} />
                        </button>
                        <button className="p-1.5 text-[#1F2020] hover:text-white  hover:bg-blue-50 rounded transition-colors" title="Edit">
                          <Edit size={15} />
                        </button>
                        <button className="p-1.5 text-[#1F2020] hover:text-red  hover:bg-red-50 rounded transition-colors" title="Delete">
                          <Trash2 size={15} />
                        </button>
                        <button className="p-1.5 text-[#1F2020] hover:bg-gray-100 rounded transition-colors">
                          <MoreVertical size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Table Footer / Pagination */}
            <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between text-xs  text-gray-500">
              <div className="flex items-center gap-2">
                <span>Row Per Page</span>
                <select className="border border-gray-300 rounded px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-red-500">
                  <option>10</option>
                  <option>20</option>
                  <option>50</option>
                </select>
                <span>Entries</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-500 transition-colors disabled:opacity-50">‹</button>
                <button className="w-8 h-8 flex items-center justify-center rounded bg-red-600 text-white  ">1</button>
                <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-500 transition-colors">›</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 bg-white rounded border-2 border-dashed border-gray-200">
            <Users size={48} className="text-gray-200 mb-4" />
            <h3 className="text-gray-900  mb-1">No customers found</h3>
            <p className="text-gray-500 text-xs  mb-6">Try adjusting your search or filters to find what you're looking for.</p>
            <button
              onClick={handleResetFilters}
              className="p-2 bg-white border border-gray-300 rounded text-xs   text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-6 py-4 flex items-center justify-between text-[12px] text-[#1F2020] bg-white border-t border-gray-200 ">
        <p>Copyright © 2026 <span className="text-red ">CRMS</span>. All rights reserved.</p>
        <div className="flex items-center gap-2">
          <button className="hover:text-red  transition-colors">About Us</button>
          <button className="hover:text-red  transition-colors">Privacy Policy</button>
          <button className="hover:text-red  transition-colors">Contact Support</button>
        </div>
      </div>

      <AddContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddCustomer}
      />
    </div>
  );
};

export default CustomersPage;
