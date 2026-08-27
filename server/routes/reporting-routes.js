module.exports = function setupReportingRoutes(app, pool) {

  // Get monthly report data
  app.get('/api/reports/monthly', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { month, year, departmentId } = req.query;

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Get deals for the month
      let dealQuery = `
        SELECT COUNT(*) as totalDeals, 
               SUM(CASE WHEN pipeline = 'Won' THEN 1 ELSE 0 END) as dealsWon,
               SUM(deal_value) as totalRevenue,
               AVG(deal_value) as avgDealValue
        FROM deals
        WHERE created_at >= ? AND created_at <= ?
      `;
      const dealParams = [startDate, endDate];

      const [dealStats] = await connection.query(dealQuery, dealParams);

      // Get tasks for the month
      const [taskStats] = await connection.query(`
        SELECT 
          COUNT(*) as totalTasks,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completedTasks,
          SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgressTasks,
          SUM(CASE WHEN status = 'To Do' THEN 1 ELSE 0 END) as todoTasks,
          SUM(CASE WHEN status = 'Review' THEN 1 ELSE 0 END) as reviewTasks
        FROM general_tasks
        WHERE created_at >= ? AND created_at <= ?
      `, [startDate, endDate]);

      // Get projects for the month
      const [projectStats] = await connection.query(`
        SELECT 
          COUNT(*) as totalProjects,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'Execution' THEN 1 ELSE 0 END) as inProgress,
          SUM(CASE WHEN status = 'Planning' THEN 1 ELSE 0 END) as planning,
          SUM(CASE WHEN status = 'Review' THEN 1 ELSE 0 END) as review
        FROM projects
        WHERE created_at >= ? AND created_at <= ?
      `, [startDate, endDate]);

      // Get daily metrics
      const [dailyMetrics] = await connection.query(`
        SELECT 
          DAY(created_at) as date,
          SUM(CASE WHEN entity_type = 'Deal' THEN 1 ELSE 0 END) as deals,
          SUM(CASE WHEN entity_type = 'Deal' THEN amount ELSE 0 END) as revenue,
          SUM(CASE WHEN entity_type = 'Task' THEN 1 ELSE 0 END) as tasks,
          SUM(CASE WHEN entity_type = 'Project' THEN 1 ELSE 0 END) as projects
        FROM (
          SELECT 'Deal' as entity_type, created_at, deal_value as amount FROM deals WHERE created_at >= ? AND created_at <= ?
          UNION ALL
          SELECT 'Task', created_at, 0 FROM general_tasks WHERE created_at >= ? AND created_at <= ?
          UNION ALL
          SELECT 'Project', created_at, 0 FROM projects WHERE created_at >= ? AND created_at <= ?
        ) combined
        GROUP BY DAY(created_at)
        ORDER BY date ASC
      `, [startDate, endDate, startDate, endDate, startDate, endDate]);

      // Get department metrics
      const [deptMetrics] = await connection.query(`
        SELECT 
          d.name,
          COUNT(DISTINCT gt.id) as tasksCompleted,
          ROUND((COUNT(DISTINCT CASE WHEN gt.status = 'Completed' THEN gt.id END) / 
                 NULLIF(COUNT(DISTINCT gt.id), 0)) * 100) as completionRate,
          COALESCE(SUM(dl.deal_value), 0) as revenue,
          ROUND(COALESCE(SUM(dl.deal_value), 0) / 100000 * 100) as performance
        FROM departments d
        LEFT JOIN general_tasks gt ON gt.department_id = d.id 
          AND gt.created_at >= ? AND gt.created_at <= ?
        LEFT JOIN deals dl ON dl.department_id = d.id 
          AND dl.created_at >= ? AND dl.created_at <= ?
        WHERE d.id IN (1, 2, 3, 4, 5, 6, 7)
        GROUP BY d.id, d.name
        ORDER BY d.name
      `, [startDate, endDate, startDate, endDate]);

      connection.release();

      const conversionRate = dealStats[0].totalDeals > 0
        ? Math.round((dealStats[0].dealsWon / dealStats[0].totalDeals) * 100)
        : 0;

      const taskCompletion = taskStats[0].totalTasks > 0
        ? Math.round((taskStats[0].completedTasks / taskStats[0].totalTasks) * 100)
        : 0;

      const reportData = {
        summary: {
          totalDeals: dealStats[0].totalDeals || 0,
          dealsWon: dealStats[0].dealsWon || 0,
          totalRevenue: dealStats[0].totalRevenue || 0,
          avgDealValue: dealStats[0].avgDealValue || 0,
          conversionRate,
          taskCompletion
        },
        dailyMetrics: dailyMetrics.map(d => ({
          date: d.date?.toString().padStart(2, '0') || '1',
          deals: d.deals || 0,
          revenue: d.revenue || 0,
          tasks: d.tasks || 0,
          projects: d.projects || 0
        })),
        departmentMetrics: deptMetrics.map(d => ({
          name: d.name,
          performance: Math.min(d.performance || 0, 100),
          tasksCompleted: d.completionRate || 0,
          revenue: d.revenue || 0
        })),
        projectStatus: {
          completed: projectStats[0].completed || 0,
          inProgress: projectStats[0].inProgress || 0,
          planning: projectStats[0].planning || 0,
          onHold: projectStats[0].review || 0
        },
        taskStatus: {
          completed: taskStats[0].completedTasks || 0,
          inProgress: taskStats[0].inProgressTasks || 0,
          todo: taskStats[0].todoTasks || 0,
          review: taskStats[0].reviewTasks || 0
        }
      };

      res.json(reportData);
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching monthly report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch report data',
        details: error.message
      });
    }
  });

  // Export report
  app.get('/api/reports/export', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { month, year, format = 'pdf' } = req.query;

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Fetch all necessary data
      const [deals] = await connection.query(`
        SELECT * FROM deals
        WHERE created_at >= ? AND created_at <= ?
        ORDER BY created_at DESC
      `, [startDate, endDate]);

      const [projects] = await connection.query(`
        SELECT * FROM projects
        WHERE created_at >= ? AND created_at <= ?
        ORDER BY created_at DESC
      `, [startDate, endDate]);

      const [tasks] = await connection.query(`
        SELECT * FROM general_tasks
        WHERE created_at >= ? AND created_at <= ?
        ORDER BY created_at DESC
      `, [startDate, endDate]);

      connection.release();

      if (format === 'excel') {
        // Send Excel file
        const excelData = generateExcelReport(deals, projects, tasks, month, year);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${month}-${year}.xlsx"`);
        res.send(excelData);
      } else {
        // Send PDF file (would require a PDF library)
        const pdfData = generatePDFReport(deals, projects, tasks, month, year);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${month}-${year}.pdf"`);
        res.send(pdfData);
      }
    } catch (error) {
      if (connection) connection.release();
      console.error('Error exporting report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export report',
        details: error.message
      });
    }
  });

  // Get department report
  app.get('/api/reports/department/:deptId', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { deptId } = req.params;
      const { month, year } = req.query;

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const [tasks] = await connection.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM general_tasks
        WHERE department_id = ? 
          AND created_at >= ? AND created_at <= ?
        GROUP BY status
      `, [deptId, startDate, endDate]);

      const [employees] = await connection.query(`
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          COUNT(DISTINCT gt.id) as tasksAssigned,
          SUM(CASE WHEN gt.status = 'Completed' THEN 1 ELSE 0 END) as tasksCompleted
        FROM users u
        LEFT JOIN general_tasks gt ON gt.assigned_to = u.id
          AND gt.created_at >= ? AND gt.created_at <= ?
        WHERE u.department_id = ?
        GROUP BY u.id, u.first_name, u.last_name
      `, [startDate, endDate, deptId]);

      const [projects] = await connection.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM projects
        WHERE department_id = ?
          AND created_at >= ? AND created_at <= ?
        GROUP BY status
      `, [deptId, startDate, endDate]);

      connection.release();

      res.json({
        tasks,
        employees,
        projects
      });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching department report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch department report',
        details: error.message
      });
    }
  });

  // Get performance comparison
  app.get('/api/reports/performance-comparison', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { months = 3 } = req.query;

      const data = [];

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const [stats] = await connection.query(`
          SELECT 
            COUNT(*) as deals,
            SUM(deal_value) as revenue,
            SUM(CASE WHEN pipeline = 'Won' THEN 1 ELSE 0 END) as dealsWon
          FROM deals
          WHERE created_at >= ? AND created_at <= ?
        `, [startDate, endDate]);

        const [taskStats] = await connection.query(`
          SELECT 
            COUNT(*) as tasks,
            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
          FROM general_tasks
          WHERE created_at >= ? AND created_at <= ?
        `, [startDate, endDate]);

        data.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          deals: stats[0].deals || 0,
          revenue: stats[0].revenue || 0,
          dealsWon: stats[0].dealsWon || 0,
          tasks: taskStats[0].tasks || 0,
          tasksCompleted: taskStats[0].completed || 0
        });
      }

      connection.release();
      res.json(data);
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching performance comparison:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch performance comparison',
        details: error.message
      });
    }
  });
};

function generateExcelReport(deals, projects, tasks, month, year) {
  // Placeholder: Would use a library like 'xlsx' or 'exceljs'
  // This is a stub that returns empty buffer
  return Buffer.from('');
}

function generatePDFReport(deals, projects, tasks, month, year) {
  // Placeholder: Would use a library like 'pdfkit' or 'puppeteer'
  // This is a stub that returns empty buffer
  return Buffer.from('');
}
