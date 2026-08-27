import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, MoreVertical, Plus, Search, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CrmCompaniesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [companies, setCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (location.state?.newCompanyAdded) {
      fetchCompanies();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/companies`);
      if (response.ok) {
        let data = await response.json();

        // Handle both array and object response formats
        if (!Array.isArray(data)) {
          data = data.data || data.companies || [];
        }

        if (Array.isArray(data)) {
          const companiesWithDefaults = data.map(company => ({
            ...company,
            name: company.company_name || company.name,
            rating: company.rating || 4.5,
            tags: company.tags ? (typeof company.tags === 'string' ? company.tags.split(',').map(t => t.trim()) : company.tags) : [],
            icon: 'bg-blue-500',
            id: company.id || Math.random(),
            country: company.country || 'USA'
          }));
          setCompanies(companiesWithDefaults);
          setFilteredCompanies(companiesWithDefaults);
          console.log('✅ Companies fetched:', companiesWithDefaults.length);
        } else {
          console.warn('⚠️ Invalid data format:', data);
          setCompanies([]);
          setFilteredCompanies([]);
        }
      } else {
        console.error('❌ API error:', response.status);
        setCompanies([]);
        setFilteredCompanies([]);
      }
    } catch (error) {
      console.error('❌ Error fetching companies:', error);
      setCompanies([]);
      setFilteredCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = companies.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term)
    );
    setFilteredCompanies(filtered);
  };

  const seedMockCompanies = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/seed-mock-companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        showSuccessToast(`${data.count} mock companies added successfully!`);
        fetchCompanies();
      } else {
        showErrorToast('Failed to seed mock companies');
      }
    } catch (error) {
      console.error('Error seeding companies:', error);
      showErrorToast('Error seeding mock companies: ' + error.message);
    }
  };

  const handleEdit = (e, company) => {
    e.stopPropagation();
    navigate('/add-company', { state: { company, isEdit: true } });
    setOpenMenuId(null);
  };

  const handleDelete = async (e, companyId) => {
    e.stopPropagation();
    if (deleteConfirm === companyId) {
      setIsDeleting(true);
      try {
        const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
        const response = await fetch(`${apiUrl}/companies/${companyId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
          setCompanies(companies.filter(c => c.id !== companyId));
          setFilteredCompanies(filteredCompanies.filter(c => c.id !== companyId));
          setDeleteConfirm(null);
          showSuccessToast('Company deleted successfully!');
        } else {
          showErrorToast('Failed to delete company');
        }
      } catch (error) {
        console.error('Error deleting company:', error);
        showErrorToast('Error deleting company: ' + error.message);
      } finally {
        setIsDeleting(false);
      }
    } else {
      setDeleteConfirm(companyId);
    }
    setOpenMenuId(null);
  };

  const handlePreview = (e, company) => {
    e.stopPropagation();
    navigate('/company-details', { state: { company } });
    setOpenMenuId(null);
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[#FFA200] text-xs ">★</span>
        <span className="text-xs    text-gray-900">{rating}</span>
      </div>
    );
  };

  return (
    <div className="w-full bg-gray-50">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-[28px]  text-gray-900">Companies</h1>
              <span className="bg-[#FFE5E5] text-[#F62416] px-2.5 py-0.5 rounded-full text-[12px] ">{companies.length}</span>
            </div>
            <div className="flex items-center gap-1 text-xs  mt-1">
              <button className="text-[#F97316] hover:text-[#EA580C]   bg-transparent border-none cursor-pointer p-0">Home</button>
              <span className="text-[#D1D5DB]">&gt;</span>
              <span className="text-[#6B7280]">Companies</span>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => navigate('/add-company')} className="bg-[#F62416] text-white p-2  rounded    flex items-center gap-2 hover:opacity-90 transition text-xs ">
              <Plus size={18} />
              Add Company
            </button>
            <button
              onClick={seedMockCompanies}
              className="bg-gray-400 text-white p-2  rounded    text-xs  hover:opacity-90 transition"
              title="Add mock companies for testing"
            >
              Seed Data
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1F2020]" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-9 pr-4 py-2 border border-[#E5E7EB] rounded  focus:outline-none focus:border-gray-400 text-xs  bg-white"
            />
          </div>
          <button className="p-2  border border-[#E5E7EB] rounded  hover:bg-gray-50 text-xs    text-gray-700 transition bg-white flex items-center gap-2">
            Filter <ChevronDown size={16} />
          </button>
        </div>
      </div>

      <div className="px-6 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              className="bg-white border border-[#EAECF0] rounded shadow-[0_2px_6px_rgba(0,0,0,0.05)] p-2 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white  text-lg overflow-hidden flex-shrink-0 ${company.logo && company.logo.startsWith('data:') ? 'bg-white' : 'bg-gradient-to-br from-blue-400 to-blue-600'} `}>
                  {company.logo && company.logo.startsWith('data:') ? (
                    <img
                      src={company.logo}
                      alt={company.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : null}
                  {!company.logo || !company.logo.startsWith('data:') ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2c1.1 0 2 .9 2 2v2.5c0 .3-.2.5-.5.5s-.5.2-.5.5v1c0 .3.2.5.5.5s.5.2.5.5V10c0 .3-.2.5-.5.5s-.5.2-.5.5v1c0 .3.2.5.5.5s.5.2.5.5v1.5c0 1.1-.9 2-2 2h-8c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h8zm0 18c5.5 0 10-4.5 10-10S17.5 0 12 0 2 4.5 2 10s4.5 10 10 10z" /></svg>
                  ) : null}
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === company.id ? null : company.id);
                    }}
                    className="text-[#9CA3AF] hover:bg-gray-100 p-1 rounded  transition"
                  >
                    <MoreVertical size={16} strokeWidth={2} />
                  </button>
                  {openMenuId === company.id && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-[#E5E7EB] rounded  shadow-lg z-10 min-w-[120px]">
                      <button
                        onClick={(e) => handlePreview(e, company)}
                        className="w-full text-left p-2  text-xs  text-[#1F2937] hover:bg-gray-50 flex items-center gap-2 transition"
                      >
                        👁️ Preview
                      </button>
                      <button
                        onClick={(e) => handleEdit(e, company)}
                        className="w-full text-left p-2  text-xs  text-[#1F2937] hover:bg-gray-50 border-t border-[#E5E7EB] flex items-center gap-2 transition"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, company.id)}
                        className="w-full text-left p-2  text-xs  text-[#DC2626] hover:bg-red-50 border-t border-[#E5E7EB] flex items-center gap-2 transition"
                      >
                        🗑️ {deleteConfirm === company.id ? 'Confirm Delete?' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <h3 className="text-xs   text-gray-900 truncate mb-1">{company.name}</h3>
              <div className="mb-3">{renderStars(company.rating)}</div>

              <div className="space-y-1.5 mb-3 text-xs  text-[#6B7280]">
                <div className="flex items-center gap-2"><Mail size={15} strokeWidth={1.5} />{company.email}</div>
                <div className="flex items-center gap-2"><Phone size={15} strokeWidth={1.5} />{company.phone}</div>
                <div className="flex items-center gap-2"><MapPin size={15} strokeWidth={1.5} />{company.country}</div>
              </div>

              <div className="flex gap-2 mb-3 flex-wrap">
                {company.tags.map((tag, idx) => (
                  <span key={idx} className={`text-[12px] px-3 py-1 rounded    ${tag === 'Collab' ? 'bg-[#E4F8ED] text-[#28C76F]' : 'bg-[#FFF4DE] text-[#FFA200]'}`}>
                    {tag}
                  </span>
                ))}
              </div>

              <div className="pt-3 border-t border-[#F3F4F6] flex items-center justify-between">
                <div className="flex gap-2 text-[#6B7280]">
                  <button className="hover:text-gray-900 transition p-0.5" title="Email"><Mail size={15} strokeWidth={1.5} /></button>
                  <button className="hover:text-gray-900 transition p-0.5" title="Phone"><Phone size={15} strokeWidth={1.5} /></button>
                  <button className="hover:text-gray-900 transition p-0.5" title="Chat"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg></button>
                  <button className="hover:text-gray-900 transition p-0.5" title="Call"><Phone size={15} strokeWidth={1.5} /></button>
                </div>
                <div className="flex gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs   border border-white ${company.icon}`}>C</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button className="bg-[#F62416] text-white rounded-[8px] px-8 py-3   hover:opacity-90 transition text-[14px]">Load More</button>
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded  shadow-lg p-8 max-w-sm mx-4">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-2xl">🗑️</span>
              </div>
            </div>
            <h3 className="text-md  text-gray-900 text-center mb-2">Delete Confirmation</h3>
            <p className="text-xs  text-gray-600 text-center mb-6">Are you sure you want to remove company you selected?</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="p-2  border border-[#E5E7EB] rounded  text-gray-700   hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={(e) => handleDelete(e, deleteConfirm)}
                disabled={isDeleting}
                className="p-2  bg-red-500 text-white rounded    hover:bg-red-600 transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrmCompaniesPage;
