import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, List, Grid, RotateCcw, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Star, ChevronsUpDown, Layout } from 'lucide-react';
import SortByDropdown from './SortByDropdown';
import AdvancedDateRangePicker from './AdvancedDateRangePicker';
import AdvancedFilterDropdown from './AdvancedFilterDropdown';
import ManageColumnsDropdown from './ManageColumnsDropdown';

const AdvancedDataTable = ({
  columns,
  data,
  title,
  entityName,
  addLabel,
  onAdd,
  filterConfigs,
  searchKeys = [],
  onRowClick,
  onEdit,
  onDelete,
  hideInternalHeader = false,
  externalSearchTerm = '',
  onSearchTermChange,
  externalFilters = {},
  onFilterChange,
  externalVisibleColumns = [],
  onVisibleColumnsChange,
  externalSortBy = 'newest',
  onSortByChange,
  externalDateRange = { start: null, end: null },
  onDateRangeChange,
  kanbanView,
  initialViewMode = 'list'
}) => {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [internalSortBy, setInternalSortBy] = useState('newest');
  const [internalDateRange, setInternalDateRange] = useState({ start: null, end: null, label: 'Date Range' });
  const [internalFilters, setInternalFilters] = useState({});
  const [internalVisibleColumns, setInternalVisibleColumns] = useState(columns.map(c => c.key));
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [viewMode, setViewMode] = useState(initialViewMode); // 'list', 'grid', or 'kanban'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const searchTerm = hideInternalHeader ? externalSearchTerm : internalSearchTerm;
  const selectedFilters = hideInternalHeader ? externalFilters : internalFilters;
  const sortBy = hideInternalHeader ? externalSortBy : internalSortBy;
  const setSortBy = hideInternalHeader ? onSortByChange : setInternalSortBy;
  const dateRange = hideInternalHeader ? externalDateRange : internalDateRange;
  const setDateRange = hideInternalHeader ? onDateRangeChange : setInternalDateRange;
  const visibleColumns = hideInternalHeader ? (externalVisibleColumns.length > 0 ? externalVisibleColumns : columns.map(c => c.key)) : internalVisibleColumns;
  const setVisibleColumns = hideInternalHeader ? onVisibleColumnsChange : setInternalVisibleColumns;

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, dateRange, selectedFilters]);

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Global Search
    if (searchTerm) {
      result = result.filter(item =>
        searchKeys.some(key =>
          String(item[key] || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Advanced Filters
    Object.keys(selectedFilters).forEach(key => {
      const values = selectedFilters[key];
      if (values && values.length > 0) {
        result = result.filter(item => values.includes(item[key]));
      }
    });

    // Date Range Filter
    if (dateRange.start && dateRange.end) {
      result = result.filter(item => {
        const itemDate = new Date(item.created_at || item.updated_at || item.date);
        return itemDate >= dateRange.start && itemDate <= dateRange.end;
      });
    }

    // Sort By
    if (sortConfig.key) {
      result.sort((a, b) => {
        const valueA = a[sortConfig.key];
        const valueB = b[sortConfig.key];

        if (valueA < valueB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      result.sort((a, b) => {
        const dateA = new Date(a.created_at || a.updated_at || a.date || 0);
        const dateB = new Date(b.created_at || b.updated_at || b.date || 0);
        return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
      });
    }

    return result;
  }, [data, searchTerm, sortBy, dateRange, selectedFilters, searchKeys, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedData, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderCellContent = (value, column, rowData) => {
    if (typeof column.render === 'function') {
      return column.render(value, rowData);
    }
    return value;
  };

  return (
    <div className="bg-white rounded  border border-gray-100  flex flex-col">
      {/* Header Row */}

      {!hideInternalHeader && (
        <div className="p-2 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => hideInternalHeader ? onSearchTermChange?.(e.target.value) : setInternalSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded text-sm focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
            <button
              onClick={onAdd}
              className="flex items-center gap-2 p-2   rounded text-xs  hover:bg-red-700 transition-colors "
            >
              <Plus size={18} />
              {addLabel || `Add ${entityName}`}
            </button>
          </div>
        </div>
      )}

      {/* Toolbar Row */}

      {/* Table/Grid/Kanban View */}
      {viewMode === 'kanban' && kanbanView ? (
        <div className="flex-1 overflow-hidden">
          {kanbanView}
        </div>
      ) : viewMode === 'list' ? (
        <div className="">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-2  ">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-red  focus:ring-red-500" />
                </th>

                {columns.filter(c => visibleColumns.includes(c.key)).map(column => (
                  <th key={column.key} className="p-2 text-xs text-black ">
                    <div
                      className={`flex items-center gap-2 cursor-pointer group hover:text-red transition-colors ${sortConfig.key === column.key ? 'text-red' : ''}`}
                      onClick={() => column.sortable !== false && requestSort(column.key)}
                    >
                      {column.label}
                      <div className="flex flex-col">
                        {column.sortable !== false && (
                          sortConfig.key === column.key ? (
                            sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          ) : (
                            <ChevronsUpDown size={12} className="text-gray-300 group-hover:text-gray-500" />
                          )
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    onClick={() => onRowClick?.(row)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="p-2" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="w-3 h-3 rounded border-gray-300 text-red  focus:ring-red-500" />
                    </td>
                    {/* <td className="p-2" onClick={(e) => e.stopPropagation()}>
                       <Star size={16} className="text-gray-300 hover:text-yellow-400 transition-colors" />
                    </td> */}
                    {columns.filter(c => visibleColumns.includes(c.key)).map(column => (
                      <td key={column.key} className="p-2">
                        {renderCellContent(row[column.key], column, row)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="p-8 text-center text-gray-500">
                    No data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50 overflow-y-auto custom-scrollbar" style={{ maxHeight: '600px' }}>
          {paginatedData.length > 0 ? (
            paginatedData.map((row, idx) => (
              <div key={row.id || idx} className="bg-whitep-2   rounded border border-gray-200  cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded flex items-center justify-center text-white font-[500]" style={{ backgroundColor: '#10b981' }}>
                      {row.initials || row[columns[0]?.key]?.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className=" text-gray-900">{row[columns[0]?.key]}</h3>
                      <span className="text-xs text-gray-500">{row[columns[1]?.key]}</span>
                    </div>
                  </div>
                  <Star size={18} className="text-gray-300" />
                </div>
                <div className="space-y-2 mb-4">
                  {columns.slice(2, 5).filter(c => visibleColumns.includes(c.key)).map(col => (
                    <div key={col.key} className="flex justify-between text-xs">
                      <span className="text-gray-500">{col.label}:</span>
                      <span className="text-gray-900 ">{renderCellContent(row[col.key], col, row)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full p-8 text-center text-gray-500">
              No data found
            </div>
          )}
        </div>
      )}

      {/* Pagination Row */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between">
          <span className="text-xs text-gray-500 ">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded text-xs  transition-colors ${currentPage === i + 1 ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50 border border-gray-100'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedDataTable;
