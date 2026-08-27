const db = require('./config/database');

async function setupAttachmentsTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS it_kanban_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        issue_id INT NULL,
        issue_key VARCHAR(50) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size VARCHAR(50) DEFAULT '0 KB',
        file_type VARCHAR(100) DEFAULT 'document',
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_issue_key (issue_key)
      )
    `);
    console.log('✓ it_kanban_attachments table created successfully!');

    // Clean existing HTML inline cards from database descriptions
    const [rows] = await db.query('SELECT id, issue_key, description FROM it_kanban_issues');
    for (const row of rows) {
      if (row.description && row.description.includes('jira-inline-file')) {
        const cleaned = row.description.replace(/<div [^>]*class="jira-inline-file"[^>]*>[\s\S]*?<\/div>(<br\s*\/?>)?/gi, '').trim();
        await db.query('UPDATE it_kanban_issues SET description = ? WHERE id = ?', [cleaned, row.id]);
        console.log(`✓ Cleaned description for ${row.issue_key}`);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('Error setting up attachments table:', err);
    process.exit(1);
  }
}

setupAttachmentsTable();
