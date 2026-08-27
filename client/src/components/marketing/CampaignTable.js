import React, { useState, useEffect } from 'react';
import { Plus, MoreVertical } from 'lucide-react';
import { campaignAPI } from '../../services/api';

const CampaignTable = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await campaignAPI.getAll();
      let campaignsList = data;
      if (!Array.isArray(data)) {
        campaignsList = data?.data || data?.campaigns || [];
      }
      setCampaigns(campaignsList || []);
    } catch (err) {
      console.error('❌ Failed to load campaigns:', err);
      setError('Failed to load campaigns: ' + err.message);
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-gray-50">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-[28px]  text-gray-900">Campaign</h1>
              <span className="bg-[#FFE5E5] text-[#F62416] px-2.5 py-0.5 rounded-full text-[12px] ">125</span>
            </div>
            <div className="flex items-center gap-1 text-xs  mt-1">
              <button className="text-[#F97316] hover:text-[#EA580C]   bg-transparent border-none cursor-pointer p-0">Home</button>
              <span className="text-[#D1D5DB]">&gt;</span>
              <span className="text-[#6B7280]">Campaign</span>
            </div>
          </div>
          <button className="bg-[#F62416] text-white p-2  rounded    flex items-center gap-2 hover:opacity-90 transition text-xs ">
            <Plus size={18} />
            Add New Campaign
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <input type="text" placeholder="Search" className="w-full max-w-xs p-2  border border-[#E5E7EB] rounded  focus:outline-none text-xs  bg-white" />
          </div>
          <button className="p-2  border border-[#E5E7EB] rounded  hover:bg-gray-50 text-xs    text-gray-700 transition bg-white">Filter</button>
        </div>

        <div className="flex items-center gap-8 border-b border-[#EAECF0]">
          <button onClick={() => setActiveTab('active')} className={`pb-3 text-[14px]   transition ${activeTab === 'active' ? 'text-[#F62416] border-b-2 border-[#F62416]' : 'text-[#6B7280]'}`}>
            Active Campaign 24
          </button>
          <button onClick={() => setActiveTab('completed')} className={`pb-3 text-[14px]   transition ${activeTab === 'completed' ? 'text-[#F62416] border-b-2 border-[#F62416]' : 'text-[#6B7280]'}`}>
            Completed Campaign
          </button>
          <button onClick={() => setActiveTab('archived')} className={`pb-3 text-[14px]   transition ${activeTab === 'archived' ? 'text-[#F62416] border-b-2 border-[#F62416]' : 'text-[#6B7280]'}`}>
            Archived Campaign
          </button>
        </div>
      </div>

      <div className="px-6 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F62416] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading campaigns...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded  p-2 text-red-700">
            ⚠️ {error}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white border border-[#EAECF0] rounded-[12px] p-12 text-center">
            <p className="text-gray-600">No campaigns found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto bg-white border border-[#EAECF0] rounded-[12px] shadow-[0_2px_6px_rgba(0,0,0,0.05)]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#EAECF0]">
                    <th className="p-2  text-left text-[12px]  text-[#6B7280]">Campaign Name</th>
                    <th className="p-2  text-left text-[12px]  text-[#6B7280]">Status</th>
                    <th className="p-2  text-left text-[12px]  text-[#6B7280]">Budget</th>
                    <th className="p-2  text-left text-[12px]  text-[#6B7280]">Start Date</th>
                    <th className="p-2  text-left text-[12px]  text-[#6B7280]">End Date</th>
                    <th className="p-2  text-left text-[12px]  text-[#6B7280]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-[#EAECF0] hover:bg-gray-50">
                      <td className="p-2 ">
                        <div>
                          <p className="text-xs    text-gray-900">{campaign.name || 'N/A'}</p>
                          <p className="text-[12px] text-[#6B7280]">{campaign.description ? campaign.description.substring(0, 40) + '...' : 'No description'}</p>
                        </div>
                      </td>
                      <td className="p-2 ">
                        <span className={`inline-block px-3 py-1 rounded  text-[12px]   text-white ${campaign.status === 'Active' ? 'bg-green-500' :
                            campaign.status === 'Draft' ? 'bg-blue-500' :
                              campaign.status === 'Completed' ? 'bg-gray-500' :
                                'bg-orange-500'
                          }`}>
                          {campaign.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="p-2  text-xs  text-gray-900">
                        ${campaign.budget ? parseFloat(campaign.budget).toFixed(2) : '0.00'} {campaign.currency || 'USD'}
                      </td>
                      <td className="p-2  text-xs  text-gray-900">
                        {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="p-2  text-xs  text-gray-900">
                        {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="p-2 ">
                        <button className="text-[#9CA3AF] hover:bg-gray-100 p-1 rounded"><MoreVertical size={16} strokeWidth={2} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-center gap-2 mt-6">
              <button className="p-2 border border-[#EAECF0] rounded  hover:bg-gray-50 text-[12px] text-gray-700">←</button>
              <button className="p-2 bg-[#F62416] text-white rounded  text-[12px]  ">1</button>
              <button className="p-2 border border-[#EAECF0] rounded  hover:bg-gray-50 text-[12px] text-gray-700">→</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CampaignTable;
