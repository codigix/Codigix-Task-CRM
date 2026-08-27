import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, Check, Phone, Users, Flag,
  Settings, Briefcase, BookOpen, GitBranch, ClipboardList, Circle, Filter,
  List, LayoutGrid, Calendar, Clock, MapPin, User, AlignLeft, Tag, ChevronDown, Mail
} from 'lucide-react';

// ─── Event Data ───────────────────────────────────────────────────────────────
const CATEGORY_DEFS = [];

const getCat = (label) => CATEGORY_DEFS.find(c => c.label === label) || CATEGORY_DEFS[9];

// Events keyed by YYYY-MM-DD
const INITIAL_EVENTS = [];

const AVATARS = {
  'Emma Johnson': 'https://i.pravatar.cc/150?u=emma',
  'Michael Brown': 'https://i.pravatar.cc/150?u=michael',
  'Olivia Taylor': 'https://i.pravatar.cc/150?u=olivia',
  'Daniel Martinez': 'https://i.pravatar.cc/150?u=daniel',
  'Sophia Davis': 'https://i.pravatar.cc/150?u=sophia',
  'James Wilson': 'https://i.pravatar.cc/150?u=james',
};

const TODAY = new Date(2026, 6, 20); // July 20, 2026

const pad = n => String(n).padStart(2, '0');
const toKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper to generate a direct randomized meeting link
const generateRandomLink = (mode) => {
  const rand = (len) => Array.from({ length: len }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('');
  if (mode === 'google_meet') {
    const code = `${rand(3)}-${rand(4)}-${rand(3)}`;
    return `https://meet.google.com/${code}`;
  } else {
    const code = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
    return `https://zoom.us/j/${code}`;
  }
};

// Helper to build Google Calendar template URL
const getGoogleCalendarLink = (event) => {
  const dateStr = event.date.replace(/-/g, '');

  const parseTime = (timeStr) => {
    if (!timeStr) return '090000';
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return '090000';
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}${minutes}00`;
  };

  const startT = parseTime(event.startTime);
  const endT = parseTime(event.endTime);
  const dates = `${dateStr}T${startT}/${dateStr}T${endT}`;

  const absoluteMeetUrl = event.meetingLink ? `${window.location.origin}${event.meetingLink}` : '';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: dates,
    details: `${event.description || ''}${absoluteMeetUrl ? `\n\nJoin Meeting: ${absoluteMeetUrl}` : ''}`,
    location: absoluteMeetUrl || event.location || '',
    add: event.attendees ? event.attendees.join(',') : ''
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// Premium Pill/Tag Input for Multiple Emails
function GuestEmailsInput({ emails, onChange }) {
  const [inputValue, setInputValue] = useState('');

  const addEmail = (val) => {
    const clean = val.trim().replace(/,$/, '');
    if (!clean) return;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      if (!emails.includes(clean)) {
        onChange([...emails, clean]);
      }
      setInputValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addEmail(inputValue);
    }
  };

  const removeEmail = (indexToRemove) => {
    onChange(emails.filter((_, i) => i !== indexToRemove));
  };

  return (
    <div>
      <label className="text-xs text-gray-700  tracking-wider block mb-1.5 font-semibold">
        <User size={11} className="inline mr-1" />Guest Emails
      </label>
      <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 bg-white min-h-[42px] transition-all">
        {emails.map((email, idx) => (
          <div key={idx} className="flex items-center gap-1 bg-red-55 border border-red-100 text-red-700 rounded-full px-2.5 py-0.5 text-xs">
            <span>{email}</span>
            <button
              type="button"
              onClick={() => removeEmail(idx)}
              className="text-red-400 hover:text-red-750  ml-1 focus:outline-none"
            >
              &times;
            </button>
          </div>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addEmail(inputValue)}
          placeholder={emails.length === 0 ? "Type email and press Enter or Comma..." : ""}
          className="flex-1 min-w-[120px] text-sm focus:outline-none bg-transparent py-0.5"
        />
      </div>
    </div>
  );
}

// ─── Add/Edit Event Modal ──────────────────────────────────────────────────────────
function AddEventModal({ onClose, onSave, defaultDate, eventToEdit }) {
  const [form, setForm] = useState({
    title: eventToEdit?.title || '',
    category: eventToEdit?.category || 'Team Meeting',
    date: eventToEdit?.date || defaultDate || toKey(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate()),
    startTime: eventToEdit?.startTime || '09:00 AM',
    endTime: eventToEdit?.endTime || '10:00 AM',
    eventMode: eventToEdit?.eventMode || 'online',
    onlineMode: eventToEdit?.onlineMode || 'google_meet',
    location: eventToEdit?.location || 'Google Meet',
    meetingLink: eventToEdit?.meetingLink || '',
    description: eventToEdit?.description || '',
    attendees: eventToEdit?.attendees || [],
  });

  const [loadingLink, setLoadingLink] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const updateMeetingLink = async (provider) => {
    setLoadingLink(true);
    try {
      const res = await fetch('/api/create-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      const data = await res.json();
      setForm(prev => ({
        ...prev,
        meetingLink: data.meetingLink,
        location: provider === 'google_meet' ? 'Google Meet' : 'Zoom Meet'
      }));
    } catch (e) {
      console.error(e);
      const link = generateRandomLink(provider);
      setForm(prev => ({
        ...prev,
        meetingLink: link,
        location: provider === 'google_meet' ? 'Google Meet' : 'Zoom Meet'
      }));
    } finally {
      setLoadingLink(false);
    }
  };

  useEffect(() => {
    if (form.eventMode === 'online' && !form.meetingLink) {
      updateMeetingLink(form.onlineMode);
    }
  }, [form.eventMode]);

  const handleSave = () => {
    if (!form.title.trim()) return;

    onSave({
      ...form,
      id: eventToEdit?.id || Date.now()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-[16px] text-gray-900">{eventToEdit ? 'Edit Event' : 'Add New Event'}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Fill in the details to schedule your event</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Title */}
          <div>
            <label className="text-xs text-gray-700  tracking-wider block mb-1.5">Event Title *</label>
            <input
              type="text" placeholder="e.g. Sprint Planning Meeting"
              value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full border border-gray-200 rounded p-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-gray-700  tracking-wider block mb-1.5"><Tag size={11} className="inline mr-1" />Category</label>
            <div className="relative">
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full border border-gray-200 rounded p-2.5 text-sm focus:outline-none focus:border-blue-400 appearance-none bg-white cursor-pointer">
                {CATEGORY_DEFS.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Date + Times */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-700  tracking-wider block mb-1.5"><Calendar size={11} className="inline mr-1" />Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full border border-gray-200 rounded p-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white" />
            </div>
            <div>
              <label className="text-xs text-gray-700  tracking-wider block mb-1.5"><Clock size={11} className="inline mr-1" />Start Time</label>
              <input type="time" onChange={e => {
                const [h, m] = e.target.value.split(':'); const hr = parseInt(h);
                set('startTime', `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`);
              }}
                className="w-full border border-gray-200 rounded p-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white" />
            </div>
            <div>
              <label className="text-xs text-gray-700  tracking-wider block mb-1.5"><Clock size={11} className="inline mr-1" />End Time</label>
              <input type="time" onChange={e => {
                const [h, m] = e.target.value.split(':'); const hr = parseInt(h);
                set('endTime', `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`);
              }}
                className="w-full border border-gray-200 rounded p-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white" />
            </div>
          </div>

          {/* Event Mode */}
          <div>
            <label className="text-xs text-gray-700  tracking-wider block mb-1.5 font-semibold">Event Mode</label>
            <div className="flex gap-4">
              <label className="flex items-center text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="eventMode"
                  value="online"
                  checked={form.eventMode === 'online'}
                  onChange={() => {
                    setForm(prev => ({
                      ...prev,
                      eventMode: 'online',
                      location: prev.onlineMode === 'google_meet' ? 'Google Meet' : 'Zoom Meet'
                    }));
                  }}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                Online
              </label>
              <label className="flex items-center text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="eventMode"
                  value="offline"
                  checked={form.eventMode === 'offline'}
                  onChange={() => {
                    setForm(prev => ({
                      ...prev,
                      eventMode: 'offline',
                      location: '',
                      meetingLink: ''
                    }));
                  }}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                Offline
              </label>
            </div>
          </div>

          {/* Conditional Fields based on Event Mode */}
          {form.eventMode === 'online' ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-700  tracking-wider block mb-1.5 font-semibold">Online Meeting Tool</label>
                <div className="relative">
                  <select
                    value={form.onlineMode}
                    onChange={e => {
                      const mode = e.target.value;
                      setForm(prev => ({ ...prev, onlineMode: mode }));
                      updateMeetingLink(mode);
                    }}
                    className="w-full border border-gray-200 rounded p-2.5 text-sm focus:outline-none focus:border-blue-400 appearance-none bg-white cursor-pointer"
                  >
                    <option value="google_meet">Google Meet</option>
                    <option value="zoom">Zoom Meet</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-700  tracking-wider block mb-1.5 font-semibold">Meeting Link</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={loadingLink ? 'Generating meeting link...' : form.meetingLink}
                    onChange={e => set('meetingLink', e.target.value)}
                    placeholder="Auto-generated link (or paste your own)..."
                    className="w-full border border-gray-200 rounded p-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-white text-gray-800 font-mono transition-all"
                  />
                  {loadingLink && (
                    <div className="absolute right-3 w-4 h-4 border-2 border-t-blue-500 rounded-full animate-spin"></div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs text-gray-700  tracking-wider block mb-1.5 font-semibold"><MapPin size={11} className="inline mr-1" />Location</label>
              <input
                type="text"
                placeholder="e.g. Meeting Room 2, Office, etc."
                value={form.location}
                onChange={e => set('location', e.target.value)}
                className="w-full border border-gray-200 rounded p-2.5 text-sm focus:outline-none focus:border-blue-400 transition-all"
              />
            </div>
          )}

          {/* Attendees / Guest Emails */}
          <GuestEmailsInput emails={form.attendees} onChange={val => set('attendees', val)} />

          {/* Description */}
          <div>
            <label className="text-xs text-gray-700  tracking-wider block mb-1.5"><AlignLeft size={11} className="inline mr-1" />Description</label>
            <textarea rows={3} placeholder="Brief description of the event..."
              value={form.description} onChange={e => set('description', e.target.value)}
              className="w-full border border-gray-200 rounded p-2.5 text-sm focus:outline-none focus:border-blue-400 transition-all resize-none" />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button onClick={onClose} className="p-2 text-xs text-gray-600 border border-gray-200 rounded hover:bg-white transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={loadingLink}
            className="px-5 py-2 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-1.5  disabled:opacity-50 disabled:cursor-not-allowed">
            <Check size={14} /> Save Event
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Event Detail Popup ───────────────────────────────────────────────────────
function EventDetail({ event, onClose, onEdit, onDelete, onSyncTrigger }) {
  const cat = getCat(event.category);

  const isEventOnline = event.eventMode === 'online' || !event.eventMode;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className={`px-5 py-4 ${cat.bg} border-b ${cat.border} flex items-start justify-between`}>
          <div>
            <span className={`text-xs  tracking-wider ${cat.text}`}>{event.category}</span>
            <h3 className="text-[15px] text-gray-900 mt-1">{event.title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 mt-0.5"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3 text-[12px] font-medium text-gray-600">
          <div className="flex items-center gap-2"><Calendar size={13} className="text-gray-400 shrink-0" />{event.date}</div>
          <div className="flex items-center gap-2"><Clock size={13} className="text-gray-400 shrink-0" />{event.startTime} – {event.endTime}</div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 shrink-0   text-xs">Mode:</span>
            <span className={`px-2 py-0.5 rounded text-sm font-semibold ${isEventOnline
              ? 'bg-blue-50 text-blue-700 border border-blue-100'
              : 'bg-orange-50 text-orange-700 border border-orange-100'
              }`}>
              {isEventOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin size={13} className="text-gray-400 shrink-0" />
              <span>{event.location}</span>
            </div>
          )}
          {event.meetingLink && (
            <div className="flex flex-col gap-1 bg-blue-50/50 p-2.5 rounded border border-blue-100 text-sm">
              <span className="font-semibold text-blue-700">Meeting Link:</span>
              <a
                href={event.meetingLink.startsWith('/') ? `${window.location.origin}${event.meetingLink}` : event.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline truncate "
              >
                {event.meetingLink.startsWith('/') ? `${window.location.origin}${event.meetingLink}` : event.meetingLink}
              </a>
            </div>
          )}

          {/* Add to Google Calendar Action */}
          <div className="pt-1.5">
            <button
              onClick={() => {
                window.open(getGoogleCalendarLink(event), '_blank');
                onSyncTrigger(event);
              }}
              className="flex items-center justify-center gap-2 w-full py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded text-red-700  transition-colors cursor-pointer text-center text-sm"
            >
              <Calendar size={13} className="shrink-0" />
              Add to Google Calendar (Invites Guests)
            </button>
          </div>

          {event.description && <div className="flex items-start gap-2"><AlignLeft size={13} className="text-gray-400 shrink-0 mt-0.5" />{event.description}</div>}
          {event.attendees?.length > 0 && (
            <div className="flex items-start gap-2">
              <Users size={13} className="text-gray-400 shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {event.attendees.map(a => (
                  <div key={a} className="flex items-center gap-1 bg-gray-100 rounded-full px-2.5 py-0.5">
                    {a.includes('@') ? (
                      <span className="text-gray-400 shrink-0"><Mail size={11} /></span>
                    ) : (
                      AVATARS[a] && <img src={AVATARS[a]} className="w-4 h-4 rounded-full" alt={a} />
                    )}
                    <span className="text-xs text-gray-700">{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit / Delete Buttons */}
          <div className="pt-3 border-t border-gray-100 flex gap-2">
            <button
              onClick={() => {
                onEdit(event);
                onClose();
              }}
              className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-blue-700 font-semibold transition-colors cursor-pointer text-center text-sm"
            >
              Edit Event
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this event?')) {
                  onDelete(event.id);
                  onClose();
                }
              }}
              className="flex-1 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded text-red-700 font-semibold transition-colors cursor-pointer text-center text-sm"
            >
              Delete Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sync Meeting Link Modal ──────────────────────────────────────────────────
function SyncMeetLinkModal({ event, onClose, onSync }) {
  const [linkInput, setLinkInput] = useState('');

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div>
          <h3 className="text-sm font-extrabold text-gray-900">Sync Google Meet Link</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Google Calendar has been opened in a new tab. Please save the event, copy the generated Google Meet link, and paste it below to link it back to this CRM event:
          </p>
        </div>

        <input
          type="text"
          value={linkInput}
          onChange={e => setLinkInput(e.target.value)}
          placeholder="https://meet.google.com/xxx-yyyy-zzz"
          className="w-full border border-gray-200 rounded p-2 text-xs focus:outline-none focus:border-blue-400 font-mono bg-white"
        />

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="p-2 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (linkInput.trim()) {
                onSync(event.id, linkInput.trim());
                onClose();
              }
            }}
            disabled={!linkInput.trim()}
            className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sync Link
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [viewYear, setViewYear] = useState(TODAY.getFullYear());
  const [viewMonth, setViewMonth] = useState(TODAY.getMonth());
  const [viewMode, setViewMode] = useState('Month');
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventToEdit, setEventToEdit] = useState(null);
  const [syncEvent, setSyncEvent] = useState(null);
  const [addDefaultDate, setAddDefaultDate] = useState('');
  const [activeCategories, setActiveCategories] = useState(CATEGORY_DEFS.map(c => c.label));

  const selectedEventData = useMemo(() => {
    return selectedEvent ? events.find(e => e.id === selectedEvent.id) : null;
  }, [selectedEvent, events]);

  const toggleCategory = (label) => {
    setActiveCategories(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const filteredEvents = events.filter(e => activeCategories.includes(e.category));

  const eventsByDate = useMemo(() => {
    const map = {};
    filteredEvents.forEach(ev => {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    });
    return map;
  }, [filteredEvents]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevDays = new Date(viewYear, viewMonth, 0).getDate();
    const cells = [];
    for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, curMonth: false, date: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, curMonth: true, date: toKey(viewYear, viewMonth, d) });
    while (cells.length % 7 !== 0) cells.push({ day: cells.length - (firstDay + daysInMonth) + 1, curMonth: false, date: null });
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };
  const goToday = () => { setViewMonth(TODAY.getMonth()); setViewYear(TODAY.getFullYear()); };

  const todayKey = toKey(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  const todayEvents = eventsByDate[todayKey] || [];

  const upcomingEvents = useMemo(() => {
    return filteredEvents
      .filter(e => e.date >= todayKey)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [filteredEvents, todayKey]);

  const handleSaveEvent = (savedEvent) => {
    if (eventToEdit) {
      setEvents(prev => prev.map(e => e.id === eventToEdit.id ? { ...e, ...savedEvent } : e));
      setEventToEdit(null);
    } else {
      setEvents(prev => [...prev, savedEvent]);
    }
  };

  const handleDeleteEvent = (eventId) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
  };

  const handleCellClick = (date) => {
    if (!date) return;
    setAddDefaultDate(date);
    setShowAddModal(true);
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen font-sans text-gray-900 flex" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Modals */}
      {showAddModal && (
        <AddEventModal
          onClose={() => { setShowAddModal(false); setEventToEdit(null); }}
          onSave={handleSaveEvent}
          defaultDate={addDefaultDate}
          eventToEdit={eventToEdit}
        />
      )}
      {selectedEventData && (
        <EventDetail
          event={selectedEventData}
          onClose={() => setSelectedEvent(null)}
          onEdit={(event) => {
            setEventToEdit(event);
            setShowAddModal(true);
          }}
          onDelete={handleDeleteEvent}
          onSyncTrigger={(ev) => setSyncEvent(ev)}
        />
      )}
      {syncEvent && (
        <SyncMeetLinkModal
          event={syncEvent}
          onClose={() => setSyncEvent(null)}
          onSync={(eventId, newLink) => {
            setEvents(prev => prev.map(e => e.id === eventId ? { ...e, meetingLink: newLink } : e));
          }}
        />
      )}

      {/* Left Sidebar */}
      <div className="w-[240px] shrink-0 bg-white border-r border-gray-100 p-4 space-y-6 overflow-y-auto" style={{ minHeight: '100vh' }}>

        {/* Event Categories */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs  text-gray-700  ">Event Categories</h3>
            <button onClick={() => setShowAddModal(true)} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-gray-500 transition-colors">
              <Plus size={14} />
            </button>
          </div>
          <div className="space-y-1">
            {CATEGORY_DEFS.map(cat => {
              const isActive = activeCategories.includes(cat.label);
              return (
                <button
                  key={cat.label}
                  onClick={() => toggleCategory(cat.label)}
                  className={`w-full flex items-center gap-2.5 p-2 rounded text-[12px]  transition-all text-left
                    ${isActive ? `${cat.bg} ${cat.text}` : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <cat.Icon size={13} style={{ color: isActive ? cat.color : '#94a3b8' }} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs  text-gray-700  ">Upcoming Events</h3>
            <button className="text-xs  text-blue-600 hover:text-blue-700">View All</button>
          </div>
          <div className="space-y-3">
            {upcomingEvents.map(ev => {
              const cat = getCat(ev.category);
              const d = new Date(ev.date + 'T00:00:00');
              return (
                <button key={ev.id} onClick={() => setSelectedEvent(ev)} className="w-full text-left flex gap-3 hover:bg-gray-50 rounded p-1.5 -mx-1.5 transition-colors">
                  <div className="shrink-0 text-center w-10">
                    <div className="text-[14px] font-black" style={{ color: cat.color }}>{d.getDate()}</div>
                    <div className="text-[9px]  text-gray-400 ">{MONTH_NAMES[d.getMonth()].slice(0, 3)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px]  text-gray-800 truncate">{ev.title}</p>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">{ev.startTime} – {ev.endTime}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cat.color }} />
                      <span className="text-xs " style={{ color: cat.color }}>{ev.category}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-0">

          {/* Page Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-[22px]  text-gray-900">IT Calendar</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage your schedule, events and team activities</p>
            </div>
            <button
              onClick={() => { setAddDefaultDate(todayKey); setShowAddModal(true); }}
              className="flex items-center gap-2 p-2.5 bg-red-600 text-white text-xs  rounded hover:bg-red-700 transition-colors "
            >
              <Plus size={16} /> New Event
            </button>
          </div>

          {/* Calendar Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={goToday} className="p-2 text-[12px]  border border-gray-200 rounded bg-white hover:bg-gray-50  transition-colors">Today</button>
              <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50  transition-colors text-gray-600"><ChevronLeft size={15} /></button>
              <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50  transition-colors text-gray-600"><ChevronRight size={15} /></button>
              <span className="text-[15px]  text-gray-900 ml-1">{MONTH_NAMES[viewMonth]} {viewYear}</span>
            </div>
            <div className="flex items-center gap-2">
              {['Month', 'Week', 'Day', 'List'].map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  className={`p-2 text-[12px]  rounded transition-colors border
                    ${viewMode === m ? 'bg-red-600 text-white border-red-600 ' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  {m}
                </button>
              ))}
              <button className="flex items-center gap-1.5 p-2 text-[12px]  rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-600  transition-colors ml-1">
                <Filter size={13} /> Filter
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="px-6 flex-1 overflow-y-auto pb-6">
          {viewMode === 'Month' && (
            <div className="bg-white rounded border border-gray-200  overflow-hidden">
              {/* Day Headers */}
              <div className="grid grid-cols-7 border-b border-gray-100">
                {DAY_NAMES.map(d => (
                  <div key={d} className="py-3 text-center text-xs font-extrabold text-gray-500  tracking-wider">{d}</div>
                ))}
              </div>
              {/* Day Cells */}
              <div className="grid grid-cols-7">
                {calendarDays.map((cell, idx) => {
                  const isToday = cell.date === todayKey;
                  const cellEvents = cell.date ? (eventsByDate[cell.date] || []) : [];
                  return (
                    <div
                      key={idx}
                      onClick={() => handleCellClick(cell.date)}
                      className={`min-h-[100px] p-2 border-b border-r border-gray-100 last:border-r-0 transition-colors cursor-pointer
                        ${!cell.curMonth ? 'bg-gray-50/60' : 'bg-white hover:bg-blue-50/20'}
                        ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}`}
                    >
                      <div className={`w-6 h-6 flex items-center justify-center rounded-full text-[12px]  mb-1.5 transition-colors
                        ${isToday ? 'bg-red-600 text-white ' : cell.curMonth ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300'}`}>
                        {cell.day}
                      </div>
                      <div className="space-y-0.5">
                        {cellEvents.slice(0, 2).map(ev => {
                          const cat = getCat(ev.category);
                          return (
                            <div
                              key={ev.id}
                              onClick={e => { e.stopPropagation(); setSelectedEvent(ev); }}
                              className={`px-1.5 py-0.5 rounded text-[9px]  truncate cursor-pointer hover:opacity-80 transition-opacity ${cat.bg} ${cat.text}`}
                            >
                              <span className="font-black mr-1">{ev.startTime}</span>{ev.title}
                            </div>
                          );
                        })}
                        {cellEvents.length > 2 && (
                          <div className="text-[9px]  text-gray-400 pl-1">+{cellEvents.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'List' && (
            <div className="bg-white rounded border border-gray-200  overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-[14px]  text-gray-900">Events in {MONTH_NAMES[viewMonth]} {viewYear}</h3>
              </div>
              {Object.entries(eventsByDate)
                .filter(([date]) => date.startsWith(`${viewYear}-${pad(viewMonth + 1)}`))
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, evs]) => (
                  <div key={date}>
                    <div className="p-2 bg-gray-50 border-b border-gray-100 text-xs  text-gray-500 ">
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                    {evs.map(ev => {
                      const cat = getCat(ev.category);
                      return (
                        <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                          className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex items-center gap-4 transition-colors">
                          <div className={`w-1 h-10 rounded-full shrink-0`} style={{ background: cat.color }} />
                          <div className="flex-1">
                            <p className="text-xs  text-gray-800">{ev.title}</p>
                            <p className="text-xs text-gray-500 font-medium">{ev.startTime} – {ev.endTime} {ev.location ? `• ${ev.location}` : ''}</p>
                          </div>
                          <span className={`text-xs  px-2 py-1 rounded ${cat.bg} ${cat.text}`}>{ev.category}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>
          )}

          {(viewMode === 'Week' || viewMode === 'Day') && (
            <div className="bg-white rounded border border-gray-200  p-6 flex items-center justify-center min-h-[400px]">
              <div className="text-center text-gray-400">
                <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-[14px] ">{viewMode} view — switch to Month or List</p>
              </div>
            </div>
          )}

          {/* Today's Schedule */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px]  text-gray-900">
                Today's Schedule – <span className="text-red-500">
                  {TODAY.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </h3>
              <button className="text-[12px]  text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View Full Schedule <ChevronRight size={13} />
              </button>
            </div>
            {todayEvents.length === 0 ? (
              <div className="bg-white rounded border border-gray-100  p-6 text-center text-gray-400">
                <Calendar size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs ">No events scheduled for today</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {todayEvents.map(ev => {
                  const cat = getCat(ev.category);
                  return (
                    <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                      className="bg-white rounded border border-gray-100  p-4 text-left hover:shadow-md hover:border-blue-200 transition-all group">
                      <div className={`w-8 h-8 rounded ${cat.bg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                        <cat.Icon size={16} style={{ color: cat.color }} />
                      </div>
                      <p className="text-xs  text-gray-800 mb-1 line-clamp-2">{ev.title}</p>
                      <p className="text-xs  text-gray-500 mb-1">{ev.startTime} – {ev.endTime}</p>
                      {ev.location && <p className="text-xs text-gray-400 font-medium mb-2">{ev.location}</p>}
                      <div className="flex items-center gap-1">
                        {ev.attendees.slice(0, 3).map(a => (
                          AVATARS[a] ? (
                            <img key={a} src={AVATARS[a]} className="w-5 h-5 rounded-full border border-white -ml-1 first:ml-0" alt={a} />
                          ) : null
                        ))}
                        {ev.attendees.length > 3 && (
                          <span className="text-[9px]  text-gray-400 ml-1">+{ev.attendees.length - 3}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
