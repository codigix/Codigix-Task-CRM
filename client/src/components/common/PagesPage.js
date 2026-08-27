import React, { useState, useMemo } from 'react';
import { Search, Download, ChevronDown, MoreVertical, Filter, Star } from 'lucide-react';

const pagesData = [
  { id: 1, title: 'Dashboard', slug: 'Dashboard', status: 'Active' },
  { id: 2, title: 'Contacts', slug: 'Contacts', status: 'Inactive' },
  { id: 3, title: 'Home', slug: 'Home', status: 'Active' },
  { id: 4, title: 'Landing Pages', slug: 'Landing Pages', status: 'Active' },
  { id: 5, title: 'Reports & Analytics', slug: 'Reports & Analytics', status: 'Active' },
  { id: 6, title: 'Terms & Conditions', slug: 'Terms & Conditions', status: 'Active' },
  { id: 7, title: 'Categories', slug: 'Categories', status: 'Active' },
  { id: 8, title: 'Privacy Policy', slug: 'Privacy Policy', status: 'Active' },
  { id: 9, title: 'FAQ', slug: 'FAQ', status: 'Active' },
  { id: 10, title: 'About Us', slug: 'About Us', status: 'Active' },
];

const StatusBadge = ({ status }) => {
  if (status === 'Active') {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs  bg-green-100 text-green-800">Active</span>;
  }
  return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs  bg-red-100 text-red-800">Inactive</span>;
};

const PagesPage = () => {
  const [query, setQuery] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);

  const filtered = useMemo(() => {
    if (query.trim()) {
      const q = query.toLowerCase();
      return pagesData.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q)
      );
    }
    return pagesData;
  }, [query]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-2 ">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl  text-gray-900">Pages</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs   bg-red-100 text-red-800">
                152
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Home › Pages</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <button className="bg-white border border-gray-300 text-gray-700 p-2  rounded  text-xs    hover:bg-gray-50 flex items-center gap-2 transition-colors">
                <Download size={16} />
                Export
                <ChevronDown size={16} />
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded  shadow-lg hidden group-hover:block z-10">
                <button className="w-full text-left p-2  hover:bg-gray-50 text-xs  text-gray-700">Export as PDF</button>
                <button className="w-full text-left p-2  hover:bg-gray-50 text-xs  text-gray-700 border-t border-gray-200">Export as Excel</button>
              </div>
            </div>
            <button className="bg-red-600 text-white p-2  rounded  text-xs    hover:bg-red-700 transition-colors flex items-center gap-2">
              + Add New Page
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border-b border-gray-200 p-2 ">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1F2020]" />
          <input
            type="text"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded  focus:outline-none focus:border-gray-400 text-xs  bg-white w-full max-w-xs"
          />
        </div>
      </div>

      {/* Filters Row */}
      <div className="bg-white border-b border-gray-200 p-2 ">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 p-2 border border-gray-300 rounded  text-xs  text-gray-700 bg-white hover:bg-gray-50">
              <Filter size={16} />
              Filter
            </button>
            <div className="p-2 border border-gray-300 rounded  text-xs  bg-white text-gray-700">
              1 Dec 25 - 1 Dec 25
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 p-2 border border-gray-300 rounded  text-xs  text-gray-700 bg-white hover:bg-gray-50">
              Sort By
              <ChevronDown size={16} />
            </button>
            <button className="flex items-center gap-2 p-2 border border-gray-300 rounded  text-xs  text-gray-700 bg-white hover:bg-gray-50">
              Manage Columns
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="p-6">
        <div className="bg-white rounded   border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs ">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 text-left w-8">
                    <input type="checkbox" className="cursor-pointer" />
                  </th>
                  <th className="py-3 px-4 text-left  text-gray-700">Title</th>
                  <th className="py-3 px-4 text-left  text-gray-700">Page Slug</th>
                  <th className="py-3 px-4 text-left  text-gray-700">Status</th>
                  <th className="py-3 px-4 text-left  text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((pageItem) => (
                  <tr key={pageItem.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <input type="checkbox" className="cursor-pointer" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Star size={16} className="text-[#1F2020]" />
                        <span className="text-gray-700  ">{pageItem.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{pageItem.slug}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={pageItem.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === pageItem.id ? null : pageItem.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          <MoreVertical size={16} className="text-[#1F2020]" />
                        </button>
                        {openMenuId === pageItem.id && (
                          <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded  shadow-lg z-20">
                            <button className="w-full text-left p-2  hover:bg-gray-50 text-xs  text-gray-700">
                              Edit
                            </button>
                            <button className="w-full text-left p-2  hover:bg-gray-50 text-xs  text-gray-700 border-t border-gray-200">
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-2  border-t border-gray-200 bg-gray-50">
            <div className="text-xs  text-gray-600">
              Show{' '}
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-gray-300 p-1  rounded text-xs  bg-white"
              >
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>{' '}
              entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((s) => Math.max(1, s - 1))}
                className="px-3 py-1 border border-gray-300 rounded text-xs  hover:bg-gray-100 transition-colors disabled:opacity-50"
                disabled={page === 1}
              >
                &lt;
              </button>
              <button className="px-3 py-1 bg-red-600 text-white rounded text-xs ">{page}</button>
              <button
                onClick={() => setPage((s) => Math.min(pages, s + 1))}
                className="px-3 py-1 border border-gray-300 rounded text-xs  hover:bg-gray-100 transition-colors disabled:opacity-50"
                disabled={page === pages}
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 py-6 border-t border-gray-200 bg-white">
        <span>
          Copyright © 2025{' '}
          <span className="text-red   ">Preadmin</span>
        </span>
        <div className="flex gap-2 justify-center mt-2">
          <span className="cursor-pointer hover:text-gray-700">About</span>
          <span className="cursor-pointer hover:text-gray-700">Terms</span>
          <span className="cursor-pointer hover:text-gray-700">Contact Us</span>
        </div>
      </div>
    </div>
  );
};

export default PagesPage;
