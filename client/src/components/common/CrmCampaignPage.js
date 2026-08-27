import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Filter, Plus, MoreVertical } from 'lucide-react';
import AddNewCampaignModal from '../marketing/AddNewCampaignModal';
import { campaignAPI } from '../../services/api';

const CrmCampaignPage = ({ department }) => {
  const [stats, setStats] = useState([]);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Active Campaign');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (department) {
      const filtered = allCampaigns.filter(c =>
        (department === 'Marketing' && (c.category === 'Marketing' || c.type === 'Marketing' || c.department === 'Marketing')) ||
        (department === 'IT' && (c.category === 'IT' || c.type === 'IT' || c.department === 'IT'))
      );
      setCampaigns(filtered);
      calculateStats(filtered);
    } else {
      setCampaigns(allCampaigns);
      calculateStats(allCampaigns);
    }
  }, [allCampaigns, department]);

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await campaignAPI.getAll();

      let campaignsList = data;
      if (!Array.isArray(data)) {
        campaignsList = data?.data || data?.campaigns || [];
      }

      if (Array.isArray(campaignsList)) {
        setAllCampaigns(campaignsList);
      } else {
        setAllCampaigns([]);
      }
    } catch (error) {
      console.error('❌ Failed to load campaigns:', error);
      setError('Failed to load campaigns: ' + error.message);
      setAllCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (campaignsData) => {
    if (!campaignsData || campaignsData.length === 0) return;

    const totalCampaigns = campaignsData.length;
    const activeCampaigns = campaignsData.filter(c => c.status === 'Running' || c.status === 'Active').length;
    const completedCampaigns = campaignsData.filter(c => c.status === 'Success' || c.status === 'Completed').length;
    const pausedCampaigns = campaignsData.filter(c => c.status === 'Paused').length;

    const newStats = [
      {
        label: 'Campaign',
        value: totalCampaigns,
        change: activeCampaigns > 0 ? `+${((activeCampaigns / totalCampaigns) * 100).toFixed(1)}%` : '0%',
        icon: '📧',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-600'
      },
      {
        label: 'Sent',
        value: activeCampaigns,
        change: totalCampaigns > 0 ? `+${((activeCampaigns / totalCampaigns) * 100).toFixed(1)}%` : '0%',
        icon: '📮',
        bgColor: 'bg-blue-100',
        textColor: 'text-white '
      },
      {
        label: 'Opened',
        value: completedCampaigns,
        change: totalCampaigns > 0 ? `+${((completedCampaigns / totalCampaigns) * 100).toFixed(1)}%` : '0%',
        icon: '📂',
        bgColor: 'bg-red-100',
        textColor: 'text-red '
      },
      {
        label: 'Completed',
        value: pausedCampaigns,
        change: totalCampaigns > 0 ? `${((pausedCampaigns / totalCampaigns) * 100).toFixed(1)}%` : '0%',
        icon: '✓',
        bgColor: 'bg-green-100',
        textColor: 'text-green-600'
      }
    ];

    setStats(newStats);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Success':
        return 'bg-green-100 text-green-600';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-600';
      case 'Bounced':
        return 'bg-red-100 text-red ';
      case 'Running':
        return 'bg-blue-100 text-white ';
      case 'Paused':
        return 'bg-blue-100 text-white ';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatIcon = (label) => {
    switch (label) {
      case 'Campaign':
        return <div className="w-12 h-12 bg-orange-500 rounded  flex items-center justify-center text-white text-xl">📧</div>;
      case 'Sent':
        return <div className="w-12 h-12 bg-blue-500 rounded  flex items-center justify-center text-white text-xl">📮</div>;
      case 'Opened':
        return <div className="w-12 h-12 bg-red-500 rounded  flex items-center justify-center text-white text-xl">📂</div>;
      case 'Completed':
        return <div className="w-12 h-12 bg-green-500 rounded  flex items-center justify-center text-white text-xl">✓</div>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50 min-h-screen flex flex-col">
      {error && (
        <div className="px-6 pt-6 pb-4">
          <div className="bg-red-50 border border-red-200 rounded  p-2">
            <p className="text-red-700 text-xs ">❌ {error}</p>
          </div>
        </div>
      )}

      <div className="px-6 pt-6 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl  text-red ">Campaign</h1>
              <span className="bg-red-100 text-red  px-3 py-1 rounded text-xs  ">{campaigns.length}</span>
            </div>
            <div className="flex items-center gap-1 text-xs  mt-1">
              <button className="text-orange-500 hover:text-orange-600   bg-transparent border-none cursor-pointer p-0">Home</button>
              <span className="text-gray-300">/</span>
              <span className="text-gray-600">Campaign</span>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-red-600 text-white p-2  rounded  flex items-center gap-2 hover:bg-red-700 transition text-xs"
          >
            <Plus size={16} /> Add New Campaign
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white rounded  p-2 border border-gray-200 flex items-center gap-4">
              {getStatIcon(stat.label)}
              <div>
                <p className="text-xs text-gray-600">{stat.label}</p>
                <p className="text-2xl  text-gray-900">{stat.value}</p>
                <p className="text-xs text-green-600 ">{stat.change}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 flex flex-col">
        <div className="flex items-center gap-6 mb-4 border-b border-gray-200 pb-3">
          {['Active Campaign', 'Completed Campaign', 'Archived Campaign'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs   transition-colors pb-1 ${activeTab === tab
                  ? 'text-red  border-b-2 border-red-600 -mb-1'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {tab}
              {tab === 'Active Campaign' && <span className="text-red  ml-2">24</span>}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1F2020]" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded  focus:outline-none focus:border-gray-400 text-xs  bg-white"
            />
          </div>
          <button className="p-2  border border-gray-300 rounded  hover:bg-gray-50 text-xs   text-gray-700 transition bg-white flex items-center gap-2">
            <Filter size={16} /> Sort By <ChevronDown size={14} />
          </button>
          <button className="p-2  border border-gray-300 rounded  hover:bg-gray-50 text-xs   text-gray-700 transition bg-white flex items-center gap-2">
            <Filter size={16} /> Filter
          </button>
          <button className="p-2  border border-gray-300 rounded  hover:bg-gray-50 text-xs    text-gray-700 transition bg-white">
            Manage Columns
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded   overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs ">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left w-8">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                  </th>
                  <th className="px-4 py-3 text-left  text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left  text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left  text-gray-700">Progress</th>
                  <th className="px-4 py-3 text-left  text-gray-700">Members</th>
                  <th className="px-4 py-3 text-left  text-gray-700">Status</th>
                  <th className="px-4 py-3 text-center  text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaigns.map((campaign, idx) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                    </td>
                    <td className="px-4 py-3  text-gray-900">{campaign.name}</td>
                    <td className="px-4 py-3 text-gray-600">{campaign.campaign_type || campaign.type || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-6 text-xs">
                        <div className="flex items-center gap-1">
                          <span className=" text-gray-900">{(campaign.progress?.opened || 0).toFixed(1)}%</span>
                          <span className="text-gray-500">Opened</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className=" text-gray-900">{(campaign.progress?.closed || 0).toFixed(1)}%</span>
                          <span className="text-gray-500">Closed</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className=" text-gray-900">{(campaign.progress?.unsubscribe || 0).toFixed(1)}%</span>
                          <span className="text-gray-500">Unsubscribe</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className=" text-gray-900">{(campaign.progress?.delivered || 0).toFixed(1)}%</span>
                          <span className="text-gray-500">Delivered</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className=" text-gray-900">{(campaign.progress?.conversation || 0).toFixed(1)}%</span>
                          <span className="text-gray-500">Conversation</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex -space-x-2">
                        {[...Array(Math.min(campaign.members || 0, 3))].map((_, i) => (
                          <img
                            key={i}
                            src={`https://i.pravatar.cc/40?img=${idx * 3 + i}`}
                            alt="member"
                            className="w-7 h-7 rounded-full border-2 border-white"
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-3 py-1 rounded text-xs  ${getStatusBadgeColor(campaign.status || 'Draft')}`}>
                        {campaign.status || 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="text-[#1F2020] hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded transition">
                        <MoreVertical size={16} strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-2 text-xs  text-gray-600">
              <span>Show</span>
              <select className="border border-gray-300 rounded p-1  text-xs  bg-white">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
              <span>entries</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 border border-gray-300 rounded hover:bg-gray-100 transition text-gray-600">−</button>
              <button className="w-8 h-8 bg-red-600 text-white rounded  text-xs ">1</button>
              <button className="p-2 border border-gray-300 rounded hover:bg-gray-100 transition text-gray-600">+</button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-2  border-t border-gray-200 bg-white text-center">
        <p className="text-xs text-gray-500">Copyright © 2025 <span className="text-red  ">Preadmin</span></p>
      </div>

      <AddNewCampaignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          loadCampaigns();
        }}
      />
    </div>
  );
};

export default CrmCampaignPage;
