const pool = require('../config/database');

const updates = [
  { id: 6, oldName: 'bakul catering services', newName: 'Bakul Caterings' },
  { id: 14, oldName: 'manish kadam', newName: 'MK Farm Agro Tourism' },
  { id: 16, oldName: 'Moraya Hospital', newName: 'Moraya Hospital' },
  { id: 18, oldName: 'Health And Smiles Dental care', newName: 'Health n Smile Dental' },
  { id: 19, oldName: 'Regain Wakad', newName: 'Regain Clinic' },
  { id: 21, oldName: 'Ekdant Dental Care', newName: 'Ekdant Clinic' },
  { id: 23, oldName: 'Sushrut Piles clinic Moshi', newName: 'Sushrut Piles Clinic Moshi' },
  { id: 24, oldName: 'Sushrut Surgical hospital Pimple Gurav', newName: 'Sushrut pimple gurav' },
  { id: 25, oldName: 'Sushrut Piles clinic Sangvi', newName: 'Sushrut Old sangavi' },
  { id: 26, oldName: 'Sushrut Piles clinic Dr Shagun Rao', newName: 'Dr Shagun Rao' },
  { id: 27, oldName: 'Sanskruti Agro Toursim', newName: 'Sanskruti Agro Tourism' },
  { id: 28, oldName: 'Corplegal Solution', newName: 'Adv. Shilpa' },
  { id: 29, oldName: 'Kitchen Canvas', newName: 'Kitchen Canvas' },
  { id: 31, oldName: 'Ashu Fitness Studio', newName: 'Ashu Fitness' },
  { id: 32, oldName: 'SMD hospital', newName: 'Dr Rajiv SMD' },
  { id: 33, oldName: 'Shriraj Ayurved Clinic', newName: 'Shriraj Ayurveda' },
  { id: 34, oldName: 'Aditya Homeopathy Hospital', newName: 'SMM- Aditya Homeopathy' },
  { id: 36, oldName: 'Dr sheetals Glow', newName: 'Dr Sheetal s Glow' },
  { id: 37, oldName: 'Codigix IT', newName: 'Codigix IT' },
  { id: 38, oldName: 'Casa Royale', newName: 'Casa Royale' },
  { id: 39, oldName: 'Jungle Gym', newName: 'Jungle Gym' },
  { id: 42, oldName: 'Codigix infotech', newName: 'Codigix Infotech' },
  { id: 43, oldName: '4blocks Events', newName: '4Blocks' },
  { id: 44, oldName: 'Astrologer', newName: 'Astrology' }
];

async function run() {
  console.log('Starting project and sprint name updates...');
  
  for (const item of updates) {
    // 1. Update projects table (both name and title)
    await pool.query(
      'UPDATE projects SET name = ?, title = ?, updated_at = NOW() WHERE id = ?',
      [item.newName, item.newName, item.id]
    );

    // 2. Update sprints table (sync name with project)
    await pool.query(
      'UPDATE sprints SET name = ? WHERE project_id = ?',
      [item.newName, item.id]
    );

    console.log(`Updated Project #${item.id}: "${item.oldName}" -> "${item.newName}"`);
  }

  console.log('\nVerifying updated projects:');
  const [rows] = await pool.query(
    'SELECT id, name, title FROM projects WHERE id IN (?) ORDER BY id ASC',
    [updates.map(u => u.id)]
  );
  console.table(rows);

  console.log('\nVerifying updated sprints:');
  const [sprintRows] = await pool.query(
    'SELECT id, project_id, name FROM sprints WHERE project_id IN (?) ORDER BY project_id ASC',
    [updates.map(u => u.id)]
  );
  console.table(sprintRows);

  process.exit(0);
}

run().catch(err => {
  console.error('Error updating project names:', err);
  process.exit(1);
});
