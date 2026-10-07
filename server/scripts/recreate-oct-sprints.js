const pool = require('../config/database');

async function recreateOctoberSprints() {
  try {
    console.log('--- Step 1: Removing all existing sprints from backlog/database ---');
    const [delRes] = await pool.query('DELETE FROM sprints');
    console.log(`Deleted ${delRes.affectedRows} existing sprints.`);

    console.log('\n--- Step 2: Fetching all available projects ---');
    const [projects] = await pool.query(
      `SELECT id, name, title, workflow_type 
       FROM projects 
       ORDER BY id ASC`
    );
    console.log(`Found ${projects.length} available projects.`);

    const startDate = '2026-10-01';
    const endDate = '2026-10-31';
    const status = 'Planned';

    console.log('\n--- Step 3: Creating October Sprints (01 Oct - 31 Oct) ---');
    let createdCount = 0;

    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      const sprintName = (p.name || p.title || `Project ${p.id}`).trim();
      const department = (p.workflow_type || 'IT').trim();
      const sortOrder = i + 1;

      const [res] = await pool.query(
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

      console.log(`[CREATED] Sprint #${res.insertId} | Project #${p.id}: "${sprintName}" (${department})`);
      createdCount++;
    }

    console.log(`\n--- Verification ---`);
    const [allSprints] = await pool.query(
      `SELECT s.id, s.project_id, s.name, s.department, s.start_date, s.end_date, s.status
       FROM sprints s
       ORDER BY s.id ASC`
    );
    console.table(allSprints);
    console.log(`Successfully created ${createdCount} sprints for all ${projects.length} available projects.`);
  } catch (err) {
    console.error('Error during sprint recreation:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

recreateOctoberSprints();
