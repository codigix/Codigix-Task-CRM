const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function seedOctoberSprints(targetDb = null) {
  const dbName = targetDb || process.env.TARGET_DB || 'deals_db';
  console.log(`\n========================================`);
  console.log(`Seeding October 2026 Sprints on: ${dbName}`);
  console.log(`========================================`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307', 10),
    user: process.env.DB_USER || 'all_in_one_user',
    password: process.env.DB_PASSWORD,
    database: dbName
  });

  try {
    const [projects] = await conn.query(
      `SELECT id, name, title, workflow_type 
       FROM projects 
       ORDER BY id ASC`
    );

    console.log(`Found ${projects.length} projects in ${dbName}.`);

    const startDate = '2026-10-01';
    const endDate = '2026-10-31';
    const status = 'Planned';

    let createdCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      const sprintName = (p.name || p.title || `Project ${p.id}`).trim();
      const department = (p.workflow_type || 'IT').trim();

      // Check if sprint already exists for this project in October 2026
      const [existing] = await conn.query(
        `SELECT id FROM sprints 
         WHERE project_id = ? 
           AND start_date = ? 
           AND end_date = ?`,
        [p.id, startDate, endDate]
      );

      if (existing.length > 0) {
        console.log(`[SKIP] Project #${p.id} "${sprintName}" already has an October sprint (ID: ${existing[0].id}).`);
        skippedCount++;
        continue;
      }

      const sortOrder = i + 1;
      const [res] = await conn.query(
        `INSERT INTO sprints (name, goal, department, project_id, start_date, end_date, status, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sprintName,
          `October 2026 Sprint for ${sprintName}`,
          department,
          p.id,
          startDate,
          endDate,
          status,
          sortOrder
        ]
      );

      console.log(`[CREATED] Sprint #${res.insertId} created for Project #${p.id} "${sprintName}" (${department})`);
      createdCount++;
    }

    console.log(`\n✓ Result for ${dbName}: Created ${createdCount} sprints, skipped ${skippedCount}.`);
  } catch (error) {
    console.error(`❌ Seeding failed on ${dbName}:`, error);
    throw error;
  } finally {
    await conn.end();
  }
}

// Allow CLI execution directly: node create_october_sprints.js [dbName]
if (require.main === module) {
  const target = process.argv[2] || process.env.TARGET_DB || 'deals_db';
  seedOctoberSprints(target)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedOctoberSprints;
