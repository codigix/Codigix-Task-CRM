import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Download, Search, Phone, Mail, CheckSquare, Calendar, Video, FileUp, Receipt, Calculator, Star, TrendingUp, Building2, User, Edit2, FileText } from 'lucide-react';
import { activitiesAPI } from '../../services/api';

const ActivitiesPage = () => {
  const navigate = useNavigate();
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activities, setActivities] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [staticActivitiesPlaceholder] = useState([
    {
      id: '1',
      title: 'We scheduled a meeting for next week',
      type: 'Meeting',
      dueDate: '25 Sep 2025, 12:12 pm',
      owner: 'Hendry Milner',
      ownerInitial: 'HM',
      ownerBg: 'bg-blue-500',
      createdAt: '22 Sep 2025, 10:14 am',
    },
    {
      id: '2',
      title: 'Had conversation with Fred regarding task',
      type: 'Calls',
      dueDate: '29 Sep 2025, 04:12 pm',
      owner: 'Theresa Nelson',
      ownerInitial: 'TN',
      ownerBg: 'bg-purple-500',
      createdAt: '27 Sep 2025, 03:26 pm',
    },
    {
      id: '3',
      title: 'Analysing latest time estimation for new project',
      type: 'Email',
      dueDate: '11 Oct 2025, 05:00 pm',
      owner: 'Guilory Berggren',
      ownerInitial: 'GB',
      ownerBg: 'bg-orange-500',
      createdAt: '03 Oct 2025, 03:53 pm',
    },
    {
      id: '4',
      title: 'Store and manage contact data',
      type: 'Task',
      dueDate: '19 Oct 2025, 02:35 pm',
      owner: 'Jami Carlile',
      ownerInitial: 'JC',
      ownerBg: 'bg-pink-500',
      createdAt: '14 Oct 2025, 01:25 am',
    },
    {
      id: '5',
      title: 'Will have a meeting before project start',
      type: 'Meeting',
      dueDate: '27 Oct 2025, 12:30 pm',
      owner: 'Theresa Nelson',
      ownerInitial: 'TN',
      ownerBg: 'bg-purple-500',
      createdAt: '21 Oct 2025, 03:00 pm',
    },
    {
      id: '6',
      title: 'Call John and discuss about project',
      type: 'Calls',
      dueDate: '12 Nov 2025, 10:20 pm',
      owner: 'Smith Cooper',
      ownerInitial: 'SC',
      ownerBg: 'bg-green-500',
      createdAt: '02 Nov 2025, 05:35 am',
    },
    {
      id: '7',
      title: 'Built landing pages',
      type: 'Task',
      dueDate: '25 Nov 2025, 01:40 pm',
      owner: 'Martin Lewis',
      ownerInitial: 'ML',
      ownerBg: 'bg-red-500',
      createdAt: '20 Nov 2025, 08:20 am',
    },
    {
      id: '8',
      title: 'Regarding latest updates in project',
      type: 'Email',
      dueDate: '30 Nov 2025, 09:20 pm',
      owner: 'Newell Egan',
      ownerInitial: 'NE',
      ownerBg: 'bg-yellow-500',
      createdAt: '25 Nov 2025, 07:20 pm',
    },
    {
      id: '9',
      title: 'Discussed budget proposal with Edwin',
      type: 'Calls',
      dueDate: '08 Dec 2025, 04:35 pm',
      owner: 'Janet Carlson',
      ownerInitial: 'JCA',
      ownerBg: 'bg-indigo-500',
      createdAt: '01 Dec 2025, 10:45 am',
    },
    {
      id: '10',
      title: 'Attach final proposal for upcoming project',
      type: 'Email',
      dueDate: '19 Dec 2025, 02:20 pm',
      owner: 'Craig Brown',
      ownerInitial: 'CB',
      ownerBg: 'bg-cyan-500',
      createdAt: '10 Dec 2025, 06:30 am',
    },
  ]);

  useEffect(() => {
    fetchAllActivities();
  }, []);

  const fetchAllActivities = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await activitiesAPI.getUnifiedFeed();

      let activitiesList = Array.isArray(data) ? data : [];

      if (activitiesList.length > 0) {
        const formattedActivities = activitiesList.map((activity, index) => {
          const uniqueId = `${activity.activity_source || 'activity'}-${activity.id || index}-${index}`;
          return {
            id: activity.id || `activity-${index}`,
            uniqueId: uniqueId,
            title: activity.title || 'Activity',
            type: activity.type || activity.activity_source || 'Task',
            activitySource: activity.activity_source || 'Activity',
            dueDate: activity.scheduled_date
              ? `${new Date(activity.scheduled_date).toLocaleDateString()} ${activity.scheduled_time || ''}`.trim()
              : 'No date',
            owner: activity.assigned_to_name || activity.created_by_name || 'System',
            ownerInitial: (activity.assigned_to_name || activity.created_by_name || 'S')[0].toUpperCase(),
            ownerBg: ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-red-500', 'bg-yellow-500'][index % 7],
            createdAt: activity.created_at ? new Date(activity.created_at).toLocaleString() : 'No date',
            icon: activity.icon || 'CheckSquare',
            color: activity.color || 'blue',
            description: activity.description || '',
            status: activity.status || 'Active',
            ...activity
          };
        });

        setActivities(formattedActivities);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error('❌ Error fetching unified activity feed:', error);
      setError('Failed to load activities: ' + error.message);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const getActivityTypeColor = (type, activitySource) => {
    const source = activitySource || type;
    switch (source) {
      case 'Meeting':
      case 'Activity':
        return { bg: 'bg-blue-100', text: 'text-blue-700', icon: Calendar };
      case 'Call':
      case 'Calls':
        return { bg: 'bg-green-100', text: 'text-green-700', icon: Phone };
      case 'Video Call':
        return { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: Video };
      case 'Email':
      case 'Message Sent':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Mail };
      case 'Task':
        return { bg: 'bg-red-100', text: 'text-red-700', icon: CheckSquare };
      case 'Note':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Edit2 };
      case 'Contact Created':
        return { bg: 'bg-purple-100', text: 'text-purple-700', icon: User };
      case 'Company Created':
        return { bg: 'bg-orange-100', text: 'text-orange-700', icon: Building2 };
      case 'Deal Created':
        return { bg: 'bg-red-100', text: 'text-red-700', icon: TrendingUp };
      case 'Lead Created':
        return { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: Star };
      case 'Proposal Sent':
        return { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: FileText };
      case 'Invoice Created':
        return { bg: 'bg-green-100', text: 'text-green-700', icon: Receipt };
      case 'Estimation Created':
        return { bg: 'bg-pink-100', text: 'text-pink-700', icon: Calculator };
      case 'File Uploaded':
        return { bg: 'bg-teal-100', text: 'text-teal-700', icon: FileUp };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', icon: null };
    }
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = activeFilter === 'all' ||
      activity.activitySource === activeFilter ||
      activity.type === activeFilter;

    return matchesSearch && matchesFilter;
  });

  const sortedActivities = [...filteredActivities].sort((a, b) => {
    if (sortBy === 'oldest') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const paginatedActivities = sortedActivities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(sortedActivities.length / itemsPerPage);

  const toggleActivitySelection = (id) => {
    setSelectedActivities(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const toggleAllActivities = () => {
    if (selectedActivities.length === paginatedActivities.length) {
      setSelectedActivities([]);
    } else {
      setSelectedActivities(paginatedActivities.map(a => a.uniqueId));
    }
  };

  if (loading) {
    return (
      <div className="p-2 bg-[#F7F8F9] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 bg-[#F7F8F9] min-h-screen">
      {error && (
        <div className="mb-6 max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded p-2  ">
            <p className="text-red-700 text-sm">❌ {error}</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-xl  text-gray-900">Activities</h1>
              <span className="bg-red-100 text-red  text-xs  px-3 py-1 rounded-full">
                {activities.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <button className="hover:text-gray-900  ">Home</button>
              <span className="text-[#1F2020]">›</span>
              <span className="text-gray-600">Activities</span>
            </div>
          </div>

          {/* Top Right Buttons */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 p-2  text-gray-700 hover:bg-gray-100 rounded  text-sm  ">
              <Download size={16} />
              Export
            </button>
            <button className="flex items-center gap-2 p-2  bg-red-600 text-white rounded  text-xs  hover:bg-red-700">
              + Add New Activity
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-[#1F2020]" size={18} />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded  focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Action Bar */}
        <div className="mb-6 bg-white p-2 rounded  ">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm  text-gray-700 mr-2">Filter by:</span>
            <button
              onClick={() => setActiveFilter('all')}
              className={`p-2 rounded text-xs   transition ${activeFilter === 'all' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              All Activities
            </button>
            <button
              onClick={() => setActiveFilter('Call')}
              className={`p-2 rounded text-xs   flex items-center gap-1 transition ${activeFilter === 'Call' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Phone size={14} /> Calls
            </button>
            <button
              onClick={() => setActiveFilter('Note')}
              className={`p-2 rounded text-xs   flex items-center gap-1 transition ${activeFilter === 'Note' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Edit2 size={14} /> Notes
            </button>
            <button
              onClick={() => setActiveFilter('Message Sent')}
              className={`p-2 rounded text-xs   flex items-center gap-1 transition ${activeFilter === 'Message Sent' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Mail size={14} /> Messages
            </button>
            <button
              onClick={() => setActiveFilter('File Uploaded')}
              className={`p-2 rounded text-xs   flex items-center gap-1 transition ${activeFilter === 'File Uploaded' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <FileUp size={14} /> Files
            </button>
            <button
              onClick={() => setActiveFilter('Invoice Created')}
              className={`p-2 rounded text-xs   flex items-center gap-1 transition ${activeFilter === 'Invoice Created' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Receipt size={14} /> Invoices
            </button>
            <button
              onClick={() => setActiveFilter('Contact Created')}
              className={`p-2 rounded text-xs   flex items-center gap-1 transition ${activeFilter === 'Contact Created' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <User size={14} /> Contacts
            </button>
            <button
              onClick={() => setActiveFilter('Company Created')}
              className={`p-2 rounded text-xs   flex items-center gap-1 transition ${activeFilter === 'Company Created' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Building2 size={14} /> Companies
            </button>
            <button
              onClick={() => setActiveFilter('Deal Created')}
              className={`p-2 rounded text-xs   flex items-center gap-1 transition ${activeFilter === 'Deal Created' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <TrendingUp size={14} /> Deals
            </button>
            <button
              onClick={() => setActiveFilter('Lead Created')}
              className={`p-2 rounded text-xs   flex items-center gap-1 transition ${activeFilter === 'Lead Created' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Star size={14} /> Leads
            </button>
            <button
              onClick={() => setActiveFilter('Estimation Created')}
              className={`p-2 rounded text-xs   flex items-center gap-1 transition ${activeFilter === 'Estimation Created' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Calculator size={14} /> Estimations
            </button>
            <button
              onClick={() => setActiveFilter('Proposal Sent')}
              className={`p-2 rounded text-xs   flex items-center gap-1 transition ${activeFilter === 'Proposal Sent' ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <FileText size={14} /> Proposals
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
            <div className="relative">
              <button className="flex items-center gap-2 p-2 text-gray-700 hover:bg-gray-100 rounded  text-sm  ">
                Sort By ▼
              </button>
            </div>

            <button className="p-2 text-white  hover:bg-blue-50 rounded  text-sm  ">
              Manage Columns
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded   overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-5 text-left">
                  <input
                    type="checkbox"
                    checked={selectedActivities.length === paginatedActivities.length && paginatedActivities.length > 0}
                    onChange={toggleAllActivities}
                    className="rounded cursor-pointer"
                  />
                </th>
                <th className="px-6 py-5 text-left text-xs  text-gray-900 ">Title</th>
                <th className="px-6 py-5 text-left text-xs  text-gray-900 ">Type</th>
                <th className="px-6 py-5 text-left text-xs  text-gray-900 ">Source</th>
                <th className="px-6 py-5 text-left text-xs  text-gray-900 ">Due Date</th>
                <th className="px-6 py-5 text-left text-xs  text-gray-900 ">Owner</th>
                <th className="px-6 py-5 text-left text-xs  text-gray-900 ">Created At</th>
                <th className="px-6 py-5 text-left text-xs  text-gray-900 ">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedActivities.length > 0 ? (
                paginatedActivities.map((activity) => {
                  const activityColor = getActivityTypeColor(activity.type, activity.activitySource);
                  return (
                    <tr key={activity.uniqueId} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-5">
                        <input
                          type="checkbox"
                          checked={selectedActivities.includes(activity.uniqueId)}
                          onChange={() => toggleActivitySelection(activity.uniqueId)}
                          className="rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600 max-w-xs truncate">
                        <div className="flex flex-col">
                          <span>{activity.title}</span>
                          {activity.meeting_link && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Always use internal video call page for recording and AI analysis
                                let code = activity.meeting_link;
                                if (activity.meeting_link?.includes('meet.google.com/')) {
                                  code = activity.meeting_link.split('meet.google.com/').pop().split('?')[0];
                                } else if (activity.meeting_link?.includes('zoom.us/')) {
                                  code = activity.meeting_link.split('/').pop().split('?')[0];
                                } else if (activity.meeting_link?.includes('/')) {
                                  code = activity.meeting_link.split('/').pop();
                                }
                                navigate(`/video-call/${code || activity.id}`);
                              }}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1 w-fit"
                              title="Join Meeting"
                            >
                              Join Meeting
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-2 p-2 rounded-full text-xs  ${activityColor.bg} ${activityColor.text}`}
                        >
                          {activity.type}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-xs text-gray-500  ">
                        {activity.activitySource || activity.type}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">{activity.dueDate}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 ${activity.ownerBg} rounded-full flex items-center justify-center text-white text-xs `}>
                            {activity.ownerInitial.substring(0, 1)}
                          </div>
                          <span className="text-sm text-gray-900  ">{activity.owner}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">{activity.createdAt}</td>
                      <td className="px-6 py-5 text-center">
                        <button className="text-[#1F2020] hover:text-gray-600 p-1">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    No activities found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="p-2 border border-gray-300 rounded  text-sm   focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded  text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`p-2 rounded  text-sm   ${currentPage === page
                  ? 'bg-red-600 text-white'
                  : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 rounded  text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivitiesPage;
