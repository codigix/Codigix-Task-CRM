const pool = require('./config/database');

async function seedData() {
  let connection;
  try {
    connection = await pool.getConnection();

    console.log('Inserting mock project...');
    const [projectResult] = await connection.query(`
      INSERT INTO projects (name, status) VALUES ('Website Redesign', 'In Progress')
    `);
    const projectId = projectResult.insertId;

    console.log('Inserting mock task...');
    await connection.query(`
      INSERT INTO project_tasks (project_id, task_key, title, description, status, priority)
      VALUES (?, 'WR-114', 'Integrate GitHub Webhooks', 'Set up the backend endpoints and UI to handle GitHub webhooks.', 'IN PROGRESS', 'High')
    `, [projectId]);

    console.log('Mock data created successfully. Task Key: WR-114');
  } catch (error) {
    console.error('Failed to seed data:', error);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

seedData();
