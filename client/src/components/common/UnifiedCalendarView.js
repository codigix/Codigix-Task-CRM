import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, AlertCircle, CheckCircle, Users } from 'lucide-react';

const UnifiedCalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventType, setEventType] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCalendarEvents();
  }, [currentDate]);

  const fetchCalendarEvents = async () => {
    try {
      setLoading(true);
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      // Fetch from multiple sources
      const [tasksRes, projectsRes, dealsRes, invoicesRes] = await Promise.all([
        fetch(`/api/tasks?skip=0&limit=500`),
        fetch(`/api/projects?skip=0&limit=500`),
        fetch(`/api/deals?skip=0&limit=500`),
        fetch(`/api/invoices?skip=0&limit=500`)
      ]);

      const tasks = await tasksRes.json();
      const projects = await projectsRes.json();
      const deals = await dealsRes.json();
      const invoices = await invoicesRes.json();

      // Convert to calendar events
      const allEvents = [
        ...tasks.map(t => ({
          id: `task-${t.id}`,
          title: t.title,
          date: t.due_date,
          type: 'task',
          status: t.status,
          priority: t.priority,
          icon: '✓'
        })),
        ...projects.map(p => ({
          id: `project-${p.id}`,
          title: p.name,
          date: p.due_date,
          type: 'project',
          status: p.status,
          priority: 'Medium',
          icon: '📋'
        })),
        ...deals.map(d => ({
          id: `deal-${d.id}`,
          title: d.deal_name,
          date: d.expected_close_date,
          type: 'deal',
          status: d.pipeline,
          priority: d.priority,
          icon: '💼'
        })),
        ...invoices.map(i => ({
          id: `invoice-${i.id}`,
          title: `Invoice ${i.invoice_number}`,
          date: i.open_till,
          type: 'invoice',
          status: i.status,
          priority: i.status === 'Overdue' ? 'High' : 'Medium',
          icon: '💰'
        }))
      ].filter(e => e.date);

      setEvents(allEvents);
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isSameDate = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return isSameDate(eventDate, date);
    }).filter(event => eventType === 'all' || event.type === eventType);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'task': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'project': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'deal': return 'bg-green-100 text-green-800 border-green-300';
      case 'invoice': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-red ';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded  border border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl   text-gray-900">Calendar View</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setEventType('all')}
            className={`px-3 py-1 rounded-full text-sm  transition ${
              eventType === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          {['task', 'project', 'deal', 'invoice'].map(type => (
            <button
              key={type}
              onClick={() => setEventType(type)}
              className={`px-3 py-1 rounded-full text-sm  transition ${
                eventType === type ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Month Navigation */}
          <div className="flex justify-between items-center">
            <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded ">
              <ChevronLeft size={20} />
            </button>
            <h3 className="text-lg  text-gray-800">{monthName}</h3>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded ">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day Labels */}
          <div className="grid grid-cols-7 gap-1">
            {dayLabels.map(day => (
              <div key={day} className="text-center  text-sm text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => {
              const dayEvents = date ? getEventsForDate(date) : [];
              const isToday = date && isSameDate(date, new Date());
              const isSelected = selectedDate && date && isSameDate(date, selectedDate);

              return (
                <div
                  key={index}
                  onClick={() => date && setSelectedDate(date)}
                  className={`min-h-24 p-1 rounded  border-2 cursor-pointer transition ${
                    isToday ? 'border-red-500 bg-red-50' :
                    isSelected ? 'border-blue-500 bg-blue-50' :
                    'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {date && (
                    <>
                      <div className={`text-sm  mb-1 ${isToday ? 'text-red ' : 'text-gray-700'}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            className={`text-xs px-1 py-0.5 rounded truncate ${getEventColor(event.type)}`}
                            title={event.title}
                          >
                            {event.icon} {event.priority === 'High' ? '🔴' : ''}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-gray-500 px-1">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Events */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded p-2  ">
            <h3 className=" text-gray-900 mb-3">
              {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'Select a date'}
            </h3>
            
            {selectedDate && getEventsForDate(selectedDate).length > 0 ? (
              <div className="space-y-2">
                {getEventsForDate(selectedDate).map(event => (
                  <div key={event.id} className={`p-3 rounded  border-l-4 ${getEventColor(event.type)}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className=" text-sm">{event.title}</p>
                      <span className={`text-xs  ${getPriorityColor(event.priority)}`}>
                        {event.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="capitalize p-1  bg-white rounded">
                        {event.type}
                      </span>
                      <span className="capitalize">
                        {event.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No events scheduled</p>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="bg-gray-50 rounded p-2  ">
            <h3 className=" text-gray-900 mb-3">Upcoming This Week</h3>
            <div className="space-y-2">
              {events
                .filter(event => {
                  const eventDate = new Date(event.date);
                  const today = new Date();
                  const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                  return eventDate >= today && eventDate <= weekLater;
                })
                .slice(0, 5)
                .map(event => (
                  <div key={event.id} className="text-xs p-2 bg-white rounded border border-gray-200">
                    <p className="">{event.title}</p>
                    <p className="text-gray-500">{new Date(event.date).toLocaleDateString()}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedCalendarView;
