import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';

const DataTable = ({ columns, data, title, searchKeys = [], onRowClick, hideSearch = false, externalSearchTerm = '', visibleColumns = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const effectiveSearchTerm = hideSearch ? externalSearchTerm : searchTerm;

  const activeColumns = useMemo(() => {
    if (!visibleColumns || visibleColumns.length === 0) return columns;
    return columns.filter(col => visibleColumns.includes(col.key));
  }, [columns, visibleColumns]);

  const filteredData = useMemo(() => {
    if (!effectiveSearchTerm) return data;
    return data.filter(item =>
      searchKeys.some(key =>
        String(item[key] || '').toLowerCase().includes(effectiveSearchTerm.toLowerCase())
      )
    );
  }, [data, effectiveSearchTerm, searchKeys]);

  const sortedData = useMemo(() => {
    let sorted = [...filteredData];
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sorted;
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const renderCellContent = (value, column, rowData) => {
    if (typeof column.render === 'function') {
      return column.render(value, rowData);
    }
    return value;
  };

  return (
    <div className="bg-white rounded   border border-gray-100  card-hover">
      {/* Table Header */}
      {!hideSearch && (
        <div className="p-2 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white transition-smooth">
          <div className="flex items-center justify-between">
            <h2 className="text-md  text-gray-900 text-color-transition">{title}</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1F2020] transition-smooth" size={18} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 border border-border-light rounded  text-xs  text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-smooth"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="transition-smooth">
              {activeColumns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => column.sortable && handleSort(column.key)}
                  className={`p-2  text-left text-xs font-[500]  text-gray-900 transition-smooth ${column.sortable ? 'cursor-pointer hover:bg-gray-100 hover:text-gray-700' : ''
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable && sortConfig.key === column.key && (
                      <span className="animate-scale-in transition-transform">
                        {sortConfig.direction === 'asc' ? (
                          <ChevronUp size={14} className="animate-slide-in-up" />
                        ) : (
                          <ChevronDown size={14} className="animate-slide-in-down" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.length > 0 ? (
              paginatedData.map((item, index) => (
                <tr
                  key={index}
                  className={`notification-item hover:bg-gray-50 transition-smooth hover: ${onRowClick ? 'cursor-pointer' : ''
                    }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => onRowClick?.(item)}
                >
                  {activeColumns.map((column) => (
                    <td key={column.key} className="p-2  text-xs  text-gray-900 transition-smooth">
                      {renderCellContent(item[column.key], column, item)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={activeColumns.length} className="px-6 py-12 text-center text-gray-500 animate-fade-in">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-2  border-t border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white transition-smooth">
          <div className="text-xs  text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="btn-smooth p-2  border border-border-light rounded  text-xs    text-gray-700 bg-white hover:bg-red-50 hover:text-red  hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="btn-smooth p-2  border border-border-light rounded  text-xs    text-gray-700 bg-white hover:bg-red-50 hover:text-red  hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
