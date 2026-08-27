require('dotenv').config();
const mysql = require('mysql2/promise');

const INITIAL_KANBAN_DATA = {
  'TO DO': [
    { key: 'WR-101', title: 'Create wireframes for homepage', type: 'Task', priority: 'High', assignee: 'EJ' },
    { key: 'WR-102', title: 'Setup development environment', type: 'Task', priority: 'Medium', assignee: 'JW' },
    { key: 'WR-103', title: 'User research and analysis', type: 'Story', priority: 'Low', assignee: 'EJ' },
    { key: 'WR-104', title: 'Competitor analysis report', type: 'Task', priority: 'Low', assignee: 'OT' },
  ],
  'IN PROGRESS': [
    { key: 'WR-105', title: 'Design homepage UI', type: 'Task', priority: 'High', assignee: 'OT' },
    { key: 'WR-106', title: 'Implement authentication API', type: 'Story', priority: 'High', assignee: 'DM' },
    { key: 'WR-107', title: 'Develop responsive navigation', type: 'Task', priority: 'Medium', assignee: 'OT' },
    { key: 'WR-108', title: 'Create style guide and components', type: 'Task', priority: 'Low', assignee: 'OT' },
  ],
  'IN REVIEW': [
    { key: 'WR-109', title: 'Review homepage design', type: 'Task', priority: 'High', assignee: 'MB' },
    { key: 'WR-110', title: 'Code review - Login module', type: 'Task', priority: 'Medium', assignee: 'MB' },
    { key: 'WR-111', title: 'Review user dashboard UI', type: 'Task', priority: 'Medium', assignee: 'MB' },
    { key: 'WR-112', title: 'Review API integration', type: 'Task', priority: 'Medium', assignee: 'MB' },
  ],
  'TESTING': [
    { key: 'WR-113', title: 'Test login functionality', type: 'Test', priority: 'High', assignee: 'SD' },
    { key: 'WR-114', title: 'Cross-browser testing', type: 'Test', priority: 'Medium', assignee: 'AT' },
    { key: 'WR-115', title: 'Mobile responsiveness testing', type: 'Test', priority: 'Medium', assignee: 'SD' },
    { key: 'WR-116', title: 'Performance testing', type: 'Test', priority: 'Medium', assignee: 'AT' },
  ],
  'DONE': [
    { key: 'WR-117', title: 'Project kickoff meeting', type: 'Task', priority: 'Low', assignee: 'EJ' },
    { key: 'WR-118', title: 'Requirements gathering', type: 'Story', priority: 'Low', assignee: 'EJ' },
    { key: 'WR-119', title: 'Information architecture planning', type: 'Task', priority: 'Low', assignee: 'EJ' },
    { key: 'WR-120', title: 'Database schema design', type: 'Task', priority: 'Medium', assignee: 'DM' },
  ]
};

async function createTableAndSeed() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'all_in_one_user',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'deals_db'
    });

    console.log('Connected to MySQL...');

    // Create table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS it_kanban_issues (
        id INT AUTO_INCREMENT PRIMARY KEY,
        issue_key VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) DEFAULT 'Task',
        priority VARCHAR(50) DEFAULT 'Medium',
        status VARCHAR(50) DEFAULT 'TO DO',
        assignee VARCHAR(100),
        reporter VARCHAR(100) DEFAULT 'OT',
        sprint VARCHAR(50) DEFAULT 'Sprint 1',
        due_date DATE,
        start_date DATE,
        subtasks JSON,
        linked_issues JSON,
        comments JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Table it_kanban_issues created or verified.');

    // Check if table is empty
    const [rows] = await conn.query('SELECT COUNT(*) as count FROM it_kanban_issues');
    if (rows[0].count === 0) {
      console.log('Seeding initial data...');
      
      const insertQuery = `
        INSERT INTO it_kanban_issues (issue_key, title, type, priority, assignee, status, subtasks, linked_issues, comments)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      for (const [status, issues] of Object.entries(INITIAL_KANBAN_DATA)) {
        for (const issue of issues) {
          // Add some dummy default JSON for nested arrays
          const subtasks = JSON.stringify([{ id: Date.now() + Math.random(), title: 'Define key user flows', completed: true }]);
          const linked_issues = JSON.stringify([{ key: 'WR-102', relation: 'IS BLOCKED BY', title: 'Setup development environment' }]);
          const comments = JSON.stringify([]);

          await conn.query(insertQuery, [
            issue.key,
            issue.title,
            issue.type,
            issue.priority,
            issue.assignee,
            status,
            subtasks,
            linked_issues,
            comments
          ]);
        }
      }
      console.log('Seeding complete!');
    } else {
      console.log('Table already has data, skipping seeding.');
    }

    await conn.end();
  } catch (error) {
    console.error('Error:', error);
    if (conn) await conn.end();
    process.exit(1);
  }
}

createTableAndSeed();
