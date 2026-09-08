const fs = require('fs');
let code = fs.readFileSync('server/routes/performance-routes.js', 'utf8');

// Strip out the existing monthly-report route if it exists
code = code.replace(/\/\/ Get monthly performance report[\s\S]*\}\);/g, '');

const monthlyReportRoute = `
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
      const [itIssues] = await pool.query(\`
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
      \`, [startDate, endDate]);

      // 2. Get Project Tasks completed in the target month
      const [projectTasks] = await pool.query(\`
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
      \`, [startDate, endDate]);

      // 3. Get General Tasks completed in the target month
      const [generalTasks] = await pool.query(\`
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
      \`, [startDate, endDate]);

      const allTasks = [...itIssues, ...projectTasks, ...generalTasks];
      const employeeStats = {};

      allTasks.forEach(task => {
        const empId = task.assignee_id;
        if (!empId) return;
        
        if (!employeeStats[empId]) {
          employeeStats[empId] = {
            id: empId,
            name: (task.first_name && task.last_name) ? \`\${task.first_name} \${task.last_name}\` : 'Unknown',
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
`;

code = code.replace(/};\s*$/, monthlyReportRoute + '\n};\n');
fs.writeFileSync('server/routes/performance-routes.js', code);
console.log('Appended successfully');
