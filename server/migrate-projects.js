const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'all_in_one_user',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'deals_db'
    });

    console.log('Connected to db. Starting migration...');

    // Add project_id_code
    try {
      await connection.query('ALTER TABLE projects ADD COLUMN project_id_code VARCHAR(50) NULL AFTER id');
      console.log('Added project_id_code column.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('project_id_code already exists.');
      else throw e;
    }

    // Add progress
    try {
      await connection.query('ALTER TABLE projects ADD COLUMN progress INT DEFAULT 0');
      console.log('Added progress column.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('progress already exists.');
      else throw e;
    }

    // Add spent
    try {
      await connection.query('ALTER TABLE projects ADD COLUMN spent DECIMAL(10,2) DEFAULT 0.00');
      console.log('Added spent column.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('spent already exists.');
      else throw e;
    }

    // Add manager_id
    try {
      await connection.query('ALTER TABLE projects ADD COLUMN manager_id INT NULL');
      console.log('Added manager_id column.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('manager_id already exists.');
      else throw e;
    }

    // Add priority
    try {
      await connection.query("ALTER TABLE projects ADD COLUMN priority VARCHAR(50) DEFAULT 'Medium'");
      console.log('Added priority column.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('priority already exists.');
      else throw e;
    }

    // Update existing projects with a default project_id_code
    const [projects] = await connection.query('SELECT id FROM projects WHERE project_id_code IS NULL');
    for (const project of projects) {
      const code = `PRJ-${new Date().getFullYear()}-${String(project.id).padStart(4, '0')}`;
      await connection.query('UPDATE projects SET project_id_code = ? WHERE id = ?', [code, project.id]);
    }
    console.log(`Updated ${projects.length} existing projects with project_id_code.`);

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
