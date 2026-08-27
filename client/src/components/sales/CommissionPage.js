import React from 'react';
import { DollarSign, CreditCard, History, ArrowUpRight } from 'lucide-react';

const CommissionPage = () => {
  const commissions = [
    { id: 1, deal: 'Enterprise CRM Setup', amount: '₹1,250', rate: '5%', date: '20 Feb 2026', status: 'Paid' },
    { id: 2, deal: 'SaaS Annual Plan', amount: '₹450', rate: '5%', date: '22 Feb 2026', status: 'Pending' },
    { id: 3, deal: 'Custom Integration', amount: '₹800', rate: '5%', date: '25 Feb 2026', status: 'Processing' },
    { id: 4, deal: 'Consulting Services', amount: '₹300', rate: '3%', date: '26 Feb 2026', status: 'Paid' },
  ];

  return (
    <div className="w-full bg-gray-50 min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-xl font-[500] text-gray-900 mb-1">Commission</h1>
        <div className="flex items-center gap-1 text-xs  text-gray-500">
          <span>Home</span>
          <span>&gt;</span>
          <span>Commission & Payouts</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded border border-gray-200 ">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-xs ">Total Earned (YTD)</span>
            <div className="p-2 bg-green-50 rounded"><DollarSign size={20} className="text-green-600" /></div>
          </div>
          <div className="text-2xl   text-gray-900">₹12,450.00</div>
          <div className="text-xs text-green-600  mt-1">+15% from last year</div>
        </div>
        <div className="bg-white p-6 rounded border border-gray-200 ">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-xs ">Pending Payout</span>
            <div className="p-2 bg-blue-50 rounded"><CreditCard size={20} className="text-white " /></div>
          </div>
          <div className="text-2xl   text-gray-900">₹1,250.00</div>
          <div className="text-xs text-[#1F2020] mt-1">Next payout: 15 Mar 2026</div>
        </div>
        <div className="bg-white p-6 rounded border border-gray-200 ">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-xs ">Current Rate</span>
            <div className="p-2 bg-purple-50 rounded"><ArrowUpRight size={20} className="text-purple-600" /></div>
          </div>
          <div className="text-2xl   text-gray-900">5.0%</div>
          <div className="text-xs text-purple-600  mt-1">Tier: Gold (Above ₹50k)</div>
        </div>
      </div>

      <div className="bg-white rounded border border-gray-200  overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-[16px]  text-gray-900 flex items-center gap-2">
            <History size={18} className="text-[#1F2020]" /> Payout History
          </h2>
          <button className="text-xs  text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1 rounded">Download CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-[12px]  text-gray-500 ">Deal Name</th>
                <th className="px-6 py-3 text-[12px]  text-gray-500 ">Commission</th>
                <th className="px-6 py-3 text-[12px]  text-gray-500 ">Rate</th>
                <th className="px-6 py-3 text-[12px]  text-gray-500 ">Date</th>
                <th className="px-6 py-3 text-[12px]  text-gray-500 ">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {commissions.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-xs   text-gray-900">{item.deal}</td>
                  <td className="px-6 py-4 text-xs  text-green-600  ">{item.amount}</td>
                  <td className="px-6 py-4 text-xs  text-gray-600">{item.rate}</td>
                  <td className="px-6 py-4 text-xs  text-gray-500">{item.date}</td>
                  <td className="px-6 py-4">
                    <span className={`p-1  rounded-full text-xs  ${item.status === 'Paid' ? 'bg-green-100 text-green-600' :
                      item.status === 'Processing' ? 'bg-blue-100 text-white ' :
                        'bg-orange-100 text-orange-600'
                      }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CommissionPage;
