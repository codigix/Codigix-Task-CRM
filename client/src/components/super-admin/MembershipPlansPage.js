import React, { useState } from 'react';
import { Search, Download, ChevronDown } from 'lucide-react';

const MembershipPlansPage = () => {
  const [query, setQuery] = useState('');
  const [billingMode, setBillingMode] = useState('yearly');

  const plans = [
    {
      id: 1,
      name: 'Basic',
      price: 50,
      features: [
        { name: '10 Contacts', included: true },
        { name: '10 Leads', included: true },
        { name: '20 Companies', included: true },
        { name: '50 Campaigns', included: true },
        { name: '100 Projects', included: true },
        { name: 'Deals', included: false },
        { name: 'Tasks', included: false },
        { name: 'Pipelines', included: false },
      ]
    },
    {
      id: 2,
      name: 'Business',
      price: 200,
      features: [
        { name: '20 Contacts', included: true },
        { name: '20 Leads', included: true },
        { name: '50 Companies', included: true },
        { name: 'Unlimited Campaigns', included: true },
        { name: 'Unlimited Projects', included: true },
        { name: 'Deals', included: false },
        { name: 'Tasks', included: false },
        { name: 'Pipelines', included: false },
      ]
    },
    {
      id: 3,
      name: 'Enterprise',
      price: 400,
      features: [
        { name: 'Unlimited Contacts', included: true },
        { name: 'Unlimited Leads', included: true },
        { name: 'Unlimited Companies', included: true },
        { name: 'Unlimited Campaigns', included: true },
        { name: 'Unlimited Projects', included: true },
        { name: 'Deals', included: true },
        { name: 'Tasks', included: true },
        { name: 'Pipelines', included: true },
      ]
    }
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-2 ">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl  text-gray-900">Membership Plans</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs   bg-red-100 text-red-800">
                152
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Home › Membership plans</p>
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
              + Add Membership
            </button>
          </div>
        </div>
      </div>

      {/* Search & Billing Toggle */}
      <div className="bg-white border-b border-gray-200 p-2 ">
        <div className="flex items-center justify-between mb-4">
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
        
        {/* Billing Toggle */}
        <div className="flex items-center gap-4">
          <span className="text-xs    text-gray-700">Yearly</span>
          <button
            onClick={() => setBillingMode(billingMode === 'yearly' ? 'monthly' : 'yearly')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              billingMode === 'yearly' ? 'bg-red-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                billingMode === 'yearly' ? 'translate-x-1' : 'translate-x-6'
              }`}
            />
          </button>
          <span className="text-xs    text-gray-700">Monthly</span>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded  border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              {/* Plan Header */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-center text-gray-600 text-xs    mb-2">{plan.name}</h3>
                <p className="text-center text-xl  text-gray-900">
                  ${plan.price}
                  <span className="text-xs  font-normal text-gray-600 ml-1">/ month</span>
                </p>
              </div>

              {/* Features List */}
              <div className="p-6 space-y-3">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    {feature.included ? (
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-700 text-xs ">✓</span>
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-[#1F2020] text-xs">−</span>
                      </div>
                    )}
                    <span className={`text-xs  ${feature.included ? 'text-gray-700' : 'text-[#1F2020]'}`}>
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Choose Button */}
              <div className="p-6 border-t border-gray-200">
                <button className="w-full bg-red-600 text-white py-2 rounded    hover:bg-red-700 transition-colors">
                  Choose
                </button>
              </div>
            </div>
          ))}
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

export default MembershipPlansPage;
