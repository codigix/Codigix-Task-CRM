module.exports = function setupPerformanceRoutes(app, pool) {
  
  app.get('/api/performance/sales/:departmentId', async (req, res) => {
    try {
      const { departmentId } = req.params;

      // Conversion rate
      const [leads] = await pool.query(`
        SELECT COUNT(*) as total, 
               SUM(CASE WHEN lead_status = 'Qualified' THEN 1 ELSE 0 END) as qualified
        FROM leads
      `);
      const conversionRate = leads[0].total > 0 
        ? ((leads[0].qualified / leads[0].total) * 100).toFixed(2)
        : 0;

      // Deal closure metrics
      const [deals] = await pool.query(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN pipeline = 'Won' THEN 1 ELSE 0 END) as won,
               AVG(deal_value) as avg_value,
               AVG(DATEDIFF(updated_at, created_at)) as avg_closure_days
        FROM deals
      `);

      // Follow-up discipline
      const [followups] = await pool.query(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN follow_up_date IS NOT NULL AND follow_up_date <= NOW() THEN 1 ELSE 0 END) as completed
        FROM deals
        WHERE follow_up_date IS NOT NULL
      `);
      const followupDiscipline = followups[0].total > 0
        ? ((followups[0].completed / followups[0].total) * 100).toFixed(2)
        : 0;

      res.json({
        department: 'Sales',
        metrics: {
          conversionRate: parseFloat(conversionRate),
          dealsClosed: deals[0].won || 0,
          dealsInPipeline: deals[0].total || 0,
          avgDealValue: parseFloat(deals[0].avg_value) || 0,
          avgClosureTime: Math.round(deals[0].avg_closure_days) || 0,
          followupDiscipline: parseFloat(followupDiscipline)
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/performance/marketing/:departmentId', async (req, res) => {
    try {
      // Campaign progress
      const [campaigns] = await pool.query(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
               SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active
        FROM campaigns
      `);

      // SEO projects and keywords
      const [seoProjects] = await pool.query(`
        SELECT COUNT(*) as total
        FROM projects p
        WHERE p.name LIKE '%SEO%' OR p.description LIKE '%SEO%'
      `);

      // Content delivery
      const [tasks] = await pool.query(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
               SUM(CASE WHEN workflow_type IN ('SEO', 'Social Media', 'WordPress') THEN 1 ELSE 0 END) as marketing_tasks
        FROM general_tasks
      `);
      const contentDelivery = tasks[0].marketing_tasks > 0
        ? ((tasks[0].completed / tasks[0].marketing_tasks) * 100).toFixed(2)
        : 0;

      res.json({
        department: 'Marketing',
        metrics: {
          campaignProgress: campaigns[0].completed || 0,
          activeCampaigns: campaigns[0].active || 0,
          seoProjectsCount: seoProjects[0].total || 0,
          contentDeliveryRate: parseFloat(contentDelivery),
          completedTasks: tasks[0].completed || 0,
          totalMarketingTasks: tasks[0].marketing_tasks || 0
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/performance/it/:departmentId', async (req, res) => {
    try {
      // Task completion
      const [tasks] = await pool.query(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
               SUM(CASE WHEN workflow_type IN ('Development', 'Testing', 'DevOps') THEN 1 ELSE 0 END) as it_tasks
        FROM general_tasks
      `);
      const completionRate = tasks[0].it_tasks > 0
        ? ((tasks[0].completed / tasks[0].it_tasks) * 100).toFixed(2)
        : 0;

      // Project deployment
      const [projects] = await pool.query(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
        FROM projects p
        WHERE p.department_id = (SELECT id FROM departments WHERE name LIKE '%IT%' LIMIT 1)
      `);
      const deploymentSuccess = projects[0].total > 0
        ? ((projects[0].completed / projects[0].total) * 100).toFixed(2)
        : 0;

      res.json({
        department: 'IT Services',
        metrics: {
          taskCompletionRate: parseFloat(completionRate),
          tasksCompleted: tasks[0].completed || 0,
          totalTasks: tasks[0].it_tasks || 0,
          deploymentSuccess: parseFloat(deploymentSuccess),
          projectsCompleted: projects[0].completed || 0,
          totalProjects: projects[0].total || 0
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/performance/accounts/:departmentId', async (req, res) => {
    try {
      // Invoice metrics
      const [invoices] = await pool.query(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) as paid,
               SUM(amount) as total_invoiced,
               SUM(amount_paid) as total_collected,
               SUM(CASE WHEN status = 'Overdue' THEN 1 ELSE 0 END) as overdue
        FROM invoices
      `);

      const paymentRate = invoices[0].total > 0
        ? ((invoices[0].paid / invoices[0].total) * 100).toFixed(2)
        : 0;

      const outstanding = (invoices[0].total_invoiced || 0) - (invoices[0].total_collected || 0);

      res.json({
        department: 'Accounts',
        metrics: {
          paymentRate: parseFloat(paymentRate),
          invoicesPaid: invoices[0].paid || 0,
          totalInvoices: invoices[0].total || 0,
          totalInvoiced: parseFloat(invoices[0].total_invoiced) || 0,
          totalCollected: parseFloat(invoices[0].total_collected) || 0,
          outstandingAmount: outstanding,
          overdueCount: invoices[0].overdue || 0
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/sales/targets', async (req, res) => {
    try {
      const { userId } = req.query;

      const invoiceUserFilter = userId ? `AND (created_by = ? OR deal_id IN (SELECT id FROM deals WHERE assignee_id = ?))` : ''; 
      const companyUserFilter = userId ? `AND created_by = ?` : '';
      const activityUserFilter = userId ? `AND (assigned_to = ? OR created_by = ?)` : '';

      const invoiceParams = userId ? [userId, userId] : [];
      const companyParams = userId ? [userId] : [];
      const activityParams = userId ? [userId, userId] : [];

      // 1. Monthly Revenue (Paid Invoices this month)
      const [revenue] = await pool.query(`
        SELECT SUM(amount) as current
        FROM invoices
        WHERE status = 'Paid' 
        AND MONTH(created_at) = MONTH(CURRENT_DATE())
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
        ${invoiceUserFilter}
      `, invoiceParams);

      // 2. New Customers (Companies created this month)
      const [customers] = await pool.query(`
        SELECT COUNT(*) as current
        FROM companies
        WHERE MONTH(created_at) = MONTH(CURRENT_DATE())
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
        ${companyUserFilter}
      `, companyParams);

      // 3. Deals Closed (Deals won this month)
      const [deals] = await pool.query(`
        SELECT COUNT(*) as current
        FROM deals
        WHERE deal_stage = 'Won'
        AND MONTH(updated_at) = MONTH(CURRENT_DATE())
        AND YEAR(updated_at) = YEAR(CURRENT_DATE())
        ${userId ? `AND assignee_id = ?` : ''}
      `, userId ? [userId] : []);

      // 4. Leads Generated (New leads this month)
      const [leads] = await pool.query(`
        SELECT COUNT(*) as current
        FROM leads
        WHERE MONTH(created_at) = MONTH(CURRENT_DATE())
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
        ${userId ? `AND owner_id = ?` : ''}
      `, userId ? [userId] : []);

      // 5. Schedule/Activities Completed (Activities completed this month)
      const [activities] = await pool.query(`
        SELECT COUNT(*) as current
        FROM activities
        WHERE status = 'Completed'
        AND MONTH(completed_date) = MONTH(CURRENT_DATE())
        AND YEAR(completed_date) = YEAR(CURRENT_DATE())
        ${activityUserFilter}
      `, activityParams);

      // 6. Team Breakdown
      const [teamBreakdown] = await pool.query(`
        SELECT 
          u.first_name, 
          u.last_name,
          (SELECT SUM(d.deal_value) FROM deals d WHERE d.assignee_id = u.id AND d.deal_stage = 'Won') as achieved,
          (SELECT COUNT(*) FROM leads l WHERE l.owner_id = u.id) as leads_count
        FROM users u
        WHERE u.department = 'Sales Department' OR u.role_id IN (SELECT id FROM roles WHERE name LIKE '%Sales%')
        LIMIT 10
      `);

      // 7. Targets (from kpi_metrics or defaults)
      const [kpiTargets] = await pool.query(`
        SELECT metric_name, metric_value
        FROM kpi_metrics
        WHERE (metric_name LIKE '%Revenue Target%' OR metric_name LIKE '%Customer Target%' OR metric_name LIKE '%Deals Target%' OR metric_name LIKE '%Leads Target%' OR metric_name LIKE '%Activities Target%')
        AND period_start <= CURRENT_DATE() AND period_end >= CURRENT_DATE()
      `);

      const targetsMap = kpiTargets.reduce((acc, target) => {
        acc[target.metric_name] = parseFloat(target.metric_value);
        return acc;
      }, {});

      res.json({
        revenue: {
          current: parseFloat(revenue[0].current) || 0,
          target: targetsMap['Revenue Target'] || 100000,
          percentChange: 12.5
        },
        customers: {
          current: customers[0].current || 0,
          target: targetsMap['Customer Target'] || 20,
          percentChange: 8.3
        },
        deals: {
          current: deals[0].current || 0,
          target: targetsMap['Deals Target'] || 50,
          percentChange: 15.2
        },
        leads: {
          current: leads[0].current || 0,
          target: targetsMap['Leads Target'] || 100,
          percentChange: 5.4
        },
        activities: {
          current: activities[0].current || 0,
          target: targetsMap['Activities Target'] || 200,
          percentChange: 10.1
        },
        teamBreakdown: teamBreakdown.map(m => ({
          name: `${m.first_name} ${m.last_name}`,
          target: '₹25,000',
          achieved: `₹${(parseFloat(m.achieved) || 0).toLocaleString()}`,
          leads: m.leads_count || 0,
          status: (parseFloat(m.achieved) || 0) >= 20000 ? 'Completed' : 
                  (parseFloat(m.achieved) || 0) >= 10000 ? 'On Track' : 'At Risk',
          deadline: '31 Mar 2026'
        }))
      });
    } catch (error) {
      console.error('Error fetching sales targets:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/performance/overall', async (req, res) => {
    try {
      // Overall metrics
      const [allMetrics] = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM leads) as total_leads,
          (SELECT COUNT(*) FROM deals) as total_deals,
          (SELECT COUNT(*) FROM projects) as total_projects,
          (SELECT COUNT(*) FROM general_tasks WHERE status = 'Completed') as completed_tasks,
          (SELECT COUNT(*) FROM general_tasks WHERE status IN ('To Do', 'In Progress')) as active_tasks,
          (SELECT SUM(amount) FROM invoices) as total_invoiced,
          (SELECT COUNT(*) FROM invoices WHERE status = 'Paid') as paid_invoices,
          (SELECT COUNT(*) FROM projects WHERE status = 'Completed') as completed_projects
      `);

      const metrics = allMetrics[0];
      const taskCompletionRate = (metrics.completed_tasks + metrics.active_tasks) > 0
        ? ((metrics.completed_tasks / (metrics.completed_tasks + metrics.active_tasks)) * 100).toFixed(2)
        : 0;

      const projectCompletionRate = metrics.total_projects > 0
        ? ((metrics.completed_projects / metrics.total_projects) * 100).toFixed(2)
        : 0;

      res.json({
        summary: {
          totalLeads: metrics.total_leads || 0,
          totalDeals: metrics.total_deals || 0,
          totalProjects: metrics.total_projects || 0,
          completedProjects: metrics.completed_projects || 0,
          totalTasks: metrics.completed_tasks + metrics.active_tasks || 0,
          completedTasks: metrics.completed_tasks || 0,
          taskCompletionRate: parseFloat(taskCompletionRate),
          projectCompletionRate: parseFloat(projectCompletionRate),
          totalInvoiced: parseFloat(metrics.total_invoiced) || 0,
          paidInvoices: metrics.paid_invoices || 0
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/sales/reports', async (req, res) => {
    try {
      // Return real summary of reports based on current database state
      const [stats] = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM invoices WHERE MONTH(created_at) = MONTH(CURRENT_DATE())) as monthly_invoices,
          (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE status = 'Paid') as total_revenue,
          (SELECT COUNT(*) FROM leads) as total_leads,
          (SELECT COUNT(*) FROM deals WHERE deal_stage = 'Won') as total_won_deals,
          (SELECT COUNT(*) FROM companies WHERE status = 'Active') as active_customers,
          (SELECT COUNT(*) FROM activities WHERE status = 'Completed') as completed_activities
      `);

      const s = stats[0];
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      const reports = [
        { 
          id: 1, 
          title: `Monthly Revenue Summary (${s.monthly_invoices} Invoices)`, 
          type: 'Financial', 
          date: today, 
          format: 'PDF',
          details: `Total Revenue: ₹${(parseFloat(s.total_revenue) || 0).toLocaleString()}`
        },
        { 
          id: 2, 
          title: `Lead Conversion Performance (${s.total_leads} Total Leads)`, 
          type: 'Sales', 
          date: today, 
          format: 'Excel',
          details: `Total Won Deals: ${s.total_won_deals}`
        },
        { 
          id: 3, 
          title: `Active Customers Overview (${s.active_customers} Customers)`, 
          type: 'CRM', 
          date: today, 
          format: 'PDF',
          details: 'Status: Up to date'
        },
        { 
          id: 4, 
          title: `Team Activity Log (${s.completed_activities} Activities)`, 
          type: 'Performance', 
          date: today, 
          format: 'PDF',
          details: 'Summary: High engagement'
        }
      ];

      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};
