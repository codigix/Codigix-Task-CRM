import React, { useState, useEffect } from 'react';
import { Eye, Trash2, Phone, Mail, Video } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function CallHistoryPage() {
  const [callData, setCallData] = useState([]);
  const [selectedCaller, setSelectedCaller] = useState(null);
  const [sortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditMeetingModal, setShowEditMeetingModal] = useState(false);
  const [editingCallId, setEditingCallId] = useState(null);
  const [editingMeetingLink, setEditingMeetingLink] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [formData, setFormData] = useState({
    callerName: '',
    callType: 'Video Call',
    meetingLink: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    fetchCallHistory();
  }, []);

  const fetchCallHistory = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/call-history?limit=50`);
      if (!response.ok) {
        throw new Error('Failed to fetch call history');
      }
      const data = await response.json();

      const mappedData = data.map((call) => ({
        id: call.id,
        name: call.caller_name,
        email: call.caller_email || 'N/A',
        avatar: call.caller_avatar || `https://ui-avatars.com/api/?name=${call.caller_name}&background=3B82F6&color=fff`,
        phone: call.phone_number || 'N/A',
        type: call.call_direction,
        callType: call.call_type,
        duration: call.duration > 0 ? `${String(Math.floor(call.duration / 60)).padStart(2, '0')}:${String(call.duration % 60).padStart(2, '0')}` : '00:00',
        date: new Date(call.created_at).toLocaleString(),
        totalCalls: 1,
        avgCallTime: call.duration > 0 ? `${String(Math.floor(call.duration / 60)).padStart(2, '0')}:${String(call.duration % 60).padStart(2, '0')}` : '00:00',
        avgWaitTime: '00:00',
        createdAt: call.created_at,
        meetingLink: call.meeting_link
      }));

      setCallData(mappedData);
      if (mappedData.length > 0) {
        setSelectedCaller(mappedData[0]);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching call history:', err);
      setError('Failed to load call history');
      setCallData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCall = async (callId) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      const response = await fetch(`${apiUrl}/call-history/${callId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete call');
      }
      await fetchCallHistory();
    } catch (err) {
      console.error('Error deleting call:', err);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Incoming':
        return 'bg-green-50 text-green-700';
      case 'Outgoing':
        return 'bg-blue-50 text-blue-700';
      case 'Missed Call':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Incoming':
        return '↓';
      case 'Outgoing':
        return '↗';
      case 'Missed Call':
        return '✕';
      default:
        return '○';
    }
  };

  const handleJoinMeeting = (meetingLink) => {
    if (meetingLink) {
      window.open(meetingLink, '_blank');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddCall = async (e) => {
    e.preventDefault();
    if (!formData.callerName || !formData.meetingLink) {
      alert('Please fill in caller name and meeting link');
      return;
    }

    try {
      const response = await fetch(API_BASE_URL + '/call-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          caller_name: formData.callerName,
          caller_email: formData.email || null,
          phone_number: formData.phone || null,
          call_type: formData.callType,
          call_direction: 'Outgoing',
          duration: 0,
          meeting_link: formData.meetingLink,
          notes: 'Manually created call entry'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create call');
      }

      setFormData({
        callerName: '',
        callType: 'Video Call',
        meetingLink: '',
        phone: '',
        email: ''
      });
      setShowAddModal(false);
      await fetchCallHistory();
    } catch (err) {
      console.error('Error creating call:', err);
      alert('Failed to create call entry');
    }
  };

  const handleEditMeetingLink = (callId, currentLink) => {
    setEditingCallId(callId);
    setEditingMeetingLink(currentLink || '');
    setShowEditMeetingModal(true);
  };

  const handleSaveMeetingLink = async (e) => {
    e.preventDefault();
    if (!editingMeetingLink) {
      alert('Please enter a meeting link');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/call-history/${editingCallId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meeting_link: editingMeetingLink
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update meeting link');
      }

      setShowEditMeetingModal(false);
      setEditingCallId(null);
      setEditingMeetingLink('');
      await fetchCallHistory();
    } catch (err) {
      console.error('Error updating meeting link:', err);
      alert('Failed to update meeting link');
    }
  };

  const handleSaveMeetingLinkDirect = async (callId, link) => {
    try {
      const response = await fetch(`${API_BASE_URL}/call-history/${callId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meeting_link: link
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update meeting link');
      }

      await fetchCallHistory();
    } catch (err) {
      console.error('Error updating meeting link:', err);
      alert('Failed to update meeting link');
    }
  };

  return (
    <div className="w-full h-[calc(100vh-80px)] bg-white flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col p-2 overflow-hidden relative">
        {/* Show Sidebar Toggle */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-2 right-4 p-2 bg-blue-500 hover:bg-red-600 text-white rounded text-xs   z-40"
            title="Show sidebar"
          >
            ▸
          </button>
        )}

        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl  text-gray-900">Call History</h1>
              <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                <span>Home</span>
                <span>/</span>
                <span>Applications</span>
                <span>/</span>
                <span className="text-gray-900 ">Call History</span>
              </div>
            </div>
            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                title="Hide sidebar"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-gray-200 rounded  bg-white text-xs text-gray-600 hover:bg-gray-50 cursor-pointer whitespace-nowrap">
              📅 27 Nov 25 - 27 Nov 25
            </div>
            <div className="relative">
              <button className="p-2 border border-gray-200 rounded  bg-white text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap">
                📊 Sort By : {sortBy === 'newest' ? 'Newest' : 'Oldest'}
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2  bg-blue-500 hover:bg-red-600 text-white rounded  text-xs   transition-colors whitespace-nowrap">
            + Add Call
          </button>
        </div>

        {/* Table Container */}
        <div className="flex-1 bg-white border border-gray-200 rounded  overflow-hidden  flex flex-col">
          {loading ? (
            <div className="p-6 text-center text-gray-600">Loading call history...</div>
          ) : error ? (
            <div className="p-6 text-center text-red ">{error}</div>
          ) : (
            <div className="overflow-x-auto flex-1 flex flex-col">
              <table className="w-full text-xs ">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">
                      <input type="checkbox" className="w-4 h-4 rounded" />
                    </th>
                    <th className="p-2 text-left text-xs  text-gray-600  whitespace-nowrap">Name</th>
                    <th className="p-2 text-left text-xs  text-gray-600  whitespace-nowrap">Call Type</th>
                    <th className="p-2 text-left text-xs  text-gray-600  whitespace-nowrap">Direction</th>
                    <th className="p-2 text-left text-xs  text-gray-600  whitespace-nowrap">Details</th>
                    <th className="p-2 text-left text-xs  text-gray-600  whitespace-nowrap">Date & Time</th>
                    <th className="p-2 text-left text-xs  text-gray-600  whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="overflow-y-auto">
                  {callData.length > 0 ? (
                    callData.map((call) => (
                      <tr key={call.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedCaller(call)}>
                        <td className="p-2">
                          <input type="checkbox" className="w-4 h-4 rounded" />
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <img src={call.avatar} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt={call.name} />
                            <div className="min-w-0">
                              <p className=" text-gray-900 text-xs truncate">{call.name}</p>
                              <p className="text-xs text-gray-500 truncate">{call.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 text-xs text-gray-600 whitespace-nowrap">{call.phone}</td>
                        <td className="p-2">
                          <span className={`p-1  rounded-full text-xs  inline-flex items-center gap-1 ${call.callType === 'Video Call' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {call.callType === 'Video Call' ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                            <span className="hidden sm:inline">{call.callType}</span>
                          </span>
                        </td>
                        <td className="p-2">
                          <span className={`p-1  rounded-full text-xs  inline-flex items-center gap-1 ${getTypeColor(call.type)}`}>
                            {getTypeIcon(call.type)}
                            <span className="hidden sm:inline">{call.type}</span>
                          </span>
                        </td>
                        <td className="p-2">
                          {call.callType === 'Audio Call' ? (
                            <div className="flex items-center gap-1 group">
                              <span className="text-gray-700 text-xs ">
                                {call.phone}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(call.phone);
                                }}
                                className="p-1 hover:bg-gray-200 rounded text-[#1F2020] hover:text-white  flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Copy phone number"
                              >
                                📋
                              </button>
                            </div>
                          ) : (
                            <>
                              {call.meetingLink ? (
                                <div className="flex items-center gap-1 group">
                                  <a
                                    href={call.meetingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-white  hover:text-blue-700 hover:underline text-xs  truncate max-w-xs"
                                    title={call.meetingLink}
                                  >
                                    {call.meetingLink.replace('https://meet.google.com/', 'meet.google.com/').replace('https://zoom.us/', 'zoom.us/')}
                                  </a>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditMeetingLink(call.id, call.meetingLink);
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded text-[#1F2020] hover:text-white  flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Edit meeting link"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPendingDeleteId(call.id);
                                      setShowConfirmDelete(true);
                                    }}
                                    className="p-1 hover:bg-red-100 rounded text-[#1F2020] hover:text-red  flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remove meeting link"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditMeetingLink(call.id, '');
                                  }}
                                  className="text-white  hover:text-blue-700 hover:underline text-xs  whitespace-nowrap"
                                >
                                  Add Link
                                </button>
                              )}
                            </>
                          )}
                        </td>
                        <td className="p-2 text-xs text-gray-600 whitespace-nowrap">{call.date}</td>
                        <td className="p-2 flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setSelectedCaller(call); }} className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600 hover:text-white  flex-shrink-0" title="View details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteCall(call.id); }} className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600 hover:text-red  flex-shrink-0" title="Delete call">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-4 py-12 text-center text-gray-500 text-xs ">
                        No call history found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar - Caller Details */}
      {sidebarOpen && selectedCaller && (
        <div className="w-80 bg-gray-50 border-l border-gray-200 p-2 overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg  text-gray-900">Caller Details</h3>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700 text-lg"
              title="Hide sidebar"
            >
              ✕
            </button>
          </div>

          {/* Caller Card */}
          <div className="bg-white rounded  p-2 border border-gray-200 mb-4">
            <div className="flex justify-center mb-4">
              <img src={selectedCaller.avatar} className="w-20 h-20 rounded-full object-cover" alt={selectedCaller.name} />
            </div>
            <h4 className="text-center  text-gray-900 mb-6 text-lg">{selectedCaller.name}</h4>

            <div className="space-y-3 text-xs ">
              <div>
                <label className="text-xs  text-gray-500 ">Call Type</label>
                <p className=" text-gray-900">{selectedCaller.callType}</p>
              </div>
              <div>
                <label className="text-xs  text-gray-500 ">Direction</label>
                <p className=" text-gray-900">{selectedCaller.type}</p>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className=" text-gray-900">{selectedCaller.phone}</p>
                </div>
              </div>
              <div>
                <label className="text-xs  text-gray-500 ">Duration</label>
                <p className="text-lg  text-gray-900">{selectedCaller.duration}</p>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className=" text-gray-900 text-xs truncate">{selectedCaller.email}</p>
                </div>
              </div>
              <div>
                <label className="text-xs  text-gray-500 ">Call Date</label>
                <p className="text-xs  text-gray-900">{selectedCaller.date}</p>
              </div>
              {selectedCaller.meetingLink && (
                <div>
                  <label className="text-xs  text-gray-500 ">Meeting Link</label>
                  <p className="text-xs font-mono text-white  break-all truncate">{selectedCaller.meetingLink}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 mt-auto pt-4">
            {selectedCaller.meetingLink && (
              <button
                onClick={() => handleJoinMeeting(selectedCaller.meetingLink)}
                className="w-full p-2  bg-indigo-500 hover:bg-indigo-600 text-white rounded   text-xs  transition-colors">
                Join Meeting
              </button>
            )}
            <div className="flex gap-2">
              <button className="flex-1 p-2  bg-blue-500 hover:bg-red-600 text-white rounded   text-xs  transition-colors">
                Video Call
              </button>
              <button className="flex-1 p-2  bg-green-500 hover:bg-green-600 text-white rounded   text-xs  transition-colors">
                Audio Call
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded  shadow-lg w-96 p-2">
            <h2 className="text-xl  text-gray-900 mb-4">Add New Call</h2>

            <form onSubmit={handleAddCall} className="space-y-4">
              <div>
                <label className="block text-xs   text-gray-700 mb-1">Caller Name *</label>
                <input
                  type="text"
                  name="callerName"
                  value={formData.callerName}
                  onChange={handleInputChange}
                  placeholder="Enter caller name"
                  className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs   text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email (optional)"
                  className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs   text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter phone (optional)"
                  className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs   text-gray-700 mb-1">Call Type</label>
                <select
                  name="callType"
                  value={formData.callType}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:border-blue-500"
                >
                  <option value="Video Call">Video Call</option>
                  <option value="Audio Call">Audio Call</option>
                </select>
              </div>

              <div>
                <label className="block text-xs   text-gray-700 mb-1">Meeting Link *</label>
                <input
                  type="url"
                  name="meetingLink"
                  value={formData.meetingLink}
                  onChange={handleInputChange}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 p-2  border border-gray-300 text-gray-700 rounded   hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 p-2  bg-blue-500 hover:bg-red-600 text-white rounded   transition-colors"
                >
                  Add Call
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditMeetingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded  shadow-lg w-96 p-2">
            <h2 className="text-xl  text-gray-900 mb-4">Edit Meeting Link</h2>

            <form onSubmit={handleSaveMeetingLink} className="space-y-4">
              <div>
                <label className="block text-xs   text-gray-700 mb-1">Meeting Link *</label>
                <input
                  type="url"
                  value={editingMeetingLink}
                  onChange={(e) => setEditingMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/abc-defg-hij or https://zoom.us/j/..."
                  className="w-full p-2 border border-gray-300 rounded  focus:outline-none focus:border-blue-500"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">Paste your Google Meet or Zoom link</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditMeetingModal(false);
                    setEditingCallId(null);
                    setEditingMeetingLink('');
                  }}
                  className="flex-1 p-2  border border-gray-300 text-gray-700 rounded   hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                {editingMeetingLink && (
                  <button
                    type="button"
                    onClick={() => {
                      setPendingDeleteId(editingCallId);
                      setShowConfirmDelete(true);
                    }}
                    className="p-2  border border-red-300 text-red  rounded   hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 p-2  bg-blue-500 hover:bg-red-600 text-white rounded   transition-colors"
                >
                  Save Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded  shadow-lg w-80 p-2">
            <h2 className="text-lg  text-gray-900 mb-3">Remove Meeting Link?</h2>
            <p className="text-xs  text-gray-600 mb-6">Are you sure you want to remove this meeting link?</p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmDelete(false);
                  setPendingDeleteId(null);
                }}
                className="flex-1 p-2  border border-gray-300 text-gray-700 rounded   hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleSaveMeetingLinkDirect(pendingDeleteId, null);
                  setShowConfirmDelete(false);
                  setPendingDeleteId(null);
                  setShowEditMeetingModal(false);
                  setEditingCallId(null);
                  setEditingMeetingLink('');
                }}
                className="flex-1 p-2  bg-red-500 hover:bg-red-600 text-white rounded   transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
