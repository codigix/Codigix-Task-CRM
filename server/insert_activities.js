const fs = require('fs');
const file = 'd:/projects/Codigix-Task-CRM/server/routes/it-kanban-routes.js';
let content = fs.readFileSync(file, 'utf8');

const routeStr = `
  //  ACTIVITIES (Global Activity Feed for IT Kanban) 
  app.get('/api/it-kanban/activities', async (req, res) => {
    try {
      const department = req.query.department || 'IT';
      // 1. Get issue creations
      const [creations] = await db.query(\`
        SELECT 
          id, 
          type as activity_type,
          CONCAT('Created ', type, ' ', issue_key, ': ', title) as title,
          description,
          status,
          priority,
          reporter as created_by_name,
          created_at,
          department as project_name
        FROM it_kanban_issues
        WHERE department = ? OR ? = 'All'
        ORDER BY created_at DESC
        LIMIT 50
      \`, [department, department]);

      // 2. Get history (updates)
      const [history] = await db.query(\`
        SELECT 
          h.id, 
          'Update' as activity_type,
          CONCAT('Updated ', COALESCE(i.type, 'Issue'), ' ', h.issue_key, ': ', COALESCE(i.title, 'Unknown Title')) as title,
          CONCAT('Changed ', h.field, ' from ', COALESCE(h.old_value, 'none'), ' to ', COALESCE(h.new_value, 'none')) as description,
          i.status,
          i.priority,
          h.changed_by as created_by_name,
          h.created_at,
          i.department as project_name
        FROM it_kanban_history h
        JOIN it_kanban_issues i ON h.issue_key = i.issue_key
        WHERE i.department = ? OR ? = 'All'
        ORDER BY h.created_at DESC
        LIMIT 100
      \`, [department, department]);

      // Combine and sort
      const allActivities = [...creations, ...history].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      res.json(allActivities.slice(0, 100)); // Return top 100 most recent
    } catch (error) {
      console.error('Failed to fetch IT activities', error);
      res.status(500).json({ error: 'Failed to fetch activities' });
    }
  });

`;

const targetIndex = content.indexOf('app.get(\'/api/it-kanban/labels\'');
if (targetIndex !== -1) {
  const newContent = content.substring(0, targetIndex) + routeStr + content.substring(targetIndex);
  fs.writeFileSync(file, newContent);
  console.log('Successfully inserted /api/it-kanban/activities route');
} else {
  console.log('Failed to find target index');
}
