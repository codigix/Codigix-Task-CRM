const { checkPermission } = require('../middleware/helpers');

module.exports = function setupDepartmentDashboardRoutes(app, pool) {

  // 1. Admin Dashboard API
  app.get('/api/dashboard/admin', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Get system stats
      const [userStats] = await connection.query('SELECT COUNT(*) as totalUsers, SUM(CASE WHEN status = "Active" THEN 1 ELSE 0 END) as activeUsers FROM users');
      const [deptStats] = await connection.query('SELECT COUNT(*) as totalDepts FROM departments');
      const [leadStats] = await connection.query('SELECT COUNT(*) as totalLeads FROM leads');
      const [dealStats] = await connection.query('SELECT COUNT(*) as totalDeals, SUM(deal_value) as totalValue FROM deals');
      const [projectStats] = await connection.query('SELECT COUNT(*) as totalProjects FROM projects');
      const [pendingApprovals] = await connection.query('SELECT COUNT(*) as count FROM approvals WHERE status = "Pending"');
      
      // Get recent system activities (placeholders for now)
      const [recentActivities] = await connection.query('SELECT * FROM activities ORDER BY created_at DESC LIMIT 10');
      
      // Get health metrics
      const [serverStatus] = await connection.query('SELECT "Healthy" as status, "100%" as uptime, "45ms" as latency');

      connection.release();
      res.json({
        stats: {
          users: userStats[0],
          departments: deptStats[0].totalDepts,
          leads: leadStats[0].totalLeads,
          deals: dealStats[0],
          projects: projectStats[0].totalProjects,
          pendingApprovals: pendingApprovals[0].count
        },
        recentActivities,
        systemHealth: serverStatus[0]
      });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Leads Dashboard API
  app.get('/api/dashboard/leads', async (req, res) => {
    let connection;
    try {
      const { userId, viewType = 'executive' } = req.query;
      connection = await pool.getConnection();
      
      let whereClause = '';
      let params = [];
      
      if (viewType === 'executive' && userId) {
        whereClause = ' WHERE created_by = ? OR assigned_to = ?'; // Placeholder logic
        params = [userId, userId];
      }

      // Lead Pipeline Stats
      const [pipelineStats] = await connection.query(`
        SELECT lead_status, COUNT(*) as count 
        FROM leads 
        ${whereClause} 
        GROUP BY lead_status
      `, params);

      // Lead Sources
      const [sourceStats] = await connection.query(`
        SELECT lead_source, COUNT(*) as count 
        FROM leads 
        ${whereClause} 
        GROUP BY lead_source
      `, params);

      // Recent Leads
      const [recentLeads] = await connection.query(`
        SELECT * FROM leads 
        ${whereClause} 
        ORDER BY created_at DESC LIMIT 10
      `, params);

      // Manager View: Conversion Analytics & Distribution
      let managerData = {};
      if (viewType === 'manager') {
        const [conversion] = await connection.query('SELECT COUNT(*) as total, SUM(CASE WHEN lead_status = "Qualified" THEN 1 ELSE 0 END) as qualified FROM leads');
        const [distribution] = await connection.query(`
          SELECT u.first_name, u.last_name, COUNT(l.id) as leadCount 
          FROM users u 
          LEFT JOIN leads l ON l.assigned_to = u.id 
          GROUP BY u.id, u.first_name, u.last_name
        `);
        managerData = { conversion, distribution };
      }

      connection.release();
      res.json({
        pipeline: pipelineStats,
        sources: sourceStats,
        recentLeads,
        ...managerData
      });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Deals Dashboard API
  app.get('/api/dashboard/deals', async (req, res) => {
    let connection;
    try {
      const { userId, viewType = 'executive' } = req.query;
      connection = await pool.getConnection();
      
      let whereClause = '';
      let params = [];
      
      if (viewType === 'executive' && userId) {
        whereClause = ' WHERE assignee_id = ?';
        params = [userId];
      }

      // Deal Stages
      const [stageStats] = await connection.query(`
        SELECT deal_stage, COUNT(*) as count, SUM(deal_value) as totalValue 
        FROM deals 
        ${whereClause} 
        GROUP BY deal_stage
      `, params);

      // Revenue Forecast (Simple)
      const [forecast] = await connection.query(`
        SELECT SUM(deal_value * probability / 100) as weightedValue 
        FROM deals 
        ${whereClause}
      `, params);

      // Recent Deals
      const [recentDeals] = await connection.query(`
        SELECT d.*, c.company_name 
        FROM deals d 
        LEFT JOIN companies c ON d.company_id = c.id 
        ${whereClause ? 'WHERE d.assignee_id = ?' : ''} 
        ORDER BY d.created_at DESC LIMIT 10
      `, params);

      // Manager View: Discount Approvals & Allocation
      let managerData = {};
      if (viewType === 'manager') {
        const [pendingDiscounts] = await connection.query('SELECT COUNT(*) as count FROM deals WHERE discount_status = "Pending"');
        const [allocation] = await connection.query(`
          SELECT u.first_name, u.last_name, SUM(d.deal_value) as totalValue 
          FROM users u 
          LEFT JOIN deals d ON d.assignee_id = u.id 
          GROUP BY u.id, u.first_name, u.last_name
        `);
        managerData = { pendingDiscounts: pendingDiscounts[0].count, allocation };
      }

      connection.release();
      res.json({
        stages: stageStats,
        forecast: forecast[0].weightedValue,
        recentDeals,
        ...managerData
      });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Sales Dashboard API
  app.get('/api/dashboard/sales', async (req, res) => {
    let connection;
    try {
      const { userId, viewType = 'executive' } = req.query;
      connection = await pool.getConnection();
      
      // Personal Metrics (Executive)
      const [personalStats] = await connection.query(`
        SELECT 
          COUNT(CASE WHEN deal_stage = 'Won' THEN 1 END) as wonDeals,
          SUM(CASE WHEN deal_stage = 'Won' THEN deal_value ELSE 0 END) as totalRevenue,
          COUNT(CASE WHEN deal_stage != 'Won' AND deal_stage != 'Lost' THEN 1 END) as activeDeals
        FROM deals 
        WHERE assignee_id = ?
      `, [userId]);

      const [commissions] = await connection.query('SELECT SUM(amount) as total FROM commissions WHERE user_id = ? AND status = "Paid"', [userId]);
      const [targets] = await connection.query('SELECT metric_value as target FROM kpi_metrics WHERE metric_name = "Sales Target" AND period_start <= NOW() AND period_end >= NOW()');

      // Pipeline Data for Charts
      const [pipelineData] = await connection.query(`
        SELECT deal_stage as name, COUNT(*) as count, SUM(deal_value) as value
        FROM deals
        ${userId ? 'WHERE assignee_id = ?' : ''}
        GROUP BY deal_stage
      `, userId ? [userId] : []);

      // Task/Activity stats for the dashboard
      const [taskStats] = await connection.query(`
        SELECT 
          COUNT(CASE WHEN status = 'Open' OR status = 'Pending' THEN 1 END) as pendingTasks,
          COUNT(CASE WHEN activity_type = 'Calls' AND status = 'Completed' THEN 1 END) as callsMade,
          COUNT(CASE WHEN activity_type = 'Meeting' AND status = 'Pending' THEN 1 END) as meetingsScheduled
        FROM activities
        WHERE assigned_to = ? AND (scheduled_date >= CURDATE() OR created_at >= CURDATE())
      `, [userId]);

      // Manager View: Team Performance
      let managerData = {};
      if (viewType === 'manager') {
        const [teamStats] = await connection.query(`
          SELECT u.first_name, u.last_name, 
                 COUNT(d.id) as dealsCount, 
                 SUM(CASE WHEN d.deal_stage = 'Won' THEN d.deal_value ELSE 0 END) as revenue 
          FROM users u 
          LEFT JOIN deals d ON d.assignee_id = u.id 
          WHERE u.department = 'Sales Department' 
          GROUP BY u.id
        `);
        managerData = { teamPerformance: teamStats };
      }

      connection.release();
      res.json({
        personal: personalStats[0],
        commissions: commissions[0].total || 0,
        target: targets[0]?.target || 0,
        pipeline: pipelineData,
        tasks: taskStats[0],
        ...managerData
      });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  // 5. Marketing Dashboard API
  app.get('/api/dashboard/marketing', async (req, res) => {
    let connection;
    try {
      const { userId, viewType = 'executive' } = req.query;
      connection = await pool.getConnection();
      
      // Projects & Campaigns
      const [projectStats] = await connection.query('SELECT status, COUNT(*) as count FROM marketing_projects GROUP BY status');
      const [activeCampaigns] = await connection.query('SELECT COUNT(*) as count FROM campaigns WHERE is_active = 1');
      
      // Content Calendar (Recent/Upcoming)
      const [calendar] = await connection.query('SELECT * FROM content_calendar WHERE scheduled_date >= NOW() ORDER BY scheduled_date ASC LIMIT 5');
      
      // SEO Insights
      const [seoStats] = await connection.query('SELECT COUNT(*) as keywords, AVG(current_ranking) as avgRanking FROM seo_management');

      // Manager View: Creative Approvals & Resource Allocation
      let managerData = {};
      if (viewType === 'manager') {
        const [pendingRequests] = await connection.query('SELECT COUNT(*) as count FROM creative_requests WHERE status = "Requested"');
        const [campaignPerformance] = await connection.query('SELECT metric_name, AVG(metric_value) as avgValue FROM campaign_performance GROUP BY metric_name');
        managerData = { pendingApprovals: pendingRequests[0].count, campaignPerformance };
      }

      connection.release();
      res.json({
        projects: projectStats,
        activeCampaigns: activeCampaigns[0].count,
        upcomingContent: calendar,
        seo: seoStats[0],
        ...managerData
      });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/dashboard/marketing/full', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();

      const [leads] = await connection.query('SELECT lead_status, lead_source, created_at, value, industry FROM leads');

      const funnel = { 'New': 0, 'Contacted': 0, 'Qualified': 0, 'Proposal Sent': 0, 'Won': 0 };
      const sourceMap = {};
      let totalValue = 0;

      leads.forEach(l => {
        let s = l.lead_status || 'New';
        if (s === 'Contacted' || s === 'Follow-up') funnel['Contacted']++;
        else if (s === 'Qualified' || s === 'Negotiation') funnel['Qualified']++;
        else if (s === 'Proposal Sent') funnel['Proposal Sent']++;
        else if (s === 'Won' || s === 'Closed Won') funnel['Won']++;
        else funnel['New']++;

        let src = l.lead_source || 'Others';
        sourceMap[src] = (sourceMap[src] || 0) + 1;
        totalValue += (parseFloat(l.value) || 0);
      });

      const FUNNEL_DATA = Object.entries(funnel).map(([label, value]) => {
        let width = 100;
        if (label === 'Contacted') width = 80;
        if (label === 'Qualified') width = 60;
        if (label === 'Proposal Sent') width = 44;
        if (label === 'Won') width = 30;
        const colors = {'New': '#4F46E5', 'Contacted': '#818CF8', 'Qualified': '#F59E0B', 'Proposal Sent': '#10B981', 'Won': '#22C55E'};
        return { label, value, color: colors[label], width };
      });

      const sourceColors = ['#4F46E5', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#6B7280'];
      const LEADS_BY_SOURCE = Object.entries(sourceMap).map(([name, value], i) => ({
        name,
        value,
        pct: Math.round((value / leads.length) * 100) || 0,
        color: sourceColors[i % sourceColors.length]
      })).sort((a,b) => b.value - a.value);

      const CHANNEL_PERF = Object.entries(sourceMap).map(([name, count], i) => {
        let revenue = count * 2500; 
        return {
          channel: name,
          revenue,
          pct: Math.round((revenue / (leads.length * 2500)) * 100) || 0,
          color: sourceColors[i % sourceColors.length]
        };
      }).sort((a,b) => b.revenue - a.revenue);

      const [campaigns] = await connection.query(`
        SELECT c.name as title, c.status as type, c.budget,
               (SELECT SUM(metric_value) FROM campaign_performance cp WHERE cp.campaign_id = c.id AND metric_name = 'Leads Generated') as leads_count,
               (SELECT AVG(metric_value) FROM campaign_performance cp WHERE cp.campaign_id = c.id AND metric_name = 'Conversion Rate') as conversion_rate
        FROM campaigns c LIMIT 5
      `);
      const TOP_CAMPAIGNS = campaigns.map((c, i) => ({
        name: c.title,
        type: c.type === 'Active' ? 'Email Campaign' : 'Social Campaign',
        leads: Number(c.leads_count) || 0,
        convRate: Number(c.conversion_rate).toFixed(1) || '0.0',
        color: sourceColors[i % sourceColors.length],
        iconName: c.type === 'Active' ? 'Mail' : 'Share2'
      }));

      const [recentLeads] = await connection.query('SELECT lead_name, industry, company, lead_status, created_at FROM leads ORDER BY created_at DESC LIMIT 5');
      const RECENT_LEADS = recentLeads.map(l => ({
        name: l.lead_name,
        role: `${l.industry || 'Lead'}, ${l.company || 'Unknown'}`,
        badge: l.lead_status || 'New',
        badgeColor: l.lead_status === 'Won' ? '#10B981' : '#4F46E5',
        time: 'Recently',
        avatar: l.lead_name ? l.lead_name.substring(0, 2).toUpperCase() : 'LD',
        avatarBg: '#EDE9FE'
      }));

      const [tasks] = await connection.query('SELECT title, priority FROM general_tasks WHERE status != "Completed" LIMIT 4');
      const TASKS_DATA = tasks.map(t => ({
        label: t.title,
        priority: t.priority || 'Medium',
        priorityColor: t.priority === 'High' ? '#EF4444' : (t.priority === 'Low' ? '#10B981' : '#F59E0B')
      }));

      // Real Lead Growth Data (Last 7 Days)
      const [leadGrowthRaw] = await connection.query(`
        SELECT DATE_FORMAT(group_date, '%d %b') as date, 
               COUNT(*) as total, 
               SUM(CASE WHEN lead_status IN ('Qualified', 'Negotiation') THEN 1 ELSE 0 END) as qualified,
               SUM(CASE WHEN lead_status IN ('Won', 'Closed Won') THEN 1 ELSE 0 END) as converted
        FROM (
            SELECT lead_status, DATE(created_at) as group_date 
            FROM leads 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        ) as sub
        GROUP BY group_date
        ORDER BY group_date ASC
      `);
      const LEAD_GROWTH_DATA = leadGrowthRaw.map(r => ({
        date: r.date,
        total: Number(r.total) || 0,
        qualified: Number(r.qualified) || 0,
        converted: Number(r.converted) || 0
      }));

      // Real Performance Trend (Last 6 Months)
      const [perfTrendRaw] = await connection.query(`
        SELECT DATE_FORMAT(group_date, '%b %Y') as month, 
               COUNT(*) as leads, 
               SUM(CASE WHEN lead_status IN ('Won', 'Closed Won') THEN 1 ELSE 0 END) as conversions,
               SUM(value) as revenue
        FROM (
            SELECT lead_status, value, DATE_FORMAT(created_at, '%Y-%m-01') as group_date 
            FROM leads 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        ) as sub
        GROUP BY group_date
        ORDER BY group_date ASC
      `);
      const PERFORMANCE_TREND = perfTrendRaw.map(r => ({
        month: r.month,
        leads: Number(r.leads) || 0,
        conversions: Number(r.conversions) || 0,
        revenue: Number(r.revenue) || 0
      }));

      // Real Engagement Data
      const [engagementRaw] = await connection.query('SELECT metric_name, SUM(metric_value) as total FROM campaign_performance GROUP BY metric_name');
      const engagementMap = {};
      engagementRaw.forEach(e => { engagementMap[e.metric_name] = Number(e.total); });
      const ENGAGEMENT = [
        { label: 'Email Opens',        value: engagementMap['Email Opens'] || 0, change: 0, color: '#4F46E5', iconName: 'Mail' },
        { label: 'Email Clicks',       value: engagementMap['Email Clicks'] || 0, change: 0, color: '#10B981', iconName: 'MousePointer' },
        { label: 'Landing Page Views', value: engagementMap['Landing Page Views'] || 0, change: 0, color: '#F59E0B', iconName: 'Eye' },
        { label: 'Form Submissions',   value: engagementMap['Form Submissions'] || 0,  change: 0, color: '#8B5CF6', iconName: 'FileText' },
        { label: 'Content Downloads',  value: engagementMap['Content Downloads'] || 0,  change: 0, color: '#EF4444', iconName: 'Download' },
      ];

      // Real Activities Data
      const [activitiesRaw] = await connection.query('SELECT title, scheduled_date, scheduled_time, activity_type FROM activities ORDER BY created_at DESC LIMIT 4');
      const ACTIVITIES_DATA = activitiesRaw.map(a => {
        let iconName = 'Users';
        let bg = '#EDE9FE';
        let color = '#4F46E5';
        if (a.activity_type === 'Email') { iconName = 'Send'; bg = '#D1FAE5'; color = '#10B981'; }
        else if (a.activity_type === 'Call') { iconName = 'Phone'; bg = '#FEF3C7'; color = '#F59E0B'; }
        
        let sub = '';
        if (a.scheduled_date) {
           sub = new Date(a.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
           if (a.scheduled_time) sub += `, ${a.scheduled_time}`;
        } else {
           sub = 'No date set';
        }

        return {
          title: a.title || 'Untitled Activity',
          sub,
          color,
          bg,
          iconName
        };
      });

      connection.release();
      res.json({
        LEAD_GROWTH_DATA,
        LEADS_BY_SOURCE,
        PERFORMANCE_TREND,
        TOP_CAMPAIGNS,
        RECENT_LEADS,
        FUNNEL_DATA,
        ENGAGEMENT,
        ACTIVITIES_DATA,
        TASKS_DATA,
        CHANNEL_PERF
      });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  // 6. IT Dashboard API
  app.get('/api/dashboard/it', async (req, res) => {
    let connection;
    try {
      const { userId, viewType = 'executive' } = req.query;
      connection = await pool.getConnection();
      
      // Project & Sprint Stats
      const [itProjects] = await connection.query('SELECT status, COUNT(*) as count FROM it_projects GROUP BY status');
      const [activeSprints] = await connection.query('SELECT * FROM sprints WHERE status = "Active"');
      
      // Bug Tracking
      const [bugStats] = await connection.query('SELECT status, COUNT(*) as count FROM bugs GROUP BY status');
      const [criticalBugs] = await connection.query('SELECT COUNT(*) as count FROM bugs WHERE severity = "Critical" AND status != "Resolved"');
      
      // Deployments
      const [recentDeployments] = await connection.query('SELECT * FROM deployments ORDER BY created_at DESC LIMIT 5');

      // Manager View: Sprint Planning & Deployment Approvals
      let managerData = {};
      if (viewType === 'manager') {
        const [pendingDeployments] = await connection.query('SELECT COUNT(*) as count FROM deployments WHERE status = "Pending"');
        const [resourceUsage] = await connection.query('SELECT "85%" as cpu, "62%" as memory, "1.2TB" as storage'); // Mock DevOps
        managerData = { pendingDeployments: pendingDeployments[0].count, devOps: resourceUsage[0] };
      }

      connection.release();
      res.json({
        projects: itProjects,
        activeSprints,
        bugs: { stats: bugStats, critical: criticalBugs[0].count },
        deployments: recentDeployments,
        ...managerData
      });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });

  // 7. Accounting Dashboard API
  app.get('/api/dashboard/accounting', async (req, res) => {
    let connection;
    try {
      const { userId, viewType = 'executive' } = req.query;
      connection = await pool.getConnection();
      
      // Invoices & Payments
      const [invoiceStats] = await connection.query('SELECT status, COUNT(*) as count, SUM(amount) as total FROM invoices GROUP BY status');
      const [pendingPayments] = await connection.query('SELECT SUM(amount) as total FROM invoices WHERE status = "Unpaid" OR status = "Partially Paid"');
      const [overdueInvoices] = await connection.query('SELECT COUNT(*) as count, SUM(amount) as total FROM invoices WHERE status = "Overdue"');
      
      // Commissions
      const [pendingCommissions] = await connection.query('SELECT SUM(amount) as total FROM commissions WHERE status = "Pending"');

      // Manager View: Financial Forecast & Audit Logs
      let managerData = {};
      if (viewType === 'manager') {
        const [profitAndLoss] = await connection.query('SELECT 150000 as revenue, 45000 as expenses, 105000 as profit'); // Mock Financials
        const [recentAudit] = await connection.query('SELECT * FROM activities WHERE activity_type = "Invoice" ORDER BY created_at DESC LIMIT 5');
        managerData = { financials: profitAndLoss[0], audit: recentAudit };
      }

      connection.release();
      res.json({
        invoices: invoiceStats,
        receivables: pendingPayments[0].total || 0,
        overdue: overdueInvoices[0],
        commissionsPending: pendingCommissions[0].total || 0,
        ...managerData
      });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });
  // 8. SEO GMB Full Dashboard API
  app.get('/api/dashboard/seo-gmb/full', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();

      const [keywordsRaw] = await connection.query('SELECT COUNT(*) as total FROM seo_management');
      const [top3Raw] = await connection.query('SELECT COUNT(*) as total FROM seo_management WHERE current_ranking <= 3');
      
      const organicTraffic = 0;
      const organicClicks = 0;
      const gmbViews = 0;
      const gmbActions = 0;
      const avgPosition = 0;
      
      const [gmbRaw] = await connection.query('SELECT AVG(average_rating) as avgRating, SUM(total_reviews) as totalReviews FROM gmb_management');
      
      const seoPerformance = [];
      const gmbPerformance = { search: 0, maps: 0, direct: 0, website: 0 };
      const topGmbActions = [];
      
      const [topKeywordsQuery] = await connection.query('SELECT keyword, current_ranking as position, search_volume as volume FROM seo_management ORDER BY current_ranking ASC LIMIT 8');
      const topKeywords = topKeywordsQuery;

      const rankingDistribution = [];
      const topPages = [];
      const seoHealthDetails = {
        score: 0,
        categories: []
      };

      const coreWebVitals = [];
      const keywordsByIntent = [];
      const topCountries = [];
      const devicesByClicks = [];

      const aiVisibility = { score: 0, overviews: '0/0', citations: '0/0', brandMentions: '0/0', promptRankings: '0/0', sentiment: '0/0' };
      const promptRankings = [];
      const sentimentAnalysis = [];
      const aiContentRecommendations = [];
      const geoTopPrompts = [];
      const geoShareOfVisibility = [];
      
      const reviews = { rating: gmbRaw[0].avgRating || 0, total: gmbRaw[0].totalReviews || 0, positive: 0, neutral: 0, negative: 0 };
      const posts = { total: 0, views: 0, engagements: 0 };
      const citations = [];
      const rankTracking = [];
      
      const kpis = {
        totalKeywords: keywordsRaw[0].total || 0,
        top3Rankings: top3Raw[0].total || 0,
        top10Rankings: 0,
        organicTraffic: 0,
        organicClicks: 0,
        avgPosition: 0,
        gmbViews: 0,
        gmbActions: 0
      };

      const charts = {
        seoPerformance: [],
        gmbPerformance: { search: 0, maps: 0, direct: 0, website: 0 },
        rankingDistribution: [],
        keywordsByIntent: [],
        devicesByClicks: [],
        sentimentAnalysis: [],
        geoShareOfVisibility: []
      };

      const lists = {
        topKeywords,
        topGmbActions: [],
        topPages: [],
        coreWebVitals: [],
        topCountries: [],
        promptRankings: [],
        aiContentRecommendations: [],
        geoTopPrompts: [],
        citations: [],
        rankTracking: []
      };

      const widgets = {
        seoHealthDetails: { score: 0, categories: [] },
        aiVisibility: { score: 0, overviews: '0/0', citations: '0/0', brandMentions: '0/0', promptRankings: '0/0', sentiment: '0/0' },
        reviews,
        posts
      };

      const localPack = { keywords: 0, avgPosition: 0, locations: 0 };
      const techSeo = { score: 0, crawled: 0, issues: 0, critical: 0, warnings: 0 };
      const gmbPerformanceTime = [];
      const competitorMetrics = [];
      const competitorsList = [];
      const marketShare = [];
      const gmbHeatmap = [];

      const gmbCustomerSearch = [];

      const gmbCustomerActions = [];

      const gmbRecentReviews = { rating: 0, total: 0, breakdown: [] };
      const gmbReviewsOverTime = [];
      const gmbTopReviewKeywords = [];
      const gmbQaOverview = { questions: 0, qChange: '0%', answered: 0, aChange: '0%', pending: 0, pChange: '0%' };
      const gmbProfileCompletion = { score: 0, tasks: [] };
      const gmbPhotoViews = [];

      const gmbPostsPerformance = [
        { img: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=200&q=80', title: 'We are now ISO 9001:2015 Certified!', date: 'May 28, 2026', views: 842, clicks: 42 },
        { img: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=200&q=80', title: 'New Blog: Top 10 CRM Benefits', date: 'May 26, 2026', views: 615, clicks: 31 },
        { img: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=200&q=80', title: 'Weekend Offer - 20% OFF on CRM', date: 'May 24, 2026', views: 512, clicks: 28 }
      ];

      // GEO / AI MOCK DATA (REMOVED)
      const geoVisibilityTrend = [];
      const geoOverviewPresence = [];
      const geoMentionsCitations = [];
      const geoCompetitorCompare = [];
      const geoContentOpportunities = [];
      const geoHealthScoreDetails = { score: 0, categories: [] };
      
      const compVisibilityComparison = [];
      const compTrafficShare = [];
      const compTopCompetitors = [];
      const compKeywordGap = [];
      const compBacklinkGap = [];
      const compTopPages = [];
      const compContentGap = [];
      const compChannelShare = [];
      const compRegion = [];

      connection.release();
      res.json({
        kpis: {
          totalKeywords: keywordsRaw[0].total || 0,
          top3Rankings: top3Raw[0].total || 0,
          top10Rankings: 0,
          organicTraffic,
          organicClicks: 0,
          avgPosition: 0,
          gmbViews,
          gmbActions,
          aiVisibilityScore: 0,
          // NEW GMB KPIS
          gmbSearchViews: 0,
          gmbMapViews: 0,
          gmbWebsiteClicks: 0,
          gmbDirectionRequests: 0,
          gmbProfileInteractions: 0,
          // NEW GEO KPIS
          geoBrandMentions: 0,
          geoAiCitations: 0,
          geoPromptRankings: 0,
          geoAiBacklinks: 0,
          geoShareOfVoice: 0,
          // COMPETITORS KPIS
          compOrganicTraffic: 0,
          compOrganicKeywords: 0,
          compBacklinks: 0,
          compReferringDomains: 0,
          compDomainAuthority: 0,
          compVisibilityScore: 0
        },
        charts: {
          seoPerformance,
          gmbPerformance,
          rankingDistribution,
          keywordsByIntent,
          devicesByClicks,
          // NEW GMB CHARTS
          gmbPerformanceTime,
          gmbCustomerSearch,
          gmbCustomerActions,
          gmbReviewsOverTime,
          // NEW GEO CHARTS
          geoVisibilityTrend,
          geoShareOfVisibility,
          geoOverviewPresence,
          geoMentionsCitations,
          // COMPETITORS CHARTS
          compVisibilityComparison,
          compTrafficShare
        },
        lists: {
          topKeywords,
          topPages,
          topCountries,
          promptRankings,
          topGmbActions,
          // NEW GMB LISTS
          gmbTopReviewKeywords,
          gmbPhotoViews,
          gmbPostsPerformance,
          // NEW GEO LISTS
          geoTopPrompts,
          geoCompetitorCompare,
          geoContentOpportunities,
          // COMPETITORS LISTS
          compTopCompetitors,
          compKeywordGap,
          compBacklinkGap,
          compTopPages,
          compContentGap,
          compChannelShare,
          compRegion
        },
        widgets: {
          seoHealthDetails,
          coreWebVitals,
          aiVisibility,
          reviews,
          posts,
          localPack,
          techSeo,
          // NEW GMB WIDGETS
          gmbRecentReviews,
          gmbQaOverview,
          gmbProfileCompletion,
          // NEW GEO WIDGETS
          geoHealthScoreDetails
        }
      });
    } catch (error) {
      if (connection) connection.release();
      res.status(500).json({ error: error.message });
    }
  });
};
