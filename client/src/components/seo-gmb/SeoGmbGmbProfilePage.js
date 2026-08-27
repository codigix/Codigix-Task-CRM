import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Plus, Calendar, Download, MapPin, Building2, Globe, Phone, Clock, Image,
  Video, Star, MessageSquare, Tag, Package, BookOpen, Bookmark,
  Users, TrendingUp, ArrowUpRight, Eye, Search, Navigation, MousePointerClick,
  FileText, Settings, ChevronRight, CheckCircle, Edit3, Zap, BarChart2,
  List, Map, Heart, Award, Camera, Link2, AlertCircle, User, Share2,
} from 'lucide-react';
import SeoGmbProjectSelector from './SeoGmbProjectSelector';
import CrudTable from '../common/CrudTable';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


// ── Chart Data ─────────────────────────────────────────────────────────────
const PROFILE_TREND = [];
const TOP_ACTIONS = [];
const COMPLETENESS_ITEMS = [];

// ── Main tabs + sub-tabs ──────────────────────────────────────────────────
const MAIN_TABS = [];

// ── Column definitions ────────────────────────────────────────────────────
const COLS = {
  'Business Profiles': [{ header: 'Profile Name', accessor: 'name' }, { header: 'Location', accessor: 'location' }, { header: 'Status', accessor: 'status' }, { header: 'Rating', accessor: 'rating' }],
  'Locations': [{ header: 'Location Name', accessor: 'name' }, { header: 'Address', accessor: 'address' }, { header: 'City', accessor: 'city' }, { header: 'Status', accessor: 'status' }],
  'Business Information': [{ header: 'Field', accessor: 'field' }, { header: 'Value', accessor: 'value' }, { header: 'Last Updated', accessor: 'updated' }],
  'Categories': [{ header: 'Category Name', accessor: 'name' }, { header: 'Type', accessor: 'type' }, { header: 'Status', accessor: 'status' }],
  'Services': [{ header: 'Service Name', accessor: 'name' }, { header: 'Description', accessor: 'desc' }, { header: 'Price', accessor: 'price' }, { header: 'Status', accessor: 'status' }],
  'Products': [{ header: 'Product Name', accessor: 'name' }, { header: 'Category', accessor: 'category' }, { header: 'Price', accessor: 'price' }, { header: 'Status', accessor: 'status' }],
  'Service Areas': [{ header: 'Area Name', accessor: 'area' }, { header: 'Radius', accessor: 'radius' }, { header: 'Status', accessor: 'status' }],
  'Business Hours': [{ header: 'Day', accessor: 'day' }, { header: 'Open Time', accessor: 'open' }, { header: 'Close Time', accessor: 'close' }, { header: 'Status', accessor: 'status' }],
  'Holiday Hours': [{ header: 'Holiday', accessor: 'holiday' }, { header: 'Date', accessor: 'date' }, { header: 'Status', accessor: 'status' }],
  'Posts': [{ header: 'Title', accessor: 'title' }, { header: 'Type', accessor: 'type' }, { header: 'Published', accessor: 'published' }, { header: 'Views', accessor: 'views' }],
  'Offers': [{ header: 'Offer Title', accessor: 'title' }, { header: 'Discount', accessor: 'discount' }, { header: 'Expires', accessor: 'expires' }, { header: 'Status', accessor: 'status' }],
  'Events': [{ header: 'Event Name', accessor: 'name' }, { header: 'Date', accessor: 'date' }, { header: 'Location', accessor: 'location' }, { header: 'Status', accessor: 'status' }],
  'Updates': [{ header: 'Update Title', accessor: 'title' }, { header: 'Content', accessor: 'content' }, { header: 'Posted', accessor: 'posted' }],
  'Promotions': [{ header: 'Promotion', accessor: 'title' }, { header: 'Code', accessor: 'code' }, { header: 'Value', accessor: 'value' }, { header: 'Expires', accessor: 'expires' }],
  'Reviews': [{ header: 'Reviewer', accessor: 'reviewer' }, { header: 'Rating', accessor: 'rating' }, { header: 'Review', accessor: 'review' }, { header: 'Date', accessor: 'date' }],
  'Review Replies': [{ header: 'Reviewer', accessor: 'reviewer' }, { header: 'Review', accessor: 'review' }, { header: 'Reply', accessor: 'reply' }, { header: 'Date', accessor: 'date' }],
  'Review Templates': [{ header: 'Template Name', accessor: 'name' }, { header: 'Content', accessor: 'content' }, { header: 'For Rating', accessor: 'rating' }],
  'Review Analytics': [{ header: 'Reviewer', accessor: 'reviewer' }, { header: 'Rating', accessor: 'rating' }, { header: 'Review', accessor: 'review' }, { header: 'Date', accessor: 'date' }],
  'Questions & Answers': [{ header: 'Question', accessor: 'question' }, { header: 'Answer', accessor: 'answer' }, { header: 'Date', accessor: 'date' }],
  'Messages': [{ header: 'From', accessor: 'from' }, { header: 'Message', accessor: 'message' }, { header: 'Date', accessor: 'date' }, { header: 'Status', accessor: 'status' }],
  'Calls': [{ header: 'Caller', accessor: 'caller' }, { header: 'Duration', accessor: 'duration' }, { header: 'Date', accessor: 'date' }, { header: 'Status', accessor: 'status' }],
  'Bookings': [{ header: 'Customer', accessor: 'customer' }, { header: 'Service', accessor: 'service' }, { header: 'Date', accessor: 'date' }, { header: 'Status', accessor: 'status' }],
  'Direction Requests': [{ header: 'From Address', accessor: 'from' }, { header: 'Date', accessor: 'date' }, { header: 'Source', accessor: 'source' }],
  'Photos': [{ header: 'Photo Name', accessor: 'name' }, { header: 'Category', accessor: 'category' }, { header: 'Views', accessor: 'views' }, { header: 'Date Added', accessor: 'date' }],
  'Videos': [{ header: 'Video Title', accessor: 'title' }, { header: 'Duration', accessor: 'duration' }, { header: 'Views', accessor: 'views' }, { header: 'Date Added', accessor: 'date' }],
  'Logo & Cover Images': [{ header: 'Image Type', accessor: 'type' }, { header: 'Dimensions', accessor: 'dimensions' }, { header: 'Status', accessor: 'status' }, { header: 'Updated', accessor: 'updated' }],
  'Citation Management': [{ header: 'Directory', accessor: 'directory' }, { header: 'Status', accessor: 'status' }, { header: 'Last Checked', accessor: 'checked' }, { header: 'Score', accessor: 'score' }],
  'NAP Management': [{ header: 'Platform', accessor: 'platform' }, { header: 'Name', accessor: 'name' }, { header: 'Address', accessor: 'address' }, { header: 'Phone', accessor: 'phone' }, { header: 'Consistent', accessor: 'consistent' }],
  'Local Keywords': [{ header: 'Keyword', accessor: 'keyword' }, { header: 'Position', accessor: 'position' }, { header: 'Search Volume', accessor: 'volume' }, { header: 'Change', accessor: 'change' }],
  'Geo Rankings': [{ header: 'Keyword', accessor: 'keyword' }, { header: 'Location', accessor: 'location' }, { header: 'Rank', accessor: 'rank' }, { header: 'Change', accessor: 'change' }],
  'Local Competitors': [{ header: 'Competitor', accessor: 'name' }, { header: 'Rating', accessor: 'rating' }, { header: 'Reviews', accessor: 'reviews' }, { header: 'Distance', accessor: 'distance' }],
  'Local Backlinks': [{ header: 'Source', accessor: 'source' }, { header: 'URL', accessor: 'url' }, { header: 'DA', accessor: 'da' }, { header: 'Status', accessor: 'status' }],
};

// ── Initial Data ──────────────────────────────────────────────────────────
const INIT = {
  'Business Profiles': [{ id: 1, name: 'ABC Digital Solutions', location: 'New York, NY', status: 'Active', rating: '4.6' }, { id: 2, name: 'ABC Digital - Brooklyn', location: 'Brooklyn, NY', status: 'Active', rating: '4.4' }],
  'Locations': [{ id: 1, name: 'Main Office', address: '123 Business St', city: 'New York', status: 'Primary' }, { id: 2, name: 'Brooklyn Branch', address: '456 Park Ave', city: 'Brooklyn', status: 'Active' }],
  'Business Information': [{ id: 1, field: 'Business Name', value: 'ABC Digital Solutions', updated: 'May 1, 2026' }, { id: 2, field: 'Primary Category', value: 'Internet Marketing Service', updated: 'Apr 15, 2026' }, { id: 3, field: 'Phone', value: '+1 234-567-8900', updated: 'Mar 10, 2026' }, { id: 4, field: 'Website', value: 'https://abcdigitalsolutions.com', updated: 'Mar 10, 2026' }],
  'Categories': [{ id: 1, name: 'Internet Marketing Service', type: 'Primary', status: 'Active' }, { id: 2, name: 'SEO Agency', type: 'Secondary', status: 'Active' }, { id: 3, name: 'Digital Marketing Agency', type: 'Secondary', status: 'Active' }],
  'Services': [{ id: 1, name: 'SEO Services', desc: 'Full SEO audit and optimization', price: '$999/mo', status: 'Active' }, { id: 2, name: 'GMB Management', desc: 'Google Business Profile management', price: '$499/mo', status: 'Active' }, { id: 3, name: 'Content Marketing', desc: 'Blog and content creation', price: '$799/mo', status: 'Active' }],
  'Products': [{ id: 1, name: 'SEO Starter Package', category: 'SEO', price: '$499/mo', status: 'Active' }, { id: 2, name: 'Professional SEO Package', category: 'SEO', price: '$999/mo', status: 'Active' }, { id: 3, name: 'Local SEO Bundle', category: 'Local', price: '$699/mo', status: 'Active' }],
  'Service Areas': [{ id: 1, area: 'New York', radius: '25 miles', status: 'Active' }, { id: 2, area: 'Brooklyn', radius: '15 miles', status: 'Active' }, { id: 3, area: 'Manhattan', radius: '10 miles', status: 'Active' }],
  'Business Hours': [{ id: 1, day: 'Monday', open: '9:00 AM', close: '6:00 PM', status: 'Open' }, { id: 2, day: 'Tuesday', open: '9:00 AM', close: '6:00 PM', status: 'Open' }, { id: 3, day: 'Wednesday', open: '9:00 AM', close: '6:00 PM', status: 'Open' }, { id: 4, day: 'Thursday', open: '9:00 AM', close: '6:00 PM', status: 'Open' }, { id: 5, day: 'Friday', open: '9:00 AM', close: '5:00 PM', status: 'Open' }, { id: 6, day: 'Saturday', open: '10:00 AM', close: '3:00 PM', status: 'Open' }, { id: 7, day: 'Sunday', open: 'Closed', close: 'Closed', status: 'Closed' }],
  'Holiday Hours': [{ id: 1, holiday: "New Year's Day", date: 'Jan 1, 2026', status: 'Closed' }, { id: 2, holiday: 'Independence Day', date: 'Jul 4, 2026', status: 'Closed' }, { id: 3, holiday: 'Thanksgiving', date: 'Nov 27, 2026', status: 'Closed' }],
  'Posts': [{ id: 1, title: 'New Summer Offer!', type: 'Offer', published: 'May 15, 2026', views: '1.2K' }, { id: 2, title: "We're Hiring!", type: 'Update', published: 'May 11, 2026', views: '986' }, { id: 3, title: 'Join Our Event', type: 'Event', published: 'May 9, 2026', views: '1.3K' }, { id: 4, title: 'Limited Time Discount', type: 'Promotion', published: 'May 7, 2026', views: '1.4K' }],
  'Offers': [{ id: 1, title: 'Summer SEO Special', discount: '30% Off', expires: 'Jun 30, 2026', status: 'Active' }, { id: 2, title: 'New Client Discount', discount: '20% Off First Month', expires: 'Jul 15, 2026', status: 'Active' }],
  'Events': [{ id: 1, name: 'Free SEO Webinar', date: 'May 20, 2026', location: 'Online (Zoom)', status: 'Upcoming' }, { id: 2, name: 'Digital Marketing Summit', date: 'Jun 10, 2026', location: 'New York Convention Center', status: 'Planned' }],
  'Updates': [{ id: 1, title: 'New Service Launch', content: 'We are excited to announce our new AI-powered SEO service.', posted: 'May 12, 2026' }, { id: 2, title: 'Office Expansion', content: 'We have opened a new office in Brooklyn.', posted: 'May 5, 2026' }],
  'Promotions': [{ id: 1, title: 'Spring Sale', code: 'SPRING30', value: '30% Off', expires: 'May 31, 2026' }, { id: 2, title: 'Referral Bonus', code: 'REFER20', value: '$200 Credit', expires: 'Dec 31, 2026' }],
  'Reviews': [{ id: 1, reviewer: 'John Smith', rating: '5 ⭐⭐⭐⭐⭐', review: 'Excellent service and friendly staff. Highly recommend!', date: '2 hours ago' }, { id: 2, reviewer: 'Sarah Johnson', rating: '4 ⭐⭐⭐⭐', review: 'Great experience overall. Will definitely come back.', date: '1 day ago' }, { id: 3, reviewer: 'Mike Brown', rating: '5 ⭐⭐⭐⭐⭐', review: 'Very professional and quality work. Thank you!', date: '3 days ago' }],
  'Review Replies': [{ id: 1, reviewer: 'John Smith', review: 'Excellent service and friendly staff!', reply: 'Thank you so much for the wonderful review!', date: '2 hours ago' }, { id: 2, reviewer: 'Sarah Johnson', review: 'Great experience overall.', reply: 'Thank you for your positive feedback!', date: '1 day ago' }],
  'Review Templates': [{ id: 1, name: '5-Star Thank You', content: 'Thank you so much for the wonderful review! We appreciate your kind words.', rating: '5 Stars' }, { id: 2, name: '4-Star Response', content: 'Thank you for your positive feedback! We always strive to improve.', rating: '4 Stars' }, { id: 3, name: 'Negative Response', content: 'We are sorry to hear about your experience. Please contact us.', rating: '1-2 Stars' }],
  'Review Analytics': [{ id: 1, reviewer: 'John Smith', rating: '5 ⭐⭐⭐⭐⭐', review: 'Excellent service!', date: 'May 15, 2026' }, { id: 2, reviewer: 'Sarah Johnson', rating: '4 ⭐⭐⭐⭐', review: 'Great experience.', date: 'May 14, 2026' }],
  'Questions & Answers': [{ id: 1, question: 'What are your business hours?', answer: 'We are open Monday-Friday 9AM-6PM, Saturday 10AM-3PM.', date: 'May 10, 2026' }, { id: 2, question: 'Do you offer free consultations?', answer: 'Yes, we offer a free 30-minute consultation.', date: 'May 8, 2026' }],
  'Messages': [{ id: 1, from: 'Alice Cooper', message: 'I would like to know more about your SEO services.', date: 'May 15, 2026', status: 'Unread' }, { id: 2, from: 'Robert Davis', message: 'Can you provide a quote for local SEO?', date: 'May 14, 2026', status: 'Replied' }, { id: 3, from: 'Emma Wilson', message: 'What packages do you offer for small businesses?', date: 'May 13, 2026', status: 'Replied' }],
  'Calls': [{ id: 1, caller: '+1 212-555-0101', duration: '4m 32s', date: 'May 15, 2026', status: 'Answered' }, { id: 2, caller: '+1 718-555-0202', duration: '2m 15s', date: 'May 14, 2026', status: 'Missed' }, { id: 3, caller: '+1 646-555-0303', duration: '8m 45s', date: 'May 13, 2026', status: 'Answered' }],
  'Bookings': [{ id: 1, customer: 'James Taylor', service: 'SEO Consultation', date: 'May 20, 2026', status: 'Confirmed' }, { id: 2, customer: 'Linda Martinez', service: 'GMB Setup', date: 'May 22, 2026', status: 'Pending' }, { id: 3, customer: 'Chris Anderson', service: 'Content Strategy', date: 'May 25, 2026', status: 'Confirmed' }],
  'Direction Requests': [{ id: 1, from: 'Times Square, NY', date: 'May 15, 2026', source: 'Google Maps' }, { id: 2, from: 'JFK Airport, NY', date: 'May 14, 2026', source: 'Google Maps' }, { id: 3, from: 'Brooklyn Bridge, NY', date: 'May 13, 2026', source: 'Google Search' }],
  'Photos': [{ id: 1, name: 'Office Exterior', category: 'Exterior', views: '1.2K', date: 'May 1, 2026' }, { id: 2, name: 'Team Photo', category: 'Team', views: '986', date: 'Apr 25, 2026' }, { id: 3, name: 'Work Environment', category: 'Interior', views: '754', date: 'Apr 20, 2026' }],
  'Videos': [{ id: 1, title: 'Company Introduction', duration: '2:30', views: '2.4K', date: 'Apr 15, 2026' }, { id: 2, title: 'Client Testimonials', duration: '3:45', views: '1.8K', date: 'Apr 10, 2026' }],
  'Logo & Cover Images': [{ id: 1, type: 'Logo', dimensions: '250x250', status: 'Active', updated: 'Jan 10, 2026' }, { id: 2, type: 'Cover Image', dimensions: '1080x608', status: 'Active', updated: 'Mar 15, 2026' }],
  'Citation Management': [{ id: 1, directory: 'Google Business Profile', status: 'Consistent', checked: 'May 15, 2026', score: '100%' }, { id: 2, directory: 'Yelp', status: 'Consistent', checked: 'May 15, 2026', score: '95%' }, { id: 3, directory: 'Facebook', status: 'Inconsistent', checked: 'May 14, 2026', score: '75%' }, { id: 4, directory: 'Yellow Pages', status: 'Missing', checked: 'May 13, 2026', score: '0%' }],
  'NAP Management': [{ id: 1, platform: 'Google Business', name: 'ABC Digital Solutions', address: '123 Business St, NY', phone: '+1 234-567-8900', consistent: 'Yes' }, { id: 2, platform: 'Yelp', name: 'ABC Digital Solutions', address: '123 Business St, NY', phone: '+1 234-567-8900', consistent: 'Yes' }, { id: 3, platform: 'Facebook', name: 'ABC Digital Sol.', address: '123 Business Street, NY', phone: '+1 234-567-8900', consistent: 'No' }],
  'Local Keywords': [{ id: 1, keyword: 'digital marketing agency', position: '1', volume: '1,600', change: '↑ 1' }, { id: 2, keyword: 'seo services near me', position: '2', volume: '2,400', change: '↑ 2' }, { id: 3, keyword: 'web design new york', position: '3', volume: '1,300', change: '→' }, { id: 4, keyword: 'ppc management', position: '4', volume: '1,000', change: '↓ 1' }, { id: 5, keyword: 'social media marketing', position: '5', volume: '1,200', change: '↑ 3' }],
  'Geo Rankings': [{ id: 1, keyword: 'seo agency new york', location: 'Manhattan', rank: '1', change: '↑ 2' }, { id: 2, keyword: 'digital marketing nyc', location: 'Brooklyn', rank: '3', change: '↑ 1' }, { id: 3, keyword: 'local seo service', location: 'Queens', rank: '5', change: '→' }],
  'Local Competitors': [{ id: 1, name: 'Digital Marketing Pro', rating: '4.8', reviews: '(129)', distance: '0.5 miles' }, { id: 2, name: 'SEO Experts NY', rating: '4.6', reviews: '(98)', distance: '0.8 miles' }, { id: 3, name: 'Web Growth Agency', rating: '4.4', reviews: '(74)', distance: '1.2 miles' }, { id: 4, name: 'Rank Higher LLC', rating: '4.2', reviews: '(63)', distance: '1.5 miles' }],
  'Local Backlinks': [{ id: 1, source: 'NYBusinessDirectory.com', url: 'https://nybiz.com/abc-digital', da: '48', status: 'Active' }, { id: 2, source: 'Manhattan Chamber of Commerce', url: 'https://manhattancc.org/members', da: '62', status: 'Active' }, { id: 3, source: 'Local Business Review NY', url: 'https://localbizny.com/abc', da: '38', status: 'Active' }],
};

// ── Status Badge ──────────────────────────────────────────────────────────
const badge = (s) => {
  const m = {
    Active: 'bg-emerald-50 text-emerald-700 border border-emerald-200', Primary: 'bg-blue-50 text-blue-700 border border-blue-200',
    Published: 'bg-emerald-50 text-emerald-700 border border-emerald-200', Confirmed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Consistent: 'bg-emerald-50 text-emerald-700 border border-emerald-200', Open: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Yes: 'bg-emerald-50 text-emerald-700 border border-emerald-200', Answered: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Upcoming: 'bg-blue-50 text-blue-700 border border-blue-200', Unread: 'bg-blue-50 text-blue-700 border border-blue-200',
    Pending: 'bg-amber-50 text-amber-700 border border-amber-200', Planned: 'bg-amber-50 text-amber-700 border border-amber-200',
    Inconsistent: 'bg-amber-50 text-amber-700 border border-amber-200', No: 'bg-amber-50 text-amber-700 border border-amber-200',
    Missing: 'bg-rose-50 text-rose-600 border border-rose-200', Closed: 'bg-slate-100 text-slate-500',
    Missed: 'bg-rose-50 text-rose-600 border border-rose-200', Replied: 'bg-purple-50 text-purple-700 border border-purple-200',
    Secondary: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  };
  return <span className={`text-xs  px-2 py-0.5 rounded-full ${m[s] || 'bg-slate-100 text-slate-500'}`}>{s}</span>;
};

// ═══════════════════════════════════════════════════════════════════════════
export default function SeoGmbGmbProfilePage() {
  const [mainTab, setMainTab] = useState('Overview');
  const [subTab, setSubTab] = useState('');
  const [project, setProject] = useState(null);
  const [tableData, setTableData] = useState(INIT);

  // When switching main tab, auto-select first sub-tab
  const handleMainTab = (id) => {
    setMainTab(id);
    const tab = MAIN_TABS.find(t => t.id === id);
    setSubTab(tab?.subs?.length ? tab.subs[0] : '');
  };

  // Generic CRUD
  const makeAdd = (key) => (item) => setTableData(prev => ({ ...prev, [key]: [...prev[key], { ...item, id: prev[key].length ? Math.max(...prev[key].map(i => i.id)) + 1 : 1 }] }));
  const makeEdit = (key) => (id, item) => setTableData(prev => ({ ...prev, [key]: prev[key].map(i => i.id === id ? { ...i, ...item } : i) }));
  const makeDel = (key) => (id) => setTableData(prev => ({ ...prev, [key]: prev[key].filter(i => i.id !== id) }));

  const loadProject = async (proj) => {
    try { const r = await fetch(`${API_BASE_URL}/projects/${proj.id}`); if (r.ok) setProject(await r.json()); } catch { }
  };

  const currentSubs = MAIN_TABS.find(t => t.id === mainTab)?.subs || [];
  const activeKey = subTab || '';

  return (
    <div className="bg-slate-50 min-h-screen font-sans pb-10">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
            <MapPin size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-base  text-slate-900 m-0 leading-none">Google Business Profile (GMB) {project ? `for ${project.name}` : ''}</h1>
            <p className="text-xs text-slate-400 m-0 mt-0.5">Manage and optimize your Google Business Profile to attract more customers locally.</p>
          </div>
          <SeoGmbProjectSelector onProjectChange={loadProject} />
        </div>
        <div className="flex items-center gap-2">
          <button className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer">
            <Calendar size={13} /> May 8 – May 15, 2026
          </button>
          <button className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer">
            <Download size={13} /> Export Report
          </button>
          <button
            onClick={() => handleMainTab('Business Management')}
            className="bg-blue-500 hover:bg-blue-600 border-none text-white rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus size={14} /> Add Location
          </button>
        </div>
      </div>

      <div className="px-6 py-4">

        {/* ── Main Tabs ── */}
        <div className="flex gap-1.5 mb-4 bg-white p-1 rounded border border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
          {MAIN_TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleMainTab(id)}
              className={`flex items-center gap-1.5 py-2.5 px-4 rounded text-xs  cursor-pointer border-none outline-none transition-all shrink-0 ${mainTab === id ? 'bg-blue-50 text-blue-600 ' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              <Icon size={13} /> {id}
            </button>
          ))}
        </div>

        {/* ── Sub-Tabs (if any) ── */}
        {currentSubs.length > 0 && (
          <div className="flex gap-1 mb-5 bg-white p-1 rounded border border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
            {currentSubs.map((sub) => (
              <button
                key={sub}
                onClick={() => setSubTab(sub)}
                className={`flex items-center gap-1.5 py-2 px-3.5 rounded text-xs  cursor-pointer border-none outline-none transition-all shrink-0 ${subTab === sub ? 'bg-indigo-50 text-indigo-600 ' : 'text-slate-500 hover:bg-slate-50'
                  }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* ═══════════════════ OVERVIEW ═══════════════════ */}
        {mainTab === 'Overview' && (
          <div className="flex flex-col gap-2">
            {/* Metric Cards */}
            <div className="grid grid-cols-7 gap-3">
              {[
                { label: 'Total Views', val: '24,562', sub: '+18.6%', icon: Eye, color: 'text-blue-500 bg-blue-50' },
                { label: 'Search Views', val: '15,263', sub: '+21.4%', icon: Search, color: 'text-indigo-500 bg-indigo-50' },
                { label: 'Map Views', val: '9,299', sub: '+16.2%', icon: Map, color: 'text-purple-500 bg-purple-50' },
                { label: 'Total Actions', val: '4,582', sub: '+10.8%', icon: MousePointerClick, color: 'text-amber-500 bg-amber-50' },
                { label: 'Calls', val: '1,253', sub: '+15.7%', icon: Phone, color: 'text-emerald-500 bg-emerald-50' },
                { label: 'Direction Requests', val: '933', sub: '+16.3%', icon: Navigation, color: 'text-sky-500 bg-sky-50' },
                { label: 'Website Clicks', val: '2,396', sub: '+22.8%', icon: Globe, color: 'text-rose-500 bg-rose-50' },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 ">{c.label}</span>
                    <div className={`w-7 h-7 rounded flex items-center justify-center ${c.color}`}><c.icon size={13} /></div>
                  </div>
                  <strong className="text-xl font-black text-slate-900 block">{c.val}</strong>
                  <span className="text-xs text-emerald-500  flex items-center gap-0.5 mt-1">
                    <ArrowUpRight size={9} /> {c.sub} vs last 30 days
                  </span>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm  text-slate-900 m-0">Business Profile Performance</h3>
                  <span className="text-xs border border-slate-200 rounded px-2 py-0.5 text-slate-400 ">Last 30 Days</span>
                </div>
                <div className="flex gap-4 mb-2 text-xs  text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> Views</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block" /> Actions</span>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={PROFILE_TREND}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="views" stroke="#3B82F6" fill="#DBEAFE" strokeWidth={2} name="Views" />
                    <Area type="monotone" dataKey="actions" stroke="#10B981" fill="#D1FAE5" strokeWidth={2} name="Actions" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="col-span-1 bg-white rounded-2xl border border-slate-200 p-2">
                <h3 className="text-sm  text-slate-900 m-0 mb-3">Top Actions</h3>
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <ResponsiveContainer width={100} height={100}>
                      <PieChart>
                        <Pie data={TOP_ACTIONS} cx="50%" cy="50%" innerRadius={30} outerRadius={45} dataKey="value" paddingAngle={2}>
                          {TOP_ACTIONS.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <strong className="text-xs font-black text-slate-900">4,582</strong>
                      <span className="text-[8px] text-slate-400">Total</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    {TOP_ACTIONS.map((a) => (
                      <div key={a.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} /><span className="text-slate-600">{a.name}</span></div>
                        <div className="text-right"><strong className="text-slate-800">{a.value.toLocaleString()}</strong><span className="text-slate-400 ml-1">({a.pct})</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-1 bg-white rounded-2xl border border-slate-200 p-2">
                <h3 className="text-sm  text-slate-900 m-0 mb-3">Profile Completeness</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative flex-shrink-0">
                    <svg width="80" height="80" viewBox="0 0 36 36">
                      <path strokeWidth="3.5" stroke="#F1F5F9" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path strokeWidth="3.5" strokeDasharray="92, 100" strokeLinecap="round" stroke="#10B981" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <strong className="text-sm font-black text-slate-900">92%</strong>
                      <span className="text-[8px] text-slate-400">Complete</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {COMPLETENESS_ITEMS.map((ci) => (
                      <div key={ci.label} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className={`w-2 h-2 rounded-full ${ci.done ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                        {ci.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded p-2 text-center">
                  <span className="text-xs  text-emerald-600">✓ Excellent</span>
                  <p className="text-[9px] text-emerald-500 m-0 mt-0.5">Keep posting updates and engaging with customers.</p>
                </div>
              </div>
            </div>

            {/* 4-panel row */}
            <div className="grid grid-cols-4 gap-4">
              {/* Recent Posts */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm  text-slate-900 m-0">Recent Google Posts</h3>
                  <button onClick={() => handleMainTab('Google Posts')} className="text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline">View All Posts →</button>
                </div>
                {tableData['Posts'].slice(0, 4).map((p) => (
                  <div key={p.id} className="flex items-center gap-2 border-b border-slate-50 pb-2 mb-2">
                    <div className="w-10 h-10 bg-slate-100 rounded flex-shrink-0 flex items-center justify-center"><FileText size={14} className="text-slate-400" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs  text-slate-800 m-0 truncate">{p.title}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`text-[9px]  px-1.5 py-0.5 rounded ${p.type === 'Offer' ? 'bg-amber-100 text-amber-600' : p.type === 'Event' ? 'bg-blue-100 text-blue-600' : p.type === 'Update' ? 'bg-purple-100 text-purple-600' : 'bg-rose-100 text-rose-600'}`}>{p.type}</span>
                        <span className="text-[9px] text-slate-400">{p.published}</span>
                      </div>
                    </div>
                    <div className="text-[9px] text-slate-400 flex items-center gap-0.5"><Eye size={9} />{p.views}</div>
                  </div>
                ))}
              </div>

              {/* Latest Reviews */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm  text-slate-900 m-0">Latest Reviews</h3>
                  <button onClick={() => handleMainTab('Customer Engagement')} className="text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline">View All →</button>
                </div>
                {tableData['Reviews'].map((r) => (
                  <div key={r.id} className="border-b border-slate-50 pb-2 mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-[9px] font-black text-blue-600">{r.reviewer[0]}</div>
                        <span className="text-xs  text-slate-800">{r.reviewer}</span>
                      </div>
                      <span className="text-[9px] text-amber-400">{r.rating.slice(0, 5)}</span>
                    </div>
                    <p className="text-[9px] text-slate-500 m-0 mb-1">{r.review}</p>
                    <div className="flex justify-between">
                      <span className="text-[9px] text-slate-400">{r.date}</span>
                      <button onClick={() => { handleMainTab('Customer Engagement'); setSubTab('Review Replies'); }} className="text-[9px] text-blue-500  border-none bg-transparent cursor-pointer">Reply</button>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-slate-400 text-center  m-0">Average Rating: <strong className="text-slate-700">4.6</strong> ⭐ (124 Reviews)</p>
              </div>

              {/* Customer Engagement */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm  text-slate-900 m-0">Customer Engagement</h3>
                  <button onClick={() => handleMainTab('Customer Engagement')} className="text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline">View All →</button>
                </div>
                {[
                  { label: 'Messages', val: tableData['Messages'].length + 42, change: '+12%', icon: MessageSquare, color: 'text-blue-500 bg-blue-50' },
                  { label: 'Calls', val: '1,253', change: '+15.7%', icon: Phone, color: 'text-emerald-500 bg-emerald-50' },
                  { label: 'Bookings', val: tableData['Bookings'].length + 65, change: '+5.9%', icon: Bookmark, color: 'text-purple-500 bg-purple-50' },
                  { label: 'Direction Requests', val: '933', change: '+16.1%', icon: Navigation, color: 'text-amber-500 bg-amber-50' },
                ].map((e) => (
                  <div key={e.label} className="flex items-center justify-between py-1.5 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded flex items-center justify-center ${e.color}`}><e.icon size={13} /></div>
                      <span className="text-xs  text-slate-700">{e.label}</span>
                    </div>
                    <div className="text-right">
                      <strong className="text-sm font-black text-slate-900 block">{e.val}</strong>
                      <span className="text-[9px] text-emerald-500 ">{e.change}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Business Info */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm  text-slate-900 m-0">Business Information</h3>
                  <button onClick={() => { handleMainTab('Business Management'); setSubTab('Business Information'); }} className="text-blue-500 text-xs  border-none bg-transparent cursor-pointer">Edit</button>
                </div>
                {tableData['Business Information'].map((b) => (
                  <div key={b.id} className="mb-2 pb-2 border-b border-slate-50">
                    <span className="text-[9px] text-slate-400   block">{b.field}</span>
                    <span className="text-xs text-slate-700 ">{b.value}</span>
                  </div>
                ))}
                <div className="mb-2"><span className="text-[9px] text-slate-400   block">Address</span><span className="text-xs text-slate-700 ">123 Business St, New York, NY 10001, USA</span></div>
                <div><span className="text-[9px] text-slate-400   block">Service Areas</span><span className="text-xs text-slate-700 ">New York, Brooklyn, Manhattan</span></div>
              </div>
            </div>

            {/* Bottom 3-col row */}
            <div className="grid grid-cols-3 gap-4">
              {/* Local SEO Overview */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm  text-slate-900 m-0 mb-3">Local SEO Overview</h3>
                {[{ label: 'Citation Score', val: '87%', c: '+2' }, { label: 'NAP Consistency', val: '95%', c: '+1' }, { label: 'Local Keywords', val: '128', c: '+5' }, { label: 'Geo Rankings', val: 'Top 3: 12', c: '+3' }, { label: 'Local Backlinks', val: '342', c: '+18' }].map(s => (
                  <div key={s.label} className="flex items-center justify-between py-1.5 border-b border-slate-50">
                    <div className="flex items-center gap-1.5"><CheckCircle size={11} className="text-emerald-500" /><span className="text-xs  text-slate-700">{s.label}</span></div>
                    <div className="flex items-center gap-1.5"><strong className="text-xs font-black text-slate-800">{s.val}</strong><span className="text-[9px] text-emerald-500 ">↑ {s.c}</span></div>
                  </div>
                ))}
                <button onClick={() => handleMainTab('Local SEO')} className="w-full text-center text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline mt-2">View Local SEO Report →</button>
              </div>

              {/* Top Local Keywords */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm  text-slate-900 m-0">Top Local Keywords</h3>
                  <button onClick={() => { handleMainTab('Local SEO'); setSubTab('Local Keywords'); }} className="text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline">View All →</button>
                </div>
                <table className="w-full text-xs text-slate-700">
                  <thead><tr className="text-[9px] text-slate-400   border-b border-slate-100"><th className="pb-1.5 text-left">Keyword</th><th className="pb-1.5 text-center">Pos</th><th className="pb-1.5 text-center">Δ</th><th className="pb-1.5 text-right">Volume</th></tr></thead>
                  <tbody>
                    {tableData['Local Keywords'].map(kw => (
                      <tr key={kw.id} className="border-b border-slate-50">
                        <td className="py-1.5 font-medium truncate max-w-[120px]">{kw.keyword}</td>
                        <td className="py-1.5 text-center font-black">{kw.position}</td>
                        <td className={`py-1.5 text-center  ${kw.change.includes('↑') ? 'text-emerald-500' : kw.change.includes('↓') ? 'text-rose-500' : 'text-slate-400'}`}>{kw.change}</td>
                        <td className="py-1.5 text-right text-slate-500">{kw.volume}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Local Competitors */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm  text-slate-900 m-0">Local Competitors</h3>
                  <button onClick={() => { handleMainTab('Local SEO'); setSubTab('Local Competitors'); }} className="text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline">View All →</button>
                </div>
                {tableData['Local Competitors'].map(c => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center"><Building2 size={11} className="text-slate-400" /></div>
                      <div><p className="text-xs  text-slate-800 m-0">{c.name}</p><p className="text-[9px] text-slate-400 m-0">{c.distance}</p></div>
                    </div>
                    <div className="text-right"><span className="text-xs font-black text-slate-800">{c.rating}</span><span className="text-[9px] text-amber-400"> ★</span><p className="text-[9px] text-slate-400 m-0">{c.reviews}</p></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Media strip */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm  text-slate-900 m-0">Media Management</h3>
                <button onClick={() => handleMainTab('Media Management')} className="text-blue-500 text-xs  border-none bg-transparent cursor-pointer hover:underline">View All Media →</button>
              </div>
              <div className="flex items-center gap-8">
                {[{ label: 'Photos', val: tableData['Photos'].length + 149, sub: '+3 this month', icon: Camera, color: 'text-blue-500 bg-blue-50' }, { label: 'Videos', val: tableData['Videos'].length + 26, sub: '+5 this month', icon: Video, color: 'text-purple-500 bg-purple-50' }, { label: 'Logo & Cover', val: tableData['Logo & Cover Images'].length, sub: 'No change', icon: Image, color: 'text-emerald-500 bg-emerald-50' }].map(m => (
                  <div key={m.label} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded flex items-center justify-center ${m.color}`}><m.icon size={18} /></div>
                    <div><strong className="text-xl font-black text-slate-900">{m.val}</strong><p className="text-xs  text-slate-400 m-0">{m.label}</p><p className="text-[9px] text-emerald-500  m-0">{m.sub}</p></div>
                  </div>
                ))}
                <div className="flex gap-2 ml-auto">
                  {[1, 2, 3].map(i => <div key={i} className="w-16 h-16 bg-slate-100 rounded border border-slate-200 flex items-center justify-center"><Camera size={20} className="text-slate-300" /></div>)}
                  <div className="w-16 h-16 bg-blue-500 rounded flex items-center justify-center"><span className="text-white font-black text-sm">+12</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════ ALL SUB-TAB CRUD TABLES ═══════════════════ */}
        {mainTab !== 'Overview' && activeKey && COLS[activeKey] && (
          mainTab === 'Customer Engagement' && activeKey === 'Review Analytics' ? (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-4 gap-4">
                {[{ label: 'Total Reviews', val: '124', color: 'text-blue-500' }, { label: 'Average Rating', val: '4.6 ⭐', color: 'text-amber-500' }, { label: 'Response Rate', val: '87%', color: 'text-emerald-500' }, { label: 'Avg Response Time', val: '4.2 hrs', color: 'text-purple-500' }].map(c => (
                  <div key={c.label} className="bg-white rounded-2xl p-4 border border-slate-200">
                    <span className="text-xs text-slate-400  block">{c.label}</span>
                    <strong className={`text-2xl font-black mt-1 block ${c.color}`}>{c.val}</strong>
                  </div>
                ))}
              </div>
              <CrudTable title={activeKey} columns={COLS[activeKey]} data={tableData[activeKey]} onAdd={makeAdd(activeKey)} onEdit={makeEdit(activeKey)} onDelete={makeDel(activeKey)} />
            </div>
          ) : (
            <CrudTable
              title={activeKey}
              columns={COLS[activeKey]}
              data={tableData[activeKey] || []}
              onAdd={makeAdd(activeKey)}
              onEdit={makeEdit(activeKey)}
              onDelete={makeDel(activeKey)}
            />
          )
        )}

        {/* Placeholder when no sub-tab selected (shouldn't happen due to auto-select) */}
        {mainTab !== 'Overview' && !activeKey && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
            Select a sub-tab above to view and manage data.
          </div>
        )}

      </div>
    </div>
  );
}
