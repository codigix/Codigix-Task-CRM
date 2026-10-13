import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package,
  ChevronDown, X, Home, Users, Building2, Settings, BarChart3, FileText,
  Briefcase, MessageCircle, Shield, Trash2, Users2, FileJson, MapPin,
  MessageSquare, HelpCircle, Lock, Layout, TrendingUp, Search,
  Database, Code, Terminal, Palette, Megaphone, Receipt, Wallet,
  PieChart, Activity, CheckCircle, AlertCircle, Calendar, FileCheck, Layers,
  ClipboardList, Target, Percent, Bell, UserCircle, FileStack,
  Workflow, Zap, ShieldCheck, BarChart, HardDrive, Cpu, Bug, GitBranch,
  Rocket, Gauge, AlertTriangle, FileBarChart, CreditCard, Banknote,
  Scale, History, Eye, SearchCode, Star, Globe, Link, Image, Map, BookOpen,
  FolderOpen, Phone, PlayCircle, User, UserCheck, ListChecks, Video,
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { isSidebarItemVisible, isModuleAccessible, getMenuItemAccess } from '../../utils/roleBasedAccess';

const Sidebar = ({ isOpen, toggleSidebar, onNavigate, currentPage }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({
    admin: true,
    leads: true,
    deals: true,
    sales: true,
    marketing: true,
    seoGmb: true,
    it: true,
    accounting: true,
    crm: true,
    operations: true,
    reports: true,
    activities: false,
    settings: false,
    userManagement: false,
    salesCRM: true,
    salesOverview: false,
    salesActivities: false,
    salesFinance: false,
    marketingProjects: true,
    marketingManagement: false,
    itProjects: true,
    itManagement: false,
    accountingFinance: true,
    accountingManager: false,
  });

  const toggleMenu = (menu) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const SubmenuItem = ({ icon: Icon, label, onClick, active, page, moduleKey, prefix: propPrefix, to, query }) => {
    const isAccessible = !moduleKey || isModuleAccessible(user?.role, moduleKey);
    const accessLevel = page ? getMenuItemAccess(user?.role, `${page.charAt(0).toUpperCase()}${page.slice(1)}`) : null;
    const isViewOnly = accessLevel === 'view_only' || accessLevel === 'view_only_if_assigned';

    if (!isAccessible) {
      return null;
    }

    // The address this item opens. Clicking and "is this the page I am on" both use it, so they can never disagree.
    const computeTarget = () => {
      if (to) return to;
      let finalPage = page;

      // Helper to determine department prefix based on current context
      const getDepartmentPrefix = () => {
        // Super Admin gets their own prefix
        if (user?.role === 'Super Admin') return '/super-admin';

        const role = user?.role || '';
        const dept = user?.department || '';

        // Prioritize explicit Department matches first
        if (dept.includes('Marketing')) return '/marketing';
        if (dept.includes('IT')) return '/it';
        if (dept.includes('SEO') || dept.includes('GMB')) return '/seo-gmb';
        if (dept.includes('Sales') || dept.includes('Leads') || dept.includes('Deals')) return '/sales';
        if (dept.includes('Account')) return '/invoices';

        // Check if role strongly implies a department if department didn't match
        if (role.includes('Marketing')) return '/marketing';
        if (role.includes('IT')) return '/it';
        if (role.includes('SEO') || role.includes('GMB')) return '/seo-gmb';
        if (role === 'Admin' || role.includes('Sales') || role.includes('Lead') || role.includes('Deal')) return '/sales';
        if (role.includes('Account')) return '/invoices';
        if (role.includes('HR')) return '/hr';

        return '';
      };

      const prefix = propPrefix || getDepartmentPrefix();

      const sharedModules = [
        'calendar', 'tasks', 'followups', 'analytics', 'reports', 'attendance',
        'dashboard', 'list', 'details', 'kanban', 'quotations',
        'customers', 'targets', 'performance', 'commission', 'distribution',
        'contacts', 'companies', 'campaign', 'contracts',
        'estimations', 'invoices', 'payments', 'activities', 'chat',
        'video-call', 'audio-call', 'call-history', 'email', 'todo',
        'notes', 'file-manager', 'social-feed', 'seo-gmb', 'ppc-ads',
        'graphics-video', 'content-calendar', 'blogs-calendar', 'marketing-drive',
        'it-inventory', 'it-ticketing', 'seo-', 'gmb-', 'teams',
        'documents', 'projects', 'leads', 'bugs', 'test-cases', 'repositories', 'backlog', 'ticket-assignments',
        'registration-requests', 'employees', 'pipeline', 'agenda', 'quotes', 'sales-settings', 'approvals'
      ];

      const userNameValue = user?.username || user?.first_name || user?.name || 'user';
      const username = userNameValue.toLowerCase().replace(/\s+/g, '-');

      const formatUrlSlug = (str) => {
        if (!str) return 'employee';
        return str.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      };
      const designation = user?.role ? formatUrlSlug(user.role) : 'employee';
      const userPath = `${designation}/${username}`;

      if (prefix === '/super-admin') {
        let cleanPage = page;
        if (page === 'deals-dashboard' || page === 'leads-dashboard' || page === 'sales-dashboard' || page === 'projects-dashboard') {
          cleanPage = 'dashboard';
        }

        if (cleanPage === 'dashboard') {
          finalPage = '/super-admin';
        } else {
          finalPage = `/super-admin/${cleanPage}`;
        }
      } else if (sharedModules.some(m => page.includes(m)) || prefix === '/seo-gmb') {
        let cleanPage = page;
        if (page === 'deals-dashboard' || page === 'leads-dashboard' || page === 'sales-dashboard' || page === 'projects-dashboard') {
          cleanPage = 'dashboard';
        } else if (page === 'project-details') {
          cleanPage = 'details';
        } else if (page === 'deals-kanban') {
          cleanPage = 'kanban';
        } else if (page === 'sales-targets') {
          cleanPage = 'targets';
        } else if (page === 'sales-reports') {
          cleanPage = 'reports';
        } else if (page === 'it-chat') {
          cleanPage = 'chat';
        } else if (page === 'revenue-forecast') {
          cleanPage = 'analytics';
        } else if (page === 'it-teams') {
          cleanPage = 'teams';
        } else if (page === 'pipeline-enquiries' || page === 'pipeline-deals') {
          cleanPage = 'pipeline';
        }

        finalPage = `${prefix}/${userPath}/${cleanPage}`;
      } else if (page === 'deals-dashboard') {
        finalPage = `/deals/${userPath}/dashboard`;
      } else if (page === 'leads-dashboard') {
        finalPage = `/leads/${userPath}/dashboard`;
      } else if (page === 'sales-dashboard') {
        finalPage = `/sales/${userPath}/dashboard`;
      } else if (page === 'projects-dashboard') {
        finalPage = `/projects/${userPath}/dashboard`;
      }

      // Ensure no double slashes and handles roots
      if (finalPage.startsWith('//')) finalPage = finalPage.substring(1);
      if (query) finalPage = `${finalPage}${query}`;
      return finalPage;
    };
    const handleClick = () => {
      onNavigate(computeTarget());
      if (toggleSidebar) toggleSidebar();
    };

    // Active = the address bar is on this item's page (or one of its detail pages, e.g. a single quotation
    // under Quotations). Items that share a page and differ by ?tab= (enquiries / deals) are told apart by the tab.
    const DETAIL_PAGES = { quotes: ['quotation', 'quotations', 'proposal'], customers: ['customer'], invoices: ['invoice'], pipeline: ['enquiry', 'opportunity'] };
    const trimSlash = (p) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p);
    const [targetPath, targetQuery = ''] = computeTarget().split('?');
    const hereSeg = trimSlash(location.pathname).split('/');
    const baseSeg = trimSlash(targetPath).split('/');
    const lastSeg = baseSeg[baseSeg.length - 1];
    const sameFolder = hereSeg.length >= baseSeg.length && baseSeg.slice(0, -1).every((seg, i) => seg === hereSeg[i]);
    const onPage = sameFolder && ([lastSeg, ...(DETAIL_PAGES[lastSeg] || [])].includes(hereSeg[baseSeg.length - 1]));
    const hereTab = new URLSearchParams(location.search).get('tab');
    const wantTab = new URLSearchParams(targetQuery).get('tab');
    const sharesPipeline = lastSeg === 'pipeline';
    const urlActive = onPage && (!sharesPipeline || (wantTab ? hereTab === wantTab : !hereTab));
    // Pipeline links are decided by the address alone; everything else also keeps the old page-name match.
    const isOn = sharesPipeline ? urlActive : (urlActive || currentPage === page);

    return (
      <button
        onClick={handleClick}
        title={isViewOnly ? 'View-only access' : ''}
        className={`menu-item w-full flex items-center gap-3 p-2 text-xs rounded transition-all duration-200 ${isOn
          ? 'bg-[#1e2b4a] text-white border border-[#1e2b4a]'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
          }`}
      >
        {Icon ? <Icon size={14} className={isOn ? 'text-white' : ''} /> : <span className={`w-1 h-1 rounded bg-current transition-transform ${isOn ? 'scale-125' : ''}`}></span>}
        <span className="flex-1 text-left text-sm">{label}</span>
        {isViewOnly && <Lock size={14} className="opacity-60" title="View-only" />}
      </button>
    );
  };

  const MenuSection = ({ title, items, expanded, onToggle }) => (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className="menu-item w-full flex items-center justify-between p-2  text-xs text-gray-500  hover:bg-gray-50 hover:text-gray-700 rounded transition-smooth"
      >
        <span>{title}</span>
        <ChevronDown size={16} className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && <div className="space-y-1 animate-fade-in">{items}</div>}
    </div>
  );

  const NestedMenu = ({ icon: Icon, label, items, expanded, onToggle, active }) => (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className={`menu-item w-full flex items-center gap-3 p-2 text-xs  rounded transition-all duration-200 ${active
          ? 'bg-[#1e2b4a]/10 text-[#1e2b4a]'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
          }`}
      >
        {Icon && <Icon size={18} className={active ? 'text-[#1e2b4a]' : ''} />}
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown size={14} className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''} text-black`} />
      </button>
      {expanded && <div className="animate-fade-in pl-4 space-y-0.5">{items}</div>}
    </div>
  );

  const userDept = user?.department || '';
  const userRole = user?.role || '';
  const userEmail = (user?.email || '').toLowerCase();
  const isSuperAdmin = userRole === 'Super Admin';
  const isAdmin = isSuperAdmin || userRole === 'Admin' || userDept === 'Admin' || userDept === 'Management';
  // The Admin department gets its own sidebar: administration pages only, with full rights
  // (managing people, access, teams, approvals and every department's work). Department
  // workspaces (Sales, IT, Marketing, SEO, HR) stay with those departments.
  const isAdminDept = !isSuperAdmin && (userRole === 'Admin' || ['admin', 'administration'].includes(userDept.toLowerCase()));
  const seesAllSections = isSuperAdmin;
  const isHR = userRole.toLowerCase().includes('hr') || userDept.toLowerCase().includes('hr');
  const isManager = userRole === 'Manager' || userRole.includes('Manager') || user?.department_role === 'Manager' || isAdmin || isHR || userEmail === 'sonalicodigix@gmail.com';
  const isSEOUser = userRole.includes('SEO') || userRole.includes('GMB') ||
    (user?.job_title || '').toLowerCase().includes('seo') ||
    (user?.job_title || '').toLowerCase().includes('gmb') ||
    userDept.includes('SEO') || userEmail === 'sonalicodigix@gmail.com';
  // Scoped deliberately: the Marketing manager's own sidebar, not the whole department and
  // not any other department. Also hide non-SEO marketing tabs for SEO & GMB specialists/managers.
  const isMarketingDept = userDept.toLowerCase().includes('marketing');
  const hideForMarketingManager = (isMarketingDept && isManager && !isSuperAdmin) || isSEOUser;
  // Sales staff manage deals/leads, not delivery projects — never surface a Projects tab for
  // them, whichever department sidebar they land in. Keyed on department, with a role fallback
  // for accounts whose department is set to a delivery team but whose role is still Sales.
  const isSalesUser = !isSuperAdmin && (userDept === 'Sales Department' || userRole.toLowerCase().includes('sales'));
  // Per-role sidebar trimming. Add or remove a role in these lists rather than editing the
  // sections themselves, so the underlying role gating stays intact and reversible.
  const HIDE_CREATIVE_ROLES = ['Graphics Designer', 'Video Editor'];
  const HIDE_DOCUMENTS_ROLES = ['Graphics Designer', 'Video Editor', 'Wordpress Developer'];
  const HIDE_WORDPRESS_SECTION_ROLES = ['Wordpress Developer'];

  const hideForCreativeRole = HIDE_CREATIVE_ROLES.includes(userRole);
  const hideDocumentsForRole = HIDE_DOCUMENTS_ROLES.includes(userRole);
  const hideWordpressSectionForRole = HIDE_WORDPRESS_SECTION_ROLES.includes(userRole);

  const salesOnly = userDept === 'Sales Department' && !seesAllSections && !isSuperAdmin;
  const renderTopCommonPages = () => (salesOnly ? null : (
    <>
      <div className="p-2 text-xs text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">Common Workspace</div>
      <SubmenuItem label="Dashboard" page="dashboard" icon={Layout} />
      <SubmenuItem label="Daily Task" page="tasks" icon={ClipboardList} />
      <SubmenuItem label="Meetings" page="meetings" icon={Video} to="/meetings" />
      <SubmenuItem label="Task Management" page="kanban" icon={Layers} />
      <SubmenuItem label="Notes & Wiki" page="notes" icon={BookOpen} />
      {isManager && <SubmenuItem label="Calendar" page="calendar" icon={Calendar} />}
    </>
  ));

  const renderBottomCommonPages = () => (
    <>
      <div className="p-2 text-xs text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">System</div>
      <SubmenuItem label="Reports" page="reports" icon={BarChart3} />
      {/* Hidden for the Marketing manager and the Graphics Designer. This block is shared by
          every department, so Documents is gated rather than commented out — removing the
          line outright would take it away from IT and everyone else. Drop a guard to
          restore it for that role. */}
      {/* {!hideForMarketingManager && !hideForCreativeRole && (
        <SubmenuItem label="Documents" page="documents" icon={HardDrive} />
      )} */}
      <SubmenuItem label="Settings" page="profile-settings" icon={Settings} />
    </>
  );

  const renderAdminPages = () => (
    <>
      <div className="p-2 text-xs text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">Admin Panel</div>
      <SubmenuItem label="Companies" page="companies" icon={Building2} prefix="/super-admin" />
      <SubmenuItem label="Subscriptions" page="subscriptions" icon={CreditCard} prefix="/super-admin" />
      <SubmenuItem label="Packages" page="packages" icon={Package} prefix="/super-admin" />
      <SubmenuItem label="Domain" page="domain" icon={Globe} prefix="/super-admin" />
      <SubmenuItem label="Transactions" page="purchase-transaction" icon={Receipt} prefix="/super-admin" />
      <SubmenuItem label="Registration Requests" page="registration-requests" icon={UserCheck} prefix="/super-admin" />
    </>
  );

  // Sales, in the order the work happens: enquiry -> deal -> quotation -> customer & billing.
  // A sales employee adds enquiries and handles follow-ups; deals, quotations and billing are for sales executives and managers.
  const canQuote = !salesOnly || isManager || userRole.toLowerCase().includes('executive');

  const renderSalesPages = () => (
    <>
      {/* ── Today ───────────────────────────────────────────────────── */}
      <div className="p-2 text-xs text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">Today</div>
      {salesOnly && <SubmenuItem label="Sales Home" page="dashboard" icon={Layout} />}
      <SubmenuItem label="Follow-ups & Calls" page="agenda" icon={Calendar} prefix="/sales" />
      {salesOnly && <SubmenuItem label="Meetings" page="meetings" icon={Video} to="/meetings" />}
      {salesOnly && <SubmenuItem label="Calendar" page="calendar" icon={Calendar} prefix="/sales" />}

      {/* ── 1 · Pipeline: enquiries to deals ────────────────────────── */}
      <div className="p-2 text-xs text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">1 · Pipeline</div>
      <SubmenuItem label="Sales Pipeline" page="pipeline" icon={Workflow} prefix="/sales" />
      <SubmenuItem label="All Enquiries" page="pipeline-enquiries" icon={Users} prefix="/sales" query="?tab=leads" />
      {canQuote && <SubmenuItem label="Active Deals" page="pipeline-deals" icon={Briefcase} prefix="/sales" query="?tab=deals" />}
      {isManager && <SubmenuItem label="Lead Distribution" page="distribution" icon={Users2} prefix="/sales" />}

      {canQuote && (
        <>
        {/* ── 2 · Quotations (standard + presentation decks in one list) ─ */}
        <div className="p-2 text-xs text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">2 · Quotations</div>
        <SubmenuItem label="Quotations" page="quotes" icon={FileStack} prefix="/sales" />
        {isManager && <SubmenuItem label="Approvals" page="approvals" icon={ShieldCheck} prefix="/sales" />}
  
        {/* ── 3 · Customers & Billing ─────────────────────────────────── */}
        <div className="p-2 text-xs text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">3 · Customers & Billing</div>
        <SubmenuItem label="Customers" page="customers" icon={UserCircle} prefix="/sales" />
        <SubmenuItem label="Invoices" page="invoices" icon={CreditCard} prefix="/sales" />
        <SubmenuItem label="Payments" page="payments" icon={Banknote} prefix="/sales" />
  
          </>
      )}

      {/* ── 4 · Results ─────────────────────────────────────────────── */}
      <div className="p-2 text-xs text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">4 · Targets & Results</div>
      <SubmenuItem label="Targets" page="targets" icon={Target} prefix="/sales" />
      {isManager && <SubmenuItem label="Team Performance" page="performance" icon={Gauge} prefix="/sales" />}
      {isManager && <SubmenuItem label="Commission" page="commission" icon={Banknote} prefix="/sales" />}

      {/* ── My work (sales-only staff; others have these under Common Workspace) ── */}
      {salesOnly && (
        <>
        <div className="p-2 text-xs text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">My Work</div>
          <SubmenuItem label="My Daily Tasks" page="tasks" icon={ClipboardList} />
          <SubmenuItem label="Task Board" page="kanban" icon={Layers} />
        </>
      )}

      {/* ── Team & setup ────────────────────────────────────────────── */}
      <div className="p-2 text-xs text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">Team & Setup</div>
      {!seesAllSections && <SubmenuItem label="Team Chat" page="chat" icon={MessageCircle} prefix="/sales" />}
      {salesOnly && <SubmenuItem label="Notes & Wiki" page="notes" icon={BookOpen} prefix="/sales" />}
      {isManager && <SubmenuItem label="Sales Settings" page="sales-settings" icon={Settings} prefix="/sales" />}
    </>
  );

  const renderITPages = () => (
    <>
      <div className="p-2 text-xs  text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">IT Operations</div>
      {!isSalesUser && <SubmenuItem label="All Projects" page="projects" icon={Briefcase} prefix="/it" />}
      <SubmenuItem label="Repositories" page="repositories" icon={GitBranch} prefix="/it" />
      <SubmenuItem label="Activity Stream" page="activities" icon={Activity} prefix="/it" />
      <SubmenuItem label="Team Chat" page="it-chat" icon={MessageCircle} prefix="/it" />
      {isManager && !seesAllSections && <SubmenuItem label="Team Management" page="it-teams" icon={Users2} prefix="/it" />}

      {userRole === 'DevOps Engineer' && (
        <>
          <div className="p-2 text-xs  text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">DevOps</div>
          <SubmenuItem label="Deployments" page="deployments" icon={Rocket} prefix="/it" />
          <SubmenuItem label="Server Logs" page="server-logs" icon={Terminal} prefix="/it" />
        </>
      )}

      {userRole === 'Tester' && (
        <>
          <div className="p-2 text-xs  text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">QA & Testing</div>
          <SubmenuItem label="Bug Tracking" page="bugs" icon={Bug} prefix="/it" />
          <SubmenuItem label="Test Cases" page="test-cases" icon={CheckCircle} prefix="/it" />
        </>
      )}

      {isManager && (
        <>
          <div className="p-2 text-xs  text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">IT Management</div>
          <SubmenuItem label="Manager Overview" page="manager-dashboard" icon={Gauge} prefix="/it" />
          <SubmenuItem label="Ticket Assignments" page="ticket-assignments" icon={ListChecks} prefix="/it" />
        </>
      )}
    </>
  );

  const renderMarketingPages = () => {
    const showSEO = isSuperAdmin || (!isSEOUser && isManager) || userRole === 'SEO & GMB';
    const showPPC = !isSEOUser && (isSuperAdmin || isManager || userRole === 'PPC Manager');
    const showCreative = !isSEOUser && (isSuperAdmin || isManager || userRole === 'Graphics Designer' || userRole === 'Video Editor');
    const showSocial = !isSEOUser && (isSuperAdmin || isManager || userRole === 'Social Media Marketing');
    const showWordpress = !isSEOUser && (isSuperAdmin || isManager || userRole === 'Wordpress Developer');

    return (
      <>
        <div className="p-2 text-xs text-[#1F2020] tracking-wider bg-gray-50/50 mt-2">Marketing Operations</div>
        {!seesAllSections && !isSalesUser && !isSEOUser && <SubmenuItem label="All Projects" page="projects" icon={FolderOpen} prefix="/marketing" />}

        {/* HIDDEN FOR THE MARKETING MANAGER ONLY (hideForMarketingManager).
            Every other role — Graphics Designer, Video Editor, Social Media Marketing,
            Wordpress Developer, PPC Manager — still sees these, and no other department is
            affected. To bring a section back for the manager, drop its guard. */}
        {showPPC && !hideForMarketingManager && (
          <>
            <div className="p-2 text-xs  text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">PPC Campaigns</div>
            <SubmenuItem label="Ad Campaigns" page="campaign" icon={Megaphone} prefix="/marketing" />
            <SubmenuItem label="Ad Analytics" page="ad-analytics" icon={BarChart} prefix="/marketing" />
          </>
        )}

        {showCreative && !hideForMarketingManager && !hideForCreativeRole && (
          <>
            <div className="p-2 text-xs  text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">Creative & Media</div>
            <SubmenuItem label="Creative Assets" page="media-management" icon={Image} prefix="/marketing" />
            <SubmenuItem label="Content Library" page="content-library" icon={BookOpen} prefix="/marketing" />
          </>
        )}

        {showSocial && !hideForMarketingManager && (
          <>
            <div className="p-2 text-xs  text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">Social Media</div>
            <SubmenuItem label="Social Feed" page="social-feed" icon={MessageCircle} prefix="/marketing" />
            <SubmenuItem label="Blogs Calendar" page="all-blogs" icon={FileJson} prefix="/marketing" />
          </>
        )}

        {showWordpress && (
          <>
            {!hideForMarketingManager && (
              <div className="p-2 text-xs text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">Wordpress</div>
            )}
            {/* {!hideForMarketingManager && (
              <SubmenuItem label="File Manager" page="file-manager" icon={FileText} prefix="/marketing" />
            )} */}
            {/* {!hideForMarketingManager && (
              <SubmenuItem label="Activities" page="activities" icon={Activity} prefix="/marketing" />
            )} */}
          </>
        )}

        {/* Everyone in Marketing gets Team Chat. It used to live inside the Wordpress block,
            so only Wordpress Developers, managers and Super Admin could reach it. */}
        {!seesAllSections && <SubmenuItem label="Team Chat" page="chat" icon={MessageCircle} prefix="/marketing" />}

        {isManager && (
          <>
            <div className="p-2 text-xs text-[#1F2020] tracking-wider bg-gray-50/50 mt-2">Marketing Management</div>
            <SubmenuItem label="Team Management" page="teams" icon={Users2} prefix="/marketing" />
          </>
        )}
      </>
    );
  };

  const renderSEOGMBPages = () => (
    <>
      <div className="p-2 text-xs  text-[#1F2020]  tracking-wider bg-gray-50/50 mt-2">SEO Management</div>
      {!seesAllSections && !isSalesUser && <SubmenuItem label="All Projects" page="projects" icon={Briefcase} prefix="/seo-gmb" />}

      {/* Pages hidden from sidebar as requested:
          - Project Setup
          - Website Audit, Keyword Management, On-Page SEO, Content Marketing, Off-Page SEO, Rank Tracking
          - Google My Business: GMB Profile, Google Posts, Customer Engagement, Media Management, Local SEO, Google Integrations
          - GEO/AI: GEO Optimization, AI Content Generation, Predictive Analysis, Location Intelligence
          - SEO Operations: Automation */}
    </>
  );

  const renderHRPages = () => (
    <>
      <div className="p-2 text-xs text-[#1F2020] tracking-wider bg-gray-50/50 mt-2">HR Management</div>
      <SubmenuItem label="Employees" page="employees" icon={Users} prefix="/hr" />
      <SubmenuItem label="Attendance" page="attendance" icon={Calendar} prefix="/hr" />
      {!seesAllSections && <SubmenuItem label="Registration Requests" page="registration-requests" icon={UserCheck} prefix="/hr" />}

      {!seesAllSections && <SubmenuItem label="Team Chat" page="chat" icon={MessageCircle} prefix="/hr" />}
      {!seesAllSections && <SubmenuItem label="Activities" page="activities" icon={Activity} prefix="/hr" />}
      {/* <SubmenuItem label="Recruitment" page="recruitment" icon={Briefcase} prefix="/hr" /> */}
      <SubmenuItem label="Performance" page="performance" icon={TrendingUp} prefix="/hr" />
      {/* <SubmenuItem label="Payroll" page="payroll" icon={Banknote} prefix="/hr" /> */}
    </>
  );

  const renderAdminWorkspace = () => (
    <>
      <div className="p-2 text-xs text-[#1F2020] tracking-wider bg-gray-50/50 mt-2">Admin Overview</div>
      <SubmenuItem label="Admin Dashboard" page="dashboard" icon={Gauge} prefix="/sales" />
      <SubmenuItem label="Daily Reports" page="reports" icon={FileBarChart} prefix="/it" />
      <SubmenuItem label="Activity Stream" page="activities" icon={Activity} prefix="/it" />
      <SubmenuItem label="Calendar" page="calendar" icon={Calendar} prefix="/it" />

      <div className="p-2 text-xs text-[#1F2020] tracking-wider bg-gray-50/50 mt-2">Work Oversight</div>
      <SubmenuItem label="Task Board" page="kanban" icon={Layers} prefix="/it" />
      <SubmenuItem label="Backlog & Sprints" page="backlog" icon={ListChecks} prefix="/it" />
      <SubmenuItem label="All Projects" page="projects" icon={Briefcase} prefix="/it" />
      <SubmenuItem label="Ticket Assignments" page="ticket-assignments" icon={ClipboardList} prefix="/it" />

      <div className="p-2 text-xs text-[#1F2020] tracking-wider bg-gray-50/50 mt-2">People & Access</div>
      <SubmenuItem label="Manage Users" page="manage-users" icon={Users} to="/manage-users" />
      <SubmenuItem label="Roles & Permissions" page="roles-permissions" icon={ShieldCheck} to="/roles-permissions" />
      <SubmenuItem label="Departments" page="departments" icon={Building2} to="/departments" />
      <SubmenuItem label="Teams & Workload" page="it-teams" icon={Users2} prefix="/it" />
      <SubmenuItem label="Registration Requests" page="registration-requests" icon={UserCheck} prefix="/hr" />
      <SubmenuItem label="Attendance" page="attendance" icon={Calendar} prefix="/hr" />
      <SubmenuItem label="Performance" page="performance" icon={TrendingUp} prefix="/hr" />

      <div className="p-2 text-xs text-[#1F2020] tracking-wider bg-gray-50/50 mt-2">Communication & Knowledge</div>
      <SubmenuItem label="Team Chat" page="it-chat" icon={MessageCircle} prefix="/it" />
      <SubmenuItem label="Meetings" page="meetings" icon={Video} to="/meetings" />
      <SubmenuItem label="Notes & Wiki" page="notes" icon={BookOpen} prefix="/it" />

      <div className="p-2 text-xs text-[#1F2020] tracking-wider bg-gray-50/50 mt-2">System</div>
      <SubmenuItem label="Settings" page="profile-settings" icon={Settings} />
    </>
  );

  const mainMenuItems = isAdminDept ? renderAdminWorkspace() : (
    <>
      {renderTopCommonPages()}
      {isSuperAdmin && renderAdminPages()}
      {(seesAllSections || userDept === 'Sales Department') && renderSalesPages()}
      {(seesAllSections || userDept === 'IT Department') && renderITPages()}
      {(seesAllSections || userDept === 'Marketing Department') && renderMarketingPages()}
      {(seesAllSections || isSEOUser) && renderSEOGMBPages()}
      {(isAdmin || isHR) && renderHRPages()}
      {renderBottomCommonPages()}
    </>
  );

  const callItems = (
    <>
      <SubmenuItem icon={Home} label="Video Call" page="video-call" />
      <SubmenuItem icon={Home} label="Audio Call" page="audio-call" />
      <SubmenuItem icon={Home} label="Call History" page="call-history" />
    </>
  );

  const applicationsItems = (
    <>
      <SubmenuItem icon={MessageCircle} label="Chat" page="chat" moduleKey="Activities" />
      <MenuSection
        title="Call"
        items={callItems}
        expanded={expandedMenus.call}
        onToggle={() => toggleMenu('call')}
      />
      <SubmenuItem icon={Home} label="Calendar" page="calendar" moduleKey="Activities" />
      <SubmenuItem icon={Home} label="Email" page="email" moduleKey="Activities" />
      <SubmenuItem icon={Home} label="To Do" page="todo" moduleKey="Tasks" />
      <SubmenuItem icon={Home} label="Notes" page="notes" moduleKey="Activities" />
      <SubmenuItem icon={Home} label="File Manager" page="file-manager" moduleKey="Activities" />
      <SubmenuItem icon={Home} label="Social Feed" page="social-feed" moduleKey="Activities" />
      <SubmenuItem icon={Home} label="Kanban" page="kanban" moduleKey="Pipelines" />
      <SubmenuItem icon={Home} label="Invoices" page="invoices" moduleKey="Invoices" />
    </>
  );

  const crmMenuItems = (
    <>
      <SubmenuItem icon={Users} label="Contacts" page="contacts" moduleKey="Contacts" />
      <SubmenuItem icon={Building2} label="Companies" page="companies" moduleKey="Companies" />
      <SubmenuItem icon={FileText} label="Campaign" page="campaign" moduleKey="Campaign" />
      <SubmenuItem icon={FileText} label="Proposals" page="proposals" moduleKey="Proposals" />
      <SubmenuItem icon={FileText} label="Contracts" page="contracts" moduleKey="Contracts" />
      <SubmenuItem icon={FileText} label="Estimations" page="estimations" moduleKey="Estimations" />
      <SubmenuItem icon={FileText} label="Invoices" page="invoices" moduleKey="Invoices" />
      <SubmenuItem icon={FileText} label="Payments" page="payments" moduleKey="Payments" />
      <SubmenuItem icon={BarChart3} label="Analytics" page="analytics" moduleKey="Analytics" />
      <SubmenuItem icon={FileText} label="Activities" page="activities" moduleKey="Activities" />
    </>
  );

  const reportsItems = (
    <>
      <SubmenuItem icon={BarChart3} label="Contact Reports" page="contact-report" moduleKey="Contacts" />
      <SubmenuItem icon={BarChart3} label="Company Reports" page="company-report" moduleKey="Companies" />
    </>
  );

  const userManagementItems = (
    <>
      <SubmenuItem icon={Users} label="Manage Users" page="manage-users" moduleKey="UserManagement" />
      <SubmenuItem icon={Shield} label="Roles & Permissions" page="roles-permissions" moduleKey="Roles" />
      <SubmenuItem icon={Trash2} label="Delete Request" page="delete-request" moduleKey="UserManagement" />
    </>
  );

  const membershipItems = (
    <>
      <SubmenuItem icon={Users2} label="Membership Plans" page="membership-plans" moduleKey="UserManagement" />
      <SubmenuItem icon={Users2} label="Membership Addons" page="membership-addons" moduleKey="UserManagement" />
      <SubmenuItem icon={Users2} label="Membership Transactions" page="membership-transactions" moduleKey="UserManagement" />
    </>
  );

  const blogItems = (
    <>
      <SubmenuItem icon={FileJson} label="All Blogs" page="all-blogs" moduleKey="Content" />
      <SubmenuItem icon={FileJson} label="Blog Categories" page="blog-categories" moduleKey="Content" />
      <SubmenuItem icon={FileJson} label="Blog Comments" page="blog-comments" moduleKey="Content" />
      <SubmenuItem icon={FileJson} label="Blog Tags" page="blog-tags" moduleKey="Content" />
    </>
  );

  const locationItems = (
    <>
      <SubmenuItem icon={MapPin} label="Location" page="location" moduleKey="Content" />
    </>
  );

  const contentItems = (
    <>
      <SubmenuItem icon={FileText} label="Pages" page="pages" moduleKey="Content" />
      <MenuSection
        title="Blog"
        items={blogItems}
        expanded={expandedMenus.blog}
        onToggle={() => toggleMenu('blog')}
      />
      <MenuSection
        title="Location"
        items={locationItems}
        expanded={expandedMenus.location}
        onToggle={() => toggleMenu('location')}
      />
      <SubmenuItem icon={MessageSquare} label="Testimonials" page="testimonials" moduleKey="Content" />
      <SubmenuItem icon={HelpCircle} label="FAQ" page="faq" moduleKey="Content" />
    </>
  );

  const settingsItems = (
    <>
      <SubmenuItem icon={Settings} label="General Settings" moduleKey="Roles" />
      <SubmenuItem icon={Settings} label="Website Settings" moduleKey="Roles" />
      <SubmenuItem icon={Settings} label="System Settings" moduleKey="Roles" />
      <SubmenuItem icon={Settings} label="Financial Settings" moduleKey="Roles" />
    </>
  );

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-border-light overflow-y-auto transition-smooth z-40 shadow-lg ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 lg:static lg:shadow-none`}
      >
        {/* Logo */}
        <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-center bg-white">
          <div className="flex items-center gap-2">
            <img
              src="/codigix-logo.png"
              alt="Codigix"
              className="h-8 w-auto object-contain"
            />
          </div>
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Search */}


        {/* Menu Content */}
        <div className="p-2 space-y-4">
          {/* Main Menu Items */}
          <div className="space-y-1">
            {mainMenuItems}
          </div>

        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={toggleSidebar}
          className="sidebar-overlay fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden animate-fade-in"
        />
      )}
    </>
  );
};

export default Sidebar;
