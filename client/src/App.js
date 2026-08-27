import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/common/ProtectedRoute';
import DepartmentRoute from './components/common/DepartmentRoute';
import LoginPage from './components/common/LoginPage';
import SignupPage from './components/common/SignupPage';
import SSOLogin from './components/common/SSOLogin';
import Layout from './components/common/Layout';
import DealsDashboard from './components/sales/DealsDashboard';
import LeadsDashboard from './components/sales/LeadsDashboard';
import ProjectsDashboard from './components/common/ProjectsDashboard';
import ProjectDetailsPage from './components/common/ProjectDetailsPage';
import ContactsPage from './components/common/ContactsPage';
import CrmCompaniesPage from './components/common/CrmCompaniesPage';
import AddCompanyPage from './components/common/AddCompanyPage';
import CrmDealsPage from './components/sales/CrmDealsPage';
import CrmLeadsPage from './components/sales/CrmLeadsPage';
import CrmPipelinePage from './components/sales/CrmPipelinePage';
import CrmCampaignPage from './components/common/CrmCampaignPage';
import CrmProjectsPage from './components/common/CrmProjectsPage';
import CompanyDetailsPage from './components/common/CompanyDetailsPage';
import ChatPage from './components/common/ChatPage';
import VideoCallPage from './components/common/VideoCallPage';
import ITTasksPage from './components/it/ITTasksPage';
import ITKanbanPage from './components/it/ITKanbanPage';
import MarketingKanbanPage from './components/marketing/MarketingKanbanPage';
import ITAnalyticsPage from './components/it/ITAnalyticsPage';
import ITActivitiesPage from './components/it/ITActivitiesPage';
import ITUploadDocumentPage from './components/it/ITUploadDocumentPage';
import ITFileManagerPage from './components/it/ITFileManagerPage';
import ITCalendarPage from './components/it/ITCalendarPage';
import ITNotesPage from './components/it/ITNotesPage';
import ITTesterDashboard from './components/it/ITTesterDashboard';
import CreateNotePage from './components/common/CreateNotePage';



import ITChatPage from './components/it/ITChatPage';
import AudioCallPage from './components/common/AudioCallPage';
import CallHistoryPage from './components/common/CallHistoryPage';
import CalendarPage from './components/common/CalendarPage';
import EmailPage from './components/common/EmailPage';
import TodoPage from './components/common/TodoPage';
import TasksPage from './components/common/TasksPage';
import ProposalsPage from './components/common/ProposalsPage';
import ContractsPage from './components/common/ContractsPage';
import NotesPage from './components/common/NotesPage';
import FileManagerPage from './components/common/FileManagerPage';
import SocialFeedPage from './components/common/SocialFeedPage';
import KanbanPage from './components/common/KanbanPage';
import InvoicesPage from './components/common/InvoicesPage';
import PaymentsPage from './components/common/PaymentsPage';
import PaymentDetailsPage from './components/common/PaymentDetailsPage';
import SuperAdminDashboard from './components/super-admin/SuperAdminDashboard';
import Companies from './components/common/Companies';
import Subscriptions from './components/super-admin/Subscriptions';
import Packages from './components/super-admin/Packages';
import Domain from './components/super-admin/Domain';
import PurchaseTransaction from './components/super-admin/PurchaseTransaction';
import SalesDashboard from './components/sales/SalesDashboard';
import EstimationsPage from './components/common/EstimationsPage';
import ActivitiesPage from './components/common/ActivitiesPage';
import FollowupsPage from './components/common/FollowupsPage';
import AnalyticsPage from './components/common/AnalyticsPage';
import WorkloadReportPage from './components/common/WorkloadReportPage';
import LeadReport from './components/sales/LeadReport';
import DealReport from './components/sales/DealReport';
import ContactReportsPage from './components/common/ContactReportsPage';
import CompanyReportsPage from './components/common/CompanyReportsPage';
import ProjectReportsPage from './components/common/ProjectReportsPage';
import TaskReportsPage from './components/common/TaskReportsPage';
import ContactDetailsPage from './components/common/ContactDetailsPage';
import RolesPermissionsPage from './components/common/RolesPermissionsPage';
import DeleteAccountRequestPage from './components/common/DeleteAccountRequestPage';
import MembershipPlansPage from './components/super-admin/MembershipPlansPage';
import MembershipAddonsPage from './components/super-admin/MembershipAddonsPage';
import MembershipTransactionsPage from './components/super-admin/MembershipTransactionsPage';
import PagesPage from './components/common/PagesPage';
import AllBlogsPage from './components/marketing/AllBlogsPage';
import BlogCategoriesPage from './components/marketing/BlogCategoriesPage';
import BlogCommentsPage from './components/marketing/BlogCommentsPage';
import BlogTagsPage from './components/marketing/BlogTagsPage';
import ManageUsersPage from './components/common/ManageUsersPage';
import RolePermissionsDetailPage from './components/common/RolePermissionsDetailPage';
import TaskDetailsPage from './components/common/TaskDetailsPage';
import LeadDetailsPage from './components/sales/LeadDetailsPage';
import LeadDistributionPage from './components/sales/LeadDistributionPage';
import DealsKanbanBoard from './components/sales/DealsKanbanBoard';
import DealDetailsPage from './components/sales/DealDetailsPage';
import QuotationsPage from './components/sales/QuotationsPage';
import CustomersPage from './components/common/CustomersPage';
import SalesTargetsPage from './components/sales/SalesTargetsPage';
import PerformancePage from './components/sales/PerformancePage';
import CommissionPage from './components/sales/CommissionPage';
import ApprovalsPage from './components/sales/ApprovalsPage';
import SalesReportsPage from './components/sales/SalesReportsPage';
import NotificationsPage from './components/common/NotificationsPage';
import BacklogPage from './components/common/BacklogPage';
import ProfileSettingsPage from './components/common/ProfileSettingsPage';
import DepartmentsPage from './components/common/DepartmentsPage';
import AutomationRulesPage from './components/common/AutomationRulesPage';
import SeoGmbPage from './components/seo-gmb/SeoGmbPage';
import RevenueForecastPage from './components/sales/RevenueForecastPage';
import MarketingDashboard from './components/marketing/MarketingDashboard';
import SeoGmbProjectsPage from './components/seo-gmb/SeoGmbProjectsPage';
import SeoGmbProjectSetupPage from './components/seo-gmb/SeoGmbProjectSetupPage';
import SeoGmbWebsiteAuditPage from './components/seo-gmb/SeoGmbWebsiteAuditPage';
import SeoGmbKeywordManagementPage from './components/seo-gmb/SeoGmbKeywordManagementPage';
import SeoGmbOnPageSeoPage from './components/seo-gmb/SeoGmbOnPageSeoPage';
import SeoGmbContentMarketingPage from './components/seo-gmb/SeoGmbContentMarketingPage';
import SeoGmbOffPageSeoPage from './components/seo-gmb/SeoGmbOffPageSeoPage';
import SeoGmbGmbProfilePage from './components/seo-gmb/SeoGmbGmbProfilePage';
import SeoGmbGoogleIntegrationsPage from './components/seo-gmb/SeoGmbGoogleIntegrationsPage';
import SeoGmbRankTrackingPage from './components/seo-gmb/SeoGmbRankTrackingPage';
import SeoGmbReportsPage from './components/seo-gmb/SeoGmbReportsPage';
import SeoGmbDocumentsPage from './components/seo-gmb/SeoGmbDocumentsPage';
import SeoGmbAutomationPage from './components/seo-gmb/SeoGmbAutomationPage';
import SeoGmbGeoOptimizationPage from './components/seo-gmb/SeoGmbGeoOptimizationPage';
import SeoGmbAiContentGenerationPage from './components/seo-gmb/SeoGmbAiContentGenerationPage';
import SeoGmbPredictiveAnalysisPage from './components/seo-gmb/SeoGmbPredictiveAnalysisPage';
import SeoGmbLocationIntelligencePage from './components/seo-gmb/SeoGmbLocationIntelligencePage';

import ITTeamsPage from './components/it/ITTeamsPage';
import ITManagerDashboard from './components/it/ITManagerDashboard';
import ITBugTrackingPage from './components/it/ITBugTrackingPage';
import ITTestCasesPage from './components/it/ITTestCasesPage';
import ITRepositoriesPage from './components/it/ITRepositoriesPage';
import HRDashboard from './components/hr/HRDashboard';
import HREmployees from './components/hr/HREmployees';
import HRAttendance from './components/hr/HRAttendance';
import HRLeaveRequests from './components/hr/HRLeaveRequests';
import HRRecruitment from './components/hr/HRRecruitment';
import HRPerformance from './components/hr/HRPerformance';
import HRPayroll from './components/hr/HRPayroll';

// Shared modules across departments
const SHARED_MODULES = [
  'calendar', 'tasks', 'followups', 'analytics', 'reports', 
  'dashboard', 'list', 'details', 'kanban', 'quotations', 
  'customers', 'targets', 'performance', 'commission', 'leads-distribution',
  'contacts', 'companies', 'campaign', 'proposals', 'contracts', 
  'estimations', 'invoices', 'payments', 'activities', 'chat',
  'video-call', 'audio-call', 'call-history', 'email', 'todo', 
  'notes', 'file-manager', 'social-feed', 'seo-gmb'
];

const DEPARTMENTS = ['deals', 'leads', 'projects', 'sales', 'super-admin', 'marketing', 'it', 'seo-gmb', 'hr'];

const routeMap = {
  '/': 'dashboard-router',
  ...DEPARTMENTS.reduce((acc, dept) => {
    SHARED_MODULES.forEach(module => {
      acc[`/${dept}/${module}`] = module === 'dashboard' ? `${dept}-dashboard` : module;
    });
    return acc;
  }, {}),
  
  // Custom overrides for mapping
  '/deals/dashboard': 'deals-dashboard',
  '/leads/dashboard': 'leads-dashboard',
  '/sales/dashboard': 'sales-dashboard',
  '/projects/dashboard': 'projects-dashboard',
  '/deals/list': 'deals-list',
  '/leads/list': 'leads',
  '/projects/list': 'projects',
  '/projects/details': 'project-details',
  '/deals/kanban': 'deals-kanban',
  '/sales/targets': 'sales-targets',
  '/sales/reports': 'sales-reports',
  
  // Specific routes
  '/deals/deal/:id': 'deal-details',
  '/leads/lead/:id': 'lead-details',
  '/lead/:id': 'lead-details',
  '/task/:taskId': 'task-details',
  '/payment/:invoiceId': 'payment-details',
  
  // Global / Shared
  '/notifications': 'notifications',
  '/profile-settings': 'profile-settings',
  '/departments': 'departments',
  '/automation-rules': 'automation-rules',
  '/contacts': 'contacts',
  '/contact-details': 'contact-details',
  '/companies': 'companies',
  '/add-company': 'add-company',
  '/company-details': 'company-details',
  '/pipeline': 'pipeline',
  '/campaign': 'campaign',
  '/estimations': 'estimations',
  '/it/chat': 'it-chat',
  '/it/teams': 'it-teams',
  '/it/repositories': 'it-repositories',
  '/it/it-manager-dashboard': 'it-manager-dashboard',
  '/seo-gmb/dashboard': 'dashboard',
  '/seo-gmb/projects': 'projects',
  '/seo-gmb/project-setup': 'project-setup',
  '/seo-gmb/website-audit': 'website-audit',
  '/seo-gmb/keyword-management': 'keyword-management',
  '/seo-gmb/on-page-seo': 'on-page-seo',
  '/seo-gmb/content-marketing': 'content-marketing',
  '/seo-gmb/off-page-seo': 'off-page-seo',
  '/seo-gmb/gmb-profile': 'gmb-profile',
  '/seo-gmb/google-posts': 'google-posts',
  '/seo-gmb/customer-engagement': 'customer-engagement',
  '/seo-gmb/media-management': 'media-management',
  '/seo-gmb/local-seo': 'local-seo',
  '/seo-gmb/google-integrations': 'google-integrations',
  '/seo-gmb/rank-tracking': 'rank-tracking',
  '/seo-gmb/tasks': 'tasks',
  '/seo-gmb/reports': 'reports',
  '/seo-gmb/documents': 'documents',
  '/seo-gmb/automation': 'automation',
  '/seo-gmb/profile-settings': 'profile-settings',
  '/seo-gmb/geo-optimization': 'geo-optimization',
  '/seo-gmb/ai-content-generation': 'ai-content-generation',
  '/seo-gmb/predictive-analysis': 'predictive-analysis',
  '/seo-gmb/location-intelligence': 'location-intelligence',

  '/video-call': 'video-call',
  '/audio-call': 'audio-call',
  '/call-history': 'call-history',
  '/email': 'email',
  '/todo': 'todo',
  '/tasks': 'tasks',
  '/proposals': 'proposals',
  '/contracts': 'contracts',
  '/notes': 'notes',
  '/file-manager': 'file-manager',
  '/social-feed': 'social-feed',
  '/kanban': 'kanban',
  '/invoices': 'invoices',
  '/payments': 'payments',
  '/activities': 'activities',
  '/followups': 'followups',
  '/analytics': 'analytics',
  '/lead-report': 'lead-report',
  '/deal-report': 'deal-report',
  '/contact-report': 'contact-report',
  '/company-report': 'company-report',
  '/project-report': 'project-report',
  '/task-report': 'task-report',
  '/manage-users': 'manage-users',
  '/roles-permissions': 'roles-permissions',
  '/role-permissions-detail': 'role-permissions-detail',
  '/delete-request': 'delete-request',
  '/membership': 'membership',
  '/membership-plans': 'membership-plans',
  '/membership-addons': 'membership-addons',
  '/membership-transactions': 'membership-transactions',
  '/pages': 'pages',
  '/all-blogs': 'all-blogs',
  '/blog-categories': 'blog-categories',
  '/blog-comments': 'blog-comments',
  '/blog-tags': 'blog-tags',
  '/blog': 'blog',
  '/location': 'location',
  '/testimonials': 'testimonials',
  '/faq': 'faq',
  
  // Super Admin
  '/super-admin': 'super-admin',
  '/super-admin/companies': 'super-admin-companies',
  '/super-admin/subscriptions': 'super-admin-subscriptions',
  '/super-admin/packages': 'super-admin-packages',
  '/super-admin/domain': 'super-admin-domain',
  '/super-admin/purchase-transaction': 'super-admin-purchase-transaction',
};

const DashboardRouter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const userNameValue = user.username || user.first_name || user.name || 'user';
    const username = userNameValue.toLowerCase().replace(/\s+/g, '-');
    
    const formatUrlSlug = (str) => {
      if (!str) return 'employee';
      return str.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    };
    const designation = user.role ? formatUrlSlug(user.role) : 'employee';

    const role = user.role || '';
    const dept = user.department || '';

    if (role === 'Super Admin') {
      navigate('/super-admin');
    } else if (dept.includes('Marketing')) {
      navigate(`/marketing/${designation}/${username}/dashboard`);
    } else if (dept.includes('SEO') || dept.includes('GMB')) {
      navigate(`/seo-gmb/${designation}/${username}/dashboard`);
    } else if (dept.includes('IT')) {
      navigate(`/it/${designation}/${username}/dashboard`);
    } else if (dept.includes('Account')) {
      navigate('/invoices');
    } else if (role.includes('HR')) {
      navigate(`/hr/${designation}/${username}/dashboard`);
    } else if (dept.includes('Sales') || dept.includes('Lead') || dept.includes('Deal')) {
      navigate(`/sales/${designation}/${username}/dashboard`);
    } else if (role === 'Admin' || role.includes('Sales') || role.includes('Lead') || role.includes('Deal')) {
      navigate(`/sales/${designation}/${username}/dashboard`);
    } else if (role.includes('SEO') || role.includes('GMB')) {
      navigate(`/seo-gmb/${designation}/${username}/dashboard`);
    } else if (role.includes('Marketing')) {
      navigate(`/marketing/${designation}/${username}/dashboard`);
    } else if (role.includes('IT')) {
      navigate(`/it/${designation}/${username}/dashboard`);
    } else if (role.includes('HR')) {
      navigate(`/hr/${designation}/${username}/dashboard`);
    } else {
      navigate(`/deals/${designation}/${username}/dashboard`);
    }
  }, [user, navigate]);

  return null;
};

const NavigateToLead = () => {
  const { id } = useParams();
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  
  const designation = user.role ? user.role.toLowerCase().replace(/\s+/g, '-') : 'employee';
  const username = user.name ? user.name.toLowerCase().replace(/\s+/g, '-') : 'user';
  
  return <Navigate to={`/leads/${designation}/${username}/lead/${id}`} replace />;
};

function AppContent() {
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [selectedDealId, setSelectedDealId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  const getPageFromPath = (pathname) => {
    // Extract the last segment as the module name if it exists, since urls are /dept/designation/username/module
    const parts = pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];

    // Handle dynamic routes by stripping IDs
    const cleanPath = pathname.split('/').map(part => {
      if (/^\d+$/.test(part) || (part.length > 20 && part.includes('-'))) {
        return ':id';
      }
      return part;
    }).join('/');
    
    // Check specific routeMap first, else fallback to the last segment of the URL, else deals-dashboard
    return routeMap[cleanPath] || routeMap[pathname] || lastPart || 'deals-dashboard';
  };

  const currentPage = getPageFromPath(location.pathname);
  const isVideoCall = location.pathname.includes('/video-call');
  const isChatPage = location.pathname.includes('/chat');

  useEffect(() => {
    if (location.state?.company) {
      setSelectedCompany(location.state.company);
    }
  }, [location.state?.company]);

  const handleViewProjectDetails = (projectId) => {
    setSelectedProjectId(projectId);
    navigate('/projects/details');
  };

  const handleBackFromProjectDetails = () => {
    setSelectedProjectId(null);
    navigate('/projects/dashboard');
  };

  const handleViewCompanyDetails = (company) => {
    setSelectedCompany(company);
    navigate('/company-details');
  };

  const handleBackFromCompanyDetails = () => {
    setSelectedCompany(null);
    navigate('/companies');
  };

  const handleBackFromContactDetails = () => {
    setSelectedContactId(null);
    navigate('/contacts');
  };

  const handleViewDealDetails = (deal) => {
    setSelectedDealId(deal.id);
    navigate(`/deals/deal/${deal.id}`);
  };

  const handleBackFromDealDetails = () => {
    setSelectedDealId(null);
    navigate('/deals/kanban');
  };

  const handleNavigate = (page) => {
    // If it's already a path, use it directly
    if (page.startsWith('/')) {
      navigate(page);
      return;
    }
    const routePath = Object.keys(routeMap).find(path => routeMap[path] === page) || '/';
    navigate(routePath);
  };

  return (
    <Layout 
      currentPage={currentPage} 
      onNavigate={handleNavigate}
      hideSidebar={isVideoCall || isChatPage}
      hideHeader={isVideoCall || isChatPage}
    >
      <Routes>
        <Route path="/" element={<DashboardRouter />} />
        <Route path="/deals/:designation/:username/dashboard" element={<DealsDashboard />} />
        <Route path="/deals/:designation/:username/kanban" element={<DealsKanbanBoard onDealClick={handleViewDealDetails} />} />
        <Route path="/deals/:designation/:username/analytics" element={<RevenueForecastPage />} />
        <Route path="/deals/:designation/:username/deal/:id" element={<LeadDetailsPage />} />
        <Route path="/sales/:designation/:username/dashboard" element={<SalesDashboard />} />
        <Route path="/sales/quotations" element={<QuotationsPage />} />
        <Route path="/sales/:designation/:username/quotations" element={<QuotationsPage />} />
        <Route path="/sales/:designation/:username/customers" element={<CustomersPage />} />
        <Route path="/sales/:designation/:username/targets" element={<SalesTargetsPage />} />
        <Route path="/sales/:designation/:username/performance" element={<PerformancePage />} />
        <Route path="/sales/:designation/:username/commission" element={<CommissionPage />} />
        <Route path="/sales/:designation/:username/approvals" element={<ApprovalsPage />} />
        <Route path="/sales/:designation/:username/reports" element={<SalesReportsPage />} />
        <Route path="/sales/:designation/:username/leads" element={<CrmLeadsPage />} />
        <Route path="/sales/:designation/:username/deals-list" element={<CrmDealsPage />} />
        <Route path="/sales/:designation/:username/contacts" element={<ContactsPage />} />
        <Route path="/sales/:designation/:username/distribution" element={<LeadDistributionPage />} />
        <Route path="/sales/:designation/:username/followups" element={<FollowupsPage />} />
        <Route path="/sales/:designation/:username/activities" element={<ActivitiesPage />} />
        <Route path="/sales/:designation/:username/chat" element={<ChatPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile-settings" element={<ProfileSettingsPage />} />
        <Route path="/departments" element={<DepartmentsPage />} />
        <Route path="/automation-rules" element={<AutomationRulesPage />} />
        <Route path="/leads/:designation/:username/dashboard" element={<LeadsDashboard />} />
        <Route path="/projects/:designation/:username/dashboard" element={<ProjectsDashboard onViewProjectDetails={handleViewProjectDetails} onViewCompanyDetails={handleViewCompanyDetails} />} />
        <Route path="/projects/:designation/:username/details" element={<ProjectDetailsPage projectId={selectedProjectId} onBack={handleBackFromProjectDetails} />} />
        <Route path="/deals/:designation/:username/list" element={<CrmDealsPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/contact-details" element={<ContactDetailsPage contactId={selectedContactId} onBack={handleBackFromContactDetails} />} />
        <Route path="/companies" element={<CrmCompaniesPage />} />
        <Route path="/add-company" element={<AddCompanyPage />} />
        <Route path="/company-details" element={<CompanyDetailsPage company={selectedCompany} onBack={handleBackFromCompanyDetails} />} />
        <Route path="/leads/:designation/:username/list" element={<CrmLeadsPage />} />
        <Route path="/leads/:designation/:username/leads-distribution" element={<LeadDistributionPage />} />
        <Route path="/leads/:designation/:username/lead/:id" element={<LeadDetailsPage />} />
        <Route path="/lead/:id" element={<NavigateToLead />} />
        <Route path="/leads/lead/:id" element={<LeadDetailsPage />} />
        <Route path="/deals/deal/:id" element={<LeadDetailsPage />} />
        <Route path="/task/:taskId" element={<TaskDetailsPage />} />
        <Route path="/pipeline" element={<CrmPipelinePage />} />
        <Route path="/campaign" element={<CrmCampaignPage />} />
        <Route path="/projects/:designation/:username/list" element={<CrmProjectsPage />} />
        <Route path="/estimations" element={<EstimationsPage />} />
        <Route path="/sales/:designation/:username/estimations" element={<EstimationsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/video-call" element={<VideoCallPage />} />
        <Route path="/video-call/:code" element={<VideoCallPage />} />
        <Route path="/audio-call" element={<AudioCallPage />} />
        <Route path="/call-history" element={<CallHistoryPage />} />
        
        {/* Dynamic calendar routes based on department */}
        <Route path="/deals/:designation/:username/calendar" element={<CalendarPage />} />
        <Route path="/leads/:designation/:username/calendar" element={<CalendarPage />} />
        <Route path="/projects/:designation/:username/calendar" element={<CalendarPage />} />
        <Route path="/sales/:designation/:username/calendar" element={<CalendarPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        
        <Route path="/projects/:designation/:username/seo-gmb" element={<SeoGmbPage />} />
        
        {/* Marketing Routes */}
        <Route path="/marketing/seo-gmb/:username/dashboard" element={<SeoGmbPage />} />
        <Route path="/marketing/:designation/:username/dashboard" element={<MarketingDashboard />} />
        <Route path="/marketing/:designation/:username/kanban" element={<MarketingKanbanPage />} />
        <Route path="/marketing/:designation/:username/backlog" element={<BacklogPage department="Marketing" />} />
        <Route path="/marketing/:designation/:username/list" element={<CrmProjectsPage department="Marketing" />} />
        <Route path="/marketing/:designation/:username/projects" element={<CrmProjectsPage department="Marketing" />} />
        <Route path="/marketing/:designation/:username/tasks" element={<TasksPage department="Marketing" />} />
        <Route path="/marketing/:designation/:username/seo-gmb" element={<SeoGmbPage />} />
        <Route path="/marketing/:designation/:username/campaign" element={<CrmCampaignPage department="Marketing" />} />
        <Route path="/marketing/:designation/:username/calendar" element={<CalendarPage department="Marketing" />} />
        <Route path="/marketing/:designation/:username/all-blogs" element={<AllBlogsPage />} />
        <Route path="/marketing/:designation/:username/file-manager" element={<FileManagerPage department="Marketing" />} />
        <Route path="/marketing/:designation/:username/analytics" element={<AnalyticsPage department="Marketing" />} />
        <Route path="/marketing/:designation/:username/reports" element={<WorkloadReportPage department="Marketing" />} />
        <Route path="/marketing/:designation/:username/activities" element={<ActivitiesPage department="Marketing" />} />
        <Route path="/marketing/:designation/:username/teams" element={<ITTeamsPage department="Marketing" />} />

        {/* SEO & GMB Department Routes */}
        <Route path="/seo-gmb/:designation/:username/dashboard" element={<SeoGmbPage mode="seo" tab="dashboard" />} />
        <Route path="/seo-gmb/:designation/:username/projects" element={<SeoGmbProjectsPage />} />
        <Route path="/seo-gmb/:designation/:username/project-setup" element={<SeoGmbProjectSetupPage />} />
        <Route path="/seo-gmb/:designation/:username/website-audit" element={<SeoGmbWebsiteAuditPage />} />
        <Route path="/seo-gmb/:designation/:username/keyword-management" element={<SeoGmbKeywordManagementPage />} />
        <Route path="/seo-gmb/:designation/:username/on-page-seo" element={<SeoGmbOnPageSeoPage />} />
        <Route path="/seo-gmb/:designation/:username/content-marketing" element={<SeoGmbContentMarketingPage />} />
        <Route path="/seo-gmb/:designation/:username/off-page-seo" element={<SeoGmbOffPageSeoPage />} />
        <Route path="/seo-gmb/:designation/:username/gmb-profile" element={<SeoGmbGmbProfilePage />} />
        <Route path="/seo-gmb/:designation/:username/google-posts" element={<SeoGmbPage mode="gmb" tab="google-posts" />} />
        <Route path="/seo-gmb/:designation/:username/customer-engagement" element={<SeoGmbPage mode="gmb" tab="customer-engagement" />} />
        <Route path="/seo-gmb/:designation/:username/media-management" element={<SeoGmbPage mode="gmb" tab="media-management" />} />
        <Route path="/seo-gmb/:designation/:username/local-seo" element={<SeoGmbPage mode="gmb" tab="local-seo" />} />
        <Route path="/seo-gmb/:designation/:username/google-integrations" element={<SeoGmbGoogleIntegrationsPage />} />
        <Route path="/seo-gmb/:designation/:username/rank-tracking" element={<SeoGmbRankTrackingPage />} />
        <Route path="/seo-gmb/:designation/:username/tasks" element={<TasksPage department="SEO" />} />
        <Route path="/seo-gmb/:designation/:username/calendar" element={<CalendarPage department="SEO" />} />
        <Route path="/seo-gmb/:designation/:username/reports" element={<SeoGmbReportsPage />} />
        <Route path="/seo-gmb/:designation/:username/documents" element={<SeoGmbDocumentsPage />} />
        <Route path="/seo-gmb/:designation/:username/automation" element={<SeoGmbAutomationPage />} />
        <Route path="/seo-gmb/:designation/:username/profile-settings" element={<ProfileSettingsPage />} />
        <Route path="/seo-gmb/:designation/:username/geo-optimization" element={<SeoGmbGeoOptimizationPage />} />
        <Route path="/seo-gmb/:designation/:username/ai-content-generation" element={<SeoGmbAiContentGenerationPage />} />
        <Route path="/seo-gmb/:designation/:username/predictive-analysis" element={<SeoGmbPredictiveAnalysisPage />} />
        <Route path="/seo-gmb/:designation/:username/location-intelligence" element={<SeoGmbLocationIntelligencePage />} />
        
        {/* IT Routes */}
        <Route path="/it/tester/:username/dashboard" element={<ITTesterDashboard />} />
        <Route path="/it/:designation/:username/dashboard" element={<ITManagerDashboard />} />
        <Route path="/it/:designation/:username/repositories" element={<ITRepositoriesPage />} />
        <Route path="/it/:designation/:username/projects" element={<CrmProjectsPage department="IT" />} />
        <Route path="/it/:designation/:username/tasks" element={<ITTasksPage />} />
        <Route path="/it/:designation/:username/kanban" element={<ITKanbanPage />} />
        <Route path="/it/:designation/:username/backlog" element={<BacklogPage department="IT" />} />
        <Route path="/it/:designation/:username/bugs" element={<ITBugTrackingPage />} />
        <Route path="/it/:designation/:username/bugs/:subpage" element={<ITBugTrackingPage />} />
        <Route path="/it/:designation/:username/test-cases" element={<ITTestCasesPage />} />
        <Route path="/it/:designation/:username/analytics" element={<ITAnalyticsPage />} />
        <Route path="/it/:designation/:username/reports" element={<WorkloadReportPage department="IT" />} />
        <Route path="/it/:designation/:username/activities" element={<ITActivitiesPage />} />
        <Route path="/it/:designation/:username/documents" element={<SeoGmbDocumentsPage />} />
        <Route path="/it/:designation/:username/documents/upload" element={<ITUploadDocumentPage />} />
        <Route path="/it/:designation/:username/calendar" element={<ITCalendarPage />} />
        <Route path="/it/:designation/:username/chat" element={<ITChatPage />} />
        <Route path="/it/:designation/:username/notes" element={<ITNotesPage />} />
        <Route path="/:dept/:designation/:username/notes/create" element={<CreateNotePage />} />
        <Route path="/it/:designation/:username/teams" element={<ITTeamsPage />} />
        <Route path="/it/:designation/:username/manager-dashboard" element={<ITManagerDashboard />} />
        
        {/* HR Routes */}
        <Route path="/hr/:designation/:username/dashboard" element={<HRDashboard />} />
        <Route path="/hr/:designation/:username/employees" element={<HREmployees />} />
        <Route path="/hr/:designation/:username/attendance" element={<HRAttendance />} />
        <Route path="/hr/:designation/:username/leaves" element={<HRLeaveRequests />} />
        <Route path="/hr/:designation/:username/recruitment" element={<HRRecruitment />} />
        <Route path="/hr/:designation/:username/performance" element={<HRPerformance />} />
        <Route path="/hr/:designation/:username/payroll" element={<HRPayroll />} />
        <Route path="/hr/:designation/:username/tasks" element={<TasksPage department="HR" />} />
        
        {/* Dynamic tasks routes based on department */}
        <Route path="/deals/:designation/:username/tasks" element={<TasksPage />} />
        <Route path="/leads/:designation/:username/tasks" element={<TasksPage />} />
        <Route path="/projects/:designation/:username/tasks" element={<TasksPage />} />
        <Route path="/sales/:designation/:username/tasks" element={<TasksPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        
        {/* Dynamic followups routes based on department */}
        <Route path="/deals/:designation/:username/followups" element={<FollowupsPage />} />
        <Route path="/leads/:designation/:username/followups" element={<FollowupsPage />} />
        <Route path="/projects/:designation/:username/followups" element={<FollowupsPage />} />
        <Route path="/sales/:designation/:username/followups" element={<FollowupsPage />} />
        <Route path="/followups" element={<FollowupsPage />} />
        
        {/* Dynamic analytics/reports routes based on department */}
        <Route path="/leads/:designation/:username/analytics" element={<AnalyticsPage />} />
        <Route path="/projects/:designation/:username/analytics" element={<AnalyticsPage />} />
        <Route path="/sales/:designation/:username/analytics" element={<AnalyticsPage />} />
        <Route path="/deals/:designation/:username/reports" element={<AnalyticsPage />} />
        <Route path="/leads/:designation/:username/reports" element={<AnalyticsPage />} />
        <Route path="/projects/:designation/:username/reports" element={<AnalyticsPage />} />
        <Route path="/sales/:designation/:username/reports" element={<SalesReportsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        
        {/* Dynamic routes for shared modules across departments */}
        {DEPARTMENTS.map(dept => (
          <React.Fragment key={dept}>
            <Route path={`/${dept}/:designation/:username/*`} element={<DepartmentRoute>
              <Routes>
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="companies" element={<CrmCompaniesPage />} />
                <Route path="campaign" element={<CrmCampaignPage />} />
                <Route path="proposals" element={<ProposalsPage />} />
                <Route path="contracts" element={<ContractsPage />} />
                <Route path="estimations" element={<EstimationsPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="activities" element={<ActivitiesPage />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="video-call" element={<VideoCallPage />} />
                <Route path="audio-call" element={<AudioCallPage />} />
                <Route path="call-history" element={<CallHistoryPage />} />
                <Route path="email" element={<EmailPage />} />
                <Route path="todo" element={<TodoPage />} />
                <Route path="notes" element={<NotesPage />} />
                <Route path="file-manager" element={<FileManagerPage />} />
                <Route path="social-feed" element={<SocialFeedPage />} />
                <Route path="kanban" element={<KanbanPage />} />
                <Route path="list" element={
                  dept === 'leads' ? <CrmLeadsPage /> :
                  dept === 'projects' ? <CrmProjectsPage /> :
                  <CrmDealsPage />
                } />
                <Route path="details/:id" element={<ProjectDetailsPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="quotations" element={<QuotationsPage />} />
                <Route path="targets" element={<SalesTargetsPage />} />
                <Route path="performance" element={<PerformancePage />} />
                <Route path="commission" element={<CommissionPage />} />
                <Route path="distribution" element={<LeadDistributionPage />} />
              </Routes>
            </DepartmentRoute>} />
          </React.Fragment>
        ))}
        
        <Route path="/email" element={<EmailPage />} />
        <Route path="/todo" element={<TodoPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/proposals" element={<ProposalsPage />} />
        <Route path="/contracts" element={<ContractsPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/file-manager" element={<FileManagerPage />} />
        <Route path="/social-feed" element={<SocialFeedPage />} />
        <Route path="/kanban" element={<KanbanPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/payment/:invoiceId" element={<PaymentDetailsPage />} />
        <Route path="/activities" element={<ActivitiesPage />} />
        <Route path="/followups" element={<FollowupsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/lead-report" element={<LeadReport />} />
        <Route path="/deal-report" element={<DealReport />} />
        <Route path="/contact-report" element={<ContactReportsPage />} />
        <Route path="/company-report" element={<CompanyReportsPage />} />
        <Route path="/project-report" element={<ProjectReportsPage />} />
        <Route path="/task-report" element={<TaskReportsPage />} />
        <Route path="/manage-users" element={<ManageUsersPage />} />
        <Route path="/roles-permissions" element={<RolesPermissionsPage />} />
        <Route path="/role-permissions-detail" element={<RolePermissionsDetailPage />} />
        <Route path="/delete-request" element={<DeleteAccountRequestPage />} />
        <Route path="/membership" element={<MembershipPlansPage />} />
        <Route path="/membership-plans" element={<MembershipPlansPage />} />
        <Route path="/membership-addons" element={<MembershipAddonsPage />} />
        <Route path="/membership-transactions" element={<MembershipTransactionsPage />} />
        <Route path="/pages" element={<PagesPage />} />
        <Route path="/all-blogs" element={<AllBlogsPage />} />
        <Route path="/blog-categories" element={<BlogCategoriesPage />} />
        <Route path="/blog-comments" element={<BlogCommentsPage />} />
        <Route path="/blog-tags" element={<BlogTagsPage />} />
        <Route path="/blog" element={<AllBlogsPage />} />
        <Route path="/location" element={<div className="p-2 bg-[#F7F8F9] min-h-screen"><div className="bg-white rounded p-3 "><h1 className="text-2xl  mb-4">Location</h1><p className="text-gray-600">Location page coming soon...</p></div></div>} />
        <Route path="/testimonials" element={<div className="p-2 bg-[#F7F8F9] min-h-screen"><div className="bg-white rounded p-3 "><h1 className="text-2xl  mb-4">Testimonials</h1><p className="text-gray-600">Testimonials page coming soon...</p></div></div>} />
        <Route path="/faq" element={<div className="p-2 bg-[#F7F8F9] min-h-screen"><div className="bg-white rounded p-3 "><h1 className="text-2xl  mb-4">FAQ</h1><p className="text-gray-600">FAQ page coming soon...</p></div></div>} />
        
        {/* Super Admin routes with new paths */}
        <Route path="/super-admin" element={<ProtectedRoute requiredRoles="Super Admin"><SuperAdminDashboard /></ProtectedRoute>} />
        <Route path="/super-admin/companies" element={<ProtectedRoute requiredRoles="Super Admin"><Companies /></ProtectedRoute>} />
        <Route path="/super-admin/subscriptions" element={<ProtectedRoute requiredRoles="Super Admin"><Subscriptions /></ProtectedRoute>} />
        <Route path="/super-admin/packages" element={<ProtectedRoute requiredRoles="Super Admin"><Packages /></ProtectedRoute>} />
        <Route path="/super-admin/domain" element={<ProtectedRoute requiredRoles="Super Admin"><Domain /></ProtectedRoute>} />
        <Route path="/super-admin/purchase-transaction" element={<ProtectedRoute requiredRoles="Super Admin"><PurchaseTransaction /></ProtectedRoute>} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/sso-login" element={<SSOLogin />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
