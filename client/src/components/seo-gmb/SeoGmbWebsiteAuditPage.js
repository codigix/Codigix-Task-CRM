import React, { useState, useEffect } from 'react';
import SeoGmbProjectSelector from './SeoGmbProjectSelector';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {

  CheckCircle, ChevronRight, Edit3, MoreHorizontal, ArrowUpRight, ArrowDownRight,
  Search, Bell, Calendar, MessageSquare, Plus, FileText, Globe, Sliders, ChevronDown,
  Check, Target, Zap, Link, MapPin, Users, Lock, Server, Trash2, ClipboardList, Info, Shield, HelpCircle,
  Activity, TrendingUp, AlertTriangle, AlertCircle, RefreshCw, X
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Phone = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

/* ── Static Data ── */
const HISTORY_DATA = [];

const CRAWL_STATUS_DATA = [];

const CATEGORIES_DATA = [];

const INITIAL_ISSUES = {
  technical: [
    { id: 'tech-1', type: '404 Page Not Found', detail: 'URL: /services/old-crm-migration', priority: 'Critical', fixed: false },
    { id: 'tech-2', type: '500 Server Error', detail: 'Database connection timeout on /api/leads/sync', priority: 'Critical', fixed: false },
    { id: 'tech-3', type: 'Soft 404 Error', detail: 'Empty listing pages return 200 OK status codes.', priority: 'Warning', fixed: false }
  ],
  'on-page': [
    { id: 'onpage-1', type: 'Missing Meta Description', detail: 'Pages: /about, /features/enterprise-erp', priority: 'Critical', fixed: false },
    { id: 'onpage-2', type: 'Title Tag Too Long', detail: 'Page: /contact-us - "Contact TechNova Solutions Pvt Ltd for ERP Implementation Services in CA"', priority: 'Warning', fixed: false },
    { id: 'onpage-3', type: 'Missing Image Alt Tag', detail: '14 images on home page lack descriptive alt attributes.', priority: 'Warning', fixed: false }
  ],
  'seo-tech': [
    { id: 'seotech-1', type: 'Missing Hreflang Tag', detail: 'No language alternate declarations found for /es/ or /fr/', priority: 'Warning', fixed: false },
    { id: 'seotech-2', type: 'Malformed Breadcrumb List', detail: 'Invalid item ID url format inside Schema script.', priority: 'Warning', fixed: false }
  ],
  mobile: [
    { id: 'mob-1', type: 'Tap Targets Too Close', detail: 'Buttons on mobile slider widget are within 4px bounds.', priority: 'Warning', fixed: false },
    { id: 'mob-2', type: 'Font Size Too Small', detail: 'Sidebar links footer text is under 11px rendering size.', priority: 'Warning', fixed: false }
  ],
  'core-vitals': [
    { id: 'cv-1', type: 'Largest Contentful Paint (LCP) > 2.5s', detail: 'Home page LCP is 3.1s due to unoptimized hero image assets.', priority: 'Critical', fixed: false },
    { id: 'cv-2', type: 'Cumulative Layout Shift (CLS)', detail: 'Ad script inserts cause a CLS shift index of 0.18.', priority: 'Warning', fixed: false }
  ],
  speed: [
    { id: 'speed-1', type: 'Render Blocking Resources', detail: '3 CSS sheets and 2 JS bundles blocking above-the-fold render.', priority: 'Warning', fixed: false },
    { id: 'speed-2', type: 'Unused CSS/JS', detail: 'Remove unused code to save 480KB resource size.', priority: 'Warning', fixed: false }
  ],
  ssl: [],
  robots: [
    { id: 'rob-1', type: 'Missing Sitemap Reference', detail: 'No Sitemap: URL directive defined in robots.txt.', priority: 'Warning', fixed: false }
  ],
  sitemap: [],
  canonical: [
    { id: 'can-1', type: 'Duplicate Canonical Tags', detail: '2 canonical URLs found in head on /services/cloud-solutions.', priority: 'Warning', fixed: false }
  ],
  index: [
    { id: 'idx-1', type: 'Excluded by noindex tag', detail: '12 valid content pages have meta name="robots" content="noindex".', priority: 'Critical', fixed: false }
  ],
  'crawl-errors': [
    { id: 'ce-1', type: 'Server connection timeout', detail: 'Googlebot request encountered 504 gateway timeout on /reports/pdf.', priority: 'Critical', fixed: false }
  ],
  'broken-links': [
    { id: 'bl-1', type: 'Broken internal link', detail: 'Anchor "Learn more" points to invalid URL /our-careers-list.', priority: 'Warning', fixed: false }
  ],
  redirects: [
    { id: 'red-1', type: 'Redirect chain', detail: 'Home redirects /home -> /index.php -> /index.html.', priority: 'Warning', fixed: false }
  ],
  schema: [
    { id: 'sch-1', type: 'Invalid localBusiness format', detail: 'Missing geo coordinates inside LocalBusiness schema.', priority: 'Warning', fixed: false }
  ]
};

export default function SeoGmbWebsiteAuditPage() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [retestLoading, setRetestLoading] = useState(false);
  const [retestSuccess, setRetestSuccess] = useState(false);
  const [activeSidebarItem, setActiveSidebarItem] = useState('Website Audit');
  const [project, setProject] = useState(null);
  const [categoryScores, setCategoryScores] = useState(
    CATEGORIES_DATA.reduce((acc, c) => ({ ...acc, [c.id]: c.score }), {})
  );
  const [auditLoading, setAuditLoading] = useState(false);
  const [lastAuditTime, setLastAuditTime] = useState('May 15, 2026 10:30 AM');
  const [auditStep, setAuditStep] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [categoryIssues, setCategoryIssues] = useState(INITIAL_ISSUES);

  const handleFixIssue = (catId, issueId) => {
    setCategoryIssues(prev => {
      const list = prev[catId] || [];
      const updated = list.map(iss => iss.id === issueId ? { ...iss, fixed: true } : iss);
      return { ...prev, [catId]: updated };
    });
    setCategoryScores(prev => {
      const current = prev[catId] || 90;
      return { ...prev, [catId]: Math.min(100, current + 5) };
    });
  };

  const handleRunNewAudit = () => {
    setAuditLoading(true);
    setAuditStep('Crawling sitemaps & robots.txt...');
    setTimeout(() => {
      setAuditStep('Scanning response status codes & redirects...');
      setTimeout(() => {
        setAuditStep('Measuring core web vitals LCP & CLS indexes...');
        setTimeout(() => {
          setAuditStep('Validating schema markups & alt attributes...');
          setTimeout(() => {
            setAuditLoading(false);
            setLastAuditTime(new Date().toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }));
            // Update scores randomly slightly higher or lower
            setCategoryScores(prev => {
              const next = { ...prev };
              Object.keys(next).forEach(k => {
                const diff = Math.floor(Math.random() * 7) - 2; // -2 to +4
                next[k] = Math.min(100, Math.max(50, next[k] + diff));
              });
              return next;
            });
            alert('Full Website Audit Scan Completed successfully! Updated diagnostic health indexes across 15 validation categories.');
          }, 800);
        }, 800);
      }, 800);
    }, 800);
  };

  const handleDownloadReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to download/print the PDF report.");
      return;
    }

    const projectTitle = project?.name || 'TechNova Solutions';
    const companyName = project?.company_name || projectTitle;
    const domain = currentDomain;
    const managerName = project?.manager || 'Emma Johnson';
    const auditTimeStr = lastAuditTime;

    // Calculate dynamic scores from state
    const scores = Object.values(categoryScores);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) || 87;

    const technicalScore = categoryScores['technical'] || 90;
    const onpageScore = categoryScores['on-page'] || 85;
    const corevitalsScore = categoryScores['core-vitals'] || 75;
    const mobileScore = categoryScores['mobile'] || 92;
    const sslScore = categoryScores['ssl'] || 100;
    const speedScore = categoryScores['speed'] || 78;
    const robotsScore = categoryScores['robots'] || 95;

    // Collect list of active issues from state
    const currentActiveIssues = [];
    Object.keys(categoryIssues).forEach(catKey => {
      categoryIssues[catKey].forEach(iss => {
        if (!iss.fixed) {
          currentActiveIssues.push({
            name: iss.type,
            priority: iss.priority,
            desc: iss.detail,
            recommendation: iss.priority === 'Critical' ? 'Fix or redirect URL immediately' : 'Optimize tag markup'
          });
        }
      });
    });

    // Populate dynamic issue rows (or fall back to defaults if empty)
    const issuesRows = currentActiveIssues.slice(0, 6);
    if (issuesRows.length < 6) {
      const fallbacks = [
        { name: '4XX (Not Found) Errors', priority: 'Critical', desc: 'URL: /services/old-crm-migration', recommendation: 'Fix or redirect 404 pages' },
        { name: 'Missing Canonical Tags', priority: 'Warning', desc: 'Pages: /about, /features/enterprise-erp', recommendation: 'Add canonical tags' },
        { name: 'Duplicate Title Tags', priority: 'Warning', desc: 'Pages: /contact-us - duplicate title headings', recommendation: 'Optimize title tags' },
        { name: 'Duplicate Content', priority: 'Warning', desc: 'Blogs list - rewrite unoriginal content', recommendation: 'Use canonical or rewrite' },
        { name: 'Blocked by Robots.txt', priority: 'Low', desc: 'Sitemap blocks search bots crawling directories', recommendation: 'Review robots.txt' },
        { name: 'Missing Alt Text', priority: 'Low', desc: '14 images on home page lack alt attributes', recommendation: 'Add alt text to images' }
      ];
      while (issuesRows.length < 6) {
        issuesRows.push(fallbacks[issuesRows.length]);
      }
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Website Audit Report - www.${domain}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      color: #1e293b;
      font-size: 11px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      height: 297mm;
      background: white;
      margin: 0 auto;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      box-sizing: border-box;
      display: flex;
      position: relative;
      overflow: hidden;
    }
    .page-break {
      page-break-before: always;
    }
    /* Sidebar styling */
    .sidebar {
      width: 220px;
      background-color: #0b1a30;
      color: white;
      padding: 24px 20px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .logo-circle {
      width: 24px;
      height: 24px;
      background-color: #2563eb;
      border-radius: 50%;
    }
    .logo-text {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .logo-sub {
      font-size: 8px;
      color: #94a3b8;
    }
    .report-title {
      font-size: 26px;
      font-weight: 800;
      line-height: 1.1;
      margin-top: 40px;
      letter-spacing: -0.5px;
    }
    .sidebar-domain {
      color: #3b82f6;
      font-weight: 600;
      font-size: 10px;
      margin-top: 8px;
      word-break: break-all;
    }
    .meta-list {
      margin-top: 60px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .meta-item-label {
      font-size: 8px;
      color: #94a3b8;
      text-transform: ;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .meta-item-val {
      font-size: 11px;
      font-weight: 700;
      color: white;
    }
    .sidebar-footer {
      font-size: 8px;
      color: #64748b;
      font-weight: 500;
    }

    /* Main body styling */
    .main-body {
      flex: 1;
      padding: 24px 24px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      background-color: white;
    }
    .section-header {
      font-size: 11px;
      font-weight: 800;
      text-transform: ;
      letter-spacing: 0.8px;
      color: #0f172a;
      border-bottom: 1.5px solid #f1f5f9;
      padding-bottom: 4px;
      margin-bottom: 12px;
      margin-top: 14px;
    }
    .executive-row {
      display: grid;
      grid-template-columns: 1.2fr 1fr 1.2fr;
      gap: 16px;
      align-items: start;
    }
    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .info-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-icon {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      background-color: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
    }
    .info-text {
      display: flex;
      flex-direction: column;
    }
    .info-label {
      font-size: 8px;
      color: #64748b;
      font-weight: 500;
    }
    .info-val {
      font-size: 9.5px;
      font-weight: 700;
      color: #1e293b;
    }
    
    /* Circle Gauge */
    .score-circle-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .score-circle {
      position: relative;
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .score-circle-text {
      position: absolute;
      text-align: center;
    }
    .score-circle-num {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1;
    }
    .score-circle-label {
      font-size: 8px;
      color: #64748b;
    }
    .score-badge {
      background-color: #10b981;
      color: white;
      font-weight: 700;
      padding: 3px 12px;
      border-radius: 12px;
      font-size: 9px;
      margin-top: 6px;
      text-align: center;
    }
    
    /* Breakdown progress bars */
    .breakdown-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .breakdown-row {
      display: flex;
      flex-direction: column;
    }
    .breakdown-info {
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
      font-weight: 600;
      margin-bottom: 2px;
      color: #475569;
    }
    .breakdown-track {
      background-color: #f1f5f9;
      height: 4.5px;
      border-radius: 3px;
      overflow: hidden;
    }
    .breakdown-bar {
      height: 100%;
      border-radius: 3px;
    }

    /* Key metrics grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 6px;
      margin-top: 6px;
    }
    .metric-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 4px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .metric-icon {
      font-size: 12px;
      margin-bottom: 4px;
    }
    .metric-label {
      font-size: 7.5px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 4px;
      font-weight: 500;
    }
    .metric-val {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
    }
    .metric-change {
      font-size: 7.5px;
      font-weight: 700;
      margin-top: 2px;
    }
    .change-up { color: #10b981; }
    .change-down { color: #ef4444; }

    /* Layout lower row split */
    .lower-split {
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 16px;
      margin-top: 14px;
      flex: 1;
    }
    .issues-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8px;
    }
    .issues-table th {
      background-color: #f8fafc;
      color: #64748b;
      font-weight: 600;
      text-transform: ;
      padding: 6px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    .issues-table td {
      padding: 6px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .severity-badge {
      padding: 1.5px 5px;
      border-radius: 3px;
      font-weight: 700;
      font-size: 7.5px;
    }
    .sev-critical { background-color: #fee2e2; color: #ef4444; }
    .sev-warning { background-color: #fef3c7; color: #d97706; }
    .sev-low { background-color: #f1f5f9; color: #64748b; }

    /* Core Web Vitals layout */
    .cwv-row {
      display: flex;
      justify-content: space-between;
      gap: 6px;
    }
    .cwv-card {
      flex: 1;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px;
      text-align: center;
      background-color: #fafafa;
    }
    .cwv-label {
      font-size: 7.5px;
      color: #64748b;
      font-weight: 500;
    }
    .cwv-val {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      margin: 2px 0;
    }
    .cwv-badge {
      font-size: 7px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 4px;
      display: inline-block;
    }
    .cwv-good { background-color: #d1fae5; color: #065f46; }
    .cwv-impr { background-color: #fef3c7; color: #92400e; }

    /* Trend chart mockup */
    .trend-chart-mock {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px;
      margin-top: 10px;
      background-color: #fafafa;
      position: relative;
    }
    .trend-title {
      font-size: 8px;
      color: #475569;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .trend-lines {
      height: 45px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      padding: 0 4px;
    }
    .trend-bar-group {
      display: flex;
      gap: 2px;
      height: 100%;
      align-items: flex-end;
    }
    .trend-bar {
      width: 6px;
      border-radius: 2px 2px 0 0;
    }

    /* Page 2 details */
    .full-row-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-top: 12px;
    }
    .grid-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px;
      background-color: #f8fafc;
    }
    .grid-box-header {
      font-size: 9px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 6px;
      text-transform: ;
      letter-spacing: 0.3px;
    }
    .grid-box-row {
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
      margin-bottom: 4px;
      color: #475569;
    }
    .grid-box-val {
      font-weight: 700;
      color: #0f172a;
    }

    .recommendations-col {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .rec-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px;
      border: 1px solid #f1f5f9;
      background-color: #fafafa;
      border-radius: 4px;
    }
    .rec-info {
      font-size: 8px;
      color: #334155;
    }
    
    .signature-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      margin-top: 16px;
      align-items: flex-end;
    }
    .sig-block {
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      margin-top: 30px;
      display: inline-block;
      width: 140px;
    }
    .qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .qr-img {
      width: 50px;
      height: 50px;
      border: 1px solid #cbd5e1;
      padding: 3px;
      border-radius: 4px;
    }
    
    /* Footer styles */
    .footer-bar {
      display: flex;
      justify-content: space-between;
      background-color: #0b1a30;
      color: white;
      padding: 6px 12px;
      font-size: 7.5px;
      margin-top: auto;
      box-sizing: border-box;
      width: 100%;
    }
    .footer-bar span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Print specific optimization to fit inside paper height */
    @media print {
      body {
        background-color: white;
      }
      .page {
        margin: 0;
        box-shadow: none;
        page-break-after: always;
        height: 297mm;
      }
    }
  </style>
</head>
<body>

  <!-- ======================== PAGE 1 ======================== -->
  <div class="page">
    <!-- Left Sidebar -->
    <div class="sidebar">
      <div>
        <div class="logo-container">
          <div class="logo-circle"></div>
          <div>
            <div class="logo-text">YOUR LOGO</div>
            <div class="logo-sub">Tagline Goes Here</div>
          </div>
        </div>
        <div class="report-title">WEBSITE<br/>AUDIT<br/>REPORT</div>
        <div class="sidebar-domain">www.${domain}</div>
        
        <div class="meta-list">
          <div>
            <div class="meta-item-label">Client Name</div>
            <div class="meta-item-val">${companyName}</div>
          </div>
          <div>
            <div class="meta-item-label">Prepared By</div>
            <div class="meta-item-val">Codigix Infotech Pvt. Ltd.</div>
          </div>
          <div>
            <div class="meta-item-label">SEO Consultant</div>
            <div class="meta-item-val">${managerName}</div>
          </div>
          <div>
            <div class="meta-item-label">Audit Date</div>
            <div class="meta-item-val">${auditTimeStr}</div>
          </div>
          <div>
            <div class="meta-item-label">Report Version</div>
            <div class="meta-item-val">v1.0</div>
          </div>
        </div>
      </div>
      <div class="sidebar-footer">
        © 2026 Codigix Infotech. Confidential.
      </div>
    </div>

    <!-- Main Content Panel -->
    <div class="main-body">
      <!-- Executive Summary -->
      <div class="section-header">Executive Summary</div>
      <div class="executive-row">
        <!-- Site Details -->
        <div class="info-grid">
          <div class="info-row">
            <div class="info-icon">🌐</div>
            <div class="info-text">
              <span class="info-label">Website</span>
              <span class="info-val">www.${domain}</span>
            </div>
          </div>
          <div class="info-row">
            <div class="info-icon">📈</div>
            <div class="info-text">
              <span class="info-label">Industry</span>
              <span class="info-val">Digital Marketing</span>
            </div>
          </div>
          <div class="info-row">
            <div class="info-icon">⚙️</div>
            <div class="info-text">
              <span class="info-label">CMS</span>
              <span class="info-val">WordPress</span>
            </div>
          </div>
          <div class="info-row">
            <div class="info-icon">📍</div>
            <div class="info-text">
              <span class="info-label">Server Location</span>
              <span class="info-val">United States</span>
            </div>
          </div>
          <div class="info-row">
            <div class="info-icon">📅</div>
            <div class="info-text">
              <span class="info-label">Audit Date</span>
              <span class="info-val">${auditTimeStr}</span>
            </div>
          </div>
        </div>

        <!-- Overall Score Ring -->
        <div class="score-circle-container">
          <div class="score-circle">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f5f9" stroke-width="6" />
              <circle cx="40" cy="40" r="34" fill="none" stroke="#10b981" stroke-width="6"
                stroke-dasharray="213.6" stroke-dashoffset="${213.6 - (213.6 * avgScore) / 100}"
                stroke-linecap="round" transform="rotate(-90 40 40)" />
            </svg>
            <div class="score-circle-text">
              <div class="score-circle-num">${avgScore}</div>
              <div class="score-circle-label">/100</div>
            </div>
          </div>
          <div style="font-size: 7.5px; font-weight:700; color:#64748b; text-transform:; margin-top:2px;">Overall SEO Score</div>
          <div class="score-badge">Good</div>
        </div>

        <!-- Score Breakdown Bars -->
        <div class="breakdown-list">
          <div class="breakdown-row">
            <div class="breakdown-info">
              <span>Technical SEO</span>
              <span>${technicalScore}/100</span>
            </div>
            <div class="breakdown-track">
              <div class="breakdown-bar" style="background-color:#3b82f6; width:${technicalScore}%;"></div>
            </div>
          </div>
          <div class="breakdown-row">
            <div class="breakdown-info">
              <span>On-Page SEO</span>
              <span>${onpageScore}/100</span>
            </div>
            <div class="breakdown-track">
              <div class="breakdown-bar" style="background-color:#10b981; width:${onpageScore}%;"></div>
            </div>
          </div>
          <div class="breakdown-row">
            <div class="breakdown-info">
              <span>Core Web Vitals</span>
              <span>${corevitalsScore}/100</span>
            </div>
            <div class="breakdown-track">
              <div class="breakdown-bar" style="background-color:#f59e0b; width:${corevitalsScore}%;"></div>
            </div>
          </div>
          <div class="breakdown-row">
            <div class="breakdown-info">
              <span>Mobile Usability</span>
              <span>${mobileScore}/100</span>
            </div>
            <div class="breakdown-track">
              <div class="breakdown-bar" style="background-color:#8b5cf6; width:${mobileScore}%;"></div>
            </div>
          </div>
          <div class="breakdown-row">
            <div class="breakdown-info">
              <span>HTTPS & SSL</span>
              <span>${sslScore}/100</span>
            </div>
            <div class="breakdown-track">
              <div class="breakdown-bar" style="background-color:#06b6d4; width:${sslScore}%;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Website Overview Grid -->
      <div class="section-header">Website Overview (Key Metrics)</div>
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="metric-icon">📄</span>
          <span class="metric-label">Total Pages</span>
          <span class="metric-val">235</span>
          <span class="metric-change change-up">▲ 12</span>
        </div>
        <div class="metric-card">
          <span class="metric-icon">✅</span>
          <span class="metric-label">Indexed Pages</span>
          <span class="metric-val">198</span>
          <span class="metric-change change-up">▲ 8</span>
        </div>
        <div class="metric-card">
          <span class="metric-icon">⚠️</span>
          <span class="metric-label">Crawl Errors</span>
          <span class="metric-val">23</span>
          <span class="metric-change change-down">▼ 5</span>
        </div>
        <div class="metric-card">
          <span class="metric-icon">🔗</span>
          <span class="metric-label">Broken Links</span>
          <span class="metric-val">42</span>
          <span class="metric-change change-down">▼ 7</span>
        </div>
        <div class="metric-card">
          <span class="metric-icon">🌐</span>
          <span class="metric-label">Backlinks</span>
          <span class="metric-val">1,248</span>
          <span class="metric-change change-up">▲ 116</span>
        </div>
        <div class="metric-card">
          <span class="metric-icon">🏆</span>
          <span class="metric-label">Domain Authority</span>
          <span class="metric-val">45</span>
          <span class="metric-change change-up">▲ 3</span>
        </div>
        <div class="metric-card">
          <span class="metric-icon">📈</span>
          <span class="metric-label">Organic Traffic</span>
          <span class="metric-val">12.5K</span>
          <span class="metric-change change-up">▲ 18.6%</span>
        </div>
        <div class="metric-card">
          <span class="metric-icon">🔑</span>
          <span class="metric-label">Keywords</span>
          <span class="metric-val">1,236</span>
          <span class="metric-change change-up">▲ 92</span>
        </div>
      </div>

      <!-- Split section: Issues Table + Core Web Vitals -->
      <div class="lower-split">
        <!-- Issues table left -->
        <div>
          <div style="font-size: 10px; font-weight:800; text-transform:; color:#0f172a; margin-bottom:8px;">Top Technical Issues</div>
          <table class="issues-table">
            <thead>
              <tr>
                <th>Issue</th>
                <th>Severity</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              ${issuesRows.map(row => `
                <tr>
                  <td style="font-weight:700;">${row.name}</td>
                  <td>
                    <span class="severity-badge ${row.priority === 'Critical' ? 'sev-critical' : row.priority === 'Warning' ? 'sev-warning' : 'sev-low'}">
                      ${row.priority}
                    </span>
                  </td>
                  <td>${row.recommendation}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Core Web Vitals right -->
        <div>
          <div style="font-size: 10px; font-weight:800; text-transform:; color:#0f172a; margin-bottom:8px;">Core Web Vitals</div>
          <div class="cwv-row">
            <div class="cwv-card">
              <div class="cwv-label">LCP</div>
              <div class="cwv-val">2.1s</div>
              <span class="cwv-badge cwv-good">Good</span>
            </div>
            <div class="cwv-card">
              <div class="cwv-label">CLS</div>
              <div class="cwv-val">0.08</div>
              <span class="cwv-badge cwv-good">Good</span>
            </div>
            <div class="cwv-card">
              <div class="cwv-label">INP</div>
              <div class="cwv-val">190ms</div>
              <span class="cwv-badge cwv-impr">Improve</span>
            </div>
          </div>
          
          <div class="trend-chart-mock">
            <div class="trend-title">Core Web Vitals Trend (Last 30 Days)</div>
            <div class="trend-lines">
              <div class="trend-bar-group" style="height: 45%;">
                <div class="trend-bar" style="background-color:#3b82f6; height:100%;"></div>
                <div class="trend-bar" style="background-color:#10b981; height:60%;"></div>
              </div>
              <div class="trend-bar-group" style="height: 65%;">
                <div class="trend-bar" style="background-color:#3b82f6; height:100%;"></div>
                <div class="trend-bar" style="background-color:#10b981; height:70%;"></div>
              </div>
              <div class="trend-bar-group" style="height: 55%;">
                <div class="trend-bar" style="background-color:#3b82f6; height:100%;"></div>
                <div class="trend-bar" style="background-color:#10b981; height:80%;"></div>
              </div>
              <div class="trend-bar-group" style="height: 80%;">
                <div class="trend-bar" style="background-color:#3b82f6; height:100%;"></div>
                <div class="trend-bar" style="background-color:#10b981; height:90%;"></div>
              </div>
              <div class="trend-bar-group" style="height: 90%;">
                <div class="trend-bar" style="background-color:#3b82f6; height:100%;"></div>
                <div class="trend-bar" style="background-color:#10b981; height:95%;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bar">
        <span>📞 +91 12345 67890</span>
        <span>✉️ info@codigix.com</span>
        <span>🌐 www.codigix.com</span>
        <span>📍 Pune, Maharashtra, India</span>
      </div>
    </div>
  </div>

  <!-- ======================== PAGE 2 ======================== -->
  <div class="page page-break">
    <!-- Left Sidebar -->
    <div class="sidebar">
      <div>
        <div class="logo-container">
          <div class="logo-circle"></div>
          <div>
            <div class="logo-text">YOUR LOGO</div>
            <div class="logo-sub">Tagline Goes Here</div>
          </div>
        </div>
        <div class="report-title">WEBSITE<br/>AUDIT<br/>REPORT</div>
        <div class="sidebar-domain">www.${domain}</div>
        
        <div class="meta-list">
          <div>
            <div class="meta-item-label">Client Name</div>
            <div class="meta-item-val">${companyName}</div>
          </div>
          <div>
            <div class="meta-item-label">SEO Consultant</div>
            <div class="meta-item-val">${managerName}</div>
          </div>
          <div>
            <div class="meta-item-label">Report ID</div>
            <div class="meta-item-val">AUD-928A</div>
          </div>
        </div>
      </div>
      <div class="sidebar-footer">
        © 2026 Codigix Infotech. Confidential.
      </div>
    </div>

    <!-- Main Content Panel Page 2 -->
    <div class="main-body">
      <div class="section-header">Technical Infrastructure Grids</div>
      
      <div class="full-row-grid">
        <div class="grid-box">
          <div class="grid-box-header">Index Coverage</div>
          <div class="grid-box-row"><span>Indexed</span><span class="grid-box-val">198</span></div>
          <div class="grid-box-row"><span>Excluded</span><span class="grid-box-val">24</span></div>
          <div class="grid-box-row"><span>Blocked</span><span class="grid-box-val">6</span></div>
          <div class="grid-box-row"><span>Noindex</span><span class="grid-box-val">7</span></div>
        </div>
        
        <div class="grid-box">
          <div class="grid-box-header">Robots.txt</div>
          <div class="grid-box-row"><span>Status</span><span class="grid-box-val" style="color:#10b981; font-weight:800;">Valid</span></div>
          <div class="grid-box-row"><span>Rules</span><span class="grid-box-val">${robotsScore > 90 ? 12 : 8}</span></div>
          <div class="grid-box-row"><span>Blocked URLs</span><span class="grid-box-val">6</span></div>
          <div class="grid-box-row"><span>Warnings</span><span class="grid-box-val">0</span></div>
        </div>

        <div class="grid-box">
          <div class="grid-box-header">XML Sitemap</div>
          <div class="grid-box-row"><span>Sitemaps</span><span class="grid-box-val">2</span></div>
          <div class="grid-box-row"><span>Submitted</span><span class="grid-box-val">2</span></div>
          <div class="grid-box-row"><span>Indexed URL</span><span class="grid-box-val">198</span></div>
          <div class="grid-box-row"><span>Errors</span><span class="grid-box-val">0</span></div>
        </div>

        <div class="grid-box">
          <div class="grid-box-header">HTTPS & SSL</div>
          <div class="grid-box-row"><span>SSL Status</span><span class="grid-box-val" style="color:#10b981; font-weight:800;">Valid</span></div>
          <div class="grid-box-row"><span>Protocol</span><span class="grid-box-val">TLS 1.3</span></div>
          <div class="grid-box-row"><span>Security Grade</span><span class="grid-box-val" style="color:#10b981; font-weight:800;">A+</span></div>
        </div>

        <div class="grid-box">
          <div class="grid-box-header">Broken Links</div>
          <div class="grid-box-row"><span>Internal</span><span class="grid-box-val">12</span></div>
          <div class="grid-box-row"><span>External</span><span class="grid-box-val">30</span></div>
          <div class="grid-box-row"><span>Total Broken</span><span class="grid-box-val">42</span></div>
        </div>
      </div>

      <div class="section-header">Top Keywords By Position</div>
      <table class="issues-table" style="font-size: 8.5px; margin-top:4px;">
        <thead>
          <tr style="background-color:#fafafa;">
            <th>Keyword</th>
            <th style="text-align:center;">Position</th>
            <th style="text-align:center;">Previous</th>
            <th style="text-align:right;">Volume</th>
            <th style="text-align:right;">CPC (INR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight:700;">digital marketing services</td>
            <td style="text-align:center; font-weight:800; color:#10b981;">1</td>
            <td style="text-align:center;">1</td>
            <td style="text-align:right;">14,800</td>
            <td style="text-align:right;">₹ 256.00</td>
          </tr>
          <tr>
            <td style="font-weight:700;">best seo services</td>
            <td style="text-align:center; font-weight:800; color:#3b82f6;">3</td>
            <td style="text-align:center;">4</td>
            <td style="text-align:right;">9,900</td>
            <td style="text-align:right;">₹ 180.00</td>
          </tr>
          <tr>
            <td style="font-weight:700;">content marketing strategies</td>
            <td style="text-align:center; font-weight:800; color:#3b82f6;">5</td>
            <td style="text-align:center;">6</td>
            <td style="text-align:right;">4,400</td>
            <td style="text-align:right;">₹ 120.00</td>
          </tr>
          <tr>
            <td style="font-weight:700;">local map seo services</td>
            <td style="text-align:center; font-weight:800; color:#10b981;">2</td>
            <td style="text-align:center;">2</td>
            <td style="text-align:right;">6,600</td>
            <td style="text-align:right;">₹ 140.00</td>
          </tr>
          <tr>
            <td style="font-weight:700;">ppc management solutions</td>
            <td style="text-align:center; font-weight:800; color:#d97706;">7</td>
            <td style="text-align:center;">8</td>
            <td style="text-align:right;">3,600</td>
            <td style="text-align:right;">₹ 310.00</td>
          </tr>
        </tbody>
      </table>

      <div class="section-header">Top Recommendations</div>
      <div class="lower-split" style="grid-template-columns: 1.3fr 1fr; margin-top:4px;">
        <div class="recommendations-col">
          <div class="rec-item">
            <span class="rec-info"><strong>Fix 4XX Errors:</strong> Redirect /services/old-crm-migration to valid page bounds.</span>
            <span class="severity-badge sev-critical">High</span>
          </div>
          <div class="rec-item">
            <span class="rec-info"><strong>Add Canonical Tags:</strong> Resolve double index URLs for /about and /pricing.</span>
            <span class="severity-badge sev-warning">Medium</span>
          </div>
          <div class="rec-item">
            <span class="rec-info"><strong>Optimize Alt Image Tags:</strong> Add alternative descriptions on all home page image assets.</span>
            <span class="severity-badge sev-low">Low</span>
          </div>
        </div>

        <div class="signature-row" style="margin-top:0px;">
          <div>
            <div style="font-size: 8.5px; font-weight:700; color:#334155; line-height: 1.5;">
              The website exhibits standard structure setup, but technical index gaps and missing meta tags remain the primary barriers to better local search rankings. Fixing these recommendations immediately will significantly boost visibility.
            </div>
            <div class="sig-block">
              <div style="font-weight:800; font-size:9.5px; color:#0f172a;">${managerName}</div>
              <div style="font-size:7.5px; color:#64748b;">SEO Director / PM</div>
            </div>
          </div>
          
          <div class="qr-container">
            <img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://www.${domain}" alt="QR code" />
            <span style="font-size: 7px; color: #64748b; font-weight: 700; margin-top: 4px; text-align: center;">Scan to view live dashboard report</span>
          </div>
        </div>
      </div>

      <div class="footer-bar">
        <span>📞 +91 12345 67890</span>
        <span>✉️ info@codigix.com</span>
        <span>🌐 www.codigix.com</span>
        <span>📍 Pune, Maharashtra, India</span>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() {
          window.close();
        }, 1000);
      }, 500);
    };
  </script>
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const loadProjectData = async (proj) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${proj.id}`);
      if (response.ok) {
        const pData = await response.json();
        setProject(pData);
      }
    } catch (err) {
      console.error('Error loading project details for audit:', err);
    }
  };

  const handleProjectChange = (proj) => {
    loadProjectData(proj);
  };

  const currentProjectName = project ? project.name : 'TechNova Solutions';
  const currentDomain = project ? project.name.toLowerCase().replace(/ /g, '') + '.com' : 'technova.com';

  // Category specific diagnostics
  const getCategoryDetails = (id) => {
    const list = categoryIssues[id] || [];
    switch (id) {
      case 'technical':
        return {
          title: 'Technical Audit Diagnostics',
          desc: 'Scans technical indexing status codes, server responses, and loop structures.',
          issues: list
        };
      case 'on-page':
        return {
          title: 'On-Page Audit Diagnostics',
          desc: 'Evaluates content length, title lengths, and search engine meta description headers.',
          issues: list
        };
      case 'seo-tech':
        return {
          title: 'Technical SEO diagnostics',
          desc: 'Reviews Breadcrumb lists, Hreflang localizations, and structural schema scripts.',
          issues: list
        };
      case 'mobile':
        return {
          title: 'Mobile Usability Details',
          desc: 'Reviews mobile viewport adaptability and font readability scores.',
          issues: list
        };
      case 'core-vitals':
        return {
          title: 'Core Web Vitals Metrics',
          desc: 'Diagnostic data based on real user experience metric scores.',
          issues: list
        };
      case 'speed':
        return {
          title: 'Page Speed Diagnostics',
          desc: 'Page load speeds and assets loading.',
          issues: list
        };
      case 'ssl':
        return {
          title: 'HTTPS & SSL parameters',
          desc: 'Validates SSL certificate issuing details and protocol layers.',
          issues: list
        };
      case 'robots':
        return {
          title: 'Robots.txt Details',
          desc: 'Robots file status validation checks.',
          issues: list
        };
      case 'sitemap':
        return {
          title: 'XML Sitemap Details',
          desc: 'Sitemap status and validation checks.',
          issues: list
        };
      case 'canonical':
        return {
          title: 'Canonical URLs check',
          desc: 'Canonical tag implementations check.',
          issues: list
        };
      case 'index':
        return {
          title: 'Index Coverage Details',
          desc: 'Indexed vs non-indexed status details.',
          issues: list
        };
      case 'crawl-errors':
        return {
          title: 'Crawl Errors Log',
          desc: 'Crawl errors and server issues log.',
          issues: list
        };
      case 'broken-links':
        return {
          title: 'Broken Links Suggestions',
          desc: 'Broken links and suggestions index.',
          issues: list
        };
      case 'redirects':
        return {
          title: 'Redirect Manager diagnostics',
          desc: 'Redirects, redirect chains and loops.',
          issues: list
        };
      case 'schema':
        return {
          title: 'Schema Validation logs',
          desc: 'Structured data validation logs.',
          issues: list
        };
      default:
        return {
          title: 'Audit Diagnostics Summary',
          desc: 'Troubleshoot critical parameters and optimization warnings.',
          issues: list
        };
    }
  };

  const handleOpenDrawer = (catId) => {
    setSelectedCategory(catId);
    setRetestSuccess(false);
  };

  const runCategoryRetest = (catId) => {
    setRetestLoading(true);
    setTimeout(() => {
      setRetestLoading(false);
      setRetestSuccess(true);
      // Dynamically upgrade score for the category
      setCategoryScores(prev => ({
        ...prev,
        [catId]: Math.min(prev[catId] + 5, 100)
      }));
    }, 2000);
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans flex relative">
      {/* ── Full Page Audit Loading Overlay ── */}
      {auditLoading && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center gap-4 border border-slate-100">
            <RefreshCw size={40} className="text-blue-600 animate-spin" />
            <h3 className="text-sm font-extrabold text-slate-900 m-0">Running Automated Audit Scan</h3>
            <p className="text-xs text-slate-400 m-0">{auditStep}</p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-blue-600 animate-[pulse_1.5s_infinite]" style={{ width: '70%' }} />
            </div>
          </div>
        </div>
      )}



      {/* ── Main Content Area ── */}
      <div className="flex-1 p-6 overflow-y-auto">

        {/* Top Header Controls */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <h1 className="text-xl  text-slate-900 m-0">Website Audit</h1>
            <SeoGmbProjectSelector onProjectChange={handleProjectChange} />
          </div>
          <div className="flex gap-3">
            <button onClick={handleDownloadReport} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer">
              <FileText size={14} /> Download Report
            </button>
            <button onClick={handleRunNewAudit} className="bg-blue-500 hover:bg-blue-600 border-none text-white rounded p-2 text-xs  flex items-center gap-1.5 cursor-pointer transition-colors">
              <RefreshCw size={14} /> Run New Audit
            </button>
          </div>
        </div>

        {/* ── Grid Row: Audit Overview + Statistics Summary ── */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {/* Card 1: Audit Overview */}
          <div className="col-span-2 bg-white rounded-2xl p-2 border border-slate-200 flex justify-between items-center gap-6">
            <div className="flex gap-4 items-center">
              {/* Site preview mockup thumbnail */}
              <div className="w-32 h-20 bg-slate-100 border border-slate-200 rounded shrink-0 overflow-hidden flex items-center justify-center relative ">
                <Globe size={32} className="text-slate-300" />
                <div className="absolute bottom-1 left-1 right-1 bg-white/85 text-[8px] text-center  text-slate-600 truncate py-0.5 rounded border border-slate-200">
                  {currentDomain}
                </div>
              </div>
              <div>
                <h2 className="text-lg  text-slate-900 m-0">www.{currentDomain}</h2>
                <div className="text-xs text-slate-400 mt-1">https://www.{currentDomain}</div>
                <div className="text-xs text-slate-500 mt-2 font-medium">Last Audit: {lastAuditTime}</div>
                <button onClick={() => setShowHistory(!showHistory)} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded p-2 text-xs  mt-3 cursor-pointer">
                  {showHistory ? 'Hide Audit History' : 'View Previous Audits'}
                </button>
              </div>
            </div>

            {/* Circular Overall Score Gauge using SVG */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#F1F5F9" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#10B981" strokeWidth="8"
                  strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * 87) / 100}
                  strokeLinecap="round" transform="rotate(-90 50 50)" />
              </svg>
              <div className="absolute text-center">
                <div className="text-xl font-extrabold text-slate-900">87<span className="text-xs text-slate-400 ">/100</span></div>
                <div className="text-[8px] text-green-500  tracking-wide mt-0.5">Overall Score</div>
                <div className="text-[8px] text-green-500 font-extrabold">Good</div>
              </div>
            </div>
          </div>

          {/* Stats blocks on the right */}
          <div className="col-span-1 grid grid-cols-2 gap-3.5">
            {[
              { label: 'Total Pages Crawled', value: '1,245', icon: FileText, color: 'text-blue-500 bg-blue-50 border-blue-100' },
              { label: 'Total Issues Found', value: '312', icon: AlertTriangle, color: 'text-red-500 bg-red-50 border-red-100' },
              { label: 'Critical Issues', value: '23', icon: AlertCircle, color: 'text-red-600 bg-red-50 border-red-200' },
              { label: 'Warnings', value: '145', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
            ].map((stat, i) => (
              <div key={i} className={`border rounded p-3 px-4 flex items-center gap-3 ${stat.color}`}>
                <div className="bg-white/95 rounded w-8 h-8 flex items-center justify-center  shrink-0">
                  <stat.icon size={16} />
                </div>
                <div>
                  <div className="text-[9px] text-slate-500  leading-normal">{stat.label}</div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">{stat.value}</div>
                </div>
              </div>
            ))}
            {/* Full span passed checks */}
            <div className="col-span-2 border rounded p-3 px-4 bg-emerald-50 text-emerald-600 border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/95 rounded w-8 h-8 flex items-center justify-center ">
                  <CheckCircle size={16} className="text-emerald-500" />
                </div>
                <div>
                  <div className="text-[9px] text-slate-500  leading-normal">Passed Checks</div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">1,077</div>
                </div>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-xs  px-2 py-0.5 rounded">All Cleared</span>
            </div>
          </div>
        </div>

        {/* ── Middle Grid Section: Audit Summary Chart + Top Issues + Crawl Status Donut ── */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {/* Card 1: Audit Summary LineChart */}
          <div className="bg-white rounded-2xl p-2 border border-slate-200 col-span-1">
            <h3 className="text-sm  text-slate-900 m-0 mb-4">Audit Summary</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={HISTORY_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="Critical" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Warnings" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Passed" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Total" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
            {/* Chart Legends */}
            <div className="flex justify-around text-[9px]  text-slate-500 mt-4 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Warnings</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Passed</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Total</div>
            </div>
          </div>

          {/* Card 2: Top Issues list */}
          <div className="bg-white rounded-2xl p-2 border border-slate-200 col-span-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm  text-slate-900 m-0">Top Issues</h3>
                <button className="bg-none border-none text-blue-500 text-xs  cursor-pointer hover:underline">View All Issues</button>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { name: 'Meta description is missing', count: 48, status: 'Critical', bg: 'bg-red-50 text-red-600' },
                  { name: 'Title tag is missing', count: 32, status: 'Critical', bg: 'bg-red-50 text-red-600' },
                  { name: 'Duplicate titles', count: 28, status: 'Warning', bg: 'bg-amber-50 text-amber-600' },
                  { name: 'Multiple H1 tags', count: 18, status: 'Warning', bg: 'bg-amber-50 text-amber-600' },
                  { name: 'Image alt text missing', count: 45, status: 'Warning', bg: 'bg-amber-50 text-amber-600' },
                ].map((issue, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                    <span className="font-medium text-slate-700 truncate pr-4">{issue.name}</span>
                    <span className={`text-xs  px-2 py-0.5 rounded-md ${issue.bg}`}>{issue.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <button className="bg-transparent border-none text-blue-500 hover:text-blue-700 text-left text-xs  cursor-pointer flex items-center gap-1 mt-4">
              See all issues &rarr;
            </button>
          </div>

          {/* Card 3: Crawl Status Donut chart */}
          <div className="bg-white rounded-2xl p-2 border border-slate-200 col-span-1">
            <h3 className="text-sm  text-slate-900 m-0 mb-4">Crawl Status</h3>
            <div className="flex items-center justify-around">
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <PieChart width={110} height={110}>
                  <Pie data={CRAWL_STATUS_DATA} cx={51} cy={51} innerRadius={35} outerRadius={48} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                    {CRAWL_STATUS_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
                <div className="absolute text-center">
                  <div className="text-base font-extrabold text-slate-900">1,245</div>
                  <div className="text-[8px] text-slate-400 ">Pages Crawled</div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {CRAWL_STATUS_DATA.map((stat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stat.color }} />
                    <span className="text-xs text-slate-500 w-16 truncate">{stat.name}</span>
                    <span className="text-xs  text-slate-900">{stat.value} ({stat.pct})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Grid Section: 15 Audit Categories cards ── */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-sm  text-slate-900 m-0 mb-4">Audit Categories</h3>
          <div className="grid grid-cols-3 gap-4">
            {CATEGORIES_DATA.map((c) => {
              const currentScore = categoryScores[c.id] || c.score;
              return (
                <div key={c.id} className="border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover: hover:border-slate-300 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 border ${c.color.split(' ')[1]} ${c.color.split(' ')[0]} ${c.color.split(' ')[2]}`}>
                        <c.icon size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs  text-slate-900 m-0">{c.title}</h4>
                        <p className="text-xs text-slate-400 leading-normal m-0 mt-0.5 truncate max-w-[160px]">{c.desc}</p>
                      </div>
                    </div>
                    {/* Right Arrow button triggers Drawer */}
                    <button
                      onClick={() => handleOpenDrawer(c.id)}
                      className="bg-transparent border-none text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="flex justify-between items-end mt-4">
                    <div>
                      {(() => {
                        const list = categoryIssues[c.id] || [];
                        const unfixedCount = list.filter(iss => !iss.fixed).length;
                        const hasIssues = list.length > 0;
                        const isAllFixed = hasIssues && unfixedCount === 0;
                        const displayLabel = !hasIssues || isAllFixed || currentScore === 100 ? 'All Good' : `${unfixedCount} issue${unfixedCount > 1 ? 's' : ''}`;
                        const badgeColor = !hasIssues || isAllFixed || currentScore === 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600';
                        return (
                          <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${badgeColor}`}>
                            {displayLabel}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Circular miniature score outline */}
                    <div className="relative w-8 h-8 flex items-center justify-center">
                      <svg width="32" height="32" viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r="13" fill="none" stroke="#F1F5F9" strokeWidth="2.5" />
                        <circle cx="16" cy="16" r="13" fill="none" stroke={c.circleColor} strokeWidth="2.5"
                          strokeDasharray="81.6" strokeDashoffset={81.6 - (81.6 * currentScore) / 100}
                          strokeLinecap="round" transform="rotate(-90 16 16)" />
                      </svg>
                      <span className="absolute text-[8px]  text-slate-900">{currentScore}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tip info text at bottom of page */}
        <div className="flex gap-2 items-center bg-blue-50 border border-blue-100 rounded p-3 px-4 mt-5">
          <Info size={15} className="text-blue-600 shrink-0" />
          <span className="text-xs text-blue-900 font-medium">
            Tip: Fixing critical issues should be your top priority. These issues impact your site's visibility and user experience the most.
          </span>
        </div>

      </div>

      {/* ── Right-side Half-screen Slide-out Drawer (Modal) ── */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop Overlay */}
          <div
            className="absolute inset-0 bg-black/30 transition-opacity"
            onClick={() => setSelectedCategory(null)}
          />

          {/* Drawer container (exactly w-1/2 width) */}
          <div className="relative w-1/2 h-full bg-white shadow-2xl flex flex-col justify-between z-10 animate-slide-in">
            {/* Header info */}
            <div className="p-2 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-base  text-slate-900 m-0">
                  {getCategoryDetails(selectedCategory).title}
                </h2>
                <p className="text-xs text-slate-500 leading-normal m-0 mt-1">
                  {getCategoryDetails(selectedCategory).desc}
                </p>
              </div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="bg-transparent border-none text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Diagnostics and flow content body */}
            <div className="flex-1 p-6 overflow-y-auto">
              {/* Score widget */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-500  block">Diagnostics Health Index</span>
                  <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                    {categoryScores[selectedCategory]}/100
                  </span>
                </div>
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <svg width="50" height="50" viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="21" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                    <circle cx="25" cy="25" r="21" fill="none" stroke="#3B82F6" strokeWidth="4"
                      strokeDasharray="131.9" strokeDashoffset={131.9 - (131.9 * categoryScores[selectedCategory]) / 100}
                      strokeLinecap="round" transform="rotate(-90 25 25)" />
                  </svg>
                  <span className="absolute text-xs  text-slate-900">{categoryScores[selectedCategory]}</span>
                </div>
              </div>

              {/* Retest status block */}
              {retestLoading && (
                <div className="bg-blue-50 border border-blue-100 text-blue-700 rounded p-4 mb-6 flex items-center gap-3">
                  <RefreshCw size={18} className="animate-spin text-blue-500 shrink-0" />
                  <span className="text-xs ">Running simulated audits, indexing validation protocols, and response headers scan...</span>
                </div>
              )}

              {retestSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded p-4 mb-6 flex items-center gap-3">
                  <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                  <div>
                    <strong className="text-xs block">Retest Simulation Complete!</strong>
                    <span className="text-xs mt-0.5 block">Identified technical elements resolved. Diagnostic index score increased +5.</span>
                  </div>
                </div>
              )}

              {/* Category-specific diagnostic issues table */}
              <h3 className="text-sm  text-slate-900 m-0 mb-3">Diagnostic Issues Registry</h3>
              {(() => {
                const issuesList = getCategoryDetails(selectedCategory).issues || [];
                const activeIssues = issuesList.filter(iss => !iss.fixed);
                const hasActiveIssues = activeIssues.length > 0;

                if (issuesList.length === 0 || !hasActiveIssues) {
                  return (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded p-4 text-center text-xs text-emerald-700 ">
                      <CheckCircle size={28} className="mx-auto text-emerald-500 mb-2" />
                      All tests passed cleanly! No optimizations required.
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-3">
                    {issuesList.map((iss, idx) => (
                      <div key={idx} className={`border rounded p-4 flex items-start justify-between gap-4 transition-all duration-300 ${iss.fixed ? 'opacity-65 border-emerald-200 bg-emerald-50/10' : 'border-slate-100 bg-slate-50/40'}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs  ${iss.fixed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{iss.type}</span>
                            <span className={`text-[9px]  px-2 py-0.5 rounded ${iss.fixed ? 'bg-slate-100 text-slate-450' : iss.priority === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}>{iss.priority}</span>
                            {iss.fixed && (
                              <span className="bg-emerald-100 text-emerald-800 text-[9px] px-2 py-0.5 rounded flex items-center gap-0.5 ">
                                <Check size={10} /> Fixed
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 leading-normal m-0 mt-1.5">{iss.detail}</p>
                        </div>

                        {!iss.fixed && (
                          <button
                            onClick={() => handleFixIssue(selectedCategory, iss.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs  rounded px-2.5 py-1.5 cursor-pointer shrink-0 transition-colors border-none  flex items-center gap-1"
                          >
                            Fix Issue
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Drawer actions footer */}
            <div className="p-2 border-t border-slate-200 flex justify-between bg-slate-50/50">
              <button
                onClick={() => setSelectedCategory(null)}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded p-2 text-xs  cursor-pointer"
              >
                Close Panel
              </button>
              <button
                onClick={() => runCategoryRetest(selectedCategory)}
                disabled={retestLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded p-2 text-xs  cursor-pointer border-none flex items-center gap-1.5 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <RefreshCw size={14} className={retestLoading ? 'animate-spin' : ''} />
                Run Retest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
