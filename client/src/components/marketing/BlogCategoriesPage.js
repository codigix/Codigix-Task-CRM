import React, { useState, useMemo } from 'react';
import { Download, ChevronDown, X } from 'lucide-react';

const tableAnimationStyles = `
  @keyframes rowSlideIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes modalFadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes backdropFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .table-row {
    animation: rowSlideIn 0.3s ease-out;
  }

  .modal {
    animation: modalFadeIn 0.3s ease-out;
  }

  .modal-backdrop {
    animation: backdropFadeIn 0.2s ease-out;
  }

  .action-menu {
    animation: modalFadeIn 0.2s ease-out;
  }

  tbody tr:hover {
    background-color: #f9fafb;
    transition: background-color 0.2s ease;
  }

  .status-select {
    transition: all 0.2s ease;
  }

  .status-select:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .category-title {
    font-size: 20px;
    font-weight: 600;
    color: #1F1F1F;
    margin-top: 16px;
    margin-bottom: 4px;
  }

  .category-breadcrumb {
    font-size: 12px;
    color: #6B7280;
    font-weight: 400;
  }

  .filter-btn {
    height: 40px;
    border: 1px solid #E4E4E7;
    border-radius: 6px;
    font-size: 14px;
    padding: 0 12px;
  }

  .table-header {
    background-color: #F9FAFB;
    font-size: 14px;
  }

  .table-row-cell {
    padding: 16px;
    border-bottom: 1px solid #F1F1F3;
  }

  .active-badge {
    background-color: rgba(34, 197, 94, 0.15);
    color: #22C55E;
    font-size: 12px;
    padding: 3px 12px;
    border-radius: 9999px;
  }

  .inactive-badge {
    background-color: rgba(239, 68, 68, 0.15);
    color: #EF4444;
    font-size: 12px;
    padding: 3px 12px;
    border-radius: 9999px;
  }

  .pagination-active {
    background-color: #EF4444;
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 6px;
  }

  .footer-section {
    border-top: 1px solid #E5E7EB;
    padding-top: 16px;
    margin-top: 24px;
    color: #6B7280;
  }
`;

const categoriesData = [
  { id: 1, name: 'Sales Optimization', date: '17 Dec 2025', status: 'Active' },
  { id: 2, name: 'Automation', date: '11 Dec 2025', status: 'Active' },
  { id: 3, name: 'Marketing', date: '23 Nov 2025', status: 'Active' },
  { id: 4, name: 'Implementation', date: '12 Nov 2025', status: 'Active' },
  { id: 5, name: 'Product Features', date: '07 Nov 2025', status: 'Active' },
  { id: 6, name: 'Data & Analytics', date: '15 Oct 2025', status: 'Inactive' },
  { id: 7, name: 'Customization', date: '04 Oct 2025', status: 'Inactive' },
  { id: 8, name: 'Future & Trends', date: '29 Sep 2025', status: 'Active' },
  { id: 9, name: 'Training & Adoption', date: '25 Sep 2025', status: 'Inactive' },
  { id: 10, name: 'Security', date: '17 Sep 2025', status: 'Active' },
];

const StatusBadge = ({ status, onClick }) => {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center cursor-pointer transition-all ${status === 'Active'
        ? 'active-badge'
        : 'inactive-badge'
        }`}
    >
      {status}
    </span>
  );
};

const BlogCategoriesPage = () => {
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [checkedRows, setCheckedRows] = useState(new Set());
  // eslint-disable-next-line no-unused-vars
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', date: '1 Dec 25 - 1 Dec 25', status: 'Active' });
  const perPage = 10;

  const sorted = useMemo(() => {
    const sorted = [...categoriesData];
    if (sortBy === 'oldest') {
      sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else {
      sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return sorted;
  }, [sortBy]);

  const pages = Math.max(1, Math.ceil(sorted.length / perPage));
  const pageData = sorted.slice((page - 1) * perPage, page * perPage);

  const handleAddClick = () => {
    setFormData({ name: '', date: '1 Dec 25 - 1 Dec 25', status: 'Active' });
    setShowAddModal(true);
  };

  const handleEditClick = (category) => {
    setSelectedCategory(category);
    setFormData({ name: category.name, date: '1 Dec 25 - 1 Dec 25', status: category.status });
    setShowEditModal(true);
    setOpenMenuId(null);
  };

  const handleDeleteClick = (category) => {
    setSelectedCategory(category);
    setShowDeleteModal(true);
    setOpenMenuId(null);
  };

  const handleCheckAll = () => {
    if (checkedRows.size === pageData.length) {
      setCheckedRows(new Set());
    } else {
      setCheckedRows(new Set(pageData.map(c => c.id)));
    }
  };

  const handleCheckRow = (id) => {
    const newChecked = new Set(checkedRows);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedRows(newChecked);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <style>{tableAnimationStyles}</style>

      <div className="bg-white border-b border-gray-200 p-2 ">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="category-title">Blog Categories</h1>
            <p className="category-breadcrumb">Home › Blogs › Blog Categories</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <button className="filter-btn bg-white text-gray-700 flex items-center gap-2 transition-colors hover:bg-gray-50">
                <Download size={16} />
                Export
                <ChevronDown size={14} />
              </button>
              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded  shadow-lg hidden group-hover:block z-10">
                <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-50">Export as PDF</button>
                <button className="w-full text-left p-2  text-xs  text-gray-700 border-t border-gray-200 hover:bg-gray-50">Export as Excel</button>
              </div>
            </div>
            <button
              onClick={handleAddClick}
              className="bg-red-600 hover:bg-red-700 text-white text-xs  p-2  rounded   transition-colors"
            >
              Add Blog Category
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 p-2 ">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="filter-btn bg-white text-gray-700 flex items-center justify-center">
              1 Dec 25 - 1 Dec 25
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <button className="filter-btn flex items-center gap-2 bg-white text-gray-700 hover:bg-gray-50">
                Sort By
                <ChevronDown size={14} />
              </button>
              <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded  shadow-lg hidden group-hover:block z-10">
                <button
                  onClick={() => setSortBy('newest')}
                  className={`w-full text-left p-2  text-xs  ${sortBy === 'newest' ? 'bg-blue-50 text-blue-700 ' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  Newest
                </button>
                <button
                  onClick={() => setSortBy('oldest')}
                  className={`w-full text-left p-2  text-xs  border-t border-gray-200 ${sortBy === 'oldest' ? 'bg-blue-50 text-blue-700 ' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  Oldest
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-white rounded   border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs ">
              <thead>
                <tr className="table-header border-b border-gray-200">
                  <th className="table-row-cell w-8">
                    <input
                      type="checkbox"
                      checked={checkedRows.size === pageData.length && pageData.length > 0}
                      onChange={handleCheckAll}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="table-row-cell text-left  text-gray-700">Category Name</th>
                  <th className="table-row-cell text-left  text-gray-700">Created Date</th>
                  <th className="table-row-cell text-left  text-gray-700">Status</th>
                  <th className="table-row-cell text-left  text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((category, idx) => (
                  <tr key={category.id} className="table-row">
                    <td className="table-row-cell">
                      <input
                        type="checkbox"
                        checked={checkedRows.has(category.id)}
                        onChange={() => handleCheckRow(category.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="table-row-cell text-gray-700  ">{category.name}</td>
                    <td className="table-row-cell text-gray-500">{category.date}</td>
                    <td className="table-row-cell">
                      <StatusBadge status={category.status} onClick={() => handleEditClick(category)} />
                    </td>
                    <td className="table-row-cell">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(category)}
                          className="text-white  hover:text-blue-700 text-xs    transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(category)}
                          className="text-red  hover:text-red-700 text-xs    transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between p-2  border-t border-gray-200 bg-gray-50">
            <div className="text-xs  text-gray-600">
              Show <span className=" ">{perPage}</span> entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-gray-300 rounded text-xs  hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                Prev
              </button>
              <button className="pagination-active flex items-center justify-center text-xs   ">{page}</button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-2 border border-gray-300 rounded text-xs  hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-section bg-white text-center text-xs px-6 py-6">
        <span className="text-gray-600">Copyright © 2025 <span className="text-red   ">Preadmin</span></span>
        <div className="flex gap-2 justify-center mt-3">
          <span className="cursor-pointer hover:text-gray-900 transition-colors">About</span>
          <span className="cursor-pointer hover:text-gray-900 transition-colors">Terms</span>
          <span className="cursor-pointer hover:text-gray-900 transition-colors">Contact Us</span>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-backdrop fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="modal bg-white rounded p-3  w-96 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-md  text-gray-900">Add Blog Category</h2>
              <button onClick={() => setShowAddModal(false)} className="text-[#1F2020] hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs    text-gray-700 mb-1">Category *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Category name"
                />
              </div>
              <div>
                <label className="block text-xs    text-gray-700 mb-1">Created Date *</label>
                <input
                  type="text"
                  value={formData.date}
                  className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:ring-1 focus:ring-blue-500"
                  readOnly
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 p-2  border border-gray-300 rounded  text-gray-700   hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 p-2  bg-red-600 text-white rounded    hover:bg-red-700 transition-colors"
                >
                  Create New
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-backdrop fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="modal bg-white rounded p-3  w-96 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-md  text-gray-900">Edit Blog Category</h2>
              <button onClick={() => setShowEditModal(false)} className="text-[#1F2020] hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs    text-gray-700 mb-1">Category *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs    text-gray-700 mb-1">Created Date *</label>
                <input
                  type="text"
                  value={formData.date}
                  className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:ring-1 focus:ring-blue-500"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-xs    text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="status-select w-full p-2 border border-gray-300 rounded  focus:outline-none"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 p-2  border border-gray-300 rounded  text-gray-700   hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 p-2  bg-red-600 text-white rounded    hover:bg-red-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-backdrop fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="modal bg-white rounded p-3  w-80 shadow-lg">
            <h2 className="text-md  text-gray-900 mb-2">Delete Confirmation</h2>
            <p className="text-xs  text-gray-600 mb-6">Are you sure you want to remove blog category you selected.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 p-2  border border-gray-300 rounded  text-gray-700   hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 p-2  bg-red-600 text-white rounded    hover:bg-red-700 transition-colors"
              >
                Yes, Delete it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogCategoriesPage;
