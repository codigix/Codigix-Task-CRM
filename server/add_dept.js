const fs = require('fs');
const file = 'd:/projects/Codigix-Task-CRM/server/routes/activities-notes-routes.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('department VARCHAR')) {
  // Add an initialization block for the department column
  const initCode = `
  // Ensure department column exists on entity_notes
  (async () => {
    try {
      const conn = await pool.getConnection();
      await conn.query('ALTER TABLE entity_notes ADD COLUMN department VARCHAR(50) DEFAULT NULL');
      conn.release();
      console.log('Added department column to entity_notes');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.error('Failed to add department to entity_notes:', e.message);
      }
    }
  })();
  `;

  content = content.replace('module.exports = function setupActivitiesNotesRoutes(app, pool) {', 'module.exports = function setupActivitiesNotesRoutes(app, pool) {' + initCode);
  fs.writeFileSync(file, content);
  console.log('Injected ALTER TABLE for entity_notes');
} else {
  console.log('Already injected');
}
