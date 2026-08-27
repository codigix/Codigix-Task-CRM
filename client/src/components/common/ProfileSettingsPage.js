import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';
import {
  User, Mail, Phone, Lock, Bell, Shield, Camera, Edit, MoreVertical,
  Calendar, Briefcase, Users, CheckCircle, AlertCircle, Clock, AlertTriangle,
  ArrowUpRight, ArrowDownRight, RefreshCw, Key, ShieldAlert, Laptop, Globe, Eye,
  ChevronRight, LogOut, FileText, BarChart2, Check, Settings, Search, Plus,
  Download, CreditCard, ChevronLeft, Trash2, Sliders, Filter, Activity
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, Legend
} from 'recharts';
import { showSuccessToast, showInfoToast } from '../../utils/toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


// Mock Data Definitions






const attendanceLogs = [];

const getHeatmapBg = (intensity) => {
  switch (intensity) {
    case 1: return 'bg-emerald-100';
    case 2: return 'bg-emerald-300';
    case 3: return 'bg-emerald-500';
    case 4: return 'bg-emerald-700';
    default: return 'bg-gray-100';
  }
};

const ProfileSettingsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState('Profile Settings');

  // Profile settings state
  const [profile, setProfile] = useState({
    id: user?.id || 1,
    firstName: user?.first_name || user?.name?.split(' ')[0] || 'User',
    lastName: user?.last_name || user?.name?.split(' ')[1] || '',
    email: user?.email || '',
    phone: user?.phone1 || user?.phone || '',
    location: user?.location || 'Unknown',
    role: user?.role_name || user?.designation || 'Staff',
    department: user?.department || 'General',
    reportsTo: 'Admin',
    teamSize: 'N/A',
    memberSince: user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
    memberDuration: 'Active',
    tags: ['Team Member'],
    avatarUrl: user?.avatar || 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-21.jpg',
    bio: 'Professional bio not set.',
    jobTitle: user?.role_name || 'Staff',
    company: 'Enterprise'
  });

  const [editForm, setEditForm] = useState({ ...profile });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    pushNotifications: true,
    weeklyDigest: false,
    securityAlerts: true,
    marketingEmails: false,
    smsAlerts: false
  });

  const [appearanceTheme, setAppearanceTheme] = useState('light');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedTimezone, setSelectedTimezone] = useState('UTC-5 (EST)');

  // Dynamic Component States
  const [tickets, setTickets] = useState([]);
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketFilter, setTicketFilter] = useState('All');

  const [projects, setProjects] = useState([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');

  const [tasks, setTasks] = useState([]);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskSubTab, setTaskSubTab] = useState('Tasks'); // 'Tasks', 'My Tasks', 'Assigned To Me', 'Completed'
  const [taskFilter, setTaskFilter] = useState('All');

  const [attendanceDate, setAttendanceDate] = useState('20 May 2026');
  const [attendanceTab, setAttendanceTab] = useState('Daily');
  const [activitySearch, setActivitySearch] = useState('');
  const [activities, setActivities] = useState([]);

  const [invoices, setInvoices] = useState([]); // New state for invoices

  const fileInputRef = useRef(null);

  // Dynamic Chart Calculations based on fetched data
  const lineChartData = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = months.map(m => ({ name: m, Created: 0, Completed: 0, Closed: 0 }));

    tickets.forEach(t => {
      if (t.createdAt && t.createdAt !== '-') {
        const date = new Date(t.createdAt);
        const monthName = date.toLocaleString('default', { month: 'short' });
        const mData = data.find(d => d.name === monthName);
        if (mData) {
          mData.Created += 1;
          if (t.status === 'Resolved' || t.status === 'Completed' || t.status === 'In Progress') mData.Completed += 1;
          if (t.status === 'Closed') mData.Closed += 1;
        }
      }
    });
    // Return last 6-7 months with data to keep the chart clean, or just all months if needed
    return data;
  }, [tickets]);

  const categoriesData = React.useMemo(() => {
    const cats = {};
    tickets.forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + 1;
    });
    const colors = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#10B981'];
    const total = tickets.length || 1;
    const result = Object.entries(cats).map(([name, count], i) => ({
      name,
      count,
      value: Math.round((count / total) * 100),
      color: colors[i % colors.length]
    })).sort((a, b) => b.count - a.count);
    return result.length > 0 ? result : [{ name: 'None', count: 0, value: 100, color: '#E5E7EB' }];
  }, [tickets]);

  const heatmapGrid = React.useMemo(() => {
    const days = 7;
    const weeks = 13;
    const grid = Array.from({ length: days }, () => Array(weeks).fill(0));

    const now = new Date();
    activities.forEach(a => {
      const date = new Date(a.time);
      if (!isNaN(date.getTime())) {
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 91) { // 13 weeks = 91 days
          const week = 12 - Math.floor(diffDays / 7);
          const day = date.getDay(); // 0 is Sunday, we can map to rows
          if (week >= 0 && week < weeks && day >= 0 && day < days) {
            grid[day][week] += 1;
          }
        }
      }
    });

    let max = 1;
    grid.forEach(r => r.forEach(v => { if (v > max) max = v; }));

    for (let r = 0; r < days; r++) {
      for (let c = 0; c < weeks; c++) {
        const val = grid[r][c];
        grid[r][c] = val === 0 ? 0 : Math.ceil((val / max) * 4);
      }
    }
    return grid;
  }, [activities]);

  const progressData = React.useMemo(() => {
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const total = tasks.length || 1;
    const compPct = Math.round((completed / total) * 100);
    return [
      { name: 'Completed', value: compPct, color: '#10B981' },
      { name: 'Remaining', value: 100 - compPct, color: '#E5E7EB' }
    ];
  }, [tasks]);

  const slaData = React.useMemo(() => {
    const compliant = tickets.filter(t => t.priority !== 'High' || t.status === 'Closed' || t.status === 'Resolved').length;
    const total = tickets.length || 1;
    const compPct = Math.round((compliant / total) * 100);
    return [
      { name: 'Compliant', value: compPct, color: '#3B82F6' },
      { name: 'Non-compliant', value: 100 - compPct, color: '#EF4444' }
    ];
  }, [tickets]);

  useEffect(() => {
    if (user) {
      setProfile({
        id: user.id || 1,
        firstName: user.first_name || user.name?.split(' ')[0] || 'User',
        lastName: user.last_name || user.name?.split(' ')[1] || '',
        email: user.email || '',
        phone: user.phone1 || user.phone || '',
        location: user.location || 'Unknown',
        role: user.role_name || user.designation || 'Staff',
        department: user.department || 'General',
        reportsTo: 'Admin',
        teamSize: 'N/A',
        memberSince: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
        memberDuration: 'Active',
        tags: ['Team Member'],
        avatarUrl: user.avatar || 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-21.jpg',
        bio: 'Professional bio not set.',
        jobTitle: user.role_name || 'Staff',
        company: 'Enterprise'
      });
      setEditForm({
        id: user.id || 1,
        firstName: user.first_name || user.name?.split(' ')[0] || 'User',
        lastName: user.last_name || user.name?.split(' ')[1] || '',
        email: user.email || '',
        phone: user.phone1 || user.phone || '',
        location: user.location || 'Unknown',
        role: user.role_name || user.designation || 'Staff',
        department: user.department || 'General',
        reportsTo: 'Admin',
        teamSize: 'N/A',
        memberSince: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
        memberDuration: 'Active',
        tags: ['Team Member'],
        avatarUrl: user.avatar || 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-21.jpg',
        bio: 'Professional bio not set.',
        jobTitle: user.role_name || 'Staff',
        company: 'Enterprise'
      });
    }

    const fetchData = async () => {
      try {
        const [projRes, tasksRes, issuesRes, activitiesRes, invoicesRes] = await Promise.all([
          axios.get(API_BASE_URL + '/projects').catch(() => ({ data: [] })),
          axios.get(API_BASE_URL + '/tasks').catch(() => ({ data: [] })),
          axios.get(API_BASE_URL + '/it-kanban/issues').catch(() => ({ data: [] })),
          axios.get(API_BASE_URL + '/activities').catch(() => ({ data: [] })),
          axios.get(API_BASE_URL + '/invoices').catch(() => ({ data: [] }))
        ]);

        const userNameMatches = (nameField) => {
          if (!nameField || !user) return false;
          const search = nameField.toLowerCase();
          const un = (user.username || '').toLowerCase();
          const fn = (user.first_name || '').toLowerCase();
          const ln = (user.last_name || '').toLowerCase();
          const full = `${fn} ${ln}`.trim();
          
          return (un && search.includes(un)) || 
                 (full && search.includes(full)) ||
                 (fn && search.includes(fn));
        };

        setProjects(projRes.data
          .filter(p => userNameMatches(p.project_manager))
          .map(p => ({
            name: p.name || 'Unnamed Project',
            status: p.status || 'Active',
            progress: p.progress || 0,
            startDate: p.start_date ? new Date(p.start_date).toLocaleDateString() : '-',
            dueDate: p.end_date ? new Date(p.end_date).toLocaleDateString() : '-',
            manager: p.project_manager || 'Admin',
            avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-02.jpg'
        })));

        setTasks(tasksRes.data
          .filter(t => userNameMatches(t.assigned_to))
          .map(t => ({
            name: t.title || 'Unnamed Task',
            project: t.project || 'General',
            status: t.status || 'To Do',
            priority: t.priority || 'Medium',
            dueDate: t.due_date ? new Date(t.due_date).toLocaleDateString() : '-',
            assignedTo: t.assigned_to || 'Unassigned',
            avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-02.jpg'
        })));

        setTickets(issuesRes.data
          .filter(i => userNameMatches(i.assigned_to) || userNameMatches(i.reporter))
          .map(i => ({
            id: `#IT-${i.id}`,
            subject: i.title || 'No Title',
            status: i.status || 'Open',
            priority: i.priority || 'Medium',
            category: i.category || 'General',
            assignedTo: i.assigned_to || 'Unassigned',
            avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-02.jpg',
            createdAt: i.created_at ? new Date(i.created_at).toISOString() : null
        })));

        setActivities(activitiesRes.data
          .filter(a => userNameMatches(a.created_by_name) || userNameMatches(a.created_by))
          .map(a => ({
            id: a.id,
            user: a.created_by_name || a.created_by || 'System',
            action: a.action || 'performed an action',
            target: a.details || 'on a record',
            time: new Date(a.created_at).toLocaleString(),
            type: a.activity_type || 'system'
        })));

        setInvoices(invoicesRes.data
          .filter(i => userNameMatches(i.bill_to) || userNameMatches(i.created_by))
          .map(i => ({
            id: i.invoice_number || `INV-${i.id}`,
            date: i.invoice_date ? new Date(i.invoice_date).toLocaleDateString() : '-',
            amount: `$${parseFloat(i.amount || 0).toFixed(2)}`,
            status: i.status || 'Draft',
            client: i.bill_to || 'Unknown Client'
        })));

      } catch (err) {
        console.error('Failed to fetch profile data', err);
      }
    };
    fetchData();
  }, [user]);

  // Forms / Actions
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      if (user && user.id) {
        await axios.put(`${API_BASE_URL}/users/${user.id}`, {
          ...user,
          first_name: editForm.firstName,
          last_name: editForm.lastName,
          email: editForm.email,
          phone1: editForm.phone,
          location: editForm.location,
          department: editForm.department,
          avatar: editForm.avatarUrl
        });
      }
      setProfile({
        ...profile,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phone: editForm.phone,
        location: editForm.location,
        bio: editForm.bio,
        jobTitle: editForm.jobTitle,
        department: editForm.department
      });
      showSuccessToast('Profile details updated successfully!');
      setActiveTab('Overview');
    } catch (err) {
      console.error('Failed to update profile', err);
      showSuccessToast('Failed to update profile!');
    }
  };

  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showSuccessToast('Passwords do not match');
      return;
    }
    showSuccessToast('Password updated successfully!');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfile(prev => ({ ...prev, avatarUrl: event.target.result }));
        setEditForm(prev => ({ ...prev, avatarUrl: event.target.result }));
        showSuccessToast('Avatar updated successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerPhotoUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCreateMockTicket = () => {
    const nextId = `#IT-${1250 + tickets.length + 1}`;
    const newTick = {
      id: nextId,
      subject: `New reported ticket issue ${tickets.length + 1}`,
      status: 'Open',
      priority: 'Medium',
      category: 'Support',
      assignedTo: 'You',
      avatar: profile.avatarUrl,
      createdAt: '20 May 2026'
    };
    setTickets([newTick, ...tickets]);
    showSuccessToast(`Created ticket ${nextId}`);
  };

  const handleCreateMockProject = () => {
    const newProj = {
      name: `New CRM Feature Project ${projects.length + 1}`,
      status: 'In Progress',
      progress: 10,
      startDate: '20 May 2026',
      dueDate: '31 Dec 2026',
      manager: 'You',
      avatar: profile.avatarUrl
    };
    setProjects([newProj, ...projects]);
    showSuccessToast('Created new CRM project!');
  };

  const handleCreateMockTask = () => {
    const newTask = {
      name: `Mock Task - Setup milestone ${tasks.length + 1}`,
      project: 'CRM Integration',
      status: 'To Do',
      priority: 'Medium',
      dueDate: '25 May 2026',
      assignedTo: 'You',
      avatar: profile.avatarUrl
    };
    setTasks([newTask, ...tasks]);
    showSuccessToast('Task added to your list!');
  };

  const handleDayShift = (direction) => {
    const days = ['18 May 2026', '19 May 2026', '20 May 2026', '21 May 2026'];
    let index = days.indexOf(attendanceDate);
    if (direction === 'left' && index > 0) {
      setAttendanceDate(days[index - 1]);
    } else if (direction === 'right' && index < days.length - 1) {
      setAttendanceDate(days[index + 1]);
    }
  };

  return (
    <div className="w-full bg-[#f8f9fc] min-h-screen p-4 font-sans text-gray-800">

      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Main Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2 border-b border-gray-150 pb-4">
        <div>
          <h1 className="text-2xl  text-gray-900 tracking-tight flex items-center gap-2">
            <Settings className="text-red-600" size={24} />
            <span>Profile Settings</span>
          </h1>
          <p className="text-sm text-gray-550 mt-0.5">Manage your workspace parameters, checklists, activity history and profile preferences</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditForm({ ...profile });
              setActiveTab('Settings');
              setActiveSettingsSubTab('Profile Settings');
            }}
            className="flex items-center gap-2 p-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm  rounded  transition"
          >
            <Edit size={16} />
            <span>Edit Profile</span>
          </button>
          <button
            onClick={handleCreateMockTicket}
            className="p-2 bg-red-600 hover:bg-red-700 text-white text-sm  rounded  transition"
          >
            + New Ticket
          </button>
        </div>
      </div>

      {/* Profile Summary Header Card */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-2 mb-6">

        {/* Profile Card details */}
        <div className="xl:col-span-6 bg-white border border-gray-100 rounded p-4  flex flex-col md:flex-row items-center md:items-start gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner flex-shrink-0">
              <img
                src={profile.avatarUrl}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=faces";
                }}
              />
            </div>
            <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full"></span>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h2 className="text-xl  text-gray-900">{profile.firstName} {profile.lastName}</h2>
              <span className="px-2.5 py-0.5 bg-red-50 text-red-600 text-xs  rounded-md border border-red-100">
                Administrator
              </span>
            </div>

            <p className="text-xs text-gray-500 mt-1 flex flex-col sm:flex-row justify-center md:justify-start items-center gap-x-3 gap-y-1">
              <span>{profile.email}</span>
              <span className="hidden sm:inline text-gray-300">•</span>
              <span>{profile.phone}</span>
              <span className="hidden sm:inline text-gray-300">•</span>
              <span>{profile.location}</span>
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 mt-3.5">
              {profile.tags.map((tag, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-gray-50 border border-gray-200 text-gray-600 text-xs rounded font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Metric Cards */}
        <div className="xl:col-span-6 grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-white border border-gray-100 rounded p-3  flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar size={16} />
              </div>
              <span className="text-xs text-gray-550   tracking-wider">Member Since</span>
            </div>
            <div className="mt-2">
              <h4 className="text-sm  text-gray-800">{profile.memberSince}</h4>
              <p className="text-xs text-gray-400 mt-0.5">{profile.memberDuration}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded p-3  flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-green-50 text-green-600 flex items-center justify-center">
                <Briefcase size={16} />
              </div>
              <span className="text-xs text-gray-555   tracking-wider">Current Role</span>
            </div>
            <div className="mt-2">
              <h4 className="text-sm  text-gray-800">{profile.role}</h4>
              <p className="text-xs text-gray-400 mt-0.5">{profile.department}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded p-3  flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <User size={16} />
              </div>
              <span className="text-xs text-gray-560   tracking-wider">Reports To</span>
            </div>
            <div className="mt-2">
              <h4 className="text-sm  text-gray-800">CTO</h4>
              <p className="text-xs text-gray-400 mt-0.5">John Smith*</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded p-3  flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users size={16} />
              </div>
              <span className="text-xs text-gray-565   tracking-wider">Team Size</span>
            </div>
            <div className="mt-2">
              <h4 className="text-sm  text-gray-800">{profile.teamSize}</h4>
              <p className="text-xs text-gray-400 mt-0.5">Active Members</p>
            </div>
          </div>
        </div>

      </div>

      {/* Tabs Navigation Bar */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto scrollbar-none flex">
        <div className="flex gap-6 whitespace-nowrap">
          {['Overview', 'Tickets', 'Projects', 'Tasks', 'Time & Attendance', 'Reports', 'Analytics', 'Settings', 'Security', 'Billing', 'Activity Log', 'GitHub Integration'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === 'Settings') setEditForm({ ...profile });
              }}
              className={`pb-3 px-1 text-xs sm:text-sm  border-b-2 transition-all ${activeTab === tab
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-550 hover:text-gray-900'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels Contents */}

      {/* 1. OVERVIEW TAB PANEL */}
      {activeTab === 'Overview' && (
        <div className="space-y-6">

          {/* Top Row: Quick KPIs stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">

            <div className="bg-white border border-gray-100 rounded p-4  flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-550   tracking-wider">Total Tickets</p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-2">{tickets.length}</h3>
                <div className="flex items-center gap-1 text-xs text-green-600  mt-1">
                  <ArrowUpRight size={12} />
                  <span>18% vs last month</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText size={18} />
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded p-4  flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-550   tracking-wider">Completed Tickets</p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-2">
                  {tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length}
                </h3>
                <div className="flex items-center gap-1 text-xs text-green-600  mt-1">
                  <ArrowUpRight size={12} />
                  <span>22% vs last month</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                <CheckCircle size={18} />
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded p-4  flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-555   tracking-wider">Open Tickets</p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-2">
                  {tickets.filter(t => t.status === 'Open').length}
                </h3>
                <div className="flex items-center gap-1 text-xs text-red-600  mt-1">
                  <ArrowDownRight size={12} />
                  <span>8% vs last month</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle size={18} />
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded p-4  flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-560   tracking-wider">In Progress</p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-2">
                  {tickets.filter(t => t.status === 'In Progress').length}
                </h3>
                <div className="flex items-center gap-1 text-xs text-green-600  mt-1">
                  <ArrowUpRight size={12} />
                  <span>5% vs last month</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={18} />
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded p-4  flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-565   tracking-wider">Overdue Tasks</p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-2">12</h3>
                <div className="flex items-center gap-1 text-xs text-red-600  mt-1">
                  <ArrowDownRight size={12} />
                  <span>15% vs last month</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded p-4  flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-570   tracking-wider">SLA Compliance</p>
                <div className="flex items-center gap-2 mt-2">
                  <h3 className="text-2xl font-extrabold text-gray-900">92%</h3>
                  <span className="text-[9px] bg-green-50 text-green-600 border border-green-150 px-1 py-0.5 rounded ">Good</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Shield size={18} />
              </div>
            </div>

          </div>

          {/* Row 2: Monthly Ticket Progress & Ticket Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">

            {/* Monthly Ticket Progress Line Chart */}
            <div className="lg:col-span-8 bg-white border border-gray-150 rounded p-2 ">
              <div className="flex items-center justify-between mb-6">
                <h3 className=" text-gray-800 text-sm sm:text-base">Monthly Ticket Progress</h3>
                <select className="px-2.5 py-1 text-xs border border-gray-200 rounded-md bg-gray-50 text-gray-600 outline-none">
                  <option>This Year</option>
                  <option>Last Year</option>
                </select>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" fontSize={11} />
                    <Line type="monotone" dataKey="Created" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Completed" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Closed" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ticket Distribution Donut Chart */}
            <div className="lg:col-span-4 bg-white border border-gray-155 rounded p-2  flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className=" text-gray-800 text-sm sm:text-base">Ticket Distribution</h3>
                  <select className="px-2 py-0.5 text-xs border border-gray-205 rounded bg-gray-50 text-gray-600 outline-none">
                    <option>This Year</option>
                    <option>This Month</option>
                  </select>
                </div>

                <div className="flex items-center justify-center h-48 relative">
                  <div className="w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoriesData}
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={55}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoriesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black text-gray-800">{tickets.length}</span>
                    <span className="text-[9px] text-gray-400   tracking-wider">Total</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-2 text-xs font-medium text-gray-655 mt-4 border-t border-gray-50 pt-4">
                  {categoriesData.map((cat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: cat.color }}></span>
                      <span className="truncate">{cat.name} ({cat.value}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Row 3: Secondary Info components */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-2">

            {/* Workload Indicator card */}
            <div className="xl:col-span-6 bg-white border border-gray-150 rounded p-2  flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className=" text-gray-800 text-sm sm:text-base">Workload Overview</h3>
                  <span className="text-xs text-gray-400">Current Assignments</span>
                </div>
                <div className="space-y-4">
                  {[
                    { name: 'You', role: profile.role, workload: (tasks.filter(t => t.assignedTo === 'You' || t.assignedTo === profile.firstName).length / (tasks.length || 1) * 100).toFixed(0), color: 'bg-blue-600', avatar: profile.avatarUrl },
                    { name: 'Emma Johnson', role: 'Project Manager', workload: 65, color: 'bg-emerald-500', avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-02.jpg' },
                    { name: 'Michael Brown', role: 'DevOps Engineer', workload: 58, color: 'bg-purple-500', avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-03.jpg' },
                    { name: 'Sophia Davis', role: 'System Analyst', workload: 42, color: 'bg-amber-500', avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-04.jpg' },
                    { name: 'Daniel Martinez', role: 'Tech Lead', workload: 27, color: 'bg-red-500', avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-07.jpg' },
                  ].map((user, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-gray-200"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs  text-gray-800 truncate">{user.name}</h4>
                          <p className="text-xs text-gray-400 truncate">{user.role}</p>
                        </div>
                        <span className="text-xs  text-gray-700">{user.workload}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${user.color} rounded-full`} style={{ width: `${user.workload}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Heatmap Contribution Matrix */}
            <div className="xl:col-span-6 bg-white border border-gray-150 rounded p-2 ">
              <h3 className=" text-gray-800 text-sm sm:text-base mb-4">Operational Activity Heatmap</h3>
              <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-2">

                {/* Days of week */}
                <div className="grid grid-rows-7 gap-y-[4px] text-[9px] text-gray-400 pr-1 mt-6">
                  <span>Mon</span>
                  <span></span>
                  <span>Wed</span>
                  <span></span>
                  <span>Fri</span>
                  <span></span>
                  <span></span>
                </div>

                {/* Contribution columns */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-[9px] text-gray-400 px-1 mb-1 ">
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                    <span>Jul</span>
                  </div>

                  <div className="flex gap-[4px]">
                    {Array.from({ length: 13 }).map((_, colIdx) => (
                      <div key={colIdx} className="grid grid-rows-7 gap-y-[4px]">
                        {Array.from({ length: 7 }).map((_, rowIdx) => {
                          const val = heatmapGrid[rowIdx][colIdx];
                          return (
                            <div
                              key={rowIdx}
                              className={`w-4 h-4 rounded-sm ${getHeatmapBg(val)} transition hover:scale-110 cursor-pointer`}
                              title={`Activity level: ${val}/4`}
                            ></div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
              <div className="flex justify-end items-center gap-1.5 mt-4 text-xs text-gray-500  pr-3">
                <span>Less</span>
                <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
                <div className="w-3 h-3 bg-emerald-100 rounded-sm"></div>
                <div className="w-3 h-3 bg-emerald-300 rounded-sm"></div>
                <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                <div className="w-3 h-3 bg-emerald-700 rounded-sm"></div>
                <span>More</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 2. TICKETS TAB PANEL */}
      {activeTab === 'Tickets' && (
        <div className="space-y-6">

          {/* Header Metric statistics cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

            <div className="bg-white border border-gray-100 rounded p-4 ">
              <span className="text-xs text-gray-400   tracking-wider">Total Tickets</span>
              <h3 className="text-2xl font-black text-gray-800 mt-1">{tickets.length}</h3>
              <p className="text-xs text-gray-400 mt-2 font-medium">Assigned in department</p>
            </div>

            <div className="bg-white border border-gray-100 rounded p-4 ">
              <span className="text-xs text-amber-500   tracking-wider">Open Tickets</span>
              <h3 className="text-2xl font-black text-amber-500 mt-1">
                {tickets.filter(t => t.status === 'Open').length}
              </h3>
              <p className="text-xs text-gray-400 mt-2 font-medium">Require immediate review</p>
            </div>

            <div className="bg-white border border-gray-100 rounded p-4 ">
              <span className="text-xs text-blue-500   tracking-wider">In Progress</span>
              <h3 className="text-2xl font-black text-blue-500 mt-1">
                {tickets.filter(t => t.status === 'In Progress').length}
              </h3>
              <p className="text-xs text-gray-400 mt-2 font-medium">Actively working on</p>
            </div>

            <div className="bg-white border border-gray-100 rounded p-4 ">
              <span className="text-xs text-green-500   tracking-wider">Resolved Tickets</span>
              <h3 className="text-2xl font-black text-green-500 mt-1">
                {tickets.filter(t => t.status === 'Resolved').length}
              </h3>
              <p className="text-xs text-gray-400 mt-2 font-medium">Waiting client approval</p>
            </div>

            <div className="bg-white border border-gray-100 rounded p-4  col-span-2 md:col-span-1">
              <span className="text-xs text-gray-500   tracking-wider">Closed Tickets</span>
              <h3 className="text-2xl font-black text-gray-500 mt-1">
                {tickets.filter(t => t.status === 'Closed').length}
              </h3>
              <p className="text-xs text-gray-400 mt-2 font-medium">Archived this sprint</p>
            </div>

          </div>

          {/* Search, Filter & New Actions toolbar */}
          <div className="bg-white p-4 rounded border border-gray-150  flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search ticket, ID or subject..."
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded text-xs sm:text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              <select
                value={ticketFilter}
                onChange={(e) => setTicketFilter(e.target.value)}
                className="p-2 border border-gray-200 rounded text-xs sm:text-sm bg-gray-50 outline-none text-gray-600 "
              >
                <option value="All">All Categories</option>
                <option value="Authentication">Authentication</option>
                <option value="Performance">Performance</option>
                <option value="Database">Database</option>
                <option value="Access">Access</option>
                <option value="Communication">Communication</option>
                <option value="Report">Report</option>
                <option value="UI/UX">UI/UX</option>
              </select>

              <button
                onClick={handleCreateMockTicket}
                className="flex items-center justify-center gap-1.5 p-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm  rounded  transition"
              >
                <Plus size={16} />
                <span>New Ticket</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-gray-150 rounded overflow-hidden ">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs sm:text-xs  text-gray-500  tracking-wider">
                    <th className="p-4">Ticket ID</th>
                    <th className="p-4">Subject</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Assigned To</th>
                    <th className="p-4">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                  {tickets
                    .filter(t => {
                      const matchesSearch = t.subject.toLowerCase().includes(ticketSearch.toLowerCase()) || t.id.toLowerCase().includes(ticketSearch.toLowerCase());
                      const matchesFilter = ticketFilter === 'All' || t.category === ticketFilter;
                      return matchesSearch && matchesFilter;
                    })
                    .map((t, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="p-4  text-blue-650 hover:underline cursor-pointer">{t.id}</td>
                        <td className="p-4  text-gray-800">{t.subject}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-xs  inline-block border ${t.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            t.status === 'Open' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              t.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                'bg-gray-50 text-gray-500 border-gray-100'
                            }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-xs  inline-block ${t.priority === 'High' ? 'bg-red-50 text-red-600' :
                            t.priority === 'Medium' ? 'bg-amber-50 text-amber-650' :
                              'bg-green-50 text-green-650'
                            }`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-4  text-gray-600">{t.category}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <img src={t.avatar} className="w-6 h-6 rounded-full object-cover border border-gray-100" alt="avatar" />
                            <span className=" text-gray-800">{t.assignedTo}</span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-500 ">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
              <span>Showing 1 to 7 of 256 entries</span>
              <div className="flex items-center gap-1 ">
                <button className="p-1 px-2 border border-gray-200 rounded hover:bg-gray-50">1</button>
                <button className="p-1 px-2 border border-red-600 bg-red-600 text-white rounded">2</button>
                <button className="p-1 px-2 border border-gray-200 rounded hover:bg-gray-50">3</button>
                <button className="p-1 px-2 border border-gray-200 rounded hover:bg-gray-50">4</button>
                <span className="px-1 text-gray-400 font-medium">...</span>
                <button className="p-1 px-2 border border-gray-200 rounded hover:bg-gray-50">37</button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 3. PROJECTS TAB PANEL */}
      {activeTab === 'Projects' && (
        <div className="space-y-6">

          {/* Metrics summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

            <div className="bg-white border border-gray-100 rounded p-4 ">
              <span className="text-xs text-gray-400   tracking-wider">Total Projects</span>
              <h3 className="text-2xl font-black text-gray-800 mt-1">{projects.length}</h3>
              <p className="text-xs text-gray-400 mt-2 font-medium">All sprints</p>
            </div>

            <div className="bg-white border border-gray-100 rounded p-4 ">
              <span className="text-xs text-blue-500   tracking-wider">Active Projects</span>
              <h3 className="text-2xl font-black text-blue-500 mt-1">
                {projects.filter(p => p.status === 'In Progress').length}
              </h3>
              <p className="text-xs text-gray-400 mt-2 font-medium">Currently building</p>
            </div>

            <div className="bg-white border border-gray-100 rounded p-4 ">
              <span className="text-xs text-green-500   tracking-wider">Completed Projects</span>
              <h3 className="text-2xl font-black text-green-500 mt-1">
                {projects.filter(p => p.status === 'Completed').length}
              </h3>
              <p className="text-xs text-gray-400 mt-2 font-medium">Delivered and signed off</p>
            </div>

            <div className="bg-white border border-gray-100 rounded p-4 ">
              <span className="text-xs text-amber-500   tracking-wider">On Hold</span>
              <h3 className="text-2xl font-black text-amber-500 mt-1">
                {projects.filter(p => p.status === 'On Hold').length}
              </h3>
              <p className="text-xs text-gray-400 mt-2 font-medium">Awaiting feedback</p>
            </div>

            <div className="bg-white border border-gray-100 rounded p-4  col-span-2 md:col-span-1">
              <span className="text-xs text-red-500   tracking-wider">Overdue</span>
              <h3 className="text-2xl font-black text-red-500 mt-1">3</h3>
              <p className="text-xs text-gray-400 mt-2 font-medium">Past target dates</p>
            </div>

          </div>

          {/* Projects Toolbar */}
          <div className="bg-white p-4 rounded border border-gray-150  flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search project..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded text-xs sm:text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end ">
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="p-2 border border-gray-200 rounded text-xs sm:text-sm bg-gray-50 outline-none text-gray-600"
              >
                <option value="All">All Statuses</option>
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>

              <button
                onClick={handleCreateMockProject}
                className="flex items-center justify-center gap-1.5 p-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm  rounded  transition"
              >
                <Plus size={16} />
                <span>New Project</span>
              </button>
            </div>
          </div>

          {/* Table list */}
          <div className="bg-white border border-gray-150 rounded overflow-hidden ">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs sm:text-xs  text-gray-500  tracking-wider">
                    <th className="p-4">Project Name</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Progress</th>
                    <th className="p-4">Start Date</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Manager</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                  {projects
                    .filter(p => {
                      const matchesSearch = p.name.toLowerCase().includes(projectSearch.toLowerCase());
                      const matchesFilter = projectFilter === 'All' || p.status === projectFilter;
                      return matchesSearch && matchesFilter;
                    })
                    .map((p, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="p-4  text-gray-900">{p.name}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-xs  border inline-block ${p.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            p.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 w-48">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${p.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                                }`} style={{ width: `${p.progress}%` }}></div>
                            </div>
                            <span className=" text-gray-600 text-xs">{p.progress}%</span>
                          </div>
                        </td>
                        <td className="p-4  text-gray-650">{p.startDate}</td>
                        <td className="p-4  text-gray-650">{p.dueDate}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <img src={p.avatar} className="w-6 h-6 rounded-full object-cover border border-gray-100" alt="avatar" />
                            <span className=" text-gray-800">{p.manager}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
              <span>Showing 1 to {projects.length} of 24 entries</span>
              <div className="flex items-center gap-1 ">
                <button className="p-1 px-2 border border-gray-200 rounded hover:bg-gray-50">1</button>
                <button className="p-1 px-2 border border-red-600 bg-red-600 text-white rounded">2</button>
                <button className="p-1 px-2 border border-gray-200 rounded hover:bg-gray-50">3</button>
                <span className="px-1 text-gray-400 font-medium">...</span>
                <button className="p-1 px-2 border border-gray-200 rounded hover:bg-gray-50">15</button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 4. TASKS TAB PANEL */}
      {activeTab === 'Tasks' && (
        <div className="space-y-6">

          {/* Sub Navigation controls */}
          <div className="border-b border-gray-150 flex gap-4">
            {['Tasks', 'My Tasks', 'Assigned To Me', 'Completed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setTaskSubTab(tab)}
                className={`pb-2.5 px-1  text-xs sm:text-sm transition-all ${taskSubTab === tab ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 border border-gray-100 rounded ">
              <span className="text-xs text-gray-400   tracking-wider">Total Tasks</span>
              <h3 className="text-2xl font-black text-gray-800 mt-1">{tasks.length}</h3>
            </div>
            <div className="bg-white p-4 border border-gray-100 rounded ">
              <span className="text-xs text-amber-550   tracking-wider">To Do</span>
              <h3 className="text-2xl font-black text-amber-550 mt-1">
                {tasks.filter(t => t.status === 'To Do').length}
              </h3>
            </div>
            <div className="bg-white p-4 border border-gray-100 rounded ">
              <span className="text-xs text-blue-500   tracking-wider">In Progress</span>
              <h3 className="text-2xl font-black text-blue-500 mt-1">
                {tasks.filter(t => t.status === 'In Progress').length}
              </h3>
            </div>
            <div className="bg-white p-4 border border-gray-100 rounded ">
              <span className="text-xs text-purple-500   tracking-wider">In Review</span>
              <h3 className="text-2xl font-black text-purple-500 mt-1">
                {tasks.filter(t => t.status === 'Review').length}
              </h3>
            </div>
            <div className="bg-white p-4 border border-gray-100 rounded  col-span-2 md:col-span-1">
              <span className="text-xs text-green-500   tracking-wider">Completed</span>
              <h3 className="text-2xl font-black text-green-500 mt-1">
                {tasks.filter(t => t.status === 'Completed').length}
              </h3>
            </div>
          </div>

          {/* Tasks Toolbar */}
          <div className="bg-white p-4 rounded border border-gray-150  flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search task..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded text-xs sm:text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end ">
              <select
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
                className="p-2 border border-gray-200 rounded text-xs sm:text-sm bg-gray-50 outline-none text-gray-600"
              >
                <option value="All">All Priorities</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>

              <button
                onClick={handleCreateMockTask}
                className="flex items-center justify-center gap-1.5 p-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm  rounded  transition"
              >
                <Plus size={16} />
                <span>New Task</span>
              </button>
            </div>
          </div>

          {/* Tasks table log */}
          <div className="bg-white border border-gray-150 rounded overflow-hidden ">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs sm:text-xs  text-gray-500  tracking-wider">
                    <th className="p-4">Task Name</th>
                    <th className="p-4">Project</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Assigned To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs sm:text-sm ">
                  {tasks
                    .filter(t => {
                      const matchesSearch = t.name.toLowerCase().includes(taskSearch.toLowerCase());
                      const matchesFilter = taskFilter === 'All' || t.priority === taskFilter;

                      // Task subtab logic filters
                      let matchesSub = true;
                      if (taskSubTab === 'My Tasks') matchesSub = t.assignedTo === 'You';
                      if (taskSubTab === 'Assigned To Me') matchesSub = t.assignedTo !== 'You';
                      if (taskSubTab === 'Completed') matchesSub = t.status === 'Completed';

                      return matchesSearch && matchesFilter && matchesSub;
                    })
                    .map((t, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="p-4  text-gray-900">{t.name}</td>
                        <td className="p-4 text-gray-500 ">{t.project}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-xs  border inline-block ${t.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            t.status === 'To Do' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              t.status === 'Review' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-xs  inline-block ${t.priority === 'High' ? 'bg-red-50 text-red-650' :
                            t.priority === 'Medium' ? 'bg-amber-50 text-amber-655' :
                              'bg-green-50 text-green-655'
                            }`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-4  text-gray-650">{t.dueDate}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <img src={t.avatar} className="w-6 h-6 rounded-full object-cover border border-gray-100" alt="avatar" />
                            <span className=" text-gray-800">{t.assignedTo}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 5. TIME & ATTENDANCE TAB PANEL */}
      {activeTab === 'Time & Attendance' && (
        <div className="space-y-6">

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

            <div className="bg-white p-4 border border-gray-100 rounded ">
              <span className="text-xs text-gray-400   tracking-wider block">Check In</span>
              <h3 className="text-base sm:text-xl font-black text-gray-800 mt-1 flex items-center gap-1.5 ">
                <Clock size={16} className="text-blue-500" />
                <span>09:02 AM</span>
              </h3>
            </div>

            <div className="bg-white p-4 border border-gray-100 rounded ">
              <span className="text-xs text-gray-400   tracking-wider block">Check Out</span>
              <h3 className="text-base sm:text-xl font-black text-gray-800 mt-1 flex items-center gap-1.5 ">
                <Clock size={16} className="text-purple-500" />
                <span>06:05 PM</span>
              </h3>
            </div>

            <div className="bg-white p-4 border border-gray-100 rounded ">
              <span className="text-xs text-gray-400   tracking-wider block">Work Hours</span>
              <h3 className="text-base sm:text-xl font-black text-gray-800 mt-1">9h 03m</h3>
            </div>

            <div className="bg-white p-4 border border-gray-100 rounded ">
              <span className="text-xs text-gray-400   tracking-wider block">Break Time</span>
              <h3 className="text-base sm:text-xl font-black text-gray-800 mt-1 text-amber-500">1h 02m</h3>
            </div>

            <div className="bg-white p-4 border border-gray-100 rounded  col-span-2 md:col-span-1">
              <span className="text-xs text-gray-400   tracking-wider block">Total (This Month)</span>
              <h3 className="text-base sm:text-xl font-black text-gray-850 mt-1">183h 25m</h3>
            </div>

          </div>

          {/* Sub menu attendance configuration */}
          <div className="border-b border-gray-150 flex gap-4">
            {['Daily', 'Weekly', 'Monthly'].map((item) => (
              <button
                key={item}
                onClick={() => setAttendanceTab(item)}
                className={`pb-2.5 px-1  text-xs sm:text-sm transition-all ${attendanceTab === item ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'
                  }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Interactive Date Switcher bar */}
          <div className="bg-white p-4 border border-gray-150 rounded flex items-center justify-between ">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDayShift('left')}
                className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm  text-gray-800 px-3">{attendanceDate}</span>
              <button
                onClick={() => handleDayShift('right')}
                className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setAttendanceDate('20 May 2026')}
                className="px-3.5 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm  rounded transition"
              >
                Today
              </button>
              <button className="flex items-center gap-1.5 px-3.5 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm  rounded transition">
                <Filter size={14} />
                <span>Filter</span>
              </button>
            </div>
          </div>

          {/* Attendance activities logs table */}
          <div className="bg-white border border-gray-150 rounded overflow-hidden ">
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-400 mb-4">
                <Clock size={24} />
              </div>
              <h3 className="text-sm font-medium text-gray-900">API Pending</h3>
              <p className="text-xs text-gray-500 mt-1">Time & Attendance backend API is currently in development.</p>
            </div>
          </div>

          {/* Productive Hours Breakdown cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-100 p-4 rounded ">
              <span className="text-xs text-gray-400  block mb-1">Total Work Hours</span>
              <span className="text-xl  text-gray-800">9h 03m</span>
            </div>
            <div className="bg-white border border-gray-100 p-4 rounded ">
              <span className="text-xs text-gray-400  block mb-1">Break Time</span>
              <span className="text-xl  text-amber-550">1h 02m</span>
            </div>
            <div className="bg-white border border-gray-100 p-4 rounded  border-l-4 border-l-green-500">
              <span className="text-xs text-green-600  block mb-1">Productive Hours</span>
              <span className="text-xl  text-green-700">8h 01m</span>
            </div>
          </div>

        </div>
      )}

      {/* 6. REPORTS TAB PANEL */}
      {activeTab === 'Reports' && (
        <div className="space-y-6">

          {/* Selection Selects Row */}
          <div className="flex items-center gap-3">
            <select className="p-2 border border-gray-200 rounded text-xs sm:text-sm  bg-white outline-none">
              <option>Monthly Report</option>
              <option>Quarterly Report</option>
              <option>Annual Report</option>
            </select>
            <select className="p-2 border border-gray-200 rounded text-xs sm:text-sm  bg-white outline-none">
              <option>May 2026</option>
              <option>June 2026</option>
              <option>April 2026</option>
            </select>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            <div className="bg-white p-4 border border-gray-100 rounded ">
              <span className="text-xs text-gray-450   tracking-wider block">Tickets Resolved</span>
              <div className="flex items-center gap-2 mt-1">
                <h3 className="text-2xl font-black text-gray-800 ">198</h3>
                <span className="text-xs text-green-650 bg-green-50 px-1 py-0.5 rounded ">▲ 22%</span>
              </div>
            </div>

            <div className="bg-white p-4 border border-gray-100 rounded ">
              <span className="text-xs text-gray-455   tracking-wider block">Avg. Resolution Time</span>
              <div className="flex items-center gap-2 mt-1 ">
                <h3 className="text-2xl font-black text-gray-800">18.6 hrs</h3>
                <span className="text-xs text-green-655 bg-green-50 px-1 py-0.5 rounded ">▼ 12%</span>
              </div>
            </div>

            <div className="bg-white p-4 border border-gray-100 rounded ">
              <span className="text-xs text-gray-460   tracking-wider block">SLA Met</span>
              <div className="flex items-center gap-2 mt-1 ">
                <h3 className="text-2xl font-black text-gray-800">92%</h3>
                <span className="text-xs text-green-655 bg-green-50 px-1 py-0.5 rounded ">▲ 8%</span>
              </div>
            </div>

            <div className="bg-white p-4 border border-gray-100 rounded ">
              <span className="text-xs text-gray-465   tracking-wider block">Customer Satisfaction</span>
              <div className="flex items-center gap-2 mt-1 ">
                <h3 className="text-2xl font-black text-gray-850">4.6 / 5</h3>
                <span className="text-xs text-red-600 bg-red-50 px-1 py-0.5 rounded ">▼ 5%</span>
              </div>
            </div>

          </div>

          {/* Bar Chart & Category Breakdown Side-By-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">

            {/* Bar Chart summary */}
            <div className="lg:col-span-8 bg-white border border-gray-150 rounded p-2 ">
              <h3 className=" text-gray-800 text-sm sm:text-base mb-6">Tickets Operational Summary</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Created', count: 256, fill: '#3B82F6' },
                    { name: 'Resolved', count: 198, fill: '#10B981' },
                    { name: 'Closed', count: 166, fill: '#8B5CF6' },
                    { name: 'Open', count: 58, fill: '#F59E0B' },
                    { name: 'In Progress', count: 34, fill: '#EF4444' }
                  ]} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} stroke="#9CA3AF" tickLine={false} />
                    <YAxis fontSize={11} stroke="#9CA3AF" tickLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {[
                        <Cell key="0" fill="#3B82F6" />,
                        <Cell key="1" fill="#10B981" />,
                        <Cell key="2" fill="#8B5CF6" />,
                        <Cell key="3" fill="#F59E0B" />,
                        <Cell key="4" fill="#EF4444" />,
                      ]}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category wise list */}
            <div className="lg:col-span-4 bg-white border border-gray-155 rounded p-2  flex flex-col justify-between">
              <div>
                <h3 className=" text-gray-800 text-sm sm:text-base mb-6">Category Wise Breakdown</h3>
                <div className="flex items-center justify-center h-48 relative">
                  <div className="w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoriesData}
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={55}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoriesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black text-gray-800">256</span>
                    <span className="text-[9px] text-gray-400   tracking-wider">Tickets</span>
                  </div>
                </div>

                <div className="space-y-2 mt-4 border-t border-gray-50 pt-4">
                  {categoriesData.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-gray-650">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: cat.color }}></span>
                        <span className="">{cat.name}</span>
                      </div>
                      <span className=" text-gray-800">{cat.value}% ({cat.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 7. ANALYTICS TAB PANEL */}
      {activeTab === 'Analytics' && (
        <div className="space-y-6">

          {/* Analytics Top side-by-side charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Performance Over Time */}
            <div className="bg-white border border-gray-150 rounded p-2 ">
              <h3 className=" text-gray-800 text-sm sm:text-base mb-6">Performance Over Time</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" fontSize={10} />
                    <Line type="monotone" dataKey="Created" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Completed" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Closed" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SLA compliance trend line chart */}
            <div className="bg-white border border-gray-150 rounded p-2 ">
              <h3 className=" text-gray-800 text-sm sm:text-base mb-6">SLA Compliance Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { name: 'Jan', compliance: 88 },
                    { name: 'Feb', compliance: 90 },
                    { name: 'Mar', compliance: 89 },
                    { name: 'Apr', compliance: 91 },
                    { name: 'May', compliance: 92 },
                    { name: 'Jun', compliance: 94 },
                  ]} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} domain={[80, 100]} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="compliance" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} name="SLA Met (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Row 2: Performing agents + Workload breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Top performing agents list */}
            <div className="bg-white border border-gray-150 rounded p-2 ">
              <h3 className=" text-gray-800 text-sm sm:text-base mb-4">Top Performing Agents</h3>
              <div className="space-y-4">
                {[
                  { name: 'Michael Brown', role: 'DevOps Engineer', performance: 94, avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-03.jpg' },
                  { name: 'Emma Johnson', role: 'Project Manager', performance: 92, avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-02.jpg' },
                  { name: 'Sophia Davis', role: 'System Analyst', performance: 85, avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-04.jpg' },
                  { name: 'Daniel Martinez', role: 'Tech Lead', performance: 80, avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-07.jpg' },
                  { name: 'Olivia Taylor', role: 'Support Specialist', performance: 85, avatar: 'https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-08.jpg' },
                ].map((agent, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <img src={agent.avatar} className="w-8 h-8 rounded-full object-cover border border-gray-100" alt="avatar" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs  mb-1">
                        <span className="text-gray-900">{agent.name}</span>
                        <span className="text-red-650">{agent.performance}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${agent.performance}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Workload Distribution donut chart */}
            <div className="bg-white border border-gray-150 rounded p-2  flex flex-col justify-between">
              <div>
                <h3 className=" text-gray-800 text-sm sm:text-base mb-4">Workload Distribution</h3>
                <div className="flex items-center justify-center h-48 relative">
                  <div className="w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'High', value: 22, color: '#EF4444' },
                            { name: 'Medium', value: 48, color: '#3B82F6' },
                            { name: 'Low', value: 30, color: '#10B981' }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={55}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          <Cell fill="#EF4444" />
                          <Cell fill="#3B82F6" />
                          <Cell fill="#10B981" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black text-gray-800">89</span>
                    <span className="text-[9px] text-gray-400   tracking-wider">Total Tasks</span>
                  </div>
                </div>

                <div className="flex justify-center items-center gap-6 mt-4 text-xs  text-gray-600 border-t border-gray-50 pt-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span>High (22%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span>Medium (48%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                    <span>Low (30%)</span>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      )}

      {/* 8. SETTINGS TAB PANEL (Multi-Sub-Tab Layout) */}
      {activeTab === 'Settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-start">

          {/* Left Sub-Tab Navigation Sidebar */}
          <div className="lg:col-span-3 bg-white border border-gray-150 rounded p-3  space-y-1">
            {[
              { id: 'Account Settings', label: 'Account Settings', icon: Settings },
              { id: 'Profile Settings', label: 'Profile Settings', icon: User },
              { id: 'Notification Settings', label: 'Notification Settings', icon: Bell },
              { id: 'Email Preferences', label: 'Email Preferences', icon: Mail },
              { id: 'Appearance', label: 'Appearance', icon: Eye },
              { id: 'Security Settings', label: 'Security Settings', icon: Shield },
              { id: 'Security Keys', label: 'Security Keys', icon: Key },
              { id: 'Language & Region', label: 'Language & Region', icon: Globe }
            ].map((subTab) => (
              <button
                key={subTab.id}
                onClick={() => {
                  setActiveSettingsSubTab(subTab.id);
                  if (subTab.id === 'Profile Settings') setEditForm({ ...profile });
                }}
                className={`w-full flex items-center gap-3 p-2.5 rounded text-xs sm:text-sm  text-left transition ${activeSettingsSubTab === subTab.id
                  ? 'bg-red-50 text-red-650 '
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <subTab.icon size={16} />
                <span>{subTab.label}</span>
              </button>
            ))}
          </div>

          {/* Right Sub-Tab Content Panel */}
          <div className="lg:col-span-9 bg-white border border-gray-150 rounded p-6 ">

            {/* SUBTAB: PROFILE SETTINGS (Matching Screen 8 exactly) */}
            {activeSettingsSubTab === 'Profile Settings' && (
              <div>
                <h2 className="text-lg  text-gray-900 mb-6">Profile Settings</h2>

                {/* Photo Upload widget */}
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 border-b border-gray-100 pb-6">
                  <div className="relative group cursor-pointer" onClick={triggerPhotoUpload}>
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                      <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute inset-0 bg-black/35 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Camera size={18} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={triggerPhotoUpload}
                      className="px-3.5 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs  rounded shadow-xs transition"
                    >
                      Change Photo
                    </button>
                    <p className="text-xs text-gray-400 mt-1 ">JPG, PNG or GIF. Max size of 2MB.</p>
                  </div>
                </div>

                {/* Form fields layout */}
                <form onSubmit={handleProfileUpdate} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2  text-xs sm:text-sm">

                    <div>
                      <label className="block text-xs text-gray-400   tracking-wider mb-2">First Name</label>
                      <input
                        type="text"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400   tracking-wider mb-2">Last Name</label>
                      <input
                        type="text"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400   tracking-wider mb-2">Department</label>
                      <input
                        type="text"
                        value={editForm.department}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400   tracking-wider mb-2">Job Title</label>
                      <input
                        type="text"
                        value={editForm.jobTitle}
                        onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-400   tracking-wider mb-2">Email Address</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400   tracking-wider mb-2">Phone Number</label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400   tracking-wider mb-2">Location</label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-400   tracking-wider mb-2">Bio</label>
                      <textarea
                        value={editForm.bio}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                        rows={3}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                      />
                    </div>

                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-50">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs sm:text-sm   transition"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SUBTAB: ACCOUNT SETTINGS */}
            {activeSettingsSubTab === 'Account Settings' && (
              <div>
                <h2 className="text-lg  text-gray-900 mb-4">Account Settings</h2>
                <p className="text-xs text-gray-500 mb-6">Manage global preferences for this workspace user account.</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <h4 className="text-sm  text-gray-800">Deactivate Account</h4>
                      <p className="text-xs text-gray-400 font-medium">Temporarily disable access to this user dashboard profile.</p>
                    </div>
                    <button className="p-2 border border-red-200 text-red-655 hover:bg-red-50 text-xs  rounded transition">
                      Deactivate
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <h4 className="text-sm  text-gray-800">Delete Permanently</h4>
                      <p className="text-xs text-gray-400 font-medium">Remove all credentials, datasets, logs, and files forever.</p>
                    </div>
                    <button className="p-2 bg-red-655 text-white hover:bg-red-700 text-xs  rounded transition">
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB: NOTIFICATION SETTINGS */}
            {activeSettingsSubTab === 'Notification Settings' && (
              <div>
                <h2 className="text-lg  text-gray-900 mb-4">Notification Settings</h2>
                <div className="space-y-4 mt-6">
                  {[
                    { key: 'emailAlerts', label: 'Email Notifications', desc: 'Send daily emails for project milestones and status tickets.' },
                    { key: 'pushNotifications', label: 'Push Notifications', desc: 'Receive instant desktop alerts when a ticket status updates.' },
                    { key: 'weeklyDigest', label: 'Weekly Summary Digest', desc: 'Receive weekly compilation of operational metrics and performance charts.' },
                    { key: 'securityAlerts', label: 'Critical Security Reports', desc: 'Receive instant alerts for logins, credential updates, or session audits.' },
                  ].map((item) => (
                    <label key={item.key} className="flex items-start justify-between p-3 border border-gray-100 rounded hover:bg-gray-50 cursor-pointer transition">
                      <div className="pr-4">
                        <span className="text-sm  text-gray-800">{item.label}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings[item.key]}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, [item.key]: e.target.checked })}
                        className="w-5 h-5 text-red-655 border-gray-300 focus:ring-red-500 rounded mt-0.5"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* SUBTAB: EMAIL PREFERENCES */}
            {activeSettingsSubTab === 'Email Preferences' && (
              <div>
                <h2 className="text-lg  text-gray-900 mb-4">Email Preferences</h2>
                <p className="text-xs text-gray-500 mb-6">Select when and how you want email messages delivered.</p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input type="radio" name="email_format" defaultChecked className="text-red-655 focus:ring-red-500 w-4.5 h-4.5" />
                    <span className="text-xs sm:text-sm text-gray-850 ">HTML Styled Emails (Recommended)</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input type="radio" name="email_format" className="text-red-655 focus:ring-red-500 w-4.5 h-4.5" />
                    <span className="text-xs sm:text-sm text-gray-850 ">Plain Text Format Only</span>
                  </label>
                </div>
              </div>
            )}

            {/* SUBTAB: APPEARANCE */}
            {activeSettingsSubTab === 'Appearance' && (
              <div>
                <h2 className="text-lg  text-gray-900 mb-4">Appearance Theme</h2>
                <p className="text-xs text-gray-500 mb-6">Customize the interface theme look and feel.</p>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'light', name: 'Light Theme', color: 'bg-white border-gray-200' },
                    { id: 'dark', name: 'Dark Theme (Sleek)', color: 'bg-gray-900 border-gray-850 text-white' },
                    { id: 'system', name: 'Sync with System', color: 'bg-gradient-to-r from-white to-gray-800 border-gray-200' }
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        setAppearanceTheme(theme.id);
                        showInfoToast(`Applied ${theme.name}`);
                      }}
                      className={`p-4 border-2 rounded text-center transition ${theme.color} ${appearanceTheme === theme.id ? 'ring-4 ring-red-100 border-red-500' : 'hover:scale-102'
                        }`}
                    >
                      <span className="text-xs ">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SUBTAB: SECURITY SETTINGS */}
            {activeSettingsSubTab === 'Security Settings' && (
              <div>
                <h2 className="text-lg  text-gray-900 mb-4">Security Settings</h2>
                <p className="text-xs text-gray-500 mb-6">Setup secure authentication checkpoints.</p>
                <div className="p-4 bg-yellow-50/50 border border-yellow-100 rounded text-xs text-yellow-800  mb-6 flex gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>Two-factor authentication is highly recommended to protect sensitive operational CRM logs.</span>
                </div>
                <button
                  onClick={() => showSuccessToast('Two-factor setup initiated!')}
                  className="p-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm  rounded transition"
                >
                  Configure 2FA Options
                </button>
              </div>
            )}

            {/* SUBTAB: SECURITY KEYS */}
            {activeSettingsSubTab === 'Security Keys' && (
              <div>
                <h2 className="text-lg  text-gray-900 mb-4">Hardware Security Keys</h2>
                <p className="text-xs text-gray-500 mb-6">Register hardware key fobs (e.g. YubiKey) for physical 2FA authorization.</p>
                <button
                  onClick={() => showInfoToast('Listening for security hardware keys...')}
                  className="p-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs sm:text-sm  rounded transition"
                >
                  Add Hardware Key
                </button>
              </div>
            )}

            {/* SUBTAB: LANGUAGE & REGION */}
            {activeSettingsSubTab === 'Language & Region' && (
              <div>
                <h2 className="text-lg  text-gray-900 mb-6">Language & Region</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs text-gray-400   tracking-wider mb-2">Display Language</label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded text-xs sm:text-sm bg-white  outline-none"
                    >
                      <option>English</option>
                      <option>Spanish (Español)</option>
                      <option>French (Français)</option>
                      <option>German (Deutsch)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400   tracking-wider mb-2">Timezone</label>
                    <select
                      value={selectedTimezone}
                      onChange={(e) => setSelectedTimezone(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded text-xs sm:text-sm bg-white  outline-none"
                    >
                      <option>UTC-5 (EST)</option>
                      <option>UTC+0 (GMT)</option>
                      <option>UTC+1 (CET)</option>
                      <option>UTC+8 (SGT)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* 9. SECURITY TAB PANEL (Dedicated Password Change) */}
      {activeTab === 'Security' && (
        <div className="max-w-4xl mx-auto space-y-6">

          <div className="bg-white border border-gray-150 rounded  p-6">
            <h2 className="text-lg  text-gray-900 mb-6 pb-4 border-b border-gray-100">Update Password</h2>

            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400   tracking-wider mb-2">Current Password</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded text-xs sm:text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition "
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400   tracking-wider mb-2">New Password</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded text-xs sm:text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition "
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400   tracking-wider mb-2">Confirm New Password</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded text-xs sm:text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition "
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 ">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setActiveTab('Overview');
                  }}
                  className="p-2 border border-gray-200 rounded text-xs sm:text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs sm:text-sm  transition"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* 2FA Card */}
            <div className="bg-white border border-gray-150 rounded p-2  flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded bg-violet-50 text-violet-650 flex items-center justify-center">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h3 className=" text-gray-800 text-sm">Two-Factor Authentication</h3>
                    <p className="text-xs text-gray-400 mt-0.5 ">Secure authentication checkpoints</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 p-3 rounded border border-gray-100 ">
                  Two-factor authentication adds an extra layer of verification to check identity prior to dashboard data downloads.
                </p>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-550 font-black">STATUS: DISABLED</span>
                <button
                  onClick={() => showSuccessToast('2FA setup active')}
                  className="px-3.5 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-655 font-black rounded text-xs border border-violet-200 transition"
                >
                  Enable 2FA
                </button>
              </div>
            </div>

            {/* Session Card */}
            <div className="bg-white border border-gray-150 rounded p-2  flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded bg-cyan-50 text-cyan-600 flex items-center justify-center">
                    <Laptop size={20} />
                  </div>
                  <div>
                    <h3 className=" text-gray-800 text-sm">Active Sessions</h3>
                    <p className="text-xs text-gray-400 mt-0.5 ">Currently logged in devices</p>
                  </div>
                </div>

                <div className="space-y-3 ">
                  <div className="flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-100 text-xs">
                    <div className="min-w-0">
                      <p className=" text-gray-800 truncate">Chrome on Windows (Current)</p>
                      <p className="text-xs text-gray-400 mt-0.5">London, UK • IP: 192.168.1.105</p>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0 mr-2"></span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded border border-gray-100 text-xs">
                    <div className="min-w-0">
                      <p className=" text-gray-800 truncate">Safari on iPhone 15 Pro</p>
                      <p className="text-xs text-gray-400 mt-0.5">London, UK • Active 2h ago</p>
                    </div>
                    <button
                      onClick={() => showSuccessToast('Revoked iPhone session')}
                      className="text-xs text-red-500  hover:underline"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => showSuccessToast('Logged out from other devices.')}
                className="mt-6 w-full text-center text-xs text-gray-500 hover:text-gray-900 border border-gray-200 py-2 rounded hover:bg-gray-50 transition "
              >
                Log Out of All Other Devices
              </button>
            </div>

          </div>

        </div>
      )}

      {/* 10. BILLING TAB PANEL */}
      {activeTab === 'Billing' && (
        <div className="space-y-6">

          {/* Plan summaries */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ">

            <div className="bg-white border border-gray-100 rounded p-4 ">
              <span className="text-xs text-gray-400   tracking-wider block">Current Plan</span>
              <h3 className="text-xl font-black text-red-655 mt-1 ">Enterprise</h3>
              <p className="text-xs text-gray-405 mt-2 font-medium">Billed annually</p>
            </div>

            <div className="bg-white border border-gray-100 rounded p-4 ">
              <span className="text-xs text-gray-400   tracking-wider block">Billing Cycle</span>
              <h3 className="text-xl font-black text-gray-800 mt-1">Monthly</h3>
              <p className="text-xs text-gray-410 mt-2 font-medium">Renewing next month</p>
            </div>

            <div className="bg-white border border-gray-100 rounded p-4 ">
              <span className="text-xs text-gray-400   tracking-wider block">Next Billing Date</span>
              <h3 className="text-xl font-black text-gray-800 mt-1">20 Jun 2026</h3>
              <p className="text-xs text-gray-415 mt-2 font-medium">Auto-renew active</p>
            </div>

            <div className="bg-white border border-gray-100 rounded p-4 ">
              <span className="text-xs text-gray-400   tracking-wider block">Amount Due</span>
              <h3 className="text-xl font-black text-gray-800 mt-1">$499.00</h3>
              <p className="text-xs text-gray-420 mt-2 font-medium">Before discounts</p>
            </div>

          </div>

          {/* Usage indicators & Payment Invoice list */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Usage limits */}
            <div className="bg-white border border-gray-150 rounded p-2 ">
              <h3 className=" text-gray-800 text-sm sm:text-base mb-5">Usage Overview</h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs  text-gray-700 mb-1">
                    <span>Users</span>
                    <span>12 / 50</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: '24%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs  text-gray-700 mb-1">
                    <span>Projects</span>
                    <span>24 / 100</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: '24%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs  text-gray-700 mb-1">
                    <span>Storage</span>
                    <span>72.2 GB / 500 GB</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: '14.4%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs  text-gray-700 mb-1">
                    <span>API Calls</span>
                    <span>12,450 / 50,000</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: '24.9%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoices list */}
            <div className="bg-white border border-gray-150 rounded p-2 ">
              <h3 className=" text-gray-800 text-sm sm:text-base mb-4">Payment History</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs sm:text-xs  text-gray-500  tracking-wider">
                      <th className="pb-3">Invoice ID</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Download</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs ">
                    {invoices.map((inv, idx) => (
                      <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                        <td className="py-3  text-gray-900">{inv.id}</td>
                        <td className="py-3 text-gray-500 ">{inv.date}</td>
                        <td className="py-3  text-gray-800">{inv.amount}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs  bg-green-50 text-green-600 border border-green-100">
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => showSuccessToast(`Downloading invoice ${inv.id}`)}
                            className="p-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition"
                          >
                            <Download size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Payment Method Details */}
          <div className="bg-white p-2 border border-gray-150 rounded  flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 bg-gray-50 border border-gray-200 rounded flex items-center justify-center text-gray-500">
                <CreditCard size={20} />
              </div>
              <div className=" text-xs sm:text-sm">
                <h4 className=" text-gray-800">Visa ending in 4242</h4>
                <p className="text-xs text-gray-400 mt-0.5 ">Expires 12/28</p>
              </div>
            </div>

            <button
              onClick={() => showInfoToast('Payment method update popup opened.')}
              className="p-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs sm:text-sm  rounded transition"
            >
              Update Payment Method
            </button>
          </div>

        </div>
      )}

      {/* 11. ACTIVITY LOG TAB PANEL */}
      {activeTab === 'Activity Log' && (
        <div className="space-y-6">

          {/* Toolbar */}
          <div className="bg-white p-4 rounded border border-gray-150  flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search activity log..."
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded text-xs sm:text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
              />
            </div>
            <button
              onClick={() => {
                showSuccessToast('Activities are auto-synced with the backend.');
              }}
              className="flex items-center justify-center gap-1.5 p-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs sm:text-sm  rounded  transition bg-white"
            >
              <RefreshCw size={14} />
              <span>Refresh Log</span>
            </button>
          </div>

          {/* Activity Logs Timeline */}
          <div className="bg-white border border-gray-150 rounded p-2 ">
            <div className="relative border-l border-gray-200 pl-6 ml-3 space-y-6">

              {activities
                .filter(act => {
                  return act.action.toLowerCase().includes(activitySearch.toLowerCase()) ||
                    act.target.toLowerCase().includes(activitySearch.toLowerCase()) ||
                    act.user.toLowerCase().includes(activitySearch.toLowerCase());
                })
                .map((act) => (
                  <div key={act.id} className="relative">

                    {/* Timeline bullet dot icon */}
                    <div className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 ">
                      {act.type === 'ticket' && <FileText size={12} className="text-blue-500" />}
                      {act.type === 'project' && <Briefcase size={12} className="text-emerald-500" />}
                      {act.type === 'code' && <Activity size={12} className="text-indigo-500" />}
                      {act.type === 'deployment' && <Globe size={12} className="text-purple-500" />}
                      {act.type === 'login' && <Laptop size={12} className="text-cyan-500" />}
                      {act.type === 'task' && <CheckCircle size={12} className="text-amber-500" />}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                        <p className=" text-gray-800">
                          <span className="text-red-655 ">{act.user}</span>{' '}
                          <span className="text-gray-500 ">{act.action}</span>{' '}
                          <span className="text-gray-900 ">{act.target}</span>
                        </p>
                        <span className="text-gray-400 text-xs ">{act.time}</span>
                      </div>
                    </div>

                  </div>
                ))}

            </div>
          </div>

        </div>
      )}

      {/* 12. GITHUB INTEGRATION TAB PANEL */}
      {activeTab === 'GitHub Integration' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg  text-gray-900 flex items-center gap-2">
                <Globe size={20} className="text-gray-700" />
                GitHub Webhook Configuration
              </h2>
              <p className="text-xs text-gray-500 mt-1">Connect your CRM tasks and Kanban board with your GitHub repositories.</p>
            </div>
          </div>

          <div className="bg-white border border-gray-150 rounded p-6 ">
            <h3 className="text-sm  text-gray-900 mb-3">How it works</h3>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              When a developer pushes a commit or creates a Pull Request, GitHub will send a payload to this CRM.
              If the commit message or PR title contains a Task Key (e.g., <strong>WR-114</strong>), the CRM will automatically link the commit to that specific task in the Kanban board.
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Your Webhook Payload URL</label>
                <div className="flex">
                  <input
                    type="text"
                    readOnly
                    value="http://your-ngrok-url.com/api/github/webhook"
                    className="flex-1 border border-gray-300 rounded-l p-2 text-xs bg-gray-50 text-gray-600 outline-none"
                  />
                  <button className="bg-blue-600 text-white p-2 text-xs rounded-r font-medium hover:bg-blue-700 transition">
                    Copy URL
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Replace `your-ngrok-url.com` with your actual public tunneling domain when testing locally.</p>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-4 rounded text-xs text-blue-800">
                <p className=" mb-1">GitHub Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to your GitHub Repository <strong>Settings &gt; Webhooks</strong>.</li>
                  <li>Click <strong>Add webhook</strong>.</li>
                  <li>Paste the Payload URL from above.</li>
                  <li>Change Content type to <strong>application/json</strong>.</li>
                  <li>Select <strong>Let me select individual events</strong>.</li>
                  <li>Check <strong>Pushes</strong> and <strong>Pull requests</strong>.</li>
                  <li>Click <strong>Add webhook</strong>.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfileSettingsPage;
