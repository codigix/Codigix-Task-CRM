import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  RotateCcw,
  Layout,
  ChevronDown,
  Plus,
  List,
  Grid,
  Columns
} from 'lucide-react';
import DataTable from './DataTable';
import DateRangeDropdown from './DateRangeDropdown';
import ColumnFilterDropdown from './ColumnFilterDropdown';
import FilterDropdown from './FilterDropdown';

const CRMDataTable = ({
  title,
  data,
  columns,
  searchKeys,
  filterOptions = [],
  onAdd,
  onExport,
  onRefresh,
  viewMode = 'list',
  setViewMode,
  showViewSwitcher = true,
  breadcrumb = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Newest');
  const [dateRange, setDateRange] = useState('28 Feb 26 - 28 Feb 26');
  const [selectedFilters, setSelectedFilters] = useState({});
  const [visibleColumns, setVisibleColumns] = useState(columns.map(c => c.key));

  const handleFilterChange = (newFilters) => {
    setSelectedFilters(newFilters);
  };

  const handleColumnsChange = (newVisibleColumns) => {
    setVisibleColumns(newVisibleColumns);
  };

  return (
    <div className="w-full bg-[#F7F8F9] min-h-screenp-2  ">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl  text-gray-900">{title}</h1>
            <span className="bg-red-100 text-red  text-xs px-2 py-0.5 rounded-full ">
              {data.length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Home</span>
            {breadcrumb.map((item, index) => (
              <React.Fragment key={index}>
                <span className="opacity-50">/</span>
                <span className={index === breadcrumb.length - 1 ? "text-gray-900 " : ""}>
                  {item}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-gray-200 rounded overflow-hidden ">
            <button
              onClick={onExport}
              className="flex items-center gap-2 p-2 text-xs text-gray-600 hover:bg-gray-50 border-r border-gray-100 transition-colors"
            >
              <Download size={14} />
              Export
              <ChevronDown size={12} />
            </button>
            <button
              onClick={onRefresh}
              className="p-2  text-gray-600 hover:bg-gray-50 border-r border-gray-100 transition-colors"
            >
              <RotateCcw size={14} />
            </button>
            <button className="p-2  text-gray-600 hover:bg-gray-50 transition-colors">
              <Layout size={14} />
            </button>
          </div>
          <button
            onClick={onAdd}
            className="bg-red-600 text-white p-2 rounded text-xs  hover:bg-red-700 transition-all flex items-center gap-2 "
          >
            <Plus size={16} strokeWidth={3} />
            Add {title.slice(0, -1)}
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded  border border-gray-200 overflow-hidden">
        {/* Search Bar */}
        <div className="p-2 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-4 py-3 bg-[#F9FAFB] border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md p-2 shadow-xs cursor-pointer hover:border-red-500 transition-colors">
              <span className="text-red-500"><RotateCcw size={14} /></span>
              <span className="text-xs  text-gray-700">Sort By</span>
              <ChevronDown size={14} className="text-gray-400" />
            </div>

            <DateRangeDropdown
              value={dateRange}
              onChange={setDateRange}
            />

            <FilterDropdown
              filterOptions={filterOptions}
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
            />

            <ColumnFilterDropdown
              columns={columns}
              visibleColumns={visibleColumns}
              onColumnsChange={handleColumnsChange}
            />
          </div>

          {showViewSwitcher && (
            <div className="flex items-center bg-gray-100 rounded-md p-1 border border-gray-200">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white text-red  ' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded transition-all ${viewMode === 'kanban' ? 'bg-white text-red  ' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Grid size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Table Content */}

        <div className="overflow-hidden">
          <DataTable
            columns={columns}
            data={data}
            searchKeys={searchKeys}
            hideSearch={true}
            externalSearchTerm={searchTerm}
            visibleColumns={visibleColumns}
          />
        </div>



      </div>
    </div>
  );
};

export default CRMDataTable;
