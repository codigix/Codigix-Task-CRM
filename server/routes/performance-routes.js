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
      // Calculate performance strictly from task_contributions (The Ledger)
      const [contributions] = await pool.query(`
        SELECT COUNT(*) as total_contributions,
               SUM(effort_points) as total_earned_points
        FROM task_contributions tc
        JOIN general_tasks t ON tc.task_id = t.id
        WHERE tc.approval_status = 'Approved' 
        AND t.department_id = ?
      `, [req.params.departmentId]);

      // Legacy task metrics for historical context (if needed by frontend)
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
        WHERE p.department_id = ?
      `, [req.params.departmentId]);
      
      const deploymentSuccess = projects[0].total > 0
        ? ((projects[0].completed / projects[0].total) * 100).toFixed(2)
        : 0;

      res.json({
        department: 'IT Services',
        metrics: {
          earnedEffortPoints: parseInt(contributions[0].total_earned_points) || 0,
          approvedContributions: parseInt(contributions[0].total_contributions) || 0,
          taskCompletionRate: parseFloat(completionRate),
          tasksCompleted: tasks[0].completed || 0,
          totalTasks: tasks[0].it_tasks || 0,
          deploymentSuccess: parseFloat(deploymentSuccess),
          projectsCompleted: projects[0].completed || 0,
          totalProjects: projects[0].total || 0
        }
      });
    } catch (error) {
      console.error("Error in IT performance:", error);
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
  

  // Get monthly performance report
  app.get('/api/performance/monthly-report', async (req, res) => {
    try {
      const { month, year } = req.query;
      const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
      const targetYear = year ? parseInt(year) : new Date().getFullYear();

      // Calculate start and end dates
      const startDate = new Date(targetYear, targetMonth - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0] + ' 23:59:59';

      // 1. Get IT Kanban Issues completed in the target month
      const [itIssues] = await pool.query(`
        SELECT 
          u.id as assignee_id, 
          u.first_name, 
          u.last_name,
          COALESCE(i.effort_points, i.story_points, 0) as effort_points, 
          0 as estimated_hours, 
          0 as actual_hours,
          i.status
        FROM it_kanban_issues i
        LEFT JOIN users u ON LOWER(i.assignee) COLLATE utf8mb4_unicode_ci = LOWER(CONCAT_WS(' ', u.first_name, u.last_name)) COLLATE utf8mb4_unicode_ci
        WHERE i.assignee IS NOT NULL
          AND LOWER(i.status) IN ('done', 'completed', 'closed')
          AND i.updated_at >= ? AND i.updated_at <= ?
      `, [startDate, endDate]);

      // 2. Get Project Tasks completed in the target month
      const [projectTasks] = await pool.query(`
        SELECT 
          t.assigned_to as assignee_id, 
          u.first_name, 
          u.last_name,
          0 as effort_points, 
          0 as estimated_hours, 
          0 as actual_hours,
          t.status
        FROM project_tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.assigned_to IS NOT NULL
          AND LOWER(t.status) IN ('completed', 'done', 'closed')
          AND t.updated_at >= ? AND t.updated_at <= ?
      `, [startDate, endDate]);

      // 3. Get General Tasks completed in the target month
      const [generalTasks] = await pool.query(`
        SELECT 
          u.id as assignee_id, 
          u.first_name, 
          u.last_name,
          t.effort_points, 
          t.estimated_hours, 
          t.actual_hours,
          t.status
        FROM general_tasks t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.created_by IS NOT NULL
          AND LOWER(t.status) IN ('completed', 'done', 'closed')
          AND t.updated_at >= ? AND t.updated_at <= ?
      `, [startDate, endDate]);

      const allTasks = [...itIssues, ...projectTasks, ...generalTasks];
      const employeeStats = {};

      allTasks.forEach(task => {
        const empId = task.assignee_id;
        if (!empId) return;
        
        if (!employeeStats[empId]) {
          employeeStats[empId] = {
            id: empId,
            name: (task.first_name && task.last_name) ? `${task.first_name} ${task.last_name}` : 'Unknown',
            tasksCompleted: 0,
            totalEffortPoints: 0,
            totalEstimatedHours: 0,
            totalActualHours: 0,
          };
        }

        employeeStats[empId].tasksCompleted += 1;
        employeeStats[empId].totalEffortPoints += Number(task.effort_points) || 0;
        employeeStats[empId].totalEstimatedHours += Number(task.estimated_hours) || 0;
        employeeStats[empId].totalActualHours += Number(task.actual_hours) || 0;
      });

      const reportData = Object.values(employeeStats).map(emp => {
        let efficiency = 100;
        if (emp.totalEstimatedHours > 0 && emp.totalActualHours > 0) {
          efficiency = Math.min(100, Math.round((emp.totalEstimatedHours / emp.totalActualHours) * 100));
        }
        
        let velocityScore = Math.min(100, Math.round(emp.totalEffortPoints * 2));
        let taskScore = Math.min(100, Math.round(emp.tasksCompleted * 5));
        let overallScore = Math.round((velocityScore * 0.4) + (taskScore * 0.4) + (efficiency * 0.2));

        if (overallScore === 0 && emp.tasksCompleted > 0) {
            overallScore = 80;
        }

        return {
          ...emp,
          velocity: emp.totalEffortPoints,
          estimatedHours: emp.totalEstimatedHours,
          actualHours: emp.totalActualHours,
          timeEfficiency: efficiency,
          overallScore: overallScore
        };
      });

      reportData.sort((a, b) => b.overallScore - a.overallScore);

      res.json(reportData);
    } catch (error) {
      console.error('Error fetching monthly report:', error);
      res.status(500).json({ error: error.message });
    }
  });


  // Get live detailed dashboard for a specific employee
  app.get('/api/performance/employee/:id/live-dashboard', async (req, res) => {
    try {
      const empId = req.params.id;
      const { month, year } = req.query;
      const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
      const targetYear = year ? parseInt(year) : new Date().getFullYear();

      // Calculate start and end dates
      const startDate = new Date(targetYear, targetMonth - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0] + ' 23:59:59';

      // 1. Get Employee Profile
      const [users] = await pool.query(`
        SELECT u.id, u.first_name, u.last_name, r.name as role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
      `, [empId]);
      
      if (users.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      const user = users[0];
      const fullName = `${user.first_name} ${user.last_name}`;

      // 2. Fetch IT Kanban Issues for this user
      const [itIssues] = await pool.query(`
        SELECT 
          i.id,
          i.title,
          i.status,
          i.priority,
          COALESCE(i.effort_points, i.story_points, 0) as effort_points,
          0 as estimated_hours,
          0 as actual_hours,
          i.created_at,
          i.updated_at
        FROM it_kanban_issues i
        WHERE LOWER(i.assignee) = LOWER(?)
          AND i.updated_at >= ? AND i.updated_at <= ?
      `, [fullName, startDate, endDate]);

      // 3. Project Tasks
      const [projectTasks] = await pool.query(`
        SELECT 
          t.id,
          t.title,
          t.status,
          t.priority,
          0 as effort_points,
          0 as estimated_hours,
          0 as actual_hours,
          t.created_at,
          t.updated_at
        FROM project_tasks t
        WHERE t.assigned_to = ?
          AND t.updated_at >= ? AND t.updated_at <= ?
      `, [empId, startDate, endDate]);

      // 4. General Tasks
      const [generalTasks] = await pool.query(`
        SELECT 
          t.id,
          t.title,
          t.status,
          t.priority,
          t.effort_points,
          t.estimated_hours,
          t.actual_hours,
          t.created_at,
          t.updated_at
        FROM general_tasks t
        WHERE t.created_by = ?
          AND t.updated_at >= ? AND t.updated_at <= ?
      `, [empId, startDate, endDate]);

      const allTasks = [...itIssues, ...projectTasks, ...generalTasks];
      
      // Calculate Status Distribution
      const statusCounts = {
        'TO DO': 0,
        'IN PROGRESS': 0,
        'PENDING REQUIREMENTS': 0,
        'IN REVIEW': 0,
        'DONE': 0
      };

      let completedTasks = 0;
      let totalEffortPoints = 0;
      let totalEstHours = 0;
      let totalActHours = 0;

      const taskLevelPerformance = allTasks.map(t => {
        const statusUpper = t.status ? t.status.toUpperCase() : 'TO DO';
        
        // Map various statuses to standard buckets
        let bucket = 'TO DO';
        if (['DONE', 'COMPLETED', 'CLOSED'].includes(statusUpper)) bucket = 'DONE';
        else if (['IN PROGRESS', 'DOING'].includes(statusUpper)) bucket = 'IN PROGRESS';
        else if (['REVIEW', 'IN REVIEW', 'TESTING'].includes(statusUpper)) bucket = 'IN REVIEW';
        else if (['PENDING', 'BLOCKED'].includes(statusUpper)) bucket = 'PENDING REQUIREMENTS';
        
        statusCounts[bucket] = (statusCounts[bucket] || 0) + 1;
        
        if (bucket === 'DONE') {
          completedTasks++;
          totalEffortPoints += Number(t.effort_points) || 0;
        }

        totalEstHours += Number(t.estimated_hours) || 0;
        totalActHours += Number(t.actual_hours) || 0;

        return {
          id: t.id,
          title: t.title,
          priority: t.priority || 'Medium',
          estimated: t.estimated_hours ? `${t.estimated_hours}h` : '0h',
          activeLogged: t.actual_hours ? `${t.actual_hours}h` : '0h',
          variance: (Number(t.actual_hours) - Number(t.estimated_hours)) + 'h',
          status: bucket,
          review: bucket === 'DONE' ? 'Approved' : 'Pending',
          onTime: bucket === 'DONE' ? 'Yes' : '—'
        };
      });

      // Calculate aggregates
      const tasksAssigned = allTasks.length;
      const completionRate = tasksAssigned > 0 ? (completedTasks / tasksAssigned) * 100 : 0;
      // Mock quality for now, 85-95 range
      const qualityRate = completedTasks > 0 ? 85 + Math.random() * 10 : 0; 
      // Mock deadline adherence
      const deadlineRate = completedTasks > 0 ? 80 + Math.random() * 15 : 0;

      let efficiency = 100;
      if (totalEstHours > 0 && totalActHours > 0) {
        efficiency = Math.min(100, Math.round((totalEstHours / totalActHours) * 100));
      }

      let velocityScore = Math.min(100, Math.round(totalEffortPoints * 2));
      let taskScore = Math.min(100, Math.round(completedTasks * 5));
      let overallScore = Math.round((velocityScore * 0.4) + (taskScore * 0.4) + (efficiency * 0.2));

      if (overallScore === 0 && completedTasks > 0) {
          overallScore = 80; // Baseline if points are missing
      }

      const statusDistribution = Object.keys(statusCounts).map(status => {
        const count = statusCounts[status];
        return {
          status,
          count,
          share: tasksAssigned > 0 ? ((count / tasksAssigned) * 100).toFixed(1) + '%' : '0%',
          meaning: status === 'DONE' ? 'Completed / accepted' : 
                  status === 'IN PROGRESS' ? 'Currently active' : 
                  status === 'IN REVIEW' ? 'Awaiting review' :
                  status === 'PENDING REQUIREMENTS' ? 'Waiting for dependency' : 'Not started'
        };
      });

      res.json({
        profile: {
          name: fullName,
          designation: user.role_name || 'Employee',
          department: 'Development', // Could be joined from depts
          manager: 'Super Admin'
        },
        overview: {
          tasksAssigned,
          tasksCompleted: completedTasks,
          completionRate: completionRate.toFixed(1),
          onTimeRate: deadlineRate.toFixed(1),
          activeWorkHours: `${totalActHours}h 0m`,
          qualityRate: qualityRate.toFixed(1),
          overallScore: overallScore
        },
        gauges: {
          taskCompletion: Math.round(completionRate),
          qualityApproval: Math.round(qualityRate),
          deadlineAdherence: Math.round(deadlineRate),
          effortEfficiency: Math.round(efficiency),
          processCompliance: 90 // Mock
        },
        statusDistribution,
        timeKPIs: {
          estimated: `${totalEstHours}h`,
          activeLogged: `${totalActHours}h`,
          remaining: '0h',
          overrun: '0h',
          waiting: '0h',
          review: '0h'
        },
        taskLevelPerformance,
        // Mock weekly data for chart
        weeklyPerformance: [
          Math.max(0, overallScore - 15), 
          Math.max(0, overallScore - 10), 
          Math.max(0, overallScore - 5), 
          overallScore, 
          Math.min(100, overallScore + 2)
        ]
      });
    } catch (error) {
      console.error('Error fetching live dashboard:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/performance/employee/:id/trends', async (req, res) => {
    try {
      const empId = req.params.id;
      const { months = 6 } = req.query; // default to last 6 months
      const numMonths = parseInt(months);
      
      const trends = [];
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      // We need to fetch the employee's name for it_kanban_issues matching
      const [users] = await pool.query(`SELECT first_name, last_name FROM users WHERE id = ?`, [empId]);
      if (users.length === 0) return res.status(404).json({ error: 'Employee not found' });
      const fullName = `${users[0].first_name} ${users[0].last_name}`;

      for (let i = numMonths - 1; i >= 0; i--) {
        let m = currentMonth - i;
        let y = currentYear;
        if (m <= 0) {
          m += 12;
          y -= 1;
        }
        
        const startDate = new Date(y, m - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(y, m, 0).toISOString().split('T')[0] + ' 23:59:59';
        const monthName = new Date(y, m - 1, 1).toLocaleString('default', { month: 'short' });

        // Query Tasks for this month
        const [itIssues] = await pool.query(`
          SELECT status, COALESCE(effort_points, story_points, 0) as effort_points
          FROM it_kanban_issues
          WHERE LOWER(assignee) = LOWER(?) AND updated_at >= ? AND updated_at <= ?
        `, [fullName, startDate, endDate]);

        const [projectTasks] = await pool.query(`
          SELECT status, 0 as effort_points
          FROM project_tasks
          WHERE assigned_to = ? AND updated_at >= ? AND updated_at <= ?
        `, [empId, startDate, endDate]);

        const [generalTasks] = await pool.query(`
          SELECT status, effort_points
          FROM general_tasks
          WHERE created_by = ? AND updated_at >= ? AND updated_at <= ?
        `, [empId, startDate, endDate]);

        const allTasks = [...itIssues, ...projectTasks, ...generalTasks];
        const tasksAssigned = allTasks.length;
        
        let completedTasks = 0;
        let earnedPoints = 0;

        allTasks.forEach(t => {
          const statusUpper = t.status ? t.status.toUpperCase() : 'TO DO';
          if (['DONE', 'COMPLETED', 'CLOSED'].includes(statusUpper)) {
            completedTasks++;
            earnedPoints += Number(t.effort_points) || 0;
          }
        });

        const taskCompletion = tasksAssigned > 0 ? (completedTasks / tasksAssigned) * 100 : 0;
        const qualityRate = tasksAssigned > 0 ? (completedTasks / tasksAssigned) * 95 : 0; // Simulated quality rate
        const overallScore = Math.min(100, Math.round((taskCompletion * 0.5) + (qualityRate * 0.3) + 15)); // Mock score calc

        trends.push({
          month: monthName,
          year: y,
          overallScore,
          qualityRate: Math.round(qualityRate),
          taskCompletion: Math.round(taskCompletion),
          effortPoints: earnedPoints,
          tasksAssigned,
          tasksCompleted: completedTasks
        });
      }

      res.json({ employeeId: empId, trends });
    } catch (error) {
      console.error('Error fetching performance trends:', error);
      res.status(500).json({ error: error.message });
    }
  });

};
