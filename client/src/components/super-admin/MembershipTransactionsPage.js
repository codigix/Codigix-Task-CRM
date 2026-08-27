import React, { useState, useMemo } from 'react';
import { Search, Download, ChevronDown, MoreVertical, Star, Filter } from 'lucide-react';

const transactionsData = [
  { id: 1, type: 'Wallet Topup', amount: '+$650', date: '25 Sep 2025, 01:22 PM', payment: 'Paypal', status: 'Completed' },
  { id: 2, type: 'Purchase', amount: '-$350', date: '27 Sep 2025, 04:18 PM', payment: 'Cash', status: 'Cancel' },
  { id: 3, type: 'Refund', amount: '+$100', date: '29 Sep 2025, 10:08 AM', payment: 'Paypal', status: 'Completed' },
  { id: 4, type: 'Wallet Topup', amount: '+$650', date: '05 Oct 2025, 09:43 AM', payment: 'Cash', status: 'Completed' },
  { id: 5, type: 'Wallet Topup', amount: '+$650', date: '17 Oct 2025, 01:22 AM', payment: 'Paypal', status: 'Cancel' },
  { id: 6, type: 'Wallet Topup', amount: '+$650', date: '22 Oct 2025, 06:32 PM', payment: 'Cash', status: 'Completed' },
  { id: 7, type: 'Refund', amount: '+$500', date: '05 May 2025, 10:45 AM', payment: 'Cash', status: 'Completed' },
  { id: 8, type: 'Wallet Topup', amount: '+$380', date: '03 May 2025, 09:45 AM', payment: 'Cash', status: 'Completed' },
  { id: 9, type: 'Refund', amount: '+$290', date: '15 Feb 2025, 02:02 PM', payment: 'PayPal', status: 'Completed' },
  { id: 10, type: 'Wallet Topup', amount: '+$380', date: '25 Feb 2025, 01:22 PM', payment: 'Cash', status: 'Completed' },
];

const StatusBadge = ({ status }) => {
  if (status === 'Completed') {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs  bg-green-100 text-green-800">Completed</span>;
  }
  return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs  bg-red-100 text-red-800">Cancel</span>;
};

const MembershipTransactionsPage = () => {
  const [query, setQuery] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (query.trim()) {
      const q = query.toLowerCase();
      return transactionsData.filter(
        (t) =>
          t.type.toLowerCase().includes(q) ||
          t.payment.toLowerCase().includes(q)
      );
    }
    return transactionsData;
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
              <h1 className="text-2xl  text-gray-900">Membership Transactions</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs   bg-red-100 text-red-800">
                152
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Home › Membership Transactions</p>
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
                  <th className="py-3 px-4 text-left  text-gray-700">Type</th>
                  <th className="py-3 px-4 text-left  text-gray-700">Amount</th>
                  <th className="py-3 px-4 text-left  text-gray-700">Date</th>
                  <th className="py-3 px-4 text-left  text-gray-700">Payment Type</th>
                  <th className="py-3 px-4 text-left  text-gray-700">Status</th>
                  <th className="py-3 px-4 text-left  text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <input type="checkbox" className="cursor-pointer" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Star size={16} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-gray-700">{transaction.type}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600  ">{transaction.amount}</td>
                    <td className="py-3 px-4 text-gray-600">{transaction.date}</td>
                    <td className="py-3 px-4 text-gray-600">{transaction.payment}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={transaction.status} />
                    </td>
                    <td className="py-3 px-4">
                      <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                        <MoreVertical size={16} className="text-[#1F2020]" />
                      </button>
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

export default MembershipTransactionsPage;
