import React, { useState, useEffect } from 'react';
import { Video, Phone, MessageSquare, Mail, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { followupsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const UpcomingEvents = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const getEventIcon = (type) => {
    if (!type) return null;
    const t = type.toLowerCase();
    if (t.includes('call')) return <Phone size={10} className="inline mr-1" />;
    if (t.includes('meeting') || t.includes('video')) return <Video size={10} className="inline mr-1" />;
    if (t.includes('whatsapp') || t.includes('message')) return <MessageSquare size={10} className="inline mr-1" />;
    if (t.includes('email')) return <Mail size={10} className="inline mr-1" />;
    return null;
  };

  useEffect(() => {
    const fetchAllEvents = async () => {
      try {
        setLoading(true);
        const filters = {};
        if (user && (user.role === 'Sales Executive' || user.role === 'Sales' || user.department === 'Sales Department')) {
          const userName = user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : (user.username || user.first_name || '');
          if (userName) filters.assigned_to = userName;
        }

        const [followupData, callRes] = await Promise.all([
          followupsAPI.getAll(filters),
          fetch(`${process.env.REACT_APP_API_URL || API_BASE_URL + ''}/call-history?limit=100`)
        ]);

        const followupEvents = followupData.map((f) => ({
          id: `followup-${f.id}`,
          title: f.subject,
          date: new Date(f.scheduled_date),
          category: 'Follow-up',
          type: f.type,
          meetingLink: f.meeting_link,
          relatedName: f.related_name
        }));

        let callEvents = [];
        if (callRes.ok) {
          const callData = await callRes.json();
          callEvents = callData.map((call) => ({
            id: `call-${call.id}`,
            title: call.notes ? `${call.caller_name}: ${call.notes}` : call.caller_name || 'Call',
            date: new Date(call.created_at),
            category: call.call_type === 'Video Call' ? 'Google Meet' : call.call_type,
            type: call.call_type,
            meetingLink: call.meeting_link
          }));
        }

        const allEvents = [...followupEvents, ...callEvents];

        const now = new Date();
        // Sort by date - closest to now first
        const sortedEvents = allEvents
          .sort((a, b) => Math.abs(a.date - now) - Math.abs(b.date - now));

        setEvents(sortedEvents.slice(0, 4));
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllEvents();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-white rounded  p-4 border border-gray-100 min-h-[300px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded  p-2 border border-gray-100">
      <h3 className="text-xl font-[500] text-black mb-3">Upcoming Event</h3>
      <div className="space-y-2">
        {events.map((event) => (
          <div key={event.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
            <div className="flex items-center justify-between mb-1">
              <p className="font-[500] text-xs text-black truncate flex-1">
                {event.relatedName ? `${event.relatedName}: ` : ''}{event.title}
              </p>
              {event.meetingLink && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Always use internal video call page for recording and AI analysis
                    let code = event.meetingLink;
                    if (event.meetingLink?.includes('meet.google.com/')) {
                      code = event.meetingLink.split('meet.google.com/').pop().split('?')[0];
                    } else if (event.meetingLink?.includes('zoom.us/')) {
                      code = event.meetingLink.split('/').pop().split('?')[0];
                    } else if (event.meetingLink?.includes('/')) {
                      code = event.meetingLink.split('/').pop();
                    }
                    navigate(`/video-call/${code || event.id}`);
                  }}
                  className="text-blue-600 hover:text-blue-800 ml-2"
                  title="Join Meeting"
                >
                  <Video size={16} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {event.category}
              </span>
              <p className="text-xs text-gray-500">
                {event.date.getDate()} {months[event.date.getMonth()]}
              </p>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">No upcoming events</p>
        )}
      </div>
    </div>
  );
};

export default UpcomingEvents;
